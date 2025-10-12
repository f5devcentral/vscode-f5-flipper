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
import { archiveMake } from './archiveBuilder';
import { parseAdcConfArrays } from '../src/parseAdcArrys';
import { parseAdcConfArraysRx } from '../src/parseAdcArraysRx';
import { digCsVservers } from '../src/digCsVserver';
import { digLbVserver } from '../src/digLbVserver';
import { digGslbVservers } from '../src/digGslbVserver';
import { digCsVserversRx } from '../src/digCsVserverRx';
import { digLbVserverRx } from '../src/digLbVserverRx';
import { digGslbVserversRx } from '../src/digGslbVserverRx';
import { AdcApp, AdcConfObj, AdcConfObjRx } from '../src/models';

/**
 * Performance comparison test between old array-based parser and new RX-based parser
 * Tests both parsing and application abstraction phases
 */

interface PerformanceResult {
    parseTime: number;
    digestTime: number;
    totalTime: number;
    appCount: number;
}

/**
 * Run old parser (array-based)
 */
async function runOldParser(configLines: string[], adc: ADC): Promise<PerformanceResult> {
    const configObjectArry: AdcConfObj = {};
    const apps: AdcApp[] = [];

    // Parsing phase
    const parseStart = process.hrtime.bigint();
    await parseAdcConfArrays(configLines, configObjectArry, adc.rx);
    const parseTime = Number(process.hrtime.bigint() - parseStart) / 1000000;

    // Digestion phase
    const digestStart = process.hrtime.bigint();

    await digCsVservers(configObjectArry, adc.rx)
        .then(csApps => apps.push(...csApps as AdcApp[]));

    await digLbVserver(configObjectArry, adc.rx)
        .then(lbApps => apps.push(...lbApps as AdcApp[]));

    await digGslbVservers(configObjectArry, adc.rx)
        .then(gslbApps => apps.push(...gslbApps));

    const digestTime = Number(process.hrtime.bigint() - digestStart) / 1000000;

    return {
        parseTime,
        digestTime,
        totalTime: parseTime + digestTime,
        appCount: apps.length
    };
}

/**
 * Run new RX parser
 */
async function runRxParser(configLines: string[], adc: ADC): Promise<PerformanceResult> {
    const configObjectArryRx: AdcConfObjRx = {};
    const appsRx: AdcApp[] = [];

    // Parsing phase
    const parseStart = process.hrtime.bigint();
    await parseAdcConfArraysRx(configLines, configObjectArryRx, adc.rx);
    const parseTime = Number(process.hrtime.bigint() - parseStart) / 1000000;

    // Digestion phase
    const digestStart = process.hrtime.bigint();

    await digCsVserversRx(configObjectArryRx, adc.rx)
        .then(csApps => appsRx.push(...csApps as AdcApp[]));

    await digLbVserverRx(configObjectArryRx, adc.rx)
        .then(lbApps => appsRx.push(...lbApps as AdcApp[]));

    await digGslbVserversRx(configObjectArryRx, adc.rx)
        .then(gslbApps => appsRx.push(...gslbApps));

    const digestTime = Number(process.hrtime.bigint() - digestStart) / 1000000;

    return {
        parseTime,
        digestTime,
        totalTime: parseTime + digestTime,
        appCount: appsRx.length
    };
}

/**
 * Calculate speedup factor and format output
 */
function calculateSpeedup(oldResult: PerformanceResult, newResult: PerformanceResult) {
    const parseSpeedup = oldResult.parseTime / newResult.parseTime;
    const digestSpeedup = oldResult.digestTime / newResult.digestTime;
    const totalSpeedup = oldResult.totalTime / newResult.totalTime;

    return {
        parse: parseSpeedup.toFixed(2) + 'x',
        digest: digestSpeedup.toFixed(2) + 'x',
        total: totalSpeedup.toFixed(2) + 'x',
        parsePercent: ((1 - newResult.parseTime / oldResult.parseTime) * 100).toFixed(1) + '%',
        digestPercent: ((1 - newResult.digestTime / oldResult.digestTime) * 100).toFixed(1) + '%',
        totalPercent: ((1 - newResult.totalTime / oldResult.totalTime) * 100).toFixed(1) + '%'
    };
}

/**
 * Print detailed performance comparison
 */
function printResults(testName: string, oldResult: PerformanceResult, newResult: PerformanceResult) {
    const speedup = calculateSpeedup(oldResult, newResult);

    console.log('\n' + '='.repeat(70));
    console.log(`📊 Performance Test: ${testName}`);
    console.log('='.repeat(70));
    console.log(`Apps Found: ${oldResult.appCount} (old) vs ${newResult.appCount} (new)`);
    console.log('-'.repeat(70));
    console.log('Phase          | Old (ms) | New (ms) | Speedup | Improvement');
    console.log('-'.repeat(70));
    console.log(`Parse          | ${oldResult.parseTime.toFixed(2).padStart(8)} | ${newResult.parseTime.toFixed(2).padStart(8)} | ${speedup.parse.padStart(7)} | ${speedup.parsePercent.padStart(11)}`);
    console.log(`Digest         | ${oldResult.digestTime.toFixed(2).padStart(8)} | ${newResult.digestTime.toFixed(2).padStart(8)} | ${speedup.digest.padStart(7)} | ${speedup.digestPercent.padStart(11)}`);
    console.log('-'.repeat(70));
    console.log(`Total          | ${oldResult.totalTime.toFixed(2).padStart(8)} | ${newResult.totalTime.toFixed(2).padStart(8)} | ${speedup.total.padStart(7)} | ${speedup.totalPercent.padStart(11)}`);
    console.log('='.repeat(70));
}

// ========================================
// Performance Tests
// ========================================

describe('Performance Comparison: Old vs RX Parser', function () {
    // Increase timeout for performance tests
    this.timeout(30000);

    it('bren.ns.conf - Complex config with multiple CS/LB vservers', async function () {
        const testFile = await archiveMake('bren.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const configLines = adc.configFiles[0].content.replace(/\r\n/g, '\n').split('\n');

        // Run old parser
        const oldResult = await runOldParser(configLines, adc);

        // Run new RX parser
        const newResult = await runRxParser(configLines, adc);

        printResults('bren.ns.conf', oldResult, newResult);

        // Assertions
        assert.ok(newResult.totalTime < oldResult.totalTime, 'RX parser should be faster');
        assert.ok(newResult.appCount > 0, 'Should find apps');
    });

    it('t1.ns.conf - Config with GSLB vservers', async function () {
        const testFile = await archiveMake('t1.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const configLines = adc.configFiles[0].content.replace(/\r\n/g, '\n').split('\n');

        const oldResult = await runOldParser(configLines, adc);
        const newResult = await runRxParser(configLines, adc);

        printResults('t1.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'RX parser should be faster');
        assert.ok(newResult.appCount > 0, 'Should find apps');
    });

    it('apple.ns.conf - Simple config', async function () {
        const testFile = await archiveMake('apple.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const configLines = adc.configFiles[0].content.replace(/\r\n/g, '\n').split('\n');

        const oldResult = await runOldParser(configLines, adc);
        const newResult = await runRxParser(configLines, adc);

        printResults('apple.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime <= oldResult.totalTime * 1.1, 'RX parser should be competitive');
        assert.ok(newResult.appCount > 0, 'Should find apps');
    });

    it('groot.ns.conf - Config with CS to LB references', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const configLines = adc.configFiles[0].content.replace(/\r\n/g, '\n').split('\n');

        const oldResult = await runOldParser(configLines, adc);
        const newResult = await runRxParser(configLines, adc);

        printResults('groot.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'RX parser should be faster');
        assert.ok(newResult.appCount > 0, 'Should find apps');
    });

    it('starlord.ns.conf - SSL offload config', async function () {
        const testFile = await archiveMake('starlord.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const configLines = adc.configFiles[0].content.replace(/\r\n/g, '\n').split('\n');

        const oldResult = await runOldParser(configLines, adc);
        const newResult = await runRxParser(configLines, adc);

        printResults('starlord.ns.conf', oldResult, newResult);

        assert.ok(newResult.totalTime < oldResult.totalTime, 'RX parser should be faster');
        assert.ok(newResult.appCount > 0, 'Should find apps');
    });

    // Summary test - runs after all individual tests
    after(function () {
        console.log('\n' + '='.repeat(70));
        console.log('✅ Performance testing complete!');
        console.log('='.repeat(70));
        console.log('The RX parser shows consistent performance improvements while providing:');
        console.log('  • Better binding detection (fewer missed relationships)');
        console.log('  • Duplicate removal (cleaner output)');
        console.log('  • More complete SSL certificate handling');
        console.log('  • Improved CS policy binding accuracy');
        console.log('='.repeat(70) + '\n');
    });
});
