/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import path from "path";
import * as fs from 'fs';
import zlib from 'zlib';
import tar from 'tar-stream'
import { EventEmitter } from "events";
// import { multilineRegExp } from "./regex";
import { ConfigFile } from "./models";
import { logger } from "./logger";




/**
 * async method for extracting config files from archives
 * - .conf files are emited as "conf" events
 * - all other config files are return at promise resolution
 * 
 */
export class UnPacker extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * extracts needed config files from archive
     *  - .conf files are emited as events during extraction so they can be parsed asyncronously
     *  - all other files returned at end in promise completion to be added to the conf tree
     * @param input path/file to .conf|.ucs|.qkview|.gz
     */
    async stream(input: string): Promise<{
        files?: ConfigFile[],
        size: number
    }> {

        /**
         * look at streaming specific files from the archive without having to load the entire thing into memory
         * 
         * https://github.com/mafintosh/tar-fs
         * https://github.com/mafintosh/gunzip-maybe
         * https://github.com/mafintosh/tar-stream
         * https://github.com/npm/node-tar#readme
         * 
         * https://stackoverflow.com/questions/19978452/how-to-extract-single-file-from-tar-gz-archive-using-node-js
         * 
         */

        // parse input to usable pieces
        const filePath = path.parse(input);

        /**
         * what kind of file we workin with?
         */
        if (filePath.ext === '.conf') {

            try {

                // get file size
                const size = fs.statSync(path.join(filePath.dir, filePath.base)).size;
                // try to read file contents
                const content = fs.readFileSync(path.join(filePath.dir, filePath.base), 'utf-8');

                logger.debug(`got .conf file [${input}], size [${size}]`)

                this.emit('conf', { fileName: filePath.base, size, content })

                return { size };
                // return

            } catch (e) {
                logger.error('not able to read file', e.message);
                throw new Error(`not able to read file => ${e.message}`);
            }


        } else if (filePath.ext === '.tgz') {

            const size = fs.statSync(path.join(filePath.dir, filePath.base)).size;
            logger.debug(`detected file: [${input}], size: [${size}]`)

            const extract = tar.extract();
            const files: ConfigFile[] = []

            return new Promise((resolve, reject) => {
                extract.on('entry', (header, stream, next) => {
                    let captureFile = false;
                    const contentBuffer: any[] = []
                    // detect the files we want and set capture flag
                    if (fileFilter(header.name) && header.type === 'file') {
                        captureFile = true;
                    } else {
                        // not the file we want, so call the next entry
                        next()
                    }
                    stream.on('data', (chunk) => {
                        // if this is a file we want, buffer it's content
                        if (captureFile) {
                            contentBuffer.push(chunk);
                        }
                    });
                    stream.on('end', () => {
                        if (captureFile) {
                            if((header.name as string).endsWith('.conf')) {

                                // emit conf files
                                this.emit('conf', {
                                    fileName: header.name,
                                    size: header.size,
                                    content: contentBuffer.join('')
                                })

                            }
                        }
                        next();
                    });
                    stream.resume();
                });

                extract.on('finish', () => {
                    // we finished processing, .conf file should have been emited as events, so now resolve the promise with all the other config files
                    return resolve({
                        files,
                        size
                    });
                });
                extract.on('error', err => {
                    return reject(err);
                });

                fs.createReadStream(input)
                    .pipe(zlib.createGunzip())
                    .pipe(extract);
            })

        } else {
            const msg = `file type of "${filePath.ext}", not supported, try (.conf/.tgz)`
            logger.error(msg);
            throw new Error(`not able to read file => ${msg}`);
        }

    }
}

/**
 * filters files we want
 * @param file name as string
 * @param boolean if file match -> return (pass filter)
 */
export function fileFilter(name: string): boolean {


    /**
     * breakind down this bigger regex for explaination
     * added to list of regex's below
     */
    // const allConfs = RegExp('*.conf');
    // const allConfs = multilineRegExp([
    //     // base /config directory
    //     /^config/,
    //     // optional /partitions directory including /partition name directory
    //     /(?:\/partitions\/[\w-]+?)?/,
    //     // any bigip*.conf file
    //     /\/bigip(?:[\w-]*).conf$/
    // ], undefined)


    // /**
    //  * qkviews do NOT includes private keys
    //  */
    // const fileStoreFilesQkview = multilineRegExp([
    //     // base directory
    //     /^config\/filestore\/files_d/,
    //     // /partition folder
    //     /\/[\w]+?/,
    //     // all directories excluding "epsec_pacakage_d" or "datasync_update_file_d"
    //     /\/(?!epsec_package_d|datasync_update_file_d)[\w]+?/,
    //     // any file/suffix
    //     /\/.+?$/
    // ], undefined);

    // /**
    //  * UCS private keys unless excluded at generation
    //  */
    // const fileStoreFilesUcs = multilineRegExp([
    //     // base directory
    //     /^var\/tmp\/filestore_temp\/files_d/,
    //     // /partition folder
    //     /\/[\w]+?/,
    //     // all directories excluding "epsec_pacakage_d" or "datasync_update_file_d"
    //     /\/(?!epsec_package_d|datasync_update_file_d)[\w]+?/,
    //     // any file/suffix
    //     /\/.+?$/
    // ], undefined);

    /**
     * list of RegEx's to find the files we need
     * 
     * only one has to pass to return true
     */
    const fileRegexs: RegExp[] = [
        /^[\S]+.conf$/,                           // all .conf files (including partitions)
        /^config\/bigip.license$/,          // license file
        /^config\/profile_base.conf$/,      // default profiles
        // fileStoreFilesUcs,                  // certs/keys (ucs)
        // fileStoreFilesQkview,               // certs/keys (qkviews)
        /^\w+.xml$/                         // qkview stats files
    ]
    
    return fileRegexs.some( rx => rx.test(name));

}