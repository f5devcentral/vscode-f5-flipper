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

describe('UDP NTP application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let err: any;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('       file:', __filename)
        testFile = await archiveMake('udpNtp.ns.conf') as string;
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

    it(`should have 1 UDP NTP application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'UDP')
    })

    it(`UDP NTP app should have correct virtual server configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details
        assert.deepStrictEqual(app.name, 'ntp_lb_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.10')
        assert.deepStrictEqual(app.port, '123')
        assert.deepStrictEqual(app.protocol, 'UDP')
    })

    it(`UDP NTP app should have no persistence (appropriate for NTP)`, async function () {
        const app = expld.config.apps[0];

        // Check for NONE persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType NONE')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have NONE persistence configured')
    })

    it(`UDP NTP app should have multiple service groups for geographic distribution`, async function () {
        const app = expld.config.apps[0];

        // Check for service group bindings
        const sgBindLines = app.lines?.filter((line: string) =>
            line.includes('bind lb vserver') && line.includes('ntp_')
        );
        assert.ok(sgBindLines && sgBindLines.length >= 2, 'Should have multiple service group bindings')

        // Check for UDP service group types
        const sgAddLines = app.lines?.filter((line: string) =>
            line.includes('add serviceGroup') && line.includes('UDP')
        );
        assert.ok(sgAddLines && sgAddLines.length >= 2, 'Should have multiple UDP service groups')
    })

    it(`UDP NTP app should have NTP servers on port 123`, async function () {
        const app = expld.config.apps[0];

        // Check for NTP server bindings on port 123
        const serverBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('123')
        );
        assert.ok(serverBindLines && serverBindLines.length >= 3, 'Should have multiple NTP servers on port 123')

        // Check for NTP server definitions
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server ntp_')
        );
        assert.ok(serverLines && serverLines.length >= 3, 'Should have multiple NTP server definitions')
    })

    it(`UDP NTP app should have appropriate timeout settings for UDP`, async function () {
        const app = expld.config.apps[0];

        // Check for client timeout (shorter for UDP/NTP)
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 120')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have UDP-appropriate client timeout')

        // Check for server timeout (UDP service groups)
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 180')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length >= 2, 'Should have UDP-appropriate server timeout')
    })

    it(`UDP NTP app should have weighted load balancing`, async function () {
        const app = expld.config.apps[0];

        // Check for weight parameters
        const weightLines = app.lines?.filter((line: string) =>
            line.includes('-weight 100')
        );
        assert.ok(weightLines && weightLines.length >= 2, 'Should have weighted load balancing configured')
    })

    it(`UDP NTP app should have east and west coast distribution`, async function () {
        const app = expld.config.apps[0];

        // Check for east coast service group
        const eastSgLines = app.lines?.filter((line: string) =>
            line.includes('ntp_east_sg')
        );
        assert.ok(eastSgLines && eastSgLines.length > 0, 'Should have east coast service group')

        // Check for west coast service group
        const westSgLines = app.lines?.filter((line: string) =>
            line.includes('ntp_west_sg')
        );
        assert.ok(westSgLines && westSgLines.length > 0, 'Should have west coast service group')

        // Check for east coast servers (should have more than west)
        const eastServerLines = app.lines?.filter((line: string) =>
            line.includes('add server ntp_east_')
        );
        const westServerLines = app.lines?.filter((line: string) =>
            line.includes('add server ntp_west_')
        );

        assert.ok(eastServerLines && eastServerLines.length >= 2, 'Should have multiple east coast servers')
        assert.ok(westServerLines && westServerLines.length >= 1, 'Should have west coast server')
    })

    it(`UDP NTP app should have geographic server comments`, async function () {
        const app = expld.config.apps[0];

        // Check for geographic server comments
        const commentLines = app.lines?.filter((line: string) =>
            line.includes('-comment') && (line.includes('East Coast') || line.includes('West Coast'))
        );
        assert.ok(commentLines && commentLines.length >= 3, 'Should have geographic server comments')
    })

    it(`UDP NTP app should use proxy port for UDP connections`, async function () {
        const app = expld.config.apps[0];

        // Check for useproxyport YES setting
        const proxyPortLines = app.lines?.filter((line: string) =>
            line.includes('-useproxyport YES')
        );
        assert.ok(proxyPortLines && proxyPortLines.length >= 2, 'Should have proxy port enabled for service groups')
    })

    it(`should abstract UDP NTP app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify UDP protocol is maintained
        assert.deepStrictEqual(app.protocol, 'UDP')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port number')
    })

});