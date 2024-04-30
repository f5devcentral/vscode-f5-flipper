
'use strict';

import * as path from 'path';
import * as fs from 'fs';
import {
    ExtensionContext,
    StatusBarItem,
    workspace,
    ViewColumn,
    commands
} from "vscode";
import { logger } from "./logger";
import { EventEmitter } from "events";

import { ExtHttp } from 'f5-conx-core';
import { Telemetry } from './telemetry';
import { NsDiag } from './nsDiag';
import { NsCfgProvider } from './nsCfgViewProvider';
import { NsCodeLensProvider } from './codeLens';
import { FastCore } from './fastCore';
import { NsTemplateProvider } from './templateViewProvider';
import Logger from 'f5-conx-core/dist/logger';


/**
 * Namespace for common variables used throughout the extension. 
 * They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
    export let context: ExtensionContext;
    export let extHttp: ExtHttp;
    export let telemetry: Telemetry;
    export let nsDiag: NsDiag;
    export let fast: FastCore;
    export let logger: Logger;
    export let nsCfgProvider: NsCfgProvider;
    export let nsTemplateProvider: NsTemplateProvider;
    export let nsCodeLens: NsCodeLensProvider;
    export let eventEmitterGlobal: EventEmitter;
    export let connectBar: StatusBarItem;
    export let cacheDir: string;
    export let teemEnv = 'F5_VSCODE_TEEM';
    export let teemAgent: string;

    export namespace settings {
        export let asyncInterval: number;
        export let timeoutInMilliseconds: number;
        export let previewColumn: ViewColumn;
        export let httpResponseDetails: string;
        export let preserveEditorFocus: boolean;
        export let newEditorTabForAll: boolean;
        export let logLevel: string;
        export let preview: boolean;
        export let prompts: boolean;
        export let teem: boolean;
    }
}

workspace.onDidChangeConfiguration(() => {
    // logger.debug('EXTENSION CONFIGURATION CHANGED!!!');
    loadSettings();
});

/**
 * initialize extension/settings
 * @param context extension context
 */
export async function initSettings(context: ExtensionContext) {

    // assign context to global name space
    ext.context = context;

    // todo: setup settings for external http proxy - should probably set environment vars
    ext.eventEmitterGlobal = new EventEmitter();

    // ext.tele Telemetry

    ext.teemAgent = `${context.extension.packageJSON.name}/${context.extension.packageJSON.version}`;

    ext.cacheDir = path.join(ext.context.extensionPath, 'cache');
    process.env.F5_CONX_CORE_EXT_HTTP_AGENT = ext.teemAgent;
    process.env.F5_CONX_CORE_CACHE = ext.cacheDir;

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    ext.extHttp = new ExtHttp({ rejectUnauthorized: false, eventEmitter: ext.eventEmitterGlobal });
    ext.extHttp.cacheDir = ext.cacheDir;

    ext.eventEmitterGlobal
        .on('log-http-request', msg => logger.httpRequest(msg))
        .on('log-http-response', msg => logger.httpResponse(msg))
        .on('log-debug', msg => logger.debug(msg))
        .on('log-info', msg => logger.info(msg))
        .on('log-warn', msg => logger.warn(msg))
        .on('log-error', msg => logger.error(msg))


    if (!fs.existsSync(ext.cacheDir)) {
        logger.debug('CREATING CACHE DIRECTORY');
        // ext.cacheDir = cacheDir;
        fs.mkdirSync(ext.cacheDir);
    } else {
        logger.debug(`existing cache directory detected: ${ext.cacheDir}`);
    };


}


/**
 * load/reload vscode extension settings
 */
export async function loadSettings() {
    logger.debug('loading configuration');

    const f5Cfg = workspace.getConfiguration('f5');
    
    ext.settings.timeoutInMilliseconds = f5Cfg.get<number>('timeoutinmilliseconds', 0);
    ext.settings.previewColumn = parseColumn(f5Cfg.get<string>('newEditorColumn', 'two'));
    // ext.settings.httpResponseDetails = f5Cfg.get('httpResponseDetails')!;
    ext.settings.preserveEditorFocus = f5Cfg.get<boolean>('preserveEditorFocus', true);
    ext.settings.newEditorTabForAll = f5Cfg.get<boolean>('newEditorTabForAll', false);
    // ext.settings.prompts = f5Cfg.get('enablePrompts', false);
    
    ext.settings.preview = f5Cfg.get<boolean>('preview', false);
    // plugin preview setting to view context
    commands.executeCommand('setContext', 'f5-flipper.preview', ext.settings.preview);

    process.env.F5_VSCODE_FLIPPER_LOG_LEVEL = f5Cfg.get<string>('logLevel', 'INFO');

    const tenv = f5Cfg.get<boolean>('TEEM', true).toString();
    if(tenv === 'true') {
        ext.settings.teem = true;
    } else {
        ext.settings.teem = false;
    }
    // console.log('tenv', tenv);
    // for some reason the env for teem setting keeps going undefined
    process.env[ext.teemEnv] = tenv;

    
    logger.info('------ Environment Variables ------');
    // log envs
    Object.entries(process.env)
        .filter(el => el[0].startsWith('F5_'))
        .forEach(el => logger.info(`${el[0]}=${el[1]}`));

}


function parseColumn(value: string): ViewColumn {
    value = value.toLowerCase();
    switch (value) {
        case 'current':
            return ViewColumn.Active;
        case 'beside':
        default:
            return ViewColumn.Beside;
    }
}
