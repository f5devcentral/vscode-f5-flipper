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

describe('service abstraction tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let log;
    let err;

    before(async function () {
        // log test file name - makes it easer for troubleshooting
        console.log('       file:', __filename)
        testFile = await archiveMake() as string;
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
                log = adc.logs()
                debugger;
            })

    });

    afterEach(function () {
        events.length = 0;
    })



    it(`basic service reference`, async () => {

        // this app should have three different service bindings and 15 total line of config

        // get application we are looking for
        const app = expld.config.apps?.find(x => x.name === "\"1 APPLE_443_HTTPS\"")

        assert.deepStrictEqual(app!.bindings!.service!.length, 3, "should have three service bindings")
        assert.deepStrictEqual(app!.lines!.length, 15, "should have 15 total lines of ns config")
        
    })


});