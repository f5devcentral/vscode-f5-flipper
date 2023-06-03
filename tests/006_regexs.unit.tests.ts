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
import { RegExTree } from '../src/regex';

const events = [];
const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []
const rx = new RegExTree().get('13.1');

describe('tgz unpacker tests', function () {




    before(async function () {
        // log test file name - makes it easer for troubleshooting
        console.log('       file:', __filename)

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

    });

    afterEach(function () {
        events.length = 0;
    })



    it(`test 'add server' regex`, async () => {

        const items = [
        'add server 1.2.3.4 1.2.3.4',
        'add server 1.2.3.5 1.2.3.5',
        'add server sprout135A_groot 192.168.160.120 -devno 108847',
        'add server sprout135c_groot 192.168.160.69 -devno 108848',
        'add server dorsal-nedc 10.8.101.46 -comment "automated deployment"',
        'add server dorsal-swdc 10.12.101.46 -comment "automated deployment"',
        'add server stpvec1 stpvec1.f5flipper.com -comment "automated deployment"',
        'add server stpvec2 stpvec2.f5flipper.com -comment "automated deployment"',
        ];

        // strip off all the leading parent object details 'add server '
        const slim = items.map(x => x.replace('add server ', ''))

        const rxMatches = slim.map(x => x.match(rx.parents['add server']))

        const misses = rxMatches.filter(x => x === undefined)

        assert.ok(misses.length === 0, 'should not have any rx misses');
    })



});