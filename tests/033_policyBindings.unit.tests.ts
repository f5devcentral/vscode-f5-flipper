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

add cs vserver test_cs_vs HTTP 192.168.1.50 80 -cltTimeout 180
add lb vserver test_lb_vs HTTP 0.0.0.0 0 -persistenceType NONE

add cs policy test_cs_pol "HTTP.REQ.URL.PATH.STARTSWITH(\"/api\")" test_cs_action
add cs action test_cs_action -targetLBVserver test_lb_vs

add rewrite policy test_rewrite_pol HTTP.REQ.IS_VALID test_rewrite_action
add rewrite action test_rewrite_action insert_http_header "X-Rewrite" "applied"

add responder policy test_resp_pol "HTTP.REQ.URL.EQ(\"/status\")" test_resp_action
add responder action test_resp_action respond_with "HTTP/1.1 200 OK\\r\\n\\r\\nOK"

add authentication policy test_auth_pol NS_TRUE test_auth_action  
add authentication action test_auth_action ldap_action -serverIP 192.168.1.20

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

describe('Policy Binding Relationship tests', function () {

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
        const tempFile = path.join(__dirname, 'temp_binding_test.conf');
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

    it('should parse CS policy bindings correctly', async () => {
        const parsedConfig = adc.configObjectArry;
        assert.ok(parsedConfig.bind?.cs?.vserver);
        
        const bindings = parsedConfig.bind.cs.vserver || [];
        const policyBinding = bindings.find((b: any) => b.includes('test_cs_vs') && b.includes('-policyName test_cs_pol'));
        assert.ok(policyBinding);
        assert.ok(policyBinding.includes('-priority 100'));
    });

    it('should parse LB policy bindings with priorities correctly', async () => {
        const parsedConfig = adc.configObjectArry;
        assert.ok(parsedConfig.bind?.lb?.vserver);
        
        const bindings = parsedConfig.bind.lb.vserver || [];
        
        // Check rewrite policy binding
        const rewriteBinding = bindings.find((b: any) => b.includes('test_lb_vs') && b.includes('-policyName test_rewrite_pol'));
        assert.ok(rewriteBinding);
        assert.ok(rewriteBinding.includes('-priority 100'));
        assert.ok(rewriteBinding.includes('-type REQUEST'));
        
        // Check responder policy binding
        const responderBinding = bindings.find((b: any) => b.includes('test_lb_vs') && b.includes('-policyName test_resp_pol'));
        assert.ok(responderBinding);
        assert.ok(responderBinding.includes('-priority 200'));
        
        // Check auth policy binding
        const authBinding = bindings.find((b: any) => b.includes('test_lb_vs') && b.includes('-policyName test_auth_pol'));
        assert.ok(authBinding);
        assert.ok(authBinding.includes('-priority 300'));
    });

    it('should abstract CS app with policy references', async () => {
        assert.ok(expld.config.apps);
        const csApp = expld.config.apps.find(app => app.name === 'test_cs_vs');
        assert.ok(csApp);
        assert.strictEqual(csApp.type, 'cs');
        
        // Check CS policies are captured
        if (csApp.csPolicies) {
            assert.ok(csApp.csPolicies.length > 0);
            const policy = csApp.csPolicies.find(p => p.name === 'test_cs_pol');
            assert.ok(policy);
        }
        
        // Check policy bindings
        if (csApp.bindings && csApp.bindings['-policyName']) {
            const policyRefs = csApp.bindings['-policyName'];
            const hasCsPolicy = policyRefs.some((p: any) => 
                (typeof p === 'string' && p === 'test_cs_pol') ||
                (typeof p === 'object' && p['-policyName'] === 'test_cs_pol')
            );
            assert.ok(hasCsPolicy);
        }
    });

    it('should abstract LB app with multiple policy types', async () => {
        const lbApp = expld.config.apps?.find(app => app.name === 'test_lb_vs');
        assert.ok(lbApp);
        assert.strictEqual(lbApp.type, 'lb');
        
        // Check policy bindings exist
        assert.ok(lbApp.bindings);
        assert.ok(lbApp.bindings['-policyName']);
        
        const policies = lbApp.bindings['-policyName'];
        assert.ok(Array.isArray(policies));
        assert.strictEqual(policies.length, 3);
        
        // Verify all three policy types are present
        const policyNames = policies.map((p: any) => 
            typeof p === 'string' ? p : p['-policyName']
        );
        assert.ok(policyNames.includes('test_rewrite_pol'));
        assert.ok(policyNames.includes('test_resp_pol'));
        assert.ok(policyNames.includes('test_auth_pol'));
    });

    it('should maintain CS to LB vserver relationships', async () => {
        const csApp = expld.config.apps?.find(app => app.name === 'test_cs_vs');
        assert.ok(csApp);
        
        // Check that CS app references LB app
        if (csApp.apps) {
            const referencedLbApp = csApp.apps.find(app => app.name === 'test_lb_vs');
            assert.ok(referencedLbApp);
            assert.strictEqual(referencedLbApp.type, 'lb');
        }
        
        // Check bindings for lbvserver reference
        if (csApp.bindings && csApp.bindings['-lbvserver']) {
            assert.ok(csApp.bindings['-lbvserver'].includes('test_lb_vs'));
        }
    });

    it('should verify policy action relationships are parsed', async () => {
        const parsedConfig = adc.configObjectArry;
        
        // Verify CS action references target LB vserver
        assert.ok(parsedConfig.add?.cs?.action);
        const csActions = parsedConfig.add.cs.action || [];
        const csAction = csActions.find((a: string) => a.includes('test_cs_action'));
        assert.ok(csAction);
        assert.ok(csAction.includes('-targetLBVserver test_lb_vs'));
        
        // Verify rewrite action is parsed
        assert.ok(parsedConfig.add?.rewrite?.action);
        const rewriteActions = parsedConfig.add.rewrite.action || [];
        assert.ok(rewriteActions.some((a: string) => a.includes('test_rewrite_action')));
        
        // Verify responder action is parsed
        assert.ok(parsedConfig.add?.responder?.action);
        const responderActions = parsedConfig.add.responder.action || [];
        assert.ok(responderActions.some((a: string) => a.includes('test_resp_action')));
        
        // Verify authentication action is parsed
        assert.ok(parsedConfig.add?.authentication?.action);
        const authActions = parsedConfig.add.authentication.action || [];
        assert.ok(authActions.some((a: string) => a.includes('test_auth_action')));
    });

});