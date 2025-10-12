
var lodashGet = require('lodash.get');

import { AdcConfObj, AdcConfObjRx, ObjStats } from "./models";

/**
 * Count main objects from legacy array-based config structure
 * @deprecated Use countMainObjectsRx for new RX-based structure
 */
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
    'add gslb vserver',
    'add gslb service',
    'add server',
    'add service',
    'add serviceGroup',
    'add ssl certKey'
    ]

    // todo: capture the above list from the rx tree and filter on just the adds
    //  this will make it dynamic and update as parsing gets extended

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

/**
 * Count main objects from new RX-based config structure
 * Works with nested object structure where each item is keyed by name
 * @param cfgObjRx - RX-parsed config object
 * @returns Object stats with counts for each object type
 */
export async function countMainObjectsRx(cfgObjRx: AdcConfObjRx): Promise<ObjStats> {
    const stat: ObjStats = {}

    // Note: In RX structure, every 'add' object is stored as { name: { ...props } }
    // We count the number of keys at each path

    // Items to get counts for (same as legacy)
    const items = [
        { path: ['add', 'cs', 'vserver'], label: 'csVserver' },
        { path: ['add', 'cs', 'policy'], label: 'csPolicy' },
        { path: ['add', 'cs', 'action'], label: 'csAction' },
        { path: ['add', 'lb', 'vserver'], label: 'lbVserver' },
        { path: ['add', 'lb', 'monitor'], label: 'lbMonitor' },
        { path: ['add', 'gslb', 'vserver'], label: 'gslbVserver' },
        { path: ['add', 'gslb', 'service'], label: 'gslbService' },
        { path: ['add', 'server'], label: 'server' },
        { path: ['add', 'service'], label: 'service' },
        { path: ['add', 'serviceGroup'], label: 'serviceGroup' },
        { path: ['add', 'ssl', 'certKey'], label: 'sslCertKey' }
    ]

    items.forEach(({ path, label }) => {
        // Navigate the nested object structure
        let current: any = cfgObjRx;
        for (const segment of path) {
            if (current && typeof current === 'object') {
                current = current[segment];
            } else {
                current = undefined;
                break;
            }
        }

        // Count keys if we found the object
        if (current && typeof current === 'object') {
            stat[label] = Object.keys(current).length;
        }
    })

    return stat;
}