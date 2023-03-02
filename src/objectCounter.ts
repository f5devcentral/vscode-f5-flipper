
var lodashGet = require('lodash.get');

import { AdcConfObj, ObjStats } from "./models";


export async function countMainObjects(cfgObj: AdcConfObj): Promise<ObjStats> {

    const stat: ObjStats = {}

    // note:  we assume that every 'add' is unique, since all the binds/sets attach to what was "add"ed

    // items to get counts for 
    const items = [
    'add cs vserver',
    'add cs policy',
    'add cs action',
    'add lb vserver',
    'add lb monitor',
    'add server',
    'add service',
    'add serviceGroup',
    'add ssl certKey'
    ]

    // also look into doing this:
    //  https://dev.to/tipsy_dev/advanced-typescript-reinventing-lodash-get-4fhe

    items.forEach(x => {
        const path = x.split(' ')
        const b = lodashGet(cfgObj, path.join('.'))
        if(b) {
            const n = Object.keys(b).length
            path.shift()    // remove the first element "add"
            if (path.length === 1) {

                // if path is a single work, assign it
                stat[path[0]] = n;

            } else {

                // if path is two words, capitalize the first letter of the second word, and join
                const t = [path[0], path[1][0].toUpperCase() + path[1].slice(1)].join('');
                stat[t] = n;

            }
        }
    })

    // todo: work on cleaning up the capitalization and key building
    // probably make a dedicated function
    // https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript

    return stat;
}