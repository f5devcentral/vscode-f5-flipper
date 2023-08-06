
'use strict';

import {
    commands,
    EndOfLine,
    ExtensionContext,
    languages,
    Position,
    Range,
    Selection,
    window
} from 'vscode';
import fs from 'fs';
import { isObject } from 'f5-conx-core';
import { logger } from './logger';
import { ext } from './extensionVariables';

import fast from '@f5devcentral/f5-fast-core';
import path from 'path';
import { FastWebView } from './fastWebView';

/**
 * Provides command to download github releases of this extension so users can easily access beta versions for testing
 */
export class FastCore {
    fastEngine: any;
    panel: FastWebView;

    constructor(ctx: ExtensionContext) {

        this.panel = new FastWebView(ctx);


        ctx.subscriptions.push(commands.registerCommand('f5-flipper.convert2AS3', async (doc) => {

            ext.telemetry.capture({ command: 'f5-flipper.convert2AS3' });

            window.showInformationMessage('conversion outputs are in development!')

            logger.info('f5-flipper.convert2AS3, pulling up fast template');

            this.panel.renderHTML(doc);

        }));
    }

}



const exampleFastTemplate = `
title: Simple UDP Application
description: Simple UDP load balancer using the same port on client and server side.
parameters:
  tenant_name: AgilityFastTemplate
  application_name: defaultsUDP_5555
  virtual_address: 192.50.2.1
  virtual_port: 5555
  server_addresses:
    - 192.50.2.2
    - 192.50.2.3
  service_port: 8888
definitions:
  tenant_name:
    title: Tenant Name
    type: string
    description: partition on bigip
template: |
  {
    "class": "ADC",
    "schemaVersion": "3.20.0",
    "{{tenant_name}}": {
      "class": "Tenant",
      "{{application_name}}": {
        "class": "Application",
        "template": "udp",
        "serviceMain": {
          "class": "Service_UDP",
          "virtualAddresses": [
            "{{virtual_address}}"
          ],
          "virtualPort": {{virtual_port::integer}},
          "pool": "{{application_name}}_Pool1"
        },
        "{{application_name}}_Pool1": {
          "class": "Pool",
          "monitors": [
            "icmp"
          ],
          "members": [
            {
              "serverAddresses": {{server_addresses::array}},
              "servicePort": {{service_port::integer}}
            }
          ]
        }
      }
    }
  }`;