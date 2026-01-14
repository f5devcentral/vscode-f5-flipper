# CONVERSION ENGINE SPECIFICATION
## Issue #60 - Bulk AS3 Conversion Architecture

**Status**: DECISIONS CONFIRMED  
**Created**: 2026-01-14  
**Updated**: 2026-01-14  
**Related**: [PROJECT_ORCID.md](PROJECT_ORCID.md) Section 2.3, [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md), [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md), [DIRECT_CONVERSION_ADR.md](DIRECT_CONVERSION_ADR.md), AFTON (legacy bulk conversion)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Confirmed Decisions](#2-confirmed-decisions)
3. [Current State Analysis](#3-current-state-analysis)
4. [FAST Core Analysis & Replacement](#4-fast-core-analysis--replacement)
5. [Standalone Project Architecture](#5-standalone-project-architecture)
6. [Implementation Plan](#6-implementation-plan)
7. [AS3 Utilities](#7-as3-utilities)
8. [Future Enhancements](#8-future-enhancements)
9. [Migration Path](#9-migration-path)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### The Problem

The original AFTON bulk conversion was disabled because:
1. Templates failed unless they went through the HTML preview process
2. Missing `autoRenderHTML()` method on FastWebView
3. No error handling for failed conversions
4. No visibility into what succeeded/failed

### Target Users & Workflows

Flipper serves two equally important user workflows:

#### Workflow 1: Interactive Single App (Primary Seller)

**User:** Engineers evaluating/migrating individual applications

**Flow:**
```
Click App → HTML Preview → Review/Edit Params → Convert to AS3 → Test → Deploy
```

**Key Needs:**
- Visual preview of conversion parameters
- Ability to modify before conversion
- Immediate feedback on changes
- One app at a time, iterative refinement

#### Workflow 2: Bulk Conversion (F5 Professional Services)

**User:** PS engineers handling large customer migrations

**Flow:**
```
Load Config → Bulk Convert All → Export AS3 → Custom Scripts → Review/Modify → Deploy
```

**Key Needs:**
- Convert everything at once
- JSON/report output for scripting
- Handle tenant organization themselves
- Build custom deployment flows per customer

**Implication:** Both workflows are critical. The new engine must serve both without compromising either. Keep Flipper simple - provide building blocks, let PS code custom flows.

### Solution

Build a **standalone conversion engine** (`flipperFAST`) that:
- Replaces `@f5devcentral/f5-fast-core` entirely
- Converts all apps to individual AS3 tenants
- Provides utility functions for post-processing (merge tenants, group apps)
- Can be used in Flipper, CLI tools, or other projects

---

## 2. Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Template Engine** | Full Custom Replacement | FAST Core is overkill; only 4 methods used |
| **Conversion Flow** | Convert All Apps | Pro Services wants bulk output to review/modify |
| **Tenant Strategy** | Per-App Tenants | Safest default; provide merge utilities |
| **Error Handling** | Best-effort + Report | Convert what we can, report failures |
| **Project Structure** | Standalone Package | Reusable, cleaner code/tests, separate concerns |

### Decision Log

| Date | Decision | Rationale | Owner |
|------|----------|-----------|-------|
| 2026-01-14 | Full FAST Core Replacement | Only using 4 methods; ~200 lines to replace | Snow |
| 2026-01-14 | Per-App Tenants | Pro Services handles grouping themselves | Snow |
| 2026-01-14 | Convert All Apps | Match Pro Services workflow | Snow |
| 2026-01-14 | Standalone Package | Reuse potential, cleaner separation | Snow |

---

## 3. Current State Analysis

### 3.1 Verified: What's Broken

**AFTON Bulk Conversion** (`nsCfgViewProvider.ts:~818`):
```typescript
async bulk() {
    window.showErrorMessage('AFTON functionality in development - not working right now')
    // Loop is commented out - calls non-existent autoRenderHTML()
}
```

**Confirmed Root Causes:**
1. ✅ `autoRenderHTML()` does not exist on FastWebView class
2. ✅ Templates require HTML preview to apply defaults
3. ✅ No programmatic rendering path
4. ✅ No batch error collection

### 3.2 What Works (Keep)

**Individual App Conversion Pipeline:**
```
AdcApp → mungeNS2FAST() → FAST Template → HTML Preview → User Edits → AS3 Output
```

- 13 protocol templates in `templates/as3/` (HTTP, SSL, TCP, UDP, DNS, etc.)
- Parameter transformation via `ns2FastParams.ts`
- HTML preview with JSONEditor (`localHtmlPreview.ts` - already local implementation)
- Feature detection provides platform recommendations

### 3.3 Current Dependencies

```json
// package.json
"@f5devcentral/f5-fast-core": "^0.25.0",  // TO BE REMOVED
"mustache": "^4.2.0",                      // KEEP - already direct dep
"js-yaml": "^4.1.0",                       // KEEP - already direct dep
```

---

## 4. FAST Core Analysis & Replacement

### 4.1 Actual Usage in Flipper

**Only 4 methods used from FAST Core:**

```typescript
// fastWebView.ts
this.fastEngine = new fast.FsTemplateProvider(localPath)  // Load templates from disk
const template = await this.fastEngine.fetch(templateName) // Get template
const schema = template.getParametersSchema()              // Extract JSON schema
const defaults = template.getCombinedParameters()          // Get default values
const rendered = template.render(params)                   // Mustache render
```

**Already replaced locally:**
- `localHtmlPreview.ts` (200+ lines) reimplements `guiUtils.generateHtmlPreview()`

### 4.2 FAST Core Features NOT Used

- HTTP template fetching
- BIG-IP authentication
- Template sets/merging
- Remote data providers
- Secrets management
- Transaction handling
- AS3 driver

### 4.3 Replacement Complexity: LOW

**Estimated ~150-200 lines of TypeScript:**

```typescript
// Core replacement
interface Template {
  title: string
  description?: string
  definitions: Record<string, JSONSchemaProperty>
  template: string  // Mustache template text
}

class TemplateEngine {
  private templates: Map<string, Template> = new Map()
  
  loadFromDirectory(dir: string): void {
    // Read YAML files, parse, store in map
  }
  
  getSchema(name: string): JSONSchema {
    return this.templates.get(name)?.definitions
  }
  
  getDefaults(name: string): Record<string, any> {
    // Extract default values from definitions
  }
  
  render(name: string, params: Record<string, any>): object {
    const template = this.templates.get(name)
    const withDefaults = this.applyDefaults(params, template.definitions)
    const rendered = Mustache.render(template.template, withDefaults)
    return JSON.parse(this.cleanupJSON(rendered))
  }
  
  private cleanupJSON(json: string): string {
    // Remove trailing commas from Mustache output
  }
  
  private applyDefaults(params: object, schema: object): object {
    // Merge defaults from schema into params
  }
}
```

### 4.4 How New Engine Serves Both Workflows

**The Core Problem with FAST Core:**

The current architecture has a hidden dependency: default values are only applied during HTML preview generation. This is why bulk conversion broke - it tried to skip the preview step.

```
Current Single App:  mungeNS2FAST() → [HTML Preview applies defaults] → render() ✅
Current Bulk:        mungeNS2FAST() → render() ❌ (no defaults = broken)
```

**The Architectural Fix:**

Make `applyDefaults()` an explicit, always-executed step. HTML preview becomes an optional UI layer, not a required processing step.

```typescript
// BOTH workflows now use the same core path:

// Single App (with preview)
const params = transformParams(app)                    // mungeNS2FAST()
const withDefaults = engine.applyDefaults(params)      // Explicit!
const html = generateHtmlPreview(schema, withDefaults) // Optional UI
// ... user edits in preview ...
const as3 = engine.render(templateName, userEditedParams)

// Bulk (no preview)
const params = transformParams(app)                    // Same!
const withDefaults = engine.applyDefaults(params)      // Same!
const as3 = engine.render(templateName, withDefaults)  // Same!
```

**Benefits for Each Workflow:**

| Aspect | Single App Flow | Bulk Flow |
|--------|-----------------|----------|
| **UX** | Unchanged - preview still works | Now works - was broken |
| **Defaults** | Applied before preview shows | Applied automatically |
| **Errors** | Better messages in preview | Collected in report |
| **Performance** | Lighter dependency, faster load | Batch processing possible |
| **Debugging** | Full visibility into params | Full visibility into failures |

**Single App UX Impact:** None. Users still click app → see preview → edit → convert. The change is under the hood - cleaner architecture, better error messages, faster startup.

---

## 5. Standalone Project Architecture

### 5.1 Rationale for Separate Package

| Benefit | Description |
|---------|-------------|
| **Reusability** | Use in Flipper, CLI tools, CI/CD pipelines, other extensions |
| **Clean Testing** | Unit tests without VS Code extension complexity |
| **Focused Scope** | Conversion logic only, no UI concerns |
| **Independent Versioning** | Update converter without releasing full extension |
| **Contributor Friendly** | Easier for others to contribute/fork |

### 5.2 Proposed Package Structure

```
flipperFAST/
├── src/
│   ├── index.ts                   # Public API exports
│   ├── templateEngine.ts          # YAML/Mustache template handling
│   ├── converter.ts               # Main conversion orchestration
│   ├── paramTransformer.ts        # AdcApp → TemplateParams (from ns2FastParams.ts)
│   ├── as3/
│   │   ├── types.ts               # AS3 TypeScript interfaces
│   │   ├── merger.ts              # Tenant/declaration merging utilities
│   │   ├── validator.ts           # Optional AS3 schema validation
│   │   └── builder.ts             # Programmatic AS3 construction helpers
│   └── utils/
│       ├── mustache.ts            # Mustache helpers (cleanup trailing commas)
│       └── schema.ts              # JSON Schema utilities
├── templates/                     # Copy of templates/as3/*.yaml
│   ├── HTTP.yaml
│   ├── SSL.yaml
│   └── ...
├── tests/
│   ├── templateEngine.test.ts
│   ├── converter.test.ts
│   ├── paramTransformer.test.ts
│   └── fixtures/
│       ├── apps/                  # Sample AdcApp JSON fixtures
│       └── expected/              # Expected AS3 output
├── package.json
├── tsconfig.json
└── README.md
```

### 5.3 Public API

```typescript
// flipperFAST

// Main conversion
export function convertApp(app: AdcApp, options?: ConvertOptions): ConversionResult
export function convertApps(apps: AdcApp[], options?: ConvertOptions): BatchResult

// Template engine (if needed directly)
export class TemplateEngine {
  loadTemplates(dir: string): void
  render(templateName: string, params: object): AS3Declaration
  listTemplates(): string[]
}

// AS3 utilities
export function mergeDeclarations(declarations: AS3Declaration[]): AS3Declaration
export function mergeTenants(tenants: AS3Tenant[]): AS3Tenant
export function groupAppsByIP(apps: AdcApp[]): Map<string, AdcApp[]>
export function groupAppsBySubnet(apps: AdcApp[], mask: number): Map<string, AdcApp[]>

// Types
export interface AdcApp { /* from Flipper models */ }
export interface AS3Declaration { /* AS3 schema types */ }
export interface ConversionResult { success: boolean; as3?: AS3Declaration; error?: string }
export interface BatchResult { converted: ConversionResult[]; summary: Summary }
```

### 5.4 Integration with Flipper

```typescript
// In vscode-f5-flipper/src/nsCfgViewProvider.ts

import { convertApps, mergeDeclarations } from 'flipperFAST'

async bulk() {
  const apps = this.explosion.config.apps.filter(a => a.type !== 'gslb')
  
  const result = convertApps(apps, {
    tenantStrategy: 'per-app',
    skipOnError: true
  })
  
  // Show results
  this.showConversionReport(result)
  
  // Open all declarations (one file with array, or merged)
  const merged = mergeDeclarations(result.converted.map(r => r.as3))
  this.openAS3Document(merged)
}
```

---

## 6. Implementation Plan

### Phase 1: Standalone Package Setup (Week 1)

1. **Create new repository/package**
   - Initialize `flipperFAST` package
   - Set up TypeScript, ESLint, Jest/Mocha
   - Copy relevant types from Flipper (`AdcApp`, etc.)

2. **Port Template Engine**
   - Move template loading logic
   - Implement Mustache rendering with cleanup
   - Port `applyDefaults` from `localHtmlPreview.ts`

3. **Port Parameter Transformer**
   - Move `mungeNS2FAST()` from `ns2FastParams.ts`
   - Add tests for each transformation

4. **Copy Templates**
   - Move `templates/as3/*.yaml` to package
   - Ensure same format works

### Phase 2: Core Converter (Week 2)

1. **Single App Conversion**
   - `convertApp(app: AdcApp): ConversionResult`
   - Error handling with detailed messages
   - Support all 13 protocol templates

2. **Batch Conversion**
   - `convertApps(apps: AdcApp[]): BatchResult`
   - Progress callback support
   - Best-effort with error collection

3. **Unit Tests**
   - Test each protocol template
   - Test error cases
   - Test with real-world fixtures

### Phase 3: AS3 Utilities (Week 3)

1. **Declaration Merger**
   - Combine multiple AS3 declarations
   - Handle tenant conflicts
   - Preserve schema version

2. **Tenant Merger**
   - Merge apps into single tenant
   - Configurable naming

3. **Grouping Utilities** (prep for future)
   - `groupAppsByIP()` - find apps with same VIP
   - `groupAppsBySubnet()` - group by network

### Phase 4: Flipper Integration (Week 4)

1. **Replace FAST Core**
   - Remove `@f5devcentral/f5-fast-core` dependency
   - Update `fastWebView.ts` to use new engine
   - Update `fastCore.ts` command registration

2. **Implement bulk()**
   - Wire up new converter
   - Add conversion report output
   - Progress notification

3. **Testing**
   - End-to-end with real configs
   - Verify HTML preview still works
   - Regression testing

---

## 7. AS3 Utilities

### 7.1 Tenant Merge Utility

Pro Services can use this to combine per-app tenants:

```typescript
import { mergeTenants } from 'flipperFAST'

// After bulk conversion
const results = convertApps(apps)
const declarations = results.converted.map(r => r.as3)

// Merge all into single declaration
const merged = mergeDeclarations(declarations)

// Or merge specific tenants
const webTenant = mergeTenants([
  declarations[0].declaration['t_app1'],
  declarations[1].declaration['t_app2'],
], 'web_frontend')
```

### 7.2 Merge Strategy

```typescript
function mergeDeclarations(declarations: AS3Declaration[]): AS3Declaration {
  const merged: AS3Declaration = {
    class: 'AS3',
    action: 'deploy',
    persist: true,
    declaration: {
      class: 'ADC',
      schemaVersion: '3.50.0',
      id: `flipper-bulk-${Date.now()}`,
      label: 'Bulk converted from NetScaler by F5 Flipper'
    }
  }
  
  for (const decl of declarations) {
    // Copy each tenant to merged declaration
    for (const [key, value] of Object.entries(decl.declaration)) {
      if (key !== 'class' && key !== 'schemaVersion' && key !== 'id' && key !== 'label') {
        merged.declaration[key] = value
      }
    }
  }
  
  return merged
}
```

---

## 8. Future Enhancements

### 8.1 App Grouping Detection (Future Exploration)

**Idea:** Identify apps that should be grouped together by analyzing:

1. **Same Virtual IP**
   - Multiple vservers on same IP, different ports
   - Common pattern: HTTP (80) + HTTPS (443) on same VIP

2. **Similar Names**
   - Pattern matching: `app_http`, `app_ssl`, `app_redirect`
   - Prefix/suffix analysis

3. **CS → LB References**
   - Already tracked in AdcApp structure
   - Group CS with its LB targets

```typescript
// Future utility
interface AppGroup {
  name: string
  reason: 'same-ip' | 'name-pattern' | 'cs-lb-ref'
  apps: AdcApp[]
  suggestedTenantName: string
}

function detectAppGroups(apps: AdcApp[]): AppGroup[] {
  const groups: AppGroup[] = []
  
  // Group by IP
  const byIP = groupAppsByIP(apps)
  for (const [ip, ipApps] of byIP) {
    if (ipApps.length > 1) {
      groups.push({
        name: `vip_${ip.replace(/\./g, '_')}`,
        reason: 'same-ip',
        apps: ipApps,
        suggestedTenantName: `t_${ip.replace(/\./g, '_')}`
      })
    }
  }
  
  // TODO: Name pattern analysis
  // TODO: CS→LB reference analysis
  
  return groups
}
```

### 8.2 Other Future Considerations

| Feature | Priority | Notes |
|---------|----------|-------|
| **Coverage Detection** | **High** | **See [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md)** |
| GSLB Support | Medium | Requires DNS Wide IP templates |
| NGINX+ Output | Low | Different output format entirely |
| XC Output | Low | Cloud-native format |
| CI/CD Mode | Medium | Headless CLI conversion |
| AS3 Schema Validation | Low | Validate output against AS3 schema |

---

## 9. Migration Path

### 9.1 Flipper Changes

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Remove `@f5devcentral/f5-fast-core` | Add `flipperFAST` |
| `fastWebView.ts` | Update imports | Use new TemplateEngine |
| `fastCore.ts` | Minimal changes | Command registration stays |
| `ns2FastParams.ts` | Remove | Moved to package |
| `localHtmlPreview.ts` | Keep | Already local, may enhance |
| `nsCfgViewProvider.ts` | Update `bulk()` | Use new convertApps() |

### 9.2 Template Compatibility

- **Keep same YAML format** - No changes to existing templates
- Templates move to standalone package
- Flipper can override/extend with local templates if needed

### 9.3 Rollout Strategy

1. **Phase 1:** Build standalone package, full test coverage
2. **Phase 2:** Integrate into Flipper behind feature flag
3. **Phase 3:** Remove FAST Core dependency
4. **Phase 4:** Release new Flipper version

---

## 10. Appendices

### Appendix A: AS3 Declaration Structure

```json
{
  "class": "AS3",
  "action": "deploy",
  "persist": true,
  "declaration": {
    "class": "ADC",
    "schemaVersion": "3.50.0",
    "id": "flipper-conversion-2026-01-14",
    "label": "Converted from NetScaler by F5 Flipper",

    "t_10_1_1_100": {
      "class": "Tenant",
      "app_webserver": {
        "class": "Application",
        "serviceMain": {
          "class": "Service_HTTP",
          "virtualAddresses": ["10.1.1.100"],
          "virtualPort": 80,
          "pool": "pool_webserver"
        },
        "pool_webserver": {
          "class": "Pool",
          "loadBalancingMode": "round-robin",
          "members": [
            { "servicePort": 80, "serverAddresses": ["10.2.1.1", "10.2.1.2"] }
          ]
        }
      }
    }
  }
}
```

### Appendix B: Conversion Report Format

```json
{
  "timestamp": "2026-01-14T10:30:00Z",
  "sourceFile": "ns_config.tgz",
  "engineVersion": "1.0.0",
  
  "summary": {
    "total": 25,
    "converted": 18,
    "failed": 3,
    "skipped": 4
  },

  "converted": [
    {
      "name": "web_frontend",
      "type": "cs",
      "protocol": "SSL",
      "tenant": "t_web_frontend",
      "template": "SSL"
    }
  ],

  "failed": [
    {
      "name": "legacy_app",
      "type": "lb",
      "protocol": "ANY",
      "error": "No template for protocol: ANY",
      "suggestion": "Use TCP template or create custom template"
    }
  ],

  "skipped": [
    {
      "name": "gslb_global",
      "type": "gslb",
      "reason": "GSLB not supported"
    }
  ],

  "warnings": [
    {
      "app": "ssl_app",
      "warning": "Certificate not found in config, using placeholder"
    }
  ]
}
```

### Appendix C: Template Format Reference

```yaml
# templates/HTTP.yaml - Same format as current templates

title: HTTP Application Template
description: Standard HTTP load balancing
contentType: application/json

definitions:
  tenant_name:
    title: Tenant name
    type: string
    propertyOrder: 1
  app_name:
    title: Application name
    type: string
    propertyOrder: 2
  virtual_address:
    title: Virtual address
    type: string
    propertyOrder: 3
  virtual_port:
    title: Virtual port
    type: integer
    default: 80
  pool_members:
    title: Pool members
    type: array
    items:
      type: object
      properties:
        address: { type: string }
        port: { type: integer }

template: |
  {
    "class": "AS3",
    "declaration": {
      "class": "ADC",
      "schemaVersion": "3.50.0",
      "t_{{virtual_address}}": {
        "class": "Tenant",
        "app_{{app_name}}": {
          "class": "Application",
          "{{app_name}}": {
            "class": "Service_HTTP",
            "virtualAddresses": ["{{virtual_address}}"],
            "virtualPort": {{virtual_port}},
            "pool": "pool_{{app_name}}"
          },
          "pool_{{app_name}}": {
            "class": "Pool",
            "members": [
              {{#pool_members}}
              {
                "servicePort": {{port}},
                "serverAddresses": ["{{address}}"]
              },
              {{/pool_members}}
            ]
          }
        }
      }
    }
  }
```

### Appendix D: FAST Core Replacement Code Estimate

```typescript
// Estimated ~150-200 lines total

// templateEngine.ts (~80 lines)
- loadFromDirectory(): void     // ~15 lines
- getSchema(): JSONSchema       // ~5 lines  
- getDefaults(): object         // ~15 lines
- render(): object              // ~20 lines
- applyDefaults(): object       // ~15 lines
- cleanupJSON(): string         // ~10 lines

// converter.ts (~60 lines)
- convertApp(): ConversionResult    // ~30 lines
- convertApps(): BatchResult        // ~30 lines

// as3/merger.ts (~40 lines)
- mergeDeclarations(): AS3Declaration  // ~25 lines
- mergeTenants(): AS3Tenant            // ~15 lines

// Types (~20 lines)
- interfaces and type definitions
```

---

*This document is a living specification. Last updated: 2026-01-14*
