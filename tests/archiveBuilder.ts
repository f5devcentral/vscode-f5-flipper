/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import fs from 'fs';
import path from 'path';
import tar from 'tar';

import { globSync } from 'glob';
import { execSync } from 'child_process';


/**
 * generate ns archive for testing this project
 * 
 * @type 
 * @returns 
 */
export async function archiveMake(): Promise<fs.PathLike | string> {

    const filesInArchive: any[] = [];
    const baseArchiveName = 'f5_flipper_test';
    let fileExt = 'tgz'; // default file extension/type
    const cwd = process.cwd();  // just to confirm our current working director
    let gzip = true;
   
    const baseArchiveDir = path.join(__dirname, 'artifacts', 'apps');

    // start building the list of filePaths to include in the archive
    // config dir should always be in the archive
    let filesPaths: string[] = globSync('*', { cwd: baseArchiveDir })



    // build the file output path/name
    const archiveName = `${baseArchiveName}.${fileExt}`
    const testArchiveOut: fs.PathLike = path.join(__dirname, 'artifacts', archiveName);


    const d1 = fs.readdirSync(baseArchiveDir);

    //this method has the potential to be quicker and easier method for managing tar files...
    await tar.create({
        cwd: baseArchiveDir,
        file: testArchiveOut,
        gzip
    },
        filesPaths
    )


    // this is how it was working with native tar command
    // const cmd = [
    //     'tar',
    //     '-czf',
    //     testArchiveOut,
    //     '-C',
    //     archiveDir,
    //     '../README.md',
    //     'config/',
    //     'monitors/',
    //     'ssl/'
    // ].join(' ')
    // execSync(cmd)

    // how to list the archive contents from the command line, to match with example above
    const l1 = execSync(`tar -ztvf ${testArchiveOut}`).toString();

    // this is here to be able to look at the array and confirm the necessary files are in there.
    await tar.t({
        file: testArchiveOut,
        onentry: entry => {
            filesInArchive.push(entry.path)
        }
    })

    // copy file to base project directory to be included in packaging
    fs.copyFileSync(testArchiveOut, path.join(__dirname, '..', archiveName));

    return testArchiveOut;
}