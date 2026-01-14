# NetScaler → F5 Feature Mapping Reference

**Source**: PROJECT BORG Analysis of 13 conversion tools  
**Status**: Reference Document  
**Created**: 2026-01-14  
**Updated**: 2026-01-14  
**Usage**: Manual reference, future import into feature detection / coverage system

---

## Architecture Note

This document maps **NetScaler features → F5 TMOS concepts**, NOT to specific output formats.

```
NetScaler Config  →  F5 Concept  →  Output Format
-lbMethod ROUNDROBIN    round-robin     AS3: loadBalancingMode: "round-robin"
                                        TMSH: lb-method round-robin
                                        XC: (future mapping)
```

**Why concept-based?**
- Platform-agnostic - same mappings work for AS3, TMSH, XC, NGINX
- Future-proof - AS3 schema changes don't break this document
- Templates own format-specific translation
- Feature detection output stays stable

---

## Table of Contents

1. [Load Balancing Methods](#1-load-balancing-methods)
2. [Persistence Types](#2-persistence-types)
3. [Monitor Types](#3-monitor-types)
4. [Service Types / Protocols](#4-service-types--protocols)
5. [SSL/TLS Settings](#5-ssltls-settings)
6. [HTTP Profile Settings](#6-http-profile-settings)
7. [TCP Profile Settings](#7-tcp-profile-settings)
8. [Content Switching → iRules](#8-content-switching--irules)
9. [Rewrite/Responder → iRules](#9-rewriteresponder--irules)
10. [Compression Settings](#10-compression-settings)
11. [Cache Settings](#11-cache-settings)
12. [GSLB/GTM Mappings](#12-gslbgtm-mappings)
13. [Authentication/AAA](#13-authenticationaaa)
14. [No F5 Equivalent](#14-no-f5-equivalent)
15. [F5-Only Features](#15-f5-only-features)
16. [Integration Options](#16-integration-options)
17. [Maintenance](#17-maintenance)

---

## 1. Load Balancing Methods

**Source**: ns2f5_tmsh.pl, x2f5, ns2f5.pl (comprehensive)

| NetScaler (`-lbMethod`) | F5 Concept | Confidence | Notes |
|-------------------------|------------|------------|-------|
| `ROUNDROBIN` | `round-robin` | Known | Direct equivalent |
| `LEASTCONNECTION` | `least-connections-member` | Known | Per-member in F5 |
| `LEASTCONNECTIONS` | `least-connections-member` | Known | Alias |
| `LEASTRESPONSETIME` | `fastest-app-response` | Known | Similar concept |
| `LEASTBANDWIDTH` | `least-connections-member` | Uncertain | No direct equivalent |
| `LEASTPACKETS` | `least-connections-member` | Uncertain | No direct equivalent |
| `URLHASH` | `hash` (uri) | Likely | Or use iRule |
| `DOMAINHASH` | `hash` (host) | Likely | Or use iRule |
| `DESTINATIONIPHASH` | `hash` (dst-ip) | Likely | Or use persistence |
| `SOURCEIPHASH` | `hash` (src-ip) | Likely | Or use source-address persistence |
| `SRCIPDESTIPHASH` | `hash` | Uncertain | No direct equivalent |
| `CALLIDHASH` | `sip` profile | Likely | SIP-specific |
| `TOKEN` | `hash` or iRule | Uncertain | Custom logic needed |
| `CUSTOMSERVERID` | iRule | Uncertain | Custom logic needed |
| `LRTM` | `fastest-app-response` | Known | Least Response Time |

### F5 LB Methods (Reference)

| F5 Concept | Description |
|------------|-------------|
| `round-robin` | Rotate through members |
| `ratio-member` | Weighted distribution |
| `ratio-node` | Weighted by node |
| `least-connections-member` | Fewest active connections (member) |
| `least-connections-node` | Fewest active connections (node) |
| `fastest-node` | Quickest response time |
| `fastest-app-response` | Application-layer response time |
| `observed-member` | Dynamic observation |
| `predictive-member` | Predictive algorithm |
| `weighted-least-connections-member` | Weighted + least conn |
| `hash` | Hash-based (configurable key) |

---

## 2. Persistence Types

**Source**: ns2f5_tmsh.pl, x2f5, f52ns.pl

| NetScaler (`-persistenceType`) | F5 Concept | Confidence | Notes |
|--------------------------------|------------|------------|-------|
| `SOURCEIP` | `source-address` | Known | Direct equivalent |
| `COOKIEINSERT` | `cookie` (insert) | Known | Direct equivalent |
| `SSLSESSION` | `ssl` | Known | SSL session ID |
| `RULE` | `universal` | Known | Requires iRule |
| `URLPASSIVE` | `cookie` (passive) | Likely | URL rewriting approach |
| `CUSTOMSERVERID` | `universal` | Known | Requires iRule |
| `DESTIP` | `destination-address` | Known | Direct equivalent |
| `SRCIPDESTIP` | `source-address` | Likely | Use source only |
| `CALLID` | `sip` | Known | SIP Call-ID |
| `RTSPSID` | `hash` | Likely | RTSP session |
| `DIAMETER` | `universal` | Likely | Requires iRule |
| `NONE` | (none) | Known | No persistence |

### Persistence Parameters

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-timeout` | timeout | Session timeout (seconds) |
| `-cookieName` | cookie-name | For cookie persistence |
| `-netmask` | address-mask | For source-address |
| `-v6persistmasklen` | address-mask | IPv6 mask |
| `-cookieDomain` | cookie-domain | Cookie scope |
| `-rule` | iRule reference | For universal persistence |

---

## 3. Monitor Types

**Source**: ns2f5_tmsh.pl, x2f5, ns2f5.pl (comprehensive)

| NetScaler Monitor | F5 Concept | Confidence | Notes |
|-------------------|------------|------------|-------|
| `HTTP` | `http` monitor | Known | Basic HTTP |
| `HTTP-ECV` | `http` monitor | Known | Extended content verification |
| `HTTPS` | `https` monitor | Known | HTTPS |
| `HTTPS-ECV` | `https` monitor | Known | HTTPS with ECV |
| `TCP` | `tcp` monitor | Known | TCP port check |
| `TCP-ECV` | `tcp` monitor | Known | TCP with send/receive |
| `UDP` | `udp` monitor | Known | UDP |
| `UDP-ECV` | `udp` monitor | Known | UDP with ECV |
| `PING` | `icmp` / `gateway-icmp` | Known | ICMP ping |
| `DNS` | `dns` monitor | Known | DNS query |
| `FTP` | `ftp` monitor | Known | FTP login |
| `LDAP` | `ldap` monitor | Known | LDAP bind |
| `RADIUS` | `radius` monitor | Known | RADIUS auth |
| `MYSQL` | `mysql` monitor | Known | MySQL query |
| `MSSQL-ECV` | `external` monitor | Known | Requires script |
| `ORACLE` | `external` monitor | Known | Requires script |
| `SMTP` | `smtp` monitor | Known | SMTP |
| `POP3` | `external` monitor | Known | Requires script |
| `IMAP` | `external` monitor | Known | Requires script |
| `NNTP` | `external` monitor | Known | Requires script |
| `STOREFRONT` | `http` monitor | Likely | Custom HTTP check |
| `CITRIX-XD-DDC` | `http` monitor | Likely | Custom HTTP check |
| `CITRIX-WI-EXTENDED` | `http` monitor | Likely | Custom HTTP check |
| `CITRIX-XNC-ECV` | `http` monitor | Likely | NetScaler Gateway check |
| `USER` | `external` monitor | Known | Custom script |

### Monitor Parameters

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-interval` | interval | Check frequency (seconds) |
| `-resptimeout` | timeout | Response timeout |
| `-retries` | up-interval / time-until-up | Recovery calculation |
| `-successRetries` | up-interval | Success count needed |
| `-downTime` | time-until-up | Recovery time |
| `-destIP` | destination (address) | Override destination |
| `-destPort` | destination (port) | Override port |
| `-httpRequest` | send string | HTTP request |
| `-respCode` | recv string | Expected response codes |
| `-recv` | recv string | Expected string |
| `-send` | send string | Send string |
| `-customHeaders` | send string | Include in request |
| `-secure` | SSL profile | Use SSL/TLS |
| `-baseDN` | base (LDAP) | LDAP base DN |
| `-bindDN` | username (LDAP) | LDAP bind DN |
| `-filter` | filter (LDAP) | LDAP filter |
| `-database` | database | MySQL/MSSQL database |
| `-sqlQuery` | send string | SQL query |

---

## 4. Service Types / Protocols

**Source**: ns2f5_tmsh.pl, x2f5

| NetScaler Service | F5 Concept | Profiles Required | Notes |
|-------------------|------------|-------------------|-------|
| `HTTP` | HTTP virtual | tcp, http | Layer 7 HTTP |
| `SSL` | HTTPS virtual | tcp, http, client-ssl | SSL termination |
| `SSL_BRIDGE` | TCP virtual | tcp, client-ssl | SSL pass-through |
| `TCP` | TCP virtual | tcp | Layer 4 TCP |
| `UDP` | UDP virtual | udp | Layer 4 UDP |
| `DNS` | DNS virtual | udp, dns | DNS over UDP |
| `DNS_TCP` | DNS virtual | tcp, dns | DNS over TCP |
| `FTP` | FTP virtual | tcp, ftp | FTP with ALG |
| `SSL_TCP` | TCP virtual | tcp, client-ssl | SSL + TCP |
| `ANY` | FastL4 virtual | fastl4 | Protocol-agnostic |
| `SIP_UDP` | SIP virtual | udp, sip | SIP over UDP |
| `SIP_TCP` | SIP virtual | tcp, sip | SIP over TCP |
| `SIP_SSL` | SIP virtual | tcp, sip, client-ssl | SIP over TLS |
| `RTSP` | RTSP virtual | tcp, rtsp | RTSP streaming |
| `RADIUS` | RADIUS virtual | udp, radius | RADIUS |
| `MYSQL` | TCP virtual | tcp | MySQL (no ALG) |
| `MSSQL` | TCP virtual | tcp | MSSQL (no ALG) |
| `ORACLE` | TCP virtual | tcp | Oracle (no ALG) |
| `RDP` | TCP virtual | tcp | RDP |
| `TFTP` | UDP virtual | udp, tftp | TFTP |
| `PPTP` | TCP virtual | tcp, pptp | PPTP VPN |
| `DIAMETER` | Diameter virtual | tcp, diameter | Diameter |
| `SSL_DIAMETER` | Diameter virtual | tcp, diameter, client-ssl | Diameter + TLS |
| `FIX` | FIX virtual | tcp, fix | Financial protocol |
| `SMPP` | TCP virtual | tcp | SMPP messaging |

---

## 5. SSL/TLS Settings

**Source**: ns2f5.pl (comprehensive), F5Config.pm

### SSL Profile Mappings

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-sslProfile` | client-ssl / server-ssl profile | Profile reference |
| `-cipherName` | cipher string/group | Cipher suite |
| `-cipherPriority` | cipher order | Cipher ordering |
| `-ssl3` | SSL 3.0 option | (deprecated) |
| `-tls1` | TLS 1.0 option | Protocol version |
| `-tls11` | TLS 1.1 option | Protocol version |
| `-tls12` | TLS 1.2 option | Protocol version |
| `-tls13` | TLS 1.3 option | Protocol version |
| `-snienable` | SNI | Server Name Indication |
| `-serverAuth` | server-ssl profile | Backend SSL |
| `-commonName` | server-name (verify) | CN verification |
| `-sessReuse` | cache-timeout | Session reuse |
| `-sessTimeout` | cache-timeout | Session cache timeout |
| `-dh` | DH params | Diffie-Hellman |
| `-dhCount` | DH key count | DH regeneration |
| `-eRSA` | cipher config | Ephemeral RSA |

### Certificate Bindings

| NetScaler Command | F5 Concept | Notes |
|-------------------|------------|-------|
| `bind ssl vserver -certkeyName` | cert/key pair | Server certificate |
| `bind ssl vserver -CA` | CA bundle / trust | CA for client auth |
| `bind ssl vserver -cipherAliasBinding` | cipher group | Cipher selection |
| `-ocspStapling` | OCSP stapling | Certificate status |
| `-sendCloseNotify` | close-notify | TLS close |

### Cipher Groups

| NetScaler Group | F5 Concept | Notes |
|-----------------|------------|-------|
| `DEFAULT` | default cipher group | Platform default |
| `SECURE` | modern ciphers | No SSLv2/EXPORT/DES/RC4 |
| `HIGH` | HIGH strength | High strength ciphers |
| `MEDIUM` | MEDIUM strength | Medium strength |
| `LOW` | LOW strength | Low strength (avoid) |
| `FIPS` | FIPS cipher group | FIPS 140-2 compliant |

---

## 6. HTTP Profile Settings

**Source**: x2f5, ns2f5.pl (comprehensive)

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-httpProfileName` | http profile | Profile reference |
| `-dropInvalReqs` | bad-request handling | Invalid request action |
| `-markHttp09Inval` | HTTP/0.9 handling | Protocol version |
| `-markConnReqInval` | CONNECT handling | CONNECT method |
| `-maxReq` | max-requests | Max requests per connection |
| `-cmpOnPush` | compression (server push) | Compression trigger |
| `-webSocket` | websocket | WebSocket support |
| `-http2` | http2 profile | HTTP/2 support |
| `-http2Direct` | http2 (direct) | Direct HTTP/2 |
| `-maxHeaderLen` | max-header-size | Max header size |
| `-maxReusePool` | connection reuse | Reuse pool size |
| `-conMultiplex` | oneconnect / multiplex | Connection multiplexing |
| `-reqTimeout` | request-timeout | Request timeout |
| `-adptTimeout` | adaptive timeout | Adaptive timeout |
| `-reqTimeoutAction` | timeout-action | Timeout response |

---

## 7. TCP Profile Settings

**Source**: x2f5, ns2f5.pl (comprehensive)

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-tcpProfileName` | tcp profile | Profile reference |
| `-tcpb` | tcp buffering | TCP buffering |
| `-cka` | keep-alive | Keep-alive |
| `-mss` | mss | Max segment size |
| `-maxBurst` | max-burst | Max burst |
| `-initialCwnd` | init-cwnd | Initial congestion window |
| `-delayedAck` | delayed-acks | Delayed ACK |
| `-oooQSize` | ooo-queue-size | Out-of-order queue |
| `-maxPktPerMss` | pkt-per-mss | Packets per MSS |
| `-pktPerRetx` | pkt-per-retx | Packets per retransmit |
| `-minRto` | min-rto | Min retransmit timeout |
| `-slowStartIncr` | slow-start | Slow start increment |
| `-bufferSize` | send-buffer-size | Buffer size |
| `-flavor` | congestion-control | TCP flavor (BIC, CUBIC) |
| `-dynamicReceiveBuffering` | dynamic-buffering | Dynamic buffering |
| `-ka` | keep-alive-interval | Keep-alive interval |
| `-kaprobeInterval` | keep-alive-interval | Probe interval |
| `-kaMaxProbes` | max-probes | Max probes |
| `-sendBuffsize` | send-buffer-size | Send buffer |
| `-recvBuffsize` | receive-window-size | Receive buffer |
| `-WS` | window-scaling | Window scaling |
| `-WSVal` | window-scale-value | Window scale value |
| `-SACK` | selective-acks | Selective ACK |
| `-TIMESTAMP` | timestamps | TCP timestamps |
| `-nagle` | nagle | Nagle algorithm |
| `-ackaggregation` | ack-aggregation | ACK aggregation |
| `-rstWindowAttenuate` | rst-window | RST window |
| `-rstMaxAck` | rst-max-ack | RST max ACK |
| `-spoofsyndrop` | syn-cookie | Spoof SYN handling |
| `-ecn` | ecn | Explicit congestion notification |
| `-frto` | f-rto | Forward RTO recovery |
| `-fack` | fack | Forward ACK |
| `-tcpmode` | tcp-mode | TCP mode |

---

## 8. Content Switching → iRules

**Source**: ns2f5_tmsh.pl, f52ns.pl

Content switching policies map to F5 iRules or LTM Policies.

### Expression Translations

| NetScaler Expression | F5 iRule Equivalent |
|---------------------|---------------------|
| `REQ.IP.SOURCEIP == "x.x.x.x"` | `[IP::client_addr] equals "x.x.x.x"` |
| `REQ.IP.DESTIP == "x.x.x.x"` | `[IP::local_addr] equals "x.x.x.x"` |
| `HTTP.REQ.URL.STARTSWITH("/path")` | `[HTTP::uri] starts_with "/path"` |
| `HTTP.REQ.URL.CONTAINS("string")` | `[HTTP::uri] contains "string"` |
| `HTTP.REQ.URL.EQ("/exact")` | `[HTTP::uri] equals "/exact"` |
| `HTTP.REQ.URL.ENDSWITH(".jpg")` | `[HTTP::uri] ends_with ".jpg"` |
| `HTTP.REQ.URL.REGEX_MATCH(re#pat#)` | `[HTTP::uri] matches_regex "pat"` |
| `HTTP.REQ.HEADER("Host").CONTAINS("x")` | `[HTTP::header "Host"] contains "x"` |
| `HTTP.REQ.HEADER("Host").EQ("x")` | `[HTTP::header "Host"] equals "x"` |
| `HTTP.REQ.HOSTNAME.EQ("x")` | `[HTTP::host] equals "x"` |
| `HTTP.REQ.COOKIE.CONTAINS("name")` | `[HTTP::cookie "name"] ne ""` |
| `HTTP.REQ.COOKIE.VALUE("n").EQ("x")` | `[HTTP::cookie "n"] equals "x"` |
| `HTTP.REQ.METHOD.EQ("POST")` | `[HTTP::method] equals "POST"` |
| `CLIENT.IP.SRC.IN_SUBNET(x/y)` | `[IP::addr [IP::client_addr] equals x/y]` |
| `SYS.TIME.BETWEEN(hh:mm, hh:mm)` | `[clock format [clock seconds] -format %H:%M]` |
| `HTTP.REQ.URL.PATH.GET(1).EQ("x")` | `[lindex [split [HTTP::path] "/"] 1] eq "x"` |

### CS Policy → iRule Template

```tcl
# NetScaler: add cs policy pol1 -rule "HTTP.REQ.URL.STARTSWITH(\"/api\")"
# F5 iRule:
when HTTP_REQUEST {
    if { [HTTP::uri] starts_with "/api" } {
        pool pool_api_servers
    }
}
```

### Compound Expressions

| NetScaler | F5 iRule |
|-----------|----------|
| `expr1 && expr2` | `{expr1} && {expr2}` or `expr1 and expr2` |
| `expr1 \|\| expr2` | `{expr1} \|\| {expr2}` or `expr1 or expr2` |
| `!expr` | `!{expr}` or `not expr` |
| `(expr)` | `{expr}` |

---

## 9. Rewrite/Responder → iRules

**Source**: ns2f5_tmsh.pl, f52ns.pl

### Rewrite Actions

| NetScaler Action | F5 iRule Command |
|------------------|------------------|
| `replace URL "old" "new"` | `HTTP::uri [string map {"old" "new"} [HTTP::uri]]` |
| `replace_all URL "old" "new"` | `HTTP::uri [string map {"old" "new"} [HTTP::uri]]` |
| `insert_http_header "N" "V"` | `HTTP::header insert "N" "V"` |
| `delete_http_header "N"` | `HTTP::header remove "N"` |
| `replace_http_header "N" "V"` | `HTTP::header replace "N" "V"` |
| `insert_before URL "prefix"` | `HTTP::uri "prefix[HTTP::uri]"` |
| `insert_after URL "suffix"` | `HTTP::uri "[HTTP::uri]suffix"` |
| `replace_all HOST "old" "new"` | `HTTP::header replace Host [string map {...} [HTTP::host]]` |

### Responder Actions

| NetScaler Action | F5 iRule Command |
|------------------|------------------|
| `redirect "url"` | `HTTP::redirect "url"` |
| `redirect "https://" + HOST + URL` | `HTTP::redirect "https://[HTTP::host][HTTP::uri]"` |
| `respondwith "HTTP/1.1 200..."` | `HTTP::respond 200 content "..."` |
| `drop` | `drop` |
| `reset` | `reject` |
| `noop` | (no action) |

### Response Events (HTTP_RESPONSE)

| NetScaler | F5 iRule |
|-----------|----------|
| `HTTP.RES.HEADER("N")` | `when HTTP_RESPONSE { HTTP::header value "N" }` |
| `replace HTTP.RES.HEADER...` | `HTTP::header replace "N" [string map {...} [HTTP::header "N"]]` |

---

## 10. Compression Settings

**Source**: ns2f5.pl (comprehensive)

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `-cmpOnPush` | compression profile | Server push trigger |
| `-cmpAction` | compression action | Compression action |
| `add cmp policy` | compression profile | Compression policy |
| `add cmp action` | compression action | Compression action |
| `-compressibleMimeType` | content-type-include | MIME types to compress |
| `-minSize` | minimum-size | Min size to compress |
| `-maxSize` | (varies) | Max size |
| `-level` | gzip-level | Compression level (1-9) |
| `-windowSize` | gzip-window-size | Window size |
| `-memLevel` | gzip-memory-level | Memory level |

---

## 11. Cache Settings

**Source**: ns2f5.pl (comprehensive)

| NetScaler Param | F5 Concept | Notes |
|-----------------|------------|-------|
| `add cache policy` | web-acceleration profile | Cache policy |
| `add cache contentGroup` | web-acceleration profile | Content group |
| `-maxResSize` | maximum-object-size | Max cached object |
| `-memLimit` | cache size | Memory limit |
| `-weakNegRelExpiry` | negative-caching | Negative cache TTL |
| `-weakPosRelExpiry` | maximum-age | Positive cache TTL |
| `-heurExpiryParam` | heuristic-expiry | Heuristic expiry |
| `-relExpiry` | maximum-age | Relative expiry |
| `-absExpiry` | maximum-age | Absolute expiry |
| `-flashcache` | (varies) | Flash cache |
| `-quickAbortSize` | (varies) | Quick abort size |
| `-cacheControl` | cache-control | Cache-Control header handling |

---

## 12. GSLB/GTM Mappings

**Source**: x2f5, ns2f5.pl (comprehensive)

### GSLB Object Mappings

| NetScaler Object | F5 GTM Concept | Notes |
|------------------|----------------|-------|
| `add gslb site` | Data Center | Geographic location |
| `add gslb service` | Server + Pool member | Service endpoint |
| `add gslb vserver` | Wide IP | DNS-based LB entry point |
| `bind gslb vserver -domainName` | Wide IP FQDN | Domain binding |
| `add dns nsRec` | DNS zone | Name server records |

### GSLB LB Methods

| NetScaler Method | F5 GTM Concept | Confidence | Notes |
|------------------|----------------|------------|-------|
| `ROUNDROBIN` | round-robin | Known | Direct equivalent |
| `LEASTCONNECTION` | least-connections | Known | Direct equivalent |
| `LEASTRESPONSETIME` | round-robin | Uncertain | No direct equivalent |
| `SOURCEIPHASH` | topology | Likely | Source-based routing |
| `LEASTBANDWIDTH` | round-robin | Uncertain | No direct equivalent |
| `LEASTPACKETS` | round-robin | Uncertain | No direct equivalent |
| `STATICPROXIMITY` | topology | Known | Geographic routing |
| `RTT` | round-robin | Uncertain | No direct equivalent |
| `CUSTOMLOAD` | ratio | Likely | Custom weighting |

### GSLB Parameters

| NetScaler Param | F5 GTM Concept | Notes |
|-----------------|----------------|-------|
| `-tolerance` | load-balancing config | Tolerance threshold |
| `-siteIPAddress` | server address | Data center IP |
| `-publicIP` | server address | Public-facing IP |
| `-weight` | ratio | Member weight |
| `-state` | enabled/disabled | Admin state |
| `-persistenceId` | persist-cidr-ipv4 | Persistence ID |
| `-persistMask` | persist-cidr-ipv4 | Persistence mask |
| `-backupLBMethod` | fallback-mode | Backup LB method |

---

## 13. Authentication/AAA

**Source**: ns2f5.pl (comprehensive), Get-ADCVServerConfig

### AAA Object Mappings

| NetScaler Object | F5 APM Concept | Notes |
|------------------|----------------|-------|
| `add aaa vserver` | Access Profile / Virtual | Authentication endpoint |
| `add authentication ldapAction` | LDAP AAA Server | LDAP authentication |
| `add authentication radiusAction` | RADIUS AAA Server | RADIUS authentication |
| `add authentication samlAction` | SAML IdP Connector | SAML SSO |
| `add authentication certAction` | Client Cert Auth | Certificate authentication |
| `add authentication negotiateAction` | Kerberos AAA Server | NTLM/Kerberos |
| `add authentication localPolicy` | Local User DB | Local authentication |
| `add authentication Policy` | Access Policy branch | Auth decision point |
| `add authentication loginSchema` | Logon Page | Custom login page |
| `add authentication vserver` | Access Profile | Auth virtual server |

### LDAP Parameters

| NetScaler Param | F5 APM Concept | Notes |
|-----------------|----------------|-------|
| `-serverIP` | server address | LDAP server |
| `-serverPort` | server port | LDAP port |
| `-baseDN` | search-base-dn | Base DN for search |
| `-bindDN` | admin-dn | Bind DN |
| `-bindDNPassword` | admin-password | Bind password |
| `-ldapHostname` | server hostname | LDAP hostname |
| `-searchFilter` | search-filter | LDAP filter |
| `-groupAttrName` | group-dn | Group attribute |
| `-subAttributeName` | attribute config | Sub-attribute |
| `-secType` | SSL profile | LDAPS |
| `-ssoNameAttribute` | SSO username | SSO attribute |
| `-passwdChange` | password policy | Password change |
| `-nestedGroupExtraction` | nested-group-search | Nested groups |
| `-maxNestingLevel` | nesting-depth | Max nesting |
| `-groupSearchFilter` | group-search-filter | Group filter |

### RADIUS Parameters

| NetScaler Param | F5 APM Concept | Notes |
|-----------------|----------------|-------|
| `-serverIP` | server address | RADIUS server |
| `-serverPort` | server port | RADIUS port |
| `-radKey` | secret | Shared secret |
| `-radNASid` | nas-identifier | NAS ID |
| `-accounting` | accounting | Enable accounting |
| `-callingstationid` | calling-station-id | Caller ID |

---

## 14. No F5 Equivalent

These NetScaler features have **no direct F5 equivalent**. Manual configuration or alternative approaches required.

| NetScaler Feature | F5 Workaround | Notes |
|-------------------|---------------|-------|
| **Traffic Domains** (`-td`) | Route Domains / Partitions | Different isolation model |
| **Net Profiles** (`-netProfile`) | Self IP / Route config | Network-level setting |
| **AppFlow** (`-appflowLog`) | HSL / Analytics | Different telemetry approach |
| **SureConnect** (`-sc`) | OneConnect profile | Connection optimization |
| **Surge Protection** (`-sp`) | Connection rate limiting | DoS protection |
| **Spillover** (`-soMethod`) | Priority Group Activation | Overflow handling |
| **URL Transformation** | iRule / LTM Policy | URL rewriting |
| **SafeNet HSM** | F5 HSM integration | Different vendor config |
| **NetScaler Gateway** | F5 APM | Significant rearchitecture |
| **Bot Management** | F5 Bot Defense / ASM | Different product |
| **AppFirewall** | F5 ASM/AWAF | Different product |
| **Rate Limiting** | iRule / DoS profile | Different approach |
| **GSLB MEP** | GTM iQuery | Different sync protocol |
| **nFactor Auth** | APM Visual Policy Editor | Different auth framework |

---

## 15. F5-Only Features

These F5 features have no NetScaler equivalent - available after migration.

| F5 Feature | Description |
|------------|-------------|
| **iRules** | Full TCL scripting (NS has limited policy expressions) |
| **LTM Policies** | Declarative traffic policies |
| **OneConnect** | Connection multiplexing |
| **TCP Express** | Advanced TCP optimization |
| **HTTP/2 Full Gateway** | Native HTTP/2 support |
| **QUIC** | QUIC protocol support |
| **BIG-IP Next** | Cloud-native deployment |
| **AS3 / Declarative** | Declarative application deployment |
| **APM VPE** | Visual Policy Editor |
| **ASM Behavioral** | Machine learning WAF |
| **AFM** | Advanced Firewall Manager |
| **SSLO** | SSL Orchestration |
| **DNS Express** | Authoritative DNS |
| **CGNAT** | Carrier-Grade NAT |

---

## 16. Integration Options

This document maps to **F5 concepts**, enabling multiple output formats.

### Option 1: Manual Reference ✅ Ready

PS engineers consult this document during conversions.

### Option 2: Feature Detection Enhancement

Add F5 equivalent info to feature detection output:

```json
{
  "feature": "LEASTRESPONSETIME",
  "nsParam": "-lbMethod",
  "detected": true,
  "count": 3,
  "f5Concept": "fastest-app-response",
  "confidence": "known",
  "notes": "Direct equivalent"
}
```

**Files:** `src/featureDetection.ts`, `src/featureDetectionRules.ts`

### Option 3: Coverage Detection System

See [CONVERSION_COVERAGE_SPEC.md](CONVERSION_COVERAGE_SPEC.md)

```typescript
// Concept-based mapping
export const LB_METHODS: Record<string, FeatureMapping> = {
  'ROUNDROBIN': { 
    f5Concept: 'round-robin', 
    confidence: 'known',
    notes: 'Direct equivalent'
  },
  // ...
}
```

### Option 4: Template Integration

Templates translate concepts to format-specific syntax:

```yaml
# AS3 template uses concept
lb_method:
  title: Load Balancing Method
  type: string
  # Values are F5 concepts, template maps to AS3 property
  enum: [round-robin, least-connections-member, fastest-app-response]
```

### Option 5: Multi-Platform Output (Future)

Same mappings support different targets:

| F5 Concept | AS3 Output | TMSH Output | XC Output (Future) |
|------------|------------|-------------|-------------------|
| `round-robin` | `"loadBalancingMode": "round-robin"` | `lb-method round-robin` | TBD |
| `source-address` | `"persistenceMethods": ["source-address"]` | `persist source_addr` | TBD |

---

## 17. Maintenance

### Adding New Mappings

1. Update relevant section in this document
2. Use **F5 concept** (not AS3/TMSH-specific syntax)
3. Include confidence level
4. Note source (BORG tool, customer config, F5 docs)

### Confidence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **Known** | Verified in BORG tools or F5 docs | Use directly |
| **Likely** | Logical equivalent, not fully tested | Test before relying |
| **Uncertain** | Approximate or partial match | Flag for review |
| **None** | No equivalent exists | Document workaround |

### Sources

| Source | Reliability | Notes |
|--------|-------------|-------|
| ns2f5.pl (comprehensive) | High | 8K lines, most complete |
| x2f5 | High | Modern Python |
| ns2f5_tmsh.pl | Medium | Basic but proven |
| f52ns.pl | Medium | Reverse direction |
| Get-ADCVServerConfig | High | 70+ object types |
| NSPEPI | High | Official NetScaler |
| F5 Documentation | Authoritative | Reference |
| Customer configs | Real-world | Edge cases |

---

*Concept-based mapping reference. Last updated: 2026-01-14*
