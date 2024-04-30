/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com or github.com/f5devcentral.
 */

'use strict';

import {
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Event,
    EventEmitter,
    Uri,
    Command,
    window,
    ViewColumn,
    Position,
    workspace,
    TextDocument,
    Range,
    commands,
    MarkdownString,
    ThemeIcon,
    Diagnostic,
    DiagnosticSeverity,
    ExtensionContext,
} from 'vscode';
import { lstatSync, readdirSync } from 'fs';

import { ext } from './extensionVariables';

// import { ConfigFile, Explosion, TmosApp, xmlStats } from 'f5-corkscrew';
import { logger } from './logger';
// import BigipConfig from 'f5-corkscrew/dist/ltm';
import path from 'path';
import ADC from './CitrixADC';

// remodel everything here like this example:  https://github.com/microsoft/vscode-extension-samples/blob/master/tree-view-sample/src/testView.ts
// it will provide a working 'reveal' function and a browsable tmos config tree in the view

/**
 * Tree view provider class that hosts and present the data for the Config Explorer view
 */
export class NsTemplateProvider implements TreeDataProvider<NsCfgApp> {

    private _onDidChangeTreeData: EventEmitter<NsCfgApp | undefined> = new EventEmitter<NsCfgApp | undefined>();
    readonly onDidChangeTreeData: Event<NsCfgApp | undefined> = this._onDidChangeTreeData.event;


    /**
     * trying to use this to make the view in focus after initialization
     */
    viewElement: NsCfgApp | undefined;
    /**
     * parent core flipper class that unpacks/parses and explodes the config
     */
    adc: ADC | undefined;
    /**
     * events from the ADC parsed files to show in UI/OUTPUT
     */
    parsedFileEvents: any = [];

    ctx: ExtensionContext;
    baseTemplatesFolder: string;

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
        this.baseTemplatesFolder = path.join(this.ctx.extensionPath, 'templates')
    }

    async refresh(): Promise<void> {

        logger.info('refreshing FAST templates tree view')



        this._onDidChangeTreeData.fire(undefined);
    }

    clear(): void {

        this.refresh();
    }


    getParent(element: NsCfgApp): NsCfgApp {
        return element;
    }
    getTreeItem(element: NsCfgApp): TreeItem {

        // list all the files in the templates folder
        const files = readdirSync(this.baseTemplatesFolder, { withFileTypes: true });
        return element;
    }

    async getChildren(element?: NsCfgApp): Promise<NsCfgApp[]> {

        // list of view items to display in the UI
        var treeItems: NsCfgApp[] = [];

        if (element) {


            if (element.contextValue === 'templateFolder') {

                // list templates in folder
                const files = readdirSync(path.join(this.baseTemplatesFolder, element.label), { withFileTypes: true });

                files.forEach(file => {
                    // is file or folder?

                    const filePath = path.join(file.path, file.name);
                    const isFile = lstatSync(filePath).isFile();

                    if (isFile) {

                        // create template object
                        // const filePath = path.join(this.ctx.extensionPath, 'templates', 'ns', file.name);
                        treeItems.push(new NsCfgApp(file.name, ``, ``, 'fastTemplate', '', TreeItemCollapsibleState.None, {
                            command: 'vscode.open',
                            title: '',
                            arguments: [Uri.file(filePath)]
                        }));
                    } else {
                        // create folder
                        // treeItems.push(new NsCfgApp(file.name, ``, ``, 'nsFolder', '', TreeItemCollapsibleState.Collapsed));
                    }

                })
            }

        } else {

            treeItems.push(new NsCfgApp('Open Extensions Folder', '', '', '', '', TreeItemCollapsibleState.None,
            { command: 'workbench.extensions.action.openExtensionsFolder', title: '', arguments: [] }));

            // list all the files in the templates folder
            const files = readdirSync(this.baseTemplatesFolder, { withFileTypes: true });

            files.forEach(file => {
                // is file or folder?

                const filePath = path.join(file.path, file.name);
                const isFile = lstatSync(filePath).isFile();

                if (isFile) {

                    console.log('should there be files here?')
                    // create template object
                    // const filePath = path.join(this.ctx.extensionPath, 'templates', 'ns', file.name);
                    // treeItems.push(new NsCfgApp(file.name, ``, ``, 'nsFile', '', TreeItemCollapsibleState.None, {
                    //     command: 'vscode.open',
                    //     title: '',
                    //     arguments: [Uri.file(filePath)]
                    // }));
                } else {
                    // get number of templates in folder
                    const filesCount = readdirSync(path.join(this.ctx.extensionPath, 'templates', file.name))
                    // create folder
                    treeItems.push(new NsCfgApp(file.name, ``, filesCount.length.toString(), 'templateFolder', '', TreeItemCollapsibleState.Expanded));
                }
            })
        }

        return Promise.resolve(treeItems);
    }




    async render(items: any, output: "lines" | "full") {

        const newEditorColumn = ext.settings.previewColumn;
        const editors = window.visibleTextEditors;
        let viewColumn: ViewColumn | undefined;

        let docName = 'app.ns.conf';
        let docContent: string;

        if (Array.isArray(items)) {

            docContent = items.join('\n');

        } else if (output === 'full') {

            docContent = JSON.stringify(items, undefined, 4);
            docName = 'app.ns.json'

        } else if (items.lines && items.name && items.type) {
            // rough test for the type we need

            // deep copy the object
            const brkdwn = JSON.parse(JSON.stringify(items))
            delete brkdwn.lines;    // delete the lines
            const lines = items.lines;  // capture the lines from the original object

            docContent = [
                `### ${brkdwn.name} ########## - Hover for more details - ##########\n`,
                ...lines,
                // '\n######################################################\n',
                // jsYaml.dump(brkdwn, { indent: 4, lineWidth: -1 })
            ].join('\n')

            // test if this is the full app definition object
            // then break down to display the lines of ns config in an ns.conf with language
            // provide the rest of the json breakdown as a hover in a header?

        } else if (output === 'lines') {

            docContent = items

        } else if (Object(items)) {
            docName = 'app.ns.json'
            // if array -> single selection, just join internal array normally -> display contents
            docContent = JSON.stringify(items, undefined, 4);
        }

        // this loop is syncronous
        for (const el of editors) {
            if (el.document.fileName === 'app.ns.conf' || el.document.fileName === 'app.ns.json') {
                viewColumn = el.viewColumn;
            }
        };


        var vDoc: Uri = Uri.parse("untitled:" + docName);
        workspace.openTextDocument(vDoc)
            .then((a: TextDocument) => {
                window.showTextDocument(a, undefined, false).then(async e => {
                    await e.edit(edit => {
                        const startPosition = new Position(0, 0);
                        const endPosition = a.lineAt(a.lineCount - 1).range.end;
                        edit.replace(new Range(startPosition, endPosition), docContent);
                        commands.executeCommand("cursorTop");
                    });
                });
            });
    }
}



/**
 * sort tree items by label
 */
function sortTreeItems(treeItems: NsCfgApp[],) {
    return treeItems.sort((a, b) => {
        const x = a.label.toLowerCase();
        const y = b.label.toLowerCase();
        if (x < y) {
            return -1;
        } else {
            return 1;
        }
    });
}

export class NsCfgApp extends TreeItem {
    constructor(
        public readonly label: string,
        public tooltip: string | MarkdownString,
        public description: string,
        public contextValue: string,
        public iconPath: string | ThemeIcon,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly command?: Command
    ) {
        super(label, collapsibleState);
    }
}




/**
 * Slim down and sort diags array for report
 * Error > Warning > Information
 * 
 * example: ["Warning-094d: NATs are supported, but not statics", "Information-1360: Virtual Server references iRule(s), review iRules for compatibility"]

 * 
 * @param d VSCode Diagnostics array
 * @returns 
 */
export function slimDiags(d: Diagnostic[]): string[] {

    // slim down the diagnostics to a single line
    const slimDiags = d.map(d => {
        const sev = DiagnosticSeverity[d.severity];
        // const line = d.range[0].line;    // look into adding line info to original diag object creation
        return `${sev}-${d.code}: ${d.message}`;
    });

    // sort the lines by severity
    return slimDiags.sort((a, b) => {

        // the order of these sevs will set the order of the diagnostics lines
        const sevs = ['Error', 'Warning', 'Information'];

        const aVerb = a.split('-')[0];
        const bVerb = b.split('-')[0];
        const aIndex = sevs.indexOf(aVerb);
        const bIndex = sevs.indexOf(bVerb);

        return aIndex - bIndex;
    });
}