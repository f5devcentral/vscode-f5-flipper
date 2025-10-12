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

describe('ssl certificate tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let log;
    let err;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
        
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
                // log = adc.logs()
                debugger;
            })

    });

    afterEach(function () {
        events.length = 0;
    })



    it(`cs ssl cert binding`, async () => {

        // cs -> bind ssl vserver groot-cs-vsvr -certkeyName star.groot.cer

        // get application we are looking for
        const app = expld.config.apps?.find(x => x.name === 'groot-cs-vsvr')

        // get the cert details
        const appCert = app?.bindings?.certs![0]

        assert.deepStrictEqual(appCert, {
            "-cert": "www.star.groot_2022.pfx",
            "-key": "www.star.groot_2022.pfx",
            "-inform": "PFX",
            "-passcrypt": "XXXX",
            "-encrypted": "-encryptmethod ENCMTHD_3",
            "-certkeyName": "star.groot.cer",
            "-eccCurveName": [
                "P_256",
                "P_384",
                "P_224",
                "P_521",
            ],
        })

    })


    it(`lb ssl cert binding`, async () => {

        // lb -> bind ssl vserver starlord_offload_lb_vs -certkeyName starlord.galaxy.io_cert

        const app = expld.config.apps?.find(x => x.name === 'starlord_offload_lb_vs');

        // get the cert details
        const appCert = app?.bindings?.certs![0]

        assert.deepStrictEqual(appCert, {
            "-cert": "foo.crt",
            "-key": "foo.key",
            "-cipherName": "ECDHE",
            "-certkeyName": "starlord.galaxy.io_cert",
            "-eccCurveName": [
                "P_256",
                "P_384",
                "P_224",
                "P_521",
            ],
        })
    })

    // it(`vpn? ssl cert binding`, async () => {

    //     // and ssl cert binding?  like a service?
    // })

});