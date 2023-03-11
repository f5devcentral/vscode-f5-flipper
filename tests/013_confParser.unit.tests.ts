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
import ADC from '../src/CitrixADC'

const events = [];

// const testFile = path.join(__dirname, "../example_configs/ns1_v13.1.conf")
const testFile = path.join(__dirname, "../example_configs/t1.ns.conf")

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('NS Conf parser unit tests', function () {


    let adc: ADC;
    let log;
    let err;

    before(function () {
        // log test file name - makes it easer for troubleshooting
        console.log('       file:', __filename)
        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

    });

    afterEach(function () {
        events.length = 0;
    })



    it('parse simple v13.1 ns config', async () => {

        adc = new ADC();

        adc.on('parseFile', x => {
            parsedFileEvents.push(x)
            // console.log('parseFile', x)
        })
        adc.on('parseObject', x => {
            parsedObjEvents.push(x)
            // console.log('parseObject', x)
        })

        await adc.loadParseAsync(testFile)
        .then( x => {
            // just here for a spot to put a breaking point
            assert.deepStrictEqual(x, undefined)
            // fs.writeFileSync(`${outFile}.xml.json`, JSON.stringify(device.deviceXmlStats, undefined, 4));
        })
        .catch( y => {
            err = y;
            log = adc.logs()
            debugger;
        })
        
        await adc.explode()
        .then( expld => {
            debugger;
        })
        .catch( thisErr => {
            err = thisErr;
            log = adc.logs();
            debugger;
        });

    })



});