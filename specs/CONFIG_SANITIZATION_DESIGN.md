# NetScaler Configuration Sanitization Guide

This document outlines the approach and patterns used to sanitize NetScaler configurations for use as test fixtures and educational examples in F5 Flipper.

## Sanitization Goals

1. **Security**: Remove production IP addresses, hostnames, and identifiable information
2. **Educational**: Create clear, generic naming that demonstrates configuration concepts
3. **Consistency**: Apply uniform patterns across different application types
4. **Reusability**: Generate configurations suitable for automated testing

## Sanitization Patterns Applied

### SSL_BRIDGE Application Example

**Original Configuration**: `some.app.net_443_vs`
**Sanitized Configuration**: `app_ssl_bridge_vs`

#### Transformations Applied

| Element Type | Original | Sanitized | Pattern |
|--------------|----------|-----------|---------|
| Virtual Server | `some.app.net_443_vs` | `app_ssl_bridge_vs` | Remove domain references, use descriptive protocol prefix |
| Service Group | `some.app.net_443_sg` | `app_ssl_bridge_sg` | Match virtual server naming pattern |
| Server Name | `some.app.net` | `backend_ssl_server` | Generic backend server naming |
| IP Addresses | `10.222.13.165` → `192.168.1.100`, `10.226.173.82` → `10.1.1.50` | Use RFC 1918 ranges |
| Monitor Name | `some.app.net_443_tcp_mon` | `ssl_tcp_monitor` | Generic monitor naming |

### DNS Load Balancer Application Example

**Original Configuration**: `lbvs_DNS`
**Sanitized Configuration**: `dns_lb_vs`

#### Transformations Applied

| Element Type | Original | Sanitized | Pattern |
|--------------|----------|-----------|---------|
| Virtual Server | `lbvs_DNS` | `dns_lb_vs` | Descriptive protocol-first naming |
| IP Address | `1.1.1.10` | `192.168.1.10` | RFC 1918 private addressing |
| Service Groups | `SGRP_PRIM_DNS`, `SGRP_SEC_DNS` | `dns_east_sg`, `dns_west_sg` | Geographic distribution naming |
| Server Names | `NSRV_PRIM_DNS01`, `NSRV_PRIM_DNS02`, `NSRV_SEC_DNS01` | `dns_east_primary`, `dns_east_secondary`, `dns_west_primary` | Geographic and role-based naming |
| Server IPs | `10.6.73.25`, `10.6.73.26`, `10.6.71.25` | `10.1.1.25`, `10.1.1.26`, `10.2.1.25` | Logical subnet organization |
| Comments | `Primary DNS - Site 1`, `Secondary DNS - Site 1` | `Primary DNS East Coast`, `Secondary DNS East Coast` | Geographic clarity |
| Monitor Name | `MON_DNS_PRIM` | `dns_health_mon` | Generic health monitor naming |

## IP Address Sanitization Strategy

### Address Range Selection

- **Public/External IPs**: Use `192.168.1.x` range for virtual servers
- **Internal/Backend IPs**: Use `10.1.x.x` and `10.2.x.x` for backend servers
- **Subnet Organization**: Group related servers in logical subnets
  - East Coast servers: `10.1.1.x`
  - West Coast servers: `10.2.1.x`

### Port Consistency

- Maintain original port numbers to preserve application behavior
- DNS: Port 53
- HTTPS/SSL: Port 443
- Custom application ports: Keep as-is for educational value

## Naming Convention Standards

### Virtual Server Naming

- Format: `{protocol}_{type}_{purpose}_vs`
- Examples: `dns_lb_vs`, `app_ssl_bridge_vs`

### Service Group Naming

- Format: `{protocol}_{location/purpose}_sg`
- Examples: `dns_east_sg`, `app_ssl_bridge_sg`

### Server Naming

- Format: `{protocol}_{location}_{role}`
- Examples: `dns_east_primary`, `backend_ssl_server`

### Monitor Naming

- Format: `{protocol/purpose}_{monitor_type}`
- Examples: `dns_health_mon`, `ssl_tcp_monitor`

## Automation Potential

### Sanitization Function Concept

```typescript
interface NamePattern {
    regex: RegExp;
    replacement: string;
}

interface IPMappings {
    publicRange: string;
    backendRange: string;
}

interface PortMappings {
    [key: string]: number;
}

interface SanitizationRules {
    namePatterns: NamePattern[];
    ipMappings: IPMappings;
    portMappings?: PortMappings;
}

type AppType = 'SSL_BRIDGE' | 'DNS' | 'HTTP' | 'TCP' | 'UDP';

class ConfigSanitizer {

    sanitizeConfig(originalConfig: string, appType: AppType): string {
        const rules = this.getSanitizationRules(appType);
        let sanitized = originalConfig;

        // Apply name transformations
        rules.namePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern.regex, pattern.replacement);
        });

        // Apply IP address transformations
        sanitized = this.sanitizeIPAddresses(sanitized, rules.ipMappings);

        // Apply port transformations if needed
        if (rules.portMappings) {
            sanitized = this.sanitizePorts(sanitized, rules.portMappings);
        }

        return sanitized;
    }

    getSanitizationRules(appType: AppType): SanitizationRules {
        const baseRules: SanitizationRules = {
            namePatterns: [
                // Remove domain references
                { regex: /[a-zA-Z0-9.-]+\.(com|net|org|local)/g, replacement: 'generic_server' },
                // Remove numeric prefixes
                { regex: /^\d+\./g, replacement: '' }
            ],
            ipMappings: {
                // Map production IPs to RFC 1918 ranges
                publicRange: '192.168.1',
                backendRange: '10.1.1'
            }
        };

        // App-specific rules
        switch(appType) {
            case 'SSL_BRIDGE':
                return {
                    ...baseRules,
                    namePatterns: [
                        ...baseRules.namePatterns,
                        { regex: /.*_443_vs/g, replacement: 'app_ssl_bridge_vs' },
                        { regex: /.*_443_sg/g, replacement: 'app_ssl_bridge_sg' }
                    ]
                };

            case 'DNS':
                return {
                    ...baseRules,
                    namePatterns: [
                        ...baseRules.namePatterns,
                        { regex: /lbvs_DNS/g, replacement: 'dns_lb_vs' },
                        { regex: /SGRP_PRIM_DNS/g, replacement: 'dns_east_sg' },
                        { regex: /SGRP_SEC_DNS/g, replacement: 'dns_west_sg' }
                    ]
                };

            default:
                return baseRules;
        }
    }

    private sanitizeIPAddresses(config: string, mappings: IPMappings): string {
        // Implementation would map production IPs to test ranges
        // while maintaining logical relationships
        return config;
    }

    private sanitizePorts(config: string, mappings: PortMappings): string {
        // Implementation would map production ports to test ports
        return config;
    }
}
```

### Detection Patterns

```typescript
interface SanitizationFindings {
    domains: string[];
    ips: string[];
    corporateNames: string[];
    envPrefixes: string[];
}

interface SanitizationPatterns {
    productionDomains: RegExp;
    publicIPs: RegExp;
    corporateNaming: RegExp;
    environmentPrefixes: RegExp;
}

// Detect elements that need sanitization
const SANITIZATION_PATTERNS: SanitizationPatterns = {
    productionDomains: /\b[a-zA-Z0-9.-]+\.(com|net|org|gov|edu)\b/g,
    publicIPs: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    corporateNaming: /\b[A-Z]{2,}(_[A-Z0-9]+)+\b/g,
    environmentPrefixes: /\b(PROD|DEV|TEST|STAGE)_/gi
};

function detectSanitizationNeeds(config: string): SanitizationFindings {
    const findings: SanitizationFindings = {
        domains: config.match(SANITIZATION_PATTERNS.productionDomains) || [],
        ips: config.match(SANITIZATION_PATTERNS.publicIPs) || [],
        corporateNames: config.match(SANITIZATION_PATTERNS.corporateNaming) || [],
        envPrefixes: config.match(SANITIZATION_PATTERNS.environmentPrefixes) || []
    };

    return findings;
}
```

## Implementation Considerations

### Automated Sanitization Features

1. **IP Address Mapping**: Maintain consistent mappings across related configurations
2. **Name Pattern Detection**: Use regex patterns to identify corporate naming conventions
3. **Relationship Preservation**: Keep logical connections between objects intact
4. **Configuration Validation**: Ensure sanitized configs remain syntactically valid

### Manual Review Requirements

- **Security Verification**: Confirm all sensitive data removed
- **Functional Validation**: Test that sanitized configs serve educational purpose
- **Documentation Updates**: Update comments and descriptions to match sanitized context

## Benefits of Systematic Sanitization

1. **Test Suite Expansion**: Enables creation of comprehensive test fixtures
2. **Educational Value**: Provides clear examples for learning NetScaler concepts
3. **Security Compliance**: Removes production artifacts from open source code
4. **Standardization**: Creates consistent patterns for configuration examples

## Future Enhancements

- **Automated Detection**: Build tooling to identify configurations needing sanitization
- **Template Generation**: Create sanitized config templates for common patterns
- **Validation Suite**: Automated testing to ensure sanitization completeness
- **Integration**: Build sanitization into the F5 Flipper processing pipeline
