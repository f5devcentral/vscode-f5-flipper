

import { deepmergeInto } from "deepmerge-ts";
import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, PolicyRef } from "./models";
import { parseNsOptions, sortNsLines } from "./parseAdcUtils";
import { isIP } from "net";



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

    // if there are no add lb vservers, then return the empty array
    if (!coa.add?.lb?.vserver) return apps;

    await Promise.all(coa.add?.lb?.vserver?.map(async vServ => {
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
        const bindLbVservers = coa.bind?.lb?.vserver?.filter(el => el.startsWith(app.name));
        for await (const x of bindLbVservers) {
            const parent = 'bind lb vserver';
            const originalString = parent + ' ' + x;
            app.lines.push(originalString);
            const rxMatch = x.match(rx.parents[parent]);

            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }

            // todo:  need to see if this references a "add service" or "add serviceGroup"

            if (!app.bindings) app.bindings = {};
            if (rxMatch.groups?.service) {

                const serviceName = rxMatch.groups?.service;
                // app.bindings.service.push(rxMatch.groups.service)

                // dig service details -> do we have a service with this name?
                // there should only be one "add service" with this name since we are looking in this specific "bind lb vserver"
                const serviceD = coa.add?.service?.filter(s => s.startsWith(serviceName))[0]
                if (serviceD) {
                    // this should only ever find one
                    const parent = 'add service';
                    const originalString = parent + ' ' + serviceD;
                    app.lines.push(originalString);
                    const rxMatch = serviceD.match(rx.parents[parent])
                    const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                    if (!rxMatch) {
                        /* istanbul ignore next */
                        return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                    }

                    // if we have service details create array to put them
                    if (!app.bindings.service) {
                        app.bindings.service = [];
                    }

                    let serviceDetails = {
                        name: serviceName,
                        protocol: rxMatch.groups.protocol,
                        port: rxMatch.groups.port,
                        server: rxMatch.groups.server,
                        opts
                    }

                    // also get server reference under 'add server <name>'
                    if (rxMatch.groups.server) {

                        // dig server from serviceGroup server reference
                        await digServer(rxMatch.groups.server, app, coa, rx)
                            .then(i => {
                                if (i) {
                                    serviceDetails = Object.assign(serviceDetails, i)
                                }
                            })
                    }

                    // push service details to app config
                    app.bindings.service.push(serviceDetails)
                }

                // dig serviceGroup details
                await digServiceGroup(serviceName, app, coa, rx)

            } else if (rxMatch.groups?.opts) {

                const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                if (opts['-policyName']) {
                    const pName = opts['-policyName'];
                    if (!app.bindings['-policyName']) {
                        app.bindings['-policyName'] = [];
                    }

                    // this reference is for "add rewrite policy"
                    const policy = await digPolicy(pName, app, coa, rx)
                    app.bindings['-policyName'].push(opts as unknown as PolicyRef)
                }
            }
        };

        apps.push(app)

    }))
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


    const policies = obj.add?.rewrite?.policy?.filter(s => s.startsWith(name))

    if (policies?.length > 0) {
        for await (const x of policies) {
            const parent = 'add rewrite policy';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent]);
            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
            const opts = parseNsOptions(rxMatch.groups?.opts, rx);
            app.lines.push(originalString);
        }
    }
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
    const sgs = obj.add?.serviceGroup?.filter(s => s.startsWith(serviceName))
    // should produce one since each "add serviceGroup" will be unique
    // there is a 1:many with "add serviceGroup" to "bind serviceGroup"
    if (sgs?.length > 0) {

        for await (const x of sgs) {
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
        }
    }

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

                        const serverDetails = {
                            name: memberRef[0],
                            port: memberRef[1]
                        }
                        if (!serviceGroup.servers) serviceGroup.servers = []

                        serviceGroup.servers.push(Object.assign(serverDetails, i))
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


export async function digServer(serverName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree): Promise<{ address?: string, hostname?: string } | undefined> {

    const dest: { address?: string, hostname?: string } = {};
    const server = obj?.add?.server?.filter(s => s.startsWith(serverName))[0]

    if (server) {

        const parent = 'add server';
        const originalString = parent + ' ' + server;
        app.lines.push(originalString)
        const rxMatch = server.match(rx.parents[parent])

        if (rxMatch) {

            // is this an ip address
            const isAddress = isIP(rxMatch.groups?.dest);
            if (isAddress) {

                dest.address = rxMatch.groups.dest;
            } else {
                dest.hostname = rxMatch.groups.dest;
            }
        } else {
            /* istanbul ignore next */
            logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
        }
    }
    return dest;
}



export function digSslBinding(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    const sslBindObj = []

    const appName = app.name;

    const appSslVservers = obj.bind?.ssl?.vserver?.filter(s => s.startsWith(appName))

    // check ssl bindings
    if (appSslVservers?.length > 0) {
        for (const x of appSslVservers) {


            const parent = 'bind ssl vserver';
            const originalString = parent + ' ' + x;
            app.lines.push(originalString);
            const rxMatch = x.match(rx.parents[parent]);

            const opts = parseNsOptions(rxMatch.groups.opts, rx)
            // only parse certkeyName details, pass on all the ciphers and eccCurveNames
            if (opts['-certkeyName']) {
                const certKeyName = opts['-certkeyName']

                for (const el of obj.add?.ssl?.certKey) {

                    if (el.startsWith(certKeyName)) {
                        const parent = 'add ssl certKey';
                        const originalString = parent + ' ' + el;
                        app.lines.push(originalString);
                        const rxMatch = el.match(rx.parents[parent]);
                        const opts2 = parseNsOptions(rxMatch.groups.opts, rx)
                        opts2.profileName = certKeyName;
                        sslBindObj.push(opts2)
                    }
                }
            }

            // not parsing any "set ssl vserver" details at this time
            // probably not going to so the migration can be more of a refactor and utilize updated ssl settings, which are most important
        }
    }

    if (sslBindObj.length > 0) {
        app.bindings.certs = sslBindObj;
    }
}