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
import ADC from '../src/CitrixADC'
import { Explosion } from '../src/models';
import { archiveMake } from './archiveBuilder';

const events: any[] = [];
let testFile: string;

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('ANY Protocol application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let err: any;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('       file:', __filename)
        testFile = await archiveMake('anyProtocol.ns.conf') as string;
        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0
        adc = new ADC();

        adc.on('parseFile', x => parsedFileEvents.push(x))
        adc.on('parseObject', x => parsedObjEvents.push(x))

        await adc.loadParseAsync(testFile)
            .then(async x => {
                await adc.explode()
                    .then(x => {
                        expld = x
                    })
            })
            .catch(y => {
                err = y;
                console.error(err);
            })
    })

    afterEach(function () {
        if (this.currentTest?.state === 'failed') {
            console.log('\\n---Tests failed, printing logs---');
            console.log(JSON.stringify(expld, undefined, 2));
        }
    })

    it(`should have completed without error`, async function () {
        assert.deepStrictEqual(err, undefined)
    })

    it(`should have config sources`, async function () {
        assert.ok(expld.config?.sources?.length > 0)
    })

    it(`should have 1 ANY Protocol application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'ANY')
    })

    it(`ANY Protocol app should have wildcard configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details - should have wildcard port (*)
        assert.deepStrictEqual(app.name, 'exchange_any_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.41')
        assert.deepStrictEqual(app.port, '*')  // Wildcard port
        assert.deepStrictEqual(app.protocol, 'ANY')
    })

    it(`ANY Protocol app should have no persistence (transparent forwarding)`, async function () {
        const app = expld.config.apps[0];

        // Check for NONE persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType NONE')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have NONE persistence for transparent forwarding')
    })

    it(`ANY Protocol app should have dual load balancing methods`, async function () {
        const app = expld.config.apps[0];

        // Check for primary load balancing method
        const primaryLbLines = app.lines?.filter((line: string) =>
            line.includes('-lbMethod ROUNDROBIN')
        );
        assert.ok(primaryLbLines && primaryLbLines.length > 0, 'Should have ROUNDROBIN as primary method')

        // Check for backup load balancing method
        const backupLbLines = app.lines?.filter((line: string) =>
            line.includes('-backupLBMethod SOURCEIPHASH')
        );
        assert.ok(backupLbLines && backupLbLines.length > 0, 'Should have SOURCEIPHASH as backup method')
    })

    it(`ANY Protocol app should have wildcard service bindings`, async function () {
        const app = expld.config.apps[0];

        // Check for wildcard port bindings in service group
        const wildcardBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes(' *')
        );
        assert.ok(wildcardBindLines && wildcardBindLines.length >= 8, 'Should have multiple wildcard port bindings')

        // Check for Exchange server definitions
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server exchange_')
        );
        assert.ok(serverLines && serverLines.length >= 8, 'Should have multiple Exchange server definitions')
    })

    it(`ANY Protocol app should have multi-site Exchange servers`, async function () {
        const app = expld.config.apps[0];

        // Check for Site A servers
        const siteAServers = app.lines?.filter((line: string) =>
            line.includes('add server exchange_sitea_')
        );
        assert.ok(siteAServers && siteAServers.length >= 4, 'Should have multiple Site A Exchange servers')

        // Check for Site B servers
        const siteBServers = app.lines?.filter((line: string) =>
            line.includes('add server exchange_siteb_')
        );
        assert.ok(siteBServers && siteBServers.length >= 4, 'Should have multiple Site B Exchange servers')
    })

    it(`ANY Protocol app should have appropriate timeout settings`, async function () {
        const app = expld.config.apps[0];

        // Check for long client timeout (15 minutes = 900 seconds)
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 900')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have long client timeout for Exchange')

        // Check for long server timeout
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 900')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length > 0, 'Should have long server timeout for Exchange')
    })

    it(`ANY Protocol app should have direct server return (no proxy port)`, async function () {
        const app = expld.config.apps[0];

        // Check for useproxyport NO setting (direct server return)
        const proxyPortLines = app.lines?.filter((line: string) =>
            line.includes('-useproxyport NO')
        );
        assert.ok(proxyPortLines && proxyPortLines.length > 0, 'Should have direct server return configured')
    })

    it(`ANY Protocol app should use ping health monitor`, async function () {
        const app = expld.config.apps[0];

        // Check for ping monitor binding (appropriate for ANY protocol)
        const pingMonitorLines = app.lines?.filter((line: string) =>
            line.includes('-monitorName ping')
        );
        assert.ok(pingMonitorLines && pingMonitorLines.length > 0, 'Should use ping monitor for ANY protocol')
    })

    it(`ANY Protocol app should have Exchange server comments`, async function () {
        const app = expld.config.apps[0];

        // Check for Exchange server comments
        const exchangeComments = app.lines?.filter((line: string) =>
            line.includes('-comment') && line.includes('Exchange Server')
        );
        assert.ok(exchangeComments && exchangeComments.length >= 8, 'Should have Exchange server comments')
    })

    it(`ANY Protocol app should have high availability servers`, async function () {
        const app = expld.config.apps[0];

        // Check for HA servers
        const haServers = app.lines?.filter((line: string) =>
            line.includes('exchange_') && line.includes('_ha')
        );
        assert.ok(haServers && haServers.length >= 4, 'Should have high availability servers')
    })

    it(`should abstract ANY Protocol app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify ANY protocol is maintained
        assert.deepStrictEqual(app.protocol, 'ANY')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port (even if wildcard)')
    })

});