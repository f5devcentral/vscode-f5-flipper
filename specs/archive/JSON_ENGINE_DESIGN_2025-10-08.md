# JSON Conversion Engine - Design & Implementation Plan

**Status**: ✅ FULLY IMPLEMENTED - All Phases Complete
**Priority**: Critical (Completed)
**Date**: 2025-10-08 (Design), 2025-10-09 (Implementation Complete)
**Related**: PROJECT_ORCID.md Section 2.1

---

## Implementation Status

### ✅ Phase 1: Core Parser - COMPLETE
- [src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts) - RX-based parser implemented
- `parseNsLineWithRx()` function parses all config lines with named capture groups
- Options parsing with `parseNsOptions()` preserving NS format (dashes)
- Objects keyed by name for easy lookup
- Original line preserved with `_line` property

### ✅ Phase 2: Application Abstraction - COMPLETE
- [src/digLbVserverRx.ts](src/digLbVserverRx.ts) - LB vserver digester implemented
- [src/digCsVserverRx.ts](src/digCsVserverRx.ts) - CS vserver digester implemented
- [src/digGslbVserverRx.ts](src/digGslbVserverRx.ts) - GSLB vserver digester implemented
- All digesters read from fully parsed JSON structure
- Parity tests validate identical output to legacy digesters

### ✅ Production Deployment - ACTIVE
- Enabled in [src/CitrixADC.ts:197](src/CitrixADC.ts#L197)
- `parseAdcConfArraysRx()` called for all config processing
- New RX-based digesters (`digLbVserverRx`, `digCsVserversRx`, `digGslbVserversRx`) in production
- Object counting via `countMainObjectsRx()` implemented

### ✅ Testing - COMPLETE
- [tests/300_parseAdcArraysRx.unit.tests.ts](tests/300_parseAdcArraysRx.unit.tests.ts) - 17/17 tests passing
- [tests/301_parseAdcArraysRx.int.tests.ts](tests/301_parseAdcArraysRx.int.tests.ts) - 13/13 integration tests passing
- Comprehensive parity validation between legacy and RX implementations
- All 14 artifact configs tested successfully

### 🐛 Bug Fixes Applied
During implementation, 3 bugs were discovered in original code and fixed in both branches:
- Bug #1: Empty certs array issue (see [specs/archive/BUG_FIXES_2025-10-09.md](specs/archive/BUG_FIXES_2025-10-09.md))
- Bug #2: GSLB server line mislabeling
- Bug #3: GSLB serverDest quote parsing

---

## Executive Summary

Extend existing `AdcConfObj` to store fully parsed objects instead of unparsed strings. Each config line gets fully parsed with RX patterns and all details stored in the JSON tree.

**Key Changes**:
- `string[]` → `Record<name, ParsedObject>`
- RX-based parsing with named capture groups
- Options parsed with `parseNsOptions` (dashes preserved)
- Parallel application abstraction for validation

---

## Progress Summary

### ✅ Phase 1: Core Parser (COMPLETED)

**Completed Work**:
- Created [src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts) - New RX-based parser
- Uses existing RX patterns from [src/regex.ts](src/regex.ts) with named capture groups
- Parses options with `parseNsOptions()` from [src/parseAdcUtils.ts](src/parseAdcUtils.ts)
- Objects keyed by name: `cfgObj.add.lb.vserver.web_vs` (not arrays)
- Preserves original line with `_line` property
- Preserves NS format (keeps dashes: `-persistenceType`)

**Testing**:
- 17/17 tests passing ([tests/300_parseAdcArraysRx.unit.tests.ts](tests/300_parseAdcArraysRx.unit.tests.ts))
- All 14 artifact configs tested successfully
- Handles quoted names, all protocols, service groups, SSL bindings

**Added RX Patterns**:
- `set lb vserver` - Added to [src/regex.ts:90](src/regex.ts#L90)
- `set cs vserver` - Added to [src/regex.ts:92](src/regex.ts#L92)

**Example Output**:
```json
{
  "add": {
    "lb": {
      "vserver": {
        "web_vs": {
          "name": "web_vs",
          "protocol": "HTTP",
          "ipAddress": "10.1.1.100",
          "port": "80",
          "-persistenceType": "COOKIEINSERT",
          "-lbMethod": "ROUNDROBIN",
          "_line": "add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN"
        }
      }
    }
  }
}
```

---

## Phase 2: Application Abstraction Architecture (NEXT)

### Overview

Build new application discovery functions that crawl the fully-parsed JSON structure in parallel to existing digesters. Compare outputs to ensure 100% parity.

### Three Application Entry Points

1. **LB Vserver** (`add lb vserver`) - Load balancing applications
2. **CS Vserver** (`add cs vserver`) - Content switching applications
3. **GSLB Vserver** (`add gslb vserver`) - Global server load balancing applications

### Parallel Development Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PARSE CONFIG (parseAdcArraysRx)                          │
│    ├─ Read ns.conf line by line                             │
│    ├─ Apply RX patterns with named capture groups           │
│    ├─ Parse options with parseNsOptions()                   │
│    └─ Build complete JSON tree                              │
│                                                              │
│    Output: cfgObjFull (AdcConfObjFull)                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APPLICATION ABSTRACTION (Parallel Paths)                 │
│                                                              │
│    Path A: LEGACY                  Path B: NEW (JSON-based) │
│    ├─ parseAdcConfArrays()         ├─ parseAdcConfArraysRx()│
│    ├─ digLbVserver()                ├─ digLbVserverRx()     │
│    ├─ digCsVserver()                ├─ digCsVserverRx()     │
│    ├─ digGslbVserver()              ├─ digGslbVserverRx()   │
│    └─ Output: apps[]                └─ Output: appsRx[]     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATION & COMPARISON                                   │
│    ├─ Compare apps[] vs appsRx[]                            │
│    ├─ Assert identical app counts                           │
│    ├─ Assert identical app properties                       │
│    └─ Assert identical app dependencies                     │
└─────────────────────────────────────────────────────────────┘
```

### New Functions to Create

**File Structure**:
```
src/
├─ digLbVserverRx.ts    # NEW: JSON-based LB vserver discovery
├─ digCsVserverRx.ts    # NEW: JSON-based CS vserver discovery
├─ digGslbVserverRx.ts  # NEW: JSON-based GSLB vserver discovery
├─ digLbVserver.ts      # EXISTING: Legacy string-based
├─ digCsVserver.ts      # EXISTING: Legacy string-based
└─ digGslbVserver.ts    # EXISTING: Legacy string-based
```

### Function Signatures

```typescript
// NEW: JSON-based application discovery
export async function digLbVserverRx(
    cfgObj: AdcConfObjFull,
    appName: string
): Promise<AdcApp[]> {
    const apps: AdcApp[] = [];

    // Iterate over parsed LB vserver objects
    for (const [name, vserver] of Object.entries(cfgObj.add?.lb?.vserver || {})) {
        const app: AdcApp = {
            name: vserver.name,
            type: 'lb',
            protocol: vserver.protocol,
            ipAddress: vserver.ipAddress,
            port: vserver.port,
            lines: [vserver._line],  // Preserve original line
            opts: extractOpts(vserver),  // Extract -key options
            // ... discover bindings, services, etc.
        };

        apps.push(app);
    }

    return apps;
}
```

### Discovery Logic

**LB Vserver Discovery**:
1. Iterate `cfgObj.add.lb.vserver` (keyed by name)
2. Extract properties: name, protocol, ipAddress, port
3. Extract options: all keys starting with `-`
4. Find bindings in `cfgObj.bind.lb.vserver[name]`
5. Resolve service references
6. Build complete `AdcApp` object

**CS Vserver Discovery**:
1. Iterate `cfgObj.add.cs.vserver`
2. Extract properties + options
3. Find policy bindings in `cfgObj.bind.cs.vserver[name]`
4. Resolve `-lbvserver` references (default backend)
5. Resolve `-policyName` references
6. Build CS policy actions and rules
7. Link to target LB vservers (nested `apps` array)

**GSLB Vserver Discovery**:
1. Iterate `cfgObj.add.gslb.vserver`
2. Find service bindings
3. Resolve GSLB service references
4. Build GSLB domain bindings

### Comparison Testing Strategy

**Test File**: `tests/301_appAbstraction_parity.tests.ts`

```typescript
describe('Application Abstraction Parity', () => {
    const testConfigs = [
        'starlord.ns.conf',
        'apple.ns.conf',
        // ... all 14 configs
    ];

    testConfigs.forEach(configFile => {
        it(`should produce identical apps for ${configFile}`, async () => {
            const config = readConfig(configFile);
            const rx = new RegExTree().get('13.1');

            // Legacy path
            const legacyObj: AdcConfObj = {};
            await parseAdcConfArrays(config, legacyObj, rx);
            const legacyApps = await digLbVserver(legacyObj);

            // New JSON path
            const fullObj: AdcConfObjFull = {};
            await parseAdcConfArraysRx(config, fullObj, rx);
            const newApps = await digLbVserverRx(fullObj);

            // Compare
            assert.strictEqual(newApps.length, legacyApps.length);

            for (let i = 0; i < newApps.length; i++) {
                assert.strictEqual(newApps[i].name, legacyApps[i].name);
                assert.strictEqual(newApps[i].type, legacyApps[i].type);
                assert.strictEqual(newApps[i].protocol, legacyApps[i].protocol);
                // ... compare all properties
            }
        });
    });
});
```

### Success Criteria

- [ ] `digLbVserverRx()` produces identical output to `digLbVserver()`
- [ ] `digCsVserverRx()` produces identical output to `digCsVserver()`
- [ ] `digGslbVserverRx()` produces identical output to `digGslbVserver()`
- [ ] All 14 artifact configs pass parity tests
- [ ] App counts match exactly
- [ ] All app properties match (name, type, protocol, IP, port, opts, bindings)
- [ ] Nested app references match (CS → LB relationships)

### Non-Application Config Lines

**Challenge**: Current parser only handles application-related objects. Need to parse ALL config lines including:
- Network config (`add ns ip`, `add route`, `add dns nameServer`)
- System settings (`set ns param`, `set ns hostName`)
- Authentication/authorization policies
- Responder/rewrite policies
- SSL profiles
- Monitors

**Solution**: RX patterns already exist for these in [src/regex.ts](src/regex.ts). Parser handles them automatically.

**Verification**: After parsing, check `cfgObj` contains all sections:
```typescript
assert.ok(cfgObj.add?.ns?.ip);        // Network IPs
assert.ok(cfgObj.add?.route);         // Routes
assert.ok(cfgObj.set?.ns?.hostName);  // Hostname
assert.ok(cfgObj.add?.rewrite?.policy);  // Policies
assert.ok(cfgObj.add?.lb?.monitor);   // Monitors
```

---

## Current State Analysis

### How It Works Today

**File**: [src/parseAdcArrys.ts:10](src/parseAdcArrys.ts#L10)

```typescript
export async function parseAdcConfArrays(config: string[], cfgObj: AdcConfObj, rx: AdcRegExTree) {
    // 1. Sort lines by verb (add → set → bind)
    sortNsLines(config, rx)

    // 2. Loop through lines
    Promise.all(config.map(line => {
        // 3. Match line to RX pattern
        const m1 = parents.filter(el => line.match(el + ' '))[0];

        // 4. Extract body after verb/type
        const body = line.slice(m1.length + 1);  // "web_vs HTTP 10.1.1.100 80"

        // 5. Store UNPARSED string in array
        const tmpObj = nestedObjValue(location, { [name]: [ body ] })
        deepmergeInto(cfgObj, tmpObj)
    }))
}
```

**Current Output** (AdcConfObj):
```typescript
{
  add: {
    lb: {
      vserver: ["web_vs HTTP 10.1.1.100 80"]  // Just a string
    }
  }
}
```

### Problems

- ❌ Stores unparsed strings (must re-parse later)
- ❌ No line reference for VS Code navigation
- ❌ Digesters re-parse strings with regex
- ❌ Hard to query by object name
- ❌ Missing all parsed details (protocol, IP, port)

---

## Proposed Solution

### New Structure

**From**: `string[]` arrays
**To**: `Record<name, object>` with fully parsed properties

```typescript
{
  add: {
    lb: {
      vserver: {
        web_vs: {
          name: "web_vs",
          protocol: "HTTP",
          ipAddress: "10.1.1.100",
          port: "80",
          _line: "add lb vserver web_vs HTTP 10.1.1.100 80"
        },
        api_vs: {
          name: "api_vs",
          protocol: "SSL",
          ipAddress: "10.1.1.101",
          port: "443",
          _line: "add lb vserver api_vs SSL 10.1.1.101 443"
        }
      }
    }
  },
  set: {
    lb: {
      vserver: {
        web_vs: {
          name: "web_vs",
          persistenceType: "COOKIEINSERT",
          lbMethod: "ROUNDROBIN",
          _line: "set lb vserver web_vs -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN"
        }
      }
    }
  },
  bind: {
    lb: {
      vserver: {
        web_vs: {
          name: "web_vs",
          service: ["web_svc_1", "web_svc_2"],
          _line: "bind lb vserver web_vs web_svc_1"
        }
      }
    }
  }
}
```

### Benefits

- ✅ Parse each line once (not twice)
- ✅ Complete JSON representation of config
- ✅ Digesters read structured data (no re-parsing)
- ✅ Easy lookup by name: `cfgObj.add.lb.vserver.web_vs`
- ✅ Original line preserved with `_line` property
- ✅ Easy reference validation
- ✅ Foundation for advanced features (config editing, querying)

---

## Implementation Design

### Core Strategy

1. **Reuse existing structure** - Keep `AdcConfObj` type hierarchy
2. **Add parsing function** - `parseNsLineWithRx()` extracts all properties
3. **Store by name** - Key objects by their name for easy lookup
4. **Merge operations** - Handle add/set/bind for same object
5. **Feature flag** - Build in parallel, easy rollback
6. **Preserve `_line`** - Original config line for display/debugging

---

### Modified parseAdcConfArrays Flow

```typescript
export async function parseAdcConfArrays(
    config: string[],
    cfgObj: AdcConfObj,
    rx: AdcRegExTree,
    useFullParsing: boolean = false  // Feature flag
) {
    sortNsLines(config, rx)

    Promise.all(config.map(line => {
        const m1 = parents.filter(el => line.match(el + ' '))[0];
        if (!m1) return;

        const m2 = m1.trim();
        const location = m2.split(' ');        // ['add', 'lb', 'vserver']
        const name = location.pop() as string; // 'vserver'
        const body = line.slice(m1.length + 1);

        if (useFullParsing) {
            // NEW PATH: Parse fully with RX
            const parsedObj = parseNsLineWithRx(m1, body, line, rx);
            const tmpObj = nestedObjValue(location, {
                [name]: {
                    [parsedObj.name]: parsedObj
                }
            });
            deepmergeInto(cfgObj, tmpObj);
        } else {
            // LEGACY PATH: Store string
            const tmpObj = nestedObjValue(location, { [name]: [ body ] });
            deepmergeInto(cfgObj, tmpObj);
        }
    }))
}
```

---

### New Parsing Function

**File**: Create `src/parseNsLine.ts`

```typescript
import { AdcRegExTree } from './models';

/**
 * Parse NS config line fully with RX patterns
 * @param objectType Full object type (e.g., "add lb vserver")
 * @param body Line body after verb/type (e.g., "web_vs HTTP 10.1.1.100 80")
 * @param fullLine Complete original line
 * @param rx Regex tree
 * @returns Fully parsed object with all properties
 */
export function parseNsLineWithRx(
    objectType: string,
    body: string,
    fullLine: string,
    rx: AdcRegExTree
): Record<string, any> {

    const result: Record<string, any> = {
        _line: fullLine  // Always preserve original line
    };

    // Split body into tokens
    const tokens = body.split(/\s+/);
    result.name = tokens[0];  // First token is always the name

    // Parse based on object type
    if (objectType === 'add lb vserver') {
        // add lb vserver <name> <protocol> <ip> <port>
        if (tokens.length >= 4) {
            result.protocol = tokens[1];
            result.ipAddress = tokens[2];
            result.port = tokens[3];
        }
    }
    else if (objectType === 'add cs vserver') {
        // add cs vserver <name> <protocol> <ip> <port>
        if (tokens.length >= 4) {
            result.protocol = tokens[1];
            result.ipAddress = tokens[2];
            result.port = tokens[3];
        }
    }
    else if (objectType === 'add service') {
        // add service <name> <serverIp> <protocol> <port>
        if (tokens.length >= 4) {
            result.serverIp = tokens[1];
            result.protocol = tokens[2];
            result.port = tokens[3];
        }
    }
    else if (objectType === 'add server') {
        // add server <name> <ip>
        if (tokens.length >= 2) {
            result.ipAddress = tokens[1];
        }
    }
    else if (objectType === 'add serviceGroup') {
        // add serviceGroup <name> <protocol>
        if (tokens.length >= 2) {
            result.protocol = tokens[1];
        }
    }
    else if (objectType.startsWith('set ')) {
        // Parse option flags: -key value pairs
        for (let i = 1; i < tokens.length; i++) {
            if (tokens[i].startsWith('-')) {
                const key = tokens[i].substring(1);  // Remove dash
                const value = tokens[i + 1];
                result[key] = value;
                i++;  // Skip next token (the value)
            }
        }
    }
    else if (objectType.startsWith('bind ')) {
        // bind commands typically: bind <type> <name> <target> [options]
        if (tokens.length >= 2) {
            result.target = tokens[1];

            // Parse any additional options
            for (let i = 2; i < tokens.length; i++) {
                if (tokens[i].startsWith('-')) {
                    const key = tokens[i].substring(1);
                    const value = tokens[i + 1];
                    result[key] = value;
                    i++;
                }
            }
        }
    }

    return result;
}
```

---

### Handling Set/Bind Merging

**Challenge**: Multiple lines modify same object
```
add lb vserver web_vs HTTP 10.1.1.100 80
set lb vserver web_vs -persistenceType COOKIEINSERT
bind lb vserver web_vs web_svc_1
```

**Solution**: `deepmergeInto` will merge properties

```typescript
// After "add" line:
{ web_vs: { name: "web_vs", protocol: "HTTP", ... } }

// After "set" line (merged):
{ web_vs: { name: "web_vs", protocol: "HTTP", persistenceType: "COOKIEINSERT", ... } }

// After "bind" line (merged):
{ web_vs: { name: "web_vs", protocol: "HTTP", persistenceType: "COOKIEINSERT", target: "web_svc_1", ... } }
```

**Note**: May need custom merge logic for arrays (bindings)

---

### Type Updates

**File**: [src/models.ts:275](src/models.ts#L275)

Current AdcConfObj uses `string[]`. Need to support both:

```typescript
// Option 1: Union type (supports both during migration)
export type AdcConfObj = {
    add?: {
        lb?: {
            vserver?: string[] | Record<string, VserverObject>;
        };
        // ... rest
    };
}

// Option 2: New type (feature flag switches between types)
export type AdcConfObjParsed = {
    add?: {
        lb?: {
            vserver?: Record<string, VserverObject>;
        };
        // ... rest
    };
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Tasks**:
1. Create `src/parseNsLine.ts` with `parseNsLineWithRx()`
2. Add feature flag to [package.json](package.json):
   ```json
   "f5.flipper.useFullParsing": {
     "type": "boolean",
     "default": false,
     "description": "Use full JSON parsing (experimental)"
   }
   ```
3. Modify `parseAdcConfArrays` to accept flag parameter
4. Implement basic parsing for `add lb vserver` only
5. Write first test

**Deliverable**: Basic working parser for one object type

---

### Phase 2: Core Objects (Week 2-3)

**Tasks**:
1. Implement parsing for:
   - `add cs vserver`
   - `add service`
   - `add server`
   - `add serviceGroup`
   - `add ssl certKey`
2. Handle `set` commands (option parsing)
3. Handle `bind` commands (target + options)
4. Write unit tests for each type

**Deliverable**: Parser handles all core objects

---

### Phase 3: Complete Coverage (Week 4)

**Tasks**:
1. Add remaining object types:
   - GSLB objects
   - Policy/action objects
   - Monitor objects
   - Profile objects
2. Handle edge cases
3. Custom merge logic for arrays

**Deliverable**: 90%+ object type coverage

---

### Phase 4: Digester Updates (Week 5-6)

**Tasks**:
1. Update [digLbVserver.ts](src/digLbVserver.ts) to read parsed objects
2. Update [digCsVserver.ts](src/digCsVserver.ts)
3. Update [digGslbVserver.ts](src/digGslbVserver.ts)
4. Update [digCStoLbRefs.ts](src/digCStoLbRefs.ts)
5. Remove re-parsing logic from digesters

**Deliverable**: Digesters use parsed JSON

---

### Phase 5: Testing & Validation (Week 7-8)

**Tasks**:
1. Unit tests for all object types (50+ tests)
2. Integration tests (full pipeline)
3. Parity tests (legacy vs new parser)
4. Test with all existing configs
5. Performance benchmarks

**Deliverable**: Full test coverage, parity validated

---

## Testing Strategy

### Test Files

```
tests/
├─ 300_parseNsLine.unit.tests.ts           # Unit tests for parsing
├─ 301_fullParsing_integration.tests.ts    # Integration tests
└─ 302_parity.tests.ts                     # Legacy vs new comparison
```

### Unit Test Example

```typescript
describe('parseNsLineWithRx', () => {
    let rx: AdcRegExTree;

    beforeEach(() => {
        const regexTree = new RegExTree();
        rx = regexTree.get('13.1');
    });

    it('should parse add lb vserver line', () => {
        const result = parseNsLineWithRx(
            'add lb vserver',
            'web_vs HTTP 10.1.1.100 80',
            'add lb vserver web_vs HTTP 10.1.1.100 80',
            rx
        );

        expect(result).toMatchObject({
            name: 'web_vs',
            protocol: 'HTTP',
            ipAddress: '10.1.1.100',
            port: '80',
            _line: 'add lb vserver web_vs HTTP 10.1.1.100 80'
        });
    });

    it('should parse set command with options', () => {
        const result = parseNsLineWithRx(
            'set lb vserver',
            'web_vs -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN',
            'set lb vserver web_vs -persistenceType COOKIEINSERT -lbMethod ROUNDROBIN',
            rx
        );

        expect(result).toMatchObject({
            name: 'web_vs',
            persistenceType: 'COOKIEINSERT',
            lbMethod: 'ROUNDROBIN'
        });
    });
});
```

### Parity Test Example

```typescript
describe('Parity: Legacy vs Full Parsing', () => {
    it('should produce same apps for starlord.ns.conf', async () => {
        const config = readTestConfig('starlord.ns.conf');
        const rx = new RegExTree().get('13.1');

        // Legacy parsing
        const legacyObj: AdcConfObj = {};
        await parseAdcConfArrays(config, legacyObj, rx, false);
        const legacyApps = await digLbVserver(legacyObj);

        // Full parsing
        const fullObj: AdcConfObj = {};
        await parseAdcConfArrays(config, fullObj, rx, true);
        const fullApps = await digLbVserver(fullObj);

        // Compare
        expect(fullApps.length).toBe(legacyApps.length);
        expect(fullApps[0].name).toBe(legacyApps[0].name);
        // ... more assertions
    });
});
```

---

## Open Questions

### Q1: Line Sorting
Keep `sortNsLines()` or process sequentially?

**Decision**: Keep sorting for now (Phase 1-5), revisit later

---

### Q2: Merge Strategy for Arrays
How to handle multiple `bind` commands to same object?

```typescript
bind lb vserver web_vs web_svc_1
bind lb vserver web_vs web_svc_2
```

**Options**:
- A) Store as array: `{ service: ["web_svc_1", "web_svc_2"] }`
- B) Store separate bind objects with merge logic

**Decision**: TBD - Need to test both approaches

---

### Q3: Performance Target
Acceptable slowdown?

**Target**: <2x current parsing time

---

## Success Criteria

- [ ] `parseNsLineWithRx()` parses all core object types
- [ ] Feature flag controls legacy vs full parsing
- [ ] Digesters consume parsed objects (no re-parsing)
- [ ] Parity tests pass (same apps as legacy)
- [ ] >90% test coverage for new code
- [ ] Performance within 2x of legacy
- [ ] Zero breaking changes when flag is off
- [ ] Documentation updated

---

## Next Steps

1. **Create `src/parseNsLine.ts`** with basic structure
2. **Add feature flag** to package.json
3. **Modify `parseAdcConfArrays`** to accept flag parameter
4. **Write first test** for `add lb vserver` parsing
5. **Implement parsing** for one object type
6. **Validate** with test

**Ready to start Phase 1?**

---

---

## Quick Start Guide for Tomorrow

### Current State
- ✅ Parser complete and tested ([src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts))
- ✅ 17/17 tests passing with all 14 configs
- ✅ Options parsing working (dashes preserved)
- ⏸️ Parser NOT enabled in CitrixADC.ts (line 144 commented out)

### Tomorrow's Goals

**Option 1: Start Phase 2 - Application Abstraction**
1. Create `src/digLbVserverRx.ts`
2. Implement basic LB vserver discovery from JSON
3. Create parity test comparing to legacy `digLbVserver()`
4. Test with 1-2 simple configs

**Option 2: Complete Parser Coverage**
1. Add tests for non-application objects (monitors, policies, routes)
2. Verify ALL RX patterns produce correct JSON
3. Test edge cases and error handling

**Option 3: Enable in Production**
1. Uncomment line 144 in CitrixADC.ts
2. Run full test suite
3. Fix any breaking changes
4. Create side-by-side comparison output

### Key Files Reference

**Core Implementation**:
- [src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts) - Main parser (110 lines)
- [src/regex.ts:90-92](src/regex.ts#L90) - Added `set lb/cs vserver` patterns
- [src/CitrixADC.ts:144](src/CitrixADC.ts#L144) - Integration point (commented)

**Tests**:
- [tests/300_parseAdcArraysRx.unit.tests.ts](tests/300_parseAdcArraysRx.unit.tests.ts) - 17 tests, all passing

**Documentation**:
- [JSON_ENGINE_DESIGN.md](JSON_ENGINE_DESIGN.md) - This document
- [PROJECT_ORCID.md](PROJECT_ORCID.md) - Overall project tracking

### Key Decisions Made
1. ✅ Use existing RX patterns (no rewrite needed)
2. ✅ Preserve dashes in option keys (`-persistenceType`)
3. ✅ Objects keyed by name (not arrays)
4. ✅ Store `_line` property with original config
5. ✅ Parse options with `parseNsOptions()`
6. ⏳ Build digesters in parallel for comparison

### Key Decisions Pending
1. When to enable in production?
2. Start Phase 2 (digesters) or finish parser coverage?
3. How to handle bind merging (multiple binds to same object)?

---

**Last Updated**: 2025-10-08 End of Day
**Status**: ✅ Phase 1 Complete - Ready for Phase 2
