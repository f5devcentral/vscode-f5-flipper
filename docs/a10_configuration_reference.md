# A10 Thunder ADC Configuration Reference

## Overview

This document provides a technical reference for A10 Thunder ADC configuration structure, syntax, and object model to support parsing and conversion capabilities.

## Configuration Structure

A10 Thunder ADC uses the ACOS (Advanced Core Operating System) command-line interface with an indentation-based hierarchical structure.

### Example Configuration

```
!
! A10 Thunder ADC Configuration Example
! ACOS version 4.1.4
!
hostname thunder-adc-01

! === HEALTH MONITORS ===

health monitor http_check
  method http
    url GET /health.html expect 200
  interval 5 retry 3 timeout 3

health monitor tcp_check
  method tcp
  interval 5 retry 3 timeout 2

! === SSL CONFIGURATION ===

slb template client-ssl webapp_ssl
  cert webapp-cert
  key webapp-key

! === HTTP TEMPLATES ===

slb template http http_template
  insert-client-ip X-Forwarded-For
  insert-client-port X-Forwarded-Port

! === PERSISTENCE TEMPLATES ===

slb template persist source-ip src_persist
  timeout 300

slb template persist cookie cookie_persist
  cookie-name JSESSIONID

! === SOURCE NAT POOLS ===

ip nat pool webapp_srcnat 10.10.10.100 10.10.10.110 netmask /24

! === REAL SERVERS (Backend Servers) ===

slb server web-server-01 10.20.20.11
  port 80 tcp
  port 443 tcp
  health-check http_check

slb server web-server-02 10.20.20.12
  port 80 tcp
  port 443 tcp
  health-check http_check

slb server app-server-01 10.20.20.21
  port 8080 tcp
  health-check tcp_check

! === SERVICE GROUPS ===

slb service-group web_http_pool tcp
  method round-robin
  health-check http_check
  member web-server-01 80
  member web-server-02 80

slb service-group web_https_pool tcp
  method least-connection
  health-check http_check
  member web-server-01 443
  member web-server-02 443

slb service-group app_pool tcp
  method weighted-round-robin
  health-check tcp_check
  member app-server-01 8080 priority 1

! === VIRTUAL SERVERS (VIPs) ===

slb virtual-server webapp_vip 10.10.10.10
  !
  port 80 http
    name webapp_http
    source-nat pool webapp_srcnat
    service-group web_http_pool
    template http http_template
    template persist source-ip src_persist
  !
  port 443 https
    name webapp_https
    source-nat pool webapp_srcnat
    service-group web_https_pool
    template client-ssl webapp_ssl
    template http http_template
    template persist cookie cookie_persist
  !

slb virtual-server api_vip 10.10.10.20
  !
  port 8080 tcp
    name api_service
    source-nat pool webapp_srcnat
    service-group app_pool
    template persist source-ip src_persist
  !
```

---

## Configuration Object Types

### 1. Real Servers (`slb server`)

**Purpose**: Define backend servers and their available ports

```
slb server <server-name> <ip-address>
  port <port-number> <protocol>
  port <port-number> <protocol>
  health-check <monitor-name>
  conn-limit <number>
  weight <number>
```

**Key Attributes**:
- `server-name`: Unique identifier
- `ip-address`: Backend server IP (IPv4 or IPv6)
- `port`: Service ports with protocol (tcp/udp)
- `health-check`: Health monitor assignment
- `conn-limit`: Max concurrent connections
- `weight`: Weighting for load balancing

**NetScaler Equivalent**: `add server` + `add service`

**F5 Mapping**: Pool member address and service port

---

### 2. Service Groups (`slb service-group`)

**Purpose**: Group servers into load-balanced pools

```
slb service-group <group-name> <protocol>
  method <lb-algorithm>
  health-check <monitor-name>
  member <server-name> <port-number>
  member <server-name> <port-number> priority <number>
```

**Key Attributes**:
- `group-name`: Unique pool identifier
- `protocol`: tcp or udp
- `method`: Load balancing algorithm
- `member`: Server:port references
- `priority`: Member priority/weight

**Load Balancing Methods**:
- `round-robin`: Distribute evenly
- `least-connection`: Fewest active connections
- `weighted-round-robin`: Distribution by weight
- `weighted-least-connection`: Weighted + connections
- `fastest-response-time`: Fastest responder
- `least-request`: Fewest total requests
- `service-least-connection`: Per-service connections
- `service-weighted-least-connection`: Weighted per-service

**NetScaler Equivalent**: `add serviceGroup` + `bind serviceGroup`

**F5 Mapping**: Pool with load balancing mode and members

---

### 3. Virtual Servers (`slb virtual-server`)

**Purpose**: Frontend VIP that clients connect to

```
slb virtual-server <vserver-name> <vip-address>
  port <port-number> <protocol>
    name <vport-name>
    service-group <group-name>
    source-nat pool <pool-name>
    template <type> <template-name>
    template persist <type> <template-name>
  port <port-number> <protocol>
    ...
```

**Key Attributes**:
- `vserver-name`: Virtual server identifier
- `vip-address`: Virtual IP address (client-facing)
- `port`: Virtual port configuration block
  - Can have multiple ports per virtual server
  - Each port can use different service groups
  - Each port can apply different templates

**Port-Level Configuration**:
- `service-group`: Backend pool binding
- `source-nat`: SNAT pool for backend connections
- `template`: Profile/policy application
- `acl`: Access control list
- `ha-conn-mirror`: HA session mirroring

**Protocol Types**:
- `tcp`: Layer 4 TCP
- `udp`: Layer 4 UDP
- `http`: Layer 7 HTTP with application awareness
- `https`: Layer 7 HTTPS with SSL termination
- `ssl-proxy`: SSL proxy mode
- `rtsp`, `ftp`, `sip`: Protocol-specific

**NetScaler Equivalent**: `add lb vserver` + `bind lb vserver`

**F5 Mapping**: Virtual server service object (Service_HTTP, Service_HTTPS, Service_TCP)

---

### 4. Health Monitors (`health monitor`)

**Purpose**: Define health check methods

```
health monitor <monitor-name>
  method <type>
    url <method> <path> expect <code>
  interval <seconds>
  retry <count>
  timeout <seconds>
```

**Monitor Types**:
- `http`: HTTP/HTTPS request-response
- `https`: HTTPS with SSL
- `tcp`: TCP port connection
- `icmp`: ICMP ping
- `dns`: DNS query
- `external`: Custom script
- `udp`: UDP port check

**HTTP/HTTPS Options**:
- `url`: HTTP method, path, expected response
- `host`: Host header value
- `post-path`: POST data location
- `maintenance-code`: Status code for maintenance mode

**Common Attributes**:
- `interval`: Check frequency (seconds)
- `retry`: Failures before marking down
- `timeout`: Response timeout (seconds)
- `up-retry`: Successes before marking up

**NetScaler Equivalent**: `add lb monitor`

**F5 Mapping**: Monitor object (HTTP, HTTPS, TCP, etc.)

---

### 5. Templates (`slb template`)

**Purpose**: Reusable configuration profiles

#### Client SSL Template
```
slb template client-ssl <name>
  cert <cert-name>
  key <key-name>
  cipher-suite <suite>
  ssl-version <version>
```

**Purpose**: SSL/TLS termination configuration
- Certificate and key binding
- Cipher suite selection
- SSL/TLS version enforcement
- Client authentication options

**F5 Mapping**: TLS_Server profile

#### Server SSL Template
```
slb template server-ssl <name>
  cert <cert-name>
  key <key-name>
  server-name-indication enable
```

**Purpose**: Backend SSL re-encryption
- Certificate for backend connections
- SNI support
- Certificate verification options

**F5 Mapping**: TLS_Client profile

#### HTTP Template
```
slb template http <name>
  insert-client-ip <header>
  insert-client-port <header>
  keep-alive-timeout <seconds>
  compression enable
```

**Purpose**: HTTP protocol processing
- Header insertion/modification
- Keep-alive settings
- Compression
- Request/response limits

**F5 Mapping**: HTTP_Profile + iRules

#### Persistence Templates
```
slb template persist source-ip <name>
  timeout <seconds>
  netmask <mask>

slb template persist cookie <name>
  cookie-name <name>
  expire <seconds>
```

**Types**:
- `source-ip`: Client IP-based
- `cookie`: HTTP cookie-based
- `ssl-sid`: SSL session ID
- `destination-ip`: Destination IP-based

**F5 Mapping**: Persist objects

---

### 6. Source NAT Pools (`ip nat pool`)

**Purpose**: Define IP pools for source address translation

```
ip nat pool <pool-name> <start-ip> <end-ip> netmask <mask>
```

**Usage**: Backend servers need to see traffic from specific IPs
- Asymmetric routing scenarios
- Backend firewall rules requiring specific sources
- IP-based backend logging

**NetScaler Equivalent**: SNIP configuration, USIP/USNIP

**F5 Mapping**: SNAT_Pool

---

## Configuration Hierarchy

### Object Dependencies

```
┌─────────────────────────────────────┐
│     Virtual Server (VIP:Port)       │  ← Client entry point
└─────────────┬───────────────────────┘
              │
              ├─→ Service Group (Pool) ─────┐
              │                              │
              ├─→ Source NAT Pool            │
              │                              │
              └─→ Templates                  │
                   ├─ SSL                    │
                   ├─ HTTP                   ▼
                   └─ Persistence      ┌──────────────┐
                                       │ Real Servers │  ← Backend
                                       │   (Members)  │
                                       └──────────────┘
                                             │
                                             └─→ Health Monitor
```

### Parsing Order

1. **Health Monitors** - Standalone, no dependencies
2. **Templates** - Standalone, minimal dependencies
3. **Source NAT Pools** - Standalone
4. **Real Servers** - May reference health monitors
5. **Service Groups** - Reference servers and health monitors
6. **Virtual Servers** - Reference service groups, NAT pools, templates

---

## Terminology Mapping

| A10 ACOS | NetScaler | F5 BIG-IP | Description |
|----------|-----------|-----------|-------------|
| slb server | server | node | Backend server definition |
| port | service | pool member | Server:port combination |
| slb service-group | serviceGroup | pool | Group of backend servers |
| member | serviceGroup binding | pool member | Server in a pool |
| slb virtual-server | lb vserver | virtual server | Frontend VIP |
| port (vserver) | lb vserver binding | virtual address | VIP:port |
| health monitor | lb monitor | monitor | Health check |
| template | profile | profile | Configuration template |
| template client-ssl | ssl vserver binding | clientssl profile | Client SSL config |
| template persist | persistenceType | persist profile | Session persistence |
| ip nat pool | SNIP | snatpool | Source NAT addresses |
| method | lb method | lb mode | Load balance algorithm |

---

## Syntax Patterns

### Indentation-Based Hierarchy

A10 uses indentation to show parent-child relationships:

```
slb virtual-server vip1 10.1.1.1    ← Parent object
  port 80 http                      ← Child of virtual-server
    service-group pool1             ← Child of port
    template http http_template     ← Child of port
  port 443 https                    ← Sibling of port 80
    service-group pool2             ← Child of port 443
```

### Command Structure

```
<object-type> <object-name> [parameters]
  <sub-command> [parameters]
  <sub-command> [parameters]
```

### Common Patterns

- Objects begin with keyword: `slb`, `health`, `ip nat`, `vrrp-a`
- Names follow object type
- Parameters can be positional or named
- Negation uses `no` prefix: `no <command>`
- Comments use `!` character

---

## CLI Navigation

```
# Access Levels
ACOS>                           # User EXEC mode (view only)
ACOS> enable                    # Enter privileged EXEC
ACOS#                           # Privileged EXEC mode
ACOS# configure                 # Enter configuration mode
ACOS(config)#                   # Configuration mode

# Common Commands
show running-config             # Display current config
show slb virtual-server         # Show VIP status
show slb service-group          # Show pool status
show slb server                 # Show backend server status
write memory                    # Save configuration
```

---

## Common Configuration Patterns

### Basic HTTP Load Balancing
```
slb server s1 10.1.1.10
  port 80 tcp

slb service-group pool1 tcp
  member s1 80

slb virtual-server vip1 10.0.0.1
  port 80 http
    service-group pool1
```

### HTTPS with SSL Termination
```
slb template client-ssl ssl_prof
  cert mycert
  key mykey

slb virtual-server vip1 10.0.0.1
  port 443 https
    template client-ssl ssl_prof
    service-group pool1
```

### With Persistence and Health Checks
```
health monitor http_mon
  method http
    url GET /health expect 200

slb template persist source-ip persist1
  timeout 600

slb service-group pool1 tcp
  health-check http_mon
  member s1 80

slb virtual-server vip1 10.0.0.1
  port 80 http
    service-group pool1
    template persist source-ip persist1
```

---

## Key Parsing Considerations

1. **Indentation Matters**: Use indentation to determine hierarchy
2. **Multiple Ports per VIP**: One virtual server can have many ports
3. **Reference Resolution**: Members reference servers defined elsewhere
4. **Template Application**: Multiple templates can apply to one object
5. **Protocol Specificity**: Service groups are protocol-typed (TCP/UDP)
6. **Server vs Service**: A10 separates server (host) from service (port)

---

## Notes for Implementation

- **Multi-line blocks**: Track indentation level to know when block ends
- **Reference tracking**: Build dependency graph (servers → groups → vips)
- **Template resolution**: Templates referenced by name, must resolve
- **Default values**: Many parameters have defaults if not specified
- **Version differences**: ACOS versions may have syntax variations
- **Config sections**: Config often has comment sections (marked with `!`)
