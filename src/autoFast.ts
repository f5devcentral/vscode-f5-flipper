'use strict';

import { 
    ExtensionContext,
    window
} from 'vscode';
import { EventEmitter } from 'events';

import { AdcApp } from './models';
import { As3App } from 'f5-conx-core';
import { logger } from './logger';
import { mungeNS2FAST } from './ns2FastParams';

const fast = require('@f5devcentral/f5-fast-core');


export default class AutoFast extends EventEmitter {
    ctx: ExtensionContext;
    fastEngine: any;


    constructor(ctx: ExtensionContext) {
        super();

        this.ctx = ctx;
        const localPath = ctx.asAbsolutePath('templates');

        this.fastEngine = new fast.FsTemplateProvider(localPath);
        // invalidate the cache to load any template changes
        this.fastEngine.invalidateCache();

        // load template engine with templates
    }

    async fastApps(apps: AdcApp[]): Promise<void> {

        //  loop through each app, load fast template html view which will auto submit and emit the converted apps events

        // loop through each app
        for await (const app of apps) {

            const template = `as3/${app.protocol}`;

            const fastAppP = mungeNS2FAST(app);

            // load the fast template
            let html = await this.fastEngine.fetch(template)
                .then((template) => {
                    // get the schema for the template
                    const schema = template.getParametersSchema();
                    // get the default values for the template
                    const defaultParams = template.getCombinedParameters();

                    // merge with FAST template default params
                    const fastParams = Object.assign(defaultParams, fastAppP)

                    logger.debug(`ns app ${app.name} FAST Template params: `, fastParams);

                    // generate the html preview
                    let html: string = fast.guiUtils.generateHtmlPreview(schema, fastParams)

                    return html;
                })
                .catch(e => {
                    logger.error(e);
                });

            // // Content Security Policy
            // const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
            // const csp = this.getCsp(nonce);


            const panel = window.createWebviewPanel(
                'fastAutoHTMLrenderWebView',
                'fast autoHTMLrender webView',
                { viewColumn: 1, preserveFocus: false },
                {
                    enableFindWidget: true,
                    enableScripts: true,
                    retainContextWhenHidden: true
                });

            panel.webview.onDidReceiveMessage(message => {
                console.log(message);
                this.emit('fastHtmlParams/template', {fastParams: message, template})

            });

            panel.viewType

            const autoRenderHtml = `
                    <script>
                    (function init() {
                        const vscode = acquireVsCodeApi();
                        document.vscode = vscode;
                        vscode.postMessage(editor.getValue())
                    })();
                    </script>
                    <p></p>
                `;


            html += autoRenderHtml;
            panel.webview.html = html;
        }
    }

    // private getCsp(nonce: string): string {
    //     return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource:;">`;
    // }

}