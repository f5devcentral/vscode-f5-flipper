/**
 * Bulk AS3 Export Command
 *
 * Produces a comprehensive report for Professional Services containing:
 * - Individual AS3 declarations for each app
 * - Full app details including features, diagnostics, coverage
 * - Global alerts for cross-app issues
 * - Summary statistics
 *
 * @see specs/BULK_AS3_EXPORT_COMMAND_SPEC.md
 */

import { Diagnostic } from 'vscode';
import { AdcApp, Explosion } from './models';
import { buildAS3, analyzeCoverage, CoverageResult } from './as3';
import { DetectedFeature } from './featureDetector';

// ============================================================================
// Types (from spec)
// ============================================================================

export interface BulkAS3ExportReport {
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
            fullyMapped: number;        // Apps with 100% feature mapping
            partiallyMapped: number;    // Apps with some unmapped features
            requiresManualWork: number; // Apps needing significant manual effort
        };

        // Complexity distribution
        complexity: {
            low: number;                // Score 1-3
            medium: number;             // Score 4-6
            high: number;               // Score 7-10
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

export interface AppDetail {
    // -------------------------------------------------------------------------
    // Identity & Basic Info
    // -------------------------------------------------------------------------
    name: string;
    type: 'cs' | 'lb' | 'gslb' | string;
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
    diagnostics: SlimDiagnostic[];      // VS Code diagnostics for this app

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
    sourceLines: string[];              // Original NS config lines

    // -------------------------------------------------------------------------
    // Generated AS3 (individual tenant)
    // -------------------------------------------------------------------------
    as3?: any;                          // Individual AS3 for this app only
    tenantName?: string;
}

export interface MappedParam {
    nsParam: string;
    nsValue: string | number;
    as3Property: string;
    as3Value?: any;
}

export interface UnmappedParam {
    nsParam: string;
    nsValue: string | number;
    reason: string;
    recommendation?: string;
}

export interface IgnoredParam {
    nsParam: string;
    reason: string;
}

export interface SlimDiagnostic {
    severity: number;
    message: string;
    range?: { start: { line: number }; end: { line: number } };
}

export interface Alert {
    severity: 'info' | 'warning' | 'error';
    category: string;                   // 'ssl', 'persistence', 'policy', etc.
    message: string;
    affectedApps: string[];
    recommendation?: string;
}

export interface BulkExportOptions {
    schemaVersion?: string;
    tenantPrefix?: string;
    includeDisabled?: boolean;
    includeGslb?: boolean;
    extensionVersion?: string;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Build a comprehensive bulk AS3 export report
 *
 * @param explosion - The parsed NetScaler configuration
 * @param options - Export options
 * @returns Complete BulkAS3ExportReport
 */
export function buildBulkAS3ExportReport(
    explosion: Explosion,
    options: BulkExportOptions = {}
): BulkAS3ExportReport {
    const {
        schemaVersion = '3.50.0',
        tenantPrefix = 't_',
        // includeDisabled - reserved for future use
        includeGslb = false,
        extensionVersion = '1.19.0',
    } = options;

    const apps = explosion.config.apps || [];
    const appDetails: AppDetail[] = [];
    const alerts: Alert[] = [];

    // Tracking for alerts
    const sslApps: string[] = [];
    const defaultCertApps: string[] = [];
    const rulePersistenceApps: string[] = [];
    const customServerIdApps: string[] = [];
    const responderPolicyApps: string[] = [];
    const rewritePolicyApps: string[] = [];
    const complexCsExpressionApps: string[] = [];
    const gslbApps: string[] = [];
    const disabledApps: string[] = [];

    // Counters
    let converted = 0;
    let failed = 0;
    let skipped = 0;
    let withWarnings = 0;

    // Complexity distribution
    let lowComplexity = 0;
    let mediumComplexity = 0;
    let highComplexity = 0;

    // Feature coverage
    let fullyMapped = 0;
    let partiallyMapped = 0;
    let requiresManualWork = 0;

    // Process each app
    for (const app of apps) {
        // Skip GSLB unless explicitly included
        if (app.type === 'gslb') {
            gslbApps.push(app.name);
            if (!includeGslb) {
                skipped++;
                appDetails.push(buildSkippedAppDetail(app, 'GSLB conversion not yet supported'));
                continue;
            }
        }

        // Check for disabled apps
        if (app.opts?.['-state'] === 'DISABLED') {
            disabledApps.push(app.name);
        }

        // Convert the app
        const conversionResult = buildAS3(app, { schemaVersion, tenantPrefix });

        // Analyze coverage
        const coverageResult = analyzeCoverage(app, conversionResult.as3);

        // Build app detail
        const appDetail = buildAppDetail(app, conversionResult, coverageResult, tenantPrefix);
        appDetails.push(appDetail);

        // Update counters
        if (conversionResult.success) {
            converted++;
            if (conversionResult.warnings?.length) {
                withWarnings++;
            }
        } else {
            failed++;
        }

        // Track complexity
        const complexity = appDetail.features.complexity;
        if (complexity <= 3) {
            lowComplexity++;
        } else if (complexity <= 6) {
            mediumComplexity++;
        } else {
            highComplexity++;
        }

        // Track feature coverage
        if (coverageResult.percentage === 100) {
            fullyMapped++;
        } else if (coverageResult.percentage >= 50) {
            partiallyMapped++;
        } else {
            requiresManualWork++;
        }

        // Collect alert data
        collectAlertData(app, {
            sslApps,
            defaultCertApps,
            rulePersistenceApps,
            customServerIdApps,
            responderPolicyApps,
            rewritePolicyApps,
            complexCsExpressionApps,
        });
    }

    // Generate alerts
    alerts.push(...generateAlerts({
        sslApps,
        defaultCertApps,
        rulePersistenceApps,
        customServerIdApps,
        responderPolicyApps,
        rewritePolicyApps,
        complexCsExpressionApps,
        gslbApps,
        disabledApps,
    }));

    // Get source filename
    const sourceFile = explosion.config.sources?.[0]?.fileName || 'unknown';

    return {
        meta: {
            generated: new Date().toISOString(),
            generator: `F5 Flipper v${extensionVersion}`,
            sourceFile,
            sourceHostname: explosion.hostname,
            schemaVersion,
        },
        summary: {
            totalApps: apps.length,
            converted,
            failed,
            skipped,
            withWarnings,
            featureCoverage: {
                fullyMapped,
                partiallyMapped,
                requiresManualWork,
            },
            complexity: {
                low: lowComplexity,
                medium: mediumComplexity,
                high: highComplexity,
            },
        },
        apps: appDetails,
        alerts,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build detailed app info for the report
 */
function buildAppDetail(
    app: AdcApp,
    conversionResult: { success: boolean; as3?: any; error?: string; warnings?: string[] },
    coverageResult: CoverageResult,
    tenantPrefix: string
): AppDetail {
    const tenantName = `${tenantPrefix}${sanitizeForTenant(app.name)}`;

    // Get feature analysis from app or provide defaults
    const featureAnalysis = app.featureAnalysis || {
        features: [],
        complexity: 1,
        recommendedPlatform: 'TMOS',
        confidence: 'High',
        conversionGaps: [],
    };

    // Extract diagnostics
    const diagnostics: SlimDiagnostic[] = [];
    if (app.diagnostics && Array.isArray(app.diagnostics)) {
        for (const d of app.diagnostics) {
            if (typeof d === 'string') {
                // Already a string diagnostic
                diagnostics.push({
                    severity: 1, // Default to warning
                    message: d,
                });
            } else {
                // VS Code Diagnostic object
                const diag = d as Diagnostic;
                diagnostics.push({
                    severity: diag.severity ?? 0,
                    message: diag.message ?? '',
                    range: diag.range ? {
                        start: { line: diag.range.start?.line ?? 0 },
                        end: { line: diag.range.end?.line ?? 0 },
                    } : undefined,
                });
            }
        }
    }

    // Map coverage results to spec format
    const mapped: MappedParam[] = coverageResult.mapped.map(m => ({
        nsParam: m.nsParam,
        nsValue: m.nsValue,
        as3Property: m.as3Path,
    }));

    const unmapped: UnmappedParam[] = coverageResult.unmapped.map(u => ({
        nsParam: u.nsParam,
        nsValue: u.nsValue,
        reason: u.reason === 'no-mapping' ? 'No AS3 equivalent' :
                u.reason === 'not-implemented' ? 'Not yet implemented' :
                'Requires complex conversion',
        recommendation: u.suggestion,
    }));

    const ignored: IgnoredParam[] = coverageResult.ignored.map(i => ({
        nsParam: i.nsParam,
        reason: i.reason,
    }));

    return {
        name: app.name,
        type: app.type as 'cs' | 'lb' | 'gslb',
        protocol: app.protocol,
        ipAddress: app.ipAddress,
        port: app.port,
        conversion: {
            status: conversionResult.success ? 'success' : 'failed',
            error: conversionResult.error,
            warnings: conversionResult.warnings || [],
        },
        features: {
            detected: featureAnalysis.features,
            complexity: featureAnalysis.complexity,
            recommendedPlatform: featureAnalysis.recommendedPlatform,
            confidence: featureAnalysis.confidence,
        },
        coverage: {
            percentage: coverageResult.percentage,
            confidence: coverageResult.confidence,
            mapped,
            unmapped,
            ignored,
        },
        diagnostics,
        conversionGaps: featureAnalysis.conversionGaps || [],
        sourceLines: app.lines || [],
        as3: conversionResult.as3,
        tenantName,
    };
}

/**
 * Build a skipped app detail (for GSLB, etc.)
 */
function buildSkippedAppDetail(app: AdcApp, reason: string): AppDetail {
    const featureAnalysis = app.featureAnalysis || {
        features: [],
        complexity: 8,
        recommendedPlatform: 'TMOS',
        confidence: 'High',
        conversionGaps: [{
            feature: 'GSLB',
            severity: 'Critical' as const,
            notes: 'GSLB requires manual conversion to BIG-IP DNS/GTM',
        }],
    };

    return {
        name: app.name,
        type: app.type as 'cs' | 'lb' | 'gslb',
        protocol: app.protocol,
        ipAddress: app.ipAddress,
        port: app.port,
        conversion: {
            status: 'skipped',
            error: reason,
            warnings: [],
        },
        features: {
            detected: featureAnalysis.features,
            complexity: featureAnalysis.complexity,
            recommendedPlatform: featureAnalysis.recommendedPlatform,
            confidence: featureAnalysis.confidence,
        },
        coverage: {
            percentage: 0,
            confidence: 'low',
            mapped: [],
            unmapped: [],
            ignored: [],
        },
        diagnostics: [],
        conversionGaps: featureAnalysis.conversionGaps || [{
            feature: 'GSLB',
            severity: 'Critical',
            notes: reason,
        }],
        sourceLines: app.lines || [],
    };
}

/**
 * Collect data needed for alert generation
 */
function collectAlertData(app: AdcApp, tracking: {
    sslApps: string[];
    defaultCertApps: string[];
    rulePersistenceApps: string[];
    customServerIdApps: string[];
    responderPolicyApps: string[];
    rewritePolicyApps: string[];
    complexCsExpressionApps: string[];
}): void {
    // SSL certificates
    if (app.bindings?.certs && app.bindings.certs.length > 0) {
        tracking.sslApps.push(app.name);
    } else if (app.protocol === 'SSL' || app.protocol === 'SSL_BRIDGE') {
        tracking.defaultCertApps.push(app.name);
    }

    // Persistence types
    const persistenceType = app.opts?.['-persistenceType'];
    if (persistenceType === 'RULE') {
        tracking.rulePersistenceApps.push(app.name);
    }
    if (persistenceType === 'CUSTOMSERVERID') {
        tracking.customServerIdApps.push(app.name);
    }

    // Responder policies (check in bindings or lines)
    if (app.lines?.some(line => line.includes('responder'))) {
        tracking.responderPolicyApps.push(app.name);
    }

    // Rewrite policies
    if (app.lines?.some(line => line.includes('rewrite'))) {
        tracking.rewritePolicyApps.push(app.name);
    }

    // Content switching expressions
    if (app.type === 'cs' && app.csPolicies?.length) {
        const hasComplexExpressions = app.csPolicies.some(policy => {
            const rule = policy['-rule'];
            return rule && (
                rule.includes('&&') ||
                rule.includes('||') ||
                rule.includes('HTTP.REQ.URL.PATH_AND_QUERY') ||
                rule.length > 100
            );
        });
        if (hasComplexExpressions) {
            tracking.complexCsExpressionApps.push(app.name);
        }
    }
}

/**
 * Generate alerts based on collected data
 */
function generateAlerts(tracking: {
    sslApps: string[];
    defaultCertApps: string[];
    rulePersistenceApps: string[];
    customServerIdApps: string[];
    responderPolicyApps: string[];
    rewritePolicyApps: string[];
    complexCsExpressionApps: string[];
    gslbApps: string[];
    disabledApps: string[];
}): Alert[] {
    const alerts: Alert[] = [];

    // SSL/TLS Alerts
    if (tracking.sslApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'ssl',
            message: `${tracking.sslApps.length} app(s) reference SSL certificates that must be uploaded to BIG-IP before deployment`,
            affectedApps: tracking.sslApps,
            recommendation: 'Export certificates from NetScaler and import to BIG-IP /Common partition',
        });
    }

    if (tracking.defaultCertApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'ssl',
            message: `${tracking.defaultCertApps.length} app(s) use default certificate. Replace /Common/default.crt with actual certificates`,
            affectedApps: tracking.defaultCertApps,
            recommendation: 'Configure proper SSL certificates after deployment',
        });
    }

    // Persistence Alerts
    if (tracking.rulePersistenceApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'persistence',
            message: `${tracking.rulePersistenceApps.length} app(s) use rule-based persistence. Create iRules manually for universal persistence`,
            affectedApps: tracking.rulePersistenceApps,
            recommendation: 'Create F5 iRules to implement custom persistence logic',
        });
    }

    if (tracking.customServerIdApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'persistence',
            message: `${tracking.customServerIdApps.length} app(s) use custom server ID persistence. Create iRules manually`,
            affectedApps: tracking.customServerIdApps,
            recommendation: 'Create F5 iRules to implement CUSTOMSERVERID persistence',
        });
    }

    // Policy Alerts
    if (tracking.responderPolicyApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'policy',
            message: `${tracking.responderPolicyApps.length} app(s) have responder policies. Convert to LTM policies or iRules manually`,
            affectedApps: tracking.responderPolicyApps,
            recommendation: 'Convert NetScaler responder policies to F5 LTM policies or iRules',
        });
    }

    if (tracking.rewritePolicyApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'policy',
            message: `${tracking.rewritePolicyApps.length} app(s) have rewrite policies. Convert to LTM policies or iRules manually`,
            affectedApps: tracking.rewritePolicyApps,
            recommendation: 'Convert NetScaler rewrite policies to F5 LTM policies or iRules',
        });
    }

    if (tracking.complexCsExpressionApps.length > 0) {
        alerts.push({
            severity: 'warning',
            category: 'policy',
            message: `${tracking.complexCsExpressionApps.length} app(s) have complex CS expressions. May need iRule conversion`,
            affectedApps: tracking.complexCsExpressionApps,
            recommendation: 'Review complex content switching expressions and convert to LTM policies or iRules as needed',
        });
    }

    // Skipped Apps Alerts
    if (tracking.gslbApps.length > 0) {
        alerts.push({
            severity: 'error',
            category: 'gslb',
            message: `${tracking.gslbApps.length} GSLB app(s) require manual conversion`,
            affectedApps: tracking.gslbApps,
            recommendation: 'Configure BIG-IP DNS/GTM manually for global load balancing',
        });
    }

    if (tracking.disabledApps.length > 0) {
        alerts.push({
            severity: 'info',
            category: 'state',
            message: `${tracking.disabledApps.length} app(s) are disabled in source config. They are converted but may need review`,
            affectedApps: tracking.disabledApps,
            recommendation: 'Review disabled apps before enabling in production',
        });
    }

    return alerts;
}

/**
 * Sanitize app name for tenant naming
 */
function sanitizeForTenant(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^[0-9]/, 't$&')
        .substring(0, 48);
}
