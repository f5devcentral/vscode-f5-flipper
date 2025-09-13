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

describe('SSL_BRIDGE application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let err: any;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('       file:', __filename)
        testFile = await archiveMake('sslBridge.ns.conf') as string;
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
            console.log('\n---Tests failed, printing logs---');
            console.log(JSON.stringify(expld, undefined, 2));
        }
    })

    it(`should have completed without error`, async function () {
        assert.deepStrictEqual(err, undefined)
    })

    it(`should have config sources`, async function () {
        assert.ok(expld.config?.sources?.length > 0)
    })

    it(`should have 1 SSL_BRIDGE application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'SSL_BRIDGE')
    })

    it(`SSL_BRIDGE app should have correct configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details
        assert.deepStrictEqual(app.name, 'app_ssl_bridge_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.100')
        assert.deepStrictEqual(app.port, '443')
        assert.deepStrictEqual(app.protocol, 'SSL_BRIDGE')
    })

    it(`SSL_BRIDGE app should have SSL session persistence`, async function () {
        const app = expld.config.apps[0];

        // Check for SSL session persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType SSLSESSION')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have SSL session persistence configured')
    })

    it(`SSL_BRIDGE app should have service group configuration`, async function () {
        const app = expld.config.apps[0];

        // Check for service group binding
        const sgBindLines = app.lines?.filter((line: string) =>
            line.includes('bind lb vserver') && line.includes('app_ssl_bridge_sg')
        );
        assert.ok(sgBindLines && sgBindLines.length > 0, 'Should have service group binding')

        // Check for SSL_BRIDGE service group type
        const sgAddLines = app.lines?.filter((line: string) =>
            line.includes('add serviceGroup') && line.includes('SSL_BRIDGE')
        );
        assert.ok(sgAddLines && sgAddLines.length > 0, 'Should have SSL_BRIDGE service group')
    })

    it(`SSL_BRIDGE app should have backend SSL server on port 443`, async function () {
        const app = expld.config.apps[0];

        // Check for backend server binding on port 443
        const serverBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('443')
        );
        assert.ok(serverBindLines && serverBindLines.length > 0, 'Should have backend server on SSL port 443')

        // Check for server definition
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server backend_ssl_server')
        );
        assert.ok(serverLines && serverLines.length > 0, 'Should have backend server definition')
    })

    it(`SSL_BRIDGE app should have TCP health monitor`, async function () {
        const app = expld.config.apps[0];

        // Check for TCP monitor
        const monitorLines = app.lines?.filter((line: string) =>
            line.includes('add lb monitor') && line.includes('TCP')
        );
        assert.ok(monitorLines && monitorLines.length > 0, 'Should have TCP health monitor')

        // Check for monitor binding
        const monitorBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('-monitorName')
        );
        assert.ok(monitorBindLines && monitorBindLines.length > 0, 'Should have monitor binding to service group')
    })

    it(`SSL_BRIDGE app should have appropriate timeout settings`, async function () {
        const app = expld.config.apps[0];

        // Check for client timeout
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 180')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have client timeout configured')

        // Check for server timeout
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 360')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length > 0, 'Should have server timeout configured')
    })

    it(`should abstract SSL_BRIDGE app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify SSL_BRIDGE protocol is maintained
        assert.deepStrictEqual(app.protocol, 'SSL_BRIDGE')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port number')
    })

});