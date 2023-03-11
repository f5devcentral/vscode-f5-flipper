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
} from 'vscode';
import jsYaml from 'js-yaml';

import { ext } from './extensionVariables';

// import { ConfigFile, Explosion, TmosApp, xmlStats } from 'f5-corkscrew';
import { logger } from './logger';
// import BigipConfig from 'f5-corkscrew/dist/ltm';
import path from 'path';
import { AdcConfObj, Explosion, AdcApp } from './models';
import ADC from './CitrixADC';

// remodel everything here like this example:  https://github.com/microsoft/vscode-extension-samples/blob/master/tree-view-sample/src/testView.ts
// it will provide a working 'reveal' function and a browsable tmos config tree in the view

/**
 * Tree view provider class that hosts and present the data for the Config Explorer view
 */
export class NsCfgProvider implements TreeDataProvider<NsCfgApp> {

    private _onDidChangeTreeData: EventEmitter<NsCfgApp | undefined> = new EventEmitter<NsCfgApp | undefined>();
    readonly onDidChangeTreeData: Event<NsCfgApp | undefined> = this._onDidChangeTreeData.event;

    redDot = ext.context.asAbsolutePath(path.join("images", "redDot.svg"));
    orangeDot = ext.context.asAbsolutePath(path.join("images", "orangeDot.svg"));
    yellowDot = ext.context.asAbsolutePath(path.join("images", "yellowDot.svg"));
    greenDot = ext.context.asAbsolutePath(path.join("images", "greenDot.svg"));
    greenCheck = ext.context.asAbsolutePath(path.join("images", "greenCheck.svg"));

    explosion: Explosion | undefined;
    confObj: AdcConfObj | undefined;
    /**
     * trying to use this to make the view in focus after initialization
     */
    viewElement: NsCfgApp | undefined;
    adc: ADC | undefined;
    parsedFileEvents: any = [];
    parsedObjEvents: any = [];

    readonly brkr = '\n\n##################################################\n\n';

    xcDiag: boolean = false;

    constructor() {
    }

    async makeExplosion(file: string) {

        window.withProgress({
            location: {
                viewId: 'nsConfigView'
            },
            title: `Extracting Citrix/ADC Configs`,
        }, async () => {
            // this.bigipConfig = new BigipConfig();

            this.adc = new ADC();

            this.adc.on('parseFile', x => {
                this.parsedFileEvents.push(x);
                ext.eventEmitterGlobal.emit('log-info', `f5-flipper.cfgExplore, parsing file -> ${x}`);
            });
            // this.bigipConfig.on('parseObject', x => this.parsedObjEvents.push(x));

            ext.eventEmitterGlobal.emit('log-info', `f5-flipper.cfgExplore, opening archive`);

            await this.adc.loadParseAsync(file)
                .catch(err => logger.error('makeExplosion', err));


            ext.eventEmitterGlobal.emit('log-info', `f5-flipper.cfgExplore, extracting apps`);
            await this.adc.explode()
                .then(exp => {
                    this.explosion = exp;
                    ext.eventEmitterGlobal.emit('log-info', `f5-flipper.cfgExplore, extraction complete`);
                    ext.eventEmitterGlobal.emit('log-info', exp.stats);
                    // ts-todo: add key to telemetry
                    ext.telemetry.capture({ command: 'flipper-explosion', stats: exp.stats });
                    this.refresh();
                })
                .catch(err => logger.error('makeExplosion', err));

        });
    }


    async importExplosion(exp: Explosion) {
        this.explosion = exp;
    }

    async refresh(): Promise<void> {
        // if(ext.xcDiag?.loadRules()) {
        //     ext.xcDiag.loadRules();
        // }
        this._onDidChangeTreeData.fire(undefined);
    }

    clear(): void {
        this.adc = undefined;
        this.explosion = undefined;
        this.parsedFileEvents.length = 0;
        this.parsedObjEvents.length = 0;
        this.refresh();
    }


    getParent(element: NsCfgApp): NsCfgApp {
        return element;
    }
    getTreeItem(element: NsCfgApp): TreeItem {
        return element;
    }

    async getChildren(element?: NsCfgApp): Promise<NsCfgApp[]> {

        if (!this.explosion) {
            return Promise.resolve([]);
        }

        var treeItems: NsCfgApp[] = [];

        if (element) {


            if(element.label === 'Apps') {
                this.explosion.config.apps.forEach(app => {
                    const desc = `${app.type}-${app.ipAddress}:${app.port}`;
                    const appYaml = jsYaml.dump(app, { indent: 4 })
                    const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml')
                    treeItems.push(new NsCfgApp(
                        app.name,
                        toolTip,
                        desc,
                        'xcDiag', '',
                        TreeItemCollapsibleState.None, {
                        command: 'f5-flipper.render',
                        title: '',
                        arguments: [app]
                    }
                    ));
                })
            } else if ( element.label === 'Sources') {

                this.explosion.config.sources.forEach(source => {
                    // const appYaml = jsYaml.dump(app, { indent: 4 })
                    // const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml')
                    treeItems.push(new NsCfgApp(
                        source.fileName,
                        `size: ${source.size.toString()}`,
                        `lines: ${source.content.split('\n').length.toString()}`,
                        'xcDiag', '',
                        TreeItemCollapsibleState.None, {
                        command: 'f5-flipper.render',
                        title: '',
                        arguments: [source.content]
                    }
                    ));
                })
            }

        } else {


            // header element describing source details and explosion stats
            const title = this.explosion.hostname || this.explosion.config.sources[0].fileName;
            const desc = `${this.explosion.inputFileType} - ${this.explosion.stats.sourceAdcVersion}`;
            const expStatsYml = jsYaml.dump(this.explosion.stats, { indent: 4, lineWidth: -1 });
            const expStatsYmlToolTip = new MarkdownString().appendCodeblock(expStatsYml, 'yaml');
            this.viewElement = new NsCfgApp(title, expStatsYmlToolTip, desc, 'nsReport', '', TreeItemCollapsibleState.None);
            treeItems.push(this.viewElement);

            // tmos to xc diangostics header/switch
            const xcDiagStatus = this.xcDiag ? "Enabled" : "Disabled";
            const icon = xcDiagStatus === "Enabled" ? this.greenCheck : '';

            let xcTooltip: string | MarkdownString = '';
            // let icon
            
            // if xc diag enabled
            if (this.xcDiag) {
                    // const appsList = this.explosion?.config.apps?.nsApp.forEach((el: AdcApp) => el.lines.join('\n')) || [];
                    // // const excluded = ext.xcDiag.getDiagnosticExlusion(appsList);
                    // // const defaultRedirect = new RegExp('\/Common\/_sys_https_redirect', 'gm');
                    // // const nnn = defaultRedirect.exec(appsList.join('\n'));

                    // // const mmm = appsList.join('\n').match(/\/Common\/_sys_https_redirect/g) || [];

                    // // const diags = ext.xcDiag.getDiagnostic(appsList);

                    // const stats = { 
                    //     totalApps: appsList.length,
                    //     '_sys_https_redirect': mmm.length, 
                    //     stats: ext.xcDiag.getDiagStats(diags) };

                    // const diagStatsYml = jsYaml.dump(stats, { indent: 4 });
                    // xcTooltip = new MarkdownString().appendCodeblock(diagStatsYml, 'yaml');
                }
            
            // treeItems.push(new NsCfgApp(
            //     'XC Diagnostics',
            //     xcTooltip,
            //     xcDiagStatus,
            //     'xcDiag', icon,
            //     TreeItemCollapsibleState.None, {
            //     command: 'f5-flipper.cfgExplore-xcDiagSwitch',
            //     title: '',
            //     arguments: []
            // }
            // ));


            // sources parent folder
            const allSources = this.explosion.config.sources.map((el) => el.content);
            treeItems.push(new NsCfgApp(
                'Sources',
                '',
                this.explosion.config.sources.length.toString(),
                '', '',
                TreeItemCollapsibleState.Collapsed, {
                command: 'f5-flipper.cfgExplore-show',
                title: '',
                arguments: [allSources]
            }
            ));

            // // split off the partition names and count the number of unique occurances
            // this.partCounts = this.explosion?.config?.apps?.map(item => item.name.split('/')[1])
            //     // @ts-expect-error
            //     .reduce((acc, curr) => (acc[curr] = (acc[curr] || 0) + 1, acc), {});

            // this.partitions = [...new Set(this.explosion?.config?.apps?.map(item => item.name.split('/')[1]))];

            // get all the apps configs
            // const allApps = this.explosion?.config.apps?.map((el: AdcApp) => el.configs.join('\n').concat(this.brkr));

            const appsTotal = this.explosion?.config.apps ? this.explosion.config.apps.length.toString() : '';
            // const baseTotal = this.explosion?.config.base ? this.explosion.config.base.length.toString() : '';
            // const doTotal = this.explosion?.config.doClasses ? this.explosion.config.doClasses.length.toString() : '';
            // const logTotal = this.explosion?.logs ? this.explosion.logs.length.toString() : '';

            // treeItems.push(new CfgApp('Partitions', 'Click for All apps', this.partitions.length.toString(), '', '', TreeItemCollapsibleState.Collapsed,
            //     { command: 'f5-flipper.cfgExplore-show', title: '', arguments: ['allApps'] }));

            if (this.explosion?.config?.apps) {
                treeItems.push(new NsCfgApp('Apps', '', appsTotal, '', '', TreeItemCollapsibleState.Collapsed,
                    { command: 'f5-flipper.cfgExplore-show', title: '', arguments: [] }));
            }


            // if (this.bigipConfig?.fileStore && this.bigipConfig?.fileStore.length > 0) {
            //     const allFileStore = this.bigipConfig.fileStore.filter((el: ConfigFile) => {
            //         // only return the certs and keys for now
            //         if (el.fileName.includes('/certificate_d/') || el.fileName.includes('/certificate_key_d/')) {
            //             return true;
            //         }
            //     })
            //         .map((el: ConfigFile) => `\n###  ${el.fileName}\n${el.content}\n\n`);

            //     treeItems.push(new CfgApp('FileStore', '', this.bigipConfig.fileStore.length.toString(), '', '', TreeItemCollapsibleState.None,
            //         { command: 'f5-flipper.cfgExplore-show', title: '', arguments: [allFileStore.join('\n')] }));
            // }



        }
        return Promise.resolve(treeItems);
    }


    async render(items: string[], diagTag?: boolean) {

        const newEditorColumn = ext.settings.previewColumn;
        const editors = window.visibleTextEditors;
        let viewColumn: ViewColumn | undefined;

        let docName = 'app.ns.conf';
        let docContent: string;

        if (Array.isArray(items)) {

            docContent = items.join('\n');

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
        // old way, not syncronous
        // editors.forEach(el => {
        //     if (el.document.fileName === 'app.conf' || el.document.fileName === 'app.json') {
        //         viewColumn = el.viewColumn;
        //     }
        // });

        // if vClm has a value assign it, else set column 1
        viewColumn = viewColumn ? viewColumn : newEditorColumn;



        var vDoc: Uri = Uri.parse("untitled:" + docName);
        workspace.openTextDocument(vDoc)
            .then((a: TextDocument) => {
                window.showTextDocument(a, viewColumn, false).then(async e => {
                    await e.edit(edit => {
                        const startPosition = new Position(0, 0);
                        const endPosition = a.lineAt(a.lineCount - 1).range.end;
                        edit.replace(new Range(startPosition, endPosition), docContent);
                        commands.executeCommand("cursorTop");
                    });
                    if(diagTag && this.xcDiag) {
                        // if we got a text block with diagnostic tag AND xc diagnostics are enabled, then update the document with diagnosics
                        // ext.xcDiag.updateDiagnostic(a);
                    }
                });
            });
    }
}



/**
 * sort tree items by label
 */
function sortTreeItems(treeItems: NsCfgApp[]) {
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