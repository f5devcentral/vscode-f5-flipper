/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import assert from 'assert';
import { buildDeclaration } from '../src/as3/builders';
import { AdcApp } from '../src/models';

/**
 * AS3 Builders Tests
 *
 * Tests the new naming convention from AS3_NAMING_CONVENTION_SPEC.md:
 * Pattern: {app_name}_{protocol}{port}_{suffix}
 *
 * Examples:
 * - Tenant: t_web_app
 * - Application: web_app_http80
 * - Virtual Server: web_app_http80_vs
 * - Pool: web_app_http80_pool
 * - Monitor: web_app_http_mon
 */
describe('AS3 Builders Tests', function () {

    before(async function () {
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    // ========================================================================
    // Test Fixtures
    // ========================================================================

    const httpBasicApp: AdcApp = {
        name: 'web_app',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.100',
        port: '80',
        opts: {
            '-lbMethod': 'ROUNDROBIN',
            '-persistenceType': 'SOURCEIP',
            '-cltTimeout': '180',
        },
        bindings: {
            service: [
                { name: 'svc1', server: 'server1', address: '10.2.1.1', port: '8080', protocol: 'HTTP' },
                { name: 'svc2', server: 'server2', address: '10.2.1.2', port: '8080', protocol: 'HTTP' },
            ],
        },
    };

    const sslApp: AdcApp = {
        name: 'ssl_app',
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
                { name: 'ssl_svc', server: 'ssl_server', address: '10.2.1.3', port: '443', protocol: 'SSL' },
            ],
            certs: [
                { '-certKeyName': 'wildcard_cert' },
            ],
        },
    };

    const tcpApp: AdcApp = {
        name: 'tcp_app',
        type: 'lb',
        protocol: 'TCP',
        ipAddress: '10.1.1.102',
        port: '8080',
        opts: {},
    };

    const serviceGroupApp: AdcApp = {
        name: 'sg_app',
        type: 'lb',
        protocol: 'HTTP',
        ipAddress: '10.1.1.103',
        port: '80',
        opts: {
            '-lbMethod': 'ROUNDROBIN',
        },
        bindings: {
            serviceGroup: [
                {
                    name: 'web_sg',
                    servers: [
                        { name: 'web1', server: 'websvr1', address: '10.2.2.1', port: '80', protocol: 'HTTP' },
                        { name: 'web2', server: 'websvr2', address: '10.2.2.2', port: '80', protocol: 'HTTP' },
                        { name: 'web3', server: 'websvr3', address: '10.2.2.3', port: '80', protocol: 'HTTP' },
                    ],
                    monitors: [
                        { name: 'http_mon', type: 'HTTP' },
                    ],
                },
            ],
        },
    };

    // ========================================================================
    // Declaration Structure Tests
    // ========================================================================

    describe('Declaration Structure', function () {

        it('creates valid AS3 class', () => {
            const result = buildDeclaration(httpBasicApp, {});
            assert.strictEqual(result.class, 'AS3');
        });

        it('sets action to deploy', () => {
            const result = buildDeclaration(httpBasicApp, {});
            assert.strictEqual(result.action, 'deploy');
        });

        it('sets persist to true', () => {
            const result = buildDeclaration(httpBasicApp, {});
            assert.strictEqual(result.persist, true);
        });

        it('creates ADC declaration', () => {
            const result = buildDeclaration(httpBasicApp, {});
            assert.strictEqual(result.declaration.class, 'ADC');
        });

        it('uses specified schema version', () => {
            const result = buildDeclaration(httpBasicApp, { schemaVersion: '3.45.0' });
            assert.strictEqual(result.declaration.schemaVersion, '3.45.0');
        });

        it('defaults to schema version 3.50.0', () => {
            const result = buildDeclaration(httpBasicApp, {});
            assert.strictEqual(result.declaration.schemaVersion, '3.50.0');
        });

        it('creates tenant with prefix', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            assert.ok(result.declaration['t_web_app'], 'Tenant should exist');
            assert.strictEqual(result.declaration['t_web_app'].class, 'Tenant');
        });

        it('creates application with protocol and port in name', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const tenant = result.declaration['t_web_app'];
            // New naming: web_app_http80 (app_name + protocol + port)
            assert.ok(tenant['web_app_http80'], 'Application should exist with new naming');
            assert.strictEqual(tenant['web_app_http80'].class, 'Application');
        });

        it('does not include template property (uses implicit generic)', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const app = result.declaration['t_web_app']['web_app_http80'];
            assert.strictEqual(app.template, undefined, 'Should not have template property');
        });

        it('uses _vs suffix for service name', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const app = result.declaration['t_web_app']['web_app_http80'];
            // New naming: web_app_http80_vs
            assert.ok(app['web_app_http80_vs'], 'Should have web_app_http80_vs service');
            assert.ok(!app['serviceMain'], 'Should not have serviceMain');
        });
    });

    // ========================================================================
    // Service Builder Tests
    // ========================================================================

    describe('Service Builder', function () {

        it('uses Service_HTTP for HTTP protocol', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.strictEqual(service.class, 'Service_HTTP');
        });

        it('uses Service_HTTPS for SSL protocol', () => {
            const result = buildDeclaration(sslApp, { tenantPrefix: 't' });
            const service = result.declaration['t_ssl_app']['ssl_app_ssl443']['ssl_app_ssl443_vs'];
            assert.strictEqual(service.class, 'Service_HTTPS');
        });

        it('uses Service_TCP for TCP protocol', () => {
            const result = buildDeclaration(tcpApp, { tenantPrefix: 't' });
            const service = result.declaration['t_tcp_app']['tcp_app_tcp8080']['tcp_app_tcp8080_vs'];
            assert.strictEqual(service.class, 'Service_TCP');
        });

        it('sets virtual address', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.deepStrictEqual(service.virtualAddresses, ['10.1.1.100']);
        });

        it('sets virtual port', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.strictEqual(service.virtualPort, 80);
        });

        it('maps LB method ROUNDROBIN to round-robin', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.strictEqual(service.loadBalancingMode, 'round-robin');
        });

        it('maps LB method LEASTCONNECTION to least-connections-member', () => {
            const result = buildDeclaration(sslApp, { tenantPrefix: 't' });
            const service = result.declaration['t_ssl_app']['ssl_app_ssl443']['ssl_app_ssl443_vs'];
            assert.strictEqual(service.loadBalancingMode, 'least-connections-member');
        });

        it('maps persistence SOURCEIP to source-address', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.deepStrictEqual(service.persistenceMethods, ['source-address']);
        });

        it('maps persistence SSLSESSION to tls-session-id', () => {
            const result = buildDeclaration(sslApp, { tenantPrefix: 't' });
            const service = result.declaration['t_ssl_app']['ssl_app_ssl443']['ssl_app_ssl443_vs'];
            assert.deepStrictEqual(service.persistenceMethods, ['tls-session-id']);
        });

        it('sets idle timeout from cltTimeout', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            assert.strictEqual(service.idleTimeout, 180);
        });

        it('references pool with new naming', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const service = result.declaration['t_web_app']['web_app_http80']['web_app_http80_vs'];
            // New naming: web_app_http80_pool
            assert.strictEqual(service.pool, 'web_app_http80_pool');
        });

        it('includes serverTLS reference for HTTPS services', () => {
            const result = buildDeclaration(sslApp, { tenantPrefix: 't' });
            const service = result.declaration['t_ssl_app']['ssl_app_ssl443']['ssl_app_ssl443_vs'];
            // serverTLS is now a string reference to a TLS_Server object in the Application
            assert.ok(service.serverTLS, 'Should have serverTLS');
            assert.strictEqual(typeof service.serverTLS, 'string', 'serverTLS should be a string reference');
            assert.strictEqual(service.serverTLS, 'ssl_app_tls', 'Should reference the TLS_Server object');
        });
    });

    // ========================================================================
    // Pool Builder Tests
    // ========================================================================

    describe('Pool Builder', function () {

        it('creates pool with new naming when service bindings exist', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const app = result.declaration['t_web_app']['web_app_http80'];
            // New naming: web_app_http80_pool
            assert.ok(app['web_app_http80_pool'], 'Pool should exist');
            assert.strictEqual(app['web_app_http80_pool'].class, 'Pool');
        });

        it('creates pool when serviceGroup bindings exist', () => {
            const result = buildDeclaration(serviceGroupApp, { tenantPrefix: 't' });
            const app = result.declaration['t_sg_app']['sg_app_http80'];
            assert.ok(app['sg_app_http80_pool'], 'Pool should exist');
        });

        it('does not create pool when no members', () => {
            const result = buildDeclaration(tcpApp, { tenantPrefix: 't' });
            const app = result.declaration['t_tcp_app']['tcp_app_tcp8080'];
            assert.ok(!app['tcp_app_tcp8080_pool'], 'Pool should not exist');
        });

        it('includes pool members from service bindings', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_web_app']['web_app_http80']['web_app_http80_pool'];
            assert.strictEqual(pool.members.length, 2);
        });

        it('includes pool members from serviceGroup', () => {
            const result = buildDeclaration(serviceGroupApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_sg_app']['sg_app_http80']['sg_app_http80_pool'];
            assert.strictEqual(pool.members.length, 3);
        });

        it('sets member serverAddresses', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_web_app']['web_app_http80']['web_app_http80_pool'];
            assert.deepStrictEqual(pool.members[0].serverAddresses, ['10.2.1.1']);
        });

        it('sets member servicePort', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_web_app']['web_app_http80']['web_app_http80_pool'];
            assert.strictEqual(pool.members[0].servicePort, 8080);
        });

        it('sets loadBalancingMode on pool', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_web_app']['web_app_http80']['web_app_http80_pool'];
            assert.strictEqual(pool.loadBalancingMode, 'round-robin');
        });

        it('includes monitor references', () => {
            const result = buildDeclaration(serviceGroupApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_sg_app']['sg_app_http80']['sg_app_http80_pool'];
            assert.ok(pool.monitors, 'Pool should have monitors');
            assert.ok(pool.monitors.length > 0, 'Should have at least one monitor');
        });
    });

    // ========================================================================
    // Monitor Builder Tests
    // ========================================================================

    describe('Monitor Builder', function () {

        it('creates monitor with _mon suffix', () => {
            const result = buildDeclaration(serviceGroupApp, { tenantPrefix: 't' });
            const app = result.declaration['t_sg_app']['sg_app_http80'];
            // Find the monitor - should end with _mon
            const monitorKey = Object.keys(app).find(k => k.endsWith('_mon'));
            assert.ok(monitorKey, 'Monitor should exist with _mon suffix');
            assert.strictEqual(app[monitorKey].class, 'Monitor');
        });

        it('sets monitorType based on NS type', () => {
            const result = buildDeclaration(serviceGroupApp, { tenantPrefix: 't' });
            const app = result.declaration['t_sg_app']['sg_app_http80'];
            const monitorKey = Object.keys(app).find(k => k.endsWith('_mon'));
            assert.strictEqual(app[monitorKey!].monitorType, 'http');
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================

    describe('Edge Cases', function () {

        it('handles wildcard port (omits port from name)', () => {
            const wildcardApp: AdcApp = {
                name: 'wildcard',
                type: 'lb',
                protocol: 'TCP',
                ipAddress: '10.1.1.1',
                port: '*',
                opts: {},
            };
            const result = buildDeclaration(wildcardApp, { tenantPrefix: 't' });
            // Wildcard port: name is wildcard_tcp (no port number)
            const tenant = result.declaration['t_wildcard'];
            assert.ok(tenant['wildcard_tcp'], 'Application should omit port for wildcard');
            const service = tenant['wildcard_tcp']['wildcard_tcp_vs'];
            assert.strictEqual(service.virtualPort, 0);
        });

        it('handles missing ipAddress', () => {
            const noIpApp: AdcApp = {
                name: 'noip',
                type: 'lb',
                protocol: 'HTTP',
                port: '80',
                opts: {},
            };
            const result = buildDeclaration(noIpApp, { tenantPrefix: 't' });
            const service = result.declaration['t_noip']['noip_http80']['noip_http80_vs'];
            assert.deepStrictEqual(service.virtualAddresses, ['0.0.0.0']);
        });

        it('handles app name with spaces', () => {
            const spacedApp: AdcApp = {
                name: 'my web app',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = buildDeclaration(spacedApp, { tenantPrefix: 't' });
            assert.ok(result.declaration['t_my_web_app'], 'Tenant should have sanitized name');
        });

        it('handles app name with special characters', () => {
            const specialApp: AdcApp = {
                name: 'app.domain.com',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = buildDeclaration(specialApp, { tenantPrefix: 't' });
            assert.ok(result.declaration['t_app_domain_com'], 'Tenant should have sanitized name');
        });

        it('handles app name with hyphens (converts to underscores)', () => {
            const hyphenApp: AdcApp = {
                name: 'my-web-app',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
            };
            const result = buildDeclaration(hyphenApp, { tenantPrefix: 't' });
            // Hyphens converted to underscores per spec
            assert.ok(result.declaration['t_my_web_app'], 'Tenant should convert hyphens to underscores');
        });

        it('handles disabled pool members', () => {
            const disabledApp: AdcApp = {
                name: 'disabled_test',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
                bindings: {
                    service: [
                        { name: 'svc', server: 'svr1', address: '10.2.1.1', port: '80', protocol: 'HTTP', opts: { '-state': 'DISABLED' } },
                    ],
                },
            };
            const result = buildDeclaration(disabledApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_disabled_test']['disabled_test_http80']['disabled_test_http80_pool'];
            assert.strictEqual(pool.members[0].enable, false);
        });

        it('handles FQDN pool members', () => {
            const fqdnApp: AdcApp = {
                name: 'fqdn_test',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80',
                opts: {},
                bindings: {
                    service: [
                        { name: 'svc', server: 'svr1', hostname: 'server.example.com', port: '80', protocol: 'HTTP' },
                    ],
                },
            };
            const result = buildDeclaration(fqdnApp, { tenantPrefix: 't' });
            const pool = result.declaration['t_fqdn_test']['fqdn_test_http80']['fqdn_test_http80_pool'];
            assert.strictEqual(pool.members[0].addressDiscovery, 'fqdn');
            assert.strictEqual(pool.members[0].hostname, 'server.example.com');
        });
    });

    // ========================================================================
    // Naming Options Tests
    // ========================================================================

    describe('Naming Options', function () {

        it('supports custom tenant prefix via namingOptions', () => {
            const result = buildDeclaration(httpBasicApp, {
                namingOptions: { tenantPrefix: 'prod' }
            });
            assert.ok(result.declaration['prod_web_app'], 'Should use custom tenant prefix');
        });

        it('supports legacy tenantPrefix option for backward compatibility', () => {
            const result = buildDeclaration(httpBasicApp, { tenantPrefix: 'ns' });
            assert.ok(result.declaration['ns_web_app'], 'Should use legacy tenantPrefix');
        });

        it('can disable protocol in names', () => {
            const result = buildDeclaration(httpBasicApp, {
                namingOptions: { includeProtocol: false, includePort: false }
            });
            const tenant = result.declaration['t_web_app'];
            // With protocol disabled, name is just web_app
            assert.ok(tenant['web_app'], 'Application should not include protocol');
        });

        it('uses default naming when no options provided', () => {
            const result = buildDeclaration(httpBasicApp, {});
            // Default tenant prefix is 't'
            assert.ok(result.declaration['t_web_app'], 'Should use default tenant prefix');
            const tenant = result.declaration['t_web_app'];
            assert.ok(tenant['web_app_http80'], 'Should use default naming pattern');
        });
    });
});
