# AS3 VALIDATION PIPELINE SPECIFICATION
## Systematic AS3 Generation, Validation, and Deployment Testing

**Status**: DRAFT
**Created**: 2026-01-15
**Updated**: 2026-01-15
**Related**: [DIRECT_CONVERSION_IMPL_SPEC.md](DIRECT_CONVERSION_IMPL_SPEC.md), [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md), [NS_TO_F5_MAPPINGS.md](NS_TO_F5_MAPPINGS.md)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Pipeline Architecture](#3-pipeline-architecture)
4. [Phase 1: Batch Conversion](#4-phase-1-batch-conversion)
5. [Phase 2: Schema Validation](#5-phase-2-schema-validation)
6. [Phase 3: Dry-Run Testing](#6-phase-3-dry-run-testing)
7. [Phase 4: Review & Gap Analysis](#7-phase-4-review--gap-analysis)
8. [Test Configuration Inventory](#8-test-configuration-inventory)
9. [MCP Server Integration](#9-mcp-server-integration)
10. [Implementation Plan](#10-implementation-plan)
11. [Success Criteria](#11-success-criteria)

---

## 1. Problem Statement

### Current State

We have:
- ~40 test NetScaler configurations in `tests/artifacts/`
- A working AS3 direct conversion engine (`src/as3/`)
- Coverage analysis tools to identify unmapped parameters
- An MCP server for NetScaler interaction (deploy, clear, get config)

### What's Missing

We lack:
- **Systematic validation** that all generated AS3 is schema-compliant
- **Dry-run testing** against a real BIG-IP AS3 engine
- **Automated review process** to assess conversion quality
- **Repeatable pipeline** for testing with private customer configs

### Goals

1. Validate ALL generated AS3 against the official JSON schema
2. Test AS3 with BIG-IP's `?async=true&dry-run=true` endpoint
3. Create human-readable reports identifying gaps
4. Build confidence before running customer configs

---

## 2. Solution Overview

### Four-Phase Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AS3 VALIDATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PHASE 1: BATCH CONVERSION                                              │
│  ┌───────────┐    ┌──────────┐    ┌─────────────┐                      │
│  │ NS Config │ -> │ Parser/  │ -> │ buildAS3()  │ -> AS3 JSON          │
│  │   Files   │    │ Digester │    │ conversion  │                       │
│  └───────────┘    └──────────┘    └─────────────┘                      │
│                                                                         │
│  PHASE 2: SCHEMA VALIDATION                                             │
│  ┌───────────┐    ┌──────────────────┐    ┌────────────┐               │
│  │ AS3 JSON  │ -> │ MCP Schema       │ -> │ Validation │ -> Report     │
│  │   Files   │    │ Validator Tool   │    │ Results    │               │
│  └───────────┘    └──────────────────┘    └────────────┘               │
│                                                                         │
│  PHASE 3: DRY-RUN TESTING                                               │
│  ┌───────────┐    ┌──────────────────┐    ┌────────────┐               │
│  │ AS3 JSON  │ -> │ BIG-IP AS3       │ -> │ Deploy     │ -> Report     │
│  │ (valid)   │    │ dry-run endpoint │    │ Results    │               │
│  └───────────┘    └──────────────────┘    └────────────┘               │
│                                                                         │
│  PHASE 4: REVIEW & GAP ANALYSIS                                         │
│  ┌───────────┐    ┌──────────────────┐    ┌────────────┐               │
│  │ All       │ -> │ Coverage +       │ -> │ Gap Report │ -> Action     │
│  │ Results   │    │ Validation Data  │    │ + Metrics  │    Items      │
│  └───────────┘    └──────────────────┘    └────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **Batch Converter** | Convert all NS configs to AS3 | Script using `buildAS3Bulk()` |
| **Schema Validator** | Validate AS3 against JSON schema | MCP tool (new) |
| **Dry-Run Tester** | Test against real BIG-IP | MCP tool calling AS3 API |
| **Report Generator** | Create human-readable summaries | TypeScript utility |

---

## 3. Pipeline Architecture

### 3.1 Directory Structure

```
tests/
├── artifacts/
│   ├── apps/                      # Source NS configs
│   │   ├── apple.ns.conf
│   │   ├── banana.ns.conf
│   │   └── ...
│   └── as3_output/                # NEW: Generated AS3 output
│       ├── apple.as3.json
│       ├── banana.as3.json
│       ├── _bulk.as3.json         # All apps merged
│       └── _reports/
│           ├── conversion.json    # Conversion results
│           ├── schema.json        # Schema validation results
│           ├── dryrun.json        # Dry-run results
│           └── summary.md         # Human-readable summary
```

### 3.2 Data Flow

```typescript
interface PipelineResult {
    // Phase 1: Conversion
    conversion: {
        total: number;
        succeeded: number;
        failed: number;
        results: ConversionResult[];
    };

    // Phase 2: Schema Validation
    schema: {
        total: number;
        valid: number;
        invalid: number;
        results: SchemaValidationResult[];
    };

    // Phase 3: Dry-Run
    dryRun: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;  // Skipped if schema invalid
        results: DryRunResult[];
    };

    // Phase 4: Summary
    summary: {
        overallScore: number;  // 0-100
        readyForProduction: boolean;
        gaps: GapItem[];
        recommendations: string[];
    };
}
```

---

## 4. Phase 1: Batch Conversion

### 4.1 Purpose

Convert all test NS configs to AS3, capturing both successes and failures.

### 4.2 Script Design

```typescript
// scripts/as3-pipeline.ts

import { ADC } from '../src/CitrixADC';
import { buildAS3, buildAS3Bulk } from '../src/as3';
import { analyzeCoverage, summarizeCoverage } from '../src/as3/coverage';
import * as fs from 'fs';
import * as path from 'path';

interface ConversionRun {
    timestamp: string;
    configFile: string;
    apps: AppConversion[];
    bulk?: BulkResult;
}

interface AppConversion {
    appName: string;
    appType: string;
    protocol: string;
    success: boolean;
    error?: string;
    warnings?: string[];
    coverage: CoverageResult;
    as3Path?: string;  // Path to saved AS3 file
}

async function runBatchConversion(configDir: string): Promise<ConversionRun[]> {
    const runs: ConversionRun[] = [];
    const configFiles = fs.readdirSync(configDir)
        .filter(f => f.endsWith('.conf'));

    for (const file of configFiles) {
        const configPath = path.join(configDir, file);
        const run = await convertConfig(configPath);
        runs.push(run);
    }

    return runs;
}

async function convertConfig(configPath: string): Promise<ConversionRun> {
    const content = fs.readFileSync(configPath, 'utf8');
    const adc = new ADC();

    // Parse the config
    await adc.loadParse(content);

    const apps = adc.apps || [];
    const results: AppConversion[] = [];

    for (const app of apps) {
        const conversion = buildAS3(app);
        const coverage = analyzeCoverage(app);

        let as3Path: string | undefined;
        if (conversion.success && conversion.as3) {
            // Save individual AS3 file
            as3Path = saveAS3(app.name, conversion.as3);
        }

        results.push({
            appName: app.name,
            appType: app.type || 'unknown',
            protocol: app.protocol || 'unknown',
            success: conversion.success,
            error: conversion.error,
            warnings: conversion.warnings,
            coverage,
            as3Path,
        });
    }

    // Also generate bulk conversion
    const nonGslbApps = apps.filter(a => a.type !== 'gslb');
    const bulk = buildAS3Bulk(nonGslbApps);

    if (bulk.merged) {
        saveBulkAS3(path.basename(configPath), bulk.merged);
    }

    return {
        timestamp: new Date().toISOString(),
        configFile: configPath,
        apps: results,
        bulk,
    };
}
```

### 4.3 Output

Each conversion produces:
- Individual AS3 JSON files per app
- Bulk AS3 JSON file (all tenants merged)
- Conversion report JSON with success/failure/warnings

---

## 5. Phase 2: Schema Validation

### 5.1 Purpose

Validate every generated AS3 file against the official AS3 JSON schema.

### 5.2 MCP Tool Design

```typescript
// MCP Server Tool: validate-as3-schema

interface SchemaValidationRequest {
    as3: AS3Declaration;
    schemaVersion?: string;  // Default: "3.50.0"
}

interface SchemaValidationResult {
    valid: boolean;
    errors?: SchemaError[];
    warnings?: SchemaWarning[];
    schemaVersion: string;
}

interface SchemaError {
    path: string;         // JSON path to error (e.g., "declaration.tenant.app.pool.members[0]")
    message: string;      // Error message
    keyword: string;      // JSON Schema keyword that failed (e.g., "type", "required", "enum")
    expected?: string;    // What was expected
    actual?: string;      // What was found
}
```

### 5.3 Schema Source

The official AS3 schema is available at:
- **Online**: `https://raw.githubusercontent.com/F5Networks/f5-appsvcs-extension/master/schema/latest/as3-schema.json`
- **Local cache**: Store in `schemas/as3-schema-3.50.0.json`

### 5.4 Validation Process

```typescript
async function validateSchemas(as3Files: string[]): Promise<SchemaValidationResult[]> {
    const results: SchemaValidationResult[] = [];

    for (const file of as3Files) {
        const as3 = JSON.parse(fs.readFileSync(file, 'utf8'));

        // Call MCP tool
        const result = await mcpClient.callTool('validate-as3-schema', {
            as3,
            schemaVersion: '3.50.0',
        });

        results.push({
            file,
            ...result,
        });
    }

    return results;
}
```

### 5.5 Common Schema Errors to Catch

| Error Type | Example | Fix |
|------------|---------|-----|
| Invalid class | `"class": "Service_HTTPS"` (should be `Service_HTTP`) | Update `getServiceClass()` mapping |
| Missing required | Pool missing `members` | Add empty members array or skip pool |
| Invalid enum | `"loadBalancingMode": "ROUNDROBIN"` | Map to valid AS3 value |
| Type mismatch | `"virtualPort": "443"` (string not number) | Cast to number |
| Unknown property | Custom properties not in schema | Remove or move to `remark` |

---

## 6. Phase 3: Dry-Run Testing

### 6.1 Purpose

Test AS3 declarations against a real BIG-IP AS3 engine without actually deploying.

### 6.2 BIG-IP AS3 Dry-Run API

```http
POST https://<bigip>/mgmt/shared/appsvcs/declare?async=true&dry-run=true
Content-Type: application/json
Authorization: Basic <credentials>

{
    "class": "AS3",
    "action": "deploy",
    ...
}
```

**Response** (async task):
```json
{
    "id": "task-12345",
    "results": [
        {
            "code": 200,
            "message": "success",
            "tenant": "t_apple",
            "runTime": 1234
        }
    ],
    "declaration": { ... }
}
```

### 6.3 MCP Tool Design

```typescript
// MCP Server Tool: as3-dry-run

interface DryRunRequest {
    as3: AS3Declaration;
    target: string;  // BIG-IP hostname/IP
    credentials: {
        username: string;
        password: string;  // Or token
    };
    timeout?: number;  // Default: 60000ms
}

interface DryRunResult {
    success: boolean;
    taskId?: string;
    results?: TenantResult[];
    error?: string;
    rawResponse?: any;
}

interface TenantResult {
    tenant: string;
    code: number;       // 200 = success, 4xx/5xx = failure
    message: string;
    errors?: string[];  // Detailed errors for failures
    runTime: number;
}
```

### 6.4 Dry-Run Process

```typescript
async function runDryRunTests(
    validAS3Files: string[],
    bigipConfig: BigIPConfig
): Promise<DryRunResult[]> {

    const results: DryRunResult[] = [];

    for (const file of validAS3Files) {
        const as3 = JSON.parse(fs.readFileSync(file, 'utf8'));

        // Call MCP tool
        const result = await mcpClient.callTool('as3-dry-run', {
            as3,
            target: bigipConfig.host,
            credentials: bigipConfig.credentials,
        });

        results.push({
            file,
            ...result,
        });
    }

    return results;
}
```

### 6.5 Common Dry-Run Errors

| Error Code | Meaning | Example |
|------------|---------|---------|
| 200 | Success | Declaration would deploy |
| 422 | Semantic error | Invalid pool member IP |
| 400 | Syntax error | Missing required property |
| 404 | Reference error | Pool references non-existent monitor |
| 500 | Internal error | AS3 processing failure |

### 6.6 Benefits Over Schema Validation Alone

Schema validation catches:
- Structural errors (wrong types, missing required)
- Invalid enum values

Dry-run catches:
- Semantic errors (invalid IP addresses, port conflicts)
- Reference errors (missing profiles, certificates)
- Business logic errors (incompatible settings)
- Real AS3 engine behavior

---

## 7. Phase 4: Review & Gap Analysis

### 7.1 Purpose

Generate comprehensive reports identifying what works and what needs attention.

### 7.2 Gap Categories

```typescript
interface GapItem {
    category: GapCategory;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedApps: string[];
    suggestion: string;
    reference?: string;  // Link to docs or spec
}

type GapCategory =
    | 'conversion_failure'      // buildAS3() threw error
    | 'schema_invalid'          // AS3 doesn't match schema
    | 'dryrun_failure'          // BIG-IP rejected declaration
    | 'unmapped_parameter'      // NS param not in AS3
    | 'approximation'           // Mapped but not exact equivalent
    | 'feature_unsupported';    // NS feature has no AS3 equivalent
```

### 7.3 Report Generation

```typescript
function generateGapReport(pipeline: PipelineResult): GapReport {
    const gaps: GapItem[] = [];

    // 1. Conversion failures
    for (const result of pipeline.conversion.results) {
        if (!result.success) {
            gaps.push({
                category: 'conversion_failure',
                severity: 'critical',
                description: `Conversion failed: ${result.error}`,
                affectedApps: [result.appName],
                suggestion: 'Review conversion logic for this app type',
            });
        }
    }

    // 2. Schema validation failures
    for (const result of pipeline.schema.results) {
        if (!result.valid) {
            for (const error of result.errors) {
                gaps.push({
                    category: 'schema_invalid',
                    severity: 'high',
                    description: `Schema error: ${error.message} at ${error.path}`,
                    affectedApps: [result.file],
                    suggestion: `Fix ${error.keyword} violation: expected ${error.expected}`,
                });
            }
        }
    }

    // 3. Dry-run failures
    for (const result of pipeline.dryRun.results) {
        if (!result.success) {
            gaps.push({
                category: 'dryrun_failure',
                severity: 'high',
                description: `Dry-run failed: ${result.error}`,
                affectedApps: [result.file],
                suggestion: 'Review AS3 declaration against BIG-IP requirements',
            });
        }
    }

    // 4. Unmapped parameters (from coverage)
    const coverageSummary = summarizeCoverage(
        pipeline.conversion.results.map(r => r.coverage)
    );

    for (const unmapped of coverageSummary.topUnmapped) {
        gaps.push({
            category: 'unmapped_parameter',
            severity: 'medium',
            description: `Parameter ${unmapped.param} not mapped to AS3`,
            affectedApps: unmapped.apps,
            suggestion: unmapped.suggestion || 'Consider adding mapping',
        });
    }

    return {
        generated: new Date().toISOString(),
        pipeline,
        gaps,
        metrics: calculateMetrics(pipeline),
    };
}
```

### 7.4 Summary Report Format

```markdown
# AS3 Validation Pipeline Report
Generated: 2026-01-15T10:30:00Z

## Overview

| Metric | Value |
|--------|-------|
| Total Configs | 40 |
| Total Apps | 127 |
| Conversion Success | 115/127 (90.5%) |
| Schema Valid | 108/115 (93.9%) |
| Dry-Run Passed | 98/108 (90.7%) |
| **Overall Score** | **82.3%** |

## Summary by Phase

### Phase 1: Conversion
- ✅ 115 apps converted successfully
- ❌ 12 apps failed conversion
  - 8 GSLB apps (expected - not yet supported)
  - 4 errors in conversion logic

### Phase 2: Schema Validation
- ✅ 108 declarations schema-valid
- ❌ 7 declarations have schema errors
  - 3 invalid service class
  - 2 missing required properties
  - 2 type mismatches

### Phase 3: Dry-Run Testing
- ✅ 98 declarations pass dry-run
- ❌ 10 declarations failed dry-run
  - 5 invalid IP addresses
  - 3 port conflicts
  - 2 reference errors

## Top Gaps

| # | Gap | Severity | Count | Action |
|---|-----|----------|-------|--------|
| 1 | GSLB apps not supported | High | 8 | Add GSLB conversion |
| 2 | -tcpProfileName unmapped | Medium | 23 | Add profileTCP mapping |
| 3 | SSL cipher groups | Medium | 12 | Add cipher mapping |
| 4 | Invalid IP 0.0.0.0 | High | 5 | Handle wildcard IPs |

## Recommendations

1. **Priority 1**: Fix schema errors in service class mapping
2. **Priority 2**: Handle GSLB apps (or filter them from bulk)
3. **Priority 3**: Add TCP profile mapping
4. **Priority 4**: Improve IP address handling for wildcard vservers

## Ready for Customer Configs?

**Status**: ⚠️ NOT YET

Fix the critical issues above before running customer configs.
Target: 95% overall score before proceeding.
```

---

## 8. Test Configuration Inventory

### 8.1 Current Test Configs

Based on `tests/artifacts/apps/`:

| Config | Type | Primary Features | Expected Conversion |
|--------|------|------------------|---------------------|
| apple.ns.conf | LB | Basic HTTP | ✅ Full |
| banana.ns.conf | LB | Basic HTTP | ✅ Full |
| persistence.ns.conf | LB | 5 persistence types | ✅ Full |
| customMonitors.ns.conf | LB | Custom monitors | ✅ Full |
| profiles.ns.conf | LB | TCP/HTTP/SSL profiles | ⚠️ Partial |
| sslBridge.ns.conf | LB | SSL passthrough | ✅ Full |
| tcpLdaps.ns.conf | LB | TCP/LDAPS | ✅ Full |
| udpNtp.ns.conf | LB | UDP/NTP | ✅ Full |
| t1.ns.conf | CS | Content switching | ✅ Full |
| starlord.ns.conf | CS | Complex CS rules | ⚠️ Partial |
| gslbComplete.ns.conf | GSLB | Full GSLB | ❌ Not supported |
| nFactorAuth.ns.conf | AAA | nFactor auth | ❌ Complex |
| appFirewall.ns.conf | Security | WAF policies | ❌ Not mapped |
| compression.ns.conf | Performance | CMP policies | ⚠️ Partial |
| caching.ns.conf | Performance | Cache policies | ⚠️ Partial |
| rateLimiting.ns.conf | Security | Rate limits | ⚠️ Partial |
| spillover.ns.conf | HA | Backup vserver | ⚠️ Partial |

### 8.2 Test Matrix

| Feature | Test Config | Expected Result | Notes |
|---------|-------------|-----------------|-------|
| HTTP LB | apple.ns.conf | Pass | Basic case |
| HTTPS LB | profiles.ns.conf | Pass | SSL termination |
| Persistence | persistence.ns.conf | Pass | All 5 types |
| Custom Monitors | customMonitors.ns.conf | Pass | HTTP-ECV, TCP-ECV |
| Content Switch | t1.ns.conf | Pass | Policy-based routing |
| SSL Passthrough | sslBridge.ns.conf | Pass | Service_TCP + SSL |
| TCP Service | tcpLdaps.ns.conf | Pass | Service_TCP |
| UDP Service | udpNtp.ns.conf | Pass | Service_UDP |
| GSLB | gslbComplete.ns.conf | Fail | Not implemented |
| Authentication | nFactorAuth.ns.conf | Fail | Complex, needs iRules |
| WAF | appFirewall.ns.conf | Fail | Separate ASM config |

---

## 9. MCP Server Integration

### 9.1 MCP Server Location

The MCP servers are located in `../flipperAgents/`:

```
../flipperAgents/
├── mcp/
│   ├── netscaler/          # NetScaler MCP Server (18 tools)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── tools.ts    # All NS tools defined here
│   │       └── lib/
│   │           └── nitro-client.ts
│   │
│   └── f5/                 # F5 TMOS MCP Server (54 tools)
│       └── src/
│           ├── index.ts
│           ├── tools/
│           │   ├── deployment.ts    # as3_deploy, as3_get, as3_delete
│           │   ├── as3-drift.ts     # validate_as3, dry_run_as3, parse_as3_declaration
│           │   └── ...
│           └── lib/
│               └── f5-client.ts
```

### 9.2 Required MCP Tools

**All required tools already exist:**

| Tool | Purpose | Server | File |
|------|---------|--------|------|
| `validate_as3` | JSON schema validation | F5 | `tools/as3-drift.ts` |
| `dry_run_as3` | Test against BIG-IP | F5 | `tools/as3-drift.ts` |
| `as3_deploy` | Deploy AS3 | F5 | `tools/deployment.ts` |
| `as3_get` | Get current AS3 | F5 | `tools/deployment.ts` |
| `parse_as3_declaration` | Validate structure | F5 | `tools/as3-drift.ts` |
| `deploy_config` | Deploy NS config | NetScaler | `tools.ts` |
| `get_running_config` | Extract NS config | NetScaler | `tools.ts` |
| `clear_config` | Reset NS config | NetScaler | `tools.ts` |

### 9.3 Existing Tool: validate_as3

Located in `../flipperAgents/mcp/f5/src/tools/as3-drift.ts`:

```typescript
{
  name: 'validate_as3',
  description: `Validate AS3 declaration against the schema without deploying.

Performs full schema validation to catch errors before deployment.
Uses local AS3 schema validation (no device required).

Validates:
- All required properties present
- Property types match schema
- Enum values are valid
- Cross-references are valid within declaration

Common validation errors:
- Missing required properties (class, virtualAddresses, etc.)
- Invalid property types (string vs array)
- Unknown properties (typos in property names)
- Invalid enum values (persistence types, etc.)`,
  inputSchema: {
    type: 'object',
    properties: {
      declaration: {
        type: 'object',
        description: 'AS3 declaration object to validate',
      },
      schema_version: {
        type: 'string',
        description: 'Schema version to validate against (default: auto-detect)',
      },
    },
    required: ['declaration'],
  },
}
```

### 9.4 Existing Tool: dry_run_as3

Located in `../flipperAgents/mcp/f5/src/tools/as3-drift.ts`:

```typescript
{
  name: 'dry_run_as3',
  description: `Test AS3 declaration against the device WITHOUT applying changes.

POSTs the declaration with ?controls.dryRun=true to see exactly what would change.
This is the safest way to preview AS3 deployment impact.

**Enhanced Response:** Returns detailed field-level changes with impact assessment:
- HIGH impact: Pool members, virtual addresses (affects traffic)
- MEDIUM impact: Persistence, timeouts (affects sessions)
- LOW impact: Descriptions, metadata (no traffic impact)

What dry-run shows:
- Objects that would be CREATED (new)
- Objects that would be MODIFIED (with field-level details)
- Objects that would be DELETED (removed from declaration)
- Objects unchanged (already match desired state)`,
  inputSchema: {
    type: 'object',
    properties: {
      declaration: {
        type: 'object',
        description: 'AS3 declaration to test',
      },
      tenant: {
        type: 'string',
        description: 'Tenant to target (if declaration contains multiple)',
      },
    },
    required: ['declaration'],
  },
}
```

### 9.5 BIG-IP Test Target

For dry-run testing, we need a BIG-IP with AS3 installed:

| Property | Value | Notes |
|----------|-------|-------|
| Target | TBD | Lab BIG-IP or VE |
| Version | 15.1+ | AS3 3.x support |
| AS3 Version | 3.50.0+ | Match schema version |
| License | Any | Dry-run doesn't require full license |
| Connectivity | API access | Port 443 HTTPS |

**Note**: Dry-run doesn't actually deploy, so no production impact.

---

## 10. Implementation Plan

### Phase 1: Pipeline Script (2-3 days)

1. Create `scripts/as3-pipeline.ts`
2. Implement batch conversion logic
3. Generate output directory structure
4. Output conversion report JSON

**Deliverables**:
- `scripts/as3-pipeline.ts`
- `tests/artifacts/as3_output/` directory structure

### Phase 2: Schema Validation MCP Tool (1-2 days)

1. Download and cache AS3 schema
2. Implement `validate-as3-schema` MCP tool
3. Integrate into pipeline script
4. Generate schema validation report

**Deliverables**:
- `schemas/as3-schema-3.50.0.json`
- MCP tool in flipperAgents
- Updated pipeline script

### Phase 3: Dry-Run MCP Tool (2-3 days)

1. Implement `as3-dry-run` MCP tool
2. Configure BIG-IP test target
3. Integrate into pipeline script
4. Generate dry-run report

**Deliverables**:
- MCP tool in flipperAgents
- BIG-IP test configuration
- Updated pipeline script

### Phase 4: Report Generation (1-2 days)

1. Implement gap analysis logic
2. Generate Markdown summary report
3. Create VS Code integration for viewing reports

**Deliverables**:
- Report generator utility
- Sample reports from test configs

### Phase 5: Customer Config Testing

1. Run pipeline against private configs
2. Analyze gaps and fix conversion issues
3. Iterate until 95%+ success rate

**Deliverables**:
- Customer config test results (private)
- Conversion engine improvements

---

## 11. Success Criteria

### Minimum Viable Pipeline

| Metric | Target | Measure |
|--------|--------|---------|
| Conversion success | 90%+ | Apps without errors |
| Schema validation | 95%+ | Valid AS3 output |
| Test config coverage | 100% | All test configs run |

### Production Readiness

| Metric | Target | Measure |
|--------|--------|---------|
| Conversion success | 95%+ | Across all test configs |
| Schema validation | 100% | No schema errors |
| Dry-run success | 95%+ | BIG-IP accepts declarations |
| Coverage percentage | 80%+ | Average across apps |
| Customer config success | 90%+ | Private configs pass pipeline |

### Quality Gates

Before proceeding to customer configs:
1. ✅ All test configs convert without errors
2. ✅ All AS3 output is schema-valid
3. ✅ 90%+ dry-run success rate
4. ✅ No critical gaps in gap report
5. ✅ Documentation complete

---

## Appendix A: Sample Pipeline Run

```bash
# Run the full pipeline
npx ts-node scripts/as3-pipeline.ts --input tests/artifacts/apps --output tests/artifacts/as3_output

# Output:
# Phase 1: Batch Conversion
#   Converting 40 config files...
#   ✅ 36 configs converted successfully
#   ❌ 4 configs had errors
#
# Phase 2: Schema Validation
#   Validating 127 AS3 declarations...
#   ✅ 120 schema-valid
#   ❌ 7 schema errors
#
# Phase 3: Dry-Run Testing
#   Testing against bigip-lab.example.com...
#   ✅ 115 passed dry-run
#   ❌ 5 failed dry-run
#
# Phase 4: Summary
#   Overall Score: 87.4%
#   Report saved to: tests/artifacts/as3_output/_reports/summary.md
```

---

## Appendix B: Schema Error Examples

### Invalid Service Class

```json
// Error: "class" must be one of ["Service_HTTP", "Service_HTTPS", ...]
{
    "class": "Service_SSL"  // Wrong! Should be Service_HTTP or Service_TCP
}
```

### Missing Required Property

```json
// Error: "virtualAddresses" is required
{
    "class": "Service_HTTP",
    "virtualPort": 80
    // Missing virtualAddresses
}
```

### Type Mismatch

```json
// Error: "virtualPort" must be integer
{
    "class": "Service_HTTP",
    "virtualPort": "80"  // String instead of number
}
```

---

## Appendix C: Dry-Run Error Examples

### Invalid IP Address

```json
{
    "code": 422,
    "message": "declaration is invalid",
    "errors": [
        "Invalid IP address: 0.0.0.0 is not allowed for virtualAddress"
    ]
}
```

### Reference Error

```json
{
    "code": 404,
    "message": "declaration is invalid",
    "errors": [
        "Pool references monitor '/Common/mon_custom' which does not exist"
    ]
}
```

---

*This document is a living specification. Last updated: 2026-01-15*
