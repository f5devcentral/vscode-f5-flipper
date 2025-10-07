# Application Abstraction

> Learn how F5 Flipper extracts complete applications from NetScaler configurations

## Overview

Application abstraction is the process of walking the parsed configuration JSON to extract complete, self-contained application definitions with all their dependencies.

## What is an Application?

An **application** in F5 Flipper is a virtual server and all its associated configuration:

- Virtual server settings
- SSL certificates and profiles
- Pools/service groups
- Backend servers
- Health monitors
- Policies and rules
- Network settings

## Abstraction Process

### Digesters

F5 Flipper uses specialized "digesters" to walk the config tree and extract applications:

1. **LB Vserver Digester** - [`src/digLbVserver.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/digLbVserver.ts)
2. **CS Vserver Digester** - [`src/digCsVserver.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/digCsVserver.ts)
3. **GSLB Vserver Digester** - [`src/digGslbVserver.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/digGslbVserver.ts)
4. **CS-to-LB Reference Digester** - [`src/digCStoLbRefs.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/digCStoLbRefs.ts)

### Load Balancing Virtual Server Abstraction

**Steps:**

1. Start with `add lb vserver`
2. Gather SSL settings from `set ssl vserver`
3. Gather certificate bindings from `bind ssl vserver`
4. Extract pool bindings from `bind lb vserver`
5. For each service group:
   - Get details from `add serviceGroup`
   - Get members from `bind serviceGroup`
   - Follow server references
6. For each service:
   - Get details from `add service`
   - Follow server references
7. Collect monitors from bindings
8. Extract policies (authentication, rewrite, responder, etc.)

**Example Abstracted Application:**

```json
{
  "name": "app1-443-vsrv",
  "type": "lb",
  "protocol": "SSL",
  "destination": {
    "ip": "10.1.1.100",
    "port": "443"
  },
  "ssl": {
    "certificates": [
      {
        "name": "cert1",
        "cert": "/nsconfig/ssl/cert1.crt",
        "key": "/nsconfig/ssl/cert1.key"
      }
    ]
  },
  "pools": [
    {
      "name": "app1-pool",
      "lbMethod": "ROUNDROBIN",
      "members": [
        {
          "server": "web1",
          "ip": "10.1.2.10",
          "port": "443",
          "state": "ENABLED"
        }
      ],
      "monitors": [
        {
          "name": "tcp-443",
          "type": "TCP"
        }
      ]
    }
  ],
  "config": ["add lb vserver...", "bind lb vserver..."]
}
```

### Content Switching Virtual Server Abstraction

**Steps:**

1. Start with `add cs vserver`
2. Extract SSL certificate bindings
3. Extract policy bindings from `bind cs vserver`
4. For each policy:
   - Get policy details from `add cs policy`
   - Get action details from `add cs action`
   - Follow `targetLBVserver` references
5. For each referenced LB vserver:
   - Perform full LB abstraction (nested)
6. Extract default LB vserver (if configured)

**CS Policy Rules:**

Content switching policies contain expressions that route traffic:

```
add cs policy policy1 -rule "HTTP.REQ.URL.PATH.STARTSWITH(\"/api\")"
add cs action action1 -targetLBVserver api-vsrv
bind cs vserver cs1 -policyName policy1 -targetLBVserver api-vsrv
```

This routes `/api/*` traffic to the `api-vsrv` load balancer.

### GSLB Abstraction

**Steps:**

1. Start with `add gslb vserver`
2. Extract GSLB service bindings
3. For each service:
   - Get service details from `add gslb service`
   - Follow site references from `add gslb site`
4. Collect monitors

**GSLB Applications:**

GSLB apps distribute traffic across multiple sites/datacenters:

```json
{
  "name": "global-app",
  "type": "gslb",
  "services": [
    {
      "name": "site1-service",
      "site": "datacenter1",
      "ip": "203.0.113.10",
      "port": "443"
    },
    {
      "name": "site2-service",
      "site": "datacenter2",
      "ip": "198.51.100.10",
      "port": "443"
    }
  ]
}
```

## Dependency Resolution

### Reference Walking

The digesters follow references to build complete apps:

```
CS Vserver
    ↓ (policy → action)
LB Vserver
    ↓ (bind)
Service Group
    ↓ (bind)
Server
```

### Circular Reference Handling

Prevents infinite loops when configs have circular references.

### Missing References

When referenced objects don't exist:
- Warning logged
- Partial app still created
- Diagnostic rule triggered

## Application Types

### Simple LB Application

Direct load balancing with no content switching:

```
Virtual Server → Pool → Servers
```

### CS with Multiple LB Applications

Content switching routing to different backend apps:

```
CS Virtual Server
    ├─ Policy 1 → LB Vserver 1 → Pool 1
    ├─ Policy 2 → LB Vserver 2 → Pool 2
    └─ Default → LB Vserver 3 → Pool 3
```

### GSLB Application

Global traffic distribution:

```
GSLB Virtual Server
    ├─ Service 1 (Site A)
    ├─ Service 2 (Site B)
    └─ Service 3 (Site C)
```

## Abstracted Application Properties

Each abstracted application contains:

### Core Properties
- `name` - Application identifier
- `type` - `lb`, `cs`, or `gslb`
- `protocol` - HTTP, SSL, TCP, UDP, etc.
- `lines` - Original config lines (array)
- `config` - Parsed config object

### Network Properties
- `destination` - IP and port
- `ipv6` - IPv6 address (if applicable)
- `traffic-domain` - Traffic domain ID

### SSL Properties
- `ssl.certificates` - Certificate and key files
- `ssl.profiles` - SSL settings

### Pool Properties
- `pools` - Array of service groups/services
- `pools[].members` - Backend servers
- `pools[].monitors` - Health checks
- `pools[].lbMethod` - Load balancing algorithm

### Policy Properties
- `policies` - Array of policies
- `policies[].type` - Policy type (cs, auth, rewrite, etc.)
- `policies[].rule` - Expression/condition
- `policies[].action` - What happens when rule matches

## Viewing Abstracted Applications

### Via Tree View

1. Load a configuration
2. Expand **Applications** section
3. Click an application to view details

### As JSON

1. Right-click an application
2. Select **"View NS App JSON"**
3. See the complete abstracted structure

### Original Config Lines

1. Right-click an application
2. Select **"View NS App Lines"**
3. See the raw NetScaler config

## Next Steps

- [Diagnostics Engine](diagnostics.md) - Analyzing abstracted applications
- [AS3 Conversion](conversion.md) - Converting apps to F5 AS3
- [Architecture](../a10_architecture.md) - Technical implementation details
