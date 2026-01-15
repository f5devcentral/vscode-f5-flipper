/**
 * AS3 Conversion Coverage Analysis
 * 
 * Analyzes what NS parameters were mapped vs dropped during conversion.
 * Provides visibility into conversion completeness.
 * 
 * @module as3/coverage
 */

import { AdcApp } from '../models';
import { isIgnorable, getIgnoreReason } from './mappings';

// ============================================================================
// Types
// ============================================================================

export interface CoverageResult {
    /** App name */
    app: string;
    /** Coverage percentage (0-100) */
    percentage: number;
    /** Confidence level based on coverage */
    confidence: 'high' | 'medium' | 'low';
    /** Parameters that were successfully mapped */
    mapped: MappedParam[];
    /** Parameters that couldn't be mapped */
    unmapped: UnmappedParam[];
    /** Parameters intentionally ignored */
    ignored: IgnoredParam[];
}

export interface MappedParam {
    /** NS parameter name (e.g., -lbMethod) */
    nsParam: string;
    /** NS parameter value */
    nsValue: string;
    /** AS3 property path */
    as3Path: string;
}

export interface UnmappedParam {
    /** NS parameter name */
    nsParam: string;
    /** NS parameter value */
    nsValue: string;
    /** Why it wasn't mapped */
    reason: 'no-mapping' | 'not-implemented' | 'complex';
    /** Suggestion for manual handling */
    suggestion?: string;
}

export interface IgnoredParam {
    /** NS parameter name */
    nsParam: string;
    /** NS parameter value */
    nsValue: string;
    /** Why it was ignored */
    reason: string;
}

export interface CoverageSummary {
    /** Average coverage across all apps */
    averageCoverage: number;
    /** Count by confidence level */
    byConfidence: {
        high: number;
        medium: number;
        low: number;
    };
    /** Most commonly unmapped parameters */
    topUnmapped: { param: string; count: number }[];
}

// ============================================================================
// Known Mappings Registry
// ============================================================================

/**
 * Parameters we know how to map to AS3
 */
const MAPPED_PARAMS: Record<string, string> = {
    // Virtual server basics
    '-lbMethod': 'loadBalancingMode',
    '-persistenceType': 'persistenceMethods',
    '-timeout': 'persistenceMethods[].timeout',
    '-cltTimeout': 'idleTimeout',
    '-svrTimeout': 'pool.serviceDownAction',
    
    // SNAT
    '-usip': 'snat',
    '-ipSet': 'snat.pool',
    '-natPool': 'snat.pool',
    
    // SSL/TLS
    '-sslProfile': 'clientTLS',
    '-ssl3': 'clientTLS.tls1_0Enabled',
    '-tls11': 'clientTLS.tls1_1Enabled',
    '-tls12': 'clientTLS.tls1_2Enabled',
    '-tls13': 'clientTLS.tls1_3Enabled',
    
    // Profiles
    '-httpProfileName': 'profileHTTP',
    '-tcpProfileName': 'profileTCP',
    '-netProfile': '(network-level)',
    
    // Backup/redirect
    '-backupVServer': 'pool.minimumMembersActive',
    '-redirectURL': 'redirect80',
    
    // State
    '-state': 'enable',
    '-comment': 'remark',
};

/**
 * Suggestions for unmapped parameters
 */
const SUGGESTIONS: Record<string, string> = {
    '-tcpProfileName': 'Create custom TCP_Profile in AS3 or reference existing /Common/ profile',
    '-httpProfileName': 'Create custom HTTP_Profile in AS3 or reference existing /Common/ profile',
    '-netProfile': 'No direct AS3 equivalent - configure at BIG-IP network level',
    '-cipherAliasBinding': 'Map cipher suite to clientTLS.ciphers property',
    '-soMethod': 'Use Priority Group Activation in pool configuration',
    '-soThreshold': 'Configure in pool minimumMembersActive',
    '-sc': 'Use OneConnect profile in F5 for connection multiplexing',
    '-sp': 'Use connection rate limiting or DOS profile',
    '-appflowLog': 'Configure F5 Analytics/AVR separately',
    '-dbProfileName': 'Database profiles not directly supported - may need iRule',
    '-pushVserver': 'Use AS3 redirect or iRule for server push',
    '-dnsProfileName': 'Create DNS_Profile in AS3 for DNS virtual servers',
};

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze conversion coverage for an app
 */
export function analyzeCoverage(app: AdcApp, as3?: any): CoverageResult {
    const mapped: MappedParam[] = [];
    const unmapped: UnmappedParam[] = [];
    const ignored: IgnoredParam[] = [];

    // Extract all parameters from app
    const params = extractParams(app);

    for (const { param, value } of params) {
        // Check if ignorable
        if (isIgnorable(param)) {
            ignored.push({
                nsParam: param,
                nsValue: value,
                reason: getIgnoreReason(param) || 'No F5 equivalent',
            });
            continue;
        }

        // Check if we know how to map it
        const as3Path = MAPPED_PARAMS[param];
        if (as3Path) {
            mapped.push({
                nsParam: param,
                nsValue: value,
                as3Path,
            });
        } else {
            unmapped.push({
                nsParam: param,
                nsValue: value,
                reason: 'no-mapping',
                suggestion: SUGGESTIONS[param],
            });
        }
    }

    // Calculate coverage (only counting mapped + unmapped, not ignored)
    const total = mapped.length + unmapped.length;
    const percentage = total > 0 ? Math.round((mapped.length / total) * 100) : 100;

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (percentage >= 80) {
        confidence = 'high';
    } else if (percentage >= 50) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    return {
        app: app.name,
        percentage,
        confidence,
        mapped,
        unmapped,
        ignored,
    };
}

/**
 * Summarize coverage across multiple apps
 */
export function summarizeCoverage(results: CoverageResult[]): CoverageSummary {
    if (results.length === 0) {
        return {
            averageCoverage: 100,
            byConfidence: { high: 0, medium: 0, low: 0 },
            topUnmapped: [],
        };
    }

    // Calculate average
    const totalCoverage = results.reduce((sum, r) => sum + r.percentage, 0);
    const averageCoverage = Math.round(totalCoverage / results.length);

    // Count by confidence
    const byConfidence = {
        high: results.filter(r => r.confidence === 'high').length,
        medium: results.filter(r => r.confidence === 'medium').length,
        low: results.filter(r => r.confidence === 'low').length,
    };

    // Find top unmapped params
    const unmappedCounts: Record<string, number> = {};
    for (const result of results) {
        for (const param of result.unmapped) {
            unmappedCounts[param.nsParam] = (unmappedCounts[param.nsParam] || 0) + 1;
        }
    }

    const topUnmapped = Object.entries(unmappedCounts)
        .map(([param, count]) => ({ param, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        averageCoverage,
        byConfidence,
        topUnmapped,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract all parameters from an AdcApp
 */
function extractParams(app: AdcApp): { param: string; value: string }[] {
    const params: { param: string; value: string }[] = [];

    // From opts object
    if (app.opts) {
        for (const [key, value] of Object.entries(app.opts)) {
            if (key.startsWith('-') && value !== undefined) {
                params.push({ param: key, value: String(value) });
            }
        }
    }

    // From raw lines if available (catches anything opts missed)
    if (app.lines) {
        const lineParams = parseParamsFromLines(app.lines);
        
        // Add any params not already in the list
        const existingParams = new Set(params.map(p => p.param));
        for (const lp of lineParams) {
            if (!existingParams.has(lp.param)) {
                params.push(lp);
            }
        }
    }

    return params;
}

/**
 * Parse -param value pairs from config lines
 */
function parseParamsFromLines(lines: string[]): { param: string; value: string }[] {
    const params: { param: string; value: string }[] = [];
    const regex = /-(\w+)\s+(?:"([^"]+)"|(\S+))/g;

    for (const line of lines) {
        let match;
        while ((match = regex.exec(line)) !== null) {
            params.push({
                param: `-${match[1]}`,
                value: match[2] || match[3],
            });
        }
    }

    return params;
}

/**
 * Generate a human-readable coverage report
 */
export function formatCoverageReport(result: CoverageResult): string {
    const lines: string[] = [
        `Coverage Report: ${result.app}`,
        `${'='.repeat(50)}`,
        `Coverage: ${result.percentage}% (${result.confidence} confidence)`,
        '',
    ];

    if (result.mapped.length > 0) {
        lines.push(`Mapped Parameters (${result.mapped.length}):`);
        for (const p of result.mapped) {
            lines.push(`  ${p.nsParam}: ${p.nsValue} → ${p.as3Path}`);
        }
        lines.push('');
    }

    if (result.unmapped.length > 0) {
        lines.push(`Unmapped Parameters (${result.unmapped.length}):`);
        for (const p of result.unmapped) {
            lines.push(`  ${p.nsParam}: ${p.nsValue}`);
            if (p.suggestion) {
                lines.push(`    → ${p.suggestion}`);
            }
        }
        lines.push('');
    }

    if (result.ignored.length > 0) {
        lines.push(`Ignored Parameters (${result.ignored.length}):`);
        for (const p of result.ignored) {
            lines.push(`  ${p.nsParam}: ${p.reason}`);
        }
    }

    return lines.join('\n');
}
