

'use strict';

import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { digCStoLBreferences } from './digCStoLbRefs';
import { logger } from './logger';
import { AdcApp, AdcConfObjRx, AdcRegExTree, ConfigFile, Explosion, Stats } from './models'
import { countMainObjectsRx } from './objectCounter';
import { RegExTree } from './regex';
import { UnPacker } from './unPackerStream';
import { parseAdcConfArraysRx } from './parseAdcArraysRx';
import { digCsVserversRx } from './digCsVserverRx';
import { digLbVserverRx } from './digLbVserverRx';
import { digGslbVserversRx } from './digGslbVserverRx';




/**
 * Class to consume Citrix ADC archive/configs -> parse apps
 *
 * NEW OPTIMIZED IMPLEMENTATION - Uses RX-based object parsing
 * - Pre-compiled regex patterns for faster matching
 * - Improved options parsing without string concatenation
 * - Parallel digester execution
 * - Set-based duplicate removal
 *
 * For legacy implementation see CitrixADCold.ts
 */
export default class ADC extends EventEmitter {
    /**
     * incoming config files array
     * ex. [{filename:'ns.conf',size:12345,content:'...'},{...}]
     */
    public configFiles: ConfigFile[] = [];
    /**
     * ns config as full nested json objects - using optimized RX parsing
     */
    public configObjectArryRx: AdcConfObjRx = {};
    /**
     * adc version
     */
    public adcVersion: string | undefined;
    /**
     * adc build number
     */
    public adcBuild: string | undefined;
    /**
     * hostname of the source device
     */
    public hostname: string | undefined;
    /**
     * input file name
     */
    public inputFile: string;
    /**
     * input file type (.conf/.tgz)
     */
    public inputFileType: string;
    /**
     * ADC version specific regex tree for abstracting applications
     */
    public rx: AdcRegExTree | undefined;
    /**
     * ns processing stats object
     */
    private stats: Stats = {
        objectCount: 0,
    };

    constructor() {
        super();
    }

    /**
     * load and do initial parse of ns config file/archive
     * @param file ns.conf or ns.tgz
     */
    async loadParseAsync(file: string): Promise<void> {
        const startTime = process.hrtime.bigint();
        // capture incoming file type
        this.inputFileType = path.parse(file).ext;

        // capture input file name
        this.inputFile = path.parse(file).name;

        const parseConfPromises: any[] = [];
        const parseStatPromises: any[] = [];
        const unPacker = new UnPacker();

        unPacker.on('conf', conf => {
            // parse .conf files, capture promises
            parseConfPromises.push(this.parseConf(conf))
        })

        await unPacker.stream(file)
            .then(async ({ size }) => {

                this.stats.sourceSize = size;

                // wait for all the parse config promises to finish
                await Promise.all(parseConfPromises)

            })

        // wait for all the stats files processing promises to finish
        await Promise.all(parseStatPromises)

        // assign souceAdcVersion to stats object also
        this.stats.sourceAdcVersion = this.adcVersion

        // end processing time, convert microseconds to miliseconds
        this.stats.parseTime = Number(process.hrtime.bigint() - startTime) / 1000000;

        return;
    }


    /**
     * async parsing of config files
     */
    async parseConf(conf: ConfigFile): Promise<void> {

        // emit event about the config file we are about to parse
        this.emit('parseFile', conf.fileName)

        // standardize line endings -> not the best way, but it works
        conf.content = conf.content.replace(/\r\n/g, '\n')

        // split the config into lines
        const config = conf.content.split('\n')

        // count lines of config, add to stats
        // get object counts (lines)
        this.stats.lineCount = config.length;
        this.stats.objectCount = config.length;

        // push the raw config files to storage array
        this.configFiles.push(conf)

        // build rx tree based on ns version
        await this.setAdcVersion(conf)

        // fully parse ns config to json with optimized RX parsing engine
        await parseAdcConfArraysRx(config, this.configObjectArryRx, this.rx);

        // get hostname from configObjectArryRx, assign to parent class for easy access
        if (this.configObjectArryRx.set?.ns?.hostName) {
            // Get the first hostname from the object
            const hostnameObj = this.configObjectArryRx.set.ns.hostName;
            const firstHostname = Object.values(hostnameObj)[0];
            this.hostname = firstHostname?.name || this.inputFile;
        } else {
            this.hostname = this.inputFile;
        }

        // gather stats on the number of different objects found (vservers/monitors/policies)
        await countMainObjectsRx(this.configObjectArryRx)
            .then(stats => {
                this.stats.objects = stats;
            });
    }



    /**
     * parses config file for tmos version, sets tmos version specific regex tree used to parse applications
     * @param x config-file object
     */
    async setAdcVersion(x: ConfigFile): Promise<void> {

        // instantiate regex tree
        const rex = new RegExTree();

        // get adc version
        [this.adcVersion, this.adcBuild] = this.getAdcVersion(x.content, rex.adcVersionBaseReg);

        // assign regex tree for particular version
        this.rx = rex.get(this.adcVersion)
    }






    /**
     * returns all details from processing
     * 
     * - 
     */
    async explode(): Promise<Explosion> {

        const apps = await this.apps();   // extract apps before pack timer...

        const startTime = process.hrtime.bigint();  // start pack timer

        // build return object
        const retObj = {
            id: uuidv4(),                           // generat uuid,
            dateTime: new Date(),                   // generate date/time
            hostname: this.hostname,
            inputFileType: this.inputFileType,      // add input file type
            config: {
                sources: this.configFiles,
            },
            stats: this.stats,                      // add stats object
            // logs: await this.logs()                 // get all the processing logs
        }

        if (apps.length > 0) {
            // add virtual servers (apps), if found
            retObj.config['apps'] = apps;
        }

        // capture pack time
        this.stats.packTime = Number(process.hrtime.bigint() - startTime) / 1000000;

        return retObj;
    }

    /**
     * extracts app(s)
     * @param app single app string
     * @return [{ name: <appName>, config: <appConfig>, map: <appMap> }]
     */
    async apps() {

        // start our timer for abstracting apps
        const startTime = process.hrtime.bigint();

        // Run all digesters in parallel for maximum performance
        const [csApps, lbApps, gslbApps] = await Promise.all([
            digCsVserversRx(this.configObjectArryRx, this.rx).catch(err => {
                logger.error(err);
                return [];
            }),
            digLbVserverRx(this.configObjectArryRx, this.rx).catch(err => {
                logger.error(err);
                return [];
            }),
            digGslbVserversRx(this.configObjectArryRx, this.rx).catch(err => {
                logger.error(err);
                return [];
            })
        ]);

        // Combine all apps into single array
        const apps: AdcApp[] = [...csApps, ...lbApps, ...gslbApps];

        // Build CS to LB references (adds referenced LB apps to CS apps)
        digCStoLBreferences(apps);

        // Post-process all apps: remove duplicate lines and sort properties
        for (const app of apps) {
            // Use Set for O(n) duplicate removal instead of O(n²) indexOf
            app.lines = [...new Set(app.lines)];

            // Remove empty or invalid certs arrays
            if (app.bindings?.certs) {
                if (app.bindings.certs.length === 0 ||
                    (app.bindings.certs.length === 1 && Object.keys(app.bindings.certs[0]).length === 0)) {
                    delete app.bindings.certs;
                }
            }

            // Resort the app object properties for better human reading
            sortAdcApp(app);
        }

        // capture app abstraction time
        this.stats.appTime = Number(process.hrtime.bigint() - startTime) / 1000000;

        // log a warning if we didn't abstract any apps
        if (apps.length === 0) {
            const msg = 'no "add cs vserver"/"add lb vserver"/"add gslb vserver" objects found - excluding apps information';
            logger.error(msg)
            // do we want to just log or toss on error if we have no apps?
            throw new Error(msg)
        }

        // return the app array
        return apps;
    }



    /**
     * extract tmos config version from first line
     * ex.  #TMSH-VERSION: 15.1.0.4
     * @param config bigip.conf config file as string
     */
    private getAdcVersion(config: string, regex: RegExp): [string, string] {
        const version = config.match(regex);
        if (version) {
            //found adc version, grab build (split off first line, then split build by spaces)
            const build = config.split('\n')[0].split(' ')[2]

            logger.info(`Recieved .conf file of version: ${this.adcVersion}`)

            // return details
            return [version[1], build];
        } else {
            const msg = 'citrix adc/ns version not detected, defaulting to v13.0'
            logger.warn(msg)
            return ['13.0', '000'];
            // throw new Error(msg)
        }
    }

}


/**
 * sorts AdcApp object properties
 *  mainly makes sure name/type/ipAddress/port are at the top and lines are at the bottom
 * @param app 
 * @returns 
 */
export function sortAdcApp(app: AdcApp) {

    const sorted: AdcApp = {
        name: app.name,
        type: app.type,
        protocol: app.protocol,
        ...(app.ipAddress && { ipAddress: app.ipAddress }),
        ...(app.port && { port: app.port }),
        ...(app.opts && { opts: app.opts }),
        ...(app.bindings && { bindings: app.bindings }),
        ...(app.csPolicies && { csPolicies: app.csPolicies }),
        ...(app.csPolicyActions && { csPolicyActions: app.csPolicyActions }),
        ...(app.appflows && { appflows: app.appflows }),
        ...(app.lines && { lines: app.lines }),
        ...(app.apps && { apps: app.apps })
    }

    return app = sorted;
}