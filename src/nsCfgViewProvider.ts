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
import jsYaml from 'js-yaml';
import { lstatSync, readdirSync } from 'fs';

import { ext } from './extensionVariables';

// import { ConfigFile, Explosion, TmosApp, xmlStats } from 'f5-corkscrew';
import { logger } from './logger';
// import BigipConfig from 'f5-corkscrew/dist/ltm';
import path from 'path';
import { AdcConfObj, Explosion, AdcApp } from './models';
import ADC from './CitrixADC';
import { mungeNS2FAST } from './ns2FastParams';

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

    /**
     * switch to globally enable/disable diagnostics
     */
    nsDiag: boolean = true;
    /**
     * full output from the ns config explore (explosion)
     */
    explosion: Explosion | undefined;
    confObj: AdcConfObj | undefined;
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

    /**
     * high level diagnostics stats
     */
    diagStats = {
        defaultRedirects: 0,
        Green: undefined,
        Information: undefined,
        Warning: undefined,
        Error: undefined,
    };

    /**
     * lists of apps in each diagnostic level
     */
    diags = {
        defaultRedirects: [],
        Green: [],
        Information: [],
        Warning: [],
        Error: [],
    };
    ctx: ExtensionContext;

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }

    /**
     * 
     * @param file file path to explode Citix ADC/NS config
     */
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
                            ext.telemetry.capture({
                                command: 'flipper-explosion',
                                inputFileType: ext.nsCfgProvider.explosion.inputFileType,
                                dateTime: ext.nsCfgProvider.explosion.dateTime,
                                appCount: ext.nsCfgProvider.explosion.config.apps.length,
                                stats: exp.stats
                            });
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

        if (this.explosion) {

            //loop throught the apps and update diagnostics
            this.explosion.config.apps.forEach(app => {
                if (this.nsDiag) {

                    const diags = ext.nsDiag.getDiagnostic(app.lines);
                    app.diagnostics = diags;

                } else {

                    //remove all the diagnostics
                    delete app.diagnostics
                }
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

        // reset the diagnostic stats
        this.diagStats = {
            defaultRedirects: 0,
            Green: undefined,
            Information: undefined,
            Warning: undefined,
            Error: undefined,
        };
        this.diags = {
            defaultRedirects: [],
            Green: [],
            Information: [],
            Warning: [],
            Error: [],
        };
        this.refresh();
    }


    getParent(element: NsCfgApp): NsCfgApp {
        return element;
    }
    getTreeItem(element: NsCfgApp): TreeItem {
        return element;
    }

    async getChildren(element?: NsCfgApp): Promise<NsCfgApp[]> {

        // if there is no config currently being explored
        if (!this.explosion) {
            // this will cause the view to show the welcome markdown defined in the package.json
            return Promise.resolve([]);
        }

        // list of view items to display in the UI
        var treeItems: NsCfgApp[] = [];

        if (element) {


            if (element.label === 'Apps') {
                this.explosion.config.apps.filter(x => x.type === 'cs' || x.type === 'lb')
                    .forEach(app => {
                        const descA = [`(${app.lines.length})`, app.type]
                        descA.push(`${app.ipAddress}:${app.port}`);
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
                            command: 'f5-flipper.viewNsJson',
                            title: '',
                            arguments: [app]
                        }
                        ));
                    })

                // // prep for a future flag
                // if (true) {
                //     // sort tree items based on app IP, descending to put all the 0.0.0.0 at the bottom
                //     treeItems.sort((a, b) => {
                //         const x = a.label;
                //         const y = b.label;
                //         const xIp = this.explosion.config.apps.find(f => f.name === x);
                //         const yIp = this.explosion.config.apps.find(f => f.name === y);
                //         // https://stackoverflow.com/questions/48618635/require-sorting-on-ip-address-using-js
                //         const num1 = Number(xIp.ipAddress.split(".").map((num) => (`000${num}`).slice(-3)).join(""));
                //         const num2 = Number(yIp.ipAddress.split(".").map((num) => (`000${num}`).slice(-3)).join(""));
                //         return num2 - num1;   // return descending
                //     });
                // }
                sortTreeItems(treeItems);

            } else if (element.label === 'GSLB') {

                this.explosion.config.apps.filter(x => x.type === 'gslb').forEach(app => {

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
                        '',
                        'nsGSLB', icon,
                        TreeItemCollapsibleState.None, {
                        command: 'f5-flipper.viewNsJson',
                        title: '',
                        arguments: [app]
                    }
                    ));
                })

                sortTreeItems(treeItems);

            // } else if (element.label === 'FAST Templates') {

            //     // list fast template files
            //     // list all the files in the templates folder
            //     const files = readdirSync(path.join(this.ctx.extensionPath, 'templates'), { withFileTypes: true });


            //     files.forEach(file => {
            //         // is file or folder?

            //         const filePath = path.join(file.path, file.name);
            //         const isFile = lstatSync(filePath).isFile();

            //         if (isFile) {

            //             // create template object
            //             // const filePath = path.join(this.ctx.extensionPath, 'templates', 'ns', file.name);
            //             // treeItems.push(new NsCfgApp(file.name, ``, ``, 'nsFile', '', TreeItemCollapsibleState.None, {
            //             //     command: 'vscode.open',
            //             //     title: '',
            //             //     arguments: [Uri.file(filePath)]
            //             // }));
            //         } else {
            //             // get number of templates in folder
            //             const filesCount = readdirSync(path.join(this.ctx.extensionPath, 'templates', file.name))
            //             // create folder
            //             treeItems.push(new NsCfgApp(file.name, ``, filesCount.length.toString(), 'nsFolder', '', TreeItemCollapsibleState.Collapsed));
            //         }


            //     })

            // } else if (element.contextValue === 'nsFolder') {

            //     // list templates in folder
            //     const x = element;
            //     const files = readdirSync(path.join(this.ctx.extensionPath, 'templates', element.label), { withFileTypes: true });

            //     files.forEach(file => {
            //         // is file or folder?

            //         const filePath = path.join(file.path, file.name);
            //         const isFile = lstatSync(filePath).isFile();

            //         if (isFile) {

            //             // create template object
            //             // const filePath = path.join(this.ctx.extensionPath, 'templates', 'ns', file.name);
            //             treeItems.push(new NsCfgApp(file.name, ``, ``, 'fastTemplate', '', TreeItemCollapsibleState.None, {
            //                 command: 'vscode.open',
            //                 title: '',
            //                 arguments: [Uri.file(filePath)]
            //             }));
            //         } else {
            //             // create folder
            //             // treeItems.push(new NsCfgApp(file.name, ``, ``, 'nsFolder', '', TreeItemCollapsibleState.Collapsed));
            //         }


            //     })

            } else if (element.label === 'Reports') {

                // Main report (existing f5-flipper.report command)
                treeItems.push(new NsCfgApp(
                    'Yaml Report',
                    'Generate the main comprehensive report with all analysis details',
                    'YAML format',
                    'reportMain', '',
                    TreeItemCollapsibleState.None, {
                    command: 'f5-flipper.report',
                    title: '',
                    arguments: []
                }
                ));

                // JSON report (new pure JSON format)
                treeItems.push(new NsCfgApp(
                    'JSON Report',
                    'Generate a pure JSON report for programmatic consumption',
                    'JSON format',
                    'reportJson', '',
                    TreeItemCollapsibleState.None, {
                    command: 'f5-flipper.report2',
                    title: '',
                    arguments: []
                }
                ));

                // NS config as JSON objects
                treeItems.push(new NsCfgApp(
                    'NS as JSON',
                    'View parent NS.Conf objects as JSON',
                    'Raw JSON',
                    'nsJson', '',
                    TreeItemCollapsibleState.None, {
                    command: 'f5-flipper.cfgExplore-show',
                    title: '',
                    arguments: [this.adc?.configObjectArry]
                }
                ));

            } else if (element.label === 'Sources') {

                this.explosion.config.sources.forEach(source => {
                    // const appYaml = jsYaml.dump(app, { indent: 4 })
                    // const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml')
                    treeItems.push(new NsCfgApp(
                        source.fileName,
                        `size: ${source.size.toString()}`,
                        `lines: ${source.content.split('\n').length.toString()}`,
                        'nsFile', '',
                        TreeItemCollapsibleState.None, {
                        command: 'f5-flipper.viewNsLines',
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

            // Reports section
            treeItems.push(new NsCfgApp(
                'Reports',
                'Generate various reports from the analyzed configuration',
                '',
                'reportsHeader', '',
                TreeItemCollapsibleState.Collapsed
            ));

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
                command: 'f5-flipper.viewNsLines',
                title: '',
                arguments: [allSources]
            }
            ));

            // const appsTotal = this.explosion?.config.apps ? this.explosion.config.apps.length.toString() : '';
            const csLbApps = this.explosion?.config.apps ? this.explosion.config.apps.filter(x => x.type === 'cs' || x.type === 'lb') : '';
            const gslbApps = this.explosion?.config.apps ? this.explosion.config.apps.filter(x => x.type === 'gslb') : '';

            if (csLbApps.length > 0) {
                treeItems.push(new NsCfgApp('Apps', '', csLbApps.length.toString(), 'appsHeader', '', TreeItemCollapsibleState.Expanded,
                    { command: 'f5-flipper.cfgExplore-show', title: '', arguments: [csLbApps] }));
            }

            if (gslbApps.length > 0) {
                treeItems.push(new NsCfgApp('GSLB', '', gslbApps.length.toString(), 'gslbHeader', '', TreeItemCollapsibleState.Expanded,
                    { command: 'f5-flipper.cfgExplore-show', title: '', arguments: [csLbApps] }));
            }

            // todo: possibly move all the fast template stuff to a separate view
            // treeItems.push(new NsCfgApp('FAST Templates', 'Conversion Templates', '', 'fastHeader', '', TreeItemCollapsibleState.Collapsed));

        }
        return Promise.resolve(treeItems);
    }

    /**
     * bulk convert all known apps cs/lb
     */
    async bulk() {

        window.showErrorMessage('AFTON functionality in development - not working right now')
        // gather all the ns apps into an array
        const apps = this.explosion.config.apps;

        // create an array to put the converted apps
        const as3Apps = []

        // // loop through the array and convert each app
        // for await (const app of apps) {

        //     // // mutate the ns json app params to fast template params
        //     // const fastTempParams = await ext.fast.panel.mungeNS2FAST(app)

        //     const fastTempParams = await ext.fast.panel.autoRenderHTML(app)

        //     await ext.fast.panel.renderAS3(fastTempParams)
        //         .then(a => as3Apps.push(a))
        //         .catch(e => {
        //             as3Apps.push(e)
        //         })
        // }

        await commands.executeCommand("f5-flipper.cfgExplore-show", as3Apps);
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

            // add FAST template params
            const fastTempParams = mungeNS2FAST(items)

            items.fastTempParams = fastTempParams;

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

            // add FAST template params
            const fastTempParams = mungeNS2FAST(items)

            items.fastTempParams = fastTempParams;

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