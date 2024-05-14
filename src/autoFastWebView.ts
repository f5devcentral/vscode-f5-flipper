
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
        // this.f5css = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'f5.css')));
        // this.baseFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'reset.css')));
        // this.vscodeStyleFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'vscode.css')));
        // this.customStyleFilePath = Uri.file(this.ctx.asAbsolutePath(path.join('styles', 'rest-client.css')));

        const localPath = ctx.asAbsolutePath('templates');
        this.fastEngine = new fast.FsTemplateProvider(localPath)
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

                // merge with FAST template default params
                const fastParams = Object.assign(defaultParams, {})

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
                // const temp = this.mungeNS2FAST(app);

                // merge with FAST template default params
                const fastParams = Object.assign(defaultParams, template)

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