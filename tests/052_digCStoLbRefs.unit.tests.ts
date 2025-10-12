import assert from 'assert';
import CitrixADC from '../src/CitrixADC';
import path from 'path';

describe('digCStoLbRefs Error Handling Tests', () => {

    /**
     * These tests exercise the error handling paths in digCStoLbRefs.ts
     * by creating configs with missing LB vserver references
     */

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    describe('Missing -policyName Reference', () => {
        it('should handle CS vserver binding to non-existent policy name', async () => {
            const adc = new CitrixADC();

            // Create a config where CS vserver binds to a policy that doesn't exist
            // This tests graceful handling when digCsVserver references a missing policy
            const config = 
`#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -policyName missing_policy_name -priority 100

add lb vserver test_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver test_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            // Should still parse successfully even with missing policy reference
            assert.ok(explosion.config.apps);
            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp, 'CS vserver should be parsed even with missing policy reference');

            // Verify the binding was captured even though policy doesn't exist
            assert.ok(csApp.bindings['-policyName'], 'Should have -policyName binding array');
        });
    });

    describe('Missing -targetLBVserver Reference', () => {
        it('should handle CS policy action with missing -targetLBVserver', async () => {
            const adc = new CitrixADC();

            // Create a config where CS action references a non-existent LB vserver
            const config = 
`#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -policyName test_policy -priority 100
add cs policy test_policy -rule "HTTP.REQ.HOSTNAME.EQ(\\"test.com\\")" -action test_action
add cs action test_action -targetLBVserver missing_lb_vserver

add lb vserver actual_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver actual_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            // CS app should be parsed, but won't have the missing LB vserver in apps
            assert.ok(explosion.config.apps);
            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp, 'CS vserver should be parsed');

            // Should have the policy action even though target is missing
            assert.ok(csApp.csPolicyActions, 'Should have csPolicyActions array');
            const action = csApp.csPolicyActions.find((a: any) =>
                a['-targetLBVserver'] === 'missing_lb_vserver'
            );
            assert.ok(action, 'Should capture action even with missing target');
        });
    });

    describe('Missing -lbvserver Binding Reference', () => {
        it('should handle CS vserver with missing -lbvserver binding', async () => {
            const adc = new CitrixADC();

            // Create a config where CS vserver directly binds to a non-existent LB vserver
            const config = 
`#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -lbvserver missing_lb_vserver

add lb vserver actual_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver actual_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            // CS app should be parsed
            assert.ok(explosion.config.apps);
            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp, 'CS vserver should be parsed');

            // Should have -lbvserver binding even though target is missing
            assert.ok(csApp.bindings['-lbvserver'], 'Should have -lbvserver binding array');
            assert.ok(csApp.bindings['-lbvserver'].includes('missing_lb_vserver'),
                'Should capture binding even though target is missing');
        });
    });

    describe('Multiple Missing References', () => {
        it('should handle CS vserver with multiple types of missing references', async () => {
            const adc = new CitrixADC();

            const config = `#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -policyName missing_policy -priority 100
bind cs vserver test_cs -lbvserver missing_lb1

add cs policy test_policy -rule "TRUE" -action test_action
bind cs vserver test_cs -policyName test_policy -priority 200
add cs action test_action -targetLBVserver missing_lb2

add lb vserver actual_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver actual_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            // CS app should still be parsed with all bindings captured
            assert.ok(explosion.config.apps);
            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp, 'CS vserver should be parsed despite multiple missing references');

            // Verify all bindings were captured
            assert.ok(csApp.bindings['-policyName'].length >= 2, 'Should have policy bindings');
            assert.ok(csApp.bindings['-lbvserver'].includes('missing_lb1'), 'Should have LB binding');
        });
    });

    describe('Valid References for Comparison', () => {
        it('should successfully link CS to LB when references are valid', async () => {
            const adc = new CitrixADC();

            const config = `#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -lbvserver test_lb

add lb vserver test_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver test_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp, 'CS vserver should be parsed');

            // When reference is valid, should have nested apps
            assert.ok(csApp.apps, 'Should have apps array when reference is valid');
            if (csApp.apps && csApp.apps.length > 0) {
                const nestedApp = csApp.apps.find((a: any) => a.name === 'test_lb');
                assert.ok(nestedApp, 'Should nest LB vserver in CS app when reference is valid');
            }
        });
    });

    describe('CS Policy Action with Missing Target', () => {
        // TODO: IMPROVEMENT NEEDED - Error visibility
        // This test validates that broken references are silently accepted. When a CS vserver
        // references a non-existent LB vserver via -targetLBVserver, the error is only logged
        // to console (via logger.error) but not exposed to users in the VS Code UI.
        //
        // Recommended improvements for digCStoLbRefs.ts:
        // 1. Add diagnostics collection to flag missing references in the editor
        // 2. Populate an 'errors' or 'warnings' array on the app object
        // 3. Display validation issues in the tree view with warning icons
        // 4. Add quick fix actions to help users correct broken references
        //
        // Currently, users must check the Output panel console to see these errors,
        // which is not discoverable. Better UX would surface these issues inline.
        it('should handle csPolicyActions with missing -targetLBVserver', async () => {
            const adc = new CitrixADC();

            // Config from starlord that has a known error
            const starlordConfig = path.join(__dirname, 'artifacts', 'apps', 'starlord.ns.conf');
            await adc.loadParseAsync(starlordConfig);
            const explosion: any = await adc.explode();

            // The starlord config has a missing reference error:
            // "policy action with -targetLBVserver starlord_offload_vs referenced by CS starlord_cs_vs not found"
            const csApp = explosion.config.apps.find((app: any) => app.name === 'starlord_cs_vs');
            assert.ok(csApp, 'Starlord CS vserver should be parsed');

            // Even with the error, the CS app should have policy actions
            assert.ok(csApp.csPolicyActions, 'Should have csPolicyActions despite missing target');
        });
    });

    describe('Empty CS Vserver Apps Array', () => {
        it('should initialize apps array for CS vserver with -lbvserver binding', async () => {
            const adc = new CitrixADC();

            const config = `#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -lbvserver test_lb

add lb vserver test_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver test_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp);

            // The apps array should be initialized (covers line 129)
            assert.ok(Array.isArray(csApp.apps), 'Should initialize apps array for -lbvserver binding');
        });

        it('should initialize apps array for CS vserver with -policyName binding', async () => {
            const adc = new CitrixADC();

            const config = `#NS13.0
add cs vserver test_cs HTTP 10.0.0.1 80 -persistenceType NONE
bind cs vserver test_cs -policyName test_policy -priority 100
add cs policy test_policy -rule "TRUE" -action test_action
add cs action test_action -targetLBVserver test_lb

add lb vserver test_lb HTTP 10.0.0.2 80 -persistenceType NONE
add server test_srv 10.0.0.3
bind lb vserver test_lb test_srv`;

            await adc.parseConf({ fileName: 'test.conf', size: config.length, content: config });
            const explosion: any = await adc.explode();

            const csApp = explosion.config.apps.find((app: any) => app.name === 'test_cs');
            assert.ok(csApp);

            // The apps array should be initialized (covers line 33)
            assert.ok(Array.isArray(csApp.apps), 'Should initialize apps array for -policyName binding');
        });
    });
});
