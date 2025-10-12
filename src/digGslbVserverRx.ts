import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObjRx, AdcRegExTree, NsObject, DomainBinding, GslbService } from "./models";
import { sortAdcApp } from "./CitrixADC";

/**
 * Digest GSLB vservers using RX-parsed objects (not arrays)
 * This is the new implementation using configObjectArryRx
 */
export async function digGslbVserversRx(coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const apps: AdcApp[] = [];

    // Check if we have any GSLB vservers
    if (!coaRx.add?.gslb?.vserver) return apps;

    // Iterate over GSLB vserver objects (keyed by name)
    for (const [vsName, vs] of Object.entries(coaRx.add.gslb.vserver)) {

        const app: AdcApp = {
            name: vs.name,
            type: 'gslb',
            protocol: vs.protocol,
            lines: [vs._line],
            opts: extractOptions(vs),
            bindings: {
                "-serviceName": []
            }
        };

        // Process 'set gslb vserver' - merge additional options
        const setVserver = coaRx.set?.gslb?.vserver?.[vsName];
        if (setVserver) {
            app.lines.push(setVserver._line);
            deepmergeInto(app['opts'], extractOptions(setVserver));
        }

        // Process 'bind gslb vserver' bindings
        const bindings = coaRx.bind?.gslb?.vserver?.[vsName];
        if (bindings) {
            for (const [bindName, bind] of Object.entries(bindings)) {
                app.lines.push(bind._line);

                if (bind['-domainName']) {
                    if (!app.bindings['-domainName']) app.bindings['-domainName'] = [];
                    app.bindings['-domainName'].push(extractOptions(bind) as unknown as DomainBinding);
                }

                if (bind['-serviceName']) {
                    // Dig GSLB service details
                    const { gslbService, lines } = digGslbServiceRx(bind['-serviceName'], coaRx, rx);
                    app.bindings["-serviceName"].push(gslbService);
                    app.lines.push(...lines);
                }
            }
        }

        apps.push(sortAdcApp(app));
    }

    return apps;
}

/**
 * Extract options from parsed object (exclude special properties)
 */
function extractOptions(obj: NsObject): Record<string, any> {
    const opts: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key !== 'name' && key !== '_line' && key !== 'protocol' && key !== 'ipAddress' && key !== 'port' && key !== 'server') {
            opts[key] = value;
        }
    }
    return opts;
}

/**
 * Dig GSLB service details using RX objects
 */
function digGslbServiceRx(serviceName: string, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const gslbService: GslbService = {
        serviceName
    };
    const lines: string[] = [];

    // Get 'add gslb service'
    const service = coaRx.add?.gslb?.service?.[serviceName];
    if (service) {
        lines.push(service._line);

        gslbService['protocol'] = service.protocol;
        gslbService['port'] = service.port;
        gslbService['serverName'] = service.server;

        // Add options
        deepmergeInto(gslbService, extractOptions(service));

        // Dig server destination
        if (service.server) {
            const server = coaRx.add?.server?.[service.server];
            if (server) {
                // BUG FIX #2: Output correct "add server" line (original was buggy)
                lines.push(server._line);
                // BUG FIX #3: Use parsed dest property (original used buggy split)
                gslbService['serverDest'] = server.dest || server.ipAddress || server.domain;
            }
        }

        // If SSL protocol, dig 'set ssl service'
        if (service.protocol === 'SSL') {
            const sslService = coaRx.set?.ssl?.service?.[serviceName];
            if (sslService) {
                lines.push(sslService._line);
                deepmergeInto(gslbService, extractOptions(sslService));
            }
        }
    }

    return { gslbService, lines };
}
