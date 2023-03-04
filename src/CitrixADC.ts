

'use strict';

import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { digAddLbVserver, digAddCsVserver } from './digAppsArrys';
// import { RegExTree, TmosRegExTree } from './regex'
import intLogger from './intLogger';
import { AdcApp, AdcConfObj, AdcRegExTree, ConfigFile, Explosion, Stats } from './models'
import { countMainObjects } from './objectCounter';
import { parseAdcConf } from './parseAdc';
import { parseAdcConfArrays } from './parseAdcArrys';
import { RegExTree } from './regex';
// import { countObjects } from './objCounter';
// import { ConfigFile } from './models';
// import { digVsConfig, getHostname } from './digConfigs';
import { UnPacker } from './unPackerStream';




/**
 * Class to consume Citrix ADC archive/configs -> parse apps
 * 
 */
export default class ADC extends EventEmitter {
    /**
     * incoming config files array
     * ex. [{filename:'config/bigip.conf',size:12345,content:'...'},{...}]
     */
    public configFiles: ConfigFile[] = [];
    /**
     * tmos config as nested json objects 
     * - consolidated parant object keys like ltm/apm/sys/...
     */
    public configObject: AdcConfObj = {};
    public configObjectArry: AdcConfObj = {};
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
     * input file type (.conf/.ucs/.qkview/.tar.gz)
     */
    public inputFileType: string;
    /**
     * tmos version specific regex tree for abstracting applications
     */
    private rx: AdcRegExTree | undefined;
    /**
     * ns processing stats object
     */
    private stats: Stats = {
        objectCount: 0,
    };
    /**
     * bigip license file
     */
    license: ConfigFile;
    /**
     * adc file store files, which include certs/keys/external_monitors/...
     */
    fileStore: ConfigFile[] = [];

    constructor() {
        super();
    }

    /**
     * 
     * @param file bigip .conf/ucs/qkview/mini_ucs.tar.gz
     */
    async loadParseAsync(file: string): Promise<void> {
        const startTime = process.hrtime.bigint();
        // capture incoming file type
        this.inputFileType = path.parse(file).ext;

        const parseConfPromises: any[] = [];
        const parseStatPromises: any[] = [];
        const unPacker = new UnPacker();

        unPacker.on('conf', conf => {
            // parse .conf files, capture promises
            parseConfPromises.push(this.parseConf(conf))
        })

        await unPacker.stream(file)
            .then(async ({ files, size }) => {

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

        if (this.rx) {
            // have an RX tree already so asyncronously test the file version matches
            this.setAdcVersion(conf)
        } else {
            // no RX tree set yet, so wait for this to finish
            await this.setAdcVersion(conf)
        }

        // array of unused/unparsed objects
        const orphans: string[] = [];

        this.configObject = await parseAdcConf(config, this.rx!);
        this.configObjectArry = await parseAdcConfArrays(config, this.rx!);

        // get hostname from confObj, assign to parent class for easy access
        if (this.configObject.set.ns.hostName) {
            this.hostname = this.configObject.set.ns.hostName;
        }

        // gather stats on the number of different objects found (vservers/monitors/policies)
        await countMainObjects(this.configObjectArry)
            .then(stats => {
                this.stats.objects = stats;
            });
    }



    /**
     * parses config file for tmos version, sets tmos version specific regex tree used to parse applications
     * @param x config-file object
     */
    async setAdcVersion(x: ConfigFile): Promise<void> {
        if (this.rx) {
            // rex tree already assigned, lets confirm subsequent file tmos version match
            if (this.adcVersion === this.getAdcVersion(x.content, this.rx.adcVersion)[0]) {
                // do nothing, current file version matches existing files tmos verion
            } else {
                const err = `Parsing [${x.fileName}], adc version of this file does not match previous file [${this.adcVersion}]`;
                intLogger.error(err)
                // throw new Error(err);
            }
        } else {

            // first time through - build everything
            const rex = new RegExTree();  // instantiate regex tree
            [this.adcVersion, this.adcBuild] = this.getAdcVersion(x.content, rex.adcVersionBaseReg);  // get adc version
            intLogger.info(`Recieved .conf file of version: ${this.adcVersion}`)

            // assign regex tree for particular version
            this.rx = rex.get(this.adcVersion)
        }
    }








    // /**
    //  * return list of applications
    //  * 
    //  * @return array of app names
    //  * @example ['/Common/app1_80t_vs', '/tenant1/app4_t443_vs']
    //  */
    // async appList(): Promise<string[]> {
    //     // capture all the vservers from 'add lb vserver' and 
    //     // return Object.keys(this.configObject.ltm?.virtual);
    // }

    /**
     * returns all details from processing
     * 
     * - 
     */
    async explode(): Promise<Explosion> {

        // if config has not been parsed yet...
        // if (!this.configObject.ltm?.virtual) {
        //     await this.parse(); // parse config files
        // }

        const apps = await this.apps();   // extract apps before pack timer...

        const startTime = process.hrtime.bigint();  // start pack timer

        // // extract DO classes (base information expanded)
        // const doClasses = await digDoConfig(this.configObject);

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
            logs: await this.logs()                 // get all the processing logs
        }

        if (apps.length > 0) {
            // add virtual servers (apps), if found
            retObj.config['apps'] = apps;
        }

        if (this.fileStore.length > 0) {
            // add files from file store
            retObj['fileStore'] = this.fileStore;
        }

        // capture pack time
        this.stats.packTime = Number(process.hrtime.bigint() - startTime) / 1000000;

        return retObj
    }

    /**
     * Get processing logs
     */
    async logs(): Promise<string[]> {
        return intLogger.getLogs();
    }


    /**
     * extracts app(s)
     * @param app single app string
     * @return [{ name: <appName>, config: <appConfig>, map: <appMap> }]
     */
    async apps(app?: string) {

        /**
         * todo:  add support for app array to return multiple specific apps at same time.
         */

        const startTime = process.hrtime.bigint();

        if (app) {
            // extract single app config
            // const value = this.configObject.ltm.virtual[app]

            // this.emit('extractApp', {
            //     app,
            //     time: Number(process.hrtime.bigint() - startTime) / 1000000
            // })

            // if (value) {
            //     // dig config, then stop timmer, then return config...
            //     const x = [await digVsConfig(app, value, this.configObject, this.rx)];
            //     this.stats.appTime = Number(process.hrtime.bigint() - startTime) / 1000000
            //     return x;
            // }

        } else if (this.configObjectArry.add.cs.vserver || this.configObjectArry.add.lb.vserver) {

            // means we didn't get an app name, so try to dig all apps...
            const apps = [];

            // dig each 'add cs vserver'

            for (const app of this.configObjectArry.add.cs.vserver) {

                await digAddCsVserver(app, this.configObjectArry, this.rx)
                    .then(appCfg => {

                        apps.push(sortAdcApp(appCfg))

                    })

            }

            // dig each 'add lb vserver', but check for existing

            for (const app of this.configObjectArry.add.lb.vserver) {

                const appName = app.split(' ').shift();

                await digAddLbVserver(appName, this.configObjectArry, this.rx)
                    .then(appCfg => {
                        apps.push(sortAdcApp(appCfg))
                    })
            }

            // loop through app objects
            // for (const el of this.configObjectArry.add?.lb?.vserver) {
            //     // breakdown the vserver details
            //     const deets = el.match(/(?<name>\S+) (?<type>\S+) (?<ipAddress>[\d.]+) (?<port>\d+) (?<opts>[\S ]+)/)!
            //     const app = deets.groups!.name;

            //     this.emit('extractApp', {
            //         app,
            //         time: Number(process.hrtime.bigint() - startTime) / 1000000
            //     })

            //     await digVserverArrys(app)
            //     .then( appCfg => {

            //     })
            // }

            // for (const [key, value] of Object.entries(this.configObject.ltm.virtual)) {
            //     // event about extracted app
            //     this.emit('extractApp', {
            //         app: key,
            //         time: Number(process.hrtime.bigint() - startTime) / 1000000
            //     })

            //     // dig config, but catch errors
            //     await digVsConfig(key, value, this.configObject, this.rx)
            //     .then(vsConfig => {
            //             apps.push({ name: key, configs: vsConfig.config, map: vsConfig.map });
            //         })
            //         .catch(err => {
            //             apps.push({ name: key, configs: err, map: '' });
            //         })
            // }

            this.stats.appTime = Number(process.hrtime.bigint() - startTime) / 1000000;
            return apps;
        } else {
            intLogger.info('no ltm virtual servers found - excluding apps information')
            return [];
        }
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
            // return details
            return [version[1], build];
        } else {
            const msg = 'citrix adc/ns version not detected -> meaning this probably is not an ns.conf'
            intLogger.error(msg)
            throw new Error(msg)
        }
    }

}


/**
 * sorts AdcApp object properties
 *  mainly makes sure name/type/ipAddress/port are at the top and lines are at the bottom
 * @param app 
 * @returns 
 */
function sortAdcApp(app: AdcApp): AdcApp {

    const sorted: AdcApp = {
        name: app.name,
        type: app.type,
        ipAddress: app.ipAddress,
        port: app.port,
        opts: app.opts || undefined,
        bindings: app.bindings,
        policies: app.policies,
        lines: app.lines,
        apps: app.apps
    }
    return sorted;
}

// /**
//  * standardize line endings to linux
//  * "\r\n" and "\r" to "\n"
//  * @param config config as string
//  * @returns config
//  */
// function standardizeLineReturns (config: string){
//     const regex = /(\r\n|\r)/g;
//     return config.replace(regex, "\n");
// }

// /**
//  * Reverse string
//  * @param str string to reverse
//  */
// function reverse(str: string){
//     return [...str].reverse().join('');
//   }


