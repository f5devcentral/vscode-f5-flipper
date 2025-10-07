# A10 Support Architecture

## Overview

This document outlines the technical architecture for adding A10 Thunder ADC support to the Flipper conversion tool.

## Design Approach

### Integration Strategy

A10 support is integrated into the existing Flipper codebase to provide a unified multi-vendor conversion experience. The architecture follows the same phase-based processing model established for NetScaler configurations.

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴──────────┐
                │                      │
        ┌───────▼───────┐      ┌──────▼─────┐
        │  File Handler │      │   UI/UX    │
        └───────┬───────┘      └────────────┘
                │
    ┌───────────┴───────────┐
    │   Vendor Detection    │  ← Detect config format
    └───────────┬───────────┘
                │
        ┌───────┴────────┐
        │                │
   ┌────▼─────┐    ┌────▼─────┐
   │NetScaler │    │    A10   │  ← Vendor parsers
   │  Parser  │    │  Parser  │
   └────┬─────┘    └────┬─────┘
        │               │
        └───────┬───────┘
                │
        ┌───────▼────────┐
        │  Diagnostics   │  ← Validation
        │     Engine     │
        └───────┬────────┘
                │
        ┌───────┴────────┐
        │                │
   ┌────▼─────┐    ┌────▼─────┐
   │   AS3    │    │  NGINX   │  ← Output converters
   │Converter │    │Converter │
   └──────────┘    └──────────┘
```

## Phase Implementation

### Phase 1: Unpack
- Extract configs from archives (.tgz)
- Detect file types
- Handle A10-specific archive structures

### Phase 2: Parse (Vendor-Specific)

**A10 Parser Interface**:
```typescript
interface A10Parser {
  vendor: 'a10';
  parse(config: string): A10ParsedConfig;
  validate(config: string): ValidationResult;
}
```

**Parsing Strategy**:
1. Parse indented CLI blocks
2. Extract key objects:
   - `slb server` blocks → real servers
   - `slb service-group` blocks → pools
   - `slb virtual-server` blocks → VIPs
   - `health monitor` blocks → health checks
   - `slb template` blocks → profiles
3. Build hierarchical object tree
4. Resolve references between objects

**Key Differences from NetScaler**:
- **Syntax**: Indentation-based vs discrete commands
- **Structure**: Multi-port virtual servers vs individual vserver objects
- **Server Model**: Separate server and port definitions

### Phase 3: Abstract (Application Model)

**Current Approach**: Vendor-specific structures passed directly to converters

**Future Enhancement**: Common abstraction layer
```typescript
interface Application {
  name: string;
  virtualServers: VirtualServer[];
  pools: Pool[];
  monitors: HealthMonitor[];
  sslProfiles: SSLProfile[];
  persistence: PersistenceProfile[];
}

interface VirtualServer {
  name: string;
  address: string;
  port: number;
  protocol: Protocol;
  pool?: string;
  sslProfile?: string;
  persistence?: string;
}
```

### Phase 4: Diagnostics

**Diagnostic Engine**:
```typescript
interface DiagnosticEngine {
  addRule(rule: DiagnosticRule): void;
  diagnose(config: ParsedConfig): DiagnosticResult[];
}

interface DiagnosticRule {
  id: string;
  severity: 'error' | 'warning' | 'info';
  check(config: ParsedConfig): boolean;
  message: string;
  recommendation?: string;
}
```

**A10-Specific Diagnostics**:
- Unsupported ACOS features
- Version compatibility warnings
- Configuration recommendations
- Migration notes for F5 equivalents

### Phase 5: Convert

**AS3 Converter Architecture**:
```typescript
interface OutputConverter {
  convert(input: ParsedConfig): AS3Declaration;
  validate(output: AS3Declaration): ValidationResult;
}

class A10AS3Converter implements OutputConverter {
  convert(input: A10ParsedConfig): AS3Declaration {
    const tenant = this.buildTenant(input);
    const applications = this.buildApplications(input);
    return this.buildDeclaration(tenant, applications);
  }

  private buildVirtualServer(vs: A10VirtualServer): AS3Service {
    // Convert A10 virtual server to AS3 Service object
  }

  private buildPool(sg: A10ServiceGroup): AS3Pool {
    // Convert A10 service group to AS3 Pool
  }

  private buildMonitor(hm: A10HealthMonitor): AS3Monitor {
    // Convert A10 health monitor to AS3 Monitor
  }
}
```

**Conversion Utilities**:
```typescript
class A10ConversionUtils {
  static mapProtocol(protocol: string): AS3Protocol;
  static mapLBMethod(method: string): AS3LBMode;
  static buildHealthMonitor(monitor: A10HealthMonitor): AS3Monitor;
  static buildPersistence(persist: A10Persistence): AS3Persist;
  static mapSSLProfile(template: A10SSLTemplate): AS3TLSServer;
}
```

## File Organization

```
src/
  parsers/
    netscaler/       # Existing NetScaler parser
    a10/             # A10 parser implementation
      parser.ts      # Main A10 parser
      models.ts      # A10-specific TypeScript interfaces
      syntax.ts      # CLI syntax patterns and regex

  converters/
    as3/             # AS3 conversion logic
      common.ts      # Shared conversion utilities
      netscaler.ts   # NetScaler → AS3
      a10.ts         # A10 → AS3
    nginx/
      converter.ts   # NGINX output (future)

  models/
    common/          # Vendor-neutral models
      application.ts
      virtualserver.ts
      pool.ts
      monitor.ts
    vendor/          # Vendor-specific models
      netscaler.ts
      a10.ts

  diagnostics/
    engine.ts
    rules/
      netscaler/
      a10/
        a10-diagnostics.json  # A10-specific diagnostic rules
```

## Template System

### Current State
The existing NetScaler implementation uses f5-fast-core for template-based AS3 generation.

### A10 Implementation
A10 conversion uses native TypeScript code instead of templates:

**Benefits**:
- Type safety at compile time
- IDE support (autocomplete, refactoring)
- Easier unit testing
- Better debugging with breakpoints
- More maintainable code

**AS3 Builder Pattern**:
```typescript
class AS3Builder {
  private declaration: AS3Declaration;

  addTenant(name: string): this;
  addApplication(tenant: string, app: string): this;
  addService(app: string, config: ServiceConfig): this;
  addPool(app: string, config: PoolConfig): this;
  addMonitor(app: string, config: MonitorConfig): this;
  build(): AS3Declaration;
}
```

## Key Technical Challenges

### 1. Multi-Port Virtual Servers
A10 allows multiple ports per virtual server definition. Each port can reference different service groups and templates.

**Parsing Strategy**: Extract each port as a separate logical service
**Conversion Strategy**: Create multiple AS3 Service objects from one A10 virtual-server

### 2. Indentation-Based Parsing
A10 CLI uses indentation to define hierarchy, unlike NetScaler's flat command structure.

**Implementation**: Track indentation depth during parsing to build object tree

### 3. Template Resolution
A10 templates (SSL, HTTP, persistence) are referenced by name and must be resolved during conversion.

**Strategy**:
1. Parse all templates first
2. Build template lookup map
3. Resolve references during virtual server processing

### 4. Server vs Service Model
A10 separates server definition from port/service definition, while NetScaler combines them.

**Mapping**:
- A10 `slb server` with multiple `port` statements → Multiple F5 pool members
- A10 `service-group member` references → Pool member configuration

## Testing Strategy

### Unit Tests
- Parse individual A10 config blocks
- Test object model creation
- Test AS3 conversion utilities
- Validate reference resolution

### Integration Tests
- Parse complete A10 configurations
- Validate AS3 output structure
- Test against AS3 schema
- Error handling scenarios

### Validation
- Compare with manual conversions
- Test AS3 deployment to BIG-IP
- Verify functional equivalence
- Test with various ACOS versions

## Error Handling

### Graceful Degradation
- Skip unsupported features with warnings
- Continue processing when possible
- Provide clear error messages

### Diagnostic Reporting
```typescript
interface ConversionWarning {
  severity: 'error' | 'warning' | 'info';
  location: string;  // Config line or object
  message: string;
  recommendation?: string;
  f5Equivalent?: string;
}
```

## Extensibility Considerations

### Adding New Vendors
The A10 implementation establishes patterns for adding additional vendors:

1. **Vendor Detection**: Pattern matching on config syntax
2. **Parser Interface**: Common parsing interface
3. **Converter Interface**: Common conversion interface
4. **Diagnostic Rules**: JSON-based extensible diagnostics

### Plugin Architecture (Future)
```typescript
interface VendorPlugin {
  name: string;
  detect(config: string): boolean;
  parser: VendorParser;
  converter: OutputConverter;
  diagnostics: DiagnosticRule[];
}
```

## Conversion Feature Coverage

### High Priority (Initial Release)
- Virtual servers (VIPs)
- Service groups (pools)
- Real servers (backend members)
- Health monitors (HTTP, TCP)
- SSL termination
- Source NAT pools
- Basic persistence (source-ip, cookie)
- Load balancing methods

### Medium Priority
- Advanced health monitors (HTTPS, custom)
- HTTP header manipulation
- SSL re-encryption (server-ssl)
- Connection limits
- Advanced persistence methods

### Low Priority / Future
- High availability (VRRP-A)
- Access control lists
- aFleX scripts (A10 scripting)
- Advanced templates
- IPv6 configurations

## Known Limitations

### Out of Scope
- GSLB configurations
- aFleX script conversion (similar to NetScaler policies)
- Advanced HA configurations
- Layer 7 content switching (requires deeper analysis)
- Complex SSL certificate chains

### Partial Support
- Some advanced health monitor types
- Complex persistence scenarios
- Advanced HTTP/2 configurations

## References

### A10 Documentation
- ACOS CLI Reference
- A10 Thunder ADC Configuration Guide
- aGalaxy Management Documentation

### F5 Documentation
- AS3 Schema Reference
- BIG-IP Configuration Guide
- F5 Migration Best Practices

### Internal Documentation
- [A10 Configuration Reference](a10_configuration_reference.md)
- NetScaler Parser Implementation
- AS3 Converter Patterns
