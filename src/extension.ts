
import { 
    ExtensionContext,
    commands,
    window
} from 'vscode';
import { CfgProvider } from './cfgViewProvider';
import { ext, initSettings, loadSettings } from './extensionVariables';
import fs from 'fs';
import * as os from 'os';
import { logger } from './logger';
import { Telemetry } from './telemetry';

// turn off console logging
logger.console = false;

// create OUTPUT channel
const f5OutputChannel = window.createOutputChannel('f5-flipper');

// inject vscode output into logger
logger.output = function (log: string) {
	f5OutputChannel.appendLine(log);
};

export async function activateInternal(context: ExtensionContext) {

    logger.info('flipper is here to help!!!');


	process.on('unhandledRejection', error => {
		logger.error('--- unhandledRejection ---', error);
		// ext.telemetry.capture({ unhandledRejection: JSON.stringify(error) });
	});

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

	const cfgProvider = new CfgProvider();
    // const cfgView = window.registerTreeDataProvider('cfgTree', cfgProvider);
    const cfgView = window.createTreeView('cfgTree', {
        treeDataProvider: cfgProvider,
        showCollapseAll: true,
        canSelectMany: true
    });



    /**
     * this command is exposed via right click in editor so user does not have to connect to F5
     * this flow assumes the file is local
     */
    context.subscriptions.push(commands.registerCommand('f5-flipper.cfgExplore', async (item) => {

        let filePath: string;

        // ext.telemetry.capture({ command: 'f5-flipper.cfgExplore' });

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

        cfgProvider.makeExplosion(filePath);

        await new Promise(resolve => { setTimeout(resolve, 2000); });
        commands.executeCommand('cfgTree.focus');

    }));

	// context.subscriptions.push(disposable);
}



// this method is called when your extension is deactivated
export async function deactivateInternal(context: ExtensionContext) {
	// log deactivation event
}