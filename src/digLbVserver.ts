

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

    for await (const vServ of coa.add?.lb?.vserver) {
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

        // app.name = app.name.replace(/"/g, '')

        // if (app.name === '"1 APPLE_443_HTTPS"') {

        //     debugger;
        //     const x = RegExp(/\w+|"[\w\s]*"/);
        //     const y = x.test(app.name)
        //     const v = app.name.split(/\w+|"[\w\s]*"/gm)
        //     const z = y;
        // }

        // function nameFilter()



        // start with 'bind lb vserver'
        // todo:  update this filter to accomodate names with spaces, see above;
        const bindLbVservers = coa.bind?.lb?.vserver?.filter(el => {
            const name = app.name;
            // pull out the app name from the binding
            const bindlbname = el.match(/^(?<name>("[\w.\- ]+"|[\w.\-]+)) (?<service>("[\w.\- ]+"|[\w.\-]+))?/)?.groups?.name;
            // does the app name match the bind lb object?
            const y = name === bindlbname;
            return y;
        });
        for await (const x of bindLbVservers) {
            const parent = 'bind lb vserver';
            const originalString = parent + ' ' + x;
            app.lines.push(originalString);
            const rxMatch = x.match(rx.parents[parent]);

            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }

            // this references a "add service" or "add serviceGroup"

            if (!app.bindings) app.bindings = {};
            if (rxMatch.groups?.service) {

                const serviceName = rxMatch.groups?.service;

                // dig "add service with supporting bind service lines"

                // dig service details -> do we have a service with this name?
                // there should only be one "add service" with this name since we are looking in this specific "bind lb vserver"
                const serviceD = coa.add?.service?.filter(s => {
                    const name = serviceName;
                    const addServices = coa.add.service;
                    // pull out the app name from the binding
                    const sname = s.match(/^(?<name>("[\w.\- ]+"|[\w.\-]+)) (?<service>("[\w.\- ]+"|[\w.\-]+))?/)?.groups?.name;
                    // does the app name match the bind lb object?
                    const y = name === sname;
                    return y;
                });
                for await (const x of serviceD) {
                    const parent = 'add service';
                    const originalString = parent + ' ' + serviceD;
                    app.lines.push(originalString);
                    const rxMatch = x.match(rx.parents[parent])
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

                    // todo: is this where we should dig the service binding options for -monitor references?

                    // dig "bind service <name> ..."
                    await digBindService(serviceName, app, coa, rx)


                    // dig "bind ssl service <name> ..."
                    await digBindSslService(serviceName, app, coa, rx)

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

    }
    return apps;

}

/**
 * dig details for 'bind service <name> ...'
 * @param serviceName 
 * @param app 
 * @param obj 
 * @param rx 
 * @returns 
 */
export async function digBindService(serviceName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {


    // get all the services with matching name
    const bindServices = obj.bind?.service?.filter(s => {
        const bindServicesList = obj.bind.service;

        const sName = s.split(' ')[0] === serviceName
        
        return sName;
    })

    // loop through services and dig additional details
    for await (const x of bindServices) {
        const parent = 'bind service';
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
                    // if (!serviceGroup.servers) serviceGroup.servers = []

                    // serviceGroup.servers.push(Object.assign(serverDetails, i))
                })


        } else if (rxMatch.groups.monitor) {

            const monitorName = rxMatch.groups.monitor.split(' ').pop();

            // add the object param/array if not already there
            // if (!serviceGroup.monitors) serviceGroup.monitors = [];

            //todo: get a list of the default monitor names and add them to the config somehow

            // create the serviceGroup monitor object with the name
            const monitorObj = {
                name: monitorName
            };

            // get monitor config line
            obj.add?.lb?.monitor?.filter(m => m.split(' ')[0] === monitorName)
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

                    // add any monitor object options
                    deepmergeInto(monitorObj, opts)
                })

            // push the full monitor object to the serviceGroup
            // serviceGroup.monitors.push(monitorObj);

        } else if (rxMatch.groups.opts) {
            deepmergeInto(
                // serviceGroup,
                parseNsOptions(rxMatch.groups.opts, rx)
            )
        }
    }
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


    const policies = obj.add?.rewrite?.policy?.filter(s => s.split(' ')[0] === name)

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
 * @param serviceName service name from "bind lb vserver"
 * @param app 
 * @param obj 
 * @param rx 
 */
export async function digService(serviceName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {


    // this should be a single service name
    // retrieve the single service "add service <name> ..."
    //  for each add service, dig all the "add server <name> ..." referenced by the "add service <name> ..."
    // get all the supporting "bind service <name> ..."

    // we have the service name from the "bind lb vserver"
    // filter out the services (single) we need
    // 

    const serviceD = obj.add?.service?.filter(s => {
        const name = serviceName;
        // pull out the app name from the binding
        const sname = s.match(/^(?<name>("[\w.\- ]+"|[\w.\-]+)) (?<service>("[\w.\- ]+"|[\w.\-]+))?/)?.groups?.name;
        // does the app name match the bind lb object?
        const y = name === sname;
        return y;
    })[0];

    if (serviceD) {
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
    const sgs = obj.add?.serviceGroup?.filter(s => s.split(' ')[0] === serviceName)
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
    obj.bind?.serviceGroup?.filter(s => s.split(' ')[0] === serviceName)
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

                // add the object param/array if not already there
                if (!serviceGroup.monitors) serviceGroup.monitors = [];

                //todo: get a list of the default monitor names and add them to the config somehow

                // create the serviceGroup monitor object with the name
                const monitorObj = {
                    name: monitorName
                };

                // get monitor config line
                obj.add?.lb?.monitor?.filter(m => m.split(' ')[0] === monitorName)
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

                        // add any monitor object options
                        deepmergeInto(monitorObj, opts)
                    })

                // push the full monitor object to the serviceGroup
                serviceGroup.monitors.push(monitorObj);

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
    const server = obj?.add?.server?.filter(s => s.split(' ')[0] === serverName)[0]

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


/**
 * digs for matches of "bind ssl vserver <name> ..."
 * @param app 
 * @param obj 
 * @param rx 
 */
export function digSslBinding(app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    const sslBindObj = []

    const appName = app.name;

    // todo: update filter to accomodate spaces in name
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



/**
 * digs for matches of "bind ssl vserver <name> ..."
 * @param app 
 * @param obj 
 * @param rx 
 */
export function digBindSslService(serviceName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    const sslBindObj = []

    const appName = app.name;

    // todo: update filter to accomodate spaces in name
    const appBindSslServices = obj.bind?.ssl?.service?.filter(s => s.startsWith(serviceName))

    // check ssl bindings
    if (appBindSslServices?.length > 0) {
        for (const x of appBindSslServices) {


            const parent = 'bind ssl service';
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