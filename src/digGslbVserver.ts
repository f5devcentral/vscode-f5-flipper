import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree, DomainBinding } from "./models";
import { parseNsOptions } from "./parseAdcUtils";
import { digGslbService } from "./digGslbService"
import { sortAdcApp } from "./CitrixADC";





export async function digGslbVservers(coa: AdcConfObj, rx: AdcRegExTree) {

    const apps: AdcApp[] = [];

    // dig 'add gslb vserver '

    coa.add?.gslb?.vserver.forEach(vServ => {
        const parent = 'add gslb vserver';
        const originalString = parent + ' ' + vServ;
        const rxMatch = vServ.match(rx.parents[parent])

        if (!rxMatch) {
            return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
        }

        const opts = parseNsOptions(rxMatch.groups?.opts, rx);

        const app: AdcApp = {
            name: rxMatch.groups.name,
            type: 'gslb',
            protocol: rxMatch.groups.protocol,
            lines: [originalString],
            opts,
            bindings: {
                "-serviceName": []
            }
        }

        // look in the 'set gslb vserver' for the same name -> add details
        // setGslbVserver(app)
        coa.set?.gslb?.vserver.filter(el => el.startsWith(app.name))
            .forEach(x => {
                const parent = 'set gslb vserver'
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);

                const rxMatch = x.match(rx.parents[parent])
                if (!rxMatch) {
                    return logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`);
                }

                const opts = parseNsOptions(rxMatch.groups?.opts, rx);

                deepmergeInto(
                    app['opts'],
                    opts
                )
            })


        // look in the 'bind gslb vserver' for the same name -> add details
        // setGslbVserver(app)
        coa.bind?.gslb?.vserver.filter(el => el.startsWith(app.name))
            .forEach(x => {
                const parent = 'bind gslb vserver'
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);

                const rxMatch = x.match(rx.parents[parent])
                const opts = parseNsOptions(rxMatch.groups?.opts, rx)


                if (opts['-domainName']) {
                    if(!app.bindings['-domainName']) app.bindings['-domainName'] = [];
                    app.bindings['-domainName'].push(opts as unknown as DomainBinding)

                }

                if (opts['-serviceName']) {
                    // app.bindings["-serviceName"] = opts["-serviceName"]
                    // this serviceName maps to 'add gslb service' which maps to 'add server'
                    // not going to dig 'add gslb service' here, that will be tacked on later
                    const { gslbService, lines } = digGslbService(opts["-serviceName"], coa, rx)
                    app.bindings["-serviceName"].push(gslbService)
                    app.lines.push(...lines);
                    const a = 'asdf'
                }
            })

        apps.push(sortAdcApp(app));
    });

    return apps;
}

