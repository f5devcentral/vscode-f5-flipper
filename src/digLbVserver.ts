

import { deepmergeInto } from "deepmerge-ts";
import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, PolicyRef } from "./models";
import { parseNsOptions, sortNsLines } from "./parseAdcUtils";



// #############################################################################
// #############################################################################
// #############################################################################
// ###
// ###  ADD LB VSERVER
// ###
// #############################################################################
// #############################################################################
// #############################################################################

/**
 * dig on details starting with 'add lb vserver'
 * @param lbVserver 
 * @param obj 
 * @param rx 
 * @returns 
 */
export async function digLbVserver(coa: AdcConfObj, rx: AdcRegExTree) {
    // check app to see if we have an -lbsvserver binding
    // if not, then what???

    const apps: AdcApp[] = [];

    coa.add?.lb?.vserver.forEach(vServ => {
        const parent = 'add lb vserver';
        const originalString = 'add lb vserver ' + vServ;
        const rxMatch = vServ.match(rx.parents[parent]);

        if (!rxMatch) {
            /* istanbul ignore next */
            return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
        }
        const opts = parseNsOptions(rxMatch.groups?.opts, rx);

        const app: AdcApp = {
            name: rxMatch!.groups!.name,
            protocol: rxMatch!.groups!.protocol,
            ipAddress: rxMatch!.groups!.ipAddress,
            type: 'lb',
            opts,
            port: rxMatch!.groups!.port,
            lines: [originalString]
        }

        // start with 'bind lb vserver'
        coa.bind?.lb?.vserver?.filter(el => el.startsWith(app.name))
            .forEach(async x => {
                const parent = 'bind lb vserver';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent]);

                if (!rxMatch) {
                    /* istanbul ignore next */
                    return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                }

                if (!app.bindings) app.bindings = {};
                if (rxMatch.groups?.service) {

                    const serviceName = rxMatch.groups?.service;
                    // app.bindings.service.push(rxMatch.groups.service)

                    // dig service details
                    coa.add?.service?.filter(s => s.startsWith(serviceName))
                        .forEach(x => {
                            const parent = 'add service';
                            const originalString = parent + ' ' + x;
                            app.lines.push(originalString);
                            const rxMatch = x.match(rx.parents[parent])
                            const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                            if (!rxMatch) {
                                /* istanbul ignore next */
                                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                            }
                            if (!app.bindings.service) {
                                app.bindings.service = [];
                            }
                            // also get server reference under 'add server <name>'
                            app.bindings.service.push({
                                name: serviceName,
                                protocol: rxMatch.groups.protocol,
                                port: rxMatch.groups.port,
                                server: rxMatch.groups.server,
                                opts
                            })


                        })

                    // dig serviceGroup details
                    await digServiceGroup(serviceName, app, coa, rx)

                } else if (rxMatch.groups?.opts) {

                    const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                    if (opts['-policyName']) {
                        const pName = opts['-policyName'];
                        if (!app.bindings['-policyName']) {
                            app.bindings['-policyName'] = [];
                        }

                        const policy = await digPolicy(pName, app, coa, rx)
                        app.bindings['-policyName'].push(opts as unknown as PolicyRef)
                    }

                }


            })



        apps.push(sortAdcApp(app))

    })
    return apps;

}


/**
 * 
 * digs 'add rewrite policy' associated with vserver
 * 
 * @param name policy name
 * @param app 
 * @param obj 
 * @param rx 
 */
export async function digPolicy(name: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    obj.add.rewrite.policy.filter(s => s.startsWith(name))
        .forEach(x => {
            const parent = 'add rewrite policy';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent]);
            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
            const opts = parseNsOptions(rxMatch.groups?.opts, rx);
            app.lines.push(originalString);
        })

}

/**
 * 
 * @param name serviceGroup name from 'bind lb vserver'
 * @param obj 
 * @param rx 
 */
export async function digServiceGroup(serviceName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // const lines = []
    const serviceGroup: any = {};

    // 'add serviceGroup <serviceName>'
    obj.add?.serviceGroup?.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const parent = 'add serviceGroup';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent])
            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
            const opts = parseNsOptions(rxMatch.groups?.opts, rx);
            app.lines.push(originalString);
            serviceGroup.name = rxMatch.groups.name;
            serviceGroup.protocol = rxMatch.groups.protocol;
            deepmergeInto(serviceGroup, opts)
        })

    // 'bind serviceGroup <serviceName>'
    obj.bind?.serviceGroup?.filter(s => s.startsWith(serviceName))
        .forEach(async x => {
            const parent = 'bind serviceGroup';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent])

            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }

            app.lines.push(originalString);
            if (rxMatch.groups.serv) {


                const memberRef = rxMatch.groups.serv.split(' ');

                // dig server from serviceGroup server reference
                await digServer(memberRef[0], app, obj, rx)
                    .then(i => {
                        if (i) memberRef.splice(1, 0, i)
                        if (!serviceGroup.servers) serviceGroup.servers = []
                        serviceGroup.servers.push(memberRef.join(' '))
                    })


            } else if (rxMatch.groups.monitor) {

                const monitorName = rxMatch.groups.monitor.split(' ').pop();

                //todo: get a list of the default monitor names and add them to the config somehow

                // get monitor config line
                obj.add?.lb?.monitor?.filter(m => m.startsWith(monitorName))
                    .forEach(x => {
                        const parent = 'add lb monitor';
                        const originalString = parent + ' ' + x;
                        app.lines.push(originalString)
                        const rxMatch = x.match(rx.parents[parent])
                        if (!rxMatch) {
                            /* istanbul ignore next */
                            return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                        }
                        const opts = parseNsOptions(rxMatch.groups.opts, rx);
                        serviceGroup.monitor = {
                            name: monitorName
                        }
                        deepmergeInto(serviceGroup.monitor, opts)
                    })

            } else if (rxMatch.groups.opts) {
                deepmergeInto(
                    serviceGroup,
                    parseNsOptions(rxMatch.groups.opts, rx)
                )
            }
        })

    if (Object.keys(serviceGroup).length > 0) {
        if (!app.bindings.serviceGroup) app.bindings.serviceGroup = [];
        app.bindings.serviceGroup.push(serviceGroup)
    }

    // sortNsLines(app.lines, rx)
    digSslBinding(app, obj, rx)

    return;
}


export async function digServer(serverName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree): Promise<string | undefined> {

    let dest = undefined;
    obj?.add?.server?.filter(s => s.startsWith(serverName))
        .forEach(x => {

            const parent = 'add server';
            const originalString = parent + ' ' + x;
            app.lines.push(originalString)
            const rxMatch = x.match(rx.parents[parent])

            if (rxMatch) {
                dest = rxMatch.groups?.dest;
            } else {
                /* istanbul ignore next */
                logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
        })
    return dest;
}



export async function digSslBinding(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    const sslBindObj = []

    // check ssl bindings
    for await (const x of obj.bind?.ssl?.vserver) {

        if (x.startsWith(app.name)) {
            const parent = 'bind ssl vserver';
            const originalString = parent + ' ' + x;
            app.lines.push(originalString);
            const rxMatch = x.match(rx.parents[parent]);

            const opts = parseNsOptions(rxMatch.groups.opts, rx)
            // only parse certkeyName details, pass on all the ciphers and eccCurveNames
            if (opts['-certkeyName']) {
                const certKeyName = opts['-certkeyName']
                obj.add?.ssl?.certKey.filter(el => el.startsWith(certKeyName))
                    .forEach(x => {
                        const parent = 'add ssl certKey';
                        const originalString = parent + ' ' + x;
                        app.lines.push(originalString);
                        const rxMatch = x.match(rx.parents[parent]);
                        const opts2 = parseNsOptions(rxMatch.groups.opts, rx)
                        // deepmergeInto(opts2, opts2)
                        opts2.profileName = certKeyName;
                        sslBindObj.push(opts2)
                    })

            }
            // deepmergeInto(sslBindObj, opts)
        }
    }

    if (sslBindObj.length > 0) {
        app.bindings.certs = sslBindObj;
    }
}