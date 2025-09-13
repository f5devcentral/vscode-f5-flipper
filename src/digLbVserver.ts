

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
                await digService(serviceName, app, coa, rx)

                // dig serviceGroup details
                await digServiceGroup(serviceName, app, coa, rx)

            } else if (rxMatch.groups?.opts) {

                const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                if (opts['-policyName']) {
                    const pName = opts['-policyName'];

                    // initialize the policy array
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

    //if no bindservices, break/return
    if(!bindServices) return;

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

    // todo: add support for spaces in names
    const rwPolicies = obj.add?.rewrite?.policy?.filter(s => s.split(' ')[0] === name)

    if (rwPolicies?.length > 0) {
        for await (const x of rwPolicies) {
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

    const rsPolicies = obj.add?.responder?.policy?.filter(s => s.split(' ')[0] === name)

    if (rsPolicies?.length > 0) {
        for await (const x of rsPolicies) {
            const parent = 'add responder policy';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent]);
            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
            const opts = parseNsOptions(rxMatch.groups?.opts, rx);

            // todo: dig the responder policie actions from namaste app
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
export async function digService(serviceName: string, app: AdcApp, coa: AdcConfObj, rx: AdcRegExTree) {


    // this should be a single service name
    // retrieve the single service "add service <name> ..."
    //  for each add service, dig all the "add server <name> ..." referenced by the "add service <name> ..."
    // get all the supporting "bind service <name> ..."

    // we have the service name from the "bind lb vserver"
    // filter out the services (single) we need
    // 

    const serviceD = coa.add?.service?.filter(s => {
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
    const serviceGroupString = obj.add?.serviceGroup?.filter(s => {
        const name = serviceName;
        // pull out the app name from the binding
        const sname = s.match(/^(?<name>("[\w.\- ]+"|[\w.\-]+)) (?<service>("[\w.\- ]+"|[\w.\-]+))?/)?.groups?.name;
        // does the app name match the bind lb object?
        const y = name === sname;
        return y;
    })[0]

    // should produce one since each "add serviceGroup" will be unique
    // there is a 1:many with "add serviceGroup" to "bind serviceGroup"
    if (serviceGroupString) {

        const parent = 'add serviceGroup';
        const originalString = parent + ' ' + serviceGroupString;
        const rxMatch = serviceGroupString.match(rx.parents[parent])
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

    // 'bind serviceGroup <serviceName>'
    // can have multiple bingings
    const serviceGroupBindings = obj.bind?.serviceGroup?.filter(s => {
        const name = serviceName;
        // pull out the app name from the binding
        const sname = s.match(/^(?<name>("[\w.\- ]+"|[\w.\-]+)) (?<service>("[\w.\- ]+"|[\w.\-]+))?/)?.groups?.name;
        // does the app name match the bind lb object?
        const y = name === sname;
        return y;
    })
    if(serviceGroupBindings?.length > 0) {

        for await (const x of serviceGroupBindings) {
            const parent = 'bind serviceGroup';
            const originalString = parent + ' ' + x;
            // demo/test at following site
            // https://regex101.com/r/uEGKaI/1
            const rxMatch = x.match(rx.parents[parent])
    
            if (!rxMatch) {
                /* istanbul ignore next */
                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
            }
            const sgbOpts = parseNsOptions(rxMatch?.groups?.opts, rx)
    
            app.lines.push(originalString);
            if (rxMatch?.groups?.serv) {
    
                // const memberRef = rxMatch.groups.serv.split(' ');
                const sgMemberName = rxMatch.groups.serv;
                const sgMemberPort = rxMatch.groups.port;
    
                const sgmOpts = parseNsOptions(rxMatch.groups.mbrOpts, rx)
    
                // dig server from serviceGroup server reference
                await digServer(sgMemberName, app, obj, rx)
                    .then(i => {
    
                        const serverDetails = {
                            name: sgMemberName,
                            port: sgMemberPort
                        }
                        
                        if (!serviceGroup.servers) serviceGroup.servers = []
                        // merge all the details together and push to app.json
                        serviceGroup.servers.push(
                            Object.assign(serverDetails, i, sgmOpts, sgbOpts)
                        )
                    })
    
    
            } else if (sgbOpts["-monitorName"]) {
    
                const monitorName = sgbOpts["-monitorName"];
    
                // add the object param/array if not already there
                if (!serviceGroup.monitors) serviceGroup.monitors = [];
    
                //todo: get a list of the default monitor names and add them to the config somehow
    
                // create the serviceGroup monitor object with the name
                const monitorObj = {
                    name: monitorName
                };
    
                // get monitor config line
                // todo: add support for monitors with spaces in name
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
                        
                        if(rxMatch?.groups?.protocol) {
                            // if we got the monitor type (protocol) from the rx, inject it into the opts object
                            opts.protocol = rxMatch.groups?.protocol
                        }
                        // add any monitor object options
                        deepmergeInto(monitorObj, opts)
                    })
    
                // push the full monitor object to the serviceGroup
                serviceGroup.monitors.push(monitorObj);
    
            }
        }
    }

    // if we discovered serviceGroup details, push them to the app.json
    if (Object.keys(serviceGroup).length > 0) {
        if (!app.bindings.serviceGroup) app.bindings.serviceGroup = [];
        app.bindings.serviceGroup.push(serviceGroup)
    }

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

    const sslBindObj = {}

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

                // wrap following in if statement if add.ssl.certKey is not always present
                if(obj.add.ssl?.certKey) {
                    for (const el of obj.add.ssl.certKey) {
    
                        if (el.startsWith(certKeyName)) {
                            const parent = 'add ssl certKey';
                            const originalString = parent + ' ' + el;
                            app.lines.push(originalString);
                            const rxMatch = el.match(rx.parents[parent]);
                            const opts2 = parseNsOptions(rxMatch.groups.opts, rx)
                            deepmergeInto(sslBindObj,opts2)
                        }
                    }
                }

                if (obj.bind.ssl.vserver) {
                    for (const el of obj.bind.ssl.vserver) {
    
                        if (el.startsWith(appName)) {
                            const parent = 'bind ssl vserver';
                            const originalString = parent + ' ' + el;
                            app.lines.push(originalString);
                            const rxMatch = el.match(rx.parents[parent]);
                            const opts2 = parseNsOptions(rxMatch.groups.opts, rx)
                            if (opts2['-eccCurveName']) {
                                if (!sslBindObj['-eccCurveName']) sslBindObj['-eccCurveName'] = [];
                                sslBindObj['-eccCurveName'].push(opts2['-eccCurveName']);
                            } else {
                                deepmergeInto(sslBindObj,opts2)
                            }
                        }
                    }
                };
            }

            // not parsing any "set ssl vserver" details at this time
            // probably not going to so the migration can be more of a refactor and utilize updated ssl settings, which are most important


        }
    }

    // if (sslBindObj.length > 0) {
        // create certs array if not there
        if (!app.bindings.certs) app.bindings.certs = [];
        app.bindings.certs.push(sslBindObj);
    // }
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