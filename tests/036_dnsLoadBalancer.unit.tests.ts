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

const events = [];
let testFile: string;

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('DNS Load Balancer application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let log;
    let err;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('---------- file:', __filename);
        testFile = await archiveMake('dnsLoadBalancer.ns.conf') as string;
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

    it(`should have 1 DNS load balancer application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'DNS')
    })

    it(`DNS app should have correct virtual server configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details
        assert.deepStrictEqual(app.name, 'dns_lb_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.10')
        assert.deepStrictEqual(app.port, '53')
        assert.deepStrictEqual(app.protocol, 'DNS')
    })

    it(`DNS app should have no persistence (appropriate for DNS)`, async function () {
        const app = expld.config.apps[0];

        // Check for NONE persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType NONE')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have NONE persistence configured')
    })

    it(`DNS app should have multiple DNS service groups`, async function () {
        const app = expld.config.apps[0];

        // Check for DNS service group bindings
        const sgBindLines = app.lines?.filter((line: string) =>
            line.includes('bind lb vserver') && line.includes('dns_')
        );
        assert.ok(sgBindLines && sgBindLines.length >= 2, 'Should have multiple service group bindings')

        // Check for DNS service group types
        const sgAddLines = app.lines?.filter((line: string) =>
            line.includes('add serviceGroup') && line.includes('DNS')
        );
        assert.ok(sgAddLines && sgAddLines.length >= 2, 'Should have multiple DNS service groups')
    })

    it(`DNS app should have DNS servers on port 53`, async function () {
        const app = expld.config.apps[0];

        // Check for DNS server bindings on port 53
        const serverBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('53')
        );
        assert.ok(serverBindLines && serverBindLines.length >= 2, 'Should have DNS servers on port 53')

        // Check for server definitions
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server dns_')
        );
        assert.ok(serverLines && serverLines.length >= 2, 'Should have multiple DNS server definitions')
    })

    it(`DNS app should have DNS-specific health monitoring`, async function () {
        const app = expld.config.apps[0];

        // Check for DNS monitor with query
        const monitorLines = app.lines?.filter((line: string) =>
            line.includes('add lb monitor') && line.includes('DNS') && line.includes('-query')
        );
        assert.ok(monitorLines && monitorLines.length > 0, 'Should have DNS health monitor with query')

        // Check for queryType parameter
        const queryTypeLines = app.lines?.filter((line: string) =>
            line.includes('-queryType Address')
        );
        assert.ok(queryTypeLines && queryTypeLines.length > 0, 'Should have DNS queryType configured')

        // Check for monitor binding
        const monitorBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('-monitorName')
        );
        assert.ok(monitorBindLines && monitorBindLines.length >= 2, 'Should have monitor bindings to service groups')
    })

    it(`DNS app should have weighted load balancing`, async function () {
        const app = expld.config.apps[0];

        // Check for weight parameters
        const weightLines = app.lines?.filter((line: string) =>
            line.includes('-weight 100')
        );
        assert.ok(weightLines && weightLines.length >= 2, 'Should have weighted load balancing configured')
    })

    it(`DNS app should have appropriate timeout settings`, async function () {
        const app = expld.config.apps[0];

        // Check for client timeout (should be shorter for DNS)
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 120')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have DNS-appropriate client timeout')

        // Check for server timeout
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 120')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length > 0, 'Should have DNS-appropriate server timeout')
    })

    it(`DNS app should have geo-distributed server comments`, async function () {
        const app = expld.config.apps[0];

        // Check for geographic server comments
        const commentLines = app.lines?.filter((line: string) =>
            line.includes('-comment') && (line.includes('East Coast') || line.includes('West Coast'))
        );
        assert.ok(commentLines && commentLines.length >= 2, 'Should have geographic server comments')
    })

    it(`should abstract DNS app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify DNS protocol is maintained
        assert.deepStrictEqual(app.protocol, 'DNS')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port number')
    })

});