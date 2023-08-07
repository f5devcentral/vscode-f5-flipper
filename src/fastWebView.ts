
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

const fast = require('@f5devcentral/f5-fast-core');

type HttpResponse = '';

export class FastWebView {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();
    protected readonly panels: WebviewPanel[] = [];
    private showResponseInDifferentTab = false;
    protected activePanel: WebviewPanel | undefined;
    protected fastTemplateYml: string | undefined;
    protected fastEngine: any | undefined;

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

    async renderAS3(tempParams: string) {
        /**
         * take params from panel submit button
         * process through fast with template
         * then display in new editor to the right...
         */

        const as3 = await this.fastEngine.fetch('ns/http').then((template) => {
            const as3 = template.render(tempParams);
            return as3;
        });

        return as3;

    }


    public async renderHTML(doc: TextDocument) {
        // future options detect tcp/udp/http/https/gslb, render the appropriate template

        // merget document values with template values/defaults

        // invalidate the cache to load any template changes
        this.fastEngine.invalidateCache();

        // load the fast template
        let html = await this.fastEngine.fetch('ns/http')
            .then((template) => {
                // get the schema for the template
                const schema = template.getParametersSchema();
                // get the default values for the template
                const defaultParams = template.getCombinedParameters();

                // get ns app params from the document
                const nsAppParams = JSON.parse(doc.getText());

                // map the ns app params to the fast template params
                defaultParams.tenant_name = nsAppParams.name;
                defaultParams.app_name = nsAppParams.name;
                defaultParams.type = nsAppParams.type;
                defaultParams.protocol = nsAppParams.protocol;
                defaultParams.virtual_address = nsAppParams.ipAddress;
                defaultParams.virtual_port = nsAppParams.port;

                if (nsAppParams.bindings?.serviceGroup) {
                    defaultParams.pool_members = [];
                    nsAppParams.bindings.serviceGroup[0]?.servers.forEach((server: any) => {
                        defaultParams.pool_members.push({
                            serverAddress: server.address,
                            servicePort: server.port
                        });
                    });
                }


                // generate the html preview
                let html: string = fast.guiUtils.generateHtmlPreview(schema, defaultParams);

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


                try {
                    const final = await this.renderAS3(message);
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


        const htmlSubmitBtn = `
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