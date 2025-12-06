# Object Type Expansion - Comprehensive Implementation

**Goal**: Expand from 41 to 70+ regex patterns for complete NetScaler config parsing
**Approach**: Add all patterns now, test individually, defer abstraction to real-world testing
**Status**: ✅ **COMPLETE** (2025-10-12)
**Actual Result**: Expanded from 41 to 81 patterns (+39 new patterns, 97% increase)

See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for complete implementation details.

---

## Current State Audit

**Current Patterns (41 total)**:

### ADD Commands (27)

- ✅ `add ns ip`, `add ns ip6`, `add ns rpcNode`
- ✅ `add route`, `add dns nameServer`
- ✅ `add lb vserver`, `add lb monitor`
- ✅ `add ssl certKey`
- ✅ `add server`, `add service`, `add serviceGroup`
- ✅ `add cs vserver`, `add cs action`, `add cs policy`
- ✅ `add gslb vserver`, `add gslb service`, `add gslb site`
- ✅ `add rewrite policy`, `add rewrite action`
- ✅ `add responder policy`, `add responder action`
- ✅ `add authentication policy`, `add authentication action`
- ✅ `add appflow policy`, `add appflow action`, `add appflow collector`

### SET Commands (6)

- ✅ `set ssl vserver`, `set ssl service`
- ✅ `set lb vserver`, `set lb monitor`
- ✅ `set cs vserver`, `set gslb vserver`
- ✅ `set ns param`, `set ns hostName`

### BIND Commands (6)

- ✅ `bind service`, `bind serviceGroup`
- ✅ `bind lb vserver`, `bind cs vserver`
- ✅ `bind ssl service`, `bind ssl vserver`
- ✅ `bind gslb vserver`

### LINK Commands (1)

- ✅ `link gslb site`

### ENABLE Commands (1)

- ✅ `enable ns feature`

---

## New Patterns to Add (39 total)

Source: cstalhood/Get-ADCVServerConfig.ps1 (70+ object types) + NetScaler documentation

### Category 1: Profiles (9 patterns)

**TCP Profiles**:

```typescript
'add ns tcpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns tcpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

**HTTP Profiles**:

```typescript
'add ns httpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns httpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

**SSL Profiles**:

```typescript
'add ssl profile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ssl profile': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind ssl profile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

**DNS Profiles**:

```typescript
'add dns profile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set dns profile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 2: Persistence & Sessions (2 patterns)

```typescript
'add lb persistenceSession': /(?<name>\S+) (?<opts>[\S ]+)/,
'set lb persistenceSession': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 3: Cache Policies (6 patterns)

```typescript
'add cache policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache action': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache contentGroup': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache selector': /(?<name>\S+) (?<opts>[\S ]+)/,
'set cache policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind cache policy': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 4: Compression Policies (4 patterns)

```typescript
'add cmp policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cmp action': /(?<name>\S+) (?<opts>[\S ]+)/,
'set cmp policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind cmp policy': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 5: Rate Limiting (3 patterns)

```typescript
'add ns limitIdentifier': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns limitIdentifier': /(?<name>\S+) (?<opts>[\S ]+)/,
'add ns limitSelector': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 6: Authorization Policies (2 patterns)

```typescript
'add authorization policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add authorization action': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 7: Traffic Domains (2 patterns)

```typescript
'add ns trafficDomain': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind ns trafficDomain': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 8: Audit Policies (4 patterns)

```typescript
'add audit nslogAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit nslogPolicy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit syslogAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit syslogPolicy': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 9: Spillover Policies (2 patterns)

```typescript
'add spillover policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add spillover action': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 10: Network Objects (3 patterns)

```typescript
'add vlan': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind vlan': /(?<name>\S+) (?<opts>[\S ]+)/,
'add ns netProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Category 11: AAA / Legacy Auth (2 patterns)

```typescript
'add aaa vserver': /(?<name>\S+) (?<protocol>\S+) (?<opts>[\S ]+)/,
'bind aaa vserver': /(?<name>\S+) (?<opts>[\S ]+)/,
```

**Total New Patterns**: 39
**Total After Addition**: 41 + 39 = **80 patterns**

---

## Implementation Steps

### Step 1: Add Patterns to regex.ts

**File**: [src/regex.ts](src/regex.ts)
**Location**: Lines 61-103 (inside `regexTree.parents` object)

**Action**: Add all 39 new patterns to the parents object, grouped by category with comments

### Step 2: Update Object Counter

**File**: [src/objectCounter.ts](src/objectCounter.ts)

**Current Function**: `countMainObjectsRx()`
**Action**: Add counts for new object types

**Example**:

```typescript
// Add new object type counts
count += Object.keys(cfgObj.add?.ns?.tcpProfile || {}).length;
count += Object.keys(cfgObj.add?.ns?.httpProfile || {}).length;
count += Object.keys(cfgObj.add?.ssl?.profile || {}).length;
count += Object.keys(cfgObj.add?.cache?.policy || {}).length;
count += Object.keys(cfgObj.add?.cmp?.policy || {}).length;
// ... etc
```

### Step 3: Create Comprehensive Test File

**File**: `tests/027_objectTypeExpansion.unit.tests.ts`

**Structure**: One test per object type category (11 categories)
**Goal**: Verify parser recognizes each pattern and creates objects in `configObjectArryRx`

**Test Pattern**:

```typescript
describe('Category: TCP Profiles', () => {
    it('should parse add ns tcpProfile', async () => {
        const config = `
            #NS13.1 Build 37.38
            add ns tcpProfile tcp_prof_custom -WS ENABLED -SACK ENABLED
        `;
        const adc = new ADC();
        await adc.loadParseFromString(config);

        expect(adc.configObjectArryRx.add?.ns?.tcpProfile).to.exist;
        expect(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']).to.exist;
        expect(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']['-WS']).to.equal('ENABLED');
    });

    it('should parse set ns tcpProfile', async () => {
        // Similar test for set command
    });
});
```

---

## Test Strategy

### Individual Object Type Tests

**Approach**: Test each pattern individually with minimal config
**Focus**: Parsing accuracy (does it recognize the pattern and extract name/opts?)
**NOT Testing**: Application abstraction, feature detection, conversion output

**Coverage Target**: 70+ tests (one per object type pattern)

### Integration Tests

**Use Existing Tests**: Run all 289 existing tests to ensure no regressions
**Real-world Validation**: Defer to when you have:

- Real customer configs
- NetScaler test appliance
- Ability to validate generated configs

### What We're NOT Doing (Yet)

❌ Feature abstraction (which profiles are used where)
❌ Conversion templates (how to convert to F5)
❌ Diagnostics rules (warnings for unsupported features)
❌ UI integration (tree view icons, etc.)

✅ Goal: Parse all object types into JSON structure for future use

---

## Success Criteria

1. ✅ All 39 new patterns added to [src/regex.ts](src/regex.ts)
2. ✅ Object counter updated for new types
3. ✅ 70+ new unit tests passing
4. ✅ Zero regressions (all 289 existing tests pass)
5. ✅ Object count metric increases from ~40 to 70+
6. ✅ Documentation updated (CLAUDE.md, architecture docs)

---

## Future Work (Deferred)

**When you have test appliance + real configs**:

1. **Abstraction**: Determine which profiles/policies matter for conversion
   - Which TCP/HTTP/SSL profiles affect vserver behavior?
   - Which cache/compression policies need conversion?
   - Which rate limiting configs map to F5 features?

2. **Conversion Templates**: Create FAST templates for new object types
   - TCP profile → F5 TCP profile mapping
   - HTTP profile → F5 HTTP profile mapping
   - Cache policy → F5 caching policy mapping

3. **Diagnostics**: Add rules for unsupported features
   - Warn if advanced cache features used
   - Warn if compression algorithms differ
   - Warn if rate limiting exceeds F5 capabilities

4. **Testing**: Validate conversions on F5 appliance
   - Load generated configs
   - Test traffic flows
   - Verify behavior matches NetScaler

---

## Timeline Estimate

**Total Time**: 1 week (40 hours)

- **Day 1 (8h)**: Add all 39 patterns to regex.ts, verify syntax
- **Day 2 (8h)**: Update object counter, create test file structure
- **Day 3 (8h)**: Write tests for Categories 1-6 (~40 tests)
- **Day 4 (8h)**: Write tests for Categories 7-11 (~30 tests), run full suite
- **Day 5 (8h)**: Fix any issues, documentation, code review, merge

---

**Ready to proceed?** Let me know if you want me to start implementing, or if you'd like to adjust the approach!
