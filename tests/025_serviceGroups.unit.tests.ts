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

describe('serviceGroup abstraction tests', function () {

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
        // log = adc.logs()
        debugger;
      })

  });

  afterEach(function () {
    events.length = 0;
  })



  it(`basic serviceGroup reference`, async () => {

    // cs -> bind ssl vserver groot-cs-vsvr -certkeyName star.groot.cer

    // get application we are looking for
    const app = expld.config.apps?.find(x => x.name === 'skree1_vip_RDP')

    // get the serviceGroup details
    const appServiceGroup = app!.bindings!.serviceGroup![0]

    assert.deepStrictEqual(appServiceGroup, {
      name: "skree1_servicegroup_RDP",
      protocol: "RDP",
      "-maxClient": "0",
      "-maxReq": "0",
      "-cip": "DISABLED",
      "-usip": "YES",
      "-useproxyport": "YES",
      "-cltTimeout": "9000",
      "-svrTimeout": "9000",
      "-CKA": "NO",
      "-TCPB": "NO",
      "-CMP": "NO",
      servers: [
        {
          name: "skree1server02",
          port: "*",
          address: "10.10.10.8",
        },
        {
          name: "skree1server01",
          port: "*",
          address: "10.10.10.7",
        },
      ],
    })

  })


  it(`serviceGroup with Multiple Monitors`, async () => {

    // lb -> bind ssl vserver starlord_offload_lb_vs -certkeyName starlord.galaxy.io_cert

    const app = expld.config.apps?.find(x => x.name === 'fn-2187-vip_http');

    // get the cert details
    const appServiceGroupMonitors = app?.bindings?.serviceGroup![0].monitors;

    // serviceGroup Monitors
    assert.deepStrictEqual(appServiceGroupMonitors, [
      {
        name: "HTTP",
      },
      {
        name: "tcp",
      },
      {
        name: "ping",
      },
    ])
  })

});