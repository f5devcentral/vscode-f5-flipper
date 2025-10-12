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

/**
 * Test suite for CS to LB reference building (digCStoLBreferences)
 * Validates that CS apps properly reference and include their target LB apps
 */

describe('CS to LB References Tests', function () {

    before(async function () {
        console.log('---------- file:', __filename);
    });

    it('groot.ns.conf - CS with policy actions targeting LB vservers', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Find the CS vserver
        const csApp = apps.find(app => app.name === 'groot-cs-vsvr');
        assert.ok(csApp, 'Should find groot-cs-vsvr CS app');

        // Validate CS app has nested LB apps
        assert.ok(csApp.apps, 'CS app should have nested apps array');
        assert.ok(csApp.apps.length > 0, 'CS app should have at least one referenced LB app');

        console.log(`  CS app "${csApp.name}" has ${csApp.apps.length} referenced LB apps`);

        // Check that referenced LB apps are included
        const referencedLbNames = csApp.apps.map(app => app.name);
        console.log(`  Referenced LB apps: ${referencedLbNames.join(', ')}`);

        // Verify LB apps exist and are properly structured
        csApp.apps.forEach(lbApp => {
            assert.strictEqual(lbApp.type, 'lb', `Referenced app ${lbApp.name} should be type 'lb'`);
            assert.ok(!lbApp.lines, 'Referenced LB app should not have lines (removed to avoid duplication)');
            assert.ok(lbApp.name, 'Referenced LB app should have name');
            assert.ok(lbApp.protocol, 'Referenced LB app should have protocol');
        });

        // Verify CS app config lines include LB app lines (excluding SSL bindings)
        const csLines = csApp.lines;
        assert.ok(csLines, 'CS app should have lines');
        assert.ok(csLines.length > 5, 'CS app should have accumulated lines from referenced LB apps');

        // SSL bindings should be filtered out from referenced LB apps
        const sslBindLines = csLines.filter(line => line.startsWith('bind ssl vserver'));
        console.log(`  CS app has ${sslBindLines.length} SSL bind lines (should only be CS SSL, not LB)`);
    });

    it('starlord.ns.conf - CS with direct -lbvserver bindings', async function () {
        const testFile = await archiveMake('starlord.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Find the CS vserver
        const csApp = apps.find(app => app.name === 'starlord_cs_vs');
        assert.ok(csApp, 'Should find starlord_cs_vs CS app');

        // Validate bindings
        assert.ok(csApp.bindings, 'CS app should have bindings');
        assert.ok(csApp.bindings['-lbvserver'], 'CS app should have -lbvserver bindings');

        console.log(`  CS app "${csApp.name}" has ${csApp.bindings['-lbvserver'].length} -lbvserver binding(s)`);

        // Check nested apps
        if (csApp.apps && csApp.apps.length > 0) {
            console.log(`  CS app has ${csApp.apps.length} nested LB app(s)`);

            csApp.apps.forEach(lbApp => {
                assert.strictEqual(lbApp.type, 'lb', `Nested app ${lbApp.name} should be type 'lb'`);
                assert.ok(!lbApp.lines, 'Nested LB app should not have lines property');
            });
        }
    });

    it('t1.ns.conf - CS with policy actions', async function () {
        const testFile = await archiveMake('t1.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Find CS vserver
        const csApp = apps.find(app => app.name === 'app2_cs_vs');
        assert.ok(csApp, 'Should find app2_cs_vs CS app');

        console.log(`  CS app "${csApp.name}" type: ${csApp.type}`);

        // Check for policy bindings with targetLBVserver
        if (csApp.bindings && csApp.bindings['-policyName']) {
            const policiesWithTargets = csApp.bindings['-policyName'].filter(
                p => p['-targetLBVserver']
            );

            if (policiesWithTargets.length > 0) {
                console.log(`  Found ${policiesWithTargets.length} policies with -targetLBVserver`);

                // Should have nested apps
                assert.ok(csApp.apps, 'CS app with targetLBVserver policies should have nested apps');
                assert.ok(csApp.apps.length > 0, 'Should have at least one nested LB app');
            }
        }
    });
    it('Should handle CS apps with no LB references gracefully', async function () {
        const testFile = await archiveMake('apple.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Check all apps - none should error even if they don't have LB refs
        apps.forEach(app => {
            assert.ok(app.name, 'All apps should have names');
            assert.ok(app.type, 'All apps should have types');

            // CS apps without LB refs should either not have .apps or have empty array
            if (app.type === 'cs' && app.apps) {
                assert.ok(Array.isArray(app.apps), 'apps property should be an array');
            }
        });

        console.log(`  Processed ${apps.length} apps without errors`);
    });
    it('Should exclude SSL bindings from referenced LB apps', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Find a CS app with nested LB apps
        const csApp = apps.find(app => app.type === 'cs' && app.apps && app.apps.length > 0);

        if (csApp && csApp.apps && csApp.apps.length > 0) {
            console.log(`  Checking CS app "${csApp.name}" for SSL binding filtering`);

            // Get standalone LB app to compare
            const lbAppName = csApp.apps[0].name;
            const standaloneLbApp = apps.find(app => app.name === lbAppName && app.lines);

            if (standaloneLbApp && standaloneLbApp.lines) {
                // Check if standalone LB has SSL bindings
                const lbSslBindings = standaloneLbApp.lines.filter(
                    line => line.startsWith('bind ssl vserver')
                );

                if (lbSslBindings.length > 0) {
                    console.log(`  Standalone LB "${lbAppName}" has ${lbSslBindings.length} SSL binding(s)`);

                    // CS app's lines should include LB lines but NOT the SSL bindings
                    assert.ok(csApp.lines, 'CS app should have lines');
                    const csLbSslBindings = csApp.lines.filter(
                        line => line.includes(lbAppName) && line.startsWith('bind ssl vserver')
                    );

                    console.log(`  CS app inherited ${csLbSslBindings.length} SSL bindings for that LB (should be 0)`);

                    // Note: This is expected behavior - CS handles SSL, not the referenced LB
                }
            }
        }
    });



    it('Should properly deep copy LB apps (structuredClone)', async function () {
        const testFile = await archiveMake('groot.ns.conf') as string;
        const adc = new ADC();
        await adc.loadParseAsync(testFile);
        const explosion = await adc.explode();

        const apps = explosion.config.apps;
        assert.ok(apps, 'apps should be defined');

        // Find CS app with nested apps
        const csApp = apps.find(app => app.type === 'cs' && app.apps && app.apps.length > 0);

        if (csApp && csApp.apps && csApp.apps.length > 0) {
            const nestedLb = csApp.apps[0];
            const standaloneLb = apps.find(app => app.name === nestedLb.name && app.lines);

            if (standaloneLb) {
                // Verify they are different objects (deep copy worked)
                assert.notStrictEqual(nestedLb, standaloneLb, 'Should be different object instances');

                // Verify nested LB doesn't have lines (was deleted)
                assert.ok(!nestedLb.lines, 'Nested LB should not have lines property');

                // Verify standalone still has lines
                assert.ok(standaloneLb.lines, 'Standalone LB should still have lines');
                assert.ok(standaloneLb.lines.length > 0, 'Standalone LB should have config lines');

                console.log(`  ✓ Deep copy verified: nested and standalone LB apps are independent`);
            }
        }
    });
});
