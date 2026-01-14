# CONVERSION COVERAGE SPECIFICATION
## Gap Detection & Agent-Assisted Enhancement

**Status**: DRAFT  
**Created**: 2026-01-14  
**Updated**: 2026-01-14  
**Related**: [BULK_CONVERSION_ENGINE_SPEC.md](BULK_CONVERSION_ENGINE_SPEC.md), [BORG.md](BORG.md), [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md), [DIRECT_CONVERSION_ADR.md](DIRECT_CONVERSION_ADR.md)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Architecture Clarification](#3-architecture-clarification)
4. [Architectural Decision: Templates vs Direct Conversion](#4-architectural-decision-templates-vs-direct-conversion)
5. [Phase 1: Deterministic Gap Detection](#5-phase-1-deterministic-gap-detection)
6. [Phase 2: Agent-Assisted Enhancement](#6-phase-2-agent-assisted-enhancement)
7. [NS→F5 Mapping Registry](#7-nsf5-mapping-registry)
8. [Integration Points](#8-integration-points)
9. [Implementation Plan](#9-implementation-plan)

---

## 1. Problem Statement

### The Gap

During customer conversions, we've encountered **missing parameters in profiles** - NetScaler settings that don't make it into the AS3 output because:

1. FAST templates don't cover every NS parameter
2. Some NS features have no direct AS3 equivalent
3. Parameter transformation logic (`mungeNS2FAST`) is incomplete

### The Challenge

| Approach | Completeness | Maintainability |
|----------|--------------|-----------------|
| Comprehensive templates | High | Nightmare - hundreds of params per protocol |
| Simple templates | Low | Easy but gaps |
| Programmatic mapping | High | Still huge scope - NS has 100s of params |
| LLM/Agent | Variable | Low maintenance, but non-deterministic |

### The Scope Problem

NetScaler has hundreds of parameters across dozens of object types. Trying to map every one deterministically is a multi-year effort. But leaving gaps means incomplete conversions.

---

## 2. Solution Overview

### Hybrid Approach

**Phase 1: Deterministic Detection (Code)**
- Don't try to *fix* everything - just *detect* what's missing
- Parse NS lines for all parameters
- Compare to AS3 output
- Report coverage percentage and gaps
- Build mapping registry over time

**Phase 2: Agent-Assisted Enhancement (MCP/LLM)**
- For apps with low coverage OR on-demand
- Agent compares NS config to AS3 output
- Suggests AS3 additions for unmapped params
- Human reviews before accepting

### Why This Works

| Aspect | Detection (Code) | Enhancement (Agent) |
|--------|------------------|---------------------|
| **Runs** | Every conversion | On-demand only |
| **Cost** | Free | API calls |
| **Trust** | 100% deterministic | Needs review |
| **Value** | "Here's what's missing" | "Here's how to fix it" |
| **Maintenance** | Grows mapping registry | Zero maintenance |

---

## 3. Architecture Clarification

### Where Data Lives

```
Parser (regex.ts)     →  configObjectArryRx    →  ALL params as JSON properties
                                ↓
Digester (dig*Rx.ts)  →  AdcApp                →  ALL params (except -devno)
                                ↓
mungeNS2FAST()        →  templateParams        →  CORE params only (bottleneck)
                                ↓
FAST Template         →  AS3                   →  Only what template renders
```

### Where Gaps Occur

| Stage | What Happens | Gap? |
|-------|--------------|------|
| Parser | Converts all `-flag value` to JSON | No - captures everything |
| Digester | Builds AdcApp from parsed objects | No - passes through all properties |
| **mungeNS2FAST** | Maps to template params | **YES - only maps "core" features** |
| Template | Renders to AS3 | Depends on what munge provided |

**The bottleneck is `mungeNS2FAST()`** - it explicitly maps a subset of AdcApp properties to template parameters. Everything else is silently dropped.

### Strategy: Detect, Don't Fix Everything

Rather than expanding munge/templates to handle every param (maintenance nightmare), we:
1. Keep munge minimal - core features that work reliably
2. Pass unmapped params through for visibility
3. Report coverage so users know what's missing
4. Let users/PS handle edge cases manually

```typescript
// Proposed approach
const coreParams = mungeNS2FAST(app)           // LB method, pool, persistence, etc.
const allParams = extractAllParams(app)        // Everything from AdcApp
const unmapped = diff(allParams, coreParams)   // What munge didn't map

const result = {
  as3: renderTemplate(coreParams),
  coverage: {
    mapped: Object.keys(coreParams),
    unmapped: unmapped,
    percentage: ...
  }
}
```

---

## 4. Architectural Decision: Templates vs Direct Conversion

> **OPEN QUESTION**: Are FAST templates worth the complexity?

### Current Approach (Templates)

```
AdcApp → mungeNS2FAST() → YAML Template → Mustache → AS3 JSON
```

**Pros:**
- Users could theoretically customize templates
- Separation of data and presentation

**Cons:**
- Nobody customizes templates in practice
- Mustache is limited (no logic, trailing comma hacks)
- Two translation layers (munge + template)
- Hard to test comprehensively
- YAML/Mustache = no IDE support, no type checking

### Alternative: Direct Conversion Engine

```
AdcApp → buildAS3(app, mappings) → AS3 JSON
```

**Pros:**
- Single translation layer
- TypeScript = testable, type-safe, IDE support
- Can map ALL params programmatically using NS_TO_F5_MAPPINGS
- Easy to write unit tests per mapping
- Lab validation for each feature

**Cons:**
- More code to write initially
- Less "declarative" (but templates weren't really declarative anyway)

### Comparison

| Aspect | Templates | Direct Conversion |
|--------|-----------|-------------------|
| Maintainability | Hard (YAML + munge) | Easier (TypeScript) |
| Testability | Hard (integration only) | Easy (unit tests per mapping) |
| Coverage | Manual expansion | Systematic from mappings doc |
| Type safety | None | Full TypeScript |
| Flexibility | Theoretical | Code is flexible too |
| IDE support | None | Full |

### Recommendation

**Consider direct conversion for `flipperFAST`:**

```typescript
// flipperFAST/src/converter.ts
import { LB_METHODS, PERSISTENCE, MONITORS } from './mappings'

function buildAS3(app: AdcApp): AS3Declaration {
  return {
    class: 'AS3',
    declaration: {
      class: 'ADC',
      [`t_${app.name}`]: {
        class: 'Tenant',
        [`app_${app.name}`]: {
          class: 'Application',
          serviceMain: buildService(app),
          pool: buildPool(app),
          // ... systematic mapping from AdcApp
        }
      }
    }
  }
}

function buildService(app: AdcApp): AS3Service {
  return {
    class: getServiceClass(app.protocol),  // From mappings
    virtualAddresses: [app.address],
    virtualPort: app.port,
    pool: `pool_${app.name}`,
    // Map ALL relevant properties from AdcApp
    ...(app.lbMethod && { loadBalancingMode: LB_METHODS[app.lbMethod] }),
    ...(app.persistenceType && { persistenceMethods: [PERSISTENCE[app.persistenceType]] }),
    // etc.
  }
}
```

**Benefits:**
- Every mapping in NS_TO_F5_MAPPINGS.md becomes a line of code
- Write test: `expect(buildAS3(fixture).serviceMain.loadBalancingMode).toBe('round-robin')`
- Validate with lab: deploy, verify behavior
- Coverage = which mappings are implemented in code

### Decision Needed

| Option | Path Forward |
|--------|-------------|
| **A: Keep templates** | Expand munge, live with gaps |
| **B: Direct conversion** | New engine in flipperFAST, systematic mapping |
| **C: Hybrid** | Direct for core, template for edge cases |

**Recommendation:** Option B - Direct conversion is more maintainable long-term and enables systematic coverage of all mappings.

---

## 5. Phase 1: Deterministic Gap Detection

### 5.1 Architecture

```typescript
// In flipperFAST package

interface ConversionCoverage {
  app: string
  type: 'lb' | 'cs' | 'gslb'
  protocol: string
  
  // Parameter analysis
  nsParams: NSParam[]           // All params found in NS lines
  as3Params: string[]           // Params that made it to AS3
  unmapped: NSParam[]           // NS params with no AS3 equivalent
  
  // Coverage metrics
  coverage: number              // Percentage mapped (0-100)
  confidence: 'high' | 'medium' | 'low'
  
  // Suggestions
  suggestions: string[]         // Human-readable suggestions
}

interface NSParam {
  flag: string                  // e.g., "-lbMethod"
  value: string                 // e.g., "ROUNDROBIN"
  source: string                // Original NS line
  mapped?: boolean              // True if we know this maps to AS3
  as3Equivalent?: string        // If mapped, what AS3 property
}
```

### 5.2 Parameter Extraction

```typescript
/**
 * Extract all -flagName value pairs from NS config lines
 */
function extractNSParams(lines: string[]): NSParam[] {
  const params: NSParam[] = []
  
  for (const line of lines) {
    // Match -flagName value patterns
    const regex = /-(\w+)\s+(?:"([^"]+)"|(\S+))/g
    let match
    
    while ((match = regex.exec(line)) !== null) {
      params.push({
        flag: `-${match[1]}`,
        value: match[2] || match[3],
        source: line,
        mapped: false
      })
    }
  }
  
  return params
}

/**
 * Walk AS3 declaration and collect all property paths
 */
function extractAS3Params(as3: AS3Declaration): string[] {
  const params: string[] = []
  
  function walk(obj: any, path: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      params.push(currentPath)
      
      if (typeof value === 'object' && value !== null) {
        walk(value, currentPath)
      }
    }
  }
  
  walk(as3)
  return params
}
```

### 5.3 Coverage Analysis

```typescript
function analyzeConversionCoverage(
  app: AdcApp, 
  as3: AS3Declaration,
  mappings: MappingRegistry
): ConversionCoverage {
  
  const nsParams = extractNSParams(app.lines)
  const as3Params = extractAS3Params(as3)
  
  // Check each NS param against known mappings
  for (const param of nsParams) {
    const mapping = mappings.get(param.flag)
    
    if (mapping) {
      param.mapped = true
      param.as3Equivalent = mapping.as3Path
    } else if (isIgnorable(param.flag)) {
      // Some params are NS-only (no F5 equivalent)
      param.mapped = true
      param.as3Equivalent = null
    }
  }
  
  const unmapped = nsParams.filter(p => !p.mapped)
  const coverage = ((nsParams.length - unmapped.length) / nsParams.length) * 100
  
  return {
    app: app.name,
    type: app.type,
    protocol: app.protocol,
    nsParams,
    as3Params,
    unmapped,
    coverage: Math.round(coverage),
    confidence: coverage > 80 ? 'high' : coverage > 50 ? 'medium' : 'low',
    suggestions: generateSuggestions(unmapped, mappings)
  }
}
```

### 5.4 Report Output

```json
{
  "app": "ssl_frontend",
  "type": "cs",
  "protocol": "SSL",
  "coverage": 73,
  "confidence": "medium",
  
  "unmapped": [
    {
      "flag": "-tcpProfileName",
      "value": "nstcp_default_XA_XD_profile",
      "source": "add cs vserver ssl_frontend SSL 10.1.1.100 443 -tcpProfileName nstcp_default_XA_XD_profile",
      "suggestion": "Consider adding profileTCP to AS3 Service class"
    },
    {
      "flag": "-netProfile",
      "value": "internal_net",
      "source": "set cs vserver ssl_frontend -netProfile internal_net",
      "suggestion": "No direct AS3 equivalent - may require iRule or separate config"
    },
    {
      "flag": "-cipherAliasBinding",
      "value": "ssl_cipher_group_1",
      "source": "bind ssl vserver ssl_frontend -cipherAliasBinding ssl_cipher_group_1",
      "suggestion": "Map to clientTLS.ciphers in AS3"
    }
  ],
  
  "suggestions": [
    "3 parameters not mapped to AS3",
    "Review TCP profile settings manually",
    "Consider agent-assisted enhancement for SSL cipher mapping"
  ]
}
```

---

## 6. Phase 2: Agent-Assisted Enhancement

### 6.1 When to Use

- Apps with coverage < 70% (configurable threshold)
- User clicks "Enhance with AI" button
- Bulk conversion with `--enhance` flag

### 6.2 MCP Integration

```typescript
async function agentEnhanceAS3(
  app: AdcApp, 
  as3: AS3Declaration, 
  coverage: ConversionCoverage
): Promise<EnhancementResult> {
  
  const prompt = buildEnhancementPrompt(app, as3, coverage)
  
  // Call MCP server (flipperAgents)
  const response = await mcpClient.callTool('enhance-as3', {
    prompt,
    originalNS: app.lines.join('\n'),
    currentAS3: JSON.stringify(as3, null, 2),
    unmappedParams: coverage.unmapped
  })
  
  return {
    enhancedAS3: response.as3,
    changes: response.changes,
    confidence: response.confidence,
    explanation: response.explanation,
    requiresReview: true  // Always require human review
  }
}

function buildEnhancementPrompt(
  app: AdcApp,
  as3: AS3Declaration,
  coverage: ConversionCoverage
): string {
  return `
You are an expert in NetScaler to F5 BIG-IP migrations.

## Original NetScaler Configuration
\`\`\`
${app.lines.join('\n')}
\`\`\`

## Current AS3 Output
\`\`\`json
${JSON.stringify(as3, null, 2)}
\`\`\`

## Unmapped Parameters
The following NetScaler parameters were not mapped to AS3:
${coverage.unmapped.map(p => `- ${p.flag} ${p.value}`).join('\n')}

## Task
1. Analyze each unmapped parameter
2. Determine if it has an AS3 equivalent
3. If yes, add it to the AS3 declaration
4. If no equivalent exists, note it in the explanation
5. Return the enhanced AS3 with explanations for each change

## Response Format
Return a JSON object with:
- enhancedAS3: The complete AS3 declaration with additions
- changes: Array of { param, action, as3Path, explanation }
- confidence: "high" | "medium" | "low"
`
}
```

### 6.3 Human Review Flow

```typescript
interface EnhancementResult {
  enhancedAS3: AS3Declaration
  changes: Enhancement[]
  confidence: 'high' | 'medium' | 'low'
  explanation: string
  requiresReview: boolean
}

interface Enhancement {
  param: string           // NS parameter
  action: 'added' | 'skipped' | 'manual'
  as3Path?: string        // Where it was added in AS3
  explanation: string     // Why this mapping
}

// In VS Code extension UI
async function showEnhancementReview(result: EnhancementResult) {
  // Show diff view: current AS3 vs enhanced AS3
  // User can accept/reject each change
  // User can edit before accepting
  // Only committed changes go to final output
}
```

---

## 7. NS→F5 Mapping Registry

> **Full Reference**: See [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md) for comprehensive mappings extracted from BORG research (hundreds of entries across 15 categories).

### 7.1 Design

The mapping registry grows over time as we discover and validate mappings.

```typescript
interface MappingRule {
  nsFlag: string              // e.g., "-lbMethod"
  as3Path: string | null      // e.g., "loadBalancingMode", null if no equivalent
  transform?: (value: string) => any  // Optional value transformation
  note?: string               // Human-readable note
  confidence: 'known' | 'likely' | 'uncertain'
  source?: string             // Where this mapping came from (BORG, manual, agent)
}

class MappingRegistry {
  private mappings: Map<string, MappingRule> = new Map()
  
  constructor() {
    this.loadFromFile()
  }
  
  get(flag: string): MappingRule | undefined {
    return this.mappings.get(flag.toLowerCase())
  }
  
  add(rule: MappingRule): void {
    this.mappings.set(rule.nsFlag.toLowerCase(), rule)
    this.saveToFile()
  }
  
  // Learn from agent suggestions that user accepted
  learnFromAccepted(enhancement: Enhancement): void {
    if (enhancement.action === 'added' && enhancement.as3Path) {
      this.add({
        nsFlag: enhancement.param,
        as3Path: enhancement.as3Path,
        confidence: 'likely',
        source: 'agent-learned'
      })
    }
  }
}
```

### 7.2 Initial Mappings (From BORG Research)

Based on analysis of ns2f5_tmsh.pl, x2f5, and other tools in [BORG.md](BORG.md):

```typescript
// mappings/lb-methods.ts
export const LB_METHOD_MAPPINGS: Record<string, string> = {
  'ROUNDROBIN': 'round-robin',
  'LEASTCONNECTION': 'least-connections-member',
  'LEASTCONNECTIONS': 'least-connections-member',
  'LEASTRESPONSETIME': 'fastest-app-response',
  'LEASTBANDWIDTH': 'least-connections-member',
  'LEASTPACKETS': 'least-connections-member',
  'URLHASH': 'least-connections-member',  // No direct equivalent
  'DOMAINHASH': 'least-connections-member',
  'DESTINATIONIPHASH': 'least-connections-member',
  'SOURCEIPHASH': 'least-connections-member',
  'SRCIPDESTIPHASH': 'least-connections-member',
  'CALLIDHASH': 'least-connections-member',
  'TOKEN': 'least-connections-member',
  'CUSTOMSERVERID': 'least-connections-member',
}

// mappings/persistence.ts
export const PERSISTENCE_MAPPINGS: Record<string, string> = {
  'SOURCEIP': 'source-address',
  'COOKIEINSERT': 'cookie',
  'SSLSESSION': 'ssl',
  'RULE': 'universal',           // Requires iRule
  'URLPASSIVE': 'cookie',        // Approximate
  'CUSTOMSERVERID': 'universal', // Requires iRule
  'DESTIP': 'destination-address',
  'SRCIPDESTIP': 'source-address',
  'CALLID': 'sip',
  'RTSPID': 'hash',
  'NONE': 'none',
}

// mappings/monitors.ts
export const MONITOR_TYPE_MAPPINGS: Record<string, string> = {
  'HTTP': 'http',
  'HTTP-ECV': 'http',
  'HTTPS': 'https',
  'HTTPS-ECV': 'https',
  'TCP': 'tcp',
  'TCP-ECV': 'tcp',
  'UDP': 'udp',
  'UDP-ECV': 'udp',
  'PING': 'icmp',
  'DNS': 'dns',
  'FTP': 'ftp',
  'LDAP': 'ldap',
  'RADIUS': 'radius',
  'MYSQL': 'mysql',
  'MSSQL': 'external',  // Requires script
  'ORACLE': 'external',
  'SMTP': 'smtp',
  'POP3': 'external',
  'IMAP': 'external',
  'NNTP': 'external',
  'STOREFRONT': 'http',
  'CITRIX-XD-DDC': 'http',
}

// mappings/vserver-params.ts
export const VSERVER_PARAM_MAPPINGS: MappingRule[] = [
  // Core settings
  { nsFlag: '-lbMethod', as3Path: 'loadBalancingMode', transform: v => LB_METHOD_MAPPINGS[v] },
  { nsFlag: '-persistenceType', as3Path: 'persistenceMethods', transform: v => [PERSISTENCE_MAPPINGS[v]] },
  { nsFlag: '-timeout', as3Path: 'persistenceMethods[0].timeout' },
  { nsFlag: '-cltTimeout', as3Path: 'idleTimeout', transform: v => parseInt(v) },
  { nsFlag: '-svrTimeout', as3Path: 'pool.serviceDownAction' },  // Approximate
  
  // SSL/TLS
  { nsFlag: '-sslProfile', as3Path: 'clientTLS.clientCertificate' },  // Complex mapping
  
  // HTTP settings
  { nsFlag: '-httpProfileName', as3Path: 'profileHTTP' },
  { nsFlag: '-tcpProfileName', as3Path: 'profileTCP' },
  
  // SNAT
  { nsFlag: '-ipSet', as3Path: 'snat' },
  
  // No AS3 equivalent - document only
  { nsFlag: '-netProfile', as3Path: null, note: 'No AS3 equivalent - network-level config' },
  { nsFlag: '-td', as3Path: null, note: 'Traffic domains have no AS3 equivalent' },
  { nsFlag: '-appflowLog', as3Path: null, note: 'Analytics - configure separately' },
]
```

### 7.3 Ignorable Parameters

Some NS parameters have no F5 equivalent and should be silently ignored:

```typescript
// mappings/ignorable.ts
export const IGNORABLE_PARAMS = new Set([
  '-state',              // ENABLED/DISABLED handled elsewhere
  '-comment',            // Metadata only
  '-cacheType',          // NS-specific caching
  '-precedence',         // NS policy ordering
  '-priority',           // NS binding priority
  '-gotoPriorityExpression', // NS flow control
  '-type',               // Often redundant with context
  '-sc',                 // SureConnect - no equivalent
  '-sp',                 // Surge protection - different in F5
  '-downStateFlush',     // NS-specific behavior
  '-cacheable',          // Handled differently in F5
  '-soMethod',           // Spillover - different architecture
  '-soThreshold',
  '-soPersistence',
  '-soPersistenceTimeOut',
])
```

---

## 8. Integration Points

### 8.1 flipperFAST Package

Coverage analysis is part of the core conversion:

```typescript
// In flipperFAST/src/converter.ts

export interface ConvertOptions {
  includeCoverage?: boolean     // Default: true
  coverageThreshold?: number    // Default: 70 (warn below this)
  enhanceWithAgent?: boolean    // Default: false
}

export interface ConversionResult {
  success: boolean
  as3?: AS3Declaration
  error?: string
  coverage?: ConversionCoverage  // NEW
}

export function convertApp(app: AdcApp, options: ConvertOptions = {}): ConversionResult {
  const { includeCoverage = true, coverageThreshold = 70 } = options
  
  // 1. Transform params
  const params = transformParams(app)
  
  // 2. Render template
  const as3 = engine.render(templateName, params)
  
  // 3. Analyze coverage
  let coverage: ConversionCoverage | undefined
  if (includeCoverage) {
    coverage = analyzeConversionCoverage(app, as3, mappingRegistry)
    
    if (coverage.coverage < coverageThreshold) {
      // Add warning to result
      coverage.suggestions.unshift(
        `⚠️ Coverage ${coverage.coverage}% below threshold (${coverageThreshold}%)`
      )
    }
  }
  
  return { success: true, as3, coverage }
}
```

### 8.2 Flipper VS Code Extension

Display coverage in the UI:

```typescript
// In vscode-f5-flipper/src/fastWebView.ts

async renderAS3(app: AdcApp) {
  const result = convertApp(app, { includeCoverage: true })
  
  if (result.coverage) {
    // Show coverage badge in output panel
    this.showCoverageBadge(result.coverage)
    
    // If low coverage, offer enhancement
    if (result.coverage.coverage < 70) {
      const enhance = await vscode.window.showWarningMessage(
        `Conversion coverage is ${result.coverage.coverage}%. Some parameters may be missing.`,
        'Enhance with AI',
        'View Details',
        'Ignore'
      )
      
      if (enhance === 'Enhance with AI') {
        await this.enhanceWithAgent(app, result.as3, result.coverage)
      } else if (enhance === 'View Details') {
        this.showCoverageDetails(result.coverage)
      }
    }
  }
  
  // Display AS3 output
  this.showAS3(result.as3)
}
```

### 8.3 Bulk Conversion Report

Include coverage in batch results:

```typescript
// In flipperFAST/src/converter.ts

export interface BatchResult {
  converted: ConversionResult[]
  failed: FailedConversion[]
  skipped: SkippedApp[]
  summary: BatchSummary
  coverageSummary: CoverageSummary  // NEW
}

export interface CoverageSummary {
  averageCoverage: number
  highCoverage: number    // Apps > 80%
  mediumCoverage: number  // Apps 50-80%
  lowCoverage: number     // Apps < 50%
  totalUnmapped: number   // Total unmapped params across all apps
  topUnmapped: { param: string, count: number }[]  // Most common gaps
}
```

---

## 9. Implementation Plan

### Phase 1: Core Coverage Detection (Week 1)

**In flipperFAST package:**

1. Parameter extraction from NS lines
2. AS3 property walking
3. Coverage calculation
4. Report generation

**Deliverables:**
- `src/coverage.ts` - Core coverage analysis
- `src/mappings/` - Initial mapping registry
- `tests/coverage.test.ts` - Unit tests

### Phase 2: Mapping Registry (Week 2)

1. Port all mappings from BORG research
2. Add LB method mappings
3. Add persistence mappings
4. Add monitor type mappings
5. Add vserver param mappings
6. Document ignorable params

**Deliverables:**
- `src/mappings/lb-methods.ts`
- `src/mappings/persistence.ts`
- `src/mappings/monitors.ts`
- `src/mappings/vserver-params.ts`
- `src/mappings/ignorable.ts`

### Phase 3: Flipper Integration (Week 3)

1. Add coverage to single-app conversion UI
2. Add coverage badge/indicator
3. Add coverage details panel
4. Add coverage to bulk conversion report

**Deliverables:**
- Updated `fastWebView.ts`
- Coverage UI components
- Bulk report updates

### Phase 4: Agent Enhancement (Week 4+)

1. MCP tool for AS3 enhancement
2. Enhancement prompt engineering
3. Human review UI
4. Learning from accepted enhancements

**Deliverables:**
- `flipperAgents/tools/enhance-as3.ts`
- Review UI in VS Code extension
- Mapping registry learning

---

## Appendix A: Coverage Levels

| Coverage | Confidence | Action |
|----------|------------|--------|
| 90-100% | High | No action needed |
| 70-89% | Medium | Review unmapped params |
| 50-69% | Low | Consider agent enhancement |
| < 50% | Very Low | Manual review required |

## Appendix B: Common Unmapped Parameters

Based on customer conversions:

| Parameter | Frequency | Reason |
|-----------|-----------|--------|
| `-tcpProfileName` | High | Template doesn't include TCP profile selection |
| `-netProfile` | High | No AS3 equivalent |
| `-cipherAliasBinding` | Medium | SSL ciphers need manual mapping |
| `-appflowLog` | Medium | Analytics configured separately |
| `-pushVserver` | Low | No direct equivalent |

---

*This document is a living specification. Last updated: 2026-01-14*
