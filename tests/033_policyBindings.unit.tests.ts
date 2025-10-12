/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import ADC from '../src/CitrixADC'
import { Explosion } from '../src/models';
import * as fs from 'fs';
import * as path from 'path';

const events = [];

const testConfig = `
#NS13.1 Build 37.38
# Last modified by \`save config\`, Mon May 03 12:34:56 2555
enable ns feature WL LB CS SSL REWRITE RESPONDER

add cs vserver test_cs_vs HTTP 192.168.1.50 80 -cltTimeout 180
add lb vserver test_lb_vs HTTP 0.0.0.0 0 -persistenceType NONE

add cs policy test_cs_pol "HTTP.REQ.URL.PATH.STARTSWITH(\\"/api\\")" test_cs_action
add cs action test_cs_action -targetLBVserver test_lb_vs

add rewrite policy test_rewrite_pol HTTP.REQ.IS_VALID test_rewrite_action
add rewrite action test_rewrite_action insert_http_header "X-Rewrite" "applied"

add responder policy test_resp_pol "HTTP.REQ.URL.EQ(\\"/status\\")" test_resp_action
add responder action test_resp_action respond_with "HTTP/1.1 200 OK\\\\r\\\\n\\\\r\\\\nOK"

add authentication policy test_auth_pol NS_TRUE test_auth_action
add authentication action test_auth_action LDAP -serverIP 192.168.1.20

# CS vserver bindings
bind cs vserver test_cs_vs -policyName test_cs_pol -priority 100
bind cs vserver test_cs_vs -lbvserver test_lb_vs

# LB vserver policy bindings with different priorities and types
bind lb vserver test_lb_vs -policyName test_rewrite_pol -priority 100 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_resp_pol -priority 200 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_auth_pol -priority 300 -gotoPriorityExpression END -type REQUEST

add serviceGroup test_sg HTTP -maxClient 0
bind serviceGroup test_sg 192.168.1.30 80
bind lb vserver test_lb_vs test_sg
`;

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('Policy Binding Relationship Tests (RX Engine)', function () {

    let adc: ADC;
    let expld: Explosion;
    let tempFile: string;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('---------- file:', __filename);

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

        adc = new ADC();

        adc.on('parseFile', x => parsedFileEvents.push(x))

        // Create a temporary config file for testing
        tempFile = path.join(__dirname, 'temp_binding_test.conf');
        fs.writeFileSync(tempFile, testConfig);

        await adc.loadParseAsync(tempFile);
        expld = await adc.explode();
    });

    after(function () {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    });

    afterEach(function () {
        events.length = 0;
    })

    it('should parse CS policy bindings correctly (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;
        assert.ok(parsedConfig.bind?.cs?.vserver, 'Should have CS vserver bindings');

        // RX structure: bindings are objects keyed by vserver name
        const vserverBindings = parsedConfig.bind.cs.vserver || {};
        assert.ok('test_cs_vs' in vserverBindings, 'Should have test_cs_vs bindings');

        const testCsBindings = vserverBindings['test_cs_vs'];
        assert.ok(testCsBindings, 'Should have bindings for test_cs_vs');

        // Find policy binding - bindings are keyed objects
        const bindingKeys = Object.keys(testCsBindings);
        const policyBinding = bindingKeys.find(key => {
            const binding = testCsBindings[key];
            return binding['-policyName'] === 'test_cs_pol';
        });

        assert.ok(policyBinding, 'Should find policy binding');
        const binding = testCsBindings[policyBinding];
        assert.strictEqual(binding['-priority'], '100', 'Should have priority 100');
    });

    it('should parse LB policy bindings with priorities correctly (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;
        assert.ok(parsedConfig.bind?.lb?.vserver, 'Should have LB vserver bindings');

        const vserverBindings = parsedConfig.bind.lb.vserver || {};
        assert.ok('test_lb_vs' in vserverBindings, 'Should have test_lb_vs bindings');

        const testLbBindings = vserverBindings['test_lb_vs'];
        assert.ok(testLbBindings, 'Should have bindings for test_lb_vs');

        // Collect all policy bindings
        const policyBindings = Object.values(testLbBindings).filter((b: any) => b['-policyName']);

        // Should have 3 policy bindings
        assert.ok(policyBindings.length >= 3, 'Should have at least 3 policy bindings');

        // Check rewrite policy binding
        const rewriteBinding = policyBindings.find((b: any) => b['-policyName'] === 'test_rewrite_pol');
        assert.ok(rewriteBinding, 'Should find rewrite policy binding');
        assert.strictEqual(rewriteBinding['-priority'], '100');
        assert.strictEqual(rewriteBinding['-type'], 'REQUEST');

        // Check responder policy binding
        const responderBinding = policyBindings.find((b: any) => b['-policyName'] === 'test_resp_pol');
        assert.ok(responderBinding, 'Should find responder policy binding');
        assert.strictEqual(responderBinding['-priority'], '200');

        // Check auth policy binding
        const authBinding = policyBindings.find((b: any) => b['-policyName'] === 'test_auth_pol');
        assert.ok(authBinding, 'Should find auth policy binding');
        assert.strictEqual(authBinding['-priority'], '300');
    });

    it('should abstract CS app with policy references', () => {
        assert.ok(expld.config.apps, 'Should have apps');
        const csApp = expld.config.apps.find(app => app.name === 'test_cs_vs');
        assert.ok(csApp, 'Should find CS app');
        assert.strictEqual(csApp.type, 'cs');

        // Check CS policies are captured
        if (csApp.csPolicies) {
            assert.ok(csApp.csPolicies.length > 0, 'Should have CS policies');
            const policy = csApp.csPolicies.find(p => p.name === 'test_cs_pol');
            assert.ok(policy, 'Should find test_cs_pol');
        }

        // Check policy bindings
        if (csApp.bindings && csApp.bindings['-policyName']) {
            const policyRefs = csApp.bindings['-policyName'];
            const hasCsPolicy = policyRefs.some((p: any) =>
                (typeof p === 'string' && p === 'test_cs_pol') ||
                (typeof p === 'object' && p['-policyName'] === 'test_cs_pol')
            );
            assert.ok(hasCsPolicy, 'Should have CS policy in bindings');
        }
    });

    it('should abstract LB app with multiple policy types', () => {
        const lbApp = expld.config.apps?.find(app => app.name === 'test_lb_vs');
        assert.ok(lbApp, 'Should find LB app');
        assert.strictEqual(lbApp.type, 'lb');

        // Check policy bindings exist
        assert.ok(lbApp.bindings, 'Should have bindings');
        assert.ok(lbApp.bindings['-policyName'], 'Should have policyName bindings');

        const policies = lbApp.bindings['-policyName'];
        assert.ok(Array.isArray(policies), 'Policies should be an array');
        assert.strictEqual(policies.length, 3, 'Should have 3 policy bindings');

        // Verify all three policy types are present
        const policyNames = policies.map((p: any) =>
            typeof p === 'string' ? p : p['-policyName']
        );
        assert.ok(policyNames.includes('test_rewrite_pol'), 'Should include rewrite policy');
        assert.ok(policyNames.includes('test_resp_pol'), 'Should include responder policy');
        assert.ok(policyNames.includes('test_auth_pol'), 'Should include auth policy');
    });

    it('should maintain CS to LB vserver relationships', () => {
        const csApp = expld.config.apps?.find(app => app.name === 'test_cs_vs');
        assert.ok(csApp, 'Should find CS app');

        // Check that CS app references LB app (via digCStoLBreferences)
        if (csApp.apps) {
            const referencedLbApp = csApp.apps.find(app => app.name === 'test_lb_vs');
            assert.ok(referencedLbApp, 'Should find referenced LB app');
            assert.strictEqual(referencedLbApp.type, 'lb');
        }

        // Check bindings for lbvserver reference
        if (csApp.bindings && csApp.bindings['-lbvserver']) {
            assert.ok(csApp.bindings['-lbvserver'].includes('test_lb_vs'), 'Should reference test_lb_vs');
        }
    });

    it('should verify policy action relationships are parsed (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;

        // RX structure: actions are objects keyed by name
        assert.ok(parsedConfig.add?.cs?.action, 'Should have CS actions');
        const csActions = parsedConfig.add.cs.action || {};
        assert.ok('test_cs_action' in csActions, 'Should have test_cs_action');

        const csAction = csActions['test_cs_action'];
        assert.strictEqual(csAction['-targetLBVserver'], 'test_lb_vs', 'CS action should target test_lb_vs');

        // Verify rewrite action is parsed
        assert.ok(parsedConfig.add?.rewrite?.action, 'Should have rewrite actions');
        const rewriteActions = parsedConfig.add.rewrite.action || {};
        assert.ok('test_rewrite_action' in rewriteActions, 'Should have test_rewrite_action');

        // Verify responder action is parsed
        assert.ok(parsedConfig.add?.responder?.action, 'Should have responder actions');
        const responderActions = parsedConfig.add.responder.action || {};
        assert.ok('test_resp_action' in responderActions, 'Should have test_resp_action');

        // Verify authentication action is parsed
        assert.ok(parsedConfig.add?.authentication?.action, 'Should have auth actions');
        const authActions = parsedConfig.add.authentication.action || {};
        assert.ok('test_auth_action' in authActions, 'Should have test_auth_action');
    });
});
