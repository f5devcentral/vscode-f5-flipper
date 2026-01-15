# DIRECT CONVERSION ENGINE
## Architectural Decision Record

**Status**: IN PROGRESS  
**Created**: 2026-01-14  
**Updated**: 2026-01-15  
**Decision**: Direct TypeScript conversion over FAST templates  
**Implementation**: [DIRECT_CONVERSION_IMPL_SPEC.md](DIRECT_CONVERSION_IMPL_SPEC.md)  
**Related**: [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md), [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md), [BULK_CONVERSION_ENGINE_SPEC.md](BULK_CONVERSION_ENGINE_SPEC.md)

---

## Executive Summary

After deep analysis of conversion coverage, feature mappings, and the existing template architecture, we've concluded that **direct TypeScript-based conversion** is superior to the current FAST template approach. This document captures the analysis journey and rationale.

---

## Table of Contents

1. [Analysis Journey](#1-analysis-journey)
2. [The Problem with Templates](#2-the-problem-with-templates)
3. [Direct Conversion Approach](#3-direct-conversion-approach)
4. [Honest Assessment](#4-honest-assessment)
5. [Implementation Design](#5-implementation-design)
6. [Migration Path](#6-migration-path)
7. [Decision](#7-decision)

---

## 1. Analysis Journey

### How We Got Here

This decision emerged from a series of connected investigations:

#### Step 1: Bulk Conversion Engine

Started with [BULK_CONVERSION_ENGINE_SPEC.md](BULK_CONVERSION_ENGINE_SPEC.md) to fix broken bulk conversion (Issue #60). Discovered FAST Core was overkill - we only use 4 methods from a massive library.

**Finding:** We could replace FAST Core with ~200 lines of TypeScript.

#### Step 2: Conversion Coverage

Asked: "How do we know what's missing in conversions?"

Created [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md) to detect gaps between NetScaler config and AS3 output.

**Finding:** The bottleneck is `mungeNS2FAST()` - it only maps "core" features, silently dropping everything else.

```
Parser → AdcApp (everything) → mungeNS2FAST (core only) → Template → AS3
                                     ↑
                              Gap occurs here
```

#### Step 3: Feature Mappings

Asked: "What ARE all the possible mappings?"

Extracted hundreds of mappings from BORG research into [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md):
- 15+ LB methods
- 12 persistence types  
- 25+ monitor types
- 25 service types
- Dozens of profile parameters
- Content switching → iRule translations
- And more...

**Finding:** Comprehensive mappings exist. The question is how to use them.

#### Step 4: Concept-Based Mappings

Asked: "Should we map to AS3 properties or TMOS concepts?"

Refactored mappings to be **concept-based** (e.g., `round-robin`) rather than format-specific (e.g., `loadBalancingMode`).

**Finding:** Concept-based mappings are future-proof - same mappings work for AS3, TMSH, or future XC output.

#### Step 5: Architecture Question

Asked: "Where do gaps actually occur?"

Traced data flow:
- Parser captures ALL params as JSON ✓
- Digester passes ALL params to AdcApp ✓
- `mungeNS2FAST()` maps only CORE features ✗ ← Bottleneck
- Template renders only what munge provided ✗

**Finding:** The gap isn't in parsing - it's in the munge → template pipeline.

#### Step 6: The Key Question

Asked: "Is having templates worth it at all?"

This led to the current decision.

---

## 2. The Problem with Templates

### Current Architecture

```
AdcApp → mungeNS2FAST() → YAML Template → Mustache → AS3 JSON
```

### What Templates Were Supposed to Provide

| Promise | Reality |
|---------|---------|
| User customization | Nobody customizes templates |
| Declarative config | Munge makes it imperative anyway |
| Separation of concerns | Concerns are scattered across 3 places |
| Easy to modify | YAML + Mustache = no IDE support |

### Why Templates Don't Work for Us

**1. Two Translation Layers**

```typescript
// Layer 1: mungeNS2FAST - transform AdcApp to template params
const params = {
  app_name: app.name,
  virtual_address: app.address,
  lb_method: LB_METHODS[app.lbMethod],  // Already doing the mapping!
  // ...
}

// Layer 2: Template - transform params to AS3
// {{app_name}}, {{virtual_address}}, {{lb_method}}
// Just string substitution at this point
```

The hard work happens in munge. Templates just do string substitution.

**2. Mustache Limitations**

```yaml
# Can't do conditionals properly
# Can't do loops without trailing comma hacks
# Can't do type coercion
# Can't do validation
template: |
  {
    "members": [
      {{#pool_members}}
      { "address": "{{address}}" },  // Trailing comma problem!
      {{/pool_members}}
    ]
  }
```

**3. No IDE Support**

- YAML files: No TypeScript checking
- Mustache syntax: No autocomplete
- Template errors: Only caught at runtime
- Refactoring: Manual find/replace

**4. Scattered Logic**

To add a new mapping, you must:
1. Update `mungeNS2FAST()` to extract the value
2. Update YAML template to include the property
3. Hope the Mustache syntax is correct
4. Test manually

**5. 13 Templates to Maintain**

```
templates/as3/
├── HTTP.yaml
├── SSL.yaml
├── TCP.yaml
├── UDP.yaml
├── DNS.yaml
├── FTP.yaml
├── SIP.yaml
├── RTSP.yaml
├── RADIUS.yaml
├── RDP.yaml
├── MYSQL.yaml
├── MSSQL.yaml
└── ANY.yaml
```

Each template duplicates structure with slight variations.

---

## 3. Direct Conversion Approach

### Proposed Architecture

```
AdcApp → buildAS3(app, mappings) → AS3 JSON
```

One layer. One language. One place to look.

### What It Looks Like

```typescript
// flipperFAST/src/converter.ts
import { LB_METHODS, PERSISTENCE, MONITORS, SERVICE_TYPES } from './mappings'

export function buildAS3(app: AdcApp): AS3Declaration {
  return {
    class: 'AS3',
    action: 'deploy',
    declaration: {
      class: 'ADC',
      schemaVersion: '3.50.0',
      [`t_${sanitize(app.name)}`]: buildTenant(app)
    }
  }
}

function buildTenant(app: AdcApp): AS3Tenant {
  return {
    class: 'Tenant',
    [`app_${sanitize(app.name)}`]: buildApplication(app)
  }
}

function buildApplication(app: AdcApp): AS3Application {
  return {
    class: 'Application',
    serviceMain: buildService(app),
    ...(app.pool && { [`pool_${app.name}`]: buildPool(app) }),
    ...(app.monitors?.length && buildMonitors(app)),
  }
}

function buildService(app: AdcApp): AS3Service {
  const serviceClass = SERVICE_TYPES[app.serviceType] || 'Service_TCP'
  
  return {
    class: serviceClass,
    virtualAddresses: [app.address],
    virtualPort: app.port,
    
    // Each mapping = one line
    ...(app.lbMethod && { 
      loadBalancingMode: LB_METHODS[app.lbMethod] 
    }),
    ...(app.persistenceType && { 
      persistenceMethods: [PERSISTENCE[app.persistenceType]] 
    }),
    ...(app.timeout && { 
      idleTimeout: parseInt(app.timeout) 
    }),
    ...(app.pool && { 
      pool: `pool_${app.name}` 
    }),
    
    // Profiles
    ...(app.httpProfile && { profileHTTP: buildHttpProfile(app) }),
    ...(app.tcpProfile && { profileTCP: buildTcpProfile(app) }),
    ...(app.sslProfile && { clientTLS: buildSslProfile(app) }),
  }
}

function buildPool(app: AdcApp): AS3Pool {
  return {
    class: 'Pool',
    members: app.poolMembers.map(m => ({
      servicePort: m.port,
      serverAddresses: [m.address],
      ...(m.weight && { ratio: m.weight }),
    })),
    ...(app.lbMethod && { 
      loadBalancingMode: LB_METHODS[app.lbMethod] 
    }),
    monitors: app.monitors?.map(m => ({ use: m.name })) || ['http'],
  }
}
```

### Mapping Files

```typescript
// flipperFAST/src/mappings/lb-methods.ts
export const LB_METHODS: Record<string, string> = {
  'ROUNDROBIN': 'round-robin',
  'LEASTCONNECTION': 'least-connections-member',
  'LEASTRESPONSETIME': 'fastest-app-response',
  'SOURCEIPHASH': 'least-connections-member',  // Note: use persistence instead
  // ... from NS_TO_F5_MAPPINGS.md
}

// flipperFAST/src/mappings/persistence.ts
export const PERSISTENCE: Record<string, string> = {
  'SOURCEIP': 'source-address',
  'COOKIEINSERT': 'cookie',
  'SSLSESSION': 'ssl',
  // ... from NS_TO_F5_MAPPINGS.md
}

// flipperFAST/src/mappings/service-types.ts
export const SERVICE_TYPES: Record<string, string> = {
  'HTTP': 'Service_HTTP',
  'SSL': 'Service_HTTPS',
  'TCP': 'Service_TCP',
  'UDP': 'Service_UDP',
  // ... from NS_TO_F5_MAPPINGS.md
}
```

### Testing

```typescript
// flipperFAST/tests/converter.test.ts
import { buildAS3 } from '../src/converter'
import { httpApp, sslApp, complexApp } from './fixtures'

describe('buildAS3', () => {
  describe('LB Methods', () => {
    it('maps ROUNDROBIN to round-robin', () => {
      const app = { ...httpApp, lbMethod: 'ROUNDROBIN' }
      const as3 = buildAS3(app)
      expect(as3.declaration.t_test.app_test.serviceMain.loadBalancingMode)
        .toBe('round-robin')
    })
    
    it('maps LEASTCONNECTION to least-connections-member', () => {
      const app = { ...httpApp, lbMethod: 'LEASTCONNECTION' }
      const as3 = buildAS3(app)
      expect(as3.declaration.t_test.app_test.serviceMain.loadBalancingMode)
        .toBe('least-connections-member')
    })
  })
  
  describe('Persistence', () => {
    it('maps SOURCEIP to source-address', () => {
      const app = { ...httpApp, persistenceType: 'SOURCEIP' }
      const as3 = buildAS3(app)
      expect(as3.declaration.t_test.app_test.serviceMain.persistenceMethods)
        .toContain('source-address')
    })
  })
  
  describe('Service Types', () => {
    it('maps SSL to Service_HTTPS', () => {
      const as3 = buildAS3(sslApp)
      expect(as3.declaration.t_test.app_test.serviceMain.class)
        .toBe('Service_HTTPS')
    })
  })
})
```

Every mapping in NS_TO_F5_MAPPINGS.md becomes a test case.

---

## 4. Honest Assessment

### Direct Conversion Wins

| Aspect | Why It's Better |
|--------|-----------------|
| **One layer** | No munge → template dance |
| **TypeScript** | Tests, types, IDE, refactoring |
| **Simple mappings** | `...(app.x && { y: MAPPING[app.x] })` |
| **Testable** | One test per mapping |
| **Debuggable** | Set breakpoints, inspect values |
| **Maintainable** | One file to find, one place to fix |

### Templates Win (In Theory)

| Promise | Reality |
|---------|---------|
| User customization | Nobody customizes them |
| "Declarative" | Munge makes it imperative anyway |
| Separation of concerns | Scattered across 3 places |

### The Real Issue

Templates made sense when FAST was doing heavy lifting. But we're not using FAST's features - just Mustache rendering. And munge is already doing the hard work of transforming data. **Templates are just a passthrough at this point.**

```
Current:   AdcApp → munge (code) → template (yaml) → mustache (hack) → AS3
Proposed:  AdcApp → buildAS3 (code) → AS3
```

### One Caveat

More code upfront. But that code is:
- Testable
- Type-safe
- In one place
- Not scattered across munge + 13 YAML templates

### Bottom Line

Yes, direct conversion is better for this project. Templates add complexity without providing real value since nobody customizes them.

---

## 5. Implementation Design

> **UPDATE:** Originally spec'd as standalone `flipperFAST` package. Now revised to **deep integration** into Flipper codebase under `src/as3/`. See [DIRECT_CONVERSION_IMPL_SPEC.md](DIRECT_CONVERSION_IMPL_SPEC.md) for updated design.

### ~~Package Structure~~ File Structure

```
flipperFAST/
├── src/
│   ├── index.ts                 # Public exports
│   ├── converter.ts             # Main buildAS3() function
│   ├── builders/
│   │   ├── tenant.ts            # buildTenant()
│   │   ├── application.ts       # buildApplication()
│   │   ├── service.ts           # buildService()
│   │   ├── pool.ts              # buildPool()
│   │   ├── monitor.ts           # buildMonitor()
│   │   ├── profiles/
│   │   │   ├── http.ts          # buildHttpProfile()
│   │   │   ├── tcp.ts           # buildTcpProfile()
│   │   │   └── ssl.ts           # buildSslProfile()
│   │   └── index.ts
│   ├── mappings/
│   │   ├── lb-methods.ts        # From NS_TO_F5_MAPPINGS.md §1
│   │   ├── persistence.ts       # From NS_TO_F5_MAPPINGS.md §2
│   │   ├── monitors.ts          # From NS_TO_F5_MAPPINGS.md §3
│   │   ├── service-types.ts     # From NS_TO_F5_MAPPINGS.md §4
│   │   ├── ssl.ts               # From NS_TO_F5_MAPPINGS.md §5
│   │   ├── http-profile.ts      # From NS_TO_F5_MAPPINGS.md §6
│   │   ├── tcp-profile.ts       # From NS_TO_F5_MAPPINGS.md §7
│   │   ├── ignorable.ts         # Params to skip
│   │   └── index.ts             # Re-exports all
│   ├── types/
│   │   ├── adc-app.ts           # Input types (from Flipper)
│   │   ├── as3.ts               # Output types (AS3 schema)
│   │   └── index.ts
│   └── utils/
│       ├── sanitize.ts          # Name sanitization
│       └── coverage.ts          # Coverage analysis
├── tests/
│   ├── converter.test.ts        # Integration tests
│   ├── builders/
│   │   ├── service.test.ts      # Unit tests per builder
│   │   ├── pool.test.ts
│   │   └── ...
│   ├── mappings/
│   │   ├── lb-methods.test.ts   # Test each mapping
│   │   ├── persistence.test.ts
│   │   └── ...
│   └── fixtures/
│       ├── apps/                # Sample AdcApp JSON
│       └── expected/            # Expected AS3 output
├── package.json
├── tsconfig.json
└── README.md
```

### Code Estimates

| Component | Lines | Notes |
|-----------|-------|-------|
| converter.ts | ~50 | Main orchestration |
| builders/* | ~200 | One per AS3 class |
| mappings/* | ~300 | From NS_TO_F5_MAPPINGS.md |
| types/* | ~100 | TypeScript interfaces |
| utils/* | ~50 | Helpers |
| **Total** | **~700** | vs. ~800 lines of YAML templates |

Similar code volume, but:
- 100% testable
- 100% type-safe
- 100% IDE support
- 0% Mustache hacks

### API

```typescript
// Simple API
import { buildAS3, buildAS3Batch } from 'flipperFAST'

// Single app
const as3 = buildAS3(app)

// Batch with coverage
const results = buildAS3Batch(apps, { 
  includeCoverage: true,
  coverageThreshold: 70 
})

// Results include coverage analysis
results.forEach(r => {
  console.log(`${r.app}: ${r.coverage.percentage}% coverage`)
  console.log(`Unmapped: ${r.coverage.unmapped.join(', ')}`)
})
```

---

## 6. Migration Path

### Phase 1: Build New Engine (Week 1-2)

1. Create `flipperFAST` package
2. Implement builders from mappings
3. Write tests for each mapping
4. Verify output matches current templates

### Phase 2: Parallel Testing (Week 3)

1. Run both engines on same input
2. Diff outputs
3. Fix discrepancies
4. Validate with lab deployment

### Phase 3: Integration (Week 4)

1. Wire into Flipper extension
2. Replace FAST Core dependency
3. Update bulk conversion
4. Remove old templates

### Phase 4: Cleanup

1. Remove `mungeNS2FAST()`
2. Remove `templates/as3/*.yaml`
3. Remove `@f5devcentral/f5-fast-core` dependency
4. Update documentation

### Rollback Plan

Keep templates in place until new engine is validated. Feature flag to switch between engines during transition.

---

## 7. Decision

### Recommendation

**Adopt direct TypeScript conversion for flipperFAST.**

### Rationale

1. **Simpler architecture** - One layer instead of two
2. **Better quality** - Type-safe, testable, debuggable
3. **Easier maintenance** - One place to look, one place to fix
4. **Same effort** - ~700 lines of TypeScript vs ~800 lines of YAML
5. **Future-proof** - Easy to add XC/NGINX output later
6. **Honest reality** - Nobody customizes templates anyway

### What We Gain

- Unit tests for every mapping
- IDE support (autocomplete, refactoring, error detection)
- Type safety (catch errors at compile time)
- Debuggability (breakpoints, inspection)
- Single source of truth (no munge + template scatter)

### What We Lose

- Theoretical user customization (that nobody uses)
- "Declarative" templates (that aren't really declarative)

### Next Steps

1. ✅ Review and approve this decision
2. ✅ Create `src/as3/` directory in Flipper
3. ✅ Port mappings from NS_TO_F5_MAPPINGS.md to TypeScript
4. ✅ Implement builders with tests
5. ☐ Parallel test against current output
6. ☐ Wire into Flipper (replace template calls)
7. ☐ Remove old template infrastructure

---

## Appendix: Related Documents

| Document | Purpose |
|----------|---------|
| [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md) | Comprehensive feature mappings (source for TypeScript mappings) |
| [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md) | Gap detection design (uses direct conversion) |
| [BULK_CONVERSION_ENGINE_SPEC.md](BULK_CONVERSION_ENGINE_SPEC.md) | Original bulk conversion spec (to be updated) |
| [BORG.md](BORG.md) | Source analysis of existing conversion tools |

---

*Decision document. Last updated: 2026-01-14*
