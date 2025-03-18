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

describe('Namaste App tests', function () {

  let adc: ADC;
  let expld: Explosion;
  let log;
  let err;

  before(async function () {
    // log test file name - makes it easer for troubleshooting
    console.log('       file:', __filename)
    testFile = await archiveMake('namaste.conf') as string;
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



  it(`basic serviceGroup reference (spaces in name)`, async () => {

    // cs -> bind ssl vserver groot-cs-vsvr -certkeyName star.groot.cer

    // get application we are looking for
    const app = expld.config.apps?.find(x => x.name === '"namaste 443 vip"')

    // get the serviceGroup details
    const appServiceGroup = app!.bindings!.serviceGroup![0]

    assert.deepStrictEqual(appServiceGroup.name, '"namaste 8443 svg"');

  })


  it(`serviceGroup with Multiple Detailed Monitors`, async () => {

    // lb -> bind ssl vserver starlord_offload_lb_vs -certkeyName starlord.galaxy.io_cert

    const app = expld.config.apps?.find(x => x.name === '"namaste 443 vip"');

    // get the cert details
    const appServiceGroupMonitors = app?.bindings?.serviceGroup![0].monitors;

    // serviceGroup Monitors
    assert.deepStrictEqual(appServiceGroupMonitors, [
        {
          name: "namaste_custome_tcp_mon",
          "-LRTM": "DISABLED",
          "-interval": "30",
          "-resptimeout": "15",
          "-secure": "YES",
        },
        {
          name: "namaste_awaken_http8443_mon",
          "-send": "GET /look/within",
          "-recv": "\\\"find\\\":love",
          "-LRTM": "DISABLED",
          "-secure": "YES",
        },
    ])
  })


  it(`serviceGroup servers count`, async () => {

    // get application we are looking for
    const app = expld.config.apps?.find(x => x.name === '"namaste 443 vip"');

    // get a serviceGroup server details
    const appServiceGroupServers = app?.bindings?.serviceGroup![0].servers;

    const appServiceGroupServersLength = appServiceGroupServers?.length

    // serviceGroup Monitors
    assert.deepStrictEqual(appServiceGroupServersLength, 6)
  })

  it(`serviceGroup server details with disabled`, async () => {

    // get application we are looking for
    const app = expld.config.apps?.find(x => x.name === '"namaste 443 vip"');

    // get a serviceGroup server details
    const appServiceGroupServers = app?.bindings?.serviceGroup![0].servers;

    // filter out bb8-01 server details
    const appServiceGroupServer = appServiceGroupServers?.find(x => x.name === 'dragonfly1.yoga.in')

    // serviceGroup Monitors
    assert.deepStrictEqual(appServiceGroupServer, {
      name: "dragonfly1.yoga.in",
      port: "8443",
      address: "10.240.24.215",
      "-state": "DISABLED",
    })
  })


});