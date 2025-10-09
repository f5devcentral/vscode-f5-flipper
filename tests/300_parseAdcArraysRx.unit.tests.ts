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
import { parseAdcConfArraysRx } from '../src/parseAdcArraysRx';
import { AdcConfObj } from '../src/models';
import { RegExTree } from '../src/regex';

describe('parseAdcArraysRx - Full RX Parsing Tests', function () {

    let rx: any;

    before(function () {
        console.log('       file:', __filename);

        // Initialize regex tree for NS v13.1
        const regexTree = new RegExTree();
        rx = regexTree.get('13.1');
    });

    describe('Basic Parsing', () => {

        it('should parse add lb vserver line', async () => {
            const config = [
                'add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add);
            assert.ok(cfgObj.add.lb);
            assert.ok(cfgObj.add.lb.vserver);
            const vs = (cfgObj.add.lb.vserver as any).web_vs;
            assert.ok(vs);
            assert.strictEqual(vs.name, 'web_vs');
            assert.strictEqual(vs.protocol, 'HTTP');
            assert.strictEqual(vs.ipAddress, '10.1.1.100');
            assert.strictEqual(vs.port, '80');
            // Check parsed options (with dashes to match NS format)
            assert.strictEqual(vs['-persistenceType'], 'COOKIEINSERT');
            assert.strictEqual(vs['-lbMethod'], 'ROUNDROBIN');
        });

        it('should parse add cs vserver line', async () => {
            const config = [
                'add cs vserver cs_vs SSL 10.1.1.101 443 -cltTimeout 180'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add);
            assert.ok(cfgObj.add.cs);
            assert.ok(cfgObj.add.cs.vserver);
            const vs = (cfgObj.add.cs.vserver as any).cs_vs;
            assert.ok(vs);
            assert.strictEqual(vs.name, 'cs_vs');
        });

        it('should parse add service line', async () => {
            const config = [
                'add service web_svc 10.1.2.100 HTTP 80 -gslb NONE'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add);
            assert.ok(cfgObj.add.service);
        });

        it('should parse multiple vservers', async () => {
            const config = [
                'add lb vserver web_vs HTTP 10.1.1.100 80',
                'add lb vserver api_vs SSL 10.1.1.101 443'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add);
            assert.ok(cfgObj.add.lb);
            assert.ok(cfgObj.add.lb.vserver);
            // Currently returns array, will change to object keyed by name
        });

    });

    describe('Set Commands', () => {

        it('should parse set lb vserver line', async () => {
            const config = [
                'add lb vserver web_vs HTTP 10.1.1.100 80',
                'set lb vserver web_vs -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver);
            assert.ok(cfgObj.set?.lb);
        });

    });

    describe('Bind Commands', () => {

        it('should parse bind lb vserver line', async () => {
            const config = [
                'add lb vserver web_vs HTTP 10.1.1.100 80',
                'add service web_svc 10.1.2.100 HTTP 80',
                'bind lb vserver web_vs web_svc'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.bind?.lb?.vserver);
        });

    });

    describe('Complex Config', () => {

        it('should parse full config with add/set/bind', async () => {
            const config = [
                'add lb vserver web_vs HTTP 10.1.1.100 80',
                'set lb vserver web_vs -persistenceType COOKIEINSERT',
                'add service web_svc 10.1.2.100 HTTP 80',
                'bind lb vserver web_vs web_svc'
            ];
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver);
            assert.ok(cfgObj.set?.lb);
            assert.ok(cfgObj.add?.service);
            assert.ok(cfgObj.bind?.lb?.vserver);
        });

    });

    describe('Real Config Files', () => {

        it('should parse starlord.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/starlord.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.cs?.vserver, 'CS vservers should exist');
            assert.ok(cfgObj.add?.lb?.vserver, 'LB vservers should exist');
            assert.ok(cfgObj.add?.serviceGroup, 'Service groups should exist');
        });

        it('should parse apple.ns.conf (spaces in names)', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/apple.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            const vservers = cfgObj.add?.lb?.vserver as any;
            assert.ok(vservers);
            // Check quoted names are parsed correctly
            assert.ok(vservers['1 APPLE_443_HTTPS'] || vservers['1 APPLE_443_HTTPS']);
        });

        it('should parse anyProtocol.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/anyProtocol.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver);
        });

        it('should parse sslBridge.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/sslBridge.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver, 'LB vserver should exist');
            assert.ok(cfgObj.add?.serviceGroup, 'Service group should exist');

            // Verify SSL_BRIDGE protocol is parsed
            const vs = (cfgObj.add.lb.vserver as any).app_ssl_bridge_vs;
            assert.strictEqual(vs?.protocol, 'SSL_BRIDGE');
        });

        it('should parse dnsLoadBalancer.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/dnsLoadBalancer.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver, 'LB vserver should exist');
        });

        it('should parse tcpLdaps.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/tcpLdaps.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver, 'LB vserver should exist');
            // Verify TCP protocol
            const vs = (cfgObj.add.lb.vserver as any).ldaps_lb_vs;
            assert.strictEqual(vs?.protocol, 'TCP');
        });

        it('should parse udpNtp.ns.conf', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/udpNtp.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver, 'LB vserver should exist');
            // Verify UDP protocol
            const vs = (cfgObj.add.lb.vserver as any).ntp_lb_vs;
            assert.strictEqual(vs?.protocol, 'UDP');
        });

        it('should parse groot.ns.conf (CS with SSL)', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/groot.ns.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.cs?.vserver, 'CS vserver should exist');
            assert.ok(cfgObj.bind?.ssl?.vserver, 'SSL bindings should exist');
        });

        it('should parse namaste.conf (serviceGroups with spaces)', async () => {
            const configPath = path.join(__dirname, 'artifacts/apps/namaste.conf');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = content.split('\n');
            const cfgObj: AdcConfObj = {};

            await parseAdcConfArraysRx(config, cfgObj, rx);

            assert.ok(cfgObj.add?.lb?.vserver, 'LB vserver should exist');
            assert.ok(cfgObj.add?.serviceGroup, 'Service groups should exist');
        });

        it('should parse all 14 configs without errors', async () => {
            const configFiles = [
                'anyProtocol.ns.conf',
                'apple.ns.conf',
                'bren.ns.conf',
                'dnsLoadBalancer.ns.conf',
                'fn-2187.ns.conf',
                'groot.ns.conf',
                'namaste.conf',
                'skree.ns.conf',
                'sslBridge.ns.conf',
                'starlord.ns.conf',
                't1.ns.conf',
                'tcpLdaps.ns.conf',
                'tcpListenPolicy.ns.conf',
                'udpNtp.ns.conf'
            ];

            for (const file of configFiles) {
                const configPath = path.join(__dirname, 'artifacts/apps', file);
                const content = fs.readFileSync(configPath, 'utf8');
                const config = content.split('\n');
                const cfgObj: AdcConfObj = {};

                await parseAdcConfArraysRx(config, cfgObj, rx);

                // Just verify it parsed without throwing errors
                assert.ok(cfgObj.add, `Config ${file} should have add section`);
            }
        });

    });

});
