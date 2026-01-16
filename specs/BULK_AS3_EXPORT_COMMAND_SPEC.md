# Bulk AS3 Export Command Specification

**Date**: 2026-01-15
**Status**: DRAFT
**Author**: Claude Code + Ted

---

## Overview

This specification defines a new VS Code command that enables bulk export of all discovered NetScaler applications to AS3 declarations. The command produces a comprehensive report containing individual declarations, a merged declaration for bulk deployment, and detailed conversion metadata.

---

## User Story

As a network engineer migrating from NetScaler to F5 BIG-IP, I want to export all discovered applications to AS3 format in a single operation, so that I can review the conversions, identify any issues, and have deployment-ready declarations.

---

## Command Definition

### Package.json Entry

```json
{
  "command": "f5-flipper.exportAS3Bulk",
  "title": "Export All Apps to AS3",
  "category": "F5-Flipper",
  "enablement": "f5-flipper.configLoaded"
}
```

The command will appear in the Command Palette (`Ctrl+Shift+P`) under "F5-Flipper: Export All Apps to AS3" when a configuration has been loaded.

---

## Activation Conditions

The command is **only available** when:

1. A NetScaler configuration has been loaded (`.conf` or `.tgz`)
2. The configuration has been parsed and exploded
3. At least one application (CS, LB) has been discovered

**Check:**
```typescript
if (!ext.nsCfgProvider.explosion?.config?.apps?.length) {
  window.showErrorMessage('No applications loaded. Import a NetScaler config first.');
  return;
}
```

---

## Output Structure

The command produces a single comprehensive JSON report designed for Professional Services to analyze and plan conversion work. The report includes full app details, feature detection, diagnostics, conversion coverage, and the generated AS3.

```typescript
interface BulkAS3ExportReport {
  // =========================================================================
  // METADATA
  // =========================================================================
  meta: {
    generated: string;              // ISO timestamp
    generator: string;              // "F5 Flipper v{version}"
    sourceFile: string;             // Original config filename
    sourceHostname?: string;        // NetScaler hostname if detected
    schemaVersion: string;          // AS3 schema version used
  };

  // =========================================================================
  // SUMMARY - Quick overview for PS
  // =========================================================================
  summary: {
    totalApps: number;              // Total apps discovered
    converted: number;              // Successfully converted to AS3
    failed: number;                 // Conversion failures
    skipped: number;                // Intentionally skipped (e.g., GSLB)
    withWarnings: number;           // Apps with non-fatal warnings

    // Feature coverage rollup
    featureCoverage: {
      fullyMapped: number;          // Apps with 100% feature mapping
      partiallyMapped: number;      // Apps with some unmapped features
      requiresManualWork: number;   // Apps needing significant manual effort
    };

    // Complexity distribution
    complexity: {
      low: number;                  // Score 1-3
      medium: number;               // Score 4-6
      high: number;                 // Score 7-10
    };
  };

  // =========================================================================
  // APPS - Full detail for each application
  // =========================================================================
  apps: AppDetail[];

  // =========================================================================
  // GLOBAL ALERTS - Cross-app issues PS needs to address
  // =========================================================================
  alerts: Alert[];
}

interface AppDetail {
  // -------------------------------------------------------------------------
  // Identity & Basic Info
  // -------------------------------------------------------------------------
  name: string;
  type: 'cs' | 'lb' | 'gslb';
  protocol: string;
  ipAddress?: string;
  port?: string;

  // -------------------------------------------------------------------------
  // Conversion Status
  // -------------------------------------------------------------------------
  conversion: {
    status: 'success' | 'failed' | 'skipped';
    error?: string;                 // Fatal error if failed
    warnings: string[];             // Non-fatal warnings
  };

  // -------------------------------------------------------------------------
  // Feature Detection (from featureDetector)
  // -------------------------------------------------------------------------
  features: {
    detected: DetectedFeature[];    // All features found in this app
    complexity: number;             // 1-10 score
    recommendedPlatform: string;    // TMOS, NGINX, XC
    confidence: string;             // Low, Medium, High
  };

  // -------------------------------------------------------------------------
  // Conversion Coverage (from AS3 coverage analyzer)
  // -------------------------------------------------------------------------
  coverage: {
    percentage: number;             // 0-100
    confidence: 'high' | 'medium' | 'low';
    mapped: MappedParam[];          // Successfully converted params
    unmapped: UnmappedParam[];      // Params requiring manual work
    ignored: IgnoredParam[];        // Intentionally skipped params
  };

  // -------------------------------------------------------------------------
  // Diagnostics (from nsDiag)
  // -------------------------------------------------------------------------
  diagnostics: Diagnostic[];        // VS Code diagnostics for this app

  // -------------------------------------------------------------------------
  // Conversion Gaps - What PS needs to address manually
  // -------------------------------------------------------------------------
  conversionGaps: {
    feature: string;
    severity: 'Info' | 'Warning' | 'Critical';
    notes: string;
  }[];

  // -------------------------------------------------------------------------
  // Source Configuration
  // -------------------------------------------------------------------------
  sourceLines: string[];            // Original NS config lines

  // -------------------------------------------------------------------------
  // Generated AS3 (individual tenant)
  // -------------------------------------------------------------------------
  as3?: AS3Declaration;             // Individual AS3 for this app only
  tenantName?: string;
}

// Supporting types from existing codebase
interface DetectedFeature {
  category: string;                 // "Load Balancing", "Security", etc.
  name: string;                     // "Content Switching", "SSL Offload"
  details: string;                  // Human-readable description
  complexityWeight: number;         // 1-10 impact on conversion
  f5Mapping: {
    tmos: 'full' | 'partial' | 'none';
    tmosNotes?: string;
    nginx: 'full' | 'partial' | 'none';
    nginxNotes?: string;
    xc: 'full' | 'partial' | 'none';
    xcNotes?: string;
    requires?: string[];            // Prerequisites (e.g., "APM license")
  };
}

interface MappedParam {
  nsParam: string;                  // NetScaler parameter name
  nsValue: string | number;         // Original value
  as3Property: string;              // AS3 property it maps to
  as3Value: any;                    // Converted value
}

interface UnmappedParam {
  nsParam: string;
  nsValue: string | number;
  reason: string;                   // Why it couldn't be mapped
  recommendation?: string;          // How to handle manually
}

interface IgnoredParam {
  nsParam: string;
  reason: string;                   // Why it's safe to ignore
}

interface Alert {
  severity: 'info' | 'warning' | 'error';
  category: string;                 // 'ssl', 'persistence', 'policy', etc.
  message: string;
  affectedApps: string[];
  recommendation?: string;
}
```

---

## Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     BULK AS3 EXPORT FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. VALIDATE CONTEXT                                                    │
│     └─ Check explosion exists and has apps                             │
│                                                                         │
│  2. FILTER APPS                                                         │
│     ├─ Include: CS, LB apps                                            │
│     └─ Skip: GSLB apps (with note in report)                           │
│                                                                         │
│  3. CONVERT EACH APP                                                    │
│     ├─ Call buildAS3(app, options)                                     │
│     ├─ Capture result (success/failure)                                │
│     ├─ Collect warnings and unmapped options                           │
│     └─ Track feature coverage                                          │
│                                                                         │
│  4. BUILD MERGED DECLARATION                                            │
│     ├─ Call buildAS3Bulk(successfulApps, options)                      │
│     └─ Combine all tenants into single declaration                     │
│                                                                         │
│  5. GENERATE ALERTS                                                     │
│     ├─ SSL certificates requiring upload                               │
│     ├─ Persistence types needing iRules                                │
│     ├─ Policies requiring manual conversion                            │
│     └─ GSLB apps skipped                                               │
│                                                                         │
│  6. BUILD REPORT                                                        │
│     └─ Assemble all data into report structure                         │
│                                                                         │
│  7. DISPLAY REPORT                                                      │
│     ├─ Open as untitled JSON document                                  │
│     ├─ Apply JSON formatting                                           │
│     └─ Fold to show summary first                                      │
│                                                                         │
│  8. CAPTURE TELEMETRY                                                   │
│     └─ Log conversion stats (anonymized)                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Alert Categories

### SSL/TLS Alerts

| Condition | Alert |
|-----------|-------|
| Apps with bound certificates | "X apps reference SSL certificates. Upload certificates to BIG-IP before deploying." |
| No certs but Service_HTTPS | "X apps use default certificate. Replace /Common/default.crt with actual certificates." |

### Persistence Alerts

| Condition | Alert |
|-----------|-------|
| RULE persistence | "X apps use rule-based persistence. Create iRules manually for universal persistence." |
| CUSTOMSERVERID | "X apps use custom server ID persistence. Create iRules manually." |

### Policy Alerts

| Condition | Alert |
|-----------|-------|
| Responder policies | "X apps have responder policies. Convert to LTM policies or iRules manually." |
| Rewrite policies | "X apps have rewrite policies. Convert to LTM policies or iRules manually." |
| Content switching expressions | "X apps have CS expressions. Complex expressions may need iRule conversion." |

### Skipped Apps Alerts

| Condition | Alert |
|-----------|-------|
| GSLB apps | "X GSLB apps were skipped. GSLB conversion is not yet supported." |
| Disabled apps | "X apps are disabled in source config. They are converted but may need review." |

---

## Configuration Options

Future enhancement: Allow user configuration via VS Code settings.

```json
{
  "f5Flipper.as3Export.schemaVersion": "3.50.0",
  "f5Flipper.as3Export.tenantPrefix": "t_",
  "f5Flipper.as3Export.includeDisabled": true,
  "f5Flipper.as3Export.includeGslb": false
}
```

For initial implementation, use sensible defaults:
- `schemaVersion`: "3.50.0"
- `tenantPrefix`: "t_"
- `includeDisabled`: true
- `includeGslb`: false (skip with alert)

---

## Example Output

```json
{
  "meta": {
    "generated": "2026-01-15T23:30:00.000Z",
    "generator": "F5 Flipper v1.19.0",
    "sourceFile": "production.ns.conf",
    "sourceHostname": "ns-prod-01",
    "schemaVersion": "3.50.0"
  },

  "summary": {
    "totalApps": 25,
    "converted": 22,
    "failed": 0,
    "skipped": 3,
    "withWarnings": 5,
    "featureCoverage": {
      "fullyMapped": 15,
      "partiallyMapped": 7,
      "requiresManualWork": 3
    },
    "complexity": {
      "low": 12,
      "medium": 8,
      "high": 5
    }
  },

  "apps": [
    {
      "name": "web_app_https",
      "type": "lb",
      "protocol": "SSL",
      "ipAddress": "10.1.1.100",
      "port": "443",

      "conversion": {
        "status": "success",
        "warnings": [
          "Certificate 'wildcard_cert' must be uploaded to BIG-IP"
        ]
      },

      "features": {
        "detected": [
          {
            "category": "Security",
            "name": "SSL Offload",
            "details": "1 SSL certificate bound",
            "complexityWeight": 3,
            "f5Mapping": {
              "tmos": "full",
              "tmosNotes": "Client SSL profile",
              "nginx": "full",
              "xc": "full"
            }
          },
          {
            "category": "Session Management",
            "name": "Cookie Persistence",
            "details": "COOKIEINSERT persistence",
            "complexityWeight": 2,
            "f5Mapping": {
              "tmos": "full",
              "tmosNotes": "cookie persistence profile",
              "nginx": "partial",
              "nginxNotes": "sticky cookie directive",
              "xc": "full"
            }
          },
          {
            "category": "Monitoring",
            "name": "HTTP Monitor",
            "details": "Custom HTTP health check",
            "complexityWeight": 1,
            "f5Mapping": {
              "tmos": "full",
              "nginx": "full",
              "xc": "full"
            }
          }
        ],
        "complexity": 4,
        "recommendedPlatform": "TMOS",
        "confidence": "High"
      },

      "coverage": {
        "percentage": 92,
        "confidence": "high",
        "mapped": [
          {
            "nsParam": "-lbMethod",
            "nsValue": "ROUNDROBIN",
            "as3Property": "loadBalancingMode",
            "as3Value": "round-robin"
          },
          {
            "nsParam": "-persistenceType",
            "nsValue": "COOKIEINSERT",
            "as3Property": "persistenceMethods",
            "as3Value": ["cookie"]
          }
        ],
        "unmapped": [
          {
            "nsParam": "-cookieName",
            "nsValue": "SERVERID",
            "reason": "Custom cookie name not yet supported",
            "recommendation": "Configure cookie name in persistence profile manually"
          }
        ],
        "ignored": [
          {
            "nsParam": "-comment",
            "reason": "Metadata only, no functional impact"
          }
        ]
      },

      "diagnostics": [
        {
          "severity": 1,
          "message": "Certificate 'wildcard_cert' referenced but not found in config",
          "range": { "start": { "line": 42 }, "end": { "line": 42 } }
        }
      ],

      "conversionGaps": [
        {
          "feature": "Custom Cookie Name",
          "severity": "Warning",
          "notes": "Cookie name 'SERVERID' needs manual configuration in persistence profile"
        }
      ],

      "sourceLines": [
        "add lb vserver web_app_https SSL 10.1.1.100 443 -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN",
        "bind lb vserver web_app_https -policyName pol_web -priority 100",
        "bind ssl vserver web_app_https -certKeyName wildcard_cert"
      ],

      "tenantName": "t_web_app_https",
      "as3": {
        "class": "AS3",
        "action": "deploy",
        "persist": true,
        "declaration": {
          "class": "ADC",
          "schemaVersion": "3.50.0",
          "t_web_app_https": {
            "class": "Tenant",
            "app_web_app_https": {
              "class": "Application",
              "vs_web_app_https": {
                "class": "Service_HTTPS",
                "virtualAddresses": ["10.1.1.100"],
                "virtualPort": 443,
                "pool": "pool_web_app_https",
                "persistenceMethods": ["cookie"],
                "serverTLS": "clientssl_web_app_https"
              },
              "pool_web_app_https": {
                "class": "Pool",
                "loadBalancingMode": "round-robin",
                "members": []
              }
            }
          }
        }
      }
    },

    {
      "name": "gslb_app",
      "type": "gslb",
      "protocol": "HTTP",
      "ipAddress": "10.1.1.200",
      "port": "80",

      "conversion": {
        "status": "skipped",
        "error": "GSLB conversion not yet supported",
        "warnings": []
      },

      "features": {
        "detected": [
          {
            "category": "Global Load Balancing",
            "name": "GSLB vServer",
            "details": "1 GSLB vServer with 2 sites",
            "complexityWeight": 8,
            "f5Mapping": {
              "tmos": "full",
              "tmosNotes": "DNS/GTM wide-ip",
              "nginx": "none",
              "nginxNotes": "Not supported",
              "xc": "partial",
              "xcNotes": "DNS load balancing"
            }
          }
        ],
        "complexity": 8,
        "recommendedPlatform": "TMOS",
        "confidence": "High"
      },

      "coverage": {
        "percentage": 0,
        "confidence": "low",
        "mapped": [],
        "unmapped": [
          {
            "nsParam": "-lbMethod",
            "nsValue": "ROUNDROBIN",
            "reason": "GSLB conversion not implemented"
          }
        ],
        "ignored": []
      },

      "diagnostics": [],

      "conversionGaps": [
        {
          "feature": "GSLB",
          "severity": "Critical",
          "notes": "GSLB requires manual conversion to BIG-IP DNS/GTM"
        }
      ],

      "sourceLines": [
        "add gslb vserver gslb_app HTTP -lbMethod ROUNDROBIN"
      ]
    }
  ],

  "alerts": [
    {
      "severity": "warning",
      "category": "ssl",
      "message": "5 apps reference SSL certificates that must be uploaded to BIG-IP before deployment",
      "affectedApps": ["web_app_https", "api_gateway", "portal", "admin", "mobile"],
      "recommendation": "Export certificates from NetScaler and import to BIG-IP /Common partition"
    },
    {
      "severity": "error",
      "category": "gslb",
      "message": "3 GSLB apps require manual conversion",
      "affectedApps": ["gslb_app", "gslb_api", "gslb_cdn"],
      "recommendation": "Configure BIG-IP DNS/GTM manually for global load balancing"
    },
    {
      "severity": "warning",
      "category": "persistence",
      "message": "2 apps use custom cookie names that need manual configuration",
      "affectedApps": ["web_app_https", "portal"],
      "recommendation": "Update persistence profiles with correct cookie names after deployment"
    }
  ]
}
```

---

## Implementation Plan

### Phase 1: Core Command & Report Structure

1. Register command in `package.json` with enablement condition
2. Add command handler in `extension.ts`
3. Implement report builder that assembles:
   - Meta info from extension context
   - Summary stats calculated from app results
   - Per-app details including all existing data (features, diagnostics, coverage)
4. Call `buildAS3()` for each app to generate individual AS3 declarations
5. Generate alerts by scanning for common issues across apps
6. Display as untitled JSON document

**Files to modify:**

- `package.json` - Add command registration
- `src/extension.ts` - Add command handler and report builder

### Phase 2: Enhanced Coverage & Gap Analysis

1. Enhance `coverage.ts` to provide more detailed mapping info
2. Add conversion gap detection based on feature analysis
3. Improve alert generation with recommendations
4. Include source config lines in report

**Files to modify:**

- `src/extension.ts` - Enhance report generation
- `src/as3/coverage.ts` - Add detailed mapping output

### Phase 3: User Configuration (Future)

1. Add VS Code settings for export options
2. Implement schema version selection
3. Add tenant naming customization
4. GSLB opt-in support (when ready)

**Files to modify:**

- `package.json` - Add configuration schema
- `src/extension.ts` - Read configuration

---

## Testing Checklist

### Functional Tests

- [ ] Command appears in palette when config is loaded
- [ ] Command is hidden when no config is loaded
- [ ] All CS/LB apps are converted
- [ ] GSLB apps are skipped with appropriate message
- [ ] Failed conversions are captured with error details
- [ ] Warnings are collected per-app
- [ ] Merged declaration is valid AS3
- [ ] Report opens as new document
- [ ] JSON is properly formatted

### Edge Cases

- [ ] Empty config (no apps) - shows error message
- [ ] All apps fail conversion - report still generated
- [ ] Very large config (100+ apps) - performance acceptable
- [ ] Config with only GSLB apps - handled gracefully
- [ ] Apps with special characters in names - sanitized correctly

### Telemetry

- [ ] Command execution is logged
- [ ] Success/failure counts are captured
- [ ] No PII is included in telemetry

---

## Success Criteria

1. **Functional:** Command converts all compatible apps and produces valid report
2. **Complete:** Report includes all information needed for deployment planning
3. **Actionable:** Alerts clearly indicate what manual work is needed
4. **Usable:** Output is readable and can be saved/shared easily
5. **Safe:** No data loss, no side effects, undo-able

---

## Future Enhancements

1. **Direct file save** - Option to save to workspace folder
2. **Split output** - Separate files for merged vs individual declarations
3. **Validation integration** - Run schema validation on output
4. **Dry-run integration** - Test against BIG-IP if MCP server available
5. **Diff view** - Compare source NS config with generated AS3
6. **Export formats** - YAML output option, Terraform integration
7. **Local Traffic Policy conversion** - See [LTP_CONVERSION_SPEC.md](./LTP_CONVERSION_SPEC.md)

---

## References

- [AS3 Direct Conversion Engine](./DIRECT_CONVERSION_ADR.md)
- [AS3 Validation Pipeline](./AS3_VALIDATION_PIPELINE_SPEC.md)
- [NS to F5 Mappings](./NS_TO_F5_MAPPINGS.md)
- [VS Code Extension API](https://code.visualstudio.com/api)
