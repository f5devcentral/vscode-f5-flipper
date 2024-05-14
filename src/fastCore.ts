
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
import { logger } from './logger';
import { ext } from './extensionVariables';

import { FastWebView } from './fastWebView';
import { NsTemplateProvider } from './templateViewProvider';
import { FastWebViewFull } from './fastWebViewFull';
import AutoFast from './autoFast';

/**
 * Provides command to download github releases of this extension so users can easily access beta versions for testing
 */
export class FastCore {
  fastEngine: any;
  panel: FastWebView;
  panelFull: FastWebViewFull;

  constructor(ctx: ExtensionContext) {

    this.panel = new FastWebView(ctx);
    this.panelFull = new FastWebViewFull(ctx);

    ctx.subscriptions.push(commands.registerCommand('f5-flipper.flip', async (nsApp) => {

      ext.telemetry.capture({ command: 'f5-flipper.flip' });

      const x = nsApp;

      logger.info('f5-flipper.flip, entering the matrix');

      this.panelFull.baseHTML(nsApp)

      // this.panel.renderHTML(docText, doc.template);

    }));




    ctx.subscriptions.push(commands.registerCommand('f5-flipper.convert2AS3', async (doc) => {

      ext.telemetry.capture({ command: 'f5-flipper.convert2AS3' });

      logger.info('f5-flipper.convert2AS3, pulling up fast template');

      const docText = JSON.parse(doc.document.getText());

      this.panel.renderHTML(docText, doc.template);

    }));


    ext.nsTemplateProvider = new NsTemplateProvider(ctx);
    const templateView = window.createTreeView('nsTemplatesView', {
      treeDataProvider: ext.nsTemplateProvider,
      showCollapseAll: true
    });

    ctx.subscriptions.push(commands.registerCommand('f5-flipper.templateExploreRefresh', async (text) => {
      // logger.info('Refreshing NS FAST Templates view');
      ext.nsTemplateProvider.refresh();
    }));


    ctx.subscriptions.push(commands.registerCommand('f5-flipper.afton', async (text) => {
      // logger.info('Refreshing NS FAST Templates view');

      // gather all the ns apps into an array
      const apps = ext.nsCfgProvider.explosion.config.apps.filter(a => a.type === 'lb' || a.type === 'cs').slice(0, 4);

      const autoF = new AutoFast(ctx);

      const fastAppParams = []

      autoF.on('fastHtmlParams/template', fap => {

        fastAppParams.push(fap);
        fastAppParams;
      })

      await autoF.fastApps(apps);
      // const converted = ext.nsCfgProvider.bulk();

      fastAppParams;

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