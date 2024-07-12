
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
    ExtensionContext,
    Webview
} from 'vscode';

import { readFileSync } from 'fs';

import { ext } from './extensionVariables';
import { logger } from './logger';
import { AdcApp, NsFastTempParams } from './models';
import { mungeNS2FAST } from './ns2FastParams';
// import { NsCfgApp } from './nsCfgViewProvider';


const fast = require('@f5devcentral/f5-fast-core');

type HttpResponse = '';

export class FastWebViewFull {

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
        this.f5css = Uri.joinPath(ctx.extensionUri, 'styles', 'f5.css');
        this.baseFilePath = Uri.joinPath(ctx.extensionUri, 'styles', 'reset.css');
        this.vscodeStyleFilePath = Uri.joinPath(ctx.extensionUri, 'styles', 'vscode.css');
        this.customStyleFilePath = Uri.joinPath(ctx.extensionUri, 'styles', 'rest-client.css');

        const localPath = ctx.asAbsolutePath('templates');
        this.fastEngine = new fast.FsTemplateProvider(localPath);
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

    // /**
    //  * Renders the output of a FAST template with the provided parameters
    //  * @param tempParams FAST Template parameters
    //  * @param template FAST Template to render
    //  * @returns 
    //  */
    // async renderAS3(tempParams: unknown, template?: string) {
    //     /**
    //      * take params from panel submit button
    //      * process through fast with template
    //      * then display in new editor to the right...
    //      */

    //     // const nsAppProtocol = tempParams.protocol;

    //     // if (nsAppProtocol) {

    //     //     template = `as3/${nsAppProtocol}`
    //     // }

    //     logger.info(`ns app FAST Template params: `, tempParams);

    //     const as3 = await this.fastEngine.fetch(template)
    //         .then((template) => {
    //             const as3 = template.render(tempParams);
    //             return as3;
    //         });

    //     return as3;

    // }



    /**
     * Renders FAST template HTML output with NS app details as input parameters
     * @param doc vscode document object
     * @param template FAST template to render HTML
     */
    public async baseHTML(app: AdcApp, template?: string) {

        // 1. 

        const htmlFile = Uri.joinPath(this.ctx.extensionUri, 'flipWebviewFull', 'index.html');
        // let html = readFileSync(htmlFile.path).toString();
        // let html = this._getHtmlForWebview();



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
                    // this.panelResponses.delete(panel);
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
                const template = this.selectedTemplate;

                debugger;


            });

            this.panels.push(panel);
        } else {
            panel = this.panels[this.panels.length - 1];
            panel.title = title;
        }

        let html = this._getHtmlForWebview(panel, app);

        // Content Security Policy
        // const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        // const csp = this.getCsp(nonce);

        const htmlSubmitBtn = `
(function init() {
    const vscode = acquireVsCodeApi();
    document.vscode = vscode;
})();
</script>
<button onclick="vscode.postMessage(editor.getValue())">Render</button>
<p></p>
        `;

        // let = ''

        // html += htmlSubmitBtn;
        panel.webview.html = html;
        panel.reveal(viewColumn, !preserveEditorFocus);
        this.activePanel = panel;

    }

    // private getCsp(nonce: string): string {
    //     return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource:;">`;
    // }

    private _getHtmlForWebview(webview: WebviewPanel, app: AdcApp) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = Uri.joinPath(this.ctx.extensionUri, 'out', 'webview.js');

        const require = 'node_modules/monaco-editor/min/vs'
        const monocoLoader = Uri.joinPath(this.ctx.extensionUri, require, 'loader.js');
        const monocoEditorNls = Uri.joinPath(this.ctx.extensionUri, require, 'editor', 'editor.main.nls.js');
        const monocoEditor = Uri.joinPath(this.ctx.extensionUri, require, 'editor', 'editor.main.js');

        // And the uri we use to load this script in the webview
        const scriptUri = webview.webview.asWebviewUri(scriptPathOnDisk);

        const monocoLoaderUri = webview.webview.asWebviewUri(monocoLoader);
        const monocoEditorNlsUri = webview.webview.asWebviewUri(monocoEditorNls);
        const monocoEditorUri = webview.webview.asWebviewUri(monocoEditor);
        const reqUri = webview.webview.asWebviewUri(Uri.joinPath(this.ctx.extensionUri, require));

		// Local path to css styles
		const styleResetPath = Uri.joinPath(this.ctx.extensionUri, 'flipWebviewFull', 'reset.css');
        const stylesPathMainPath = Uri.joinPath(this.ctx.extensionUri, 'flipWebviewFull', 'vscode.css');

        // Uri to load styles into webview
        const stylesResetUri = webview.webview.asWebviewUri(styleResetPath);
        const stylesMainUri = webview.webview.asWebviewUri(stylesPathMainPath);

        const csp = webview.webview.cspSource

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        const appParams = mungeNS2FAST(app);
        const appLines = app.lines.join('\n');
        const appJson = JSON.parse(JSON.stringify(app));
        delete appJson.diagnostics;
        delete appJson.lines;


        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->


				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>Cat Coding</title>
			</head>
			<body>
            <section>

 
            <!-- Text field with active tab -->
            <p>NS Config Flipper</p>
            <vscode-panels activeid="tab-2" aria-label="With Active Tab">
              
              <vscode-panel-tab id="tab-1">NS.conf</vscode-panel-tab>
              <vscode-panel-tab id="tab-2">NS.json</vscode-panel-tab>
              <vscode-panel-tab id="tab-3">Template Params</vscode-panel-tab>
              <vscode-panel-tab id="tab-4">Template</vscode-panel-tab>
              <vscode-panel-tab id="tab-5">Output</vscode-panel-tab>
      
              <vscode-panel-view id="view-1">
                NetScaler app config lines\n\n${appLines}
    
                <script>
                    var editor = monaco.editor.create(document.getElementById('view-4'), {
                        value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
                        language: 'javascript'
                    });
                </script>

              </vscode-panel-view>
              <vscode-panel-view id="view-2">
                NetScaler app config as json\n\n${JSON.stringify(appJson, undefined, 4)}
              </vscode-panel-view>
              <vscode-panel-view id="view-3">
                Template Parameters\n\n${JSON.stringify(appParams, undefined, 4)}
              </vscode-panel-view>
              <vscode-panel-view id="view-4">
                Template
              </vscode-panel-view>
              <vscode-panel-view id="view-5">
                Template Output
              </vscode-panel-view>
            </vscode-panels>
      
      
          <!-- Component registration code -->
          <script>
          var require = { paths: { vs: '${reqUri}' } };
          </script>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
          <script type="module" nonce="${nonce}" src="${monocoLoaderUri}"></script>
          <script type="module" nonce="${nonce}" src="${monocoEditorNlsUri}"></script>
          <script type="module" nonce="${nonce}" src="${monocoEditorUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}