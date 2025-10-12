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

describe('TCP LDAPS application tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let err: any;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('---------- file:', __filename);
        testFile = await archiveMake('tcpLdaps.ns.conf') as string;
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

    it(`should have 1 TCP LDAPS application`, async function () {
        assert.deepStrictEqual(expld.config?.apps?.length, 1)
        const app = expld.config.apps[0];
        assert.deepStrictEqual(app.type, 'lb')
        assert.deepStrictEqual(app.protocol, 'TCP')
    })

    it(`TCP LDAPS app should have correct virtual server configuration`, async function () {
        const app = expld.config.apps[0];

        // Check virtual server details
        assert.deepStrictEqual(app.name, 'ldaps_lb_vs')
        assert.deepStrictEqual(app.ipAddress, '192.168.1.10')
        assert.deepStrictEqual(app.port, '636')
        assert.deepStrictEqual(app.protocol, 'TCP')
    })

    it(`TCP LDAPS app should have no persistence (appropriate for LDAP)`, async function () {
        const app = expld.config.apps[0];

        // Check for NONE persistence in config lines
        const persistenceLines = app.lines?.filter((line: string) =>
            line.includes('-persistenceType NONE')
        );
        assert.ok(persistenceLines && persistenceLines.length > 0, 'Should have NONE persistence configured')
    })

    it(`TCP LDAPS app should have multiple service groups for multi-site`, async function () {
        const app = expld.config.apps[0];

        // Check for service group bindings
        const sgBindLines = app.lines?.filter((line: string) =>
            line.includes('bind lb vserver') && line.includes('ldaps_')
        );
        assert.ok(sgBindLines && sgBindLines.length >= 2, 'Should have multiple service group bindings')

        // Check for TCP service group types
        const sgAddLines = app.lines?.filter((line: string) =>
            line.includes('add serviceGroup') && line.includes('TCP')
        );
        assert.ok(sgAddLines && sgAddLines.length >= 2, 'Should have multiple TCP service groups')
    })

    it(`TCP LDAPS app should have domain controllers on port 636`, async function () {
        const app = expld.config.apps[0];

        // Check for LDAPS server bindings on port 636
        const serverBindLines = app.lines?.filter((line: string) =>
            line.includes('bind serviceGroup') && line.includes('636')
        );
        assert.ok(serverBindLines && serverBindLines.length >= 4, 'Should have multiple LDAPS servers on port 636')

        // Check for domain controller definitions
        const serverLines = app.lines?.filter((line: string) =>
            line.includes('add server ldaps_')
        );
        assert.ok(serverLines && serverLines.length >= 4, 'Should have multiple domain controller definitions')
    })

    it(`TCP LDAPS app should have appropriate LDAP timeout settings`, async function () {
        const app = expld.config.apps[0];

        // Check for client timeout (longer for directory services)
        const clientTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-cltTimeout 9000')
        );
        assert.ok(clientTimeoutLines && clientTimeoutLines.length > 0, 'Should have LDAP-appropriate client timeout')

        // Check for server timeout
        const serverTimeoutLines = app.lines?.filter((line: string) =>
            line.includes('-svrTimeout 9000')
        );
        assert.ok(serverTimeoutLines && serverTimeoutLines.length > 0, 'Should have LDAP-appropriate server timeout')
    })

    it(`TCP LDAPS app should have primary and backup site distribution`, async function () {
        const app = expld.config.apps[0];

        // Check for primary site service group
        const primarySgLines = app.lines?.filter((line: string) =>
            line.includes('ldaps_primary_sg')
        );
        assert.ok(primarySgLines && primarySgLines.length > 0, 'Should have primary site service group')

        // Check for backup site service group
        const backupSgLines = app.lines?.filter((line: string) =>
            line.includes('ldaps_backup_sg')
        );
        assert.ok(backupSgLines && backupSgLines.length > 0, 'Should have backup site service group')

        // Check for primary site servers (should have more than backup)
        const primaryServerLines = app.lines?.filter((line: string) =>
            line.includes('add server ldaps_primary_')
        );
        const backupServerLines = app.lines?.filter((line: string) =>
            line.includes('add server ldaps_backup_')
        );

        assert.ok(primaryServerLines && primaryServerLines.length >= 4, 'Should have multiple primary site servers')
        assert.ok(backupServerLines && backupServerLines.length >= 1, 'Should have backup site server')
    })

    it(`TCP LDAPS app should have domain controller comments`, async function () {
        const app = expld.config.apps[0];

        // Check for domain controller comments
        const commentLines = app.lines?.filter((line: string) =>
            line.includes('-comment') && line.includes('Domain Controller')
        );
        assert.ok(commentLines && commentLines.length >= 4, 'Should have domain controller comments')
    })

    it(`TCP LDAPS app should use proxy port for backend connections`, async function () {
        const app = expld.config.apps[0];

        // Check for useproxyport YES setting
        const proxyPortLines = app.lines?.filter((line: string) =>
            line.includes('-useproxyport YES')
        );
        assert.ok(proxyPortLines && proxyPortLines.length >= 2, 'Should have proxy port enabled for service groups')
    })

    it(`should abstract TCP LDAPS app correctly`, async function () {
        const app = expld.config.apps[0];

        // Verify this is recognized as a load balancer application
        assert.deepStrictEqual(app.type, 'lb')

        // Verify TCP protocol is maintained
        assert.deepStrictEqual(app.protocol, 'TCP')

        // Verify it has the expected structure
        assert.ok(app.lines && app.lines.length > 0, 'Should have configuration lines')
        assert.ok(app.name, 'Should have application name')
        assert.ok(app.ipAddress, 'Should have IP address')
        assert.ok(app.port, 'Should have port number')
    })

});