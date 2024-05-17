<<<<<<< HEAD
=======
/* eslint-disable @typescript-eslint/naming-convention */
>>>>>>> 85a7316 (stash)




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
<<<<<<< HEAD
        return nsApp.fastTempParams
=======
        return nsApp.fastTempParams;
>>>>>>> 85a7316 (stash)

    } else {

        // map the ns app params to the fast template params
        const nsFastJson: NsFastTempParams = {
            tenant_name: nsApp.name,
            app_name: nsApp.name,
            type: nsApp.type,
            protocol: nsApp.protocol,
            virtual_address: nsApp.ipAddress,
            virtual_port: nsApp.port,
            pool_members: []
        };

        if (nsApp?.opts?.['-persistenceType']) {
            const persistType = nsApp.opts['-persistenceType'] as string;
<<<<<<< HEAD
            nsFastJson.persistence = { [persistType]: persistType }
=======
            nsFastJson.persistence = { [persistType]: persistType };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-lbMethod']) {
            const lbMethod = nsApp.opts['-lbMethod'] as string;
<<<<<<< HEAD
            nsFastJson.lbMethod = { [lbMethod]: lbMethod }
=======
            nsFastJson.lbMethod = { [lbMethod]: lbMethod };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-cltTimeout']) {
            const cltTimeout = nsApp.opts['-cltTimeout'] as string;
<<<<<<< HEAD
            nsFastJson.cltTimeout = { [cltTimeout]: cltTimeout }
=======
            nsFastJson.cltTimeout = { [cltTimeout]: cltTimeout };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-timeout']) {
            const timeout = nsApp.opts['-timeout'] as string;
<<<<<<< HEAD
            nsFastJson.timeout = { [timeout]: timeout }
=======
            nsFastJson.timeout = { [timeout]: timeout };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-redirectURL']) {
            const redirectURL = nsApp.opts['-redirectURL'] as string;
<<<<<<< HEAD
            nsFastJson.redirectURL = { redirectURL }
=======
            nsFastJson.redirectURL = { redirectURL };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-backupVServer']) {
            const backupVServer = nsApp.opts['-backupVServer'] as string;
<<<<<<< HEAD
            nsFastJson.backupVServer = { [backupVServer]: backupVServer }
=======
            nsFastJson.backupVServer = { [backupVServer]: backupVServer };
>>>>>>> 85a7316 (stash)
        }

        if (nsApp?.opts?.['-tcpProfileName']) {
            const tcpProfileName = nsApp.opts['-tcpProfileName'] as string;
<<<<<<< HEAD
            nsFastJson.tcpProfileName = { [tcpProfileName]: tcpProfileName }
=======
            nsFastJson.tcpProfileName = { [tcpProfileName]: tcpProfileName };
>>>>>>> 85a7316 (stash)
        }


        // capture all the service bindings (similar to f5 nodes)
        if (nsApp.bindings?.service) {

            // loop through service bindings to populate pool members
            for (const service of nsApp.bindings.service) {
                // @ts-expect-error
                nsFastJson.pool_members.push(service);
            }
        }

        // capture all the serviceGroup bindings (more like f5 pool + members)
        if (nsApp.bindings?.serviceGroup && nsApp.bindings.serviceGroup.length > 0) {

            if (nsApp.bindings.serviceGroup[0]?.servers)

                // todo: extend this to loop through service group for all servers
                {for (const servers of nsApp.bindings.serviceGroup[0].servers) {
                    // @ts-expect-error
                    nsFastJson.pool_members.push(servers);
                }};
        }

        if (nsFastJson.pool_members) {

            // remap pool member details to make it easier for FAST to key off details
            nsFastJson.pool_members = nsFastJson.pool_members.map(poolMember => {

                // create new object
                const tempMemberObj: any = {};

                if (poolMember.hostname) {
                    const hsTemp = poolMember.hostname;
                    tempMemberObj.hostname = {
                        hostname: hsTemp
                    };
                }

                if (poolMember.address) {
                    tempMemberObj.address = { address: poolMember.address };
                }

                if (poolMember.name) {tempMemberObj.name = { name: poolMember.name };}
                if (poolMember.port) {tempMemberObj.port = { port: poolMember.port };}

                // overwrite the new member details
                // we do this to leave behind all the other "-opts" that aren't strickly necessary for FAST templates
                // if they are needed, they should be added to get mapped here or else they show in the HTML output
                return tempMemberObj;
            });
        }

        // if no pool members, remove empty array
        if (nsFastJson.pool_members.length === 0) {delete nsFastJson.pool_members;}

        // return the new params
        return nsFastJson;

    }
}
