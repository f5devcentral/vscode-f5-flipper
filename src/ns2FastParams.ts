



import { isIP } from "net";
import {
    AdcApp,
    NsFastTempParams,
    AdcRegExTree
} from "./models";


/**
 * mutate ns app json to a form easier for FAST/mustache to work with
 * @param nsApp NS app as json
 */
export function mungeNS2FAST(nsApp: AdcApp): NsFastTempParams {

    if (nsApp.fastTempParams) {

        // if we already have the munged params, send those since they could have been modified by the user
        return nsApp.fastTempParams

    } else {

        //  if nsApp.name has any spaces in it, 
        //      replace with underscores and remove any surrounding quotes
        const nsAppName = nsApp.name.replace(/\s+/g, '_').replace(/^"(.*)"$/g, '$1');

        // map the ns app params to the fast template params
        const nsFastJson: NsFastTempParams = {
            tenant_name: nsAppName,
            app_name: nsAppName,
            type: nsApp.type,
            protocol: nsApp.protocol,
            virtual_address: nsApp.ipAddress,
            virtual_port: nsApp.port === '*' ? 0 : nsApp.port as unknown as number,
            pool_members: [],
            fqdn_members: [],
            monitors: []
        };

        // if tenant_name

        if (nsApp?.opts?.['-persistenceType']) {
            const persistType = nsApp.opts['-persistenceType'] as string;

            const persistenceMap: { [key: string]: string } = {
                'NONE': 'none',
                'SOURCEIP': 'source_addr',
                'COOKIEINSERT': 'cookie',
                'SSLSESSION': 'ssl'
            };

            // map the persistence type to the expected value
            nsFastJson.persistence = persistenceMap[persistType];

            // if not found or none, default to nothing (remove the key)
            if (!nsFastJson.persistence || nsFastJson.persistence === 'none') {
                delete nsFastJson.persistence;
            }
        }

        if (nsApp?.opts?.['-lbMethod']) {
            const lbMethod = nsApp.opts['-lbMethod'] as string;

            const lbMethodMap: { [key: string]: string } = {
                'ROUNDROBIN': 'round-robin',
                'LEASTCONNECTION': 'least-connections-member',
                'LEASTRESPONSETIME': 'fastest',
                'SOURCEIPHASH': 'source-ip',
                'URLHASH': 'hash'
            };

            // map the lb method to the expected value
            nsFastJson.lbMethod = lbMethodMap[lbMethod];
        }

        if (nsApp?.opts?.['-cltTimeout']) {
            const cltTimeout = nsApp.opts['-cltTimeout'] as number;
            nsFastJson.idleTimeout = cltTimeout;
        }

        if (nsApp?.opts?.['-timeout']) {
            const timeout = nsApp.opts['-timeout'] as number;
            nsFastJson.timeout = timeout;
        }

        if (nsApp?.opts?.['-redirectURL']) {
            const redirectURL = nsApp.opts['-redirectURL'] as string;
            nsFastJson.redirectURL = redirectURL;
        }

        if (nsApp?.opts?.['-backupVServer']) {
            const backupVServer = nsApp.opts['-backupVServer'] as string;
            nsFastJson.backupVServer = backupVServer;
        }

        if (nsApp?.opts?.['-tcpProfileName']) {
            const tcpProfileName = nsApp.opts['-tcpProfileName'] as string;
            nsFastJson.tcpProfileName = tcpProfileName;
        }


        // capture all the service bindings (similar to f5 nodes)
        if (nsApp.bindings?.service) {

            // loop through service bindings to populate pool members
            for (const service of nsApp.bindings.service) {

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

                    nsFastJson.pool_members.push(...sg.servers);
                }

                if (sg.monitors) {

                    if (!nsFastJson.monitors) nsFastJson.monitors = [];

                    nsFastJson.monitors.push(...sg.monitors);
                }

            }
        }

        if (nsFastJson.pool_members) {


            const pm: any[] = [];
            const fm: any[] = [];

            // loop through pool members and categorize them
            for (const poolMember of nsFastJson.pool_members) {

                // create new object
                const tempMemberObj: any = {};

                if (poolMember.hostname) {

                    // FQDN pool member!!!
                    tempMemberObj.hostname = poolMember.hostname;
                    tempMemberObj.port = poolMember.port === '*' ? 0 : nsApp.port as unknown as number;

                    // move over pool member state if defined
                    if (poolMember['-state']) {
                        /** possible f5 pool member states:
                        - enable
                        - disable
                        - offline

                        possible ns service/serviceGroup member states:
                        - ENABLED
                        - DISABLED
                        - MAINTENANCE

                        DISABLED and MAINTENANCE both map to 'disable' on f5
                        ENABLE is default so no need to map it
                        */

                        if (poolMember['-state'] === 'DISABLED' || poolMember['-state'] === 'MAINTENANCE') {
                            tempMemberObj.adminState = false;
                        }
                        // else leave it undefined since ENABLED is default
                        // else if(poolMember['-state'] === 'ENABLED') {
                        //     tempMemberObj.adminState = 'enable';
                        // }
                    }

                    fm.push(tempMemberObj);

                } else {

                    // REGULAR IP pool member
                    tempMemberObj.name = poolMember.name;
                    tempMemberObj.address = poolMember.address;
                    tempMemberObj.port = poolMember.port === '*' ? 0 : nsApp.port as unknown as number;

                    // move over pool member state if defined
                    if (poolMember['-state']) {
                        if (poolMember['-state'] === 'DISABLED' || poolMember['-state'] === 'MAINTENANCE') {
                            tempMemberObj.adminState = false;
                        }
                    }
                    // remove key if ip address                   
                    if (isIP(tempMemberObj.name)) {
                        delete tempMemberObj.name;
                    }

                    pm.push(tempMemberObj);
                }
            }

            // replace pool members with new arrays for ip and fqdn members
            nsFastJson.pool_members = pm;
            nsFastJson.fqdn_members = fm;
        }

        // remap health monitors for fast templates
        nsFastJson.monitors = nsFastJson?.monitors.map(monitor => {

            // todo:  get details for new mapping
            return monitor;
        })


        // if no pool members, remove empty array
        if (nsFastJson.pool_members?.length === 0) delete nsFastJson.pool_members;

        // if no fqdn members, remove empty array
        if (nsFastJson.fqdn_members?.length === 0) delete nsFastJson.fqdn_members;

        // if no monitors, remove empty array
        if (nsFastJson.monitors.length === 0) delete nsFastJson.monitors;


        // return the new params
        return nsFastJson;

    }
}