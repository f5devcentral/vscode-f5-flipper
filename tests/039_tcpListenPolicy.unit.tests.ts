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

describe('TCP Listen Policy application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let err: any;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('---------- file:', __filename);
        testFile = await archiveMake('tcpListenPolicy.ns.conf') as string;
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

    it(`should have 1 TCP Listen Policy application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'TCP')
    })

    it(`TCP Listen Policy app should have wildcard port configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details - should have wildcard port (*)
        assert.deepStrictEqual(app.name, 'app_multiport_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.15')
        assert.deepStrictEqual(app.port, '*')  // Wildcard port
        assert.deepStrictEqual(app.protocol, 'TCP')
    })

    it(`TCP Listen Policy app should have source IP persistence`, async function () {
        const app = expld.config.apps[0];

        // Check for SOURCEIP persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType SOURCEIP')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have SOURCEIP persistence configured')

        // Check for persistence timeout
        const timeoutLines = app.lines?.filter((line: string) =>
            line.includes('-timeout 60')
        );
        assert.ok(timeoutLines && timeoutLines.length > 0, 'Should have persistence timeout configured')
    })

    it(`TCP Listen Policy app should have comprehensive listen policy`, async function () {
        const app = expld.config.apps[0];

        // Check for listen policy configuration
        const listenPolicyLines = app.lines?.filter((line: string) =>
            line.includes('-Listenpolicy')
        );
        assert.ok(listenPolicyLines && listenPolicyLines.length > 0, 'Should have listen policy configured')

        // Check for multiple port conditions in the policy
        const policyContent = listenPolicyLines?.[0];
        assert.ok(policyContent && policyContent.includes('CLIENT.TCP.DSTPORT.EQ(80)'), 'Should include port 80')
        assert.ok(policyContent && policyContent.includes('CLIENT.TCP.DSTPORT.EQ(443)'), 'Should include port 443')
        assert.ok(policyContent && policyContent.includes('CLIENT.TCP.DSTPORT.EQ(5656)'), 'Should include port 5656')
        assert.ok(policyContent && policyContent.includes('CLIENT.TCP.DSTPORT.EQ(9696)'), 'Should include port 9696')

        // Count the number of port conditions (should be 12)
        const portMatches = policyContent?.match(/CLIENT\.TCP\.DSTPORT\.EQ\(\d+\)/g);
        assert.ok(portMatches && portMatches.length >= 10, 'Should have multiple port conditions in listen policy')
    })

    it(`TCP Listen Policy app should have wildcard service bindings`, async function () {
        const app = expld.config.apps[0];

        // Check for wildcard port bindings in service group
        const wildcardBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes(' *')
        );
        assert.ok(wildcardBindLines && wildcardBindLines.length >= 2, 'Should have wildcard port bindings')

        // Check for server definitions
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server app_server_')
        );
        assert.ok(serverLines && serverLines.length >= 2, 'Should have multiple server definitions')
    })

    it(`TCP Listen Policy app should have custom HTTP health monitor`, async function () {
        const app = expld.config.apps[0];

        // Check for HTTP-ECV monitor
        const monitorLines = app.lines?.filter((line: string) =>
            line.includes('add lb monitor') && line.includes('HTTP-ECV')
        );
        assert.ok(monitorLines && monitorLines.length > 0, 'Should have HTTP-ECV health monitor')

        // Check for custom headers
        const customHeaderLines = app.lines?.filter((line: string) =>
            line.includes('-customHeaders')
        );
        assert.ok(customHeaderLines && customHeaderLines.length > 0, 'Should have custom headers in monitor')

        // Check for specific destination port
        const destPortLines = app.lines?.filter((line: string) =>
            line.includes('-destPort 5656')
        );
        assert.ok(destPortLines && destPortLines.length > 0, 'Should have specific destination port for monitor')
    })

    it(`TCP Listen Policy app should have long timeout settings`, async function () {
        const app = expld.config.apps[0];

        // Check for long client timeout (1 hour = 3600 seconds)
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 3600')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have long client timeout configured')

        // Check for long server timeout
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 3600')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length > 0, 'Should have long server timeout configured')
    })

    it(`TCP Listen Policy app should have appflow logging disabled`, async function () {
        const app = expld.config.apps[0];

        // Check for appflow logging disabled
        const appflowLines = app.lines?.filter((line: string) =>
            line.includes('-appflowLog DISABLED')
        );
        assert.ok(appflowLines && appflowLines.length > 0, 'Should have appflow logging disabled')
    })

    it(`TCP Listen Policy app should have server comments`, async function () {
        const app = expld.config.apps[0];

        // Check for server comments
        const commentLines = app.lines?.filter((line: string) =>
            line.includes('-comment') && line.includes('application server')
        );
        assert.ok(commentLines && commentLines.length >= 2, 'Should have server comments')
    })

    it(`TCP Listen Policy app should have proxy port enabled`, async function () {
        const app = expld.config.apps[0];

        // Check for useproxyport YES setting
        const proxyPortLines = app.lines?.filter((line: string) =>
            line.includes('-useproxyport YES')
        );
        assert.ok(proxyPortLines && proxyPortLines.length > 0, 'Should have proxy port enabled')
    })

    it(`TCP Listen Policy app should have monitor binding`, async function () {
        const app = expld.config.apps[0];

        // Check for monitor binding to service group
        const monitorBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('-monitorName')
        );
        assert.ok(monitorBindLines && monitorBindLines.length > 0, 'Should have monitor binding to service group')
    })

    it(`should abstract TCP Listen Policy app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify TCP protocol is maintained
        assert.deepStrictEqual(app.protocol, 'TCP')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port (even if wildcard)')
    })

});