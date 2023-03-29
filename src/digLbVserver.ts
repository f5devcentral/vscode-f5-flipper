

import { deepmergeInto } from "deepmerge-ts";
import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, PolicyRef } from "./models";
import { parseNsOptions } from "./parseAdc";



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

    for await (const vServ of coa.add?.lb?.vserver) {
        const parent = 'add lb vserver';
        const originalString = 'add lb vserver ' + vServ;
        const rxMatch = vServ.match(rx.parents[parent]);

        if (!rxMatch) {
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
            .forEach(x => {
                const parent = 'bind lb vserver';
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);
                const rxMatch = x.match(rx.parents[parent]);

                if (!rxMatch) {
                    return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                }

                if(!app.bindings) app.bindings = {};
                if (rxMatch.groups?.service) {

                    const serviceName = rxMatch.groups?.service;
                    // app.bindings.service.push(rxMatch.groups.service)

                    coa.add?.service?.filter(s => s.startsWith(serviceName))
                        .forEach(x => {
                            const parent = 'add service';
                            const originalString = parent + ' ' + x;
                            app.lines.push(originalString);
                            const rxMatch = x.match(rx.parents[parent])
                            const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                            if (!rxMatch) {
                                return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                            }
                            if(!app.bindings.service) {
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


                    const sg = digServiceGroup(serviceName, app, coa, rx)
                    // app.lines.push(...sg.lines);
                    // if(!app.bindings.serviceGroup && sg.serviceGroup) {
                    //     app.bindings.serviceGroup = [];
                    // }
                    // app.bindings.serviceGroup.push(sg.serviceGroup)

                } else if (rxMatch.groups?.opts) {

                    const opts = parseNsOptions(rxMatch.groups?.opts, rx);
                    if (opts['-policyName']) {
                        if(!app.bindings['-policyName']) {
                            app.bindings['-policyName'] = [];
                        }
                        app.bindings['-policyName'].push(opts as unknown as PolicyRef)
                    }

                }


            })



        apps.push(sortAdcApp(app))

    }
    return apps;

}

/**
 * 
 * @param name serviceGroup name from 'bind lb vserver'
 * @param obj 
 * @param rx 
 */
export function digServiceGroup(serviceName: string, app: AdcApp, obj: AdcConfObj, rx: AdcRegExTree) {

    // const lines = []
    const serviceGroup: any = {};

    // 'add serviceGroup <serviceName>'
    obj.add?.serviceGroup?.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const parent = 'add serviceGroup';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent])
            if (!rxMatch) {
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
        .forEach(x => {
            const parent = 'bind serviceGroup';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent])
            app.lines.push(originalString);
            if (rxMatch.groups.serv) {
                
                if(!serviceGroup.servers ) serviceGroup.servers = []
                serviceGroup.servers.push(rxMatch.groups.serv)

            } else if (rxMatch.groups.monitor) {

                const monitorName = rxMatch.groups.monitor.split(' ').pop();

                //todo: get a list of the default monitor names and add them to the config somehow

                // get monitor config line
                obj.add.lb.monitor.filter(m => m.startsWith(monitorName))
                    .forEach(x => {
                        const parent = 'add lb monitor';
                        const originalString = parent + ' ' + x;
                        app.lines.push(originalString)
                        const rxMatch = x.match(rx.parents[parent])
                        if (!rxMatch) {
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
        
        if(Object.keys(serviceGroup).length > 0) {
            if(!app.bindings.serviceGroup) app.bindings.serviceGroup = [];
            app.bindings.serviceGroup.push(serviceGroup)
        }

    return;
}