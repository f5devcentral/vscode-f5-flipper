import { deepmergeInto } from "deepmerge-ts";
import { logger } from "./logger";
import { AdcApp, AdcConfObjRx, AdcRegExTree, NsObject, PolicyRef } from "./models";

/**
 * Digest LB vservers using RX-parsed objects (not arrays)
 * This is the new implementation using configObjectArryRx
 */
export async function digLbVserverRx(coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const apps: AdcApp[] = [];

    // Check if we have any LB vservers
    if (!coaRx.add?.lb?.vserver) return apps;

    // Iterate over LB vserver objects (keyed by name)
    for (const [vsName, vs] of Object.entries(coaRx.add.lb.vserver)) {

        const app: AdcApp = {
            name: vs.name,
            protocol: vs.protocol,
            ipAddress: vs.ipAddress,
            type: 'lb',
            port: vs.port,
            lines: [vs._line],
            opts: extractOptions(vs)
        };

        // Process bindings for this vserver
        const bindings = coaRx.bind?.lb?.vserver?.[vsName];
        if (bindings) {
            if (!app.bindings) app.bindings = {};

            for (const [bindName, bind] of Object.entries(bindings)) {
                app.lines.push(bind._line);

                // Check if this binding references a service/serviceGroup
                if (bind.service) {
                    // Dig service details
                    await digServiceRx(bind.service, app, coaRx, rx);

                    // Dig serviceGroup details
                    await digServiceGroupRx(bind.service, app, coaRx, rx);

                } else if (bind['-policyName']) {
                    // Policy binding
                    const pName = bind['-policyName'];

                    if (!app.bindings['-policyName']) {
                        app.bindings['-policyName'] = [];
                    }

                    await digPolicyRx(pName, app, coaRx, rx);
                    app.bindings['-policyName'].push(extractOptions(bind) as unknown as PolicyRef);
                }
            }
        }

        // Process SSL bindings
        await digSslBindingRx(app, coaRx, rx);

        apps.push(app);
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
 * Dig service details using RX objects
 */
async function digServiceRx(serviceName: string, app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const service = coaRx.add?.service?.[serviceName];

    if (!service) return;

    app.lines.push(service._line);

    if (!app.bindings.service) {
        app.bindings.service = [];
    }

    let serviceDetails: any = {
        name: service.name,
        protocol: service.protocol,
        port: service.port,
        server: service.server,
        opts: extractOptions(service)
    };

    // Process bind service
    await digBindServiceRx(serviceName, app, coaRx, rx);

    // Process bind ssl service
    await digBindSslServiceRx(serviceName, app, coaRx, rx);

    // Get server details
    if (service.server) {
        await digServerRx(service.server, app, coaRx, rx)
            .then(serverInfo => {
                if (serverInfo) {
                    serviceDetails = Object.assign(serviceDetails, serverInfo);
                }
            });
    }

    app.bindings.service.push(serviceDetails);
}

/**
 * Dig serviceGroup details using RX objects
 */
async function digServiceGroupRx(serviceName: string, app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const serviceGroup = coaRx.add?.serviceGroup?.[serviceName];

    if (!serviceGroup) return;

    app.lines.push(serviceGroup._line);

    const sgDetails: any = {
        name: serviceGroup.name,
        protocol: serviceGroup.protocol,
        ...extractOptions(serviceGroup)
    };

    // Process serviceGroup bindings
    const sgBindings = coaRx.bind?.serviceGroup?.[serviceName];
    if (sgBindings) {
        for (const [bindName, bind] of Object.entries(sgBindings)) {
            app.lines.push(bind._line);

            if (bind.serv) {
                const sgMemberName = bind.serv;
                const sgMemberPort = bind.port;

                // Extract member-specific options (exclude serv, port, name, _line)
                const sgmOpts: Record<string, any> = {};
                for (const [key, value] of Object.entries(bind)) {
                    if (key !== 'serv' && key !== 'port' && key !== 'name' && key !== '_line') {
                        sgmOpts[key] = value;
                    }
                }

                // Dig server details
                await digServerRx(sgMemberName, app, coaRx, rx)
                    .then(serverInfo => {
                        const serverDetails: Record<string, any> = {
                            name: sgMemberName,
                            port: sgMemberPort
                        };

                        if (!sgDetails.servers) sgDetails.servers = [];
                        // Merge server details, serverInfo (address/hostname), and member options
                        const merged = Object.assign(serverDetails, serverInfo, sgmOpts);
                        sgDetails.servers.push(merged);
                    });

            } else if (bind['-monitorName']) {
                const monitorName = bind['-monitorName'];
                const monitor = coaRx.add?.lb?.monitor?.[monitorName];

                if (monitor) {
                    app.lines.push(monitor._line);
                    if (!sgDetails.monitors) sgDetails.monitors = [];
                    // Include all monitor properties including protocol (match original)
                    sgDetails.monitors.push({
                        name: monitorName,
                        protocol: monitor.protocol,  // Include protocol explicitly
                        ...extractOptions(monitor)
                    });
                }
            }
        }
    }

    // Add serviceGroup to bindings
    if (!app.bindings.serviceGroup) {
        app.bindings.serviceGroup = [];
    }
    app.bindings.serviceGroup.push(sgDetails);
}

/**
 * Dig bind service details using RX objects
 */
async function digBindServiceRx(serviceName: string, app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const bindServices = coaRx.bind?.service?.[serviceName];

    if (!bindServices) return;

    for (const [bindName, bind] of Object.entries(bindServices)) {
        app.lines.push(bind._line);

        if (bind.serv) {
            const serverName = bind.serv;
            await digServerRx(serverName, app, coaRx, rx);

        } else if (bind.monitor) {
            const monitorName = bind.monitor;
            const monitor = coaRx.add?.lb?.monitor?.[monitorName];

            if (monitor) {
                app.lines.push(monitor._line);
            }
        }
    }
}

/**
 * Dig bind ssl service details using RX objects
 */
async function digBindSslServiceRx(serviceName: string, app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const sslBindings = coaRx.bind?.ssl?.service?.[serviceName];

    if (!sslBindings) return;

    // Build a single SSL cert object by merging all SSL bindings (match original behavior)
    const sslBindObj: Record<string, any> = {};
    let certKeyName: string | undefined;

    for (const [bindName, bind] of Object.entries(sslBindings)) {
        app.lines.push(bind._line);

        // Capture the certKeyName and add certKey line immediately (match original line order)
        if (bind['-certkeyName']) {
            certKeyName = bind['-certkeyName'];

            // Add certKey line immediately after the binding that references it
            const certKey = coaRx.add?.ssl?.certKey?.[certKeyName];
            if (certKey) {
                app.lines.push(certKey._line);
            }
        }

        // Collect eccCurveName into an array (original behavior)
        if (bind['-eccCurveName']) {
            if (!sslBindObj['-eccCurveName']) {
                sslBindObj['-eccCurveName'] = [];
            }
            sslBindObj['-eccCurveName'].push(bind['-eccCurveName']);
        }

        // Merge other SSL binding properties (like -cipherName)
        for (const [key, value] of Object.entries(bind)) {
            if (key !== '_line' && key !== 'name' && key !== '-certkeyName' && key !== '-eccCurveName') {
                sslBindObj[key] = value;
            }
        }
    }

    // Add the certKey details to the cert object
    if (certKeyName) {
        const certKey = coaRx.add?.ssl?.certKey?.[certKeyName];
        if (certKey) {
            // Add certKey properties (use lowercase -certkeyName to match original)
            sslBindObj['-cert'] = certKey['-cert'];
            sslBindObj['-key'] = certKey['-key'];
            sslBindObj['-certkeyName'] = certKey.name;  // lowercase to match original

            if (!app.bindings.certs) {
                app.bindings.certs = [];
            }
            app.bindings.certs.push(sslBindObj);
        }
    }
}

/**
 * Dig SSL bindings for vserver using RX objects
 */
export async function digSslBindingRx(app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const sslBindings = coaRx.bind?.ssl?.vserver?.[app.name];

    if (!sslBindings) return;

    // Build a single SSL cert object by merging all SSL bindings (match original behavior)
    const sslBindObj: Record<string, any> = {};
    let certKeyName: string | undefined;

    for (const [bindName, bind] of Object.entries(sslBindings)) {
        app.lines.push(bind._line);

        // Capture the certKeyName and add certKey line immediately (match original line order)
        if (bind['-certkeyName']) {
            certKeyName = bind['-certkeyName'];

            // Add certKey line immediately after the binding that references it
            const certKey = coaRx.add?.ssl?.certKey?.[certKeyName];
            if (certKey) {
                app.lines.push(certKey._line);
            }
        }

        // Collect eccCurveName into an array (original behavior)
        if (bind['-eccCurveName']) {
            if (!sslBindObj['-eccCurveName']) {
                sslBindObj['-eccCurveName'] = [];
            }
            sslBindObj['-eccCurveName'].push(bind['-eccCurveName']);
        }

        // Merge other SSL binding properties (like -cipherName)
        for (const [key, value] of Object.entries(bind)) {
            if (key !== '_line' && key !== 'name' && key !== '-certkeyName' && key !== '-eccCurveName') {
                sslBindObj[key] = value;
            }
        }
    }

    // Add the certKey details to the cert object
    if (certKeyName) {
        const certKey = coaRx.add?.ssl?.certKey?.[certKeyName];
        if (certKey) {
            // Add certKey properties (use lowercase -certkeyName to match original)
            sslBindObj['-cert'] = certKey['-cert'];
            sslBindObj['-key'] = certKey['-key'];
            sslBindObj['-certkeyName'] = certKey.name;  // lowercase to match original

            if (!app.bindings.certs) {
                app.bindings.certs = [];
            }
            app.bindings.certs.push(sslBindObj);
        }
    }
}

/**
 * Dig policy details using RX objects
 */
async function digPolicyRx(policyName: string, app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    // Check rewrite policies
    const rwPolicy = coaRx.add?.rewrite?.policy?.[policyName];
    if (rwPolicy) {
        app.lines.push(rwPolicy._line);
        return;
    }

    // Check responder policies
    const rsPolicy = coaRx.add?.responder?.policy?.[policyName];
    if (rsPolicy) {
        app.lines.push(rsPolicy._line);
        return;
    }

    // Check authentication policies
    const authPolicy = coaRx.add?.authentication?.policy?.[policyName];
    if (authPolicy) {
        app.lines.push(authPolicy._line);
        return;
    }
}

/**
 * Dig server details using RX objects
 */
async function digServerRx(
    serverName: string,
    app: AdcApp,
    coaRx: AdcConfObjRx,
    rx: AdcRegExTree
): Promise<{ address?: string; hostname?: string } | undefined> {

    const server = coaRx.add?.server?.[serverName];

    if (!server) return undefined;

    app.lines.push(server._line);

    // The regex captures server IP/hostname as 'dest' property
    const result: { address?: string; hostname?: string } = {};

    const dest = server.dest || server.ipAddress || server.address;
    if (dest) {
        // Check if dest is an IP address (match original behavior)
        const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(dest);
        if (isIpAddress) {
            result.address = dest;
        } else {
            result.hostname = dest;
        }
    }

    const host = server.domain || server.hostname;
    if (host) result.hostname = host;

    return result;
}
