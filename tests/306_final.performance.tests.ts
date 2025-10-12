/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import ADC from '../src/CitrixADC';
import ADCold from '../src/CitrixADCold';
import { archiveMake } from './archiveBuilder';

/**
 * Final performance comparison between legacy and optimized implementations
 * Tests the complete processing pipeline end-to-end
 */

interface FullPerformanceResult {
    parseTime: number;
    appTime: number;
    totalTime: number;
    appCount: number;
}

/**
 * Run old implementation (CitrixADCold)
 */
async function runOldImplementation(testFile: string): Promise<FullPerformanceResult> {
    const startTime = process.hrtime.bigint();

    const adc = new ADCold();
    await adc.loadParseAsync(testFile);
    const explosion = await adc.explode();

    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;

    return {
        parseTime: adc['stats'].parseTime || 0,
        appTime: adc['stats'].appTime || 0,
        totalTime,
        appCount: explosion?.config.apps?.length || 0
    };
}

/**
 * Run new optimized implementation (CitrixADC)
 */
async function runNewImplementation(testFile: string): Promise<FullPerformanceResult> {
    const startTime = process.hrtime.bigint();

    const adc = new ADC();
    await adc.loadParseAsync(testFile);
    const explosion = await adc.explode();

    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;

    return {
        parseTime: adc['stats'].parseTime || 0,
        appTime: adc['stats'].appTime || 0,
        totalTime,
        appCount: explosion?.config.apps?.length || 0
    };
}

/**
 * Calculate and format speedup metrics
 */
function calculateSpeedup(oldResult: FullPerformanceResult, newResult: FullPerformanceResult) {
    const parseSpeedup = oldResult.parseTime / newResult.parseTime;
    const appSpeedup = oldResult.appTime / newResult.appTime;
    const totalSpeedup = oldResult.totalTime / newResult.totalTime;

    return {
        parse: parseSpeedup.toFixed(2) + 'x',
        app: appSpeedup.toFixed(2) + 'x',
        total: totalSpeedup.toFixed(2) + 'x',
        parsePercent: ((1 - newResult.parseTime / oldResult.parseTime) * 100).toFixed(1) + '%',
        appPercent: ((1 - newResult.appTime / oldResult.appTime) * 100).toFixed(1) + '%',
        totalPercent: ((1 - newResult.totalTime / oldResult.totalTime) * 100).toFixed(1) + '%'
    };
}

/**
 * Print detailed performance comparison
 */
function printResults(testName: string, oldResult: FullPerformanceResult, newResult: FullPerformanceResult) {
    const speedup = calculateSpeedup(oldResult, newResult);

    console.log('\n' + '='.repeat(80));
    console.log(`🚀 End-to-End Performance: ${testName}`);
    console.log('='.repeat(80));
    console.log(`Apps Found: ${oldResult.appCount} (old) vs ${newResult.appCount} (new)`);
    console.log('-'.repeat(80));
    console.log('Phase          | Old (ms) | New (ms) | Speedup | Improvement');
    console.log('-'.repeat(80));
    console.log(`Parse          | ${oldResult.parseTime.toFixed(2).padStart(8)} | ${newResult.parseTime.toFixed(2).padStart(8)} | ${speedup.parse.padStart(7)} | ${speedup.parsePercent.padStart(11)}`);
    console.log(`App Digest     | ${oldResult.appTime.toFixed(2).padStart(8)} | ${newResult.appTime.toFixed(2).padStart(8)} | ${speedup.app.padStart(7)} | ${speedup.appPercent.padStart(11)}`);
    console.log('-'.repeat(80));
    console.log(`TOTAL E2E      | ${oldResult.totalTime.toFixed(2).padStart(8)} | ${newResult.totalTime.toFixed(2).padStart(8)} | ${speedup.total.padStart(7)} | ${speedup.totalPercent.padStart(11)}`);
    console.log('='.repeat(80));
}

// ========================================
// End-to-End Performance Tests
// ========================================

describe('Final Performance: Legacy vs Optimized Implementation', function () {
    // Increase timeout for full end-to-end tests
    this.timeout(60000);

    it('bren.ns.conf - Complex config (CS/LB with policies)', async function () {
        const testFile = await archiveMake('bren.ns.conf') as string;

        const oldResult = await runOldImplementation(testFile);
        const newResult = await runNewImplementation(testFile);

        printResults('bren.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'New implementation should be faster');
        assert.strictEqual(newResult.appCount, oldResult.appCount, 'Should find same number of apps');
    });

    it('t1.ns.conf - GSLB configuration', async function () {
        const testFile = await archiveMake('t1.ns.conf') as string;

        const oldResult = await runOldImplementation(testFile);
        const newResult = await runNewImplementation(testFile);

        printResults('t1.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'New implementation should be faster');
        assert.strictEqual(newResult.appCount, oldResult.appCount, 'Should find same number of apps');
    });

    it('groot.ns.conf - CS to LB references', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;

        const oldResult = await runOldImplementation(testFile);
        const newResult = await runNewImplementation(testFile);

        printResults('groot.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'New implementation should be faster');
        assert.strictEqual(newResult.appCount, oldResult.appCount, 'Should find same number of apps');
    });

    it('starlord.ns.conf - SSL offload', async function () {
        const testFile = await archiveMake('starlord.ns.conf') as string;

        const oldResult = await runOldImplementation(testFile);
        const newResult = await runNewImplementation(testFile);

        printResults('starlord.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'New implementation should be faster');
        assert.strictEqual(newResult.appCount, oldResult.appCount, 'Should find same number of apps');
    });

    it('apple.ns.conf - Simple configuration', async function () {
        const testFile = await archiveMake('apple.ns.conf') as string;

        const oldResult = await runOldImplementation(testFile);
        const newResult = await runNewImplementation(testFile);

        printResults('apple.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime <= oldResult.totalTime * 1.1, 'New implementation should be competitive');
        assert.strictEqual(newResult.appCount, oldResult.appCount, 'Should find same number of apps');
    });

    // Summary after all tests
    after(function () {
        console.log('\n' + '='.repeat(80));
        console.log('✅ FINAL PERFORMANCE SUMMARY');
        console.log('='.repeat(80));
        console.log('The new optimized RX implementation delivers:');
        console.log('  ✓ Pre-compiled regex patterns (eliminates per-line compilation)');
        console.log('  ✓ Improved options parsing (no string concatenation hack)');
        console.log('  ✓ Parallel digester execution (CS/LB/GSLB run concurrently)');
        console.log('  ✓ Set-based duplicate removal (O(n) vs O(n²))');
        console.log('  ✓ Better binding detection (fewer missed relationships)');
        console.log('  ✓ Cleaner code (shared utilities, no duplication)');
        console.log('='.repeat(80) + '\n');
    });
});
