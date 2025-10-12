# RX Parser Type System

This document explains the type system for the new RX-based NetScaler configuration parser.

## Overview

The RX parser represents a significant architectural improvement over the old array-based parser:

| Feature | Old Parser (`AdcConfObj`) | RX Parser (`AdcConfObjRx`) |
|---------|---------------------------|----------------------------|
| **Storage** | String arrays | Record objects keyed by name |
| **Parsing** | Config lines stored raw | Fully parsed with named capture groups |
| **Lookup** | Array iteration | Direct key lookup (O(1)) |
| **Type Safety** | Minimal | Comprehensive |
| **Performance** | Slower | Faster |

## Type Hierarchy

```
AdcConfObjRx (root config structure)
  └── Record<string, NsObject> (objects keyed by name)
        └── NsObject (parsed config object)
              ├── name: string (required)
              ├── _line: string (required)
              ├── protocol?: string
              ├── ipAddress?: string
              ├── port?: string
              └── [key: string]: any (options with - prefix)
```

## Core Types

### `AdcConfObjRx`

The root configuration structure. Organizes all NetScaler objects by verb (add/set/bind) and type.

**Structure:**
```typescript
{
  add: {
    lb: {
      vserver: Record<string, NsObject>,
      monitor: Record<string, NsObject>
    },
    cs: {
      vserver: Record<string, NsObject>,
      action: Record<string, NsObject>,
      policy: Record<string, NsObject>
    },
    service: Record<string, NsObject>,
    serviceGroup: Record<string, NsObject>,
    // ... more object types
  },
  set: { /* similar structure */ },
  bind: { /* similar structure */ }
}
```

**Usage:**
```typescript
// Direct lookup by name - O(1)
const vserver = config.add?.lb?.vserver?.["web_vs"];

// Check if object exists
if (config.add?.lb?.vserver?.["web_vs"]) {
  console.log("VServer exists");
}

// Iterate all vservers
for (const [name, vserver] of Object.entries(config.add?.lb?.vserver || {})) {
  console.log(`${name}: ${vserver.ipAddress}:${vserver.port}`);
}
```

### `NsObject`

Represents a single parsed NetScaler configuration object.

**Required Fields:**
- `name` - Object identifier
- `_line` - Original config line (for reference/debugging)

**Common Optional Fields:**
- `protocol` - HTTP, SSL, TCP, DNS, etc.
- `ipAddress` - Virtual server or service IP
- `port` - Port number
- `server` - Backend server name (for services)
- `hostname` - Server hostname
- `address` - Server address

**Options:**
All NetScaler options are stored with their `-` prefix:
- `-persistenceType`
- `-cltTimeout`
- `-maxClient`
- etc.

**Examples:**

```typescript
// LB VServer
{
  name: "web_vs",
  protocol: "HTTP",
  ipAddress: "10.1.1.100",
  port: "80",
  "-persistenceType": "SOURCEIP",
  "-cltTimeout": "180",
  "-timeout": "30",
  _line: "add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType SOURCEIP -cltTimeout 180 -timeout 30"
}

// Service
{
  name: "web_svc",
  server: "server1",
  protocol: "HTTP",
  port: "8080",
  "-maxClient": "1000",
  "-cip": "ENABLED client-ip",
  "-usip": "NO",
  _line: "add service web_svc server1 HTTP 8080 -maxClient 1000 -cip ENABLED client-ip -usip NO"
}

// CS Policy
{
  name: "mobile_policy",
  "-rule": "HTTP.REQ.HEADER(\"User-Agent\").CONTAINS(\"Mobile\")",
  "-action": "mobile_action",
  _line: "add cs policy mobile_policy -rule \"HTTP.REQ.HEADER(\\\"User-Agent\\\").CONTAINS(\\\"Mobile\\\")\" -action mobile_action"
}
```

## Migration from Old Parser

### Old Parser (`AdcConfObj`) - DEPRECATED

```typescript
// Old way - arrays of strings
const vservers = config.add?.lb?.vserver || [];
for (const line of vservers) {
  // Must parse the line manually
  const match = line.match(/add lb vserver (\S+) (\S+) (\S+) (\S+)/);
  if (match) {
    const [, name, protocol, ip, port] = match;
    console.log(`${name}: ${ip}:${port}`);
  }
}
```

### New Parser (`AdcConfObjRx`)

```typescript
// New way - structured objects
const vservers = config.add?.lb?.vserver || {};
for (const [name, vserver] of Object.entries(vservers)) {
  // Already parsed!
  console.log(`${name}: ${vserver.ipAddress}:${vserver.port}`);
}
```

## Benefits

### 1. **Type Safety**
```typescript
// TypeScript knows the structure
const vserver = config.add?.lb?.vserver?.["web_vs"];
if (vserver) {
  console.log(vserver.protocol); // TypeScript autocomplete works!
}
```

### 2. **Performance**
```typescript
// O(1) lookup vs O(n) array search
const vserver = config.add?.lb?.vserver?.["web_vs"]; // Fast!
```

### 3. **No Re-parsing**
```typescript
// Old way - parse every time
const match = line.match(/add lb vserver (\S+) (\S+) (\S+) (\S+)/);

// New way - already parsed
const protocol = vserver.protocol; // Done!
```

### 4. **Options Already Extracted**
```typescript
// Old way - parse options string
const optsMatch = line.match(/-persistenceType (\S+)/);

// New way - already extracted
const persistence = vserver["-persistenceType"]; // Easy!
```

## Common Patterns

### Finding Objects
```typescript
// Get specific object
const vserver = config.add?.lb?.vserver?.["web_vs"];

// Check existence
if (config.add?.cs?.vserver?.["cs_vs"]) {
  // CS vserver exists
}

// Get all of a type
const allServices = config.add?.service || {};
```

### Working with Options
```typescript
// Access options directly
const timeout = vserver["-cltTimeout"];
const persistence = vserver["-persistenceType"];

// Use extractOptions helper to get only options
import { extractOptions } from './parseAdcUtils';
const opts = extractOptions(vserver);
// Returns object with only - prefixed fields
```

### Iterating Objects
```typescript
// Iterate all vservers
for (const [name, vserver] of Object.entries(config.add?.lb?.vserver || {})) {
  console.log(`Processing ${name}`);
  console.log(`  IP: ${vserver.ipAddress}`);
  console.log(`  Port: ${vserver.port}`);
  console.log(`  Protocol: ${vserver.protocol}`);
}
```

### Building Applications
```typescript
// Get related objects
const csVserver = config.add?.cs?.vserver?.["my_cs"];
const policies = config.bind?.cs?.vserver || {};

// Find policies bound to this vserver
for (const [key, binding] of Object.entries(policies)) {
  if (binding.name === csVserver?.name) {
    const policyName = binding["-policyName"];
    const policy = config.add?.cs?.policy?.[policyName];
    // Process policy...
  }
}
```

## Utility Functions

### `extractOptions(obj: NsObject): Record<string, any>`

Extracts only option fields (those prefixed with `-`) from an NsObject.

```typescript
import { extractOptions } from './parseAdcUtils';

const vserver = config.add?.lb?.vserver?.["web_vs"];
const opts = extractOptions(vserver);
// Returns: { "-persistenceType": "SOURCEIP", "-cltTimeout": "180", ... }
```

### `parseNsOptions(str: string, rx: AdcRegExTree): Record<string, string>`

Parses NetScaler option strings into objects.

```typescript
import { parseNsOptions } from './parseAdcUtils';

const optStr = "-persistenceType SOURCEIP -cltTimeout 180 -cip ENABLED client-ip";
const opts = parseNsOptions(optStr, rx);
// Returns: {
//   "-persistenceType": "SOURCEIP",
//   "-cltTimeout": "180",
//   "-cip": "ENABLED client-ip"
// }
```

## Testing

The RX parser has comprehensive snapshot-based integration tests:

```bash
# Run all RX parser tests
npm test -- tests/integration/rx-parser/*.tests.ts

# Update snapshots after intentional changes
npx ts-node tests/integration/rx-parser/generateSnapshots.ts
```

See `tests/integration/rx-parser/README.md` for more details.

## Further Reading

- [Parser Performance Report](./RX-Parser-Performance-Report.md)
- [Integration Tests](../tests/integration/rx-parser/README.md)
- [Type Definitions](../src/models.ts)
