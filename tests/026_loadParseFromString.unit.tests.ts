/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import ADC from '../src/CitrixADC'
import { Explosion } from '../src/models';

describe('loadParseFromString tests', function () {

    let adc: ADC;
    let exp: Explosion;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    it('should parse a simple LB vserver config from string', async () => {
        // Load actual test config file
        const configPath = path.join(__dirname, 'artifacts/ns1_v13.1-simple.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString, 'test-simple.conf');

        // Verify basic properties
        assert.strictEqual(adc.adcVersion, '13.1');
        assert.strictEqual(adc.inputFileType, '.conf');
        assert.strictEqual(adc.inputFile, 'test-simple');

        // Verify config was parsed
        assert.ok(adc.configObjectArryRx);
        assert.ok(adc.configObjectArryRx.add);
        assert.ok(adc.configObjectArryRx.add.lb);
        assert.ok(adc.configObjectArryRx.add.lb.vserver);

        // Verify stats through explosion
        exp = await adc.explode();
        assert.ok(exp.stats.sourceSize! > 0);
        assert.strictEqual(exp.stats.sourceAdcVersion, '13.1');
    });

    it('should extract apps from string config', async () => {
        // Load actual test config file
        const configPath = path.join(__dirname, 'artifacts/ns1_v13.1-simple.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString, 'test-api.conf');

        exp = await adc.explode();

        // Verify explosion
        assert.ok(exp);
        assert.ok(exp.config);
        assert.ok(exp.config.apps);
        assert.ok(exp.config.apps.length > 0, 'Should have at least one app');

        // Verify app details from the config
        const app = exp.config.apps[0];
        assert.ok(app.name);
        assert.strictEqual(app.type, 'lb');
        assert.ok(app.protocol);
        assert.ok(app.ipAddress);
        assert.ok(app.port);
    });

    it('should handle config with spaces in names', async () => {
        // Use namaste.conf which has names with spaces
        const configPath = path.join(__dirname, 'artifacts/apps/namaste.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString, 'namaste-test.conf');

        exp = await adc.explode();

        // Verify app with space in name (quotes should be stripped)
        assert.ok(exp.config.apps);
        assert.strictEqual(exp.config.apps.length, 1);
        assert.strictEqual(exp.config.apps[0].name, 'namaste 443 vip');

        // Verify serviceGroup with space in name
        assert.ok(exp.config.apps[0].bindings!.serviceGroup);
        assert.strictEqual(exp.config.apps[0].bindings!.serviceGroup![0].name, 'namaste 8443 svg');
    });

    it('should handle custom filename parameter', async () => {
        // Load actual test config
        const configPath = path.join(__dirname, 'artifacts/ns1_v13.1-simple.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString, 'my-custom-config.conf');

        assert.strictEqual(adc.inputFile, 'my-custom-config');
        assert.ok(adc.configFiles.length > 0);
        assert.strictEqual(adc.configFiles[0].fileName, 'my-custom-config.conf');
    });

    it('should handle config without version', async () => {
        // Use noAppsNoVersion.ns.conf which has no version header (and no apps)
        const configPath = path.join(__dirname, 'artifacts/noAppsNoVersion.ns.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString);

        // Should still parse even without version (version detection is optional)
        assert.ok(adc.configObjectArryRx);

        // explode() will throw when no vservers found, which is expected
        try {
            exp = await adc.explode();
            assert.ok(exp.config.apps);
        } catch (error) {
            // Expected error when no vservers found
            assert.ok(error instanceof Error);
        }
    });

    it('should handle config with no apps', async () => {
        // Use noApps.ns.conf which has a version but no vservers
        const configPath = path.join(__dirname, 'artifacts/noApps.ns.conf');
        const configString = fs.readFileSync(configPath, 'utf-8');

        adc = new ADC();
        await adc.loadParseFromString(configString);

        // explode() will throw when no vservers found, which is expected behavior
        try {
            exp = await adc.explode();
            // If we get here, apps should be empty
            assert.ok(exp.config.apps);
            assert.strictEqual(exp.config.apps.length, 0);
        } catch (error) {
            // Expected error when no vservers found
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('no "add cs vserver"/"add lb vserver"/"add gslb vserver" objects found'));
        }
    });

});
