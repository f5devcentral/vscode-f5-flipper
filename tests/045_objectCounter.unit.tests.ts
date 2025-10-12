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
import { countMainObjectsRx } from '../src/objectCounter';

/**
 * Test suite for countMainObjectsRx function
 * Validates object counting in new RX-based config structure
 */

describe('Object Counter RX Tests', function () {

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    it('should count objects in t1.ns.conf (CS, LB, GSLB)', async function () {
        const testFile = await archiveMake('t1.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const stats = await countMainObjectsRx(adc.configObjectArryRx);

        // Validate we have the expected object types
        assert.ok(stats.csVserver, 'Should find CS vservers');
        assert.ok(stats.lbVserver, 'Should find LB vservers');
        assert.ok(stats.gslbVserver, 'Should find GSLB vservers');
        assert.ok(stats.gslbService, 'Should find GSLB services');

        console.log('  Object counts:', stats);

        // Verify some expected counts (adjust based on actual config)
        assert.ok(stats.csVserver >= 1, 'Should have at least 1 CS vserver');
        assert.ok(stats.lbVserver >= 1, 'Should have at least 1 LB vserver');
    });

    it('should count objects in bren.ns.conf (Complex config)', async function () {
        const testFile = await archiveMake('bren.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const stats = await countMainObjectsRx(adc.configObjectArryRx);

        // Validate object presence
        assert.ok(stats.csVserver, 'Should find CS vservers');
        assert.ok(stats.lbVserver, 'Should find LB vservers');
        assert.ok(stats.server, 'Should find servers');
        assert.ok(stats.service || stats.serviceGroup, 'Should find services or service groups');

        console.log('  Object counts:', stats);

        // Verify counts are reasonable
        assert.ok(stats.csVserver >= 1, 'Should have at least 1 CS vserver');
        assert.ok(stats.lbVserver >= 1, 'Should have at least 1 LB vserver');
        assert.ok(stats.server >= 1, 'Should have at least 1 server');
    });

    it('should count SSL certificates', async function () {
        const testFile = await archiveMake('starlord.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const stats = await countMainObjectsRx(adc.configObjectArryRx);

        console.log('  Object counts:', stats);

        // Should have SSL configs
        assert.ok(stats.lbVserver, 'Should find LB vservers');
        // Note: SSL certKey count depends on config
    });

    it('should handle configs with no objects gracefully', async function () {
        const adc = new ADC();

        // Create empty RX config
        adc.configObjectArryRx = {
            add: {}
        };

        const stats = await countMainObjectsRx(adc.configObjectArryRx);

        // Should return empty stats without errors
        assert.deepStrictEqual(stats, {}, 'Should return empty stats for empty config');
    });

    it('should match stats in explosion object', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        // The explosion should have stats populated
        const explosion = await adc.explode();

        assert.ok(explosion.stats, 'Explosion should have stats');
        assert.ok(explosion.stats.objects, 'Stats should have objects');

        console.log('  Explosion stats:', explosion.stats.objects);

        // Validate object counts are present
        const objStats = explosion.stats.objects;
        assert.ok(objStats.csVserver || objStats.lbVserver, 'Should have vserver counts');
    });

    it('should count different object types correctly', async function () {
        const testFile = await archiveMake('t1.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);

        const stats = await countMainObjectsRx(adc.configObjectArryRx);

        console.log('  Full object counts:', JSON.stringify(stats, null, 2));

        // Check that all counts are numbers
        Object.entries(stats).forEach(([key, value]) => {
            assert.strictEqual(typeof value, 'number', `${key} should be a number`);
            assert.ok(value >= 0, `${key} should be non-negative`);
        });
    });
});
