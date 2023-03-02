import { AdcRegExTree } from "./models";
import { nestedObjValue } from "./objects";
import { deepmergeInto } from 'deepmerge-ts'





export async function parseAdcConf(config: string[], rx: AdcRegExTree) {


    const cfgObj = {}
    let cfgObj2: any = {}
    let item: string;

    sortNsLines(config, rx)

    // loop through each line and parse

    config.forEach(line => {

        // pass all comments
        if (line.startsWith('#')) return;
        if (line === '') return;

        // add/set/bind/link/enable/disable
        // line = line.replace(rx.verbs, '')

        // set ns config
        item = 'set ns config'
        if (line.startsWith(item)) {

            const cfgOptions = line.slice(item.length)
            const baseObj = parseNsOptions(cfgOptions, rx)
            const treeLocation = item.split(' ').slice(1);
            const tmpObj = nestedObjValue(treeLocation, baseObj)
            deepmergeInto(cfgObj, tmpObj)
            return;  // return to the next line in the config
        }

        item = 'set ns hostName'
        if (line.startsWith(item)) {
            const tmpObj = nestedObjValue(item.split(' '), line.slice(item.length).trim())
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'add lb vserver'
        if (line.startsWith(item)) {
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            // build base object with vserver details
            const baseObj = {
                [pName]: {
                    type: parent!.groups!.type,
                    ipAddress: parent!.groups!.ipAddress,
                    port: parent!.groups!.port
                }
            }
            // merge in vserver config options
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )

            // nest the object in the appropriate object structure
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            // merge this config object into the main config object tree
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'set ssl vserver'
        if (line.startsWith(item)) {
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const baseObj = { [pName]: {} }  // initialize the object
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'add lb monitor'
        if (line.startsWith(item)) {
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const baseObj = { [pName]: {
                type: parent!.groups!.type
            } }
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'add ssl certKey'
        if (line.startsWith(item)) {
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const baseObj = { [pName]: {} }
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'bind lb vserver'
        if (line.startsWith(item)) {

            // bind lb vserver <name>@ 
            //  ((<serviceName>@ [-weight <positive_integer>] ) | 
            //  <serviceGroupName>@ | 
            //  (-policyName <string>@ [-priority <positive_integer>] [-gotoPriorityExpression <expression>] [-type ( REQUEST | RESPONSE )] [-invoke (<labelType> <labelName>) ] ))
            const parent = line.match(rx[item]);
            // const pName = parent!.groups!.name;
            // const baseObj = { [pName]: {} }
            // // if we found config options with '-', then add them as needed
            // if (parent?.groups?.opts.startsWith('-')) {
            //     deepmergeInto(
            //         baseObj[pName],
            //         parseNsOptions(parent!.groups!.opts, rx)
            //     )
            // } else {
            //     // since we did not detect config options, it must be a service or service group
            //     // https://developer-docs.citrix.com/projects/netscaler-command-reference/en/12.0/lb/lb-vserver/lb-vserver/#bind-lb-vserver
            //     const service = line.split(' ').pop()
            //     // should this be an array to handle multiple attachements?
            //     baseObj[pName]['service'] = service;
            // }

            // for now, I'm just going to stash all these in an array, and process them later
            const tmpObj = nestedObjValue(item.split(' '), [parent?.groups?.opts]);
            deepmergeInto(cfgObj, tmpObj)
            return;
        }

        item = 'add server'
        if (line.startsWith(item)) {
            // synopsys; https://developer-docs.citrix.com/projects/netscaler-command-reference/en/12.0/basic/server/server/
            // add server <name>@ (<IPAddress>@ | (<domain>@ [-domainResolveRetry <integer>] [-IPv6Address ( YES | NO )]) | (-translationIp <ip_addr> -translationMask <netmask>)) [-state ( ENABLED | DISABLED )] [-comment <string>] [-td <positive_integer>]
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const pValue = parent!.groups!.value;
            const baseObj = { [pName]: pValue }
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj);
            return;
        }

        item = 'add ns ip6 '
        if (line.startsWith(item)) {
            item = item.trim()
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const baseObj = { [pName]: {} }
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj);
            return;
        }

        item = 'add ns ip '
        if (line.startsWith(item)) {
            item = item.trim()
            const parent = line.match(rx[item]);
            const pName = parent!.groups!.name;
            const mask = parent!.groups!.mask;
            const baseObj = {
                [pName]: {
                    mask
                }
            }
            deepmergeInto(
                baseObj[pName],
                parseNsOptions(parent!.groups!.opts, rx)
            )
            const tmpObj = nestedObjValue(item.split(' '), baseObj);
            deepmergeInto(cfgObj, tmpObj);
            return;
        }

        // // toying with the idea of turning entire config to json tree
        // const bLine = line.split(' ')
        // const parent = bLine.splice(0, 2)
        // const bOjb = nestedObjValue(parent, bLine.join())
        // cfgObj2 = deepMergeObj(cfgObj2, bOjb)

        const a = 'asdf'
    })

    return cfgObj;
}


/**
 * takes ns config string options and parses them into an object
 * config line:  'add lb monitor app1_http_mon HTTP -respCode 200 -httpRequest "GET /index.html" -LRTM DISABLED'
 * best to remove everything up to the config options
 * example:  '-respCode 200 -httpRequest "GET /index.html" -LRTM DISABLED'
 * 
 * returns = {
 *      '-respCode': 200,
 *      '-httpRequest': "GET /index.html",
 *      '-LRTM': 'DISABLED'
 * }
 * 
 * @param str ns adc cfs options as string
 * @param rx regex tree for specific ns adc version
 * @returns options as an object
 */
export function parseNsOptions(str: string, rx: AdcRegExTree): { [k: string]: string } {
    const obj = {}

    // grep out all the options with quotes/spaces
    str.match(rx.cfgOptionsQuotes)?.forEach(el => {
        // split the name off by the first space
        const [k, v] = el.split(/ (.*)/)
        obj[k] = v;
        str = str.replace(el, '')
    })

    // capture everything else without spaces
    str.match(rx.cfgOptions)?.forEach(el => {
        const [k, v] = el.split(' ')
        obj[k] = v;
        str = str.replace(el, '')
    })

    // // turn certain object values to arrays
    // if () {

    // }

    return obj;
}

// export function parseBindings(str: string, rx: AdcRegExTree): { [k: string]: string } {
//     const obj = {}


// }


/**
 * sort ns adc config by verbs
 *  add -> set -> bind -> link -> enable -> disable
 * @param cfg 
 * @param rx 
 * @returns 
 */
export function sortNsLines(cfg: string[], rx: AdcRegExTree) {

    cfg.sort((a, b) => {

        // the order of these verb will set the order of the ns config lines
        const verbs = ['add','set','bind','link','enable','disable']
        
        const aVerb = a.match(rx.verbs)?.pop()?.trim()!
        const bVerb = b.match(rx.verbs)?.pop()?.trim()!
        const aIndex = verbs.indexOf(aVerb)
        const bIndex = verbs.indexOf(bVerb)

        return aIndex - bIndex
    })
}