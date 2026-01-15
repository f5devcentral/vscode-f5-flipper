/**
 * AS3 Direct Conversion Engine
 * 
 * Main entry point for converting NetScaler AdcApp objects to AS3 declarations.
 * Replaces the old FAST template approach with direct TypeScript conversion.
 * 
 * @module as3
 * 
 * @example
 * ```typescript
 * import { buildAS3 } from './as3';
 * 
 * const result = buildAS3(app);
 * if (result.success) {
 *   console.log(JSON.stringify(result.as3, null, 2));
 * }
 * ```
 */

import { AdcApp } from '../models';
import { buildDeclaration, AS3Declaration, AS3ADC, BuildOptions } from './builders';

// Re-export types and utilities
export { AS3Declaration, AS3ADC, BuildOptions } from './builders';
export {
    getLbMethod,
    getPersistence,
    getServiceClass,
    getMonitorType,
    sanitizeName,
    isIgnorable,
} from './mappings';
export {
    analyzeCoverage,
    summarizeCoverage,
    formatCoverageReport,
    CoverageResult,
    CoverageSummary,
} from './coverage';

// ============================================================================
// Types
// ============================================================================

export interface ConvertOptions extends BuildOptions {
    /** Include coverage analysis (default: false for now) */
    includeCoverage?: boolean;
}

export interface ConversionResult {
    /** Whether conversion succeeded */
    success: boolean;
    /** App name for reference */
    app: string;
    /** Generated AS3 declaration */
    as3?: AS3Declaration;
    /** Error message if failed */
    error?: string;
    /** Warnings (non-fatal issues) */
    warnings?: string[];
}

export interface BulkResult {
    /** Individual conversion results */
    results: ConversionResult[];
    /** Merged AS3 declaration (all tenants) */
    merged?: AS3Declaration;
    /** Summary stats */
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        warnings: number;
    };
}

// ============================================================================
// Main Conversion Functions
// ============================================================================

/**
 * Convert a single AdcApp to an AS3 declaration.
 * 
 * This is the main entry point - replaces mungeNS2FAST() + template rendering.
 * 
 * @param app - NetScaler application object from digester
 * @param options - Conversion options
 * @returns ConversionResult with AS3 declaration or error
 * 
 * @example
 * ```typescript
 * const result = buildAS3(app);
 * if (result.success) {
 *   // Deploy result.as3 to BIG-IP
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function buildAS3(app: AdcApp, options: ConvertOptions = {}): ConversionResult {
    const warnings: string[] = [];

    try {
        // Validate input
        if (!app || !app.name) {
            return {
                success: false,
                app: app?.name || 'unknown',
                error: 'Invalid app: missing name',
            };
        }

        // Skip GSLB for now (different structure)
        if (app.type === 'gslb') {
            return {
                success: false,
                app: app.name,
                error: 'GSLB apps not yet supported in direct conversion',
            };
        }

        // Build the declaration
        const as3 = buildDeclaration(app, options);

        // Collect warnings for unmapped features
        if (app.opts) {
            const unmappedOpts = checkUnmappedOptions(app.opts);
            if (unmappedOpts.length > 0) {
                warnings.push(`Unmapped options: ${unmappedOpts.join(', ')}`);
            }
        }

        return {
            success: true,
            app: app.name,
            as3,
            ...(warnings.length > 0 && { warnings }),
        };

    } catch (error) {
        return {
            success: false,
            app: app?.name || 'unknown',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Convert multiple AdcApps and merge into a single AS3 declaration.
 * 
 * Each app becomes a tenant in the merged declaration.
 * 
 * @param apps - Array of NetScaler applications
 * @param options - Conversion options
 * @returns BulkResult with merged declaration and individual results
 * 
 * @example
 * ```typescript
 * const apps = explosion.config.apps.filter(a => a.type !== 'gslb');
 * const result = buildAS3Bulk(apps);
 * 
 * if (result.merged) {
 *   // Deploy single declaration with all tenants
 * }
 * ```
 */
export function buildAS3Bulk(apps: AdcApp[], options: ConvertOptions = {}): BulkResult {
    const results: ConversionResult[] = [];
    const tenants: Record<string, any> = {};

    for (const app of apps) {
        const result = buildAS3(app, options);
        results.push(result);

        if (result.success && result.as3) {
            // Extract tenant from declaration and merge
            const decl = result.as3.declaration;
            for (const key of Object.keys(decl)) {
                if (key !== 'class' && key !== 'schemaVersion' && key !== 'id' && 
                    key !== 'label' && key !== 'remark') {
                    tenants[key] = decl[key];
                }
            }
        }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const warnings = results.filter(r => r.warnings?.length).length;

    // Build merged declaration if we have any successful conversions
    let merged: AS3Declaration | undefined;
    if (Object.keys(tenants).length > 0) {
        merged = {
            class: 'AS3',
            action: 'deploy',
            persist: true,
            declaration: {
                class: 'ADC',
                schemaVersion: options.schemaVersion || '3.50.0',
                id: `flipper-bulk-${Date.now()}`,
                label: 'Bulk converted from NetScaler by Flipper',
                ...tenants,
            },
        };
    }

    return {
        results,
        merged,
        summary: {
            total: apps.length,
            succeeded,
            failed,
            warnings,
        },
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check for options that weren't mapped to AS3
 */
function checkUnmappedOptions(opts: Record<string, any>): string[] {
    const mapped = new Set([
        '-persistenceType',
        '-lbMethod',
        '-cltTimeout',
        '-svrTimeout',
        '-timeout',
        '-usip',
        '-ipSet',
        '-natPool',
        '-sslProfile',
        '-httpProfileName',
        '-tcpProfileName',
        '-state',
        '-comment',
    ]);

    const ignorable = new Set([
        '-devno',
        '-sc',
        '-sp',
        '-td',
        '-soMethod',
        '-soThreshold',
        '-appflowLog',
        '-precedence',
        '-priority',
    ]);

    const unmapped: string[] = [];

    for (const key of Object.keys(opts)) {
        if (!mapped.has(key) && !ignorable.has(key) && key.startsWith('-')) {
            unmapped.push(key);
        }
    }

    return unmapped;
}
