

import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree } from "./models";
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
export async function digLbVserver(lbVserver: string, obj: AdcConfObj, rx: AdcRegExTree) {
    // check app to see if we have an -lbsvserver binding
    // if not, then what???

    let lbApp: AdcApp = {
        name: '',
        type: 'lb',
        protocol: '',
        ipAddress: '',
        port: '',
        lines: []
    }

    // start with 'add lb vserver'
    obj.add?.lb?.vserver?.filter(el => el.startsWith(lbVserver))
        .forEach(x => {
            // should only be one add lb vserver with this name...
            const originalString = 'add lb vserver ' + x;
            lbApp.lines.push(originalString)
            const parent = originalString.match(rx.parents['add lb vserver']);
            if (!parent) {
                logger.error(`regex "${rx.parents['add lb vserver']}" - failed for line "${originalString}"`, )
                return;
            }
            lbApp.name = lbVserver,
                lbApp.protocol = parent!.groups!.protocol,
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
    obj.bind?.lb?.vserver?.filter(el => el.startsWith(app.name))
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
    obj.add?.serviceGroup?.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const originalString = 'add serviceGroup ' + x
            lines.push(originalString);
            const parent = originalString.match(rx.parents["add serviceGroup"])
            serviceGroup.name = parent.groups.name;
            serviceGroup.protocol = parent.groups.protocol;
            deepmergeInto(
                serviceGroup,
                parseNsOptions(parent!.groups!.opts, rx)
            )
        })

    // 'bind serviceGroup <serviceName>'
    obj.bind?.serviceGroup?.filter(s => s.startsWith(serviceName))
        .forEach(x => {
            const originalString = 'bind serviceGroup ' + x
            lines.push(originalString);
            const parent = originalString.match(rx.parents["bind serviceGroup"])
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