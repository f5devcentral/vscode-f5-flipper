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
import { parseNsOptions, extractOptions } from '../src/parseAdcUtils';

const events = [];
const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []
const rx = new RegExTree().get('13.1');


describe('parse NS options function tests', function () {
    
    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

    });

    afterEach(function () {
        events.length = 0;
    })


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

    it('parseNsOptions - edge cases and last option handling', () => {
        // Test that the optimized regex handles the last option without needing -devno hack

        // Single option at end of string (no trailing options)
        const result1 = parseNsOptions('-timeout 20', rx);
        assert.deepStrictEqual(result1, { '-timeout': '20' });

        // Multiple options with last one properly captured
        const result2 = parseNsOptions('-interval 10 -timeout 5', rx);
        assert.deepStrictEqual(result2, { '-interval': '10', '-timeout': '5' });

        // Options with quoted values at the end
        const result3 = parseNsOptions('-httpRequest "GET /health" -comment "test monitor"', rx);
        assert.deepStrictEqual(result3, {
            '-httpRequest': 'GET /health',
            '-comment': 'test monitor'
        });

        // Empty string should return empty object
        const result4 = parseNsOptions('', rx);
        assert.deepStrictEqual(result4, {});

        // Options with special characters
        const result5 = parseNsOptions('-respCode 200-299 -secure YES', rx);
        assert.deepStrictEqual(result5, { '-respCode': '200-299', '-secure': 'YES' });
    });

    it('extractOptions - filter parsed objects', () => {
        // Test basic filtering of structural properties
        const parsed1 = {
            name: 'web_vs',
            protocol: 'HTTP',
            ipAddress: '10.1.1.100',
            port: '80',
            _line: 'add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType SOURCEIP',
            '-persistenceType': 'SOURCEIP',
            '-timeout': '20'
        };

        const opts1 = extractOptions(parsed1);
        assert.deepStrictEqual(opts1, {
            '-persistenceType': 'SOURCEIP',
            '-timeout': '20'
        });

        // Test with server field excluded
        const parsed2 = {
            name: 'web_svc',
            protocol: 'HTTP',
            port: '80',
            server: 'server1',
            _line: 'add service web_svc server1 HTTP 80 -maxClient 100',
            '-maxClient': '100'
        };

        const opts2 = extractOptions(parsed2);
        assert.deepStrictEqual(opts2, {
            '-maxClient': '100'
        });

        // Test with additional exclude fields
        const parsed3 = {
            name: 'cs_vs',
            protocol: 'HTTP',
            ipAddress: '10.1.1.200',
            port: '443',
            _line: 'add cs vserver cs_vs HTTP 10.1.1.200 443',
            customField: 'should_be_excluded',
            '-state': 'ENABLED'
        };

        const opts3 = extractOptions(parsed3, ['customField']);
        assert.deepStrictEqual(opts3, {
            '-state': 'ENABLED'
        });

        // Test object with no options (only structural fields)
        const parsed4 = {
            name: 'simple_vs',
            protocol: 'TCP',
            ipAddress: '10.1.1.50',
            port: '22',
            _line: 'add lb vserver simple_vs TCP 10.1.1.50 22'
        };

        const opts4 = extractOptions(parsed4);
        assert.deepStrictEqual(opts4, {});
    });

    it('extractOptions - Set-based exclusion performance', () => {
        // Test that Set-based exclusion works correctly
        const parsed = {
            name: 'test',
            protocol: 'HTTP',
            ipAddress: '1.1.1.1',
            port: '80',
            server: 'server1',
            _line: 'line...',
            '-opt1': 'val1',
            '-opt2': 'val2',
            '-opt3': 'val3',
            '-opt4': 'val4',
            '-opt5': 'val5'
        };

        const opts = extractOptions(parsed);

        // Should have exactly 5 options, excluding all structural fields
        assert.strictEqual(Object.keys(opts).length, 5);
        assert.strictEqual(opts['-opt1'], 'val1');
        assert.strictEqual(opts['-opt5'], 'val5');

        // Should not have any excluded fields
        assert.strictEqual(opts['name'], undefined);
        assert.strictEqual(opts['protocol'], undefined);
        assert.strictEqual(opts['ipAddress'], undefined);
        assert.strictEqual(opts['port'], undefined);
        assert.strictEqual(opts['server'], undefined);
        assert.strictEqual(opts['_line'], undefined);
    });

    it('parseNsOptions - handles -cip with two values', () => {
        // Test -cip with ENABLED and a header name (two values)
        const result1 = parseNsOptions('-cip ENABLED client-ip -usip NO', rx);
        assert.deepStrictEqual(result1, {
            '-cip': 'ENABLED client-ip',
            '-usip': 'NO'
        });

        // Test -cip with ENABLED and X-Forwarded-For
        const result2 = parseNsOptions('-cip ENABLED X-Forwarded-For -usip NO', rx);
        assert.deepStrictEqual(result2, {
            '-cip': 'ENABLED X-Forwarded-For',
            '-usip': 'NO'
        });

        // Test -cip with DISABLED (single value)
        const result3 = parseNsOptions('-cip DISABLED -usip NO', rx);
        assert.deepStrictEqual(result3, {
            '-cip': 'DISABLED',
            '-usip': 'NO'
        });

        // Test full service line from apple.ns.conf
        const fullLine = '-gslb NONE -maxClient 0 -maxReq 0 -cip ENABLED client-ip -usip NO -useproxyport YES -sp OFF -cltTimeout 180 -svrTimeout 360 -CKA NO -TCPB NO -CMP YES';
        const result4 = parseNsOptions(fullLine, rx);
        assert.strictEqual(result4['-cip'], 'ENABLED client-ip');
        assert.strictEqual(result4['-usip'], 'NO');
        assert.strictEqual(result4['-devno'], undefined); // Should be excluded

        // Test -cip with X-Client-IP
        const result5 = parseNsOptions('-cip ENABLED X-Client-IP -usip NO', rx);
        assert.deepStrictEqual(result5, {
            '-cip': 'ENABLED X-Client-IP',
            '-usip': 'NO'
        });
    });

    it('parseNsOptions - excludes -devno', () => {
        // Test that -devno is excluded
        const result1 = parseNsOptions('-maxClient 100 -devno 12345 -timeout 20', rx);
        assert.deepStrictEqual(result1, {
            '-maxClient': '100',
            '-timeout': '20'
        });

        // Test -devno at the end
        const result2 = parseNsOptions('-secure YES -devno 363462656', rx);
        assert.deepStrictEqual(result2, {
            '-secure': 'YES'
        });
    });
});