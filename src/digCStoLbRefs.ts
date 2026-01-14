

import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, CsPolicyActions, PolicyRef } from "./models";


export function digCStoLBreferences(apps: AdcApp[]) {

    logger.info('digging lb app references from cs servers')

    // First pass: Add backup vserver references to apps
    digBackupVserverReferences(apps);

    // loop through all the apps and add -targetLBVserver and -lbvserver reference details

    for (const app of apps) {

        // app.bindings.'-policyName'.forEach( x => x.'-targetLBVserver' )
        /**
                "bindings": {
                    "-lbvserver": [
                        "vip-community-default-80"
                    ],
                    "-policyName": [{
                        "-policyName": "vip-community-policy",
                        "-targetLBVserver": "vip-community-redirect-80",
                        "-priority": "100"
                    }]
                },
         */

        if (app.bindings?.["-policyName"]) {

            if (!app.apps) {
                app.apps = [];
            }

            // PolicyRef is always an object array per models.ts, never strings
            for ( const p of app.bindings["-policyName"]) {

                // Check if policy has -targetLBVserver reference
                if (p["-targetLBVserver"]) {
                    const x = p["-targetLBVserver"]
                    const a = apps.filter((b: AdcApp) => b.name === x)[0]

                    if(a) {

                        // Deep copy app (use structuredClone for better performance)
                        const b = structuredClone(a)

                        // copy reference app config lines to main app, but exclude SSL bindings
                        // (referenced LB vservers' SSL bindings are not relevant - CS handles SSL)
                        const filteredLines = b.lines.filter((line: string) => !line.startsWith('bind ssl vserver'));
                        app.lines.push(...filteredLines)
                        // delete app lines from referenced app
                        delete b.lines

                        // push lb app to cs app
                        app.apps.push(sortAdcApp(b))

                    } else {
                        logger.error(`policy action with -targetLBVserver ${x} referenced by CS ${app.name} not found`)
                    }
                }
            }

        }

        if (app?.csPolicyActions) {
            // dig cs policy action for lb reference
            for (const cpa of app.csPolicyActions) {

                if(cpa["-targetLBVserver"]) {

                    const x = cpa["-targetLBVserver"]
                    const a = apps.filter((b: AdcApp) => b.name === x)[0]

                    if(a) {

                        // Deep copy app (use structuredClone for better performance)
                        const b = structuredClone(a)

                        // copy reference app config lines to main app, but exclude SSL bindings
                        // (referenced LB vservers' SSL bindings are not relevant - CS handles SSL)
                        const filteredLines = b.lines.filter((line: string) => !line.startsWith('bind ssl vserver'));
                        app.lines.push(...filteredLines)
                        // delete app lines from referenced app
                        delete b.lines

                        // push lb app to cs app
                        app.apps.push(sortAdcApp(b))


                    } else {
                        logger.error(`policy action with -targetLBVserver ${x} referenced by CS ${app.name} not found`)
                    }
                }
            }
        }

        // app.bindings.'-lbvserver'.forEach( (x: string) => )
        if (app.bindings?.["-lbvserver"]) {

            if (!app.apps) {
                app.apps = [];
            }
            // this should be a list of strings/names
            // todo: loop through list and add lb vservers
            for (const e of app.bindings["-lbvserver"]) {

                const a = apps.filter((b: AdcApp) => b.name === e)[0]

                if(a) {

                    // Deep copy app (use structuredClone for better performance)
                    const b = structuredClone(a)

                    // copy reference app config lines to main app, but exclude SSL bindings
                    // (referenced LB vservers' SSL bindings are not relevant - CS handles SSL)
                    const filteredLines = b.lines.filter((line: string) => !line.startsWith('bind ssl vserver'));
                    app.lines.push(...filteredLines)
                    // delete app lines from referenced app
                    delete b.lines

                    // push lb app to cs app
                    app.apps.push(sortAdcApp(b))

                } else {
                    logger.error(`-lbvserver ${e} referenced by CS ${app.name} not found`)

                }

            }

        }



    }

    // nothing to return since we just added details to existing apps
    return;
}


/**
 * Crawl backup vserver references and add their config lines to the primary app
 * Handles chained backup vservers (backup of backup)
 *
 * @param apps - Array of all parsed apps
 */
function digBackupVserverReferences(apps: AdcApp[]) {

    logger.info('digging backup vserver references')

    for (const app of apps) {

        // Check if app has a backup vserver configured
        const backupVsName = app.opts?.['-backupVServer'] as string;
        if (!backupVsName) continue;

        // Track visited backup vservers to prevent infinite loops
        const visited = new Set<string>([app.name]);
        let currentBackupName: string | undefined = backupVsName;

        while (currentBackupName && !visited.has(currentBackupName)) {
            visited.add(currentBackupName);

            // Find the backup vserver app
            const backupApp = apps.find((a: AdcApp) => a.name === currentBackupName);

            if (backupApp) {
                // Add separator comment and backup vserver lines
                app.lines.push(`# -------- Backup VServer: ${backupApp.name} --------`);
                app.lines.push(...backupApp.lines);

                // Check if this backup has its own backup (chained backups)
                currentBackupName = backupApp.opts?.['-backupVServer'] as string;
            } else {
                logger.error(`backup vserver ${currentBackupName} referenced by ${app.name} not found`);
                break;
            }
        }
    }
}