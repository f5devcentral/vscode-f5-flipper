import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree } from "./models";
import { parseNsOptions } from "./parseAdc";






export async function digAddCsVserver(app: string, obj: AdcConfObj, rx: AdcRegExTree) {

    // start with 'add cs server', build details


    // for (const el of obj.add?.cs?.vserver) {

    const originalString = 'add cs vserver ' + app;

    const vserver = originalString.match(rx["add cs vserver"])

    if (!vserver) {
        logger.error(`regex "${rx["add cs vserver"]}" - failed for line "${originalString}"`, )
        return;
    }

    // object to hold all app details
    const appDet: AdcApp = {
        name: vserver!.groups!.name,
        ipAddress: vserver!.groups!.ipAddress,
        type: vserver!.groups!.type,
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


/**
 * dig by just vserver name so we can use this to look up 'add cs vserver' bindings also
 * @param lbVserver 
 * @param obj 
 * @param rx 
 * @returns 
 */
export async function digAddLbVserver(lbVserver: string, obj: AdcConfObj, rx: AdcRegExTree) {
    // check app to see if we have an -lbsvserver binding
    // if not, then what???

    let lbApp: AdcApp = {
        name: '',
        type: '',
        ipAddress: '',
        port: '',
        lines: []
    }

    // start with 'add lb vserver'
    obj.add.lb.vserver.filter(el => el.startsWith(lbVserver))
        .forEach(x => {
            // should only be one add lb vserver with this name...
            const originalString = 'add lb vserver ' + x;
            lbApp.lines.push(originalString)
            const parent = originalString.match(rx['add lb vserver']);
            if (!parent) {
                logger.error(`regex "${rx['add lb vserver']}" - failed for line "${originalString}"`, )
                return;
            }
            lbApp.name = lbVserver,
                lbApp.type = parent!.groups!.type,
                lbApp.ipAddress = parent!.groups!.ipAddress,
                lbApp.port = parent!.groups!.port,
                // merge in vserver config options
                deepmergeInto(
                    lbApp,
                    parseNsOptions(parent!.groups!.opts, rx)
                )
        })

    // dig 'bind lb vserver'

    digBindLbVserver(lbApp, obj, rx)


    return lbApp;



}


export function digBindLbVserver(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // get the app name
    // const appName = app.name;

    // app.lines = []

    // Q?: can a vserver has multiple service bindings?

    // loop through 'bind lb vserver' for matches to app name
    obj.bind.lb.vserver.filter(el => el.startsWith(app.name))
        .forEach(x => {

            const originalString = 'bind lb vserver ' + x;
            app.lines.push(originalString)

            app.bindings = {};  // start buiding the bingings object
            app.bindings.service = []   // create the service array
            app.bindings.serviceGroup = []   // create the service array

            const serviceName = x.split(' ').pop();

            // 'add service <serviceName>'
            obj.add.service?.filter(s => s.startsWith(serviceName))
                .forEach(x => {
                    app.lines.push('add service' + x);
                    app.bindings.service.push(serviceName)
                })

            const sg = digServiceGroup(serviceName, obj, rx)

            app.lines.push(...sg.lines);
            app.bindings.serviceGroup.push(sg.serviceGroup)

            // 'add serviceGroup <serviceName>'
            // obj.add.serviceGroup.filter(s => s.startsWith(serviceName))
            //     .forEach(x => {
            //         app.lines.push('add serviceGroup' + x);
            //     })

            // // 'bind serviceGroup <serviceName>'
            // obj.bind.serviceGroup.filter(s => s.startsWith(serviceName))
            //     .forEach(x => {
            //         app.lines.push('bind serviceGroup' + x);

            //     })
        })
}

/**
 * 
 * @param name serviceGroup name from 'bind lb vserver'
 * @param obj 
 * @param rx 
 */
export function digServiceGroup(serviceName: string, obj: AdcConfObj, rx: AdcRegExTree) {

    const lines = []
    const serviceGroup: any = {
        servers: []
    };

    // 'add serviceGroup <serviceName>'
    obj.add.serviceGroup.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const originalString = 'add serviceGroup ' + x
            lines.push(originalString);
            const parent = originalString.match(rx["add serviceGroup"])
            serviceGroup.name = parent.groups.name;
            serviceGroup.type = parent.groups.type;
            deepmergeInto(
                serviceGroup,
                parseNsOptions(parent!.groups!.opts, rx)
            )
        })

    // 'bind serviceGroup <serviceName>'
    obj.bind.serviceGroup.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const originalString = 'bind serviceGroup ' + x
            lines.push(originalString);
            const parent = originalString.match(rx["bind serviceGroup"])
            if (parent.groups?.serv) {
                
                serviceGroup.servers.push(parent.groups.serv)

            } else if (parent.groups?.monitor) {

                const monitorName = parent.groups.monitor.split(' ').pop();
                
                // get monitor config line
                obj.add.lb.monitor.filter(m => m.startsWith(monitorName))
                    .forEach(eM => {
                        lines.push('add lb monitor ' + eM)
                        serviceGroup.monitor = monitorName;
                    })

            } else if (parent.groups?.opts) {
                deepmergeInto(
                    serviceGroup,
                    parseNsOptions(parent!.groups!.opts, rx)
                )
            }
        })

    return { lines, serviceGroup };
}