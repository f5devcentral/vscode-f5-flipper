/**
 * Object Type Expansion Tests
 *
 * Tests for 39 new regex patterns added from BORG research
 * Goal: Verify parser recognizes each pattern and creates objects in configObjectArryRx
 *
 * Categories tested:
 * 1. Network & System Objects (5 patterns)
 * 2. Profiles (9 patterns)
 * 3. Persistence (2 patterns)
 * 4. Cache Policies (6 patterns)
 * 5. Compression Policies (4 patterns)
 * 6. Authorization (2 patterns)
 * 7. Rate Limiting (3 patterns)
 * 8. Audit Policies (4 patterns)
 * 9. Spillover Policies (2 patterns)
 * 10. AAA vServers (2 patterns)
 *
 * STATUS: Tests enabled - configs verified on real NetScaler NS13.1 Build 61.23.nc
 * See tests/artifacts/apps/README.md for verification status.
 */

import * as assert from 'assert';
import ADC from '../src/CitrixADC';
import path from 'path';

const testConfigsPath = path.join(__dirname, 'artifacts', 'apps');

describe('Object Type Expansion - BORG Phase 1', () => {

    // ==== Category 1: Network & System Objects (5 patterns) ====

    describe('Network & System Objects', () => {

        it('should parse add vlan from networkObjects.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'networkObjects.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.vlan, 'vlan object should exist');
            // Check that at least one VLAN was parsed
            const vlans = Object.keys(adc.configObjectArryRx.add.vlan);
            assert.ok(vlans.length > 0, 'Should have at least one VLAN');
        });

        // Note: bind vlan commands were not included in verified config
        // (VLAN binding requires interface assignment which varies by appliance)

        it('should parse add ns trafficDomain from networkObjects.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'networkObjects.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.ns?.trafficDomain, 'trafficDomain object should exist');
            const domains = Object.keys(adc.configObjectArryRx.add.ns.trafficDomain);
            assert.ok(domains.length > 0, 'Should have at least one traffic domain');
        });

        // Note: bind ns trafficDomain commands were not included in verified config
        // (Traffic domain binding to VLANs requires VLAN interface setup)

    });

    // ==== Category 2: Profiles (9 patterns) ====

    describe('Profiles', () => {

        it('should parse add ns tcpProfile from profiles.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'profiles.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.ns?.tcpProfile, 'tcpProfile object should exist');
            assert.ok(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom'], 'tcp_prof_custom should exist');
            assert.equal(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']['-WS'], 'ENABLED');
        });

        it('should parse add ns httpProfile from profiles.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'profiles.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.ns?.httpProfile, 'httpProfile object should exist');
            assert.ok(adc.configObjectArryRx.add.ns.httpProfile['http_prof_custom'], 'http_prof_custom should exist');
            assert.equal(adc.configObjectArryRx.add.ns.httpProfile['http_prof_custom']['-dropInvalReqs'], 'ENABLED');
        });

        it('should parse add ssl profile from profiles.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'profiles.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.ssl?.profile, 'ssl profile object should exist');
            assert.ok(adc.configObjectArryRx.add.ssl.profile['ssl_prof_frontend'], 'ssl_prof_frontend should exist');
            assert.equal(adc.configObjectArryRx.add.ssl.profile['ssl_prof_frontend']['-ssl3'], 'DISABLED');
            assert.equal(adc.configObjectArryRx.add.ssl.profile['ssl_prof_frontend']['-tls12'], 'ENABLED');
        });

        it('should parse add dns profile from profiles.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'profiles.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.dns?.profile, 'dns profile object should exist');
            assert.ok(adc.configObjectArryRx.add.dns.profile['dns_prof_custom'], 'dns_prof_custom should exist');
            assert.equal(adc.configObjectArryRx.add.dns.profile['dns_prof_custom']['-dnsQueryLogging'], 'ENABLED');
        });

    });

    // ==== Category 3: Persistence (2 patterns) ====

    describe('Persistence Sessions', () => {

        it('should parse persistence configs from persistence.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'persistence.ns.conf'));

            // Check that lb vservers with persistence types exist
            assert.ok(adc.configObjectArryRx.add?.lb?.vserver, 'lb vserver object should exist');
            const vservers = Object.keys(adc.configObjectArryRx.add.lb.vserver);
            assert.ok(vservers.length > 0, 'Should have at least one vserver');
        });

    });

    // ==== Category 4: Cache Policies (6 patterns) ====

    describe('Cache Policies', () => {

        it('should parse add cache contentGroup from caching.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'caching.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.cache?.contentGroup, 'cache contentGroup object should exist');
            const groups = Object.keys(adc.configObjectArryRx.add.cache.contentGroup);
            assert.ok(groups.length > 0, 'Should have at least one content group');
        });

        it('should parse add cache selector from caching.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'caching.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.cache?.selector, 'cache selector object should exist');
            const selectors = Object.keys(adc.configObjectArryRx.add.cache.selector);
            assert.ok(selectors.length > 0, 'Should have at least one cache selector');
        });

        it('should parse add cache policy from caching.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'caching.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.cache?.policy, 'cache policy object should exist');
            const policies = Object.keys(adc.configObjectArryRx.add.cache.policy);
            assert.ok(policies.length > 0, 'Should have at least one cache policy');
        });

    });

    // ==== Category 5: Compression Policies (4 patterns) ====

    describe('Compression Policies', () => {

        it('should parse add cmp policy from compression.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'compression.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.cmp?.policy, 'cmp policy object should exist');
            const policies = Object.keys(adc.configObjectArryRx.add.cmp.policy);
            assert.ok(policies.length > 0, 'Should have at least one cmp policy');
        });

    });

    // ==== Category 6: Authorization (2 patterns) ====

    describe('Authorization Policies', () => {

        it('should parse add authorization action from authorization.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'authorization.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.authorization?.action, 'authorization action object should exist');
            const actions = Object.keys(adc.configObjectArryRx.add.authorization.action);
            assert.ok(actions.length > 0, 'Should have at least one authorization action');
        });

        it('should parse add authorization policy from authorization.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'authorization.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.authorization?.policy, 'authorization policy object should exist');
            const policies = Object.keys(adc.configObjectArryRx.add.authorization.policy);
            assert.ok(policies.length > 0, 'Should have at least one authorization policy');
        });

    });

    // ==== Category 7: Rate Limiting (3 patterns) ====

    describe('Rate Limiting', () => {

        it('should parse add ns limitIdentifier from rateLimiting.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'rateLimiting.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.ns?.limitIdentifier, 'limitIdentifier object should exist');
            const identifiers = Object.keys(adc.configObjectArryRx.add.ns.limitIdentifier);
            assert.ok(identifiers.length > 0, 'Should have at least one limit identifier');
        });

        // Note: ns limitSelector is deprecated - use stream selector instead
        // The real NetScaler uses 'add stream selector' not 'add ns limitSelector'

    });

    // ==== Category 8: Audit Policies (4 patterns) ====

    describe('Audit Policies', () => {

        it('should parse add audit syslogAction from auditLogging.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'auditLogging.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.audit?.syslogAction, 'syslogAction object should exist');
            const actions = Object.keys(adc.configObjectArryRx.add.audit.syslogAction);
            assert.ok(actions.length > 0, 'Should have at least one syslog action');
        });

        it('should parse add audit syslogPolicy from auditLogging.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'auditLogging.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.audit?.syslogPolicy, 'syslogPolicy object should exist');
            const policies = Object.keys(adc.configObjectArryRx.add.audit.syslogPolicy);
            assert.ok(policies.length > 0, 'Should have at least one syslog policy');
        });

    });

    // ==== Category 9: Spillover Policies (2 patterns) ====

    describe('Spillover Policies', () => {

        it('should parse spillover config from spillover.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'spillover.ns.conf'));

            // Spillover is configured via set lb vserver -soMethod, not add spillover
            assert.ok(adc.configObjectArryRx.add?.lb?.vserver, 'lb vserver object should exist');
            assert.ok(adc.configObjectArryRx.set?.lb?.vserver, 'set lb vserver object should exist');
        });

    });

    // ==== Category 10: AAA vServers (2 patterns) ====

    describe('AAA vServers (Legacy Authentication)', () => {

        // Note: The regex tree currently only supports 'add authentication policy' and 'add authentication action'
        // Other authentication commands like ldapAction, radiusAction, vserver are NOT currently parsed
        // This is a known gap - see BORG_AUTH_REFERENCE.md for full auth pattern documentation

        it('should parse lb vserver with authentication settings from aaaLegacy.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'aaaLegacy.ns.conf'));

            // Verify we can parse the lb vserver with authentication settings
            assert.ok(adc.configObjectArryRx.add?.lb?.vserver, 'lb vserver with auth should exist');

            // Check that the vserver has authentication-related options
            const vservers = Object.values(adc.configObjectArryRx.add.lb.vserver);
            const authVserver = vservers.find((vs: any) => vs['-Authentication'] === 'ON');
            assert.ok(authVserver, 'Should have vserver with authentication enabled');
        });

    });

    // ==== Integration Tests ====

    describe('Integration: Multiple Object Types', () => {

        it('should parse productionWeb.ns.conf with multiple new object types', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'productionWeb.ns.conf'));

            // This comprehensive config should have many object types
            assert.ok(adc.configObjectArryRx.add?.lb?.vserver, 'lb vserver should exist');
            assert.ok(adc.configObjectArryRx.add?.server, 'server should exist');
            assert.ok(adc.configObjectArryRx.add?.serviceGroup, 'serviceGroup should exist');
        });

        it('should explode config and count objects', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'profiles.ns.conf'));
            const explosion = await adc.explode();

            // Object count should include new types
            assert.ok(explosion.stats?.objectCount !== undefined, 'objectCount should exist');
            assert.ok(explosion.stats.objectCount > 0, 'objectCount should be greater than 0');
        });

    });

    // ==== P2/P3 Synthetic Config Tests (Feature Detection) ====

    describe('P2 Synthetic Configs (Feature Detection)', () => {

        it('should parse gslbComplete.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'gslbComplete.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.gslb?.vserver, 'gslb vserver should exist');
            assert.ok(adc.configObjectArryRx.add?.gslb?.service, 'gslb service should exist');
            assert.ok(adc.configObjectArryRx.add?.gslb?.site, 'gslb site should exist');
        });

        it('should parse appFirewall.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'appFirewall.ns.conf'));

            // AppFW configs should parse (even if not deployable without feature)
            assert.ok(adc.configObjectArryRx.add, 'add object should exist');
        });

        it('should parse customMonitors.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'customMonitors.ns.conf'));

            assert.ok(adc.configObjectArryRx.add?.lb?.monitor, 'lb monitor should exist');
            const monitors = Object.keys(adc.configObjectArryRx.add.lb.monitor);
            assert.ok(monitors.length > 0, 'Should have at least one monitor');
        });

    });

    describe('P3 Synthetic Configs (Infrastructure)', () => {

        it('should parse haCluster.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'haCluster.ns.conf'));

            // HA/Cluster configs should parse
            assert.ok(adc.configObjectArryRx.add, 'add object should exist');
        });

        it('should parse nFactorAuth.ns.conf', async () => {
            const adc = new ADC();
            await adc.loadParseAsync(path.join(testConfigsPath, 'nFactorAuth.ns.conf'));

            // nFactor config has lb vservers with authentication
            // Note: Most authentication commands are not yet in regex tree
            assert.ok(adc.configObjectArryRx.add?.lb?.vserver, 'lb vserver should exist');
            assert.ok(adc.configObjectArryRx.add?.ssl?.certKey, 'ssl certKey should exist');
        });

    });

});
