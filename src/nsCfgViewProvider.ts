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

    nsDiag: boolean = true;
    explosion: Explosion | undefined;
    confObj: AdcConfObj | undefined;
    /**
     * trying to use this to make the view in focus after initialization
     */
    viewElement: NsCfgApp | undefined;
    adc: ADC | undefined;
    parsedFileEvents: any = [];

    diagStats = {
        defaultRedirects: 0,
        Green: undefined,
        Information: undefined,
        Warning: undefined,
        Error: undefined,
    };

    diags = {
        defaultRedirects: [],
        Green: [],
        Information: [],
        Warning: [],
        Error: [],
    };

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
                .then(async () => {
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
                    // .catch(err => logger.error('makeExplosion-error', err));

                })
                .catch(err => {
                    logger.error('makeExplosion-error', err);

                });


        });
    }

    async refresh(): Promise<void> {

        logger.info('refreshing ns diagnostic rules and tree view')

        // update diagnostics rules
        ext.nsDiag.loadRules();

        if(this.explosion) {
            //loop throught the apps and add/refresh diagnostics
            this.explosion.config.apps.forEach(app => {
                const diags = ext.nsDiag.getDiagnostic(app.lines);
                // console.log(`updating diags for ${app.name}`)
                app.diagnostics = diags;
            })
        }

        // if we have a current config in view, refresh it also
        // --needed? or should we listen to onDidChangeEditor

        // refresh the tree view
        this._onDidChangeTreeData.fire(undefined);
    }

    clear(): void {
        this.adc = undefined;
        this.explosion = undefined;
        this.parsedFileEvents.length = 0;
        // this.parsedObjEvents.length = 0;
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


            if (element.label === 'Apps') {
                this.explosion.config.apps.forEach(app => {
                    const descA = [app.type]
                    if (app.type === 'gslb') {
                        descA.push(app.bindings['-domainName'][0]['-domainName'])
                    } else {
                        descA.push(`${app.ipAddress}:${app.port}`);
                    }
                    const desc = descA.join(' - ');
                    const clonedApp = JSON.parse(JSON.stringify(app));
                    delete clonedApp.lines;
                    delete clonedApp.diagnostics;
                    const appYaml = jsYaml.dump(clonedApp, { indent: 4 })
                    const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml');

                    //if diag enabled, figure out icon
                    let icon = '';
                    if (ext.nsDiag.enabled) {
                        // todo: add diag stats to tooltip
                        const stats = ext.nsDiag.getDiagStats(app.diagnostics as Diagnostic[]);

                        icon = stats?.Error ? this.redDot
                            : stats?.Warning ? this.orangeDot
                                : stats?.Information ? this.yellowDot : this.greenDot;
                    }

                    treeItems.push(new NsCfgApp(
                        app.name,
                        toolTip,
                        desc,
                        'nsApp', icon,
                        TreeItemCollapsibleState.None, {
                        command: 'f5-flipper.render',
                        title: '',
                        arguments: [app]
                    }
                    ));
                })
            } else if (element.label === 'Sources') {

                this.explosion.config.sources.forEach(source => {
                    // const appYaml = jsYaml.dump(app, { indent: 4 })
                    // const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml')
                    treeItems.push(new NsCfgApp(
                        source.fileName,
                        `size: ${source.size.toString()}`,
                        `lines: ${source.content.split('\n').length.toString()}`,
                        'nsApp', '',
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

            // ns diangostics header/switch
            const nsDiagStatus = this.nsDiag ? "Enabled" : "Disabled";
            const icon = nsDiagStatus === "Enabled" ? this.greenCheck : '';

            let nsTooltip: string | MarkdownString = '';

            // if ns diag enabled
            if (ext.nsDiag.enabled) {

                // build diag stats
                this.explosion.config.apps.forEach(app => {

                    const stats = ext.nsDiag.getDiagStats(app.diagnostics as Diagnostic[]);

                    // figure out app diag status green/yellow/orange/red
                    const diagStatus = stats?.Error ? 'Error'
                        : stats?.Warning ? 'Warning'
                            : stats?.Information ? 'Information' : 'Green';


                    // push app diags to high level report
                    if (diagStatus === 'Error') {

                        // start or increment high level stats
                        typeof this.diagStats?.Error === 'number' ?
                            this.diagStats.Error = this.diagStats.Error + 1 :
                            this.diagStats.Error = 1;

                        // add appName/diags 
                        this.diags!.Error!.push({
                            appName: app.name,
                            diagnostics: slimDiags(app.diagnostics as Diagnostic[])
                        });

                    } else if (diagStatus === 'Warning') {

                        typeof this.diagStats?.Warning === 'number' ?
                            this.diagStats.Warning = this.diagStats.Warning + 1 :
                            this.diagStats!.Warning = 1;

                        this.diags!.Warning!.push({
                            appName: app.name,
                            diagnostics: slimDiags(app.diagnostics as Diagnostic[])
                        });

                    } else if (diagStatus === 'Information') {

                        typeof this.diagStats?.Information === 'number' ?
                            this.diagStats.Information = this.diagStats.Information + 1 :
                            this.diagStats!.Information = 1;

                        this.diags!.Information!.push({
                            appName: app.name,
                            diagnostics: slimDiags(app.diagnostics as Diagnostic[])
                        });

                    } else if (diagStatus === 'Green') {

                        typeof this.diagStats?.Green === 'number' ?
                            this.diagStats.Green = this.diagStats.Green + 1 :
                            this.diagStats!.Green = 1;

                        this.diags!.Green!.push(app.name);

                    }

                })
            }

            const diagStatsYml = jsYaml.dump(this.diagStats, { indent: 4 });
            nsTooltip = new MarkdownString().appendCodeblock(diagStatsYml, 'yaml');

            treeItems.push(new NsCfgApp(
                'Diagnostics',
                nsTooltip,
                nsDiagStatus,
                'nsDiag', icon,
                TreeItemCollapsibleState.None, {
                command: 'f5-flipper.cfgExplore-nsDiagSwitch',
                title: '',
                arguments: []
            }
            ));


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
                treeItems.push(new NsCfgApp('Apps', '', appsTotal, '', '', TreeItemCollapsibleState.Expanded,
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


    async render(items: any, diagTag?: boolean) {

        const newEditorColumn = ext.settings.previewColumn;
        const editors = window.visibleTextEditors;
        let viewColumn: ViewColumn | undefined;

        let docName = 'app.ns.conf';
        let docContent: string;

        if (Array.isArray(items)) {

            docContent = items.join('\n');

        } else if (items.lines && items.name && items.type) {
            // rough test for the type we need

            // deep copy the object
            const brkdwn = JSON.parse(JSON.stringify(items))
            delete brkdwn.lines;    // delete the lines
            const lines = items.lines;  // capture the lines from the original object

            docContent = [
                `### ${brkdwn.name} ########## --- ##########\n`,
                ...lines,
                // '\n######################################################\n',
                // jsYaml.dump(brkdwn, { indent: 4, lineWidth: -1 })
            ].join('\n')

            // test if this is the full app definition object
            // then break down to display the lines of ns config in an ns.conf with language
            // provide the rest of the json breakdown as a hover in a header?


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
                    if (diagTag && ext.nsDiag.enabled) {
                        // if we got a text block with diagnostic tag AND xc diagnostics are enabled, then update the document with diagnosics
                        ext.nsDiag.updateDiagnostic(a);
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