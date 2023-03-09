import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, GslbService } from "./models";

import { parseNsOptions } from "./parseAdc";

/**
 * dig 'add gslb service' details by service name
 * @param serviceName 
 * @param configObjectArry 
 * @param rx 
 */
export function digGslbService(serviceName: string, configObjectArry: AdcConfObj, rx: AdcRegExTree) {

    // const apps: AdcApp[] = [];
    const gslbService: GslbService = {
        serviceName
    }
    const lines: string[] = []

    // dig 'add gslb service '
    configObjectArry.add?.gslb?.service?.filter(el => el.startsWith(serviceName))
        .forEach(x => {
            const parent = 'add gslb service';
            const originalString = parent + ' ' + x;
            const rxMatch = x.match(rx.parents[parent])
            const opts = rxMatch.groups?.opts;

            if (!rxMatch) {
                logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`,)
                return;
            }

            lines.push(originalString)

            const serverName = rxMatch.groups?.server
            gslbService['protocol'] = rxMatch.groups!.protocol;
            gslbService['port'] = rxMatch.groups!.port;
            gslbService['serverName'] = serverName;

            // parse and add in options
            deepmergeInto(gslbService, parseNsOptions(opts, rx))

            if (serverName) {
                // dig server destination details from 'add <server> <dest>'
                // <server> should match the serverName specified in the 'add gslb service'
                configObjectArry.add?.server?.filter(el => el.startsWith(serverName))
                    .forEach(x => {
                        const parent = 'add service'
                        const originalString = parent + ' ' + x;
                        lines.push(originalString)
                        const serverDest = x.split(' ').pop();
                        gslbService['serverDest'] = serverDest
                    })
            }

            if (gslbService['protocol'] === 'SSL') {
                // dig matching 'set ssl service'
                configObjectArry.set?.ssl?.service?.filter(el => el.startsWith(serviceName))
                .forEach(x => {
                    const parent = 'set ssl service';
                    const originalString = parent + ' ' + x;
                    lines.push(originalString)
                    const rxMatch = x.match(rx.parents[parent])
                    const opts = rxMatch.groups?.opts;
                    deepmergeInto(gslbService, parseNsOptions(opts, rx))
                })
            }

            if(gslbService['-siteName']) {
                // dig 'add gslb site'

            }

        })

    return { gslbService, lines};

    // dig 'set gslb vserver '? not found in configs at this time

    // dig 'bind gslb vserver '
}