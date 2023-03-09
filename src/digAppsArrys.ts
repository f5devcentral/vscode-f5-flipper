import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree } from "./models";
import { parseNsOptions } from "./parseAdc";






export async function digAddCsVserver(app: string, obj: AdcConfObj, rx: AdcRegExTree) {

    // start with 'add cs server', build details


    // for (const el of obj.add?.cs?.vserver) {

    const parent = 'add cs vserver';
    const originalString = 'add cs vserver ' + app;

    const vserver = originalString.match(rx.parents[parent])

    if (!vserver) {
        logger.error(`regex "${rx.parents["add cs vserver"]}" - failed for line "${originalString}"`, )
        return;
    }

    // object to hold all app details
    const appDet: AdcApp = {
        name: vserver!.groups!.name,
        protocol: vserver!.groups!.protocol,
        ipAddress: vserver!.groups!.ipAddress,
        type: 'cs',
        port: vserver!.groups!.port,
        opts: parseNsOptions(vserver!.groups!.opts, rx),
        lines: [originalString],
        bindings: {
            '-lbvserver': [],
            '-policyName': []
        }
    }

    digBindCsVservers(appDet, obj, rx);

    // digAddLbVservers()

    // digAddCsVservers()

    // find -policyName from 'add cs bind's

    const xxx = 'debugger!'
    return appDet;
    // }
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
                // may want to pass on digging the lbVserver at this point
                //      and just use the binding reference to pull it in during explosion
                // const lbApp = await digAddLbVserver(el, obj, rx);
                // app.apps.push(lbApp)
            }

        })
}

export function digAddCsPolicy(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // loop through each policy attached to this app
    app.bindings["-policyName"].forEach(el => {
        // split off the name of the policy from the rest of the details
        const name = el.split(' ').shift()
        // filter out all the policies with this name
        obj.add.cs.policy?.filter(x => x.includes(name))
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
