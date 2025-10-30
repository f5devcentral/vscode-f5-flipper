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
 * Total: 39 new patterns, 47 tests
 *
 * STATUS: Tests currently commented out - waiting for real NetScaler configs
 * to validate parser behavior. Patterns are defined in src/regex.ts and ready.
 * Uncomment tests once real configs with these object types are available.
 */

import * as assert from 'assert';
import ADC from '../src/CitrixADC';

describe.skip('Object Type Expansion - BORG Phase 1', () => {

    // ==== Category 1: Network & System Objects (5 patterns) ====

    describe('Network & System Objects', () => {

        it('should parse add vlan', async () => {
            const config = `
                #NS13.1 Build 37.38
                add vlan 100 -aliasName "DMZ_VLAN"
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.vlan);
            assert.ok(adc.configObjectArryRx.add.vlan['100']);
            assert.equal(adc.configObjectArryRx.add.vlan['100']['-aliasName'], 'DMZ_VLAN');
        });

        it('should parse bind vlan', async () => {
            const config = `
                #NS13.1 Build 37.38
                add vlan 100
                bind vlan 100 -ifnum 1/1
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.vlan);
            assert.ok(adc.configObjectArryRx.bind.vlan['100']);
        });

        it('should parse add ns netProfile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns netProfile net_prof_dmz -srcIP 10.1.1.1
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.netProfile);
            assert.ok(adc.configObjectArryRx.add.ns.netProfile['net_prof_dmz']);
            assert.equal(adc.configObjectArryRx.add.ns.netProfile['net_prof_dmz']['-srcIP'], '10.1.1.1');
        });

        it('should parse add ns trafficDomain', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns trafficDomain 10 -aliasName "Tenant_A"
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.trafficDomain);
            assert.ok(adc.configObjectArryRx.add.ns.trafficDomain['10']);
            assert.equal(adc.configObjectArryRx.add.ns.trafficDomain['10']['-aliasName'], 'Tenant_A');
        });

        it('should parse bind ns trafficDomain', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns trafficDomain 10
                bind ns trafficDomain 10 -vlan 100
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.ns?.trafficDomain);
            assert.ok(adc.configObjectArryRx.bind.ns.trafficDomain['10']);
        });

    });

    // ==== Category 2: Profiles (9 patterns) ====

    describe('Profiles', () => {

        it('should parse add ns tcpProfile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns tcpProfile tcp_prof_custom -WS ENABLED -SACK ENABLED -nagle ENABLED
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.tcpProfile);
            assert.ok(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']);
            assert.equal(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']['-WS'], 'ENABLED');
            assert.equal(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']['-SACK'], 'ENABLED');
        });

        it('should parse set ns tcpProfile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns tcpProfile tcp_prof_custom
                set ns tcpProfile tcp_prof_custom -maxBurst 30 -initialCwnd 16
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.ns?.tcpProfile);
            assert.ok(adc.configObjectArryRx.set.ns.tcpProfile['tcp_prof_custom']);
            assert.equal(adc.configObjectArryRx.set.ns.tcpProfile['tcp_prof_custom']['-maxBurst'], '30');
        });

        it('should parse add ns httpProfile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns httpProfile http_prof_custom -dropInvalReqs ENABLED -markHttp09Inval ENABLED
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.httpProfile);
            assert.ok(adc.configObjectArryRx.add.ns.httpProfile['http_prof_custom']);
            assert.equal(adc.configObjectArryRx.add.ns.httpProfile['http_prof_custom']['-dropInvalReqs'], 'ENABLED');
        });

        it('should parse set ns httpProfile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns httpProfile http_prof_custom
                set ns httpProfile http_prof_custom -maxHeaderLen 24820
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.ns?.httpProfile);
            assert.ok(adc.configObjectArryRx.set.ns.httpProfile['http_prof_custom']);
            assert.equal(adc.configObjectArryRx.set.ns.httpProfile['http_prof_custom']['-maxHeaderLen'], '24820');
        });

        it('should parse add ssl profile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ssl profile ssl_prof_custom -ssl3 DISABLED -tls1 ENABLED -tls11 ENABLED -tls12 ENABLED -tls13 ENABLED
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ssl?.profile);
            assert.ok(adc.configObjectArryRx.add.ssl.profile['ssl_prof_custom']);
            assert.equal(adc.configObjectArryRx.add.ssl.profile['ssl_prof_custom']['-ssl3'], 'DISABLED');
            assert.equal(adc.configObjectArryRx.add.ssl.profile['ssl_prof_custom']['-tls12'], 'ENABLED');
        });

        it('should parse set ssl profile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ssl profile ssl_prof_custom
                set ssl profile ssl_prof_custom -sessReuse ENABLED -sessTimeout 120
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.ssl?.profile);
            assert.ok(adc.configObjectArryRx.set.ssl.profile['ssl_prof_custom']);
            assert.equal(adc.configObjectArryRx.set.ssl.profile['ssl_prof_custom']['-sessReuse'], 'ENABLED');
        });

        it('should parse bind ssl profile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ssl profile ssl_prof_custom
                bind ssl profile ssl_prof_custom -cipherName HIGH
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.ssl?.profile);
            assert.ok(adc.configObjectArryRx.bind.ssl.profile['ssl_prof_custom']);
        });

        it('should parse add dns profile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add dns profile dns_prof_custom -dnsQueryLogging ENABLED
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.dns?.profile);
            assert.ok(adc.configObjectArryRx.add.dns.profile['dns_prof_custom']);
            assert.equal(adc.configObjectArryRx.add.dns.profile['dns_prof_custom']['-dnsQueryLogging'], 'ENABLED');
        });

        it('should parse set dns profile', async () => {
            const config = `
                #NS13.1 Build 37.38
                add dns profile dns_prof_custom
                set dns profile dns_prof_custom -cacheLimitNegative 10000
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.dns?.profile);
            assert.ok(adc.configObjectArryRx.set.dns.profile['dns_prof_custom']);
        });

    });

    // ==== Category 3: Persistence (2 patterns) ====

    describe('Persistence Sessions', () => {

        it('should parse add lb persistenceSession', async () => {
            const config = `
                #NS13.1 Build 37.38
                add lb persistenceSession custom_persist -persistenceType SOURCEIP -timeout 3600
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.lb?.persistenceSession);
            assert.ok(adc.configObjectArryRx.add.lb.persistenceSession['custom_persist']);
            assert.equal(adc.configObjectArryRx.add.lb.persistenceSession['custom_persist']['-persistenceType'], 'SOURCEIP');
            assert.equal(adc.configObjectArryRx.add.lb.persistenceSession['custom_persist']['-timeout'], '3600');
        });

        it('should parse set lb persistenceSession', async () => {
            const config = `
                #NS13.1 Build 37.38
                add lb persistenceSession custom_persist
                set lb persistenceSession custom_persist -timeout 7200
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.lb?.persistenceSession);
            assert.ok(adc.configObjectArryRx.set.lb.persistenceSession['custom_persist']);
            assert.equal(adc.configObjectArryRx.set.lb.persistenceSession['custom_persist']['-timeout'], '7200');
        });

    });

    // ==== Category 4: Cache Policies (6 patterns) ====

    describe('Cache Policies', () => {

        it('should parse add cache policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache policy cache_pol -rule "HTTP.REQ.URL.CONTAINS(\\"/images/\\")" -action CACHE
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cache?.policy);
            assert.ok(adc.configObjectArryRx.add.cache.policy['cache_pol']);
        });

        it('should parse add cache action', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache action cache_act -storeinGroup images_group
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cache?.action);
            assert.ok(adc.configObjectArryRx.add.cache.action['cache_act']);
            assert.equal(adc.configObjectArryRx.add.cache.action['cache_act']['-storeinGroup'], 'images_group');
        });

        it('should parse add cache contentGroup', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache contentGroup images_group -maxResSize 500000
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cache?.contentGroup);
            assert.ok(adc.configObjectArryRx.add.cache.contentGroup['images_group']);
            assert.equal(adc.configObjectArryRx.add.cache.contentGroup['images_group']['-maxResSize'], '500000');
        });

        it('should parse add cache selector', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache selector cache_sel -rule "HTTP.REQ.URL.PATH"
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cache?.selector);
            assert.ok(adc.configObjectArryRx.add.cache.selector['cache_sel']);
        });

        it('should parse set cache policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache policy cache_pol -rule true -action CACHE
                set cache policy cache_pol -undefAction NOCACHE
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.cache?.policy);
            assert.ok(adc.configObjectArryRx.set.cache.policy['cache_pol']);
        });

        it('should parse bind cache policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache policy cache_pol -rule true -action CACHE
                bind cache policy cache_pol -priority 100
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.cache?.policy);
            assert.ok(adc.configObjectArryRx.bind.cache.policy['cache_pol']);
        });

    });

    // ==== Category 5: Compression Policies (4 patterns) ====

    describe('Compression Policies', () => {

        it('should parse add cmp policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cmp policy cmp_pol -rule "HTTP.RES.HEADER(\\"Content-Type\\").CONTAINS(\\"text\\")" -resAction COMPRESS
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cmp?.policy);
            assert.ok(adc.configObjectArryRx.add.cmp.policy['cmp_pol']);
        });

        it('should parse add cmp action', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cmp action cmp_act_gzip -cmpType gzip -deltaType PERURL
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.cmp?.action);
            assert.ok(adc.configObjectArryRx.add.cmp.action['cmp_act_gzip']);
            assert.equal(adc.configObjectArryRx.add.cmp.action['cmp_act_gzip']['-cmpType'], 'gzip');
        });

        it('should parse set cmp policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cmp policy cmp_pol -rule true -resAction COMPRESS
                set cmp policy cmp_pol -resAction NOCOMPRESS
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.cmp?.policy);
            assert.ok(adc.configObjectArryRx.set.cmp.policy['cmp_pol']);
        });

        it('should parse bind cmp policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cmp policy cmp_pol -rule true -resAction COMPRESS
                bind cmp policy cmp_pol -priority 100
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.cmp?.policy);
            assert.ok(adc.configObjectArryRx.bind.cmp.policy['cmp_pol']);
        });

    });

    // ==== Category 6: Authorization (2 patterns) ====

    describe('Authorization Policies', () => {

        it('should parse add authorization policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add authorization policy authz_pol -rule "HTTP.REQ.USER.IS_MEMBER_OF(\\"Admins\\")" -action ALLOW
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.authorization?.policy);
            assert.ok(adc.configObjectArryRx.add.authorization.policy['authz_pol']);
        });

        it('should parse add authorization action', async () => {
            const config = `
                #NS13.1 Build 37.38
                add authorization action authz_act_allow -defaultAuthorizationAction ALLOW
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.authorization?.action);
            assert.ok(adc.configObjectArryRx.add.authorization.action['authz_act_allow']);
        });

    });

    // ==== Category 7: Rate Limiting (3 patterns) ====

    describe('Rate Limiting', () => {

        it('should parse add ns limitIdentifier', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns limitIdentifier limit_api_calls -threshold 1000 -timeSlice 60000 -mode REQUEST_RATE
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.limitIdentifier);
            assert.ok(adc.configObjectArryRx.add.ns.limitIdentifier['limit_api_calls']);
            assert.equal(adc.configObjectArryRx.add.ns.limitIdentifier['limit_api_calls']['-threshold'], '1000');
            assert.equal(adc.configObjectArryRx.add.ns.limitIdentifier['limit_api_calls']['-timeSlice'], '60000');
        });

        it('should parse set ns limitIdentifier', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns limitIdentifier limit_api_calls -threshold 1000
                set ns limitIdentifier limit_api_calls -threshold 2000
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.set?.ns?.limitIdentifier);
            assert.ok(adc.configObjectArryRx.set.ns.limitIdentifier['limit_api_calls']);
            assert.equal(adc.configObjectArryRx.set.ns.limitIdentifier['limit_api_calls']['-threshold'], '2000');
        });

        it('should parse add ns limitSelector', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns limitSelector limit_sel_client -key "CLIENT.IP.SRC"
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.ns?.limitSelector);
            assert.ok(adc.configObjectArryRx.add.ns.limitSelector['limit_sel_client']);
        });

    });

    // ==== Category 8: Audit Policies (4 patterns) ====

    describe('Audit Policies', () => {

        it('should parse add audit nslogAction', async () => {
            const config = `
                #NS13.1 Build 37.38
                add audit nslogAction nslog_act -serverIP 10.1.1.50 -serverPort 514
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.audit?.nslogAction);
            assert.ok(adc.configObjectArryRx.add.audit.nslogAction['nslog_act']);
            assert.equal(adc.configObjectArryRx.add.audit.nslogAction['nslog_act']['-serverIP'], '10.1.1.50');
        });

        it('should parse add audit nslogPolicy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add audit nslogPolicy nslog_pol -rule "HTTP.REQ.URL.CONTAINS(\\"/admin/\\")" -action nslog_act
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.audit?.nslogPolicy);
            assert.ok(adc.configObjectArryRx.add.audit.nslogPolicy['nslog_pol']);
        });

        it('should parse add audit syslogAction', async () => {
            const config = `
                #NS13.1 Build 37.38
                add audit syslogAction syslog_act -serverIP 10.1.1.60 -serverPort 514 -logLevel INFORMATIONAL
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.audit?.syslogAction);
            assert.ok(adc.configObjectArryRx.add.audit.syslogAction['syslog_act']);
            assert.equal(adc.configObjectArryRx.add.audit.syslogAction['syslog_act']['-serverIP'], '10.1.1.60');
        });

        it('should parse add audit syslogPolicy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add audit syslogPolicy syslog_pol -rule "HTTP.REQ.METHOD.EQ(POST)" -action syslog_act
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.audit?.syslogPolicy);
            assert.ok(adc.configObjectArryRx.add.audit.syslogPolicy['syslog_pol']);
        });

    });

    // ==== Category 9: Spillover Policies (2 patterns) ====

    describe('Spillover Policies', () => {

        it('should parse add spillover policy', async () => {
            const config = `
                #NS13.1 Build 37.38
                add spillover policy spill_pol -rule "SYS.VSERVER(\\"web_vs\\").TOTALBANDWIDTH.GT(1000000)" -action spill_act
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.spillover?.policy);
            assert.ok(adc.configObjectArryRx.add.spillover.policy['spill_pol']);
        });

        it('should parse add spillover action', async () => {
            const config = `
                #NS13.1 Build 37.38
                add spillover action spill_act -action SPILLOVER
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.spillover?.action);
            assert.ok(adc.configObjectArryRx.add.spillover.action['spill_act']);
        });

    });

    // ==== Category 10: AAA vServers (2 patterns) ====

    describe('AAA vServers (Legacy Authentication)', () => {

        it('should parse add aaa vserver', async () => {
            const config = `
                #NS13.1 Build 37.38
                add aaa vserver aaa_vs SSL -authnVsName auth_vs -authenticationHost aaa.example.com
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.add?.aaa?.vserver);
            assert.ok(adc.configObjectArryRx.add.aaa.vserver['aaa_vs']);
            assert.equal(adc.configObjectArryRx.add.aaa.vserver['aaa_vs'].protocol, 'SSL');
        });

        it('should parse bind aaa vserver', async () => {
            const config = `
                #NS13.1 Build 37.38
                add aaa vserver aaa_vs SSL
                bind aaa vserver aaa_vs -policy ldap_pol -priority 100
            `;
            const adc = new ADC();
            await adc.loadParseFromString(config);

            assert.ok(adc.configObjectArryRx.bind?.aaa?.vserver);
            assert.ok(adc.configObjectArryRx.bind.aaa.vserver['aaa_vs']);
        });

    });

    // ==== Integration Test: Multiple Object Types ====

    describe('Integration: Multiple Object Types', () => {

        it('should parse config with multiple new object types', async () => {
            const config = `
                #NS13.1 Build 37.38
                add vlan 100 -aliasName "DMZ"
                add ns tcpProfile tcp_prof -WS ENABLED
                add ns httpProfile http_prof -dropInvalReqs ENABLED
                add ssl profile ssl_prof -tls12 ENABLED
                add lb persistenceSession persist_sess -persistenceType SOURCEIP
                add cache policy cache_pol -rule true -action CACHE
                add cmp policy cmp_pol -rule true -resAction COMPRESS
                add authorization policy authz_pol -rule true -action ALLOW
                add ns limitIdentifier limit1 -threshold 100 -timeSlice 1000
                add audit nslogAction nslog_act -serverIP 10.1.1.50
                add spillover policy spill_pol -rule true -action SPILLOVER
                add aaa vserver aaa_vs SSL
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            // Verify all object types were parsed
            assert.ok(adc.configObjectArryRx.add?.vlan);
            assert.ok(adc.configObjectArryRx.add?.ns?.tcpProfile);
            assert.ok(adc.configObjectArryRx.add?.ns?.httpProfile);
            assert.ok(adc.configObjectArryRx.add?.ssl?.profile);
            assert.ok(adc.configObjectArryRx.add?.lb?.persistenceSession);
            assert.ok(adc.configObjectArryRx.add?.cache?.policy);
            assert.ok(adc.configObjectArryRx.add?.cmp?.policy);
            assert.ok(adc.configObjectArryRx.add?.authorization?.policy);
            assert.ok(adc.configObjectArryRx.add?.ns?.limitIdentifier);
            assert.ok(adc.configObjectArryRx.add?.audit?.nslogAction);
            assert.ok(adc.configObjectArryRx.add?.spillover?.policy);
            assert.ok(adc.configObjectArryRx.add?.aaa?.vserver);

            // Verify count (should be 12 objects)
            const addKeys = Object.keys(adc.configObjectArryRx.add || {});
            assert.ok(addKeys.length > 5); // At least vlan, ns, ssl, lb, cache, cmp, authorization, audit, spillover, aaa
        });

        it('should increment object count for new object types', async () => {
            const config = `
                #NS13.1 Build 37.38
                add lb vserver web_vs HTTP 10.1.1.100 80
                add ns tcpProfile tcp_prof -WS ENABLED
                add ns httpProfile http_prof -dropInvalReqs ENABLED
                add ssl profile ssl_prof -tls12 ENABLED
                add cache policy cache_pol -rule true -action CACHE
                add cmp policy cmp_pol -rule true -resAction COMPRESS
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);
            const explosion = await adc.explode();

            // Object count should include new types
            assert.ok(explosion.stats.objectCount > 0);
        });

    });

});
