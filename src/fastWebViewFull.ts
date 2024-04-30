
import {
    WebviewPanel,
    window,
    Range,
    commands,
    ViewColumn,
    EventEmitter,
    Event,
    Uri,
    Position,
    workspace,
    TextDocument,
    ExtensionContext
} from 'vscode';

import { ext } from './extensionVariables';
import { logger } from './logger';
import fast from '@f5devcentral/f5-fast-core';
import path from 'path';
import { AdcApp, NsFastTempParams } from './models';

const fast = require('@f5devcentral/f5-fast-core');

type HttpResponse = '';

export class FastWebView {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();
    protected readonly panels: WebviewPanel[] = [];
    private showResponseInDifferentTab = false;
    protected activePanel: WebviewPanel | undefined;
    protected fastTemplateYml: string | undefined;
    protected fastEngine: any | undefined;
    protected selectedTemplate: string | undefined;

    private readonly panelResponses: Map<WebviewPanel, HttpResponse>;
    ctx: ExtensionContext;
    f5css: Uri;
    baseFilePath: Uri;
    vscodeStyleFilePath: Uri;
    customStyleFilePath: Uri;

    public constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
        this.f5css = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'f5.css')));
        this.baseFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'reset.css')));
        this.vscodeStyleFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'vscode.css')));
        this.customStyleFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'rest-client.css')));

        const localPath = ctx.asAbsolutePath('templates');
        this.fastEngine = new fast.FsTemplateProvider(localPath)
        // this.fastEngine = new fast.
        localPath;
    }

    public get onDidCloseAllWebviewPanels(): Event<void> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected get previewActiveContextKey(): string {
        return 'httpResponsePreviewFocus';
    }

    protected setPreviewActiveContext(value: boolean) {
        commands.executeCommand('setContext', this.previewActiveContextKey, value);
    }

    /**
     * Renders the output of a FAST template with the provided parameters
     * @param tempParams FAST Template parameters
     * @param template FAST Template to render
     * @returns 
     */
    async renderAS3(tempParams: unknown, template?: string) {
        /**
         * take params from panel submit button
         * process through fast with template
         * then display in new editor to the right...
         */

        // const nsAppProtocol = tempParams.protocol;

        // if (nsAppProtocol) {

        //     template = `as3/${nsAppProtocol}`
        // }

        logger.info(`ns app FAST Template params: `, tempParams);

        const as3 = await this.fastEngine.fetch(template)
            .then((template) => {
                const as3 = template.render(tempParams);
                return as3;
            });

        return as3;

    }

    /**
     * mutate ns app json to a form easier for FAST/mustache to work with
     * @param nsApp NS app as json
     */
    mungeNS2FAST(nsApp: AdcApp) {

        if (nsApp.fastTempParams) {

            // if we already have the munged params, send those since they could have been modified by the user
            return nsApp.fastTempParams

        } else {

            // map the ns app params to the fast template params
            const nsFastJson: NsFastTempParams = {
                tenant_name: nsApp.name,
                app_name: nsApp.name,
                type: nsApp.type,
                protocol: nsApp.protocol,
                virtual_address: nsApp.ipAddress,
                virtual_port: nsApp.port,
                pool_members: []
            };

            if (nsApp?.opts?.['-persistenceType']) {
                const persistType = nsApp.opts['-persistenceType'] as string;
                nsFastJson.persistence = { [persistType]: persistType }
            }

            if (nsApp?.opts?.['-lbMethod']) {
                const lbMethod = nsApp.opts['-lbMethod'] as string;
                nsFastJson.lbMethod = { [lbMethod]: lbMethod }
            }

            if (nsApp?.opts?.['-cltTimeout']) {
                const cltTimeout = nsApp.opts['-cltTimeout'] as string;
                nsFastJson.cltTimeout = { [cltTimeout]: cltTimeout }
            }

            if (nsApp?.opts?.['-timeout']) {
                const timeout = nsApp.opts['-timeout'] as string;
                nsFastJson.timeout = { [timeout]: timeout }
            }

            if (nsApp?.opts?.['-redirectURL']) {
                const redirectURL = nsApp.opts['-redirectURL'] as string;
                nsFastJson.redirectURL = { redirectURL }
            }

            if (nsApp?.opts?.['-backupVServer']) {
                const backupVServer = nsApp.opts['-backupVServer'] as string;
                nsFastJson.backupVServer = { [backupVServer]: backupVServer }
            }

            if (nsApp?.opts?.['-tcpProfileName']) {
                const tcpProfileName = nsApp.opts['-tcpProfileName'] as string;
                nsFastJson.tcpProfileName = { [tcpProfileName]: tcpProfileName }
            }


            // capture all the service bindings (similar to f5 nodes)
            if (nsApp.bindings?.service) {

                // loop through service bindings to populate pool members
                for (const service of nsApp.bindings.service) {
                    // @ts-expect-error
                    nsFastJson.pool_members.push(service);
                }
            }

            // capture all the serviceGroup bindings (more like f5 pool + members)
            if (nsApp.bindings?.serviceGroup && nsApp.bindings.serviceGroup.length > 0) {

                if (nsApp.bindings.serviceGroup[0]?.servers)

                    // todo: extend this to loop through service group for all servers
                    for (const servers of nsApp.bindings.serviceGroup[0].servers) {
                        // @ts-expect-error
                        nsFastJson.pool_members.push(servers);
                    };
            }

            if (nsFastJson.pool_members) {

                // remap pool member details to make it easier for FAST to key off details
                nsFastJson.pool_members = nsFastJson.pool_members.map(poolMember => {

                    // create new object
                    const tempMemberObj: any = {};

                    if (poolMember.hostname) {
                        const hsTemp = poolMember.hostname;
                        tempMemberObj.hostname = {
                            hostname: hsTemp
                        }
                    }

                    if (poolMember.address) {
                        tempMemberObj.address = { address: poolMember.address }
                    }

                    if (poolMember.name) tempMemberObj.name = { name: poolMember.name }
                    if (poolMember.port) tempMemberObj.port = { port: poolMember.port }

                    // overwrite the new member details
                    // we do this to leave behind all the other "-opts" that aren't strickly necessary for FAST templates
                    // if they are needed, they should be added to get mapped here or else they show in the HTML output
                    return tempMemberObj;
                })
            }

            // if no pool members, remove empty array
            if (nsFastJson.pool_members.length === 0) delete nsFastJson.pool_members;

            // return the new params
            return nsFastJson;

        }
    }


    public async autoRenderHTML(app: AdcApp) {


        // invalidate the cache to load any template changes
        this.fastEngine.invalidateCache();

        const nsAppProtocol = app.protocol;
        let template = ''

        if (nsAppProtocol) {

            template = `as3/${nsAppProtocol}`
        }

        // load the fast template
        let html = await this.fastEngine.fetch(template)
            .then((template) => {
                // get the schema for the template
                const schema = template.getParametersSchema();
                // get the default values for the template
                const defaultParams = template.getCombinedParameters();

                // // get ns app params from the document
                // const nsAppParams = JSON.parse(doc.getText());

                // mutate ns app params into a better format for FAST templates
                const temp = this.mungeNS2FAST(app);

                // merge with FAST template default params
                const fastParams = Object.assign(defaultParams, temp)

                logger.debug(`ns app ${app.name} FAST Template params: `, fastParams);

                // generate the html preview
                let html: string = fast.guiUtils.generateHtmlPreview(schema, fastParams)

                return html;
            })
            .catch(e => {
                logger.error(e);
            });

        // Content Security Policy
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        const csp = this.getCsp(nonce);

        const panel = window.createWebviewPanel(
            'fast autoHTMLrender webView',
            'title',
            { viewColumn: 1, preserveFocus: false },
            {
                enableFindWidget: true,
                enableScripts: true,
                retainContextWhenHidden: true
            });

        panel.webview.onDidReceiveMessage(async message => {
            console.log(message);

            // get fast template
            const template = this.selectedTemplate

            try {
                const final = await this.renderAS3(message, template);
                return final
            } catch (e) {
                logger.error(e);
                // window.showErrorMessage(e.message);
            }

        });

        const autoRenderHtml = `
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.vscodeStyleFilePath)}">
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


    /**
     * Renders FAST template HTML output with NS app details as input parameters
     * @param doc vscode document object
     * @param template FAST template to render HTML
     */
    public async renderHTML(app: AdcApp, template: string) {



        const nsAppProtocol = app.protocol;

        if (nsAppProtocol) {

            template = `as3/${nsAppProtocol}`
        }

        // merget document values with template values/defaults

        // save template name so we can fetch it during render
        this.selectedTemplate = template;

        logger.debug(`converting ns app ${app.name} with FAST Template ${template}`)

        // invalidate the cache to load any template changes
        this.fastEngine.invalidateCache();

        // const fe = this.fastEngine;

        // load the fast template
        let html = await this.fastEngine.fetch(template)
            .then((template) => {
                // get the schema for the template
                const schema = template.getParametersSchema();
                // get the default values for the template
                const defaultParams = template.getCombinedParameters();

                // // get ns app params from the document
                // const nsAppParams = JSON.parse(doc.getText());

                // mutate ns app params into a better format for FAST templates
                const temp = this.mungeNS2FAST(app);

                // merge with FAST template default params
                const fastParams = Object.assign(defaultParams, temp)

                logger.debug(`ns app ${app.name} FAST Template params: `, fastParams);

                // generate the html preview
                let html: string = fast.guiUtils.generateHtmlPreview(schema, fastParams)

                return html;
            })
            .catch(e => {
                logger.error(e);
            });



        let title = 'NS App -> FAST AS3';

        const newEditorColumn = ext.settings.previewColumn;
        const preserveEditorFocus = ext.settings.preserveEditorFocus;
        const newEditorTabForAll = ext.settings.newEditorTabForAll;
        let viewColumn: ViewColumn | undefined;

        viewColumn = viewColumn ? viewColumn : newEditorColumn;

        let panel: WebviewPanel;
        if (this.showResponseInDifferentTab || this.panels.length === 0) {
            panel = window.createWebviewPanel(
                'fast webView',
                title,
                { viewColumn: viewColumn, preserveFocus: !preserveEditorFocus },
                {
                    enableFindWidget: true,
                    enableScripts: true,
                    retainContextWhenHidden: true
                });

            panel.onDidDispose(() => {
                if (panel === this.activePanel) {
                    this.setPreviewActiveContext(false);
                    this.activePanel = undefined;
                }

                const index = this.panels.findIndex(v => v === panel);
                if (index !== -1) {
                    this.panels.splice(index, 1);
                    this.panelResponses.delete(panel);
                }
                if (this.panels.length === 0) {
                    this._onDidCloseAllWebviewPanels.fire();
                }
            });

            panel.onDidChangeViewState(({ webviewPanel }) => {
                const active = this.panels.some(p => p.active);
                this.setPreviewActiveContext(active);
                this.activePanel = webviewPanel.active ? webviewPanel : undefined;
            });

            panel.webview.onDidReceiveMessage(async message => {
                console.log(message);

                // get fast template
                const template = this.selectedTemplate

                try {
                    const final = await this.renderAS3(message, template);
                    var vDoc: Uri = Uri.parse("untitled:" + 'nsApp.as3.json');
                    workspace.openTextDocument(vDoc)
                        .then((a: TextDocument) => {
                            window.showTextDocument(a, undefined, false).then(async e => {
                                await e.edit(async edit => {
                                    const startPosition = new Position(0, 0);
                                    const endPosition = a.lineAt(a.lineCount - 1).range.end;
                                    edit.replace(new Range(startPosition, endPosition), final);
                                    await commands.executeCommand("cursorTop");
                                    // await commands.executeCommand("f5.injectSchemaRef");

                                });
                            });
                        });
                } catch (e) {
                    logger.error(e);
                    // window.showErrorMessage(e.message);
                }

            });

            this.panels.push(panel);
        } else {
            panel = this.panels[this.panels.length - 1];
            panel.title = title;
        }


        // Content Security Policy
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        const csp = this.getCsp(nonce);

        //     const head = `
        // <head>
        // <meta charset="UTF-8">
        // <meta name="viewport" content="width=device-width, initial-scale=1.0">
        // <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.baseFilePath)}">
        // <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.vscodeStyleFilePath)}">
        // <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.customStyleFilePath)}">
        // <title>template title</title>
        // </head>`

        // html = html.replace(/<head>\n[\S\s]+<\/head>\n/, head);
        // const html2 = html.replace(/ <head>\n[\S\s]+?\n +<\//, '');

        /**
         * Appends the necessary stuff for submit button and getting template params
         * move the following to it's own function
         */

        // f5 UI css for fast templates
        // <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.f5css)}">

        // <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.f5css)}">

        const htmlSubmitBtn = `
<link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.vscodeStyleFilePath)}">
<script>
(function init() {
    const vscode = acquireVsCodeApi();
    document.vscode = vscode;
})();
</script>
<button onclick="vscode.postMessage(editor.getValue())">Render</button>
<p></p>
        `;

        html += htmlSubmitBtn;
        panel.webview.html = html;
        panel.reveal(viewColumn, !preserveEditorFocus);
        this.activePanel = panel;

    }

    // private getSettingsOverrideStyles(width: number): string {
    //     return [
    //         '<style>',
    //         // (this.settings.fontFamily || this.settings.fontSize || this.settings.fontWeight ? [
    //         //     'code {',
    //         //     this.settings.fontFamily ? `font-family: ${this.settings.fontFamily};` : '',
    //         //     this.settings.fontSize ? `font-size: ${this.settings.fontSize}px;` : '',
    //         //     this.settings.fontWeight ? `font-weight: ${this.settings.fontWeight};` : '',
    //         //     '}',
    //         // ] : []).join('\n'),
    //         'code .line {',
    //         `padding-left: calc(${width}ch + 20px );`,
    //         '}',
    //         'code .line:before {',
    //         `width: ${width}ch;`,
    //         `margin-left: calc(-${width}ch + -30px );`,
    //         '}',
    //         '.line .icon {',
    //         `left: calc(${width}ch + 3px)`,
    //         '}',
    //         '.line.collapsed .icon {',
    //         `left: calc(${width}ch + 3px)`,
    //         '}',
    //         '</style>'].join('\n');
    // }

    private getCsp(nonce: string): string {
        return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource:;">`;
    }
}