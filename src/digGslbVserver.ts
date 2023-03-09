import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObj, AdcRegExTree } from "./models";
import { parseNsOptions } from "./parseAdc";
import { digGslbService } from "./digGslbService"





export async function digGslbVservers(configObjectArry: AdcConfObj, rx: AdcRegExTree) {

    const apps: AdcApp[] = [];

    // dig 'add gslb vserver '

    configObjectArry.add?.gslb?.vserver.forEach(vServ => {
        const parent = 'add gslb vserver';
        const originalString = parent + ' ' + vServ;
        const rxMatch = vServ.match(rx.parents[parent])

        if (!rxMatch) {
            logger.error(`regex "${rx.parents[parent]}" - failed for line "${originalString}"`,)
            return;
        }

        const app: AdcApp = {
            name: rxMatch.groups.name,
            type: 'gslb',
            protocol: rxMatch.groups.protocol,
            lines: [originalString],
            bindings: {
                "-serviceName": []
            }
        }

        if (rxMatch.groups?.opts) {
            deepmergeInto(
                app['opts'],
                parseNsOptions(rxMatch.groups.opts, rx)
            )
        }

        // look in the 'set gslb vserver' for the same name -> add details
        // setGslbVserver(app)
        configObjectArry.set?.gslb?.vserver.filter(el => el.includes(app.name))
            .forEach(x => {
                const parent = 'set gslb vserver'
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);

                const rxMatch = x.match(rx.parents[parent])


                // // remove the name from the binding
                // x = x.replace(app.name + ' ', '')

                if (rxMatch.groups?.opts) {
                    deepmergeInto(
                        app['opts'],
                        parseNsOptions(rxMatch.groups.opts, rx)
                    )
                }
            })


        // look in the 'bind gslb vserver' for the same name -> add details
        // setGslbVserver(app)
        configObjectArry.bind?.gslb?.vserver.filter(el => el.includes(app.name))
            .forEach(x => {
                const parent = 'bind gslb vserver'
                const originalString = parent + ' ' + x;
                app.lines.push(originalString);

                const rxMatch = x.match(rx.parents[parent])
                const opts = parseNsOptions(rxMatch.groups?.opts, rx)

                // // remove the name from the binding
                // x = x.replace(app.name + ' ', '')
                
                if (opts['-domainName']) {
                    deepmergeInto(
                        app['bindings'],
                        parseNsOptions(rxMatch.groups.opts, rx)
                    )
                }

                if(opts['-serviceName']) {
                    // app.bindings["-serviceName"] = opts["-serviceName"]
                    // this serviceName maps to 'add gslb service' which maps to 'add server'
                    // not going to dig 'add gslb service' here, that will be tacked on later
                    const { gslbService, lines } = digGslbService(opts["-serviceName"], configObjectArry, rx)
                    app.bindings["-serviceName"].push(gslbService)
                    app.lines.push(...lines);
                    const a = 'asdf'
                }
            })


        // configObjectArry.add?.gslb?.service.filter(el => el.includes(app.name))
        // app.bindings?["-serviceName"].forEach(el => )
        apps.push(app);
    });


    // dig 'set gslb vserver '

    // function setGslbVserver(app: AdcApp) {
    //     deepmergeInto(
    //         app['opts'],
    //         parseNsOptions(this.rxMatch.groups.opts, rx)
    //     )
    // }

    // dig 'bind gslb vserver '
    return apps;
}






