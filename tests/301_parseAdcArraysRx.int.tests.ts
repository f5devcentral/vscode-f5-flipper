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
import { AdcApp, AdcConfObj, Explosion } from '../src/models';
import { RegExTree } from '../src/regex';
import ADC from '../src/CitrixADC';
import { archiveMake } from './archiveBuilder';


const events = [];
let testFile: string;

const parsedFileEvents: any[] = [];
const parsedObjEvents: any[] = [];


describe('parseAdcArraysRx - Full RX Parsing Tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let log;
    let err;
    let apps: AdcApp[] = [];
    let appsRx: AdcApp[] = [];


    before(async function () {
        // log test file name - makes it easer for troubleshooting
        console.log('       file:', __filename);

        // this is the base test file
        testFile = await archiveMake('t1.ns.conf') as string;
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
                // log = adc.logs()
                debugger;
            })

        // get the apps from the exploded object
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        apps = expld.config.apps!;
        // get the apps from the rx parsed object
        appsRx = adc.appsRx;

    });

    afterEach(function () {
        events.length = 0;
    })

    describe('full Basic config Parsing', () => {

        it('compare apps to appRx', async () => {


            assert.ok(apps);
            assert.ok(Array.isArray(apps));
            assert.ok(apps.length > 0);

            // get the apps from the rx parsed object
            assert.ok(Array.isArray(appsRx));
            assert.ok(appsRx.length > 0);

            // should be the same number of apps
            assert.strictEqual(apps.length, appsRx.length);

            // compare each object
            // assert.deepStrictEqual(apps, appsRx);

            // should be the same app names
            const appNames = apps.map(x => x.name).sort();
            const appRxNames = appsRx.map(x => x.name).sort();
            assert.deepStrictEqual(appNames, appRxNames);


        });

        it('app2_cs_vs', async () => {

            const origApp = apps.find(x => x.name === 'app2_cs_vs')!;
            const newApp = appsRx.find(x => x.name === 'app2_cs_vs')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('https_offload_vs', async () => {

            const origApp = apps.find(x => x.name === 'https_offload_vs')!;
            const newApp = appsRx.find(x => x.name === 'https_offload_vs')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('app2_http_vs', async () => {

            const origApp = apps.find(x => x.name === 'app2_http_vs')!;
            const newApp = appsRx.find(x => x.name === 'app2_http_vs')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('bottle.gslb.f5flipper.com', async () => {

            const origApp = apps.find(x => x.name === 'bottle.gslb.f5flipper.com')!;
            const newApp = appsRx.find(x => x.name === 'bottle.gslb.f5flipper.com')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('ctx1.gslb.f5flipper.com', async () => {

            const origApp = apps.find(x => x.name === 'ctx1.gslb.f5flipper.com')!;
            const newApp = appsRx.find(x => x.name === 'ctx1.gslb.f5flipper.com')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('dorsal.gslb.f5flipper.com', async () => {

            const origApp = apps.find(x => x.name === 'dorsal.gslb.f5flipper.com')!;
            const newApp = appsRx.find(x => x.name === 'dorsal.gslb.f5flipper.com')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('echo.gslb.f5flipper.com', async () => {

            const origApp = apps.find(x => x.name === 'echo.gslb.f5flipper.com')!;
            const newApp = appsRx.find(x => x.name === 'echo.gslb.f5flipper.com')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('smtp.gslb.f5flipper.com', async () => {

            const origApp = apps.find(x => x.name === 'smtp.gslb.f5flipper.com')!;
            const newApp = appsRx.find(x => x.name === 'smtp.gslb.f5flipper.com')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('stp.gslb.f5flipper.com-http-vs', async () => {

            const origApp = apps.find(x => x.name === 'stp.gslb.f5flipper.com-http-vs')!;
            const newApp = appsRx.find(x => x.name === 'stp.gslb.f5flipper.com-http-vs')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('stp.gslb.f5flipper.com-http-vs-failover', async () => {

            const origApp = apps.find(x => x.name === 'stp.gslb.f5flipper.com-http-vs-failover')!;
            const newApp = appsRx.find(x => x.name === 'stp.gslb.f5flipper.com-http-vs-failover')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('stp.gslb.f5flipper.com-ssl-vs', async () => {

            const origApp = apps.find(x => x.name === 'stp.gslb.f5flipper.com-ssl-vs')!;
            const newApp = appsRx.find(x => x.name === 'stp.gslb.f5flipper.com-ssl-vs')!;

            assert.deepStrictEqual(newApp, origApp);
        });

        it('stp.gslb.f5flipper.com-ssl-vs-failover', async () => {

            const origApp = apps.find(x => x.name === 'stp.gslb.f5flipper.com-ssl-vs-failover')!;
            const newApp = appsRx.find(x => x.name === 'stp.gslb.f5flipper.com-ssl-vs-failover')!;

            assert.deepStrictEqual(newApp, origApp);
        });



    });



});
