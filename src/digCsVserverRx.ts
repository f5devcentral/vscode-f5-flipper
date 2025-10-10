import { logger } from "./logger";
import { AdcApp, AdcConfObjRx, AdcRegExTree, NsObject, Appflow, PolicyRef } from "./models";
import { digSslBindingRx } from "./digLbVserverRx";

/**
 * Digest CS vservers using RX-parsed objects (not arrays)
 * This is the new implementation using configObjectArryRx
 */
export async function digCsVserversRx(coaRx: AdcConfObjRx, rx: AdcRegExTree) {
    const apps: AdcApp[] = [];

    // Check if we have any CS vservers
    if (!coaRx.add?.cs?.vserver) return apps;

    // Iterate over CS vserver objects (keyed by name)
    for (const [vsName, vs] of Object.entries(coaRx.add.cs.vserver)) {

        const app: AdcApp = {
            name: vs.name,
            protocol: vs.protocol,
            ipAddress: vs.ipAddress,
            type: 'cs',
            port: vs.port,
            lines: [vs._line],
            opts: extractOptions(vs),
            bindings: {
                '-lbvserver': [],
                '-policyName': []
            }
        };

        // Process CS vserver bindings
        const bindings = coaRx.bind?.cs?.vserver?.[vsName];
        if (bindings) {
            for (const [bindName, bind] of Object.entries(bindings)) {
                app.lines.push(bind._line);

                if (bind['-policyName']) {
                    // Policy binding
                    app.bindings["-policyName"].push(extractOptions(bind) as unknown as PolicyRef);

                } else if (bind['-lbvserver']) {
                    // LB vserver reference
                    app.bindings["-lbvserver"].push(bind['-lbvserver']);
                }
            }
        }

        // Dig CS policies
        await digAddCsPolicysRx(app, coaRx, rx);

        // Note: CS vservers don't have their own SSL bindings - SSL is handled by the LB vservers they reference
        // digCStoLBreferences will add the referenced LB vserver details (including SSL) to app.apps later

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
        if (key !== 'name' && key !== '_line' && key !== 'protocol' && key !== 'ipAddress' && key !== 'port') {
            opts[key] = value;
        }
    }
    return opts;
}

/**
 * Dig CS policies using RX objects
 */
async function digAddCsPolicysRx(app: AdcApp, coaRx: AdcConfObjRx, rx: AdcRegExTree) {

    // Loop through each policy attached to this app
    for (const policy of app.bindings["-policyName"]) {

        const policyName = policy['-policyName'];

        // Check if this is a CS policy
        const csPolicy = coaRx.add?.cs?.policy?.[policyName];
        if (csPolicy) {
            app.lines.push(csPolicy._line);

            const policyDetails = {
                name: csPolicy.name,
                ...extractOptions(csPolicy)
            };

            if (!app.csPolicies) app.csPolicies = [];
            app.csPolicies.push(policyDetails);

            // Dig CS action if referenced
            if (csPolicy['-action']) {
                const csAction = coaRx.add?.cs?.action?.[csPolicy['-action']];
                if (csAction) {
                    app.lines.push(csAction._line);

                    if (!app.csPolicyActions) {
                        app.csPolicyActions = [];
                    }
                    app.csPolicyActions.push(extractOptions(csAction));
                }
            }
        }

        // Check if this is an appflow policy
        const afPolicy = coaRx.add?.appflow?.policy?.[policyName];
        if (afPolicy) {
            app.lines.push(afPolicy._line);

            const appflow: Appflow = {
                name: afPolicy.name,
                rule: afPolicy.rule,
                action: []
            };

            // Dig appflow action
            if (afPolicy.action) {
                const afAction = coaRx.add?.appflow?.action?.[afPolicy.action];
                if (afAction) {
                    app.lines.push(afAction._line);

                    // Dig appflow collectors
                    if (afAction['-collectors']) {
                        const collectorName = afAction['-collectors'];
                        const collector = coaRx.add?.appflow?.collector?.[collectorName];
                        if (collector) {
                            app.lines.push(collector._line);
                        }
                    }

                    if (!app.csPolicyActions) {
                        app.csPolicyActions = [];
                    }
                    app.csPolicyActions.push(extractOptions(afAction));
                }
            }

            if (!app.appflows) app.appflows = [];
            app.appflows.push(appflow);
        }
    }
}
