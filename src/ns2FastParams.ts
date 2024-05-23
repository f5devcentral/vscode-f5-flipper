



import {
    AdcApp,
    NsFastTempParams
} from "./models";



export function
    /**
     * mutate ns app json to a form easier for FAST/mustache to work with
     * @param nsApp NS app as json
     */
    mungeNS2FAST(nsApp: AdcApp) {

    if (nsApp.fastTempParams) {

        // if we already have the munged params, send those since they could have been modified by the user
        return nsApp.fastTempParams

    } else {

        // map the ns app params to the fast template params
        const nsFastJson: NsFastTempParams = {
            tenant_name: nsApp.name,
            app_name: nsApp.name,
            type: nsApp.type,
            protocol: nsApp.protocol,
            virtual_address: nsApp.ipAddress,
            virtual_port: nsApp.port === '*' ? '0' : nsApp.port,
            pool_members: [],
            monitors: []
        };

        if (nsApp?.opts?.['-persistenceType']) {
            const persistType = nsApp.opts['-persistenceType'] as string;
            nsFastJson.persistence = { [persistType]: persistType }
        }

        if (nsApp?.opts?.['-lbMethod']) {
            const lbMethod = nsApp.opts['-lbMethod'] as string;
            nsFastJson.lbMethod = { [lbMethod]: lbMethod }
        }

        if (nsApp?.opts?.['-cltTimeout']) {
            const cltTimeout = nsApp.opts['-cltTimeout'] as string;
            nsFastJson.cltTimeout = { [cltTimeout]: cltTimeout }
        }

        if (nsApp?.opts?.['-timeout']) {
            const timeout = nsApp.opts['-timeout'] as string;
            nsFastJson.timeout = { [timeout]: timeout }
        }

        if (nsApp?.opts?.['-redirectURL']) {
            const redirectURL = nsApp.opts['-redirectURL'] as string;
            nsFastJson.redirectURL = { redirectURL }
        }

        if (nsApp?.opts?.['-backupVServer']) {
            const backupVServer = nsApp.opts['-backupVServer'] as string;
            nsFastJson.backupVServer = { [backupVServer]: backupVServer }
        }

        if (nsApp?.opts?.['-tcpProfileName']) {
            const tcpProfileName = nsApp.opts['-tcpProfileName'] as string;
            nsFastJson.tcpProfileName = { [tcpProfileName]: tcpProfileName }
        }


        // capture all the service bindings (similar to f5 nodes)
        if (nsApp.bindings?.service) {

            // loop through service bindings to populate pool members
            for (const service of nsApp.bindings.service) {
                // @ts-expect-error
                nsFastJson.pool_members.push(service);

                // note:  service monitor is just a yes/no, no specific monitor can be specified
                // https://developer-docs.netscaler.com/en-us/adc-command-reference-int/current-release/basic/service.html#add-service
            }
        }

        // capture all the serviceGroup bindings (more like f5 pool + members)
        if (nsApp.bindings?.serviceGroup && nsApp.bindings.serviceGroup.length > 0) {

            // loop through each serviceGroup
            for (const sg of nsApp.bindings.serviceGroup) {

                if (sg.servers) {
                    // push all the monitors we found on this serviceGroup
                    // @ts-expect-error
                    nsFastJson.pool_members.push(...sg.servers);
                }

                if (sg.monitors) {

                    if (!nsFastJson.monitors) nsFastJson.monitors = [];

                    nsFastJson.monitors.push(...sg.monitors);
                }

            }
        }

        if (nsFastJson.pool_members) {

            // remap pool member details to make it easier for FAST to key off details
            nsFastJson.pool_members = nsFastJson.pool_members.map(poolMember => {

                // create new object
                const tempMemberObj: any = {};

                if (poolMember.hostname) {
                    
                    tempMemberObj.fqdn = {
                        hostname: poolMember.hostname,
                        name: poolMember.name,
                        port: poolMember.port
                    }

                } else {
                    
                    tempMemberObj.address = {
                        name: poolMember.name,
                        address: poolMember.address,
                        port: tempMemberObj.port === '*' ? '0' : nsApp.port
                    }

                }

                // overwrite the new member details
                // we do this to leave behind all the other "-opts" that aren't strickly necessary for FAST templates
                // if they are needed, they should be added to get mapped here or else they show in the HTML output
                return tempMemberObj;
            })
        }

        // if no pool members, remove empty array
        if (nsFastJson.pool_members.length === 0) delete nsFastJson.pool_members;

        // remap health monitors for fast templates
        nsFastJson.monitors = nsFastJson?.monitors.map(monitor => {

            // todo:  get details for new mapping
            return monitor;
        })

        // return the new params
        return nsFastJson;

    }
}