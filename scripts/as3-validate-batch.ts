#!/usr/bin/env npx ts-node
/**
 * AS3 Batch Validation Script
 *
 * Processes all test NS configs, converts to AS3, validates schema,
 * optionally runs dry-run, and saves outputs.
 *
 * Usage:
 *   npx ts-node scripts/as3-validate-batch.ts [--dry-run] [--mcp-url=http://localhost:3000]
 */

import * as fs from 'fs';
import * as path from 'path';
import ADC from '../src/CitrixADC';
import { buildAS3, buildAS3Bulk } from '../src/as3';

// Configuration
const TEST_CONFIG_DIR = path.join(__dirname, '../tests/artifacts/apps');
const OUTPUT_DIR = path.join(__dirname, '../tests/artifacts/as3_output');
const REPORTS_DIR = path.join(OUTPUT_DIR, '_reports');

// Parse CLI args
const args = process.argv.slice(2);
const doDryRun = args.includes('--dry-run');
const mcpUrlArg = args.find(a => a.startsWith('--mcp-url='));
const MCP_URL = mcpUrlArg ? mcpUrlArg.split('=')[1] : 'http://localhost:3000';
const SCHEMA_VERSION = '3.46.0'; // Match target BIG-IP AS3 version

interface AppResult {
    configFile: string;
    appName: string;
    appType: string;
    protocol: string;
    conversionSuccess: boolean;
    conversionError?: string;
    conversionWarnings?: string[];
    schemaValid?: boolean;
    schemaErrors?: string[];
    dryRunSuccess?: boolean;
    dryRunErrors?: string[];
    as3File?: string;
}

interface BatchReport {
    timestamp: string;
    schemaVersion: string;
    mcpUrl?: string;
    dryRunEnabled: boolean;
    summary: {
        totalConfigs: number;
        totalApps: number;
        conversionSucceeded: number;
        conversionFailed: number;
        schemaValid: number;
        schemaInvalid: number;
        dryRunPassed?: number;
        dryRunFailed?: number;
    };
    results: AppResult[];
    bulkResult?: {
        success: boolean;
        file?: string;
        error?: string;
    };
}

async function callMcp(tool: string, args: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${MCP_URL}/api/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, args }),
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'MCP call failed');
    }
    return data.result;
}

async function validateSchema(as3: any): Promise<{ valid: boolean; errors: string[] }> {
    try {
        const result = await callMcp('validate_as3', { declaration: as3 });
        return {
            valid: result.valid,
            errors: result.errors?.map((e: any) => e.message || String(e)) || [],
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`MCP error: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

async function dryRun(as3: any): Promise<{ success: boolean; errors: string[] }> {
    try {
        const result = await callMcp('dry_run_as3', { declaration: as3 });
        return {
            success: result.success,
            errors: result.errors?.map((e: any) => e.message || String(e)) || [],
        };
    } catch (error) {
        return {
            success: false,
            errors: [`MCP error: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

async function processConfig(configPath: string): Promise<AppResult[]> {
    const results: AppResult[] = [];
    const configFile = path.basename(configPath);

    console.log(`  Processing: ${configFile}`);

    try {
        const adc = new ADC();
        await adc.loadParseAsync(configPath);
        const explosion = await adc.explode();
        const apps = explosion.config?.apps || [];

        if (apps.length === 0) {
            console.log(`    No apps found in ${configFile}`);
            return results;
        }

        console.log(`    Found ${apps.length} apps`);

        for (const app of apps) {
            const result: AppResult = {
                configFile,
                appName: app.name,
                appType: app.type || 'unknown',
                protocol: app.protocol || 'unknown',
                conversionSuccess: false,
            };

            // Convert to AS3
            const conversion = buildAS3(app, { schemaVersion: SCHEMA_VERSION });
            result.conversionSuccess = conversion.success;

            if (!conversion.success) {
                result.conversionError = conversion.error;
                results.push(result);
                console.log(`    ❌ ${app.name}: Conversion failed - ${conversion.error}`);
                continue;
            }

            result.conversionWarnings = conversion.warnings;

            // Save AS3 output
            const safeName = app.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const as3FileName = `${path.basename(configFile, '.ns.conf')}_${safeName}.as3.json`;
            const as3FilePath = path.join(OUTPUT_DIR, as3FileName);
            fs.writeFileSync(as3FilePath, JSON.stringify(conversion.as3, null, 2));
            result.as3File = as3FileName;

            // Schema validation
            const schemaResult = await validateSchema(conversion.as3);
            result.schemaValid = schemaResult.valid;
            result.schemaErrors = schemaResult.errors;

            if (!schemaResult.valid) {
                console.log(`    ⚠️  ${app.name}: Schema invalid - ${schemaResult.errors.join(', ')}`);
            }

            // Dry-run (if enabled)
            if (doDryRun && schemaResult.valid) {
                const dryResult = await dryRun(conversion.as3);
                result.dryRunSuccess = dryResult.success;
                result.dryRunErrors = dryResult.errors;

                if (!dryResult.success) {
                    console.log(`    ⚠️  ${app.name}: Dry-run failed - ${dryResult.errors.join(', ')}`);
                } else {
                    console.log(`    ✅ ${app.name}: All checks passed`);
                }
            } else if (schemaResult.valid) {
                console.log(`    ✅ ${app.name}: Schema valid`);
            }

            results.push(result);
        }
    } catch (error) {
        console.log(`    ❌ Error processing ${configFile}: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
            configFile,
            appName: 'ERROR',
            appType: 'unknown',
            protocol: 'unknown',
            conversionSuccess: false,
            conversionError: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        });
    }

    return results;
}

async function main() {
    console.log('='.repeat(60));
    console.log('AS3 Batch Validation');
    console.log('='.repeat(60));
    console.log(`Schema Version: ${SCHEMA_VERSION}`);
    console.log(`MCP URL: ${MCP_URL}`);
    console.log(`Dry-run: ${doDryRun ? 'ENABLED' : 'DISABLED'}`);
    console.log('');

    // Ensure output directories exist
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    // Get all .ns.conf files
    const configFiles = fs.readdirSync(TEST_CONFIG_DIR)
        .filter(f => f.endsWith('.ns.conf'))
        .map(f => path.join(TEST_CONFIG_DIR, f))
        .sort();

    console.log(`Found ${configFiles.length} config files\n`);

    const allResults: AppResult[] = [];
    const allApps: any[] = [];

    // Process each config
    for (const configPath of configFiles) {
        const results = await processConfig(configPath);
        allResults.push(...results);

        // Collect apps for bulk conversion
        try {
            const adc = new ADC();
            await adc.loadParseAsync(configPath);
            const explosion = await adc.explode();
            const apps = explosion.config?.apps || [];
            allApps.push(...apps.filter(a => a.type !== 'gslb'));
        } catch (e) {
            // Already logged
        }
    }

    // Build summary
    const report: BatchReport = {
        timestamp: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        mcpUrl: MCP_URL,
        dryRunEnabled: doDryRun,
        summary: {
            totalConfigs: configFiles.length,
            totalApps: allResults.length,
            conversionSucceeded: allResults.filter(r => r.conversionSuccess).length,
            conversionFailed: allResults.filter(r => !r.conversionSuccess).length,
            schemaValid: allResults.filter(r => r.schemaValid === true).length,
            schemaInvalid: allResults.filter(r => r.schemaValid === false).length,
        },
        results: allResults,
    };

    if (doDryRun) {
        report.summary.dryRunPassed = allResults.filter(r => r.dryRunSuccess === true).length;
        report.summary.dryRunFailed = allResults.filter(r => r.dryRunSuccess === false).length;
    }

    // Bulk conversion
    console.log('\n' + '='.repeat(60));
    console.log('Bulk Conversion');
    console.log('='.repeat(60));

    if (allApps.length > 0) {
        const bulkResult = buildAS3Bulk(allApps, { schemaVersion: SCHEMA_VERSION });

        if (bulkResult.merged) {
            const bulkFile = '_bulk.as3.json';
            fs.writeFileSync(
                path.join(OUTPUT_DIR, bulkFile),
                JSON.stringify(bulkResult.merged, null, 2)
            );
            report.bulkResult = { success: true, file: bulkFile };
            console.log(`✅ Bulk AS3 saved: ${bulkFile}`);
            console.log(`   ${bulkResult.summary.succeeded}/${bulkResult.summary.total} apps merged`);
        } else {
            report.bulkResult = { success: false, error: 'No apps converted' };
            console.log('❌ Bulk conversion failed: no apps converted');
        }
    }

    // Save report
    const reportFile = `validation_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(
        path.join(REPORTS_DIR, reportFile),
        JSON.stringify(report, null, 2)
    );

    // Also save as "latest"
    fs.writeFileSync(
        path.join(REPORTS_DIR, 'latest.json'),
        JSON.stringify(report, null, 2)
    );

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total configs:      ${report.summary.totalConfigs}`);
    console.log(`Total apps:         ${report.summary.totalApps}`);
    console.log(`Conversion success: ${report.summary.conversionSucceeded}/${report.summary.totalApps}`);
    console.log(`Schema valid:       ${report.summary.schemaValid}/${report.summary.conversionSucceeded}`);
    if (doDryRun) {
        console.log(`Dry-run passed:     ${report.summary.dryRunPassed}/${report.summary.schemaValid}`);
    }
    console.log(`\nReport saved: ${reportFile}`);

    // List failures
    const failures = allResults.filter(r => !r.conversionSuccess || r.schemaValid === false || r.dryRunSuccess === false);
    if (failures.length > 0) {
        console.log('\n' + '-'.repeat(60));
        console.log('Failures:');
        for (const f of failures) {
            const errors = f.conversionError || f.schemaErrors?.join(', ') || f.dryRunErrors?.join(', ') || 'unknown';
            console.log(`  - ${f.configFile} / ${f.appName}: ${errors}`);
        }
    }
}

main().catch(console.error);
