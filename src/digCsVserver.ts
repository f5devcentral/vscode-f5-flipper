import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, Appflow, PolicyRef } from "./models";
import { parseNsOptions } from "./parseAdcUtils";
import { digSslBinding } from "./digLbVserver";





/**
 * 
 * @param app 
 * @param obj 
 * @param rx 
 * @returns 
 */
export async function digCsVservers(coa: AdcConfObj, rx: AdcRegExTree) {

    const apps: AdcApp[] = [];

    if(!coa.add?.cs?.vserver) return apps;

    await Promise.all(coa.add?.cs?.vserver?.map(async vServ => {

        const parent = 'add cs vserver';
        const originalString = parent + ' ' + vServ;

        const rxMatch = vServ.match(rx.parents[parent])
        const opts = parseNsOptions(rxMatch.groups?.opts, rx)

        if (!rxMatch) {
            /* istanbul ignore next */
            return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
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

        await digAddCsPolicys(app, coa, rx);
        await digSslBinding(app, coa, rx);
        apps.push(sortAdcApp(app))
    }))

    return apps;
}

export async function digAddCsPolicys(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // loop through each policy attached to this app
    app.bindings["-policyName"].forEach(policy => {

        // filter out all the policies with this name
        obj.add?.cs?.policy?.filter(x => x.startsWith(policy['-policyName']))
            .forEach(x => {
                const parent = 'add cs policy';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent]);

                if (!rxMatch) {
                    /* istanbul ignore next */
                    return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                }

                const opts = parseNsOptions(rxMatch.groups.opts, rx)

                // add the policy name to it's details
                opts.name = rxMatch.groups.name;
                if (!app.csPolicies) app.csPolicies = [];
                app.csPolicies.push(opts)

                if (opts['-action']) {
                    // 'add cs action <name> '
                    // get the action config
                    obj.add.cs.action.filter(el => el.startsWith(opts['-action']))
                        .forEach(x => {
                            const parent = 'add cs action';
                            const originalString = parent + ' ' + x;
                            app.lines.push(originalString)
                            const rxMatch = x.match(rx.parents[parent]);
                            if (!rxMatch) {
                                /* istanbul ignore next */
                                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                            }
                            const opts = parseNsOptions(rxMatch.groups.opts, rx);

                            if (!app.csPolicyActions) {
                                app.csPolicyActions = [];
                            }
                            app.csPolicyActions.push(opts)
                        })
                }
            })

        //todo:  dig appflow referenced by -policyName
        // 'add appflow policy <name>' -> 'add appflow action <name>' -> 'add appflow collector <name>'

        obj.add?.appflow?.policy?.filter(x => x.startsWith(policy['-policyName']))
            .forEach(x => {
                //https://developer-docs.citrix.com/projects/netscaler-command-reference/en/12.0/appflow/appflow-policy/appflow-policy/#add-appflow-policy
                //add appflow policy <name> <rule> <action> [-undefAction <string>] [-comment <string>]

                // applfows are like sflow or Cisco NetFlow.  
                // not really necessary for deep app parsing to convert to other solutions,
                //   but having the config lines should provide insight that the feature was configured 
                //      and may need to be configured in other ways

                const parent = 'add appflow policy';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent]);
                const afName = rxMatch.groups.name;
                const afRule = rxMatch.groups.rule;
                const afAction = rxMatch.groups.action;

                if (!rxMatch) {
                    /* istanbul ignore next */
                    return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                }

                // const opts = parseNsOptions(rxMatch.groups.opts, rx)

                const appflow: Appflow = {
                    name: rxMatch.groups.name,
                    rule: rxMatch.groups?.rule,
                    action: []
                }

                // dig each appflow action                

                if (rxMatch.groups?.action) {
                    // 'add appflow action <name> '
                    obj.add?.appflow?.action?.filter(el => el.startsWith(afAction))
                        .forEach(x => {
                            const parent = 'add appflow action';
                            const originalString = parent + ' ' + x;
                            app.lines.push(originalString)
                            const rxMatch = x.match(rx.parents[parent]);
                            if (!rxMatch) {
                                /* istanbul ignore next */
                                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                            }
                            const opts = parseNsOptions(rxMatch.groups.opts, rx)
                            if (opts['-collectors']) {
                                const collectorName = opts['-collectors'];
                                obj.add.appflow.collector.filter(el => el.startsWith(collectorName))
                                    .forEach(x => {
                                        const parent = 'add appflow collector';
                                        const originalString = parent + ' ' + x;
                                        app.lines.push(originalString)
                                    })
                            }
                            if (!app.csPolicyActions) {
                                app.csPolicyActions = [];
                            }
                            app.csPolicyActions.push(opts);
                        })
                }
            })
    })

    return;
}


