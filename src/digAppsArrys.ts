import { deepmergeInto } from "deepmerge-ts";
import { AdcConfObj, AdcRegExTree } from "./models";
import { parseNsOptions } from "./parseAdc";


export type AdcApp = {
    name: string;
    ipAddress: string;
    type: string;
    port: number
    opts?: { [k: string]: string };
    lines?: string[];
    bindings?: {
        '-lbvserver': string[];
        '-policyName': string[];
    };
    policies?: {
        name: string;
    }[];
    // additional apps referenced by this app (ie. cs servers pointing to lb servers)
    apps?: AdcApp[]
}

export async function digAppsArrys(obj: AdcConfObj, rx: AdcRegExTree) {

    // start with 'add cs server', build details


    for (const el of obj.add?.cs?.vserver) {

        const originalString = 'add cs vserver ' + el;

        const vserver = originalString.match(rx["add cs vserver"])

        // object to hold all app details
        const app: AdcApp = {
            name: vserver!.groups!.name,
            ipAddress: vserver!.groups!.ipAddress,
            type: vserver!.groups!.type,
            port: vserver!.groups!.port as unknown as number,
            opts: parseNsOptions(vserver!.groups!.opts, rx),
            lines: [originalString],
            bindings: {
                '-lbvserver': [],
                '-policyName': []
            }
        }

        digBindCsVservers(app, obj, rx);

        // digAddLbVservers()

        // digAddCsVservers()

        // find -policyName from 'add cs bind's

        const xxx = 'debugger!'
    }
}


// dig 'bind cs vservers'
export function digBindCsVservers(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // dig 'bind cs vservers'
    //      filter all the 'bind cs vservers' with the app name
    obj.bind?.cs?.vserver?.filter(el => el.includes(app.name))
        .forEach(el => {
            // push each config line to the app object
            app.lines.push('bind cs vserver ' + el)

            // remove the name from the binding
            el = el.replace(app.name + ' ', '')

            // Q?: can a 'bind cs vserver' have multiple -policyName bound to it via multiple lines?

            if (el.includes('-policyName')) {

                // remove the option tag
                el = el.replace('-policyName ', '')
                app.bindings["-policyName"].push(el)

                // dig -policyName details
                // 'add cs policy' - digAddCsPolicy
                digAddCsPolicy(app, obj, rx);

            } else if (el.includes('-lbvserver')) {

                // remove the option tag
                el = el.replace('-lbvserver ', '')
                app.bindings["-lbvserver"].push(el)

                // dig -lbvserver details
                // 'add lb vserver' -> digAddLbVserver
                digAddLbVserver(el, obj, rx);
            }

        })
}

export function digAddCsPolicy(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // loop through each policy attached to this app
    app.bindings["-policyName"].forEach(el => {
        // split off the name of the policy from the rest of the details
        const name = el.split(' ').shift()
        // filter out all the policies with this name
        obj.add.cs.policy.filter(x => x.includes(name))
            .forEach(y => {
                // ad this line to the raw config lines
                app.lines.push('add cs policy ' + y);
                // drop the name
                y = y.replace(name + ' ', '')
                const opts = parseNsOptions(y, rx)

                // todo; put all these parsed options somewhere...

                if (opts['-action']) {
                    // 'add cs action' <name>
                    // get the action config
                    obj.add.cs.action.filter(el => el.startsWith(opts['-action']))
                        .forEach(x => {
                            app.lines.push('add cs action ' + x)
                        })
                }
            })
    })
}


export function digAddLbVserver(lbVserver: string, obj: AdcConfObj, rx: AdcRegExTree) {
    // check app to see if we have an -lbsvserver binding
    // if not, then what???

    const lbApp: AdcApp = {
        name: '',
        type: '',
        ipAddress: '',
        port: 0
    }

    // start with 'add lb vserver'
    obj.add.lb.vserver.filter(el => el.startsWith(lbVserver))
        .forEach(x => {
            // should only be one add lb vserver with this name...
            const originalString = 'add lb vserver ' + x;
            const parent = originalString.match(rx['add lb vserver']);
            const lbApp: AdcApp = {
                name: lbVserver,
                type: parent!.groups!.type,
                ipAddress: parent!.groups!.ipAddress,
                port: parent!.groups!.port as unknown as number
            }
            // merge in vserver config options
            deepmergeInto(
                lbApp,
                parseNsOptions(parent!.groups!.opts, rx)
            )
        })

        return lbApp;



    // // loop through the lbserver bindings on the app
    // app.bindings["-lbvserver"].forEach(el => {
    //     // filter out the lbservers with that name
    //     obj.add.lb.vserver.filter(x => x.includes(el))
    //         .forEach(y => {
    //             // add this line to the raw config lines
    //             app.lines.push('add lb vserver ' + y);
    //         })
    // })
}


export function digAddCsAction(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // 
}