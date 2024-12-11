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
import { parseNsOptions } from '../src/parseAdcUtils';

const events = [];
const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []
const rx = new RegExTree().get('13.1');

describe('parse NS options function tests', function () {




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



    // it(`regular options single`, async () => {

    //     const items = [
    //     'add server sprout135A_groot 192.168.160.120 -devno 108847',
    //     'add server sprout135c_groot 192.168.160.69 -devno 108848',
    //     'add server dorsal-nedc 10.8.101.46 -comment "automated deployment"',
    //     'add server dorsal-swdc 10.12.101.46 -comment "automated deployment"',
    //     'add server stpvec1 stpvec1.f5flipper.com -comment "automated deployment"',
    //     'add server stpvec2 stpvec2.f5flipper.com -comment "automated deployment"',
    //     ];

    //     // strip off all the leading parent object details 'add server '
    //     const slim = items.map(x => x.replace('add server ', ''))

    //     const rxMatches = slim.map(x => x.match(rx.parents['add server']))

    //     const misses = rxMatches.filter(x => x === undefined)

    //     assert.ok(misses.length === 0, 'should not have any rx misses');
    // })

    it(`lb monitor options complicated`, async () => {

        // this test should accomodate all options on all NS configs.
        // just happened to be monitors when this needed to get worked out.
        // so add any other config lines with options and add additional tests as needed

        const items = [
        'add lb monitor test01_http_ecv_mon HTTP-ECV -customHeaders "Host:flippy.doda.com\\r\\n" -send "GET /HealthCheck" -recv "\\\"Version\\\"" -LRTM DISABLED -secure YES -devno 12357',
        'add lb monitor http-custom-8202_mon HTTP -respCode 306-307 -httpRequest "HEAD /" -LRTM DISABLED -interval 10 -resptimeout 5 -destPort 8202 -secure YES -devno 12355',
        'add lb monitor test02_http_80_mon HTTP -respCode 200 -httpRequest "HEAD /to/know/all" -LRTM DISABLED -devno 12345',
        'add lb monitor basic_tcp_monitor TCP -LRTM DISABLED -interval 10 -resptimeout 5 -secure YES -devno 12356',
        'add lb monitor "test with spaces http mon" HTTP-ECV -send "GET /some/complicated/name" -recv OK -LRTM DISABLED -destPort 8081 -devno 12365',
        'add lb monitor redirect_http-mon HTTP -respCode 301 -httpRequest "HEAD /artifactory" -LRTM DISABLED -secure YES -devno 12366',
        'add lb monitor http200_mon HTTP -respCode 200 -httpRequest "GET /api/v1/system/health" -LRTM DISABLED -destPort 8082 -devno 12367',
        'add lb monitor kaizen_http1.1_mon HTTP-ECV -customHeaders "Host:modern.samurai.chi\\r\\n" -send "GET /focusReady" -recv "\"zen\"" -LRTM DISABLED -secure YES -devno 12363',
        ];

        // cut down array of monitors
        // these shorter versions better represent what the function will actually see during processing
        const slim: string[] = []

        // strip off all the leading parent object details 'add lb monitor ... ... '
        for await(const x of items) {
            //find the index of the first opt "-\S+"
            const firstOptIdx = x.match(/ -\S+ /)?.index || 0;
            // return the rest of the string from the first match index
            const restOfString = x.substring(firstOptIdx);
            slim.push(restOfString);
        }

        // loop through the array and parse all the ns options
        const optsObx = slim.map(i => parseNsOptions(i, rx));

        assert.deepStrictEqual("Host:flippy.doda.com\\r\\n", optsObx[0]['-customHeaders']);
        assert.deepStrictEqual('306-307', optsObx[1]['-respCode']);
        assert.deepStrictEqual('HEAD /to/know/all', optsObx[2]['-httpRequest']);
        assert.deepStrictEqual('YES', optsObx[3]['-secure']);
        assert.deepStrictEqual('8081', optsObx[4]['-destPort']);
        assert.deepStrictEqual('DISABLED', optsObx[5]['-LRTM']);
        assert.deepStrictEqual("GET /api/v1/system/health", optsObx[6]['-httpRequest']);
        assert.deepStrictEqual("Host:modern.samurai.chi\\r\\n", optsObx[7]['-customHeaders']);
        assert.deepStrictEqual("GET /focusReady", optsObx[7]['-send']);
    })


});