/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import assert from 'assert';
import {
    analyzeCoverage,
    summarizeCoverage,
    formatCoverageReport,
    CoverageResult,
} from '../src/as3/coverage';
import { AdcApp } from '../src/models';

describe('AS3 Coverage Analysis Tests', function () {

    before(async function () {
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    // ========================================================================
    // Test Fixtures
    // ========================================================================

    const wellMappedApp: AdcApp = {
        name: 'well_mapped',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.100',
        port: '80',
        opts: {
            '-lbMethod': 'ROUNDROBIN',
            '-persistenceType': 'SOURCEIP',
            '-cltTimeout': '180',
            '-state': 'ENABLED',
        },
    };

    const partiallyMappedApp: AdcApp = {
        name: 'partial_mapped',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.101',
        port: '80',
        opts: {
            '-lbMethod': 'ROUNDROBIN',
            '-persistenceType': 'SOURCEIP',
            '-cltTimeout': '180',
            // Unmapped options
            '-dbProfileName': 'custom_db',
            '-pushVserver': 'push_vs',
            '-dnsProfileName': 'dns_prof',
        },
    };

    const poorlyMappedApp: AdcApp = {
        name: 'poorly_mapped',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.102',
        port: '80',
        opts: {
            // Mostly unmapped options
            '-dbProfileName': 'custom_db',
            '-pushVserver': 'push_vs',
            '-dnsProfileName': 'dns_prof',
            '-customOption1': 'value1',
            '-customOption2': 'value2',
        },
    };

    const ignorableOnlyApp: AdcApp = {
        name: 'ignorable_only',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.103',
        port: '80',
        opts: {
            '-devno': '123',
            '-state': 'ENABLED',
            '-sc': 'ON',
            '-sp': 'ON',
            '-td': '0',
            '-soMethod': 'CONNECTION',
            '-appflowLog': 'DISABLED',
        },
    };

    // ========================================================================
    // analyzeCoverage Tests
    // ========================================================================

    describe('analyzeCoverage', function () {

        it('returns app name', () => {
            const result = analyzeCoverage(wellMappedApp);
            assert.strictEqual(result.app, 'well_mapped');
        });

        it('calculates percentage for well-mapped app', () => {
            const result = analyzeCoverage(wellMappedApp);
            // -lbMethod, -persistenceType, -cltTimeout are mapped
            // -state is ignorable (not counted in percentage)
            assert.ok(result.percentage >= 80, `Expected high coverage, got ${result.percentage}%`);
        });

        it('classifies high coverage as high confidence', () => {
            const result = analyzeCoverage(wellMappedApp);
            assert.strictEqual(result.confidence, 'high');
        });

        it('calculates lower percentage for partially-mapped app', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            assert.ok(result.percentage < 80 && result.percentage >= 50, 
                `Expected medium coverage, got ${result.percentage}%`);
        });

        it('classifies medium coverage as medium confidence', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            assert.strictEqual(result.confidence, 'medium');
        });

        it('calculates low percentage for poorly-mapped app', () => {
            const result = analyzeCoverage(poorlyMappedApp);
            assert.ok(result.percentage < 50, `Expected low coverage, got ${result.percentage}%`);
        });

        it('classifies low coverage as low confidence', () => {
            const result = analyzeCoverage(poorlyMappedApp);
            assert.strictEqual(result.confidence, 'low');
        });

        it('returns 100% for app with only ignorable params', () => {
            const result = analyzeCoverage(ignorableOnlyApp);
            // All params are ignorable, so nothing to map
            assert.strictEqual(result.percentage, 100);
        });

        it('populates mapped array', () => {
            const result = analyzeCoverage(wellMappedApp);
            assert.ok(result.mapped.length > 0, 'Should have mapped params');
        });

        it('mapped params have required fields', () => {
            const result = analyzeCoverage(wellMappedApp);
            const mapped = result.mapped[0];
            assert.ok(mapped.nsParam, 'Should have nsParam');
            assert.ok(mapped.nsValue !== undefined, 'Should have nsValue');
            assert.ok(mapped.as3Path, 'Should have as3Path');
        });

        it('populates unmapped array for partial app', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            assert.ok(result.unmapped.length > 0, 'Should have unmapped params');
        });

        it('unmapped params have required fields', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            const unmapped = result.unmapped[0];
            assert.ok(unmapped.nsParam, 'Should have nsParam');
            assert.ok(unmapped.nsValue !== undefined, 'Should have nsValue');
            assert.ok(unmapped.reason, 'Should have reason');
        });

        it('includes suggestions for known unmapped params', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            // -dbProfileName should have a suggestion
            const dbProfile = result.unmapped.find(u => u.nsParam === '-dbProfileName');
            assert.ok(dbProfile?.suggestion, 'Should have suggestion for dbProfileName');
        });

        it('populates ignored array', () => {
            const result = analyzeCoverage(ignorableOnlyApp);
            assert.ok(result.ignored.length > 0, 'Should have ignored params');
        });

        it('ignored params have required fields', () => {
            const result = analyzeCoverage(ignorableOnlyApp);
            const ignored = result.ignored[0];
            assert.ok(ignored.nsParam, 'Should have nsParam');
            assert.ok(ignored.nsValue !== undefined, 'Should have nsValue');
            assert.ok(ignored.reason, 'Should have reason');
        });

        it('correctly categorizes -state as ignored', () => {
            const result = analyzeCoverage(wellMappedApp);
            const stateParam = result.ignored.find(i => i.nsParam === '-state');
            assert.ok(stateParam, '-state should be in ignored');
        });

        it('correctly categorizes -lbMethod as mapped', () => {
            const result = analyzeCoverage(wellMappedApp);
            const lbMethod = result.mapped.find(m => m.nsParam === '-lbMethod');
            assert.ok(lbMethod, '-lbMethod should be in mapped');
        });

        it('handles app with no opts', () => {
            const noOptsApp: AdcApp = {
                name: 'no_opts',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
            };
            const result = analyzeCoverage(noOptsApp);
            assert.strictEqual(result.percentage, 100);
            assert.strictEqual(result.mapped.length, 0);
            assert.strictEqual(result.unmapped.length, 0);
        });

        it('handles app with empty opts', () => {
            const emptyOptsApp: AdcApp = {
                name: 'empty_opts',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = analyzeCoverage(emptyOptsApp);
            assert.strictEqual(result.percentage, 100);
        });
    });

    // ========================================================================
    // summarizeCoverage Tests
    // ========================================================================

    describe('summarizeCoverage', function () {

        it('calculates average coverage', () => {
            const results: CoverageResult[] = [
                analyzeCoverage(wellMappedApp),
                analyzeCoverage(partiallyMappedApp),
            ];
            const summary = summarizeCoverage(results);
            assert.ok(typeof summary.averageCoverage === 'number');
            assert.ok(summary.averageCoverage >= 0 && summary.averageCoverage <= 100);
        });

        it('counts by confidence level', () => {
            const results: CoverageResult[] = [
                analyzeCoverage(wellMappedApp),      // high
                analyzeCoverage(partiallyMappedApp), // medium
                analyzeCoverage(poorlyMappedApp),    // low
            ];
            const summary = summarizeCoverage(results);
            assert.strictEqual(summary.byConfidence.high, 1);
            assert.strictEqual(summary.byConfidence.medium, 1);
            assert.strictEqual(summary.byConfidence.low, 1);
        });

        it('identifies top unmapped parameters', () => {
            const results: CoverageResult[] = [
                analyzeCoverage(partiallyMappedApp),
                analyzeCoverage(poorlyMappedApp),
            ];
            const summary = summarizeCoverage(results);
            assert.ok(summary.topUnmapped.length > 0, 'Should have top unmapped');
        });

        it('sorts topUnmapped by count descending', () => {
            const results: CoverageResult[] = [
                analyzeCoverage(partiallyMappedApp),
                analyzeCoverage(poorlyMappedApp),
            ];
            const summary = summarizeCoverage(results);
            
            for (let i = 0; i < summary.topUnmapped.length - 1; i++) {
                assert.ok(
                    summary.topUnmapped[i].count >= summary.topUnmapped[i + 1].count,
                    'Should be sorted by count descending'
                );
            }
        });

        it('limits topUnmapped to 10 items', () => {
            // Create many apps with many unmapped params
            const manyUnmappedApp: AdcApp = {
                name: 'many_unmapped',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {
                    '-custom1': 'v1',
                    '-custom2': 'v2',
                    '-custom3': 'v3',
                    '-custom4': 'v4',
                    '-custom5': 'v5',
                    '-custom6': 'v6',
                    '-custom7': 'v7',
                    '-custom8': 'v8',
                    '-custom9': 'v9',
                    '-custom10': 'v10',
                    '-custom11': 'v11',
                    '-custom12': 'v12',
                },
            };
            const results = [analyzeCoverage(manyUnmappedApp)];
            const summary = summarizeCoverage(results);
            assert.ok(summary.topUnmapped.length <= 10);
        });

        it('handles empty results array', () => {
            const summary = summarizeCoverage([]);
            assert.strictEqual(summary.averageCoverage, 100);
            assert.strictEqual(summary.byConfidence.high, 0);
            assert.strictEqual(summary.byConfidence.medium, 0);
            assert.strictEqual(summary.byConfidence.low, 0);
            assert.strictEqual(summary.topUnmapped.length, 0);
        });

        it('handles single result', () => {
            const results = [analyzeCoverage(wellMappedApp)];
            const summary = summarizeCoverage(results);
            assert.ok(typeof summary.averageCoverage === 'number');
        });
    });

    // ========================================================================
    // formatCoverageReport Tests
    // ========================================================================

    describe('formatCoverageReport', function () {

        it('returns a string', () => {
            const result = analyzeCoverage(wellMappedApp);
            const report = formatCoverageReport(result);
            assert.strictEqual(typeof report, 'string');
        });

        it('includes app name', () => {
            const result = analyzeCoverage(wellMappedApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('well_mapped'));
        });

        it('includes coverage percentage', () => {
            const result = analyzeCoverage(wellMappedApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('%'));
        });

        it('includes confidence level', () => {
            const result = analyzeCoverage(wellMappedApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('high') || report.includes('medium') || report.includes('low'));
        });

        it('lists mapped parameters', () => {
            const result = analyzeCoverage(wellMappedApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('Mapped Parameters'));
            assert.ok(report.includes('-lbMethod'));
        });

        it('lists unmapped parameters when present', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('Unmapped Parameters'));
        });

        it('lists ignored parameters when present', () => {
            const result = analyzeCoverage(ignorableOnlyApp);
            const report = formatCoverageReport(result);
            assert.ok(report.includes('Ignored Parameters'));
        });

        it('includes suggestions for unmapped params', () => {
            const result = analyzeCoverage(partiallyMappedApp);
            const report = formatCoverageReport(result);
            // Should have at least one suggestion arrow
            assert.ok(report.includes('→'));
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================

    describe('Edge Cases', function () {

        it('handles params without dash prefix in opts', () => {
            const noDashApp: AdcApp = {
                name: 'no_dash',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {
                    'noDash': 'value',       // No dash - should be skipped
                    '-lbMethod': 'ROUNDROBIN', // Normal
                },
            };
            const result = analyzeCoverage(noDashApp);
            // Should only process -lbMethod
            assert.strictEqual(result.mapped.length, 1);
        });

        it('handles undefined values in opts', () => {
            const undefinedApp: AdcApp = {
                name: 'undefined_val',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {
                    '-lbMethod': undefined as any,
                },
            };
            // Should not throw
            assert.doesNotThrow(() => analyzeCoverage(undefinedApp));
        });

        it('handles numeric values in opts', () => {
            const numericApp: AdcApp = {
                name: 'numeric_val',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {
                    '-cltTimeout': 180,
                },
            };
            const result = analyzeCoverage(numericApp);
            const timeout = result.mapped.find(m => m.nsParam === '-cltTimeout');
            assert.ok(timeout);
            assert.strictEqual(timeout.nsValue, '180');
        });
    });
});
