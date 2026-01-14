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
import { RegExTree } from '../src/regex';

const events = [];
const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []
const rx = new RegExTree().get('13.1');

describe('tgz unpacker tests', function () {
    
    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        console.log('---------- file:', __filename);

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

    });

    afterEach(function () {
        events.length = 0;
    })



    it(`test 'add server' regex`, async () => {

        const items = [
        'add server 1.2.3.4 1.2.3.4',
        'add server 1.2.3.5 1.2.3.5',
        'add server sprout135A_groot 192.168.160.120 -devno 108847',
        'add server sprout135c_groot 192.168.160.69 -devno 108848',
        'add server dorsal-nedc 10.8.101.46 -comment "automated deployment"',
        'add server dorsal-swdc 10.12.101.46 -comment "automated deployment"',
        'add server stpvec1 stpvec1.f5flipper.com -comment "automated deployment"',
        'add server stpvec2 stpvec2.f5flipper.com -comment "automated deployment"',
        ];

        // strip off all the leading parent object details 'add server '
        const slim = items.map(x => x.replace('add server ', ''))

        const rxMatches = slim.map(x => x.match(rx.parents['add server']))

        const misses = rxMatches.filter(x => x === undefined)

        assert.ok(misses.length === 0, 'should not have any rx misses');
    })



    it(`test 'add gslb vserver' regex`, async () => {

        // making sure names with space work along with regular names...
        const items = [
            'add gslb vserver "space_ jump.galaxy.io" HTTP -backupLBMethod ROUNDROBIN -tolerance 0 -EDR ENABLED -appflowLog DISABLED',
            'add gslb vserver timeTravel.galaxy.io HTTP -lbMethod ROUNDROBIN -backupLBMethod LEASTCONNECTION -tolerance 0 -EDR ENABLED -appflowLog DISABLED'
        ];

        // strip off all the leading parent object details 'add gslb vserver '
        const slim = items.map(x => x.replace('add gslb vserver ', ''))

        const rxMatches = slim.map(x => x.match(rx.parents['add gslb vserver']))

        const misses = rxMatches.filter(x => x === undefined)

        assert.ok(misses.length === 0, 'should not have any rx misses');
    })

    // ========================================================================
    // Comprehensive Regex Tree Tests for v13.1 (All Patterns)
    // ========================================================================

    describe('Network Configuration Patterns', function () {

        it('add ns ip - SNIP (Subnet IP) addresses', function () {
            const pattern = 'add ns ip';
            const items = [
                'add ns ip 192.168.1.100 255.255.255.0 -vServer DISABLED -mgmtAccess ENABLED',
                'add ns ip 10.1.1.50 255.255.255.0 -type SNIP',
                'add ns ip 172.16.0.10 255.255.255.0 -vServer ENABLED -mgmtAccess DISABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            // Validate capture groups
            assert.strictEqual(rxMatches[0]?.groups?.name, '192.168.1.100');
            assert.strictEqual(rxMatches[0]?.groups?.mask, '255.255.255.0');
            assert.match(rxMatches[0]?.groups?.opts || '', /-vServer DISABLED/);
        });

        it('add ns ip6 - IPv6 addresses', function () {
            const pattern = 'add ns ip6';
            const items = [
                'add ns ip6 2001:0db8::1/64 -vServer DISABLED',
                'add ns ip6 fe80::1/64 -type SNIP -mgmtAccess ENABLED',
                'add ns ip6 2001:db8:85a3::8a2e:370:7334/64 -vServer ENABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add ns rpcNode - RPC nodes for cluster', function () {
            const pattern = 'add ns rpcNode';
            const items = [
                'add ns rpcNode 192.168.1.101 -password encrypted_password -secure YES',
                'add ns rpcNode 10.1.1.102 -srcIP 10.1.1.1'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add route - Static routes', function () {
            const pattern = 'add route';
            const items = [
                'add route 0.0.0.0 0.0.0.0 192.168.1.1',
                'add route 10.0.0.0 255.0.0.0 192.168.1.1 -distance 1',
                'add route 172.16.0.0 255.255.0.0 10.1.1.1 -cost 5'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add dns nameServer - DNS server configuration', function () {
            const pattern = 'add dns nameServer';
            const items = [
                'add dns nameServer 8.8.8.8',
                'add dns nameServer 1.1.1.1',
                'add dns nameServer 192.168.1.1'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.server, '8.8.8.8');
        });
    });

    describe('Load Balancing Virtual Server Patterns', function () {

        it('add lb vserver - Various protocols and ports', function () {
            const pattern = 'add lb vserver';
            const items = [
                'add lb vserver web-vserver HTTP 192.168.1.100 80 -persistenceType SOURCEIP',
                'add lb vserver "space in name" SSL 10.1.1.50 443 -lbMethod LEASTCONNECTION',
                'add lb vserver ssl-bridge SSL_BRIDGE 172.16.0.10 443 -lbMethod ROUNDROBIN',
                'add lb vserver any-vserver ANY 10.1.1.100 * -persistenceType NONE',
                'add lb vserver dns-vserver DNS 192.168.1.200 53 -lbMethod LEASTCONNECTION',
                'add lb vserver tcp-vserver TCP 10.1.1.150 8080 -persistenceType SOURCEIP'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            // Validate capture groups
            assert.strictEqual(rxMatches[0]?.groups?.name, 'web-vserver');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
            assert.strictEqual(rxMatches[0]?.groups?.ipAddress, '192.168.1.100');
            assert.strictEqual(rxMatches[0]?.groups?.port, '80');

            // Test name with spaces (includes quotes)
            assert.match(rxMatches[1]?.groups?.name || '', /"space in name"/);

            // Test wildcard port
            assert.strictEqual(rxMatches[3]?.groups?.port, '*');
        });

        it('add lb monitor - Health monitors', function () {
            const pattern = 'add lb monitor';
            const items = [
                'add lb monitor http-mon HTTP -respCode 200 -httpRequest "GET /"',
                'add lb monitor https-mon HTTPS-ECV -send "GET /health" -recv "OK"',
                'add lb monitor tcp-mon TCP -destPort 8080',
                'add lb monitor ping-mon PING -LRTM DISABLED',
                'add lb monitor dns-mon DNS -query . -queryType Address'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.name, 'http-mon');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
        });

        it('set lb monitor - Modify existing monitors', function () {
            const pattern = 'set lb monitor';
            const items = [
                'set lb monitor http-mon HTTP -respCode 200 -httpRequest "GET /api/health"',
                'set lb monitor ping-mon PING -interval 5 -downTime 30'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('bind lb vserver - Bind services and policies', function () {
            const pattern = 'bind lb vserver';
            const items = [
                'bind lb vserver web-vserver web-service',
                'bind lb vserver "space vserver" "space service"',
                'bind lb vserver ssl-vserver -policyName rewrite-pol -priority 100 -gotoPriorityExpression END',
                'bind lb vserver api-vserver -policyName cache-pol -priority 10 -type REQUEST'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            // Service binding
            assert.match(rxMatches[0]?.groups?.name || '', /web-vserver/);
            assert.match(rxMatches[0]?.groups?.service || '', /web-service/);

            // Policy binding
            assert.match(rxMatches[2]?.groups?.opts || '', /-policyName/);
        });
    });

    describe('Server and Service Patterns', function () {

        it('add server - Backend servers with various configurations', function () {
            const pattern = 'add server';
            const items = [
                'add server web1 192.168.1.10',
                'add server web2 192.168.1.11 -comment "Production web server"',
                'add server "server with space" 10.1.1.50 -state ENABLED',
                'add server db-server db.example.com -comment "Database server"',
                'add server ipv6-server 2001:db8::1 -ipv6Address YES'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            // Validate basic server
            assert.strictEqual(rxMatches[0]?.groups?.name, 'web1');
            assert.strictEqual(rxMatches[0]?.groups?.dest, '192.168.1.10');

            // Server with FQDN
            assert.strictEqual(rxMatches[3]?.groups?.name, 'db-server');
            assert.strictEqual(rxMatches[3]?.groups?.dest, 'db.example.com');
        });

        it('add service - Services binding servers', function () {
            const pattern = 'add service';
            const items = [
                'add service web-svc web1 HTTP 80 -gslb NONE -maxClient 0 -usip NO',
                'add service "space service" "space server" SSL 443 -gslb NONE',
                'add service tcp-svc tcp-server TCP 8080 -maxClient 1000',
                'add service any-svc any-server ANY * -healthMonitor NO'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'web-svc');
            assert.strictEqual(rxMatches[0]?.groups?.server, 'web1');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
            assert.strictEqual(rxMatches[0]?.groups?.port, '80');
        });

        it('bind service - Bind monitors to services', function () {
            const pattern = 'bind service';
            const items = [
                'bind service web-svc -monitorName http-mon',
                'bind service "space service" -monitorName https-mon',
                'bind service tcp-svc -monitorName tcp-mon -weight 100'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add serviceGroup - Service groups', function () {
            const pattern = 'add serviceGroup';
            const items = [
                'add serviceGroup web-sg HTTP -maxClient 0 -maxReq 0 -cip DISABLED',
                'add serviceGroup "space sg" SSL -maxClient 1000',
                'add serviceGroup tcp-sg TCP -usip NO -useproxyport YES',
                'add serviceGroup any-sg ANY -healthMonitor YES'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'web-sg');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
        });

        it('bind serviceGroup - Bind servers to service groups', function () {
            const pattern = 'bind serviceGroup';
            const items = [
                'bind serviceGroup web-sg web1 80 -weight 100',
                'bind serviceGroup "space sg" "space server" 443',
                'bind serviceGroup tcp-sg -monitorName tcp-mon',
                'bind serviceGroup api-sg api-server 8080 -CustomServerID "api-1"'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('Content Switching Patterns', function () {

        it('add cs vserver - Content switching virtual servers', function () {
            const pattern = 'add cs vserver';
            const items = [
                'add cs vserver cs-web HTTP 192.168.1.100 80 -cltTimeout 180',
                'add cs vserver "space cs" SSL 10.1.1.50 443 -persistenceType SOURCEIP',
                'add cs vserver cs-ssl SSL_BRIDGE 172.16.0.10 443 -Listenpolicy NONE',
                'add cs vserver cs-any ANY 10.1.1.100 * -stateupdate ENABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'cs-web');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
            assert.strictEqual(rxMatches[0]?.groups?.ipAddress, '192.168.1.100');
            assert.strictEqual(rxMatches[0]?.groups?.port, '80');
        });

        it('add cs policy - Content switching policies', function () {
            const pattern = 'add cs policy';
            const items = [
                'add cs policy url-policy -rule "HTTP.REQ.URL.CONTAINS(\\"api\\")" -action lb-api',
                'add cs policy host-policy -rule "HTTP.REQ.HOSTNAME.EQ(\\"www.example.com\\")"',
                'add cs policy path-policy -rule "HTTP.REQ.URL.PATH.STARTSWITH(\\"/admin\\")"'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.name, 'url-policy');
        });

        it('add cs action - Content switching actions', function () {
            const pattern = 'add cs action';
            const items = [
                'add cs action api-action -targetLBVserver lb-api',
                'add cs action web-action -targetLBVserver lb-web -comment "Route to web"'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.name, 'api-action');
        });

        it('bind cs vserver - Bind policies to CS vservers', function () {
            const pattern = 'bind cs vserver';
            const items = [
                'bind cs vserver cs-web -policyName url-policy -priority 100',
                'bind cs vserver "space cs" -policyName host-policy -priority 10 -gotoPriorityExpression END',
                'bind cs vserver cs-ssl -lbvserver lb-default'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('SSL/TLS Patterns', function () {

        it('add ssl certKey - SSL certificates', function () {
            const pattern = 'add ssl certKey';
            const items = [
                'add ssl certKey wildcard-cert -cert "/nsconfig/ssl/wildcard.crt" -key "/nsconfig/ssl/wildcard.key"',
                'add ssl certKey example-cert -cert "/nsconfig/ssl/example.pem" -inform PEM',
                'add ssl certKey ca-bundle -cert "/nsconfig/ssl/ca-bundle.crt" -inform DER'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.name, 'wildcard-cert');
        });

        it('bind ssl vserver - Bind certs to SSL vservers', function () {
            const pattern = 'bind ssl vserver';
            const items = [
                'bind ssl vserver ssl-vserver -certkeyName wildcard-cert',
                'bind ssl vserver "space ssl" -certkeyName example-cert -CA -ocspCheck Optional',
                'bind ssl vserver ssl-api -cipherName HIGH -cipherPriority 1'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('set ssl vserver - Configure SSL parameters', function () {
            const pattern = 'set ssl vserver';
            const items = [
                'set ssl vserver ssl-vserver -tls11 ENABLED -tls12 ENABLED -tls13 DISABLED',
                'set ssl vserver ssl-api -sslProfile ssl-profile-1'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('bind ssl service - Bind certs to SSL services', function () {
            const pattern = 'bind ssl service';
            const items = [
                'bind ssl service ssl-svc -certkeyName backend-cert',
                'bind ssl service "space service" -certkeyName backend-cert -CA'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('set ssl service - Configure SSL service parameters', function () {
            const pattern = 'set ssl service';
            const items = [
                'set ssl service ssl-svc -tls11 ENABLED -tls12 ENABLED',
                'set ssl service backend-svc -commonName example.com'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('Policy Patterns (Rewrite, Responder, Authentication)', function () {

        it('add rewrite policy - Rewrite policies', function () {
            const pattern = 'add rewrite policy';
            const items = [
                'add rewrite policy add-header-policy "HTTP.REQ.HEADER(\\"Host\\").EXISTS" add-header-action',
                'add rewrite policy redirect-policy "HTTP.REQ.URL.PATH.EQ(\\"/old\\")" redirect-action',
                'add rewrite policy modify-url-policy TRUE modify-url-action'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add rewrite action - Rewrite actions', function () {
            const pattern = 'add rewrite action';
            const items = [
                'add rewrite action add-header-action insert_http_header X-Forwarded-Proto "\\"https\\""',
                'add rewrite action redirect-action replace "HTTP.REQ.URL" "\\"/new\\""',
                'add rewrite action delete-header-action delete_http_header "X-Debug"'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add responder policy - Responder policies', function () {
            const pattern = 'add responder policy';
            const items = [
                'add responder policy block-policy "CLIENT.IP.SRC.IN_SUBNET(10.0.0.0/8)" block-action',
                'add responder policy redirect-policy "HTTP.REQ.HOSTNAME.NE(\\"www.example.com\\")" redirect-action',
                'add responder policy maintenance-policy "SYS.TIME.BETWEEN(02,06)" maintenance-action'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add responder action - Responder actions', function () {
            const pattern = 'add responder action';
            const items = [
                'add responder action block-action respondwith "\\"HTTP/1.1 403 Forbidden\\\\r\\\\n\\\\r\\\\n\\""',
                'add responder action redirect-action redirect "\\"https://www.example.com\\" + HTTP.REQ.URL"',
                'add responder action maintenance-action respondwith "\\"HTTP/1.1 503 Service Unavailable\\""'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add authentication policy - Authentication policies', function () {
            const pattern = 'add authentication policy';
            const items = [
                'add authentication policy ldap-policy "HTTP.REQ.URL.STARTSWITH(\\"/secure\\")" ldap-action',
                'add authentication policy saml-policy TRUE saml-action',
                'add authentication policy radius-policy "AAA.USER.IS_MEMBER_OF(\\"VPN-Users\\")" radius-action'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add authentication action - Authentication actions', function () {
            const pattern = 'add authentication action';
            const items = [
                'add authentication action ldap-action LDAP -serverIP 192.168.1.10 -serverPort 389',
                'add authentication action saml-action SAML -samlIdPCertName idp-cert',
                'add authentication action radius-action RADIUS -serverIP 10.1.1.20 -radKey secret123'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('AppFlow Patterns', function () {

        it('add appflow policy - AppFlow policies', function () {
            const pattern = 'add appflow policy';
            const items = [
                'add appflow policy log-policy TRUE log-action',
                'add appflow policy http-policy "HTTP.REQ.URL.CONTAINS(\\"api\\")" api-log-action'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'log-policy');
            assert.strictEqual(rxMatches[0]?.groups?.rule, 'TRUE');
            assert.strictEqual(rxMatches[0]?.groups?.action, 'log-action');
        });

        it('add appflow action - AppFlow actions', function () {
            const pattern = 'add appflow action';
            const items = [
                'add appflow action log-action -collectors collector1',
                'add appflow action api-log-action -collectors collector1 collector2 -clientSideMeasurements ENABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('add appflow collector - AppFlow collectors', function () {
            const pattern = 'add appflow collector';
            const items = [
                'add appflow collector collector1 -IPAddress 192.168.1.50 -port 4739',
                'add appflow collector collector2 -IPAddress 10.1.1.100 -port 4739 -Transport udp'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('GSLB (Global Server Load Balancing) Patterns', function () {

        it('add gslb vserver - GSLB virtual servers', function () {
            const pattern = 'add gslb vserver';
            const items = [
                'add gslb vserver gslb-site HTTP -backupLBMethod ROUNDROBIN -tolerance 0',
                'add gslb vserver "space gslb" HTTP -lbMethod LEASTCONNECTION -tolerance 0 -EDR ENABLED',
                'add gslb vserver global-app SSL -backupLBMethod LEASTCONNECTION -appflowLog DISABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'gslb-site');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
        });

        it('add gslb service - GSLB services', function () {
            const pattern = 'add gslb service';
            const items = [
                'add gslb service site1-svc site1-server HTTP 80 -publicIP 203.0.113.1 -publicPort 80',
                'add gslb service "space gslb svc" "space server" SSL 443 -publicIP 203.0.113.2 -publicPort 443',
                'add gslb service site2-svc site2-server HTTP * -siteName site2 -weight 100'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);

            assert.strictEqual(rxMatches[0]?.groups?.name, 'site1-svc');
            assert.strictEqual(rxMatches[0]?.groups?.server, 'site1-server');
            assert.strictEqual(rxMatches[0]?.groups?.protocol, 'HTTP');
            assert.strictEqual(rxMatches[0]?.groups?.port, '80');
        });

        it('add gslb site - GSLB site configuration', function () {
            const pattern = 'add gslb site';
            const items = [
                'add gslb site site1 192.168.1.10 -publicIP 203.0.113.1',
                'add gslb site "space site" 10.1.1.10 -publicIP 203.0.113.2 -siteType REMOTE',
                'add gslb site site2 172.16.0.10 -publicIP 203.0.113.3 -parentSite parent-site'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('set gslb vserver - Modify GSLB vserver settings', function () {
            const pattern = 'set gslb vserver';
            const items = [
                'set gslb vserver gslb-site -lbMethod ROUNDROBIN',
                'set gslb vserver global-app -tolerance 5 -EDR DISABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('bind gslb vserver - Bind services to GSLB vservers', function () {
            const pattern = 'bind gslb vserver';
            const items = [
                'bind gslb vserver gslb-site -serviceName site1-svc',
                'bind gslb vserver "space gslb" -serviceName "space gslb svc" -weight 100',
                'bind gslb vserver global-app -domainName example.com -TTL 30'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });
    });

    describe('System Configuration Patterns', function () {

        it('set ns param - Global NS parameters', function () {
            const pattern = 'set ns param';
            const items = [
                'set ns param -timezone GMT+00:00-GMT-0',
                'set ns param -httpPort 80 -maxConn 0 -maxReq 0',
                'set ns param -cookieversion 0 -secureCookie ENABLED'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
        });

        it('set ns hostName - Set system hostname', function () {
            const pattern = 'set ns hostName';
            const items = [
                'set ns hostName ns-primary.example.com',
                'set ns hostName citrix-adc-01',
                'set ns hostName netscaler.local'
            ];

            const slim = items.map(x => x.replace(pattern + ' ', ''));
            const rxMatches = slim.map(x => x.match(rx.parents[pattern]));
            const misses = rxMatches.filter(x => x === null);

            assert.strictEqual(misses.length, 0, `Pattern '${pattern}' should match all test cases`);
            assert.strictEqual(rxMatches[0]?.groups?.hostName, 'ns-primary.example.com');
        });
    });

    describe('Edge Cases and Special Characters', function () {

        it('should handle names with spaces (quoted)', function () {
            const patterns = {
                'add lb vserver': 'add lb vserver "my web server" HTTP 192.168.1.100 80 -persistenceType SOURCEIP',
                'add cs vserver': 'add cs vserver "content switch 1" SSL 10.1.1.50 443 -cltTimeout 180',
                'add server': 'add server "server with spaces" 192.168.1.10 -comment "test server"',
                'add service': 'add service "service 123" "server 456" HTTP 80 -gslb NONE'
            };

            Object.entries(patterns).forEach(([pattern, configLine]) => {
                const slim = configLine.replace(pattern + ' ', '');
                const match = slim.match(rx.parents[pattern as keyof typeof rx.parents]);
                assert.notStrictEqual(match, null, `Pattern '${pattern}' should match quoted names`);
                // Regex captures the entire name including quotes, e.g. "my web server"
                // Just verify the match succeeded and name group exists
                assert.ok(match?.groups?.name, `Should capture name group for pattern '${pattern}'`);
            });
        });

        it('should handle wildcard ports', function () {
            const patterns = {
                'add lb vserver': 'add lb vserver any-vserver ANY 10.1.1.100 * -persistenceType NONE',
                'add service': 'add service any-svc any-server ANY * -healthMonitor NO',
                'bind serviceGroup': 'bind serviceGroup sg1 server1 *'
            };

            Object.entries(patterns).forEach(([pattern, configLine]) => {
                const slim = configLine.replace(pattern + ' ', '');
                const match = slim.match(rx.parents[pattern as keyof typeof rx.parents]);
                assert.notStrictEqual(match, null, `Pattern '${pattern}' should match wildcard port`);
            });
        });

        it('should handle IPv4 addresses', function () {
            const ipAddresses = [
                '192.168.1.1',
                '10.0.0.1',
                '172.16.0.1',
                '203.0.113.1',
                '0.0.0.0'
            ];

            ipAddresses.forEach(ip => {
                const configLine = `add lb vserver test-vs HTTP ${ip} 80 -persistenceType SOURCEIP`;
                const slim = configLine.replace('add lb vserver ', '');
                const match = slim.match(rx.parents['add lb vserver']);
                assert.notStrictEqual(match, null, `Should match IP ${ip}`);
                assert.strictEqual(match?.groups?.ipAddress, ip);
            });
        });

        it('should handle IPv6 addresses', function () {
            const ipv6Addresses = [
                '2001:db8::1',
                'fe80::1',
                '::1',
                '2001:0db8:85a3::8a2e:0370:7334'
            ];

            ipv6Addresses.forEach(ip => {
                const configLine = `add lb vserver test-vs HTTP ${ip} 80 -persistenceType SOURCEIP`;
                const slim = configLine.replace('add lb vserver ', '');
                const match = slim.match(rx.parents['add lb vserver']);
                assert.notStrictEqual(match, null, `Should match IPv6 ${ip}`);
            });
        });

        it('should handle FQDNs (hostnames)', function () {
            const hostnames = [
                'server.example.com',
                'web-01.corp.local',
                'api.cloud.f5.com',
                'db-primary.internal.net'
            ];

            hostnames.forEach(hostname => {
                const configLine = `add server srv1 ${hostname}`;
                const slim = configLine.replace('add server ', '');
                const match = slim.match(rx.parents['add server']);
                assert.notStrictEqual(match, null, `Should match hostname ${hostname}`);
                assert.strictEqual(match?.groups?.dest, hostname);
            });
        });

        it('should handle various protocols', function () {
            const protocols = ['HTTP', 'HTTPS', 'SSL', 'SSL_BRIDGE', 'TCP', 'UDP', 'DNS', 'ANY'];

            protocols.forEach(protocol => {
                const configLine = `add lb vserver test-vs ${protocol} 192.168.1.100 80 -persistenceType NONE`;
                const slim = configLine.replace('add lb vserver ', '');
                const match = slim.match(rx.parents['add lb vserver']);
                assert.notStrictEqual(match, null, `Should match protocol ${protocol}`);
                assert.strictEqual(match?.groups?.protocol, protocol);
            });
        });

        it('should handle quoted names with spaces when no options follow', function () {
            // This tests the fix for the bug where patterns required opts group to match
            // When no options followed the required fields, the regex would fail and
            // fallback to splitting by whitespace, incorrectly parsing "Web App" as just "Web
            const patterns = {
                'add lb vserver': {
                    line: 'add lb vserver "Web App Server" HTTP 10.1.1.100 80',
                    expectedName: '"Web App Server"'
                },
                'add cs vserver': {
                    line: 'add cs vserver "Content Switch App" SSL 10.1.1.101 443',
                    expectedName: '"Content Switch App"'
                },
                'add service': {
                    line: 'add service "My Service" my-server HTTP 8080',
                    expectedName: '"My Service"'
                },
                'add serviceGroup': {
                    line: 'add serviceGroup "Production Pool" HTTP',
                    expectedName: '"Production Pool"'
                }
            };

            Object.entries(patterns).forEach(([pattern, testCase]) => {
                const slim = testCase.line.replace(pattern + ' ', '');
                const match = slim.match(rx.parents[pattern as keyof typeof rx.parents]);
                assert.notStrictEqual(match, null, `Pattern '${pattern}' should match when no options follow: ${testCase.line}`);
                assert.strictEqual(match?.groups?.name, testCase.expectedName,
                    `Pattern '${pattern}' should capture full quoted name including spaces`);
            });
        });

        it('should handle names with special characters (underscores, hyphens, dots)', function () {
            const names = [
                'web-server-01',
                'lb_vserver_prod',
                'app.server.v2',
                'test-lb_vserver.prod'
            ];

            names.forEach(name => {
                const configLine = `add lb vserver ${name} HTTP 192.168.1.100 80 -persistenceType SOURCEIP`;
                const slim = configLine.replace('add lb vserver ', '');
                const match = slim.match(rx.parents['add lb vserver']);
                assert.notStrictEqual(match, null, `Should match name with special chars: ${name}`);
                assert.strictEqual(match?.groups?.name, name);
            });
        });
    });
});
