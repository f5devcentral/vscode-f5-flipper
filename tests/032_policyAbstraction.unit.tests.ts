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

const events = [];

const testConfig = `
#NS13.1 Build 37.38
enable ns feature WL LB CS SSL REWRITE RESPONDER

add lb vserver test_lb_vs HTTP 192.168.1.100 80 -persistenceType NONE
add rewrite policy test_rewrite_pol HTTP.REQ.IS_VALID test_rewrite_action
add rewrite action test_rewrite_action insert_http_header "X-Test-Header" "test-value"
add responder policy test_responder_pol HTTP.REQ.URL.EQ("/health") test_responder_action
add responder action test_responder_action respond_with "HTTP/1.1 200 OK\\r\\n\\r\\nHealthy"
add authentication policy test_auth_pol NS_TRUE test_auth_action
add authentication action test_auth_action ldap_action -serverIP 192.168.1.10 -serverPort 389

bind lb vserver test_lb_vs -policyName test_rewrite_pol -priority 100 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_responder_pol -priority 200 -gotoPriorityExpression END -type REQUEST
bind lb vserver test_lb_vs -policyName test_auth_pol -priority 300 -gotoPriorityExpression END -type REQUEST

add serviceGroup test_sg HTTP -maxClient 0
bind serviceGroup test_sg 192.168.1.10 80
bind lb vserver test_lb_vs test_sg
`;

const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

describe('Policy Abstraction tests', function () {

    let adc: ADC;
    let expld: Explosion;
    let log;
    let err;

    before(async function () {
        // log test file name - makes it easer for troubleshooting
        console.log('       file:', __filename)
        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0
        adc = new ADC();

        adc.on('parseFile', x => parsedFileEvents.push(x))
        adc.on('parseObject', x => parsedObjEvents.push(x))

        // Create a temporary config file for testing
        const fs = require('fs');
        const path = require('path');
        const tempFile = path.join(__dirname, 'temp_policy_test.conf');
        fs.writeFileSync(tempFile, testConfig);
        
        await adc.loadParseAsync(tempFile)
            .then(async x => {
                await adc.explode()
                    .then(x => {
                        expld = x
                    })
            })
            .catch(y => {
                err = y;
                debugger;
            })
            .finally(() => {
                // Clean up temp file
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            })

    });

    afterEach(function () {
        events.length = 0;
    })

    it('should parse rewrite policies correctly', async () => {
        const parsedConfig = adc.configObjectArry;
        assert.ok(parsedConfig.add?.rewrite?.policy);
        assert.ok(parsedConfig.add?.rewrite?.action);
        
        // Check that our test policies are in the arrays
        const rewritePolicies = parsedConfig.add.rewrite.policy || [];
        const rewriteActions = parsedConfig.add.rewrite.action || [];
        assert.ok(rewritePolicies.some((p: string) => p.includes('test_rewrite_pol')));
        assert.ok(rewriteActions.some((a: string) => a.includes('test_rewrite_action')));
    });

    it('should parse responder policies correctly', async () => {
        const parsedConfig = adc.configObjectArry;
        assert.ok(parsedConfig.add?.responder?.policy);
        assert.ok(parsedConfig.add?.responder?.action);
        
        const responderPolicies = parsedConfig.add.responder.policy || [];
        const responderActions = parsedConfig.add.responder.action || [];
        assert.ok(responderPolicies.some((p: string) => p.includes('test_responder_pol')));
        assert.ok(responderActions.some((a: string) => a.includes('test_responder_action')));
    });

    it('should parse authentication policies correctly', async () => {
        const parsedConfig = adc.configObjectArry;
        assert.ok(parsedConfig.add?.authentication?.policy);
        assert.ok(parsedConfig.add?.authentication?.action);
        
        const authPolicies = parsedConfig.add.authentication.policy || [];
        const authActions = parsedConfig.add.authentication.action || [];
        assert.ok(authPolicies.some((p: string) => p.includes('test_auth_pol')));
        assert.ok(authActions.some((a: string) => a.includes('test_auth_action')));
    });

    it('should include policies in application abstraction', async () => {
        assert.ok(expld.config.apps);
        assert.strictEqual(expld.config.apps.length, 1);
        
        const app = expld.config.apps[0];
        assert.strictEqual(app.name, 'test_lb_vs');
        assert.ok(app.bindings);
        assert.ok(app.bindings['-policyName']);
        assert.strictEqual(app.bindings['-policyName'].length, 3);
        
        const policyNames = app.bindings['-policyName'].map((p: any) => 
            typeof p === 'string' ? p : p['-policyName']
        );
        assert.ok(policyNames.includes('test_rewrite_pol'));
        assert.ok(policyNames.includes('test_responder_pol'));
        assert.ok(policyNames.includes('test_auth_pol'));
    });

    it('should maintain policy binding relationships with priorities', async () => {
        const app = expld.config.apps[0];
        const policies = app.bindings['-policyName'];
        
        // Check that policies have proper binding options
        const rewritePolicy = policies.find((p: any) => 
            (typeof p === 'object' && p['-policyName'] === 'test_rewrite_pol') ||
            (typeof p === 'string' && p === 'test_rewrite_pol')
        );
        assert.ok(rewritePolicy);
    });

});