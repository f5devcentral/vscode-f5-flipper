# DIRECT CONVERSION ENGINE - IMPLEMENTATION SPEC
## Deep Integration into Flipper

**Status**: IN PROGRESS  
**Created**: 2026-01-14  
**Updated**: 2026-01-15  
**Depends On**: [DIRECT_CONVERSION_ADR.md](DIRECT_CONVERSION_ADR.md)  
**Related**: [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md), [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [ADC Class Integration](#4-adc-class-integration)
5. [Mapping Files](#5-mapping-files)
6. [Builder Functions](#6-builder-functions)
7. [Coverage Analysis](#7-coverage-analysis)
8. [Testing Strategy](#8-testing-strategy)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Overview

### Goal

Replace the current munge → FAST template pipeline with direct TypeScript-based AS3 generation, deeply integrated into the existing Flipper codebase.

```
Current:  AdcApp → mungeNS2FAST() → YAML Template → Mustache → AS3
New:      AdcApp → adc.buildAS3(app) → AS3
```

### Key Decision: Deep Integration, Not Standalone

**Why not a separate package:**
- No external consumers - only Flipper uses this
- Tightly coupled to AdcApp type already defined in Flipper
- Simpler build/test/deploy
- No version management overhead
- Direct access to existing utilities

**Integration point:** Add `buildAS3()` method directly to the ADC class or as a closely integrated module.

### Principles

1. **One mapping = one line of code** - Easy to add, test, maintain
2. **Type-safe throughout** - Leverage existing Flipper types
3. **Testable at every level** - Unit tests per mapping
4. **Minimal surface area** - One main function: `buildAS3()`

---

## 2. Architecture

### Current Flow (to be replaced)

```
src/
├── nsFastTemplates.ts      # mungeNS2FAST() - transforms AdcApp to template params
├── templateEngine.ts       # Wraps FAST Core Mustache rendering
└── templates/as3/*.yaml    # 13 YAML templates
```

### New Flow

```
src/
├── as3/
│   ├── index.ts            # Exports buildAS3()
│   ├── builders.ts         # Service, Pool, Monitor builders
│   └── mappings.ts         # All NS → F5 mappings
└── AdcApp.ts               # Existing - add buildAS3() method
```

### Integration Options

**Option A: Method on ADC class**
```typescript
// In AdcApp or parent ADC class
class ADC {
  buildAS3(app: AdcApp, options?: ConvertOptions): AS3Declaration {
    return buildAS3(app, options)
  }
}
```

**Option B: Standalone function imported where needed**
```typescript
// In fastWebView.ts, nsCfgViewProvider.ts
import { buildAS3 } from './as3'

const as3 = buildAS3(app)
```

**Recommendation:** Option B - cleaner separation, easier to test, same convenience.

---

## 3. File Structure

```
vscode-f5-flipper/
├── src/
│   ├── as3/                          # NEW - Direct conversion engine
│   │   ├── index.ts                  # Main export: buildAS3()
│   │   ├── builders.ts               # Builder functions
│   │   ├── mappings.ts               # All NS → F5 mappings
│   │   └── types.ts                  # AS3 output types (if not already defined)
│   │
│   ├── AdcExplosion.ts              # Existing - no changes
│   ├── AdcParse.ts                  # Existing - no changes  
│   ├── digLbVserverRx.ts            # Existing - no changes
│   ├── digCsVserverRx.ts            # Existing - no changes
│   │
│   ├── nsFastTemplates.ts           # REMOVE after migration
│   ├── templateEngine.ts            # REMOVE after migration
│   └── templates/                    # REMOVE after migration
│
├── tests/
│   ├── as3/                          # NEW - Conversion tests
│   │   ├── builders.test.ts
│   │   ├── mappings.test.ts
│   │   └── fixtures/
│   │       ├── http-basic.json
│   │       └── ssl-offload.json
│   │
│   └── existing tests...
```

**File count:** ~4 new files, ~15 files removed (templates + engine)

---

## 4. ADC Class Integration

### Main Entry Point

```typescript
// src/as3/index.ts

import type { AdcApp } from '../models'
import { buildDeclaration } from './builders'
import { analyzeCoverage } from './coverage'

export interface ConvertOptions {
  schemaVersion?: string        // Default: '3.50.0'
  tenantPrefix?: string         // Default: 't'
  includeCoverage?: boolean     // Default: true
}

export interface ConversionResult {
  success: boolean
  as3?: AS3Declaration
  error?: string
  coverage?: CoverageResult
}

/**
 * Convert an AdcApp to AS3 declaration.
 * This is the main entry point - replaces mungeNS2FAST + template rendering.
 */
export function buildAS3(app: AdcApp, options: ConvertOptions = {}): ConversionResult {
  const opts = {
    schemaVersion: '3.50.0',
    tenantPrefix: 't',
    includeCoverage: true,
    ...options
  }
  
  try {
    const as3 = buildDeclaration(app, opts)
    
    return {
      success: true,
      as3,
      ...(opts.includeCoverage && { 
        coverage: analyzeCoverage(app, as3) 
      })
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Convert multiple apps and merge into single declaration.
 */
export function buildAS3Bulk(apps: AdcApp[], options: ConvertOptions = {}): ConversionResult {
  const tenants: Record<string, AS3Tenant> = {}
  const errors: string[] = []
  
  for (const app of apps) {
    const result = buildAS3(app, options)
    
    if (result.success && result.as3) {
      // Merge tenants
      Object.assign(tenants, result.as3.declaration)
    } else if (result.error) {
      errors.push(`${app.name}: ${result.error}`)
    }
  }
  
  if (Object.keys(tenants).length === 0) {
    return { success: false, error: errors.join('; ') }
  }
  
  return {
    success: true,
    as3: {
      class: 'AS3',
      action: 'deploy',
      declaration: {
        class: 'ADC',
        schemaVersion: options.schemaVersion || '3.50.0',
        ...tenants
      }
    }
  }
}
```

### Usage in Existing Code

```typescript
// src/fastWebView.ts - Single app conversion

import { buildAS3 } from './as3'

async renderAS3(app: AdcApp) {
  const result = buildAS3(app)
  
  if (!result.success) {
    vscode.window.showErrorMessage(`Conversion failed: ${result.error}`)
    return
  }
  
  // Display AS3
  this.showAS3Output(result.as3)
  
  // Show coverage if available
  if (result.coverage) {
    this.showCoverageIndicator(result.coverage.percentage)
  }
}
```

```typescript
// src/nsCfgViewProvider.ts - Bulk conversion

import { buildAS3Bulk } from './as3'

async bulk() {
  const apps = this.explosion.config.apps.filter(a => a.type !== 'gslb')
  
  const result = buildAS3Bulk(apps)
  
  if (!result.success) {
    vscode.window.showErrorMessage(result.error)
    return
  }
  
  this.openAS3Document(result.as3)
}
```

---

## 5. Mapping Files

### Single Mappings File

All mappings in one file for simplicity - can split later if it grows too large.

```typescript
// src/as3/mappings.ts

/**
 * NetScaler to F5 mappings.
 * Source: specs/NS_TO_F5_MAPPINGS.md
 */

// ============================================================================
// LB Methods (Section 1)
// ============================================================================

export const LB_METHODS: Record<string, string> = {
  'ROUNDROBIN': 'round-robin',
  'LEASTCONNECTION': 'least-connections-member',
  'LEASTCONNECTIONS': 'least-connections-member',
  'LEASTRESPONSETIME': 'fastest-app-response',
  'LEASTBANDWIDTH': 'least-connections-member',
  'LEASTPACKETS': 'least-connections-member',
  'URLHASH': 'least-connections-member',
  'DOMAINHASH': 'least-connections-member',
  'DESTINATIONIPHASH': 'least-connections-member',
  'SOURCEIPHASH': 'least-connections-member',
  'SRCIPDESTIPHASH': 'least-connections-member',
  'CALLIDHASH': 'least-connections-member',
  'TOKEN': 'least-connections-member',
  'LRTM': 'fastest-app-response',
}

export function getLbMethod(ns: string): string {
  return LB_METHODS[ns?.toUpperCase()] || 'round-robin'
}

// ============================================================================
// Persistence Types (Section 2)
// ============================================================================

export const PERSISTENCE_TYPES: Record<string, string | null> = {
  'SOURCEIP': 'source-address',
  'COOKIEINSERT': 'cookie',
  'SSLSESSION': 'ssl',
  'RULE': 'universal',
  'URLPASSIVE': 'cookie',
  'CUSTOMSERVERID': 'universal',
  'DESTIP': 'destination-address',
  'SRCIPDESTIP': 'source-address',
  'CALLID': 'sip',
  'RTSPSID': 'hash',
  'NONE': null,
}

export function getPersistence(ns: string): string | null {
  return PERSISTENCE_TYPES[ns?.toUpperCase()] ?? null
}

// ============================================================================
// Service Types (Section 4)
// ============================================================================

export const SERVICE_CLASSES: Record<string, string> = {
  'HTTP': 'Service_HTTP',
  'SSL': 'Service_HTTPS',
  'SSL_BRIDGE': 'Service_TCP',
  'TCP': 'Service_TCP',
  'UDP': 'Service_UDP',
  'DNS': 'Service_UDP',
  'DNS_TCP': 'Service_TCP',
  'FTP': 'Service_TCP',
  'SSL_TCP': 'Service_TCP',
  'ANY': 'Service_L4',
  'SIP_UDP': 'Service_UDP',
  'SIP_TCP': 'Service_TCP',
  'RADIUS': 'Service_UDP',
  'RDP': 'Service_TCP',
}

export function getServiceClass(ns: string): string {
  return SERVICE_CLASSES[ns?.toUpperCase()] || 'Service_TCP'
}

// ============================================================================
// Monitor Types (Section 3)
// ============================================================================

export const MONITOR_TYPES: Record<string, string> = {
  'HTTP': 'http',
  'HTTP-ECV': 'http',
  'HTTPS': 'https',
  'HTTPS-ECV': 'https',
  'TCP': 'tcp',
  'TCP-ECV': 'tcp',
  'UDP': 'udp',
  'PING': 'icmp',
  'DNS': 'dns',
  'FTP': 'ftp',
  'LDAP': 'ldap',
  'RADIUS': 'radius',
  'MYSQL': 'mysql',
  'SMTP': 'smtp',
  'USER': 'external',
}

export function getMonitorType(ns: string): string {
  return MONITOR_TYPES[ns?.toUpperCase()] || 'tcp'
}

// ============================================================================
// Ignorable Parameters (Section 14)
// ============================================================================

export const IGNORABLE = new Set([
  'devno', 'state', 'comment',
  'sc', 'sp', 'cachetype', 'cacheable',
  'precedence', 'priority', 'gotopriorityexpression',
  'somethod', 'sothreshold', 'sopersistence',
  'downstateflush', 'td',
])

export function isIgnorable(param: string): boolean {
  return IGNORABLE.has(param.toLowerCase().replace('-', ''))
}
```

---

## 6. Builder Functions

### All Builders in One File

```typescript
// src/as3/builders.ts

import type { AdcApp } from '../models'
import { getLbMethod, getPersistence, getServiceClass, getMonitorType } from './mappings'

// ============================================================================
// Types
// ============================================================================

export interface AS3Declaration {
  class: 'AS3'
  action?: string
  declaration: {
    class: 'ADC'
    schemaVersion: string
    [tenant: string]: any
  }
}

interface BuildOptions {
  schemaVersion: string
  tenantPrefix: string
}

// ============================================================================
// Main Builder
// ============================================================================

export function buildDeclaration(app: AdcApp, opts: BuildOptions): AS3Declaration {
  const tenantName = `${opts.tenantPrefix}_${sanitize(app.name)}`
  const appName = `app_${sanitize(app.name)}`
  
  return {
    class: 'AS3',
    action: 'deploy',
    declaration: {
      class: 'ADC',
      schemaVersion: opts.schemaVersion,
      [tenantName]: {
        class: 'Tenant',
        [appName]: buildApplication(app)
      }
    }
  }
}

// ============================================================================
// Application Builder
// ============================================================================

function buildApplication(app: AdcApp): object {
  const result: Record<string, any> = {
    class: 'Application',
    serviceMain: buildService(app),
  }
  
  // Add pool if exists
  if (app.pool) {
    result[`pool_${sanitize(app.name)}`] = buildPool(app)
  }
  
  // Add monitors
  if (app.monitors?.length) {
    for (const mon of app.monitors) {
      result[`mon_${sanitize(mon.name)}`] = buildMonitor(mon)
    }
  }
  
  return result
}

// ============================================================================
// Service Builder
// ============================================================================

function buildService(app: AdcApp): object {
  const serviceClass = getServiceClass(app.serviceType)
  
  return {
    class: serviceClass,
    virtualAddresses: [app.address],
    virtualPort: app.port,
    
    // Pool reference
    ...(app.pool && { 
      pool: `pool_${sanitize(app.name)}` 
    }),
    
    // LB Method
    ...(app.lbMethod && { 
      loadBalancingMode: getLbMethod(app.lbMethod) 
    }),
    
    // Persistence
    ...buildPersistence(app),
    
    // SNAT
    ...buildSnat(app),
    
    // Timeouts
    ...(app.clientTimeout && { 
      idleTimeout: app.clientTimeout 
    }),
    
    // SSL (for HTTPS)
    ...(serviceClass === 'Service_HTTPS' && app.sslProfile && {
      clientTLS: { bigip: `/Common/${app.sslProfile}` }
    }),
  }
}

function buildPersistence(app: AdcApp): object {
  if (!app.persistenceType) return {}
  
  const method = getPersistence(app.persistenceType)
  if (!method) return {}
  
  return { persistenceMethods: [method] }
}

function buildSnat(app: AdcApp): object {
  switch (app.snatType) {
    case 'automap': return { snat: 'auto' }
    case 'pool': return { snat: { use: app.snatPool?.[0] } }
    default: return {}
  }
}

// ============================================================================
// Pool Builder
// ============================================================================

function buildPool(app: AdcApp): object {
  if (!app.pool) return {}
  
  return {
    class: 'Pool',
    
    members: app.pool.members.map(m => ({
      servicePort: m.port,
      serverAddresses: [m.address],
      ...(m.weight && { ratio: m.weight }),
    })),
    
    ...(app.lbMethod && { 
      loadBalancingMode: getLbMethod(app.lbMethod) 
    }),
    
    ...(app.monitors?.length && {
      monitors: app.monitors.map(m => ({ use: `mon_${sanitize(m.name)}` }))
    }),
  }
}

// ============================================================================
// Monitor Builder
// ============================================================================

function buildMonitor(mon: AdcMonitor): object {
  return {
    class: 'Monitor',
    monitorType: getMonitorType(mon.type),
    
    ...(mon.interval && { interval: mon.interval }),
    ...(mon.timeout && { timeout: mon.timeout }),
    ...(mon.send && { send: mon.send }),
    ...(mon.recv && { receive: mon.recv }),
  }
}

// ============================================================================
// Utilities
// ============================================================================

function sanitize(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .substring(0, 48)
}
```

---

## 7. Coverage Analysis

```typescript
// src/as3/coverage.ts

import type { AdcApp } from '../models'
import { isIgnorable } from './mappings'

export interface CoverageResult {
  percentage: number
  mapped: string[]
  unmapped: string[]
  ignored: string[]
}

/**
 * Analyze what was mapped vs dropped.
 * Uses app._rawProps or app.lines if available.
 */
export function analyzeCoverage(app: AdcApp, as3: any): CoverageResult {
  const allParams = extractParams(app)
  
  const mapped: string[] = []
  const unmapped: string[] = []
  const ignored: string[] = []
  
  // Core params we always map
  const mappedParams = new Set([
    'name', 'ipaddress', 'port', 'servicetype',
    'lbmethod', 'persistencetype', 'timeout',
  ])
  
  for (const param of allParams) {
    const key = param.toLowerCase().replace('-', '')
    
    if (isIgnorable(key)) {
      ignored.push(param)
    } else if (mappedParams.has(key)) {
      mapped.push(param)
    } else {
      unmapped.push(param)
    }
  }
  
  const total = mapped.length + unmapped.length
  const percentage = total > 0 ? Math.round((mapped.length / total) * 100) : 100
  
  return { percentage, mapped, unmapped, ignored }
}

function extractParams(app: AdcApp): string[] {
  // If raw props available, use those
  if (app._rawProps) {
    return Object.keys(app._rawProps)
  }
  
  // Otherwise parse from lines
  if (app.lines) {
    const params: string[] = []
    const regex = /-(\w+)/g
    
    for (const line of app.lines) {
      let match
      while ((match = regex.exec(line)) !== null) {
        params.push(match[1])
      }
    }
    return [...new Set(params)]
  }
  
  return []
}
```

---

## 8. Testing Strategy

### Test Structure

```
tests/
├── as3/
│   ├── mappings.test.ts      # Unit: each mapping function
│   ├── builders.test.ts      # Unit: each builder
│   ├── index.test.ts         # Integration: buildAS3()
│   └── fixtures/
│       ├── http-basic.ts     # Input fixture
│       └── ssl-offload.ts
```

### Mapping Tests

```typescript
// tests/as3/mappings.test.ts

import { getLbMethod, getPersistence, getServiceClass, getMonitorType } from '../../src/as3/mappings'

describe('mappings', () => {
  describe('getLbMethod', () => {
    test.each([
      ['ROUNDROBIN', 'round-robin'],
      ['LEASTCONNECTION', 'least-connections-member'],
      ['LEASTRESPONSETIME', 'fastest-app-response'],
    ])('%s → %s', (input, expected) => {
      expect(getLbMethod(input)).toBe(expected)
    })
    
    it('defaults to round-robin', () => {
      expect(getLbMethod('UNKNOWN')).toBe('round-robin')
    })
  })
  
  describe('getPersistence', () => {
    test.each([
      ['SOURCEIP', 'source-address'],
      ['COOKIEINSERT', 'cookie'],
      ['SSLSESSION', 'ssl'],
      ['NONE', null],
    ])('%s → %s', (input, expected) => {
      expect(getPersistence(input)).toBe(expected)
    })
  })
  
  describe('getServiceClass', () => {
    test.each([
      ['HTTP', 'Service_HTTP'],
      ['SSL', 'Service_HTTPS'],
      ['TCP', 'Service_TCP'],
      ['UDP', 'Service_UDP'],
    ])('%s → %s', (input, expected) => {
      expect(getServiceClass(input)).toBe(expected)
    })
  })
})
```

### Builder Tests

```typescript
// tests/as3/builders.test.ts

import { buildDeclaration } from '../../src/as3/builders'
import { httpBasicApp, sslApp } from './fixtures'

describe('builders', () => {
  const opts = { schemaVersion: '3.50.0', tenantPrefix: 't' }
  
  describe('buildDeclaration', () => {
    it('creates valid AS3 structure', () => {
      const result = buildDeclaration(httpBasicApp, opts)
      
      expect(result.class).toBe('AS3')
      expect(result.declaration.class).toBe('ADC')
      expect(result.declaration.schemaVersion).toBe('3.50.0')
    })
    
    it('creates tenant with app name', () => {
      const result = buildDeclaration(httpBasicApp, opts)
      
      expect(result.declaration.t_web_app).toBeDefined()
      expect(result.declaration.t_web_app.class).toBe('Tenant')
    })
  })
  
  describe('service builder', () => {
    it('uses Service_HTTP for HTTP type', () => {
      const result = buildDeclaration(httpBasicApp, opts)
      const service = result.declaration.t_web_app.app_web_app.serviceMain
      
      expect(service.class).toBe('Service_HTTP')
    })
    
    it('uses Service_HTTPS for SSL type', () => {
      const result = buildDeclaration(sslApp, opts)
      const service = result.declaration.t_ssl_app.app_ssl_app.serviceMain
      
      expect(service.class).toBe('Service_HTTPS')
    })
    
    it('maps LB method', () => {
      const result = buildDeclaration(httpBasicApp, opts)
      const service = result.declaration.t_web_app.app_web_app.serviceMain
      
      expect(service.loadBalancingMode).toBe('round-robin')
    })
  })
})
```

### Integration Tests

```typescript
// tests/as3/index.test.ts

import { buildAS3, buildAS3Bulk } from '../../src/as3'
import { httpBasicApp, sslApp, tcpApp } from './fixtures'

describe('buildAS3', () => {
  it('returns success for valid app', () => {
    const result = buildAS3(httpBasicApp)
    
    expect(result.success).toBe(true)
    expect(result.as3).toBeDefined()
  })
  
  it('includes coverage by default', () => {
    const result = buildAS3(httpBasicApp)
    
    expect(result.coverage).toBeDefined()
    expect(result.coverage?.percentage).toBeGreaterThan(0)
  })
  
  it('can disable coverage', () => {
    const result = buildAS3(httpBasicApp, { includeCoverage: false })
    
    expect(result.coverage).toBeUndefined()
  })
})

describe('buildAS3Bulk', () => {
  it('merges multiple apps into one declaration', () => {
    const result = buildAS3Bulk([httpBasicApp, sslApp, tcpApp])
    
    expect(result.success).toBe(true)
    expect(Object.keys(result.as3!.declaration)).toContain('t_web_app')
    expect(Object.keys(result.as3!.declaration)).toContain('t_ssl_app')
    expect(Object.keys(result.as3!.declaration)).toContain('t_tcp_app')
  })
})
```

### Fixtures

```typescript
// tests/as3/fixtures/index.ts

import type { AdcApp } from '../../../src/models'

export const httpBasicApp: AdcApp = {
  name: 'web_app',
  type: 'lb',
  address: '10.1.1.100',
  port: 80,
  serviceType: 'HTTP',
  lbMethod: 'ROUNDROBIN',
  persistenceType: 'SOURCEIP',
  pool: {
    name: 'web_pool',
    members: [
      { address: '10.2.1.1', port: 80 },
      { address: '10.2.1.2', port: 80 },
    ]
  }
}

export const sslApp: AdcApp = {
  name: 'ssl_app',
  type: 'lb',
  address: '10.1.1.101',
  port: 443,
  serviceType: 'SSL',
  lbMethod: 'LEASTCONNECTION',
  sslProfile: 'clientssl',
  pool: {
    name: 'ssl_pool',
    members: [
      { address: '10.2.1.3', port: 443 },
    ]
  }
}

export const tcpApp: AdcApp = {
  name: 'tcp_app',
  type: 'lb',
  address: '10.1.1.102',
  port: 8080,
  serviceType: 'TCP',
}
```

---

## 9. Implementation Phases

### Phase 1: Core Engine (3-4 days) ✅ COMPLETE

**Create new files:**
- [x] `src/as3/index.ts` - Main `buildAS3()` function
- [x] `src/as3/builders.ts` - All builder functions
- [x] `src/as3/mappings.ts` - All NS → F5 mappings
- [x] `src/as3/coverage.ts` - Coverage analysis

**Tests:**
- [x] `tests/060_as3_mappings.unit.tests.ts`
- [x] `tests/061_as3_builders.unit.tests.ts`
- [x] `tests/062_as3_integration.unit.tests.ts`
- [x] `tests/063_as3_coverage.unit.tests.ts`

**Deliverable:** Working `buildAS3()` that produces valid AS3 ✅

**Design Decisions Made:**
- No `template` property (AS3 defaults to generic behavior)
- Custom service names (`vs_${appName}`) instead of `serviceMain`
- Tenant prefix configurable (default: `t`)
- App prefix: `app_${appName}`
- Pool prefix: `pool_${appName}`
- Monitor prefix: `mon_${monName}`

### Phase 2: Integration (2 days) - IN PROGRESS

**Update existing files:**
- [ ] `src/fastWebView.ts` - Use `buildAS3()` for single app
- [ ] `src/nsCfgViewProvider.ts` - Use `buildAS3Bulk()` for bulk

**Verify:**
- [ ] Single app conversion works in UI
- [ ] Bulk conversion works
- [ ] Output matches expected AS3 structure

**Deliverable:** Flipper using new engine

### Phase 3: Cleanup (1 day)

**Remove old files:**
- [ ] `src/nsFastTemplates.ts`
- [ ] `src/templateEngine.ts`
- [ ] `src/templates/as3/*.yaml` (13 files)

**Update:**
- [ ] `package.json` - Remove `@f5devcentral/f5-fast-core`
- [ ] Any remaining imports

**Deliverable:** Clean codebase, no template code

### Phase 4: Validation (2-3 days)

- [ ] Test with real customer configs
- [ ] Compare output to previous engine
- [ ] Lab deployment validation
- [ ] Fix any discrepancies

**Deliverable:** Production-ready conversion

### Total Estimate: 1.5-2 weeks

---

## Appendix: File Summary

### New Files (Created)

| File | Lines | Purpose |
|------|-------|--------|
| `src/as3/index.ts` | ~140 | Main entry: `buildAS3()`, `buildAS3Bulk()` |
| `src/as3/builders.ts` | ~280 | Declaration, Service, Pool, Monitor builders |
| `src/as3/mappings.ts` | ~220 | All NS → F5 mappings + `sanitizeName()` |
| `src/as3/coverage.ts` | ~200 | Coverage analysis + reporting |
| **Total** | **~840** | |

### Test Files (Created)

| File | Tests | Purpose |
|------|-------|--------|
| `tests/060_as3_mappings.unit.tests.ts` | ~45 | LB, persistence, service, monitor mappings |
| `tests/061_as3_builders.unit.tests.ts` | ~45 | Declaration structure, builders, edge cases |
| `tests/062_as3_integration.unit.tests.ts` | ~35 | `buildAS3()`, `buildAS3Bulk()`, scenarios |
| `tests/063_as3_coverage.unit.tests.ts` | ~35 | Coverage analysis, summarization |
| **Total** | **~160** | |

### Files to Remove (~15)

| File | Lines | Reason |
|------|-------|--------|
| `src/nsFastTemplates.ts` | ~400 | Replaced by builders |
| `src/templateEngine.ts` | ~100 | No longer needed |
| `templates/as3/*.yaml` (13) | ~800 | Replaced by builders |
| **Total** | **~1300** | |

### Net Change

- **Add:** ~410 lines of TypeScript
- **Remove:** ~1300 lines of TypeScript + YAML
- **Net:** -890 lines

Less code, better quality, fully testable.

---

## Appendix: Comparison to Old Approach

| Aspect | Old (Templates) | New (Direct) |
|--------|-----------------|--------------|
| Files | 15+ | 4 |
| Lines | ~1300 | ~410 |
| Languages | TS + YAML + Mustache | TypeScript only |
| Type safety | Partial | Full |
| Testability | Integration only | Unit + Integration |
| IDE support | Partial | Full |
| Dependencies | FAST Core (heavy) | None |

---

*Implementation spec pending ADR approval. Last updated: 2026-01-15*
