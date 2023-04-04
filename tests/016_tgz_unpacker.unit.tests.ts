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
import { Explosion } from '../src/models';

const events = [];

// const testFile = path.join(__dirname, "../example_configs/ns1_v13.1.conf")
const testFile = path.join(__dirname, "../example_configs/t1.ns.tgz")

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('tgz unpacker tests', function () {


    let adc: ADC;
    let exp: Explosion;
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



    it(`unpack tgz and parse test ns config: ${testFile}`, async () => {

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
            .then(x => {
                // just here for a spot to put a breaking point
                assert.deepStrictEqual(x, undefined)
                // fs.writeFileSync(`${outFile}.xml.json`, JSON.stringify(device.deviceXmlStats, undefined, 4));
            })
            .catch(y => {
                err = y;
                log = adc.logs()
                debugger;
            })

        await adc.explode()
            .then(expld => {
                exp = expld
            })
            .catch(thisErr => {
                err = thisErr;
                log = adc.logs();
                debugger;
            });

        // debugger;

    })


    it(`confirm general explosion object structure`, async () => {

        assert.ok(exp.config)
        assert.ok(exp.dateTime)
        assert.ok(exp.id)
        assert.ok(exp.inputFileType)
        assert.ok(exp.logs)
        assert.ok(exp.stats)

    })

    it(`rejects bad.file from parsing`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, '..', 'example_configs', 'bad.file')

        const resp = adc.loadParseAsync(badFile)

        assert.rejects(resp, 'should reject the promise since the file is not supported/bad')

    })

    it(`rejects bad1.tgz from parsing`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, '..', 'example_configs', 'bad1.tgz')

        const resp = adc.loadParseAsync(badFile)

        assert.rejects(resp, 'should reject the promise since the file is not supported/bad')

    })

    it(`rejects non-existent file`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, 'no.file')

        const resp = adc.loadParseAsync(badFile)

        assert.rejects(resp, 'should reject the promise since the file is not found')

    })

    it(`rejects *.conf file it cannot find`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, 'no.conf')

        const resp = adc.loadParseAsync(badFile)

        assert.rejects(resp, 'should reject the promise since the file is not found')

    })

    it(`rejects .conf file with no ns config`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, '..', 'example_configs', 'noApps.ns.conf')

        const resp = adc.loadParseAsync(badFile)
            .then(async x => {
                exp = await adc.explode();
                const z = x;
            })
            .catch(e => {
                err = e;
                return e;
            })

        assert.rejects(resp, 'should reject the promise since the file is not found')

    })

    it(`rejects .conf file with no ns config and no ns version`, async () => {

        adc = new ADC();

        const badFile = path.join(__dirname, '..', 'example_configs', 'noAppsNoVersion.ns.conf')

        const resp = adc.loadParseAsync(badFile)
            .catch(e => {
                err = e;
                return e;
            })

        assert.rejects(resp, 'should reject the promise since the file is not found')

    })



});