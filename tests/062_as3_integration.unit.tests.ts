/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import assert from 'assert';
import { buildAS3, buildAS3Bulk } from '../src/as3';
import { AdcApp } from '../src/models';

/**
 * AS3 Conversion Integration Tests
 *
 * Tests the full conversion pipeline with the new naming convention:
 * Pattern: {app_name}_{protocol}{port}_{suffix}
 *
 * Examples:
 * - Tenant: t_web_frontend
 * - Application: web_frontend_http80
 * - Virtual Server: web_frontend_http80_vs
 * - Pool: web_frontend_http80_pool
 * - Monitor: web_frontend_http_mon
 */
describe('AS3 Conversion Integration Tests', function () {

    before(async function () {
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    // ========================================================================
    // Test Fixtures
    // ========================================================================

    const httpApp: AdcApp = {
        name: 'web_frontend',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.100',
        port: '80',
        opts: {
            '-lbMethod': 'ROUNDROBIN',
            '-persistenceType': 'COOKIEINSERT',
            '-cltTimeout': '180',
        },
        bindings: {
            service: [
                { name: 'web1', server: 'svr1', address: '10.2.1.1', port: '8080', protocol: 'HTTP' },
                { name: 'web2', server: 'svr2', address: '10.2.1.2', port: '8080', protocol: 'HTTP' },
            ],
        },
    };

    const sslApp: AdcApp = {
        name: 'secure_app',
        type: 'lb',
        protocol: 'SSL',
        ipAddress: '10.1.1.101',
        port: '443',
        opts: {
            '-lbMethod': 'LEASTCONNECTION',
            '-persistenceType': 'SSLSESSION',
        },
        bindings: {
            service: [
                { name: 'ssl1', server: 'sslsvr', address: '10.2.1.3', port: '443', protocol: 'SSL' },
            ],
            certs: [
                { '-certKeyName': 'wildcard' },
            ],
        },
    };

    const tcpApp: AdcApp = {
        name: 'tcp_service',
        type: 'lb',
        protocol: 'TCP',
        ipAddress: '10.1.1.102',
        port: '3306',
        opts: {
            '-lbMethod': 'LEASTCONNECTION',
        },
        bindings: {
            service: [
                { name: 'db1', server: 'dbsvr1', address: '10.2.1.4', port: '3306', protocol: 'TCP' },
                { name: 'db2', server: 'dbsvr2', address: '10.2.1.5', port: '3306', protocol: 'TCP' },
            ],
        },
    };

    const gslbApp: AdcApp = {
        name: 'global_app',
        type: 'gslb',
        protocol: 'HTTP',
        ipAddress: '0.0.0.0',
        port: '80',
        opts: {},
    };

    // Helper to find objects with new naming convention (suffix-based)
    const findVirtualServer = (app: any) => Object.keys(app).find(k => k.endsWith('_vs'));
    const findPool = (app: any) => Object.keys(app).find(k => k.endsWith('_pool'));
    const findMonitor = (app: any) => Object.keys(app).find(k => k.endsWith('_mon'));

    // ========================================================================
    // buildAS3 Tests
    // ========================================================================

    describe('buildAS3', function () {

        it('returns success for valid HTTP app', () => {
            const result = buildAS3(httpApp);
            assert.strictEqual(result.success, true);
            assert.ok(result.as3, 'Should have AS3 output');
        });

        it('returns success for valid SSL app', () => {
            const result = buildAS3(sslApp);
            assert.strictEqual(result.success, true);
        });

        it('returns success for valid TCP app', () => {
            const result = buildAS3(tcpApp);
            assert.strictEqual(result.success, true);
        });

        it('returns app name in result', () => {
            const result = buildAS3(httpApp);
            assert.strictEqual(result.app, 'web_frontend');
        });

        it('returns failure for GSLB apps (not yet supported)', () => {
            const result = buildAS3(gslbApp);
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('GSLB'), 'Should mention GSLB');
        });

        it('returns failure for invalid app (missing name)', () => {
            const invalidApp = { type: 'lb', protocol: 'HTTP' } as AdcApp;
            const result = buildAS3(invalidApp);
            assert.strictEqual(result.success, false);
        });

        it('produces valid AS3 declaration structure', () => {
            const result = buildAS3(httpApp);
            assert.strictEqual(result.as3?.class, 'AS3');
            assert.strictEqual(result.as3?.declaration.class, 'ADC');
        });

        it('uses default schema version 3.50.0', () => {
            const result = buildAS3(httpApp);
            assert.strictEqual(result.as3?.declaration.schemaVersion, '3.50.0');
        });

        it('respects custom schema version', () => {
            const result = buildAS3(httpApp, { schemaVersion: '3.45.0' });
            assert.strictEqual(result.as3?.declaration.schemaVersion, '3.45.0');
        });

        it('creates tenant with correct structure', () => {
            const result = buildAS3(httpApp);
            const tenantKey = Object.keys(result.as3!.declaration).find(
                k => k.startsWith('t_')
            );
            assert.ok(tenantKey, 'Should have tenant with t_ prefix');
            assert.strictEqual(result.as3!.declaration[tenantKey].class, 'Tenant');
        });

        it('creates application with protocol+port in name', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            // New naming: web_frontend_http80
            const appKey = Object.keys(tenant).find(k => k.includes('_http80'));
            assert.ok(appKey, 'Application should have protocol+port in name');
            assert.strictEqual(tenant[appKey].class, 'Application');
        });

        it('creates virtual server with _vs suffix', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const vsKey = findVirtualServer(app);
            assert.ok(vsKey, 'Should have virtual server with _vs suffix');
            assert.ok(vsKey!.endsWith('_vs'), 'VS key should end with _vs');
        });

        it('maps HTTP to Service_HTTP', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const vsKey = findVirtualServer(app);
            assert.strictEqual(app[vsKey!].class, 'Service_HTTP');
        });

        it('maps SSL to Service_HTTPS', () => {
            const result = buildAS3(sslApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const vsKey = findVirtualServer(app);
            assert.strictEqual(app[vsKey!].class, 'Service_HTTPS');
        });

        it('maps TCP to Service_TCP', () => {
            const result = buildAS3(tcpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const vsKey = findVirtualServer(app);
            assert.strictEqual(app[vsKey!].class, 'Service_TCP');
        });

        it('includes pool with _pool suffix when members exist', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const poolKey = findPool(app);
            assert.ok(poolKey, 'Should have pool with _pool suffix');
            assert.strictEqual(app[poolKey!].class, 'Pool');
        });
    });

    // ========================================================================
    // buildAS3Bulk Tests
    // ========================================================================

    describe('buildAS3Bulk', function () {

        it('converts multiple apps', () => {
            const result = buildAS3Bulk([httpApp, sslApp, tcpApp]);
            assert.strictEqual(result.summary.total, 3);
            assert.strictEqual(result.summary.succeeded, 3);
        });

        it('returns individual results', () => {
            const result = buildAS3Bulk([httpApp, sslApp]);
            assert.strictEqual(result.results.length, 2);
        });

        it('produces merged declaration', () => {
            const result = buildAS3Bulk([httpApp, sslApp]);
            assert.ok(result.merged, 'Should have merged declaration');
            assert.strictEqual(result.merged?.class, 'AS3');
        });

        it('merged declaration contains all tenants', () => {
            const result = buildAS3Bulk([httpApp, sslApp, tcpApp]);
            const tenantCount = Object.keys(result.merged!.declaration).filter(
                k => k.startsWith('t_')
            ).length;
            assert.strictEqual(tenantCount, 3);
        });

        it('handles partial failures', () => {
            const result = buildAS3Bulk([httpApp, gslbApp, tcpApp]);
            assert.strictEqual(result.summary.total, 3);
            assert.strictEqual(result.summary.succeeded, 2);
            assert.strictEqual(result.summary.failed, 1);
        });

        it('still produces merged output on partial failure', () => {
            const result = buildAS3Bulk([httpApp, gslbApp, tcpApp]);
            assert.ok(result.merged, 'Should still have merged output');
            const tenantCount = Object.keys(result.merged!.declaration).filter(
                k => k.startsWith('t_')
            ).length;
            assert.strictEqual(tenantCount, 2); // Only 2 succeeded
        });

        it('handles empty array', () => {
            const result = buildAS3Bulk([]);
            assert.strictEqual(result.summary.total, 0);
            assert.strictEqual(result.summary.succeeded, 0);
            assert.ok(!result.merged, 'Should not have merged output');
        });

        it('handles all failures', () => {
            const result = buildAS3Bulk([gslbApp]);
            assert.strictEqual(result.summary.failed, 1);
            assert.ok(!result.merged, 'Should not have merged output');
        });

        it('uses bulk ID in merged declaration', () => {
            const result = buildAS3Bulk([httpApp, sslApp]);
            assert.ok(result.merged?.declaration.id?.includes('bulk'), 'ID should indicate bulk');
        });
    });

    // ========================================================================
    // Real-world Scenarios
    // ========================================================================

    describe('Real-world Scenarios', function () {

        it('handles complex app with serviceGroup', () => {
            const complexApp: AdcApp = {
                name: 'production_web',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '192.168.1.100',
                port: '80',
                opts: {
                    '-lbMethod': 'LEASTRESPONSETIME',
                    '-persistenceType': 'COOKIEINSERT',
                    '-cltTimeout': '300',
                    '-comment': 'Production web tier',
                },
                bindings: {
                    serviceGroup: [
                        {
                            name: 'prod_sg',
                            servers: [
                                { name: 'web01', server: 'websvr01', address: '10.10.1.1', port: '8080', protocol: 'HTTP' },
                                { name: 'web02', server: 'websvr02', address: '10.10.1.2', port: '8080', protocol: 'HTTP' },
                                { name: 'web03', server: 'websvr03', address: '10.10.1.3', port: '8080', protocol: 'HTTP' },
                                { name: 'web04', server: 'websvr04', address: '10.10.1.4', port: '8080', protocol: 'HTTP' },
                            ],
                            monitors: [
                                { name: 'http_health', type: 'HTTP', '-httpRequest': 'GET /health' },
                            ],
                        },
                    ],
                },
            };

            const result = buildAS3(complexApp);
            assert.strictEqual(result.success, true);

            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;

            // Check LB method
            const vsKey = findVirtualServer(app);
            assert.strictEqual(app[vsKey!].loadBalancingMode, 'fastest-app-response');

            // Check pool has 4 members
            const poolKey = findPool(app);
            assert.strictEqual(app[poolKey!].members.length, 4);

            // Check monitor exists with _mon suffix
            const monitorKey = findMonitor(app);
            assert.ok(monitorKey, 'Should have monitor with _mon suffix');
        });

        it('handles mixed service and serviceGroup bindings', () => {
            const mixedApp: AdcApp = {
                name: 'mixed_app',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
                bindings: {
                    service: [
                        { name: 'svc1', server: 'svr1', address: '10.2.1.1', port: '80', protocol: 'HTTP' },
                    ],
                    serviceGroup: [
                        {
                            name: 'sg1',
                            servers: [
                                { name: 'sg_svc1', server: 'sgsvr1', address: '10.2.2.1', port: '80', protocol: 'HTTP' },
                            ],
                            monitors: [],
                        },
                    ],
                },
            };

            const result = buildAS3(mixedApp);
            assert.strictEqual(result.success, true);

            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const poolKey = findPool(app);

            // Should have 2 members (1 from service, 1 from serviceGroup)
            assert.strictEqual(app[poolKey!].members.length, 2);
        });

        it('handles CS vserver type', () => {
            const csApp: AdcApp = {
                name: 'content_switch',
                type: 'cs',
                protocol: 'HTTP',
                ipAddress: '10.1.1.200',
                port: '80',
                opts: {
                    '-cltTimeout': '180',
                },
            };

            const result = buildAS3(csApp);
            assert.strictEqual(result.success, true);
        });
    });

    // ========================================================================
    // AS3 Output Validation
    // ========================================================================

    describe('AS3 Output Validation', function () {

        it('output is valid JSON', () => {
            const result = buildAS3(httpApp);
            const jsonString = JSON.stringify(result.as3);
            assert.doesNotThrow(() => JSON.parse(jsonString));
        });

        it('all required AS3 fields are present', () => {
            const result = buildAS3(httpApp);
            assert.strictEqual(result.as3?.class, 'AS3');
            assert.strictEqual(result.as3?.declaration.class, 'ADC');
            assert.ok(result.as3?.declaration.schemaVersion);
        });

        it('service has required fields', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const vsKey = findVirtualServer(app);
            const service = app[vsKey!];

            assert.ok(service.class);
            assert.ok(service.virtualAddresses);
            assert.ok(typeof service.virtualPort === 'number');
        });

        it('pool members have required fields', () => {
            const result = buildAS3(httpApp);
            const tenant = Object.values(result.as3!.declaration).find(
                (v: any) => v?.class === 'Tenant'
            ) as any;
            const app = Object.values(tenant).find(
                (v: any) => v?.class === 'Application'
            ) as any;
            const poolKey = findPool(app);
            const member = app[poolKey!].members[0];

            assert.ok(member.serverAddresses || member.hostname);
            assert.ok(typeof member.servicePort === 'number');
        });
    });

    // ========================================================================
    // Naming Convention Verification
    // ========================================================================

    describe('Naming Convention Verification', function () {

        it('tenant uses t_ prefix', () => {
            const result = buildAS3(httpApp);
            assert.ok(result.as3!.declaration['t_web_frontend'], 'Tenant should use t_ prefix');
        });

        it('application includes protocol and port', () => {
            const result = buildAS3(httpApp);
            const tenant = result.as3!.declaration['t_web_frontend'];
            assert.ok(tenant['web_frontend_http80'], 'Application should include http80');
        });

        it('virtual server uses _vs suffix', () => {
            const result = buildAS3(httpApp);
            const tenant = result.as3!.declaration['t_web_frontend'];
            const app = tenant['web_frontend_http80'];
            assert.ok(app['web_frontend_http80_vs'], 'VS should use _vs suffix');
        });

        it('pool uses _pool suffix', () => {
            const result = buildAS3(httpApp);
            const tenant = result.as3!.declaration['t_web_frontend'];
            const app = tenant['web_frontend_http80'];
            assert.ok(app['web_frontend_http80_pool'], 'Pool should use _pool suffix');
        });

        it('hyphens in app names are converted to underscores', () => {
            const hyphenApp: AdcApp = {
                name: 'my-web-app',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = buildAS3(hyphenApp);
            // my-web-app becomes my_web_app
            assert.ok(result.as3!.declaration['t_my_web_app'], 'Hyphens should become underscores');
        });

        it('special characters in app names are sanitized', () => {
            const specialApp: AdcApp = {
                name: 'app.domain.com',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = buildAS3(specialApp);
            // app.domain.com becomes app_domain_com
            assert.ok(result.as3!.declaration['t_app_domain_com'], 'Special chars should be sanitized');
        });

        it('wildcard port omits port number from name', () => {
            const wildcardApp: AdcApp = {
                name: 'forwarder',
                type: 'lb',
                protocol: 'TCP',
                ipAddress: '0.0.0.0',
                port: '*',
                opts: {},
            };
            const result = buildAS3(wildcardApp);
            const tenant = result.as3!.declaration['t_forwarder'];
            // Wildcard port: forwarder_tcp (no port number)
            assert.ok(tenant['forwarder_tcp'], 'Wildcard port should omit port number');
            assert.ok(tenant['forwarder_tcp']['forwarder_tcp_vs'], 'VS should follow same pattern');
        });
    });
});
