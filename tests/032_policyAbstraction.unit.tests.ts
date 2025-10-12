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

add lb vserver test_lb_vs HTTP 192.168.1.100 80 -persistenceType NONE
add rewrite policy test_rewrite_pol HTTP.REQ.IS_VALID test_rewrite_action
add rewrite action test_rewrite_action insert_http_header "X-Test-Header" "test-value"
add responder policy test_responder_pol HTTP.REQ.URL.EQ("/health") test_responder_action
add responder action test_responder_action respond_with "HTTP/1.1 200 OK\\\\r\\\\n\\\\r\\\\nHealthy"
add authentication policy test_auth_pol NS_TRUE test_auth_action
add authentication action test_auth_action LDAP -serverIP 192.168.1.10 -serverPort 389

bind lb vserver test_lb_vs -policyName test_rewrite_pol -priority 100 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_responder_pol -priority 200 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_auth_pol -priority 300 -gotoPriorityExpression END -type REQUEST

add serviceGroup test_sg HTTP -maxClient 0
bind serviceGroup test_sg 192.168.1.10 80
bind lb vserver test_lb_vs test_sg
`;

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('Policy Abstraction Tests (RX Engine)', function () {

    let adc: ADC;
    let expld: Explosion;
    let tempFile: string;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

        adc = new ADC();

        adc.on('parseFile', x => parsedFileEvents.push(x))

        // Create a temporary config file for testing
        tempFile = path.join(__dirname, 'temp_policy_test.conf');
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

    it('should parse rewrite policies correctly (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;

        // RX structure: objects keyed by name
        assert.ok(parsedConfig.add?.rewrite?.policy, 'Should have rewrite policies');
        assert.ok(parsedConfig.add?.rewrite?.action, 'Should have rewrite actions');

        // Check that our test policy exists as an object key
        const rewritePolicies = parsedConfig.add.rewrite.policy || {};
        const rewriteActions = parsedConfig.add.rewrite.action || {};

        assert.ok('test_rewrite_pol' in rewritePolicies, 'Should have test_rewrite_pol');
        assert.ok('test_rewrite_action' in rewriteActions, 'Should have test_rewrite_action');

        // Verify policy properties
        const policy = rewritePolicies['test_rewrite_pol'];
        assert.strictEqual(policy.name, 'test_rewrite_pol');
        assert.ok(policy._line.includes('HTTP.REQ.IS_VALID'));
    });

    it('should parse responder policies correctly (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;
        assert.ok(parsedConfig.add?.responder?.policy, 'Should have responder policies');
        assert.ok(parsedConfig.add?.responder?.action, 'Should have responder actions');

        const responderPolicies = parsedConfig.add.responder.policy || {};
        const responderActions = parsedConfig.add.responder.action || {};

        assert.ok('test_responder_pol' in responderPolicies, 'Should have test_responder_pol');
        assert.ok('test_responder_action' in responderActions, 'Should have test_responder_action');
    });

    it('should parse authentication policies correctly (RX structure)', () => {
        const parsedConfig = adc.configObjectArryRx;
        assert.ok(parsedConfig.add?.authentication?.policy, 'Should have auth policies');
        assert.ok(parsedConfig.add?.authentication?.action, 'Should have auth actions');

        const authPolicies = parsedConfig.add.authentication.policy || {};
        const authActions = parsedConfig.add.authentication.action || {};

        assert.ok('test_auth_pol' in authPolicies, 'Should have test_auth_pol');
        assert.ok('test_auth_action' in authActions, 'Should have test_auth_action');
    });

    it('should include policies in application abstraction', () => {
        assert.ok(expld.config.apps, 'Should have apps array');
        assert.strictEqual(expld.config.apps.length, 1, 'Should have exactly 1 app');

        const app = expld.config.apps[0];
        assert.strictEqual(app.name, 'test_lb_vs');
        assert.ok(app.bindings, 'App should have bindings');
        assert.ok(app.bindings['-policyName'], 'Should have policyName bindings');
        assert.strictEqual(app.bindings['-policyName'].length, 3, 'Should have 3 policy bindings');

        // RX engine returns policy bindings as objects with properties
        const policyNames = app.bindings['-policyName'].map((p: any) =>
            typeof p === 'string' ? p : p['-policyName']
        );

        assert.ok(policyNames.includes('test_rewrite_pol'), 'Should include rewrite policy');
        assert.ok(policyNames.includes('test_responder_pol'), 'Should include responder policy');
        assert.ok(policyNames.includes('test_auth_pol'), 'Should include auth policy');
    });

    it('should maintain policy binding relationships with priorities', () => {
        const app = expld.config.apps[0];
        const policies = app.bindings['-policyName'];

        // Find rewrite policy binding and verify it has all properties
        const rewritePolicy = policies.find((p: any) =>
            (typeof p === 'object' && p['-policyName'] === 'test_rewrite_pol') ||
            (typeof p === 'string' && p === 'test_rewrite_pol')
        );

        assert.ok(rewritePolicy, 'Should find rewrite policy binding');

        // If it's an object (RX engine), verify it has priority and type
        if (typeof rewritePolicy === 'object') {
            assert.strictEqual(rewritePolicy['-priority'], '100', 'Should have priority 100');
            assert.strictEqual(rewritePolicy['-type'], 'REQUEST', 'Should have type REQUEST');
            assert.strictEqual(rewritePolicy['-gotoPriorityExpression'], 'END');
        }
    });

    it('should verify all policy priorities are preserved', () => {
        const app = expld.config.apps[0];
        const policies = app.bindings['-policyName'];

        // Check each policy has correct priority
        policies.forEach((p: any) => {
            if (typeof p === 'object') {
                const name = p['-policyName'];
                const priority = p['-priority'];

                if (name === 'test_rewrite_pol') {
                    assert.strictEqual(priority, '100', 'Rewrite policy priority should be 100');
                } else if (name === 'test_responder_pol') {
                    assert.strictEqual(priority, '200', 'Responder policy priority should be 200');
                } else if (name === 'test_auth_pol') {
                    assert.strictEqual(priority, '300', 'Auth policy priority should be 300');
                }
            }
        });
    });
});
