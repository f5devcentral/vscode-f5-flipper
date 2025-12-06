# Bug Fixes Documentation

This document tracks bugs found and fixed during the implementation of the NEW RX-based parsing system.

## Bug #1: Empty Certs Array

**Date Fixed**: 2025-10-09
**Severity**: Medium
**Affected Components**: CS vserver and LB vserver digesters

### Description
The original array-based digesters created empty certificate objects `[{}]` when SSL bindings referenced cert keys but the cert details weren't fully populated. This resulted in malformed output with empty objects in the certs array.

### Affected Apps
- app2_cs_vs
- app2_http_vs
- stp.gslb.f5flipper.com-http-vs
- stp.gslb.f5flipper.com-http-vs-failover
- stp.gslb.f5flipper.com-ssl-vs
- stp.gslb.f5flipper.com-ssl-vs-failover

### Root Cause
SSL binding digestion logic created a cert object scaffold but didn't populate or remove it when no actual cert data was found. The code would create an empty object and push it to the certs array without validation.

### Fix Applied
**Original Code**: Added validation to check if cert object is empty before adding to array
**NEW RX Code**: Ensured cert objects are only created and added when they contain actual data
**Files Modified**:
- src/digCsVserver.ts
- src/digLbVserver.ts
- src/digCsVserverRx.ts
- src/digLbVserverRx.ts

---

## Bug #2: GSLB Server Line Mislabeling

**Date Fixed**: 2025-10-09
**Severity**: High
**Affected Components**: GSLB service digester

### Description
The GSLB service digester incorrectly labeled server configuration lines as "add service" instead of "add server", creating references to non-existent service commands.

### Affected Apps
All GSLB vservers:
- bottle.gslb.f5flipper.com
- ctx1.gslb.f5flipper.com
- dorsal.gslb.f5flipper.com
- echo.gslb.f5flipper.com
- smtp.gslb.f5flipper.com

### Example
**Actual Config**: `add server bottle-nedc 10.56.4.25`
**Buggy Output**: `add service bottle-nedc 10.56.4.25`
**Correct Output**: `add server bottle-nedc 10.56.4.25`

### Root Cause
Hard-coded string `'add service'` in src/digGslbService.ts line 49:
```typescript
const parent = 'add service'  // WRONG
const originalString = parent + ' ' + x;
```

### Fix Applied
**Original Code**: Changed `'add service'` to `'add server'`
**NEW RX Code**: Removed workaround that was replicating the bug
**Files Modified**:
- src/digGslbService.ts
- src/digGslbVserverRx.ts

---

## Bug #3: GSLB ServerDest Quote Parsing

**Date Fixed**: 2025-10-09
**Severity**: Medium
**Affected Components**: GSLB service digester

### Description
The GSLB service digester used naive `split(' ').pop()` to extract server destination, which broke when server definitions included quoted strings (like comments).

### Affected Apps
GSLB vservers with server comments:
- dorsal.gslb.f5flipper.com

### Example
**Config Line**: `add server dorsal-nedc 10.8.101.46 -comment "automated deployment"`
**Expected**: `serverDest: '10.8.101.46'`
**Buggy Output**: `serverDest: 'deployment"'` (last space-separated token)

### Root Cause
Using simple string splitting instead of proper regex-based parsing in src/digGslbService.ts line 52:
```typescript
const serverDest = x.split(' ').pop();  // Breaks on quoted strings
```

### Fix Applied
**Original Code**: Changed to use regex-based parsing to properly extract IP address/hostname
```typescript
// Before (buggy):
const serverDest = x.split(' ').pop();

// After (fixed):
const rxMatch = x.match(rx.parents[parent]);
if (rxMatch && rxMatch.groups) {
    gslbService['serverDest'] = rxMatch.groups.dest;
}
```

**NEW RX Code**: Was already correct - uses parsed `dest` property from regex. Removed workaround that was replicating the bug.
```typescript
// The regex already correctly parses: 'add server dorsal-nedc 10.8.101.46 -comment "automated deployment"'
// Into: { name: 'dorsal-nedc', dest: '10.8.101.46', opts: '-comment "automated deployment"' }
gslbService['serverDest'] = server.dest || server.ipAddress || server.domain;
```

**Files Modified**:
- src/digGslbService.ts (fixed bug)
- src/digGslbVserverRx.ts (removed bug workaround)

---

## Testing Notes

All bug fixes were validated against the test suite in `tests/301_parseAdcArraysRx.int.tests.ts`. Test workarounds for bug compatibility were removed after fixes were applied to both code branches.

### Test Results
- All 13 app comparison tests pass
- Both original and NEW RX implementations produce identical, correct output
- No regression in existing functionality
