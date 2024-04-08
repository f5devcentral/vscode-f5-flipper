

import { sortAdcApp } from "./CitrixADC";
import { logger } from "./logger";
import { AdcApp, CsPolicyActions, PolicyRef } from "./models";


export function digCStoLBreferences(apps: AdcApp[]) {

    logger.info('digging lb app references from cs servers')

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

            for ( const p of app.bindings["-policyName"]) {

                if (typeof p === 'string') {

                    // todo: look up a single lb server with 'p' as the name
                    const a = apps.filter((a: AdcApp) => a.name === p)[0]

                    if(a) {

                        // copy app json
                        const b = JSON.parse(JSON.stringify(a))
    
                        // copy reference app config lines to main app
                        app.lines.push(...b.lines)
                        // delete app lines from referenced app
                        delete b.lines
    
                        // push lb app to cs app
                        app.apps.push(sortAdcApp(b))
                    } else {
                        logger.error(`-policyName ${p} referenced by CS ${app.name} not found`)
                    }


                } else {

                    // this should be a list of objects
                    // todo: loop through the policies and get lb references
                    if (p["-targetLBVserver"]) {
                        const x = p["-targetLBVserver"]
                        const a = apps.filter((b: AdcApp) => b.name === x)[0]

                        if(a) {

                            // copy app json
                            const b = JSON.parse(JSON.stringify(a))
                            // const b = JSON.parse(JSON.stringify(a))
    
                            // copy reference app config lines to main app
                            app.lines.push(...b.lines)
                            // delete app lines from referenced app
                            delete b.lines
    
                            // push lb app to cs app
                            app.apps.push(sortAdcApp(b))


                        } else {
                            logger.error(`policy with -targetLBVserver ${p} referenced by CS ${app.name} not found`)
                        }
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

                        // copy app json
                        const b = JSON.parse(JSON.stringify(a))
                        // const b = JSON.parse(JSON.stringify(a))

                        // copy reference app config lines to main app
                        app.lines.push(...b.lines)
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

                    // copy app json
                    const b = JSON.parse(JSON.stringify(a))
    
                    // copy reference app config lines to main app
                    app.lines.push(...b.lines)
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