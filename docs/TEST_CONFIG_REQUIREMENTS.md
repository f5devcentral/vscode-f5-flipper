# Test Configuration Requirements

**Purpose**: Document NetScaler configurations needed to validate F5 Flipper parsing and conversion logic.

**Use Case**: Generate these configurations on a real NetScaler test appliance via the NetScaler MCP server project, then add to test suite.

**Status**: Phase 1 Object Type Expansion added 39 new regex patterns that are currently skipped in tests pending real config validation.

---

## Quick Reference: Priority Configs Needed

| Priority | Config Type | Test File | Pattern Count |
|----------|-------------|-----------|---------------|
| P1 | Network Profiles | tests/027_objectTypeExpansion.unit.tests.ts | 9 patterns |
| P1 | Cache & Compression | tests/027_objectTypeExpansion.unit.tests.ts | 10 patterns |
| P1 | Rate Limiting | tests/027_objectTypeExpansion.unit.tests.ts | 3 patterns |
| P2 | GSLB Complete | New test needed | Existing patterns |
| P2 | AppFW/WAF | New test needed | Existing patterns |
| P2 | Authentication | New test needed | 20+ patterns (BORG deferred) |
| P3 | HA/Cluster | New test needed | Feature detection |
| P3 | Custom Monitors | Extend existing | Feature detection |

---

## Section 1: Object Type Expansion (39 Skipped Tests)

These patterns were added in BORG Phase 1 but tests are skipped pending real config validation.
**Test file**: `tests/027_objectTypeExpansion.unit.tests.ts`

### 1.1 Network & System Objects (5 patterns)

**Config file to create**: `tests/artifacts/apps/networkObjects.ns.conf`

```bash
# VLAN Configuration
add vlan 100 -aliasName "DMZ_VLAN"
add vlan 200 -aliasName "Internal_VLAN"
bind vlan 100 -ifnum 1/1
bind vlan 200 -ifnum 1/2

# Net Profiles
add ns netProfile net_prof_dmz -srcIP 10.1.1.1
add ns netProfile net_prof_backend -srcIP 10.2.2.2 -srcIPPersistency ENABLED

# Traffic Domains (multi-tenancy)
add ns trafficDomain 10 -aliasName "Tenant_A"
add ns trafficDomain 20 -aliasName "Tenant_B"
bind ns trafficDomain 10 -vlan 100
bind ns trafficDomain 20 -vlan 200
```

**What to validate**:
- Objects parsed into `configObjectArryRx.add.vlan`
- VLAN bindings in `configObjectArryRx.bind.vlan`
- Net profiles in `configObjectArryRx.add.ns.netProfile`
- Traffic domains in `configObjectArryRx.add.ns.trafficDomain`

---

### 1.2 TCP/HTTP/SSL/DNS Profiles (9 patterns)

**Config file to create**: `tests/artifacts/apps/profiles.ns.conf`

```bash
# TCP Profile
add ns tcpProfile tcp_prof_custom -WS ENABLED -SACK ENABLED -nagle ENABLED -mss 1460
set ns tcpProfile tcp_prof_custom -maxBurst 30 -initialCwnd 16 -bufferSize 131072

# HTTP Profile
add ns httpProfile http_prof_custom -dropInvalReqs ENABLED -markHttp09Inval ENABLED
set ns httpProfile http_prof_custom -maxHeaderLen 24820 -maxReq 100

# SSL Profile (frontend)
add ssl profile ssl_prof_frontend -ssl3 DISABLED -tls1 DISABLED -tls11 DISABLED -tls12 ENABLED -tls13 ENABLED
set ssl profile ssl_prof_frontend -sessReuse ENABLED -sessTimeout 120
bind ssl profile ssl_prof_frontend -cipherName HIGH

# SSL Profile (backend)
add ssl profile ssl_prof_backend -sslProfileType BackEnd
set ssl profile ssl_prof_backend -sessReuse ENABLED -sessTimeout 300

# DNS Profile
add dns profile dns_prof_custom -dnsQueryLogging ENABLED
set dns profile dns_prof_custom -cacheRecords ENABLED -cacheNegativeResponses ENABLED

# Apply profiles to vserver
add lb vserver web_vs HTTP 10.1.1.100 80 -httpProfileName http_prof_custom -tcpProfileName tcp_prof_custom
add lb vserver secure_vs SSL 10.1.1.101 443
bind ssl vserver secure_vs -sslProfile ssl_prof_frontend
```

**What to validate**:
- TCP profile in `configObjectArryRx.add.ns.tcpProfile`
- HTTP profile in `configObjectArryRx.add.ns.httpProfile`
- SSL profile in `configObjectArryRx.add.ssl.profile`
- DNS profile in `configObjectArryRx.add.dns.profile`
- `set` operations update profile settings
- Profile bindings to vservers

---

### 1.3 Persistence Sessions (2 patterns)

**Config file to create**: `tests/artifacts/apps/persistence.ns.conf`

```bash
# Source IP Persistence
add lb persistenceSession sourceip_persist -persistenceType SOURCEIP -timeout 3600

# Cookie Persistence
add lb persistenceSession cookie_persist -persistenceType COOKIEINSERT -timeout 7200 -cookieName NSPERSIS

# SSL Session Persistence
add lb persistenceSession ssl_persist -persistenceType SSLSESSION -timeout 1800

# Custom Rule Persistence
add lb persistenceSession rule_persist -persistenceType RULE -rule "HTTP.REQ.HEADER(\"X-Session-ID\")"

# Apply to vserver
add lb vserver app_vs HTTP 10.1.1.100 80 -persistenceType SOURCEIP
set lb persistenceSession sourceip_persist -timeout 7200
```

**What to validate**:
- Persistence sessions in `configObjectArryRx.add.lb.persistenceSession`
- `set` modifications in `configObjectArryRx.set.lb.persistenceSession`
- Different persistence types: SOURCEIP, COOKIEINSERT, SSLSESSION, RULE

---

### 1.4 Cache Policies (6 patterns)

**Config file to create**: `tests/artifacts/apps/caching.ns.conf`

```bash
# Cache Content Groups
add cache contentGroup images_group -maxResSize 500000 -memLimit 104857600
add cache contentGroup static_group -maxResSize 1000000 -relExpiry 3600

# Cache Selectors
add cache selector cache_sel_url -rule "HTTP.REQ.URL.PATH"
add cache selector cache_sel_query -rule "HTTP.REQ.URL.QUERY"

# Cache Actions
add cache action cache_act_store -storeinGroup images_group
add cache action cache_act_nocache -cachePolicy NOCACHE

# Cache Policies
add cache policy cache_pol_images -rule "HTTP.REQ.URL.CONTAINS(\"/images/\")" -action cache_act_store
add cache policy cache_pol_nocache -rule "HTTP.REQ.URL.CONTAINS(\"/api/\")" -action cache_act_nocache
set cache policy cache_pol_images -undefAction NOCACHE

# Bind policies globally
bind cache policy cache_pol_images -priority 100 -gotoPriorityExpression END
bind cache policy cache_pol_nocache -priority 200 -gotoPriorityExpression END
```

**What to validate**:
- Content groups in `configObjectArryRx.add.cache.contentGroup`
- Selectors in `configObjectArryRx.add.cache.selector`
- Actions in `configObjectArryRx.add.cache.action`
- Policies in `configObjectArryRx.add.cache.policy`
- Policy bindings in `configObjectArryRx.bind.cache.policy`

---

### 1.5 Compression Policies (4 patterns)

**Config file to create**: `tests/artifacts/apps/compression.ns.conf`

```bash
# Compression Actions
add cmp action cmp_act_gzip -cmpType gzip
add cmp action cmp_act_deflate -cmpType deflate

# Compression Policies
add cmp policy cmp_pol_text -rule "HTTP.RES.HEADER(\"Content-Type\").CONTAINS(\"text\")" -resAction COMPRESS
add cmp policy cmp_pol_json -rule "HTTP.RES.HEADER(\"Content-Type\").CONTAINS(\"json\")" -resAction COMPRESS
add cmp policy cmp_pol_nocompress -rule "HTTP.RES.HEADER(\"Content-Encoding\").EXISTS" -resAction NOCOMPRESS

set cmp policy cmp_pol_text -resAction GZIP

# Bind policies
bind cmp policy cmp_pol_text -priority 100
bind cmp policy cmp_pol_json -priority 200
```

**What to validate**:
- Actions in `configObjectArryRx.add.cmp.action`
- Policies in `configObjectArryRx.add.cmp.policy`
- `set` modifications in `configObjectArryRx.set.cmp.policy`
- Policy bindings in `configObjectArryRx.bind.cmp.policy`

---

### 1.6 Authorization Policies (2 patterns)

**Config file to create**: `tests/artifacts/apps/authorization.ns.conf`

```bash
# Authorization Actions
add authorization action authz_act_allow -defaultAuthorizationAction ALLOW
add authorization action authz_act_deny -defaultAuthorizationAction DENY

# Authorization Policies
add authorization policy authz_pol_admin -rule "HTTP.REQ.USER.IS_MEMBER_OF(\"Admins\")" -action authz_act_allow
add authorization policy authz_pol_deny_all -rule "true" -action authz_act_deny
```

**What to validate**:
- Actions in `configObjectArryRx.add.authorization.action`
- Policies in `configObjectArryRx.add.authorization.policy`

---

### 1.7 Rate Limiting (3 patterns)

**Config file to create**: `tests/artifacts/apps/rateLimiting.ns.conf`

```bash
# Limit Selectors (what to limit by)
add ns limitSelector limit_sel_client -key "CLIENT.IP.SRC"
add ns limitSelector limit_sel_url -key "HTTP.REQ.URL.PATH"

# Limit Identifiers (rate limits)
add ns limitIdentifier limit_api_calls -threshold 1000 -timeSlice 60000 -mode REQUEST_RATE -limitType BURSTY
add ns limitIdentifier limit_login -threshold 10 -timeSlice 60000 -mode REQUEST_RATE -limitType SMOOTH -selectorName limit_sel_client

set ns limitIdentifier limit_api_calls -threshold 2000

# Responder policy using rate limit
add responder action act_rate_limit respondwith "HTTP/1.1 429 Too Many Requests\r\n\r\n"
add responder policy pol_rate_limit "SYS.CHECK_LIMIT(\"limit_api_calls\")" act_rate_limit
```

**What to validate**:
- Selectors in `configObjectArryRx.add.ns.limitSelector`
- Identifiers in `configObjectArryRx.add.ns.limitIdentifier`
- `set` modifications in `configObjectArryRx.set.ns.limitIdentifier`
- Integration with responder policies

---

### 1.8 Audit/Logging Policies (4 patterns)

**Config file to create**: `tests/artifacts/apps/auditLogging.ns.conf`

```bash
# NSLog Actions
add audit nslogAction nslog_act_admin -serverIP 10.1.1.50 -serverPort 514 -logLevel ALL
add audit nslogAction nslog_act_error -serverIP 10.1.1.50 -serverPort 514 -logLevel ERROR

# NSLog Policies
add audit nslogPolicy nslog_pol_admin -rule "HTTP.REQ.URL.CONTAINS(\"/admin/\")" -action nslog_act_admin
add audit nslogPolicy nslog_pol_errors -rule "SYS.EVAL_CLASSIC_EXPR(\"sys.err_status == 500\")" -action nslog_act_error

# Syslog Actions
add audit syslogAction syslog_act -serverIP 10.1.1.60 -serverPort 514 -logLevel INFORMATIONAL -logFacility LOCAL0
add audit syslogAction syslog_act_alert -serverIP 10.1.1.60 -serverPort 514 -logLevel ALERT

# Syslog Policies
add audit syslogPolicy syslog_pol_all -rule "true" -action syslog_act
add audit syslogPolicy syslog_pol_post -rule "HTTP.REQ.METHOD.EQ(POST)" -action syslog_act_alert
```

**What to validate**:
- NSLog actions in `configObjectArryRx.add.audit.nslogAction`
- NSLog policies in `configObjectArryRx.add.audit.nslogPolicy`
- Syslog actions in `configObjectArryRx.add.audit.syslogAction`
- Syslog policies in `configObjectArryRx.add.audit.syslogPolicy`

---

### 1.9 Spillover Policies (2 patterns)

**Config file to create**: `tests/artifacts/apps/spillover.ns.conf`

```bash
# Spillover Actions
add spillover action spill_act_redirect -action SPILLOVER
add spillover action spill_act_bandwidth -action SPILLOVER

# Spillover Policies
add spillover policy spill_pol_conns -rule "SYS.VSERVER(\"web_vs\").ACTIVECONN.GT(10000)" -action spill_act_redirect
add spillover policy spill_pol_bandwidth -rule "SYS.VSERVER(\"web_vs\").TOTALBANDWIDTH.GT(1000000)" -action spill_act_bandwidth

# Apply to vserver with backup
add lb vserver web_vs HTTP 10.1.1.100 80
add lb vserver backup_vs HTTP 10.1.1.200 80
set lb vserver web_vs -backupVServer backup_vs -spilloverMethod CONNECTION -spilloverThreshold 10000
```

**What to validate**:
- Actions in `configObjectArryRx.add.spillover.action`
- Policies in `configObjectArryRx.add.spillover.policy`
- Spillover settings on vservers

---

### 1.10 AAA vServers (2 patterns)

**Config file to create**: `tests/artifacts/apps/aaaLegacy.ns.conf`

```bash
# AAA vServer (legacy authentication)
add aaa vserver aaa_vs SSL 10.1.1.150 443
add aaa vserver aaa_vs_internal SSL 0.0.0.0 0

# Bind authentication policies
add authentication ldapAction ldap_act -serverIP 10.1.2.10 -serverPort 389 -ldapBase "dc=example,dc=com"
add authentication Policy ldap_pol -rule "true" -action ldap_act

bind aaa vserver aaa_vs -policy ldap_pol -priority 100
```

**What to validate**:
- AAA vservers in `configObjectArryRx.add.aaa.vserver`
- AAA bindings in `configObjectArryRx.bind.aaa.vserver`
- Protocol type extraction

---

## Section 2: Feature Detection Testing

The feature detector (`src/featureDetector.ts`) covers 10 categories but many lack real config validation.

### 2.1 GSLB Complete Configuration

**Config file to create**: `tests/artifacts/apps/gslbComplete.ns.conf`

```bash
# GSLB Sites
add gslb site site_dc1 10.1.1.1 -publicIP 203.0.113.1
add gslb site site_dc2 10.2.2.1 -publicIP 203.0.113.2

# GSLB Services
add gslb service gslb_svc_dc1_web site_dc1 10.1.1.100 HTTP 80 -publicIP 203.0.113.10 -publicPort 80
add gslb service gslb_svc_dc2_web site_dc2 10.2.2.100 HTTP 80 -publicIP 203.0.113.20 -publicPort 80

# GSLB vServer
add gslb vserver gslb_vs_web HTTP -dnsRecordType A -lbMethod ROUNDROBIN
bind gslb vserver gslb_vs_web -serviceName gslb_svc_dc1_web
bind gslb vserver gslb_vs_web -serviceName gslb_svc_dc2_web

# GSLB Domain Binding
add gslb domain www.example.com -TTL 30
bind gslb vserver gslb_vs_web -domainName www.example.com -TTL 60

# DNS Records
add dns nsRec example.com ns1.example.com
add dns aRec ns1.example.com 203.0.113.1
```

**What to validate**:
- GSLB sites in `configObjectArryRx.add.gslb.site`
- GSLB services in `configObjectArryRx.add.gslb.service`
- GSLB vservers in `configObjectArryRx.add.gslb.vserver`
- Feature detection identifies: GSLB, site count, service count

---

### 2.2 Application Firewall (AppFW/WAF)

**Config file to create**: `tests/artifacts/apps/appFirewall.ns.conf`

```bash
# AppFW Profile with OWASP protections
add appfw profile appfw_prof_strict -defaults advanced
set appfw profile appfw_prof_strict -startURLAction log block stats
set appfw profile appfw_prof_strict -SQLInjectionAction log block stats
set appfw profile appfw_prof_strict -crossSiteScriptingAction log block stats
set appfw profile appfw_prof_strict -CSRFTagAction log block stats
set appfw profile appfw_prof_strict -fieldConsistencyAction log block stats
set appfw profile appfw_prof_strict -bufferOverflowAction log block stats
set appfw profile appfw_prof_strict -cookieConsistencyAction log

# AppFW Policy
add appfw policy appfw_pol_all "true" appfw_prof_strict

# Bind to vserver
add lb vserver secure_app_vs SSL 10.1.1.100 443
bind lb vserver secure_app_vs -policyName appfw_pol_all -priority 100 -type REQUEST

# Signature sets
add appfw signatureImport appfw_sigs https://example.com/sigs
```

**What to validate**:
- AppFW profiles in `configObjectArryRx.add.appfw.profile`
- AppFW policies in `configObjectArryRx.add.appfw.policy`
- Feature detection identifies: SQL Injection, XSS, CSRF protections
- Complexity weight calculation (should be high - 8+)

---

### 2.3 Custom Script Monitors

**Config file to create**: `tests/artifacts/apps/customMonitors.ns.conf`

```bash
# HTTP Monitor with custom headers
add lb monitor http_custom HTTP -respCode 200 -customHeaders "Host: example.com\r\nAccept: application/json\r\n"
add lb monitor http_custom -send "GET /health HTTP/1.1\r\nHost: example.com\r\n\r\n"
add lb monitor http_custom -recv "OK"

# Script-based monitor (USER type)
add lb monitor script_db USER -scriptName nssdb.pl -scriptArgs "host=dbserver;port=3306;database=mydb"
add lb monitor script_api USER -scriptName ns_curl.pl -scriptArgs "url=https://api.example.com/status"
add lb monitor script_ldap USER -scriptName nsldap.pl -dispatcherIP 10.1.1.1 -dispatcherPort 3013

# TCP Monitor with send/receive
add lb monitor tcp_custom TCP -send "PING\r\n" -recv "PONG"

# HTTPS Monitor
add lb monitor https_custom HTTP-ECV -secure YES -send "GET /healthz HTTP/1.1\r\nHost: secure.example.com\r\n\r\n" -recv "healthy"

# Apply monitors
add serviceGroup sg_web HTTP
bind serviceGroup sg_web -monitorName http_custom
bind serviceGroup sg_web -monitorName script_api
```

**What to validate**:
- Monitors in `configObjectArryRx.add.lb.monitor`
- USER type monitors detected
- Custom send/receive strings detected
- Feature detection identifies: Script monitors with proper complexity

---

### 2.4 High Availability / Cluster

**Config file to create**: `tests/artifacts/apps/haCluster.ns.conf`

```bash
# HA Node Configuration
add ha node 1 10.1.1.2 -inc ENABLED
set ha node -failSafe ON -maxFlips 3 -maxFlipTime 1200

# HA Sync Configuration
add ns ip 10.1.1.1 255.255.255.0 -type NSIP
add ns ip 10.1.1.2 255.255.255.0 -type NSIP -mgmtAccess ENABLED

# RPC Node (for cluster communication)
add ns rpcNode 10.1.1.2 -password encrypted_password -secure YES

# Cluster Configuration
add cluster instance cluster1 -inc ENABLED -backplaneBasedView ENABLED
add cluster node 0 10.1.1.1 -state ACTIVE -backplane 0/1/1
add cluster node 1 10.1.1.2 -state PASSIVE -backplane 0/1/2
join cluster cluster1 -clip 10.1.1.100 -password cluster_password
```

**What to validate**:
- HA nodes in `configObjectArryRx.add.ha.node`
- Cluster nodes in `configObjectArryRx.add.cluster.node`
- Cluster instances in `configObjectArryRx.add.cluster.instance`
- Feature detection identifies: HA pair, cluster configuration

---

## Section 3: Authentication (BORG Deferred - Reference Only)

These patterns are documented in `specs/BORG_AUTH_REFERENCE.md` but were deferred. Include for completeness.

### 3.1 nFactor Authentication Chain

**Config file to create**: `tests/artifacts/apps/nFactorAuth.ns.conf`

```bash
# Login Schemas
add authentication loginSchema lschema_username -authenticationSchema "/nsconfig/loginschema/LoginSchema/SingleAuthSimple.xml"
add authentication loginSchema lschema_mfa -authenticationSchema "/nsconfig/loginschema/LoginSchema/DualAuth.xml"

# Login Schema Policies
add authentication loginSchemaPolicy lschemapol_default -rule "true" -action lschema_username

# LDAP Action
add authentication ldapAction ldap_act_corp -serverIP 10.1.2.10 -serverPort 389 -ldapBase "dc=corp,dc=example,dc=com" -ldapBindDn "cn=svc_auth,ou=service,dc=corp,dc=example,dc=com" -ldapBindDnPassword encrypted_password -ldapLoginName sAMAccountName -groupAttrName memberOf -subAttributeName CN

# RADIUS Action (for MFA)
add authentication radiusAction radius_act_mfa -serverIP 10.1.2.20 -serverPort 1812 -radKey encrypted_key -radAttributeType 11

# Authentication Policies
add authentication Policy pol_ldap -rule "true" -action ldap_act_corp
add authentication Policy pol_radius -rule "true" -action radius_act_mfa

# Policy Labels (nFactor chain)
add authentication policylabel plabel_mfa -loginSchema lschema_mfa
bind authentication policylabel plabel_mfa -policyName pol_radius -priority 100 -gotoPriorityExpression END

# Authentication vServer
add authentication vserver auth_vs SSL 10.1.1.200 443
bind authentication vserver auth_vs -policy pol_ldap -priority 100 -nextFactor plabel_mfa -gotoPriorityExpression NEXT
bind ssl vserver auth_vs -certkeyName wildcard_cert
```

**What to validate**:
- Login schemas parsed
- Policy labels (nFactor chain nodes)
- LDAP/RADIUS actions
- Authentication vserver
- Chain relationships (nextFactor)

---

### 3.2 SAML SSO

**Config file to create**: `tests/artifacts/apps/samlAuth.ns.conf`

```bash
# SAML IdP Profile
add authentication samlIdPProfile saml_idp_okta -samlIdPCertName idp_cert -samlIssuerName "https://ns.example.com/saml" -assertionConsumerServiceURL "https://okta.example.com/sso/saml"

# SAML Action (SP mode)
add authentication samlAction saml_act_sp -metadataUrl "https://idp.example.com/metadata" -samlIdPCertName idp_cert -samlSigningCertName sp_cert -samlRedirectUrl "https://ns.example.com/cgi/samlauth" -samlACSIndex 0

# SAML Policy
add authentication Policy pol_saml -rule "true" -action saml_act_sp
```

---

### 3.3 OAuth/OIDC

**Config file to create**: `tests/artifacts/apps/oauthAuth.ns.conf`

```bash
# OAuth Action (Azure AD example)
add authentication OAuthAction oauth_act_azure -authorizationEndpoint "https://login.microsoftonline.com/tenant_id/oauth2/v2.0/authorize" -tokenEndpoint "https://login.microsoftonline.com/tenant_id/oauth2/v2.0/token" -clientID "client_id_here" -clientSecret "encrypted_secret" -defaultAuthenticationGroup "AzureAD_Users"

# OAuth IdP Profile (acting as IdP)
add authentication OAuthIdPProfile oauth_idp_prof -clientID "client_app_id" -clientSecret "encrypted_secret" -redirectURL "https://app.example.com/callback"

# OAuth Policy
add authentication Policy pol_oauth -rule "true" -action oauth_act_azure
```

---

## Section 4: Diagnostics Rules Validation

The `diagnostics.json` contains 51 rules. Many lack test configs to validate detection.

### 4.1 Configs to Trigger Specific Diagnostics

**Config file to create**: `tests/artifacts/apps/diagnosticsTriggers.ns.conf`

```bash
# Trigger: f62e - Wildcard port (XC)
add lb vserver wildcard_port_vs HTTP 10.1.1.100 0

# Trigger: 62ff - Wildcard VIP (XC)
add lb vserver wildcard_vip_vs HTTP 0.0.0.0 80

# Trigger: 3a67 - Client Certificate Auth (XC)
add ssl profile mtls_prof -clientAuth ENABLED
add lb vserver mtls_vs SSL 10.1.1.100 443
bind ssl vserver mtls_vs -sslProfile mtls_prof

# Trigger: 4987 - Weak SSL Protocols
add ssl profile weak_ssl_prof -ssl3 ENABLED -tls1 ENABLED -tls11 ENABLED

# Trigger: 5a5a - Advanced LB Methods (XC)
add lb vserver advanced_lb_vs HTTP 10.1.1.100 80 -lbMethod LEASTRESPONSETIME
add lb vserver hash_lb_vs HTTP 10.1.1.101 80 -lbMethod SRCIPHASH

# Trigger: 681f - Rate Limiting
add lb vserver rate_limit_vs HTTP 10.1.1.100 80 -surgeProtection ON
set lb vserver rate_limit_vs -rateLimitSession 100

# Trigger: 3955 - Script Monitors (NGINX)
add lb monitor script_mon HTTP -scriptName custom_check.sh -scriptArgs "host=web"

# Trigger: 5617 - Backup vServer
add lb vserver primary_vs HTTP 10.1.1.100 80
add lb vserver backup_vs HTTP 10.1.1.200 80
set lb vserver primary_vs -backupVServer backup_vs

# Trigger: 0a0a - GSLB Complexity
add gslb site dc1 10.1.1.1
add gslb service gslb_svc dc1 10.1.1.100 HTTP 80
add gslb domain example.com

# Trigger: 81b2 - Authentication Policies
add authentication policy auth_pol -rule "true" -action ldap_act
add authentication action ldap_act

# Trigger: 016e - Rewrite Policies
add rewrite action rw_act replace "HTTP.REQ.HEADER(\"Host\")" "\"new.example.com\""
add rewrite policy rw_pol "true" rw_act

# Trigger: 232e - Responder Policies
add responder action resp_act respondwith "\"HTTP/1.1 302 Found\\r\\nLocation: https://secure.example.com\\r\\n\\r\\n\""
add responder policy resp_pol "HTTP.REQ.IS_VALID" resp_act
```

---

## Section 5: Integration Test Configs

Comprehensive configs that combine multiple features for realistic testing.

### 5.1 Production-like Web Application

**Config file to create**: `tests/artifacts/apps/productionWeb.ns.conf`

```bash
#NS13.1 Build 49.13
# Production Web Application - Comprehensive Config

# == Servers ==
add server web1 10.10.1.10
add server web2 10.10.1.11
add server web3 10.10.1.12

# == Service Group with Monitors ==
add serviceGroup sg_web_prod HTTP -maxClient 1000 -maxReq 10000 -usip NO
add lb monitor http_health HTTP -respCode 200 -httpRequest "GET /health HTTP/1.1\r\nHost: web.example.com\r\n\r\n" -recv "OK"
bind serviceGroup sg_web_prod web1 80 -weight 100
bind serviceGroup sg_web_prod web2 80 -weight 100
bind serviceGroup sg_web_prod web3 80 -weight 50
bind serviceGroup sg_web_prod -monitorName http_health

# == Profiles ==
add ns tcpProfile tcp_web_optimized -WS ENABLED -SACK ENABLED -nagle DISABLED -mss 1460 -maxBurst 30
add ns httpProfile http_web_optimized -dropInvalReqs ENABLED -maxHeaderLen 24820 -maxReq 100

# == SSL ==
add ssl certKey wildcard_cert -cert wildcard.example.com.crt -key wildcard.example.com.key
add ssl profile ssl_frontend_modern -ssl3 DISABLED -tls1 DISABLED -tls11 DISABLED -tls12 ENABLED -tls13 ENABLED -HSTS ENABLED -maxage 31536000

# == Compression ==
add cmp policy cmp_text -rule "HTTP.RES.HEADER(\"Content-Type\").CONTAINS(\"text\")" -resAction COMPRESS
add cmp policy cmp_json -rule "HTTP.RES.HEADER(\"Content-Type\").CONTAINS(\"json\")" -resAction COMPRESS

# == Rewrite Policies ==
add rewrite action rw_add_security_headers insert_http_header "X-Frame-Options" "\"DENY\""
add rewrite policy rw_security_headers "true" rw_add_security_headers

# == Responder Policies ==
add responder action resp_redirect redirect "\"https://\" + HTTP.REQ.HOSTNAME + HTTP.REQ.URL"
add responder policy resp_http_to_https "HTTP.REQ.IS_VALID && CLIENT.SSL.IS_SSL.NOT" resp_redirect

# == Load Balancer vServer ==
add lb vserver lb_web_prod HTTP 10.1.1.100 80 -persistenceType SOURCEIP -timeout 300 -lbMethod ROUNDROBIN -httpProfileName http_web_optimized -tcpProfileName tcp_web_optimized
bind lb vserver lb_web_prod sg_web_prod

# == SSL vServer ==
add lb vserver lb_web_ssl SSL 10.1.1.100 443 -persistenceType SSLSESSION -timeout 1800 -lbMethod LEASTCONNECTION -httpProfileName http_web_optimized
bind lb vserver lb_web_ssl sg_web_prod
bind ssl vserver lb_web_ssl -certkeyName wildcard_cert
bind ssl vserver lb_web_ssl -sslProfile ssl_frontend_modern
bind lb vserver lb_web_ssl -policyName cmp_text -priority 100 -type RESPONSE
bind lb vserver lb_web_ssl -policyName cmp_json -priority 200 -type RESPONSE
bind lb vserver lb_web_ssl -policyName rw_security_headers -priority 100 -type RESPONSE

# == Content Switching ==
add cs vserver cs_web_prod SSL 10.1.1.200 443 -httpProfileName http_web_optimized
add cs action cs_act_api -targetLBVserver lb_api_prod
add cs action cs_act_web -targetLBVserver lb_web_ssl
add cs policy cs_pol_api -rule "HTTP.REQ.URL.PATH.STARTSWITH(\"/api/\")" -action cs_act_api
add cs policy cs_pol_default -rule "true" -action cs_act_web
bind cs vserver cs_web_prod -policyName cs_pol_api -priority 100
bind cs vserver cs_web_prod -policyName cs_pol_default -priority 1000
bind cs vserver cs_web_prod -lbvserver lb_web_ssl
bind ssl vserver cs_web_prod -certkeyName wildcard_cert
```

**What to validate**:
- Full application abstraction (CS → LB → ServiceGroup → Servers)
- All profiles applied
- SSL certificate bindings
- Compression policies
- Rewrite policies
- Feature detection accuracy
- Complexity scoring

---

## Section 6: Edge Cases & Error Conditions

Configs that may cause parsing issues or edge case handling.

### 6.1 Special Characters and Quoting

**Config file to create**: `tests/artifacts/apps/specialCharacters.ns.conf`

```bash
# Names with spaces (quoted)
add lb vserver "Web App Server" HTTP 10.1.1.100 80
add server "Backend Server 1" 10.10.1.10

# Names with special characters
add server backend-server_01.example.com 10.10.1.11
add serviceGroup sg_app-prod_v2 HTTP

# Expressions with complex quoting
add responder action resp_json respondwith "\"HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\\"status\\\":\\\"ok\\\"}\""

# Rewrite with regex patterns
add rewrite action rw_path_clean replace "HTTP.REQ.URL.PATH" "HTTP.REQ.URL.PATH.REGEX_SELECT(re/\\/+/).REPLACE_ALL(\"/\", \"/\")"

# Cache rules with complex expressions
add cache policy cache_complex -rule "HTTP.REQ.URL.PATH.CONTAINS(\"/static/\") && !HTTP.REQ.URL.QUERY.EXISTS" -action CACHE
```

---

## Summary: Test Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `networkObjects.ns.conf` | VLAN, netProfile, trafficDomain | P1 |
| `profiles.ns.conf` | TCP, HTTP, SSL, DNS profiles | P1 |
| `persistence.ns.conf` | Persistence sessions | P1 |
| `caching.ns.conf` | Cache policies/actions/groups | P1 |
| `compression.ns.conf` | Compression policies/actions | P1 |
| `authorization.ns.conf` | Authorization policies | P1 |
| `rateLimiting.ns.conf` | Rate limits and selectors | P1 |
| `auditLogging.ns.conf` | Syslog and NSLog policies | P1 |
| `spillover.ns.conf` | Spillover policies | P1 |
| `aaaLegacy.ns.conf` | AAA vservers (legacy auth) | P1 |
| `gslbComplete.ns.conf` | Full GSLB site/service/vserver | P2 |
| `appFirewall.ns.conf` | AppFW profiles and policies | P2 |
| `customMonitors.ns.conf` | Script-based and custom monitors | P2 |
| `haCluster.ns.conf` | HA pairs and cluster config | P3 |
| `nFactorAuth.ns.conf` | Multi-factor authentication | P3 |
| `samlAuth.ns.conf` | SAML SSO configuration | P3 |
| `oauthAuth.ns.conf` | OAuth/OIDC configuration | P3 |
| `diagnosticsTriggers.ns.conf` | Trigger diagnostic rules | P2 |
| `productionWeb.ns.conf` | Comprehensive integration test | P2 |
| `specialCharacters.ns.conf` | Edge cases and quoting | P2 |

---

## How to Use These Configs

### Option 1: Generate on Real NetScaler (Recommended)

1. Use NetScaler MCP server to connect to test appliance
2. Execute commands from each config section
3. Export `show ns config` or `save config` output
4. Add exported configs to `tests/artifacts/apps/`
5. Enable skipped tests in `tests/027_objectTypeExpansion.unit.tests.ts`

### Option 2: Create Synthetic Configs

1. Use the config snippets above as test artifacts
2. Add `#NS13.1 Build 49.13` header for version detection
3. Run tests to validate parsing
4. May not catch real-world edge cases

### Validation Steps After Adding Configs

```bash
# 1. Enable skipped tests
# In tests/027_objectTypeExpansion.unit.tests.ts, change:
# describe.skip('Object Type Expansion - BORG Phase 1', () => {
# to:
# describe('Object Type Expansion - BORG Phase 1', () => {

# 2. Run tests
npm run test

# 3. Check coverage
npm run test -- --coverage

# 4. Verify feature detection
# Create test that loads productionWeb.ns.conf and validates:
# - All features detected
# - Complexity score accurate
# - Platform recommendations correct
```

---

**Document Version**: 1.0
**Created**: 2025-12-12
**Author**: Claude Code (automated analysis)
**Related**:
- `specs/BORG_PHASE1_SUMMARY.md`
- `specs/BORG_AUTH_REFERENCE.md`
- `tests/027_objectTypeExpansion.unit.tests.ts`
