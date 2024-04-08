
import {
    ExtensionContext,
    commands,
    window,
    Uri,
    workspace,
    TextDocument,
    Diagnostic,
    languages
} from 'vscode';
import { NsCfgProvider, slimDiags } from './nsCfgViewProvider';
import { ext, initSettings, loadSettings } from './extensionVariables';
import fs from 'fs';
import * as os from 'os';
import { logger } from './logger';
import { Telemetry } from './telemetry';
import jsyaml from 'js-yaml';
import path from 'path';
import { NsDiag } from './nsDiag';
import { Hovers } from './hovers';
import { NsCodeLensProvider } from './codeLens';
import { FastCore } from './fastCore';

// turn off console logging
logger.console = false;

// create OUTPUT channel
const f5FlipperOutputChannel = window.createOutputChannel('f5-flipper');

// inject vscode output into logger
logger.output = function (log: string) {
    f5FlipperOutputChannel.appendLine(log);
};

export async function activateInternal(context: ExtensionContext) {


    logger.info(`Extension/Host details: `, {
        name: context.extension.packageJSON.name,
        displayName: context.extension.packageJSON.displayName,
        publisher: context.extension.packageJSON.publisher,
        description: context.extension.packageJSON.description,
        version: context.extension.packageJSON.version,
        license: context.extension.packageJSON.license,
        repository: context.extension.packageJSON.repository.url,
        host: JSON.stringify({
            hostOS: os.type(),
            platform: os.platform(),
            release: os.release()
        }),
        userInfo: JSON.stringify(os.userInfo())
    });

    // initialize extension settings
    await initSettings(context);

    // load ext config to ext.settings.
    await loadSettings();

    // create the telemetry service
    ext.telemetry = new Telemetry(context);
    // initialize telemetry service
    await ext.telemetry.init();

    process.on('unhandledRejection', error => {
        logger.error('--- unhandledRejection ---', error);
        ext.telemetry.capture({ unhandledRejection: JSON.stringify(error) });
    });

    new Hovers(context, ext.eventEmitterGlobal);

    ext.fast = new FastCore(context);

    ext.nsDiag = new NsDiag(context);  // move to settings/vars

    ext.nsCfgProvider = new NsCfgProvider(context);
    // const cfgView = window.registerTreeDataProvider('cfgTree', cfgProvider);
    const cfgView = window.createTreeView('nsConfigView', {
        treeDataProvider: ext.nsCfgProvider,
        showCollapseAll: true,
        canSelectMany: true
    });

    // setup logic to only enable this for dev flag
    ext.nsCodeLens = new NsCodeLensProvider()

    languages.registerCodeLensProvider({
        language: 'json',
    },
        ext.nsCodeLens
    );

    /**
     * 
     * 
     */
    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExplore', async (item) => {

        let filePath: string;

        ext.telemetry.capture({ command: 'f5-flipper.cfgExplore' });

        f5FlipperOutputChannel.show();

        if (!item) {
            // no input means we need to browse for a local file
            item = await window.showOpenDialog({
                canSelectMany: false
            });

            // if we got a file from the showOpenDialog, it comes in an array, even though we told it to only allow single item selection -> return the single array item
            if (Array.isArray(item)) {
                item = item[0];
            }
        }

        if (item?._fsPath) {

            logger.info(`f5-flipper.cfgExplore _fsPath recieved:`, item._fsPath);
            filePath = item._fsPath;

        } else if (item?.path) {

            logger.info(`f5-flipper.cfgExplore path revieved:`, item.path);
            filePath = item.path;

        } else {

            return logger.error('f5-flipper.cfgExplore -> Neither path supplied was valid', JSON.stringify(item));

        }

        try {
            // test that we can access the file
            const x = fs.statSync(filePath);
        } catch (e) {
            // if we couldn't get to the file, trim leading character
            // remove leading slash -> i think this is a bug like:  https://github.com/microsoft/vscode-remote-release/issues/1583
            // filePath = filePath.replace(/^(\\|\/)/, '');
            logger.info(`could not find file with supplied path of ${filePath}, triming leading character`);
            filePath = filePath.substr(1);
        }

        logger.info(`f5-flipper.cfgExplore: exploding config @ ${filePath}`);

        ext.nsCfgProvider.makeExplosion(filePath);

        await new Promise(resolve => { setTimeout(resolve, 2000); });
        commands.executeCommand('nsConfigView.focus');

    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExploreTest', async (text) => {
        const testPath = path.join(context.extensionPath, 'f5_flipper_test.tgz')
        commands.executeCommand('f5-flipper.cfgExplore', Uri.file(testPath))
    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExplore-show', async (text) => {
        ext.telemetry.capture({ command: 'f5-flipper.cfgExplore-show' });
        const content = JSON.stringify( text, undefined, 4);

        // var vDoc: Uri = Uri.parse("untitled:" + 'CitrixADC_Report2.yml');
        return await workspace.openTextDocument({ language: 'json', content})
            .then(async (doc) => {
                await window.showTextDocument(doc);
                // this.documents.push(doc);  // add the document to this class doc list

                // fold all the json down
                await commands.executeCommand("editor.foldAll");
                // expand the first two levels of json to better visibility
                await commands.executeCommand("editor.unfold", { levels: 2 });
                return doc;
            });
    }));
    
    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExploreClear', async (text) => {
        ext.telemetry.capture({ command: 'f5-flipper.cfgExploreClear' });
        ext.nsCfgProvider.clear();
        ext.nsCfgProvider.nsDiag = true;
    }));

    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExploreRefresh', async (text) => {
        ext.nsCfgProvider.refresh();
    }));

    context.subscriptions.push(commands.registerCommand('f5-flipper.diagRulesOpen', async () => {
        ext.telemetry.capture({ command: 'f5-flipper.diagRulesOpen' });
        ext.nsDiag.openRules();
    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.viewJson', async (x) => {
        ext.telemetry.capture({ command: 'f5-flipper.viewJson' });
        const appName = x.label;

        const app = ext.nsCfgProvider.explosion.config.apps.find(a => a.name === appName)

        ext.nsCfgProvider.render(app, 'full')
    }));

    // watch for fileSave events
    workspace.onDidSaveTextDocument((document: TextDocument) => {

        const justFileName = path.parse(document.fileName).base;

        // if this is our diagnostics rules file, then refresh the rules/tree when the file is saved. :)
        if (justFileName === 'diagnostics.json') {
            // refresh the view and all the diagnostics
            ext.nsCfgProvider.refresh();
        }
    });

    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExplore-nsDiagSwitch', async (text) => {


        // flip switch and refresh details
        if (ext.nsCfgProvider.nsDiag) {
            ext.nsCfgProvider.nsDiag = false;
            ext.nsDiag.enabled = false;
            console.log('ns diag updatediagnostics disable');
            logger.info('disabling diagnostics')
            if (ext.nsDiag.lastDoc) {
                // clear the last editor diags
                ext.nsDiag.updateDiagnostic(ext.nsDiag.lastDoc);
            }
        } else {
            ext.nsCfgProvider.nsDiag = true;
            logger.info('enabling diagnostics')

            ext.nsDiag.enabled = true;
        }
        ext.nsCfgProvider.refresh();
    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.render', async (text) => {

        ext.nsCfgProvider.render(text, 'lines');
    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.csv', async (text) => {

        const lines = ext.nsCfgProvider.explosion.config.apps.map( x => {
            const name = x.name;
            const type = x.type;
            const protocol = x.protocol;
            const ip = x.ipAddress;
            const port = x.port;
            return [name, type, protocol, ip, port].join(',')
        })

        ext.nsCfgProvider.render(lines.join('\n'), 'lines');
    }));


    context.subscriptions.push(commands.registerCommand('f5-flipper.report', async (text) => {
        ext.telemetry.capture({ command: 'f5-flipper.report' });

        const brkr = '\n\n--- ##################################################\n\n'

        // build a welcome banner
        const welcome = [
            'Citrix ADC/NS -> F5 Application report.',
            '',
            'Please visit the following repo for any questions, issues or enhancements',
            '',
            'https://github.com/f5devcentral/vscode-f5-flipper',
            brkr
        ]


        // build report header
        const reportHeader: any = {
            hostname: ext.nsCfgProvider.explosion.hostname,
            repo: context.extension.packageJSON.repository.url,
            issues: context.extension.packageJSON.bugs.url,
            extensionVersion: context.extension.packageJSON.version,
            id: ext.nsCfgProvider.explosion.id,
            inputFileType: ext.nsCfgProvider.explosion.inputFileType,
            dateTime: ext.nsCfgProvider.explosion.dateTime,
            stats: ext.nsCfgProvider.explosion.stats,
            appCount: ext.nsCfgProvider.explosion.config.apps.length,
            sources: ext.nsCfgProvider.explosion.config.sources.map(el => {
                return { fileName: el.fileName, size: el.size }
            }),
        }

        if (ext.nsDiag.enabled) {
            reportHeader.diagStats = ext.nsCfgProvider.diagStats;
            reportHeader.diags = ext.nsCfgProvider.diags;
        }

        // build apps
        const reportApps = []
        for (const app of ext.nsCfgProvider.explosion.config.apps) {
            const appCopy = JSON.parse(JSON.stringify(app))
            delete appCopy.lines;
            // const diags = [];

            if (ext.nsDiag.enabled) {
                //rebuild each diag as simple, casting as needed
                appCopy.diagnostics = slimDiags(appCopy.diagnostics as Diagnostic[])
            } else {
                // diagnostics are not enabled, so removed them from the report
                delete appCopy.diagnostics;
            }
            reportApps.push(
                brkr,
                jsyaml.dump(appCopy, { indent: 4 }),
                '',
                '--- Original Application config lines', '',
                ...app.lines, '', '')
        }

        // put all the content together
        const content = [
            welcome.join('\n'),
            jsyaml.dump(reportHeader, { indent: 4, lineWidth: -1 }),
            reportApps.join('\n')
        ].join('')

        var vDoc: Uri = Uri.parse("untitled:" + 'CitrixADC_Report.yml');
        return await workspace.openTextDocument({ language: 'yaml', content })
            .then(async (doc) => {
                await window.showTextDocument(doc);
                // this.documents.push(doc);  // add the document to this class doc list
                return doc;
            });
    }));

    // context.subscriptions.push(disposable);

    context.subscriptions.push(commands.registerCommand('f5-flipper.report2', async (text) => {

        // build report header
        const report: any = {
            hostname: ext.nsCfgProvider.explosion.hostname,
            repo: context.extension.packageJSON.repository.url,
            issues: context.extension.packageJSON.bugs.url,
            extensionVersion: context.extension.packageJSON.version,
            id: ext.nsCfgProvider.explosion.id,
            inputFileType: ext.nsCfgProvider.explosion.inputFileType,
            dateTime: ext.nsCfgProvider.explosion.dateTime,
            stats: ext.nsCfgProvider.explosion.stats,
            appCount: ext.nsCfgProvider.explosion.config.apps.length
        }


        // build apps
        const apps = []
        for (const app of ext.nsCfgProvider.explosion.config.apps) {
            const appCopy = JSON.parse(JSON.stringify(app))
            delete appCopy.lines;
            delete appCopy.diagnostics

            apps.push(appCopy)
            
        }

        report.apps = apps;
        
        // put all the content together
        const content = JSON.stringify( report, undefined, 4);

        // var vDoc: Uri = Uri.parse("untitled:" + 'CitrixADC_Report2.yml');
        return await workspace.openTextDocument({ language: 'json', content})
            .then(async (doc) => {
                await window.showTextDocument(doc);
                // this.documents.push(doc);  // add the document to this class doc list
                return doc;
            });


    }))
}



// this method is called when your extension is deactivated
export async function deactivateInternal(context: ExtensionContext) {
    // log deactivation event
}