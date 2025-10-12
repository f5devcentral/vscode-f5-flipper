# RX Parser Integration Tests

This directory contains integration tests for the new RX-based NetScaler configuration parser.

## Overview

These tests validate the RX parser output against golden snapshots. The snapshots represent known-good parser output and are stored in the `snapshots/` directory.

## Files

- **rxParser.integration.tests.ts** - Main test file that compares parser output against snapshots
- **generateSnapshots.ts** - Script to generate/update golden snapshots
- **snapshots/** - Directory containing JSON snapshot files (one per config file)

## Running Tests

Run all integration tests:
```bash
npm test -- tests/integration/rx-parser/*.tests.ts
```

Run tests for a specific config:
```bash
npm test -- tests/integration/rx-parser/*.tests.ts --grep "apple.ns.conf"
```

## Updating Snapshots

When you make intentional changes to the parser that affect output, you need to update the snapshots:

```bash
npx ts-node tests/integration/rx-parser/generateSnapshots.ts
```

**Important:** Only update snapshots after verifying that the parser changes are correct and intentional!

## Snapshot Format

Each snapshot file contains:
```json
{
  "configFile": "example.ns.conf",
  "generatedAt": "2025-01-12T00:00:00.000Z",
  "apps": [
    {
      "name": "app_name",
      "protocol": "HTTP",
      // ... full app structure
    }
  ]
}
```

## Benefits Over Previous Approach

This snapshot-based approach has several advantages over the old comparison tests:

1. **No dependency on old parser** - Tests don't rely on CitrixADCold anymore
2. **Faster execution** - Only runs the RX parser, not both parsers
3. **Clear regression detection** - Any unintentional output changes are immediately caught
4. **Version control friendly** - Snapshots are committed, showing exactly what changed over time
5. **Easier troubleshooting** - Failed tests show exact diff between expected and actual output

## Test Coverage

Currently tests all 14 sample configurations:
- anyProtocol.ns.conf
- apple.ns.conf
- bren.ns.conf (17 apps)
- dnsLoadBalancer.ns.conf
- fn-2187.ns.conf
- groot.ns.conf (6 apps)
- namaste.conf
- skree.ns.conf
- sslBridge.ns.conf
- starlord.ns.conf (3 apps)
- t1.ns.conf (12 apps)
- tcpLdaps.ns.conf
- tcpListenPolicy.ns.conf
- udpNtp.ns.conf

Total: **50 individual app tests** across 14 config files
