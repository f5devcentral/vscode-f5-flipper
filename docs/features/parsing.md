# Configuration Parsing

> How F5 Flipper converts NetScaler configurations into structured JSON

## Overview

The parsing engine is the foundation of F5 Flipper. It converts NetScaler CLI commands into a structured JSON format that can be easily queried and transformed.

## Supported File Formats

### NetScaler Configurations

- **`.conf` files** - Plain text NetScaler configuration
- **`.tgz` archives** - Compressed configuration backups
  - Full backups
  - Basic backups

### A10 Configurations (In Development)

- **ACOS configuration files**
- Coming soon in future releases

## Parsing Process

### 1. File Detection

The extension automatically detects:

- File type (`.conf`, `.tgz`)
- Vendor (NetScaler vs A10 based on syntax)
- Configuration version (when available)

### 2. Archive Extraction

For `.tgz` files:

```
Archive (.tgz)
    ↓
Stream Processing
    ↓
Extract .conf files
Extract certificates (optional)
Extract logs (optional)
```

**Implementation**: [`src/unPackerStream.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/unPackerStream.ts)

### 3. Line Sorting

Config lines are sorted by verb to ensure dependencies are processed in order:

```
add → set → bind → link → enable → disable
```

**Why?** NetScaler requires objects to be created (`add`) before they can be modified (`set`) or referenced (`bind`).

### 4. Regex Pattern Matching

Each config line is matched against patterns in the RegExTree:

**Syntax**: `<verb> (<type>|<type> <subType>) <name> (<details>|<options>|<references>)`

**Example**:

```
add lb vserver app1-80-vsrv HTTP 10.1.1.100 80
│   │  │       │             │    │           │
│   │  │       │             │    │           └─ Port
│   │  │       │             │    └─ IP Address
│   │  │       │             └─ Protocol
│   │  │       └─ Name
│   │  └─ SubType
│   └─ Type
└─ Verb
```

**Implementation**: [`src/regex.ts`](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/regex.ts)

### 5. JSON Tree Construction

The parser creates a nested JSON structure:

```json
{
  "add": {
    "lb": {
      "vserver": {
        "app1-80-vsrv": {
          "protocol": "HTTP",
          "ip": "10.1.1.100",
          "port": "80"
        }
      }
    }
  },
  "bind": {
    "lb": {
      "vserver": {
        "app1-80-vsrv": {
          "serviceGroup": "app1-pool"
        }
      }
    }
  }
}
```

## Supported NetScaler Objects

The parser supports **81 object types** across 11 categories (97% increase from v1.17.0):

### Virtual Servers

- `add lb vserver` - Load balancing virtual servers
- `add cs vserver` - Content switching virtual servers
- `add gslb vserver` - GSLB virtual servers
- `add aaa vserver` - AAA/Authentication virtual servers

### Pools and Servers

- `add serviceGroup` - Service groups (pools)
- `add service` - Individual services
- `add server` - Backend servers
- `add gslb service` - GSLB services

### SSL/TLS

- `add ssl certKey` - SSL certificates
- `add ssl profile` - SSL profiles
- `set ssl profile` - SSL profile configuration
- `bind ssl profile` - SSL profile cipher bindings
- `bind ssl vserver` - Certificate bindings
- `set ssl vserver` - SSL vServer settings

### Profiles (NEW in v1.18.0)

- `add ns tcpProfile` / `set ns tcpProfile` - TCP optimization profiles
- `add ns httpProfile` / `set ns httpProfile` - HTTP profiles
- `add dns profile` / `set dns profile` - DNS profiles
- `add ns netProfile` - Network profiles

### Persistence & Sessions (NEW in v1.18.0)

- `add lb persistenceSession` / `set lb persistenceSession` - Custom persistence

### Cache Policies (NEW in v1.18.0)

- `add cache policy` / `set cache policy` / `bind cache policy` - Caching policies
- `add cache action` - Cache actions
- `add cache contentGroup` - Content groups
- `add cache selector` - Cache selectors

### Compression Policies (NEW in v1.18.0)

- `add cmp policy` / `set cmp policy` / `bind cmp policy` - Compression policies
- `add cmp action` - Compression actions

### Monitors

- `add lb monitor` - Health monitors (HTTP, TCP, UDP, HTTPS, DNS, LDAP, MySQL, RADIUS, etc.)

### Policies

- `add cs policy` / `add cs action` - Content switching policies
- `add authentication policy` / `action` - Authentication
- `add rewrite policy` / `action` - Rewrite rules
- `add responder policy` / `action` - Responder rules
- `add authorization policy` / `action` - Authorization policies (NEW)

### Rate Limiting (NEW in v1.18.0)

- `add ns limitIdentifier` / `set ns limitIdentifier` - Rate limit identifiers
- `add ns limitSelector` - Rate limit selectors

### Audit & Logging (NEW in v1.18.0)

- `add audit nslogAction` - NSLog actions
- `add audit nslogPolicy` - NSLog policies
- `add audit syslogAction` - Syslog actions
- `add audit syslogPolicy` - Syslog policies

### Spillover (NEW in v1.18.0)

- `add spillover policy` - Spillover policies
- `add spillover action` - Spillover actions

### Network

- `add server` - Server definitions
- `add ns ip` - NetScaler IPs
- `add vlan` / `bind vlan` - VLAN configurations (NEW)
- `add ns trafficDomain` / `bind ns trafficDomain` - Traffic domains (NEW)
- `add route` - Static routes
- `add dns nameServer` - DNS servers

### AppFlow

- `add appflow policy` / `action` / `collector` - NetFlow/IPFIX telemetry

**Total Supported Patterns**: 81 (up from 41 in v1.17.0)

For the complete list of supported patterns, see [src/regex.ts](https://github.com/f5devcentral/vscode-f5-flipper/blob/main/src/regex.ts).

## Parsing Features

### IPv6 Support

Fully supports IPv6 addresses:

```
add lb vserver app1-ipv6 HTTP 2001:db8::1 80
```

### Names with Spaces

Handles names containing spaces (quoted):

```
add lb vserver "My App Server" HTTP 10.1.1.100 80
```

### Special Characters

Supports special characters in names and values:

```
add server web-server_01 10.1.1.100
```

### Comments

Preserves and handles comments:

```
# This is a comment
add lb vserver app1 HTTP 10.1.1.100 80
```

## Parser Output

The parser generates:

1. **Structured JSON** - Complete config as JSON tree
2. **Object Index** - Fast lookup by object type and name
3. **Metadata** - Version info, hostname, parsing stats

## Error Handling

### Unsupported Objects

Objects not in the RegExTree are logged but don't fail parsing:

```
Warning: Unsupported object type 'add advanced feature'
```

### Syntax Errors

Malformed lines are flagged:

```
Error: Could not parse line 123: "invalid syntax here"
```

### Version Compatibility

Parser works with NetScaler versions:

- v10.x
- v11.x
- v12.x
- v13.x

## Performance

### Optimization Techniques

- **Streaming** - Process archives without loading entire file into memory
- **Lazy Parsing** - Only parse sections when needed
- **Caching** - Cache parsed results for repeat access

### Benchmarks

Typical parsing times:

- Small config (< 1000 lines): < 1 second
- Medium config (1000-5000 lines): 1-3 seconds
- Large config (5000+ lines): 3-10 seconds

## Debugging Parsed Output

### View Raw JSON

1. Load a configuration
2. Click **"NS Config as JSON"** in Reports section
3. Inspect the parsed structure

### Validate Parsing

Compare original config lines with parsed JSON to verify accuracy.

## Next Steps

- [Application Abstraction](abstraction.md) - How apps are extracted from parsed JSON
- [Diagnostics Engine](diagnostics.md) - Analysis of parsed configurations
- [Architecture Overview](../a10_architecture.md) - Deep dive into parser design
