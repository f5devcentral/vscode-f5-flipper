/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import assert from 'assert';
import {
    getLbMethod,
    getPersistence,
    getServiceClass,
    getMonitorType,
    sanitizeName,
    isIgnorable,
    LB_METHODS,
    PERSISTENCE_TYPES,
    SERVICE_CLASSES,
    MONITOR_TYPES,
} from '../src/as3/mappings';

describe('AS3 Mappings Tests', function () {

    before(async function () {
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);
    });

    // ========================================================================
    // LB Methods
    // ========================================================================

    describe('LB Methods', function () {

        it('maps ROUNDROBIN to round-robin', () => {
            assert.strictEqual(getLbMethod('ROUNDROBIN'), 'round-robin');
        });

        it('maps LEASTCONNECTION to least-connections-member', () => {
            assert.strictEqual(getLbMethod('LEASTCONNECTION'), 'least-connections-member');
        });

        it('maps LEASTCONNECTIONS (alias) to least-connections-member', () => {
            assert.strictEqual(getLbMethod('LEASTCONNECTIONS'), 'least-connections-member');
        });

        it('maps LEASTRESPONSETIME to fastest-app-response', () => {
            assert.strictEqual(getLbMethod('LEASTRESPONSETIME'), 'fastest-app-response');
        });

        it('maps LRTM to fastest-app-response', () => {
            assert.strictEqual(getLbMethod('LRTM'), 'fastest-app-response');
        });

        it('maps SOURCEIPHASH to least-connections-member (use persistence instead)', () => {
            assert.strictEqual(getLbMethod('SOURCEIPHASH'), 'least-connections-member');
        });

        it('defaults to round-robin for unknown methods', () => {
            assert.strictEqual(getLbMethod('UNKNOWN_METHOD'), 'round-robin');
        });

        it('defaults to round-robin for undefined', () => {
            assert.strictEqual(getLbMethod(undefined), 'round-robin');
        });

        it('handles case insensitivity', () => {
            assert.strictEqual(getLbMethod('roundrobin'), 'round-robin');
            assert.strictEqual(getLbMethod('RoundRobin'), 'round-robin');
            assert.strictEqual(getLbMethod('ROUNDROBIN'), 'round-robin');
        });

        it('has mappings for all common NS methods', () => {
            const methods = [
                'ROUNDROBIN', 'LEASTCONNECTION', 'LEASTRESPONSETIME',
                'LEASTBANDWIDTH', 'LEASTPACKETS', 'URLHASH', 'DOMAINHASH',
                'SOURCEIPHASH', 'DESTINATIONIPHASH', 'LRTM'
            ];
            for (const method of methods) {
                assert.ok(LB_METHODS[method], `Missing mapping for ${method}`);
            }
        });
    });

    // ========================================================================
    // Persistence Types
    // ========================================================================

    describe('Persistence Types', function () {

        it('maps SOURCEIP to source-address', () => {
            assert.strictEqual(getPersistence('SOURCEIP'), 'source-address');
        });

        it('maps COOKIEINSERT to cookie', () => {
            assert.strictEqual(getPersistence('COOKIEINSERT'), 'cookie');
        });

        it('maps SSLSESSION to ssl', () => {
            assert.strictEqual(getPersistence('SSLSESSION'), 'ssl');
        });

        it('maps RULE to universal (requires iRule)', () => {
            assert.strictEqual(getPersistence('RULE'), 'universal');
        });

        it('maps DESTIP to destination-address', () => {
            assert.strictEqual(getPersistence('DESTIP'), 'destination-address');
        });

        it('maps CALLID to sip', () => {
            assert.strictEqual(getPersistence('CALLID'), 'sip');
        });

        it('maps NONE to null', () => {
            assert.strictEqual(getPersistence('NONE'), null);
        });

        it('returns null for undefined', () => {
            assert.strictEqual(getPersistence(undefined), null);
        });

        it('returns null for unknown types', () => {
            assert.strictEqual(getPersistence('UNKNOWN_TYPE'), null);
        });

        it('handles case insensitivity', () => {
            assert.strictEqual(getPersistence('sourceip'), 'source-address');
            assert.strictEqual(getPersistence('SourceIP'), 'source-address');
        });
    });

    // ========================================================================
    // Service Classes
    // ========================================================================

    describe('Service Classes', function () {

        it('maps HTTP to Service_HTTP', () => {
            assert.strictEqual(getServiceClass('HTTP'), 'Service_HTTP');
        });

        it('maps SSL to Service_HTTPS', () => {
            assert.strictEqual(getServiceClass('SSL'), 'Service_HTTPS');
        });

        it('maps TCP to Service_TCP', () => {
            assert.strictEqual(getServiceClass('TCP'), 'Service_TCP');
        });

        it('maps UDP to Service_UDP', () => {
            assert.strictEqual(getServiceClass('UDP'), 'Service_UDP');
        });

        it('maps SSL_BRIDGE to Service_TCP (pass-through)', () => {
            assert.strictEqual(getServiceClass('SSL_BRIDGE'), 'Service_TCP');
        });

        it('maps SSL_TCP to Service_TCP', () => {
            assert.strictEqual(getServiceClass('SSL_TCP'), 'Service_TCP');
        });

        it('maps DNS to Service_UDP', () => {
            assert.strictEqual(getServiceClass('DNS'), 'Service_UDP');
        });

        it('maps DNS_TCP to Service_TCP', () => {
            assert.strictEqual(getServiceClass('DNS_TCP'), 'Service_TCP');
        });

        it('maps ANY to Service_L4', () => {
            assert.strictEqual(getServiceClass('ANY'), 'Service_L4');
        });

        it('maps RADIUS to Service_UDP', () => {
            assert.strictEqual(getServiceClass('RADIUS'), 'Service_UDP');
        });

        it('defaults to Service_TCP for unknown protocols', () => {
            assert.strictEqual(getServiceClass('UNKNOWN'), 'Service_TCP');
        });

        it('defaults to Service_TCP for undefined', () => {
            assert.strictEqual(getServiceClass(undefined), 'Service_TCP');
        });

        it('handles case insensitivity', () => {
            assert.strictEqual(getServiceClass('http'), 'Service_HTTP');
            assert.strictEqual(getServiceClass('Http'), 'Service_HTTP');
        });
    });

    // ========================================================================
    // Monitor Types
    // ========================================================================

    describe('Monitor Types', function () {

        it('maps HTTP to http', () => {
            assert.strictEqual(getMonitorType('HTTP'), 'http');
        });

        it('maps HTTP-ECV to http', () => {
            assert.strictEqual(getMonitorType('HTTP-ECV'), 'http');
        });

        it('maps HTTPS to https', () => {
            assert.strictEqual(getMonitorType('HTTPS'), 'https');
        });

        it('maps TCP to tcp', () => {
            assert.strictEqual(getMonitorType('TCP'), 'tcp');
        });

        it('maps TCP-ECV to tcp', () => {
            assert.strictEqual(getMonitorType('TCP-ECV'), 'tcp');
        });

        it('maps PING to icmp', () => {
            assert.strictEqual(getMonitorType('PING'), 'icmp');
        });

        it('maps DNS to dns', () => {
            assert.strictEqual(getMonitorType('DNS'), 'dns');
        });

        it('maps LDAP to ldap', () => {
            assert.strictEqual(getMonitorType('LDAP'), 'ldap');
        });

        it('maps RADIUS to radius', () => {
            assert.strictEqual(getMonitorType('RADIUS'), 'radius');
        });

        it('maps MYSQL to mysql', () => {
            assert.strictEqual(getMonitorType('MYSQL'), 'mysql');
        });

        it('maps MSSQL to external (requires script)', () => {
            assert.strictEqual(getMonitorType('MSSQL'), 'external');
        });

        it('maps ORACLE to external (requires script)', () => {
            assert.strictEqual(getMonitorType('ORACLE'), 'external');
        });

        it('maps USER to external', () => {
            assert.strictEqual(getMonitorType('USER'), 'external');
        });

        it('defaults to tcp for unknown types', () => {
            assert.strictEqual(getMonitorType('UNKNOWN'), 'tcp');
        });

        it('defaults to tcp for undefined', () => {
            assert.strictEqual(getMonitorType(undefined), 'tcp');
        });
    });

    // ========================================================================
    // Name Sanitization
    // ========================================================================

    describe('sanitizeName', function () {

        it('passes through simple names', () => {
            assert.strictEqual(sanitizeName('web_app'), 'web_app');
        });

        it('replaces spaces with underscores', () => {
            assert.strictEqual(sanitizeName('web app'), 'web_app');
        });

        it('removes surrounding quotes', () => {
            assert.strictEqual(sanitizeName('"quoted_name"'), 'quoted_name');
            assert.strictEqual(sanitizeName("'single_quoted'"), 'single_quoted');
        });

        it('replaces special characters with underscores', () => {
            assert.strictEqual(sanitizeName('web.app.com'), 'web_app_com');
            assert.strictEqual(sanitizeName('app@domain'), 'app_domain');
        });

        it('handles names starting with numbers', () => {
            const result = sanitizeName('123app');
            assert.ok(!result.match(/^[0-9]/), 'Should not start with number');
        });

        it('collapses multiple underscores', () => {
            assert.strictEqual(sanitizeName('web__app'), 'web_app');
        });

        it('truncates long names', () => {
            const longName = 'a'.repeat(100);
            const result = sanitizeName(longName);
            assert.ok(result.length <= 48, 'Should be 48 chars or less');
        });

        it('handles empty string', () => {
            const result = sanitizeName('');
            assert.strictEqual(typeof result, 'string');
        });
    });

    // ========================================================================
    // Ignorable Parameters
    // ========================================================================

    describe('Ignorable Parameters', function () {

        it('identifies -devno as ignorable', () => {
            assert.strictEqual(isIgnorable('-devno'), true);
        });

        it('identifies -state as ignorable', () => {
            assert.strictEqual(isIgnorable('-state'), true);
        });

        it('identifies -sc (SureConnect) as ignorable', () => {
            assert.strictEqual(isIgnorable('-sc'), true);
        });

        it('identifies -sp (Surge Protection) as ignorable', () => {
            assert.strictEqual(isIgnorable('-sp'), true);
        });

        it('identifies -td (Traffic Domain) as ignorable', () => {
            assert.strictEqual(isIgnorable('-td'), true);
        });

        it('identifies -soMethod (Spillover) as ignorable', () => {
            assert.strictEqual(isIgnorable('-soMethod'), true);
        });

        it('identifies -appflowLog as ignorable', () => {
            assert.strictEqual(isIgnorable('-appflowLog'), true);
        });

        it('does not flag -lbMethod as ignorable', () => {
            assert.strictEqual(isIgnorable('-lbMethod'), false);
        });

        it('does not flag -persistenceType as ignorable', () => {
            assert.strictEqual(isIgnorable('-persistenceType'), false);
        });

        it('does not flag -cltTimeout as ignorable', () => {
            assert.strictEqual(isIgnorable('-cltTimeout'), false);
        });
    });
});
