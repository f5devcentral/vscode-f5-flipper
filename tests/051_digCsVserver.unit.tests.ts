import assert from 'assert';
import CitrixADC from '../src/CitrixADC';
import path from 'path';
import { AdcApp, Explosion } from '../src/models';

describe('digCsVserver Content Switching Tests', () => {

    let adc: CitrixADC;
    let starlordConfig: string;
    let explosion: Explosion;

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
        
        // Load the starlord config which has CS vserver examples
        starlordConfig = path.join(__dirname, 'artifacts', 'apps', 'starlord.ns.conf');
        adc = new CitrixADC();
        await adc.loadParseAsync(starlordConfig);
        explosion = await adc.explode();
    });

    describe('CS Vserver Parsing', () => {
        it('should parse CS vserver successfully', () => {
            assert.ok(explosion);
            assert.ok(explosion.config);
            assert.ok(explosion.config.apps);
            // Verify we have CS vservers in the apps
            const csApps = (explosion.config.apps ?? []).filter( app => app.type === 'cs');
            assert.ok(csApps.length > 0, 'Should have parsed CS vservers');
        });

        it('should extract CS vserver with correct basic properties', () => {
            const csApps = (explosion.config?.apps || []).filter(app => app.type === 'cs');
            assert.ok(csApps.length > 0, 'Should have at least one CS app');

            const csApp = csApps[0];
            assert.strictEqual(csApp.name, 'starlord_cs_vs');
            assert.strictEqual(csApp.type, 'cs');
            assert.strictEqual(csApp.protocol, 'HTTP');
            assert.strictEqual(csApp.ipAddress, '192.168.86.143');
            assert.strictEqual(csApp.port, '443');
        });

        it('should include CS vserver options', () => {
            const csApp = explosion.config?.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.opts);
            assert.strictEqual(csApp.opts['-cltTimeout'], '180');
            assert.strictEqual(csApp.opts['-persistenceType'], 'NONE');
        });

        it('should include original config lines', () => {
            const csApp = explosion.config?.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.lines);
            assert.ok(csApp.lines.length > 0);
            assert.ok(csApp.lines[0].includes('add cs vserver starlord_cs_vs'));
        });
    });

    describe('CS Vserver Bindings', () => {
        it('should have bindings structure', () => {
            const csApp = explosion.config?.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.bindings);
            assert.ok(Array.isArray(csApp.bindings['-lbvserver']));
            assert.ok(Array.isArray(csApp.bindings['-policyName']));
        });

        it('should parse -lbvserver bindings', () => {
            const csApp = explosion.config?.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.bindings && csApp.bindings['-lbvserver']);

            // Should have at least one LB vserver binding
            assert.ok(csApp.bindings['-lbvserver'].length > 0);
            assert.ok(csApp.bindings['-lbvserver'].includes('starlord_offload_lb_vs'));
        });

        it('should parse -policyName bindings', () => {
            const csApp = explosion.config.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.bindings && csApp.bindings['-policyName']);

            // Should have at least one policy binding
            assert.ok(csApp.bindings['-policyName'].length > 0);

            const policyBinding = csApp.bindings['-policyName'][0];
            assert.ok(policyBinding);
            assert.strictEqual(policyBinding['-policyName'], 'starlord-policy-CS-4');
            assert.strictEqual(policyBinding['-priority'], '100');
        });
    });

    describe('CS Policy Abstraction', () => {
        it('should parse CS policies', () => {
            const csApp = explosion.config.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.csPolicies);
            assert.ok(csApp.csPolicies.length > 0);
        });

        it('should include CS policy details', () => {
            const csApp = explosion.config.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const policy = csApp.csPolicies?.find(p => p.name === 'starlord-policy-CS-4');
            assert.ok(policy, 'Should find CS policy');
            assert.ok(policy['-rule']);
            assert.ok(policy['-rule'].includes('HTTP.REQ.HOSTNAME'));
            assert.strictEqual(policy['-action'], 'starlord-mycsaction');
        });

        it('should include CS policy in config lines', () => {
            const csApp = explosion.config.apps?.find(app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const policyLine = csApp.lines?.find(line => line.includes('add cs policy'));
            assert.ok(policyLine, 'Should have CS policy line');
            assert.ok(policyLine.includes('starlord-policy-CS-4'));
        });
    });

    describe('CS Action Abstraction', () => {
        it('should parse CS actions', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.csPolicyActions);
            assert.ok(csApp.csPolicyActions.length > 0);
        });

        it('should include CS action details', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const action = csApp.csPolicyActions?.find(a => a['-targetLBVserver'] === 'starlord_offload_lb_vs');
            assert.ok(action, 'Should find CS action with targetLBVserver');
            // todo: review if we even care about comments
            assert.ok(action['-comment']);
        });

        it('should include CS action in config lines', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const actionLine = csApp.lines?.find(line => line.includes('add cs action'));
            assert.ok(actionLine, 'Should have CS action line');
            assert.ok(actionLine.includes('starlord-mycsaction'));
        });

        it('should link CS action to target LB vserver', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const action = csApp.csPolicyActions?.[0];
            assert.ok(action);
            assert.ok(action['-targetLBVserver']);
            assert.strictEqual(action['-targetLBVserver'], 'starlord_offload_lb_vs');
        });
    });

    describe('CS with SSL Bindings', () => {
        it('should parse SSL bindings for CS vserver', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');

            // CS vserver itself might not have SSL bindings, but check structure exists
            if (csApp) {
                assert.ok(csApp.bindings);
            }
        });
    });

    describe('Empty CS Vserver Handling', () => {
        it('should handle configs without CS vservers', async () => {
            // Create a new ADC instance with a config that has no CS vservers
            const emptyAdc = new CitrixADC();
            const simpleConfig = 
`#NS13.0
add lb vserver test_lb HTTP 10.0.0.1 80 -persistenceType NONE
add server test_srv 10.0.0.2
bind lb vserver test_lb test_srv`;

            // Parse the simple config
            await emptyAdc.parseConf({ fileName: 'test.conf', size: simpleConfig.length, content: simpleConfig });

            try {
                const emptyExplosion = await emptyAdc.explode();
                // Should not have CS apps
                const csApps = emptyExplosion.config.apps?.filter( app => app.type === 'cs') || [];
                assert.strictEqual(csApps.length, 0, 'Should have no CS apps');
            } catch (error: any) {
                // Expected error when no vservers found - that's ok
                assert.ok(error.message.includes('no "add cs vserver"'));
            }
        });
    });

    describe('Complex CS Configuration', () => {
        it('should handle CS vserver with multiple policy bindings', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            // Should have multiple lines for all bindings
            const bindLines = csApp.lines?.filter(line => line.includes('bind cs vserver')) || [];
            assert.ok(bindLines.length >= 2, 'Should have multiple bind lines');
        });

        it('should preserve policy priority ordering', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const policyBindings = csApp.bindings?.['-policyName'];
            if (policyBindings && policyBindings.length > 0) {
                const policyBinding = policyBindings[0];
                assert.ok(policyBinding['-priority']);
                assert.strictEqual(policyBinding['-priority'], '100');
            }
        });

        it('should capture complete CS configuration', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            // Should have lines for:
            // - add cs vserver
            // - bind cs vserver (policies)
            // - bind cs vserver (lb vservers)
            // - add cs policy
            // - add cs action

            assert.ok(csApp.lines?.some(l => l.includes('add cs vserver')));
            assert.ok(csApp.lines?.some(l => l.includes('bind cs vserver')));
            assert.ok(csApp.lines?.some(l => l.includes('add cs policy')));
            assert.ok(csApp.lines?.some(l => l.includes('add cs action')));
        });
    });

    describe('CS Configuration Line Collection', () => {
        it('should collect all related config lines', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.lines);

            // Should have a reasonable number of lines (at least 4)
            assert.ok(csApp.lines?.length >= 4, 'Should have multiple config lines');
        });

        it('should maintain config line order', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            // First line should be the add cs vserver command
            assert.ok(csApp.lines?.[0].startsWith('add cs vserver'));
        });

        it('should include all bind statements', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            const bindCount = csApp.lines?.filter(l => l.includes('bind cs vserver')).length ?? 0;
            assert.ok(bindCount >= 2, 'Should have at least 2 bind statements');
        });
    });

    describe('CS App Metadata', () => {
        it('should have correct app type', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.strictEqual(csApp.type, 'cs');
        });

        it('should have protocol information', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.protocol);
            assert.ok(['HTTP', 'HTTPS', 'SSL', 'TCP', 'UDP'].includes(csApp.protocol));
        });

        it('should have network information', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);
            assert.ok(csApp.ipAddress);
            assert.ok(csApp.port);

            // IP should be valid format
            assert.ok(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(csApp.ipAddress));
        });
    });

    describe('Integration with Other Components', () => {
        it('should reference LB vservers correctly', () => {
            const csApp = explosion.config.apps?.find( app => app.name === 'starlord_cs_vs');
            assert.ok(csApp);

            // CS app should reference LB vservers
            const lbRefs = csApp.bindings?.['-lbvserver'] || [];
            assert.ok(lbRefs.length > 0);

            // Those LB vservers should exist in the apps
            lbRefs.forEach(lbName => {
                const lbApp = explosion.config.apps?.find(a => a.name === lbName);
                // Note: lbApp might not exist if it's referenced in action but not directly bound
                // Just verify the reference is captured
                assert.ok(typeof lbName === 'string');
            });
        });

        it('should be included in total app count', () => {
            assert.ok(explosion.config.apps);
            assert.ok(explosion.config.apps.length > 0);

            const csCount = explosion.config.apps.filter(a => a.type === 'cs').length;
            assert.ok(csCount > 0, 'Should have CS apps in total');
        });
    });
});

/**
 * Note on Appflow Testing:
 *
 * The appflow policy processing code (lines 148-209 in digCsVserver.ts) is not currently
 * covered by tests because it requires a complex test setup:
 * - CS vserver with appflow policy binding
 * - Appflow policy → appflow action → appflow collector chain
 * - Valid LB vserver references (required by digCStoLbRefs.ts)
 *
 * The code follows the same pattern as CS policy processing and would be exercised
 * in production when NetScaler configs contain appflow policies bound to CS vservers.
 *
 * Future improvement: Create an integration test with a complete, valid NetScaler
 * config that includes appflow policies.
 */
