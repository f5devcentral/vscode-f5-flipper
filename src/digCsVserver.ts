import { deepmergeInto } from "deepmerge-ts";
import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, PolicyRef } from "./models";
import { parseNsOptions } from "./parseAdc";





/**
 * 
 * @param app 
 * @param obj 
 * @param rx 
 * @returns 
 */
export async function digCsVservers(coa: AdcConfObj, rx: AdcRegExTree) {

    const apps: AdcApp[] = [];

    // start with 'add cs server', build details

    for await (const vServ of coa.add?.cs?.vserver) {
        const parent = 'add cs vserver';
        const originalString = parent + ' ' + vServ;

        const rxMatch = vServ.match(rx.parents[parent])
        const opts = parseNsOptions(rxMatch.groups?.opts, rx)

        if (!rxMatch) {
            return logger.error(`regex "${rx.parents["add cs vserver"]}" - failed for line "${originalString}"`);
        }

        // object to hold all app details
        const app: AdcApp = {
            name: rxMatch!.groups!.name,
            protocol: rxMatch!.groups!.protocol,
            ipAddress: rxMatch!.groups!.ipAddress,
            type: 'cs',
            port: rxMatch!.groups!.port,
            opts,
            lines: [originalString],
            bindings: {
                '-lbvserver': [],
                '-policyName': []
            }
        }

        // dig 'bind cs vservers'
        //      filter all the 'bind cs vservers' with the app name
        coa.bind?.cs?.vserver?.filter(el => el.startsWith(app.name))
            .forEach(x => {
                const parent = 'bind cs vserver';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent])
                const opts = parseNsOptions(rxMatch.groups?.opts, rx)
                // remove the name from the binding

                // Q?: can a 'bind cs vserver' have multiple -policyName bound to it via multiple lines?

                if (opts['-policyName']) {

                    app.bindings["-policyName"].push(opts as unknown as PolicyRef)

                } else if (opts['-lbvserver']) {

                    app.bindings["-lbvserver"].push(opts['-lbvserver'])

                }

            })

            digAddCsPolicys(app, coa, rx);
            // digAddLbVserver()
            apps.push(sortAdcApp(app))
    }


    // digAddLbVservers()

    // digAddCsVservers()

    // find -policyName from 'add cs bind's

    const xxx = 'debugger!'
    return apps;
    // }
}


// // dig 'bind cs vservers'
// export function digBindCsVservers(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {


// }

export function digAddCsPolicys(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // loop through each policy attached to this app
    app.bindings["-policyName"].forEach(policy => {
        
        // filter out all the policies with this name
        obj.add.cs.policy?.filter(x => x.startsWith(policy['-policyName']))
            .forEach(x => {
                const parent = 'add cs policy';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent]);
                const opts = parseNsOptions(rxMatch.groups.opts, rx)

                // add the policy name to it's details
                opts.name = rxMatch.groups.name;
                if(!app.policies) app.policies = [];
                app.policies.push(opts)

                if (opts['-action']) {
                    // 'add cs action <name> '
                    // get the action config
                    obj.add.cs.action.filter(el => el.startsWith(opts['-action']))
                        .forEach(x => {
                            app.lines.push('add cs action ' + x)
                        })
                }
            })
    })
}


