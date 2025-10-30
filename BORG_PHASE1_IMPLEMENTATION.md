# PHASE 1 IMPLEMENTATION PLAN

**PROJECT BORG - Critical Fixes & Parser Enhancements**

---

## Document Overview

**Status**: ✅ **COMPLETE** (2025-10-12)
**Timeline**: 1 week (Actual: 5 days)
**Priority**: 🟢 HIGH (COMPLETED)
**Impact**: HIGH - Expanded object coverage from 41 to 81 types (+97%), improves config completeness

This document provided detailed implementation guidance for Phase 1 of the PROJECT BORG recommendations outlined in [BORG.md](BORG.md). Phase 1 focused on expanding object type coverage to improve configuration parsing completeness.

**Implementation Complete:** All 39 new patterns added, 81 total object types now supported. See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for complete details.

---

## Table of Contents

1. [Phase 1 Overview](#phase-1-overview)
2. [Task 1.1: Object Type Expansion](#task-11-object-type-expansion)
3. [Success Metrics](#success-metrics)
4. [Testing Strategy](#testing-strategy)
5. [Risk Assessment](#risk-assessment)
6. [Implementation Checklist](#implementation-checklist)

---

## Phase 1 Overview

### Goals

Phase 1 focuses on **expanding object type coverage** based on analysis of 13 predecessor NetScaler conversion tools (documented in [BORG.md](BORG.md)).

**Primary Goal**: Expand object type coverage from ~40 to 70+ types

**Scope Decisions**:
- ✅ **Object Type Expansion**: HIGH priority - rounds out Flipper's completeness
- ❌ **nFactor Auth Chains**: Deferred - Advanced use case requiring professional services, low customer demand
- ❌ **Substring Match Prevention**: Not applicable - Flipper's RX parser uses exact object-key matching by design

**Value Proposition**: With 70+ object types, Flipper will have the most complete NetScaler config parser, improving:
- Configuration context and completeness
- Dependency tracking for applications
- Diagnostic accuracy
- Conversion output quality

### Context from BORG Research

**Research Findings** (from [BORG.md](BORG.md#critical-gaps-identified-in-flipper)):

| Feature | Current Status | Priority | Source Tool | Phase 1? |
|---------|---------------|----------|-------------|----------|
| **70+ Object Types** | ⚠️ ~40 types | 🟡 HIGH | cstalhood/Get-ADCVServerConfig | ✅ YES |
| **nFactor Auth Chains** | ❌ Limited | 🔴 CRITICAL* | cstalhood/Get-ADCVServerConfig | ❌ Deferred |

*Critical for auth conversions, but low demand - deferred to future professional services offering. See [BORG_AUTH_REFERENCE.md](BORG_AUTH_REFERENCE.md) for auth patterns/types.

### Architecture Context

Flipper uses a **regex-based parsing engine** with two implementations:

- **Current (RX-based)**: [src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts) - Object-based storage, 2-3x faster (v1.17.0+)
- **Regex Patterns**: [src/regex.ts](src/regex.ts) - RegExTree with named capture groups
- **Main Orchestrator**: [src/CitrixADC.ts](src/CitrixADC.ts) - Coordinates parsing and digestion

**Key Files to Modify**:
- `src/regex.ts` - Add new patterns
- `src/parseAdcArraysRx.ts` - Parser logic improvements
- `src/models.ts` - Type definitions for new objects
- `tests/*` - Test coverage for all changes

---

## Task 1.1: Object Type Expansion

### Problem Statement

**Current Behavior** (Gap):
Flipper currently parses ~**40 object types**. The cstalhood PowerShell parser supports **70+ object types**, revealing significant gaps in Flipper's coverage.

**Missing Object Categories**:
- **Monitors**: Limited monitor types (only HTTP, TCP, UDP)
- **Profiles**: TCP, HTTP, SSL profiles not captured
- **Policies**: Cache, compression, rate limiting policies missing
- **Advanced Features**: AppFlow, spillover, traffic domains not parsed
- **Network Objects**: Routes, VLANs, SNIPs incomplete

**Impact**: Incomplete config parsing leads to:
- Lost configuration context
- Incomplete application abstraction
- Missing dependencies in diagnostics
- Reduced conversion accuracy

### Solution from BORG Research

**Source**: cstalhood/Get-ADCVServerConfig.ps1 ([BORG.md lines 833-895](BORG.md#L833))

**Object Types in cstalhood (70+ total)**:
```
Core LB: lb vserver, lb monitor, service, serviceGroup, server
CS: cs vserver, cs action, cs policy
GSLB: gslb vserver, gslb service, gslb site
SSL: ssl certKey, ssl cipher, ssl profile, ssl vserver, ssl service
Persistence: persistenceSession
Policies: rewrite, responder, cache, compression, appflow, authorization, authentication
Monitors: http, tcp, udp, icmp, https, ftp, dns, ldap, mysql, radius, etc. (25+ types)
Profiles: tcp, http, ssl, dns, diameter, sip, etc.
AAA: authentication vserver, ldap, radius, saml, oauth actions
Advanced: appflow, audit, spillover, cache, compression
Network: vlan, route, ns ip, dns nameServer
```

### Implementation Plan

#### 1.1.1: Audit Current Object Coverage

**Action**: Compare current regex patterns vs cstalhood object types

**Command**:
```bash
# List current object types in regex.ts
grep "'add " src/regex.ts | wc -l
grep "'set " src/regex.ts | wc -l
grep "'bind " src/regex.ts | wc -l

# Compare with cstalhood list (from BORG.md)
```

**Expected Output**: ~40 current patterns, need to add ~30 more

#### 1.1.2: Prioritize Missing Object Types

**Priority 1 (HIGH)** - Critical for application abstraction:
- [ ] TCP profile (`add ns tcpProfile`, `set ns tcpProfile`)
- [ ] HTTP profile (`add ns httpProfile`, `set ns httpProfile`)
- [ ] SSL profile (`add ssl profile`, `set ssl profile`)
- [ ] Persistence session (`add lb persistenceSession`)
- [ ] Cache policy (`add cache policy`, `add cache action`)
- [ ] Compression policy (`add cmp policy`, `add cmp action`)

**Priority 2 (MEDIUM)** - Important for context:
- [ ] Additional monitors (HTTPS, FTP, DNS, LDAP, MySQL, RADIUS, ICMP)
- [ ] Responder policies (already partially supported, expand)
- [ ] Rate limiting (`add ns limitIdentifier`, `add responder policy` with rate limit)
- [ ] Authorization policies (`add authorization policy`)
- [ ] Traffic domains (`add ns trafficDomain`)

**Priority 3 (LOW)** - Nice to have:
- [ ] Diameter profile
- [ ] SIP profile
- [ ] DNS profile
- [ ] Audit policies
- [ ] AppFlow (already partially supported, expand)
- [ ] Spillover policies

#### 1.1.3: Add Regex Patterns (Priority 1)

**File**: [src/regex.ts](src/regex.ts)

**New Patterns**:
```typescript
// In RegExTree class, add to regexTree.parents object:

// ==== TCP Profiles ====
'add ns tcpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns tcpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== HTTP Profiles ====
'add ns httpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns httpProfile': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== SSL Profiles ====
'add ssl profile': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ssl profile': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Persistence Sessions ====
'add lb persistenceSession': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Cache Policies ====
'add cache policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache action': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache contentGroup': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cache selector': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Compression Policies ====
'add cmp policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add cmp action': /(?<name>\S+) (?<opts>[\S ]+)/,
```

#### 1.1.4: Add Regex Patterns (Priority 2)

**Additional Monitors**:
```typescript
// ==== Extended Monitor Types ====
'add lb monitor': /(?<name>\S+) (?<protocol>\S+) (?<opts>[\S ]+)/,  // Already exists, but add specific types:

// Specific monitor types (protocol field will capture these)
// HTTPS, HTTPS-ECV, FTP, FTP-EXTENDED, DNS, DNS-TCP, LDAP, MYSQL, RADIUS, RADIUS_ACCOUNTING,
// SMTP, NNTP, POP3, SNMP, RTSP, CITRIX-AG, CITRIX-AAC-LOGINPAGE, CITRIX-AAC-LAS,
// SIP-UDP, SIP-TCP, USER (custom), STOREFRONT, APPC, CITRIX-XD-DDC, CITRIX-WI-EXTENDED,
// etc.

// No regex changes needed - protocol is already captured as named group
```

**Authorization & Rate Limiting**:
```typescript
// ==== Authorization ====
'add authorization policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add authorization action': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Rate Limiting ====
'add ns limitIdentifier': /(?<name>\S+) (?<opts>[\S ]+)/,
'set ns limitIdentifier': /(?<name>\S+) (?<opts>[\S ]+)/,
'add ns limitSelector': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Traffic Domains ====
'add ns trafficDomain': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind ns trafficDomain': /(?<name>\S+) (?<opts>[\S ]+)/,
```

#### 1.1.5: Add Regex Patterns (Priority 3)

**Advanced Profiles**:
```typescript
// ==== Diameter Profile ====
'add ns diameter': /(?<opts>[\S ]+)/,

// ==== SIP Profile ====
'add lb sipParameters': /(?<opts>[\S ]+)/,

// ==== DNS Profile ====
'add dns profile': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Audit Policies ====
'add audit nslogAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit nslogPolicy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit syslogAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add audit syslogPolicy': /(?<name>\S+) (?<opts>[\S ]+)/,

// ==== Spillover ====
'add spillover policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'add spillover action': /(?<name>\S+) (?<opts>[\S ]+)/,
```

#### 1.1.6: Update Object Counter

**File**: [src/objectCounter.ts](src/objectCounter.ts)

**Purpose**: Update `countMainObjectsRx()` to count new object types

**Changes**:
```typescript
export function countMainObjectsRx(cfgObj: AdcConfObjRx): number {
    let count = 0;

    // Existing counts
    count += Object.keys(cfgObj.add?.lb?.vserver || {}).length;
    count += Object.keys(cfgObj.add?.cs?.vserver || {}).length;
    count += Object.keys(cfgObj.add?.gslb?.vserver || {}).length;
    count += Object.keys(cfgObj.add?.service || {}).length;
    count += Object.keys(cfgObj.add?.serviceGroup || {}).length;
    count += Object.keys(cfgObj.add?.server || {}).length;
    count += Object.keys(cfgObj.add?.lb?.monitor || {}).length;
    count += Object.keys(cfgObj.add?.ssl?.certKey || {}).length;

    // Add new counts (Priority 1)
    count += Object.keys(cfgObj.add?.ns?.tcpProfile || {}).length;
    count += Object.keys(cfgObj.add?.ns?.httpProfile || {}).length;
    count += Object.keys(cfgObj.add?.ssl?.profile || {}).length;
    count += Object.keys(cfgObj.add?.lb?.persistenceSession || {}).length;
    count += Object.keys(cfgObj.add?.cache?.policy || {}).length;
    count += Object.keys(cfgObj.add?.cmp?.policy || {}).length;

    // Add new counts (Priority 2)
    count += Object.keys(cfgObj.add?.authentication?.vserver || {}).length;
    count += Object.keys(cfgObj.add?.authorization?.policy || {}).length;
    count += Object.keys(cfgObj.add?.ns?.limitIdentifier || {}).length;
    count += Object.keys(cfgObj.add?.ns?.trafficDomain || {}).length;

    // Add new counts (Priority 3)
    count += Object.keys(cfgObj.add?.audit?.nslogPolicy || {}).length;
    count += Object.keys(cfgObj.add?.spillover?.policy || {}).length;

    return count;
}
```

#### 1.1.7: Testing

**Test File**: `tests/027_objectTypeExpansion.unit.tests.ts`

**Test Strategy**:
- Create config snippets for each new object type
- Parse with `loadParseFromString()`
- Verify objects appear in `configObjectArryRx`
- Count objects with `countMainObjectsRx()`

**Test Cases**:
```typescript
import { describe, it } from 'mocha';
import { expect } from 'chai';
import ADC from '../src/CitrixADC';

describe('Object Type Expansion', () => {

    describe('TCP Profiles', () => {
        it('should parse TCP profile objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns tcpProfile tcp_prof_custom -WS ENABLED -SACK ENABLED -nagle ENABLED
                set ns tcpProfile nstcp_default_profile -maxBurst 30
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.ns?.tcpProfile).to.exist;
            expect(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']).to.exist;
            expect(adc.configObjectArryRx.add.ns.tcpProfile['tcp_prof_custom']['-WS']).to.equal('ENABLED');
        });
    });

    describe('HTTP Profiles', () => {
        it('should parse HTTP profile objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns httpProfile http_prof_custom -dropInvalReqs ENABLED -markHttp09Inval ENABLED
                set ns httpProfile nshttp_default_profile -maxHeaderLen 24820
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.ns?.httpProfile).to.exist;
            expect(adc.configObjectArryRx.add.ns.httpProfile['http_prof_custom']).to.exist;
        });
    });

    describe('SSL Profiles', () => {
        it('should parse SSL profile objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ssl profile ssl_prof_custom -ssl3 DISABLED -tls1 ENABLED -tls11 ENABLED -tls12 ENABLED
                set ssl profile ns_default_ssl_profile_frontend -sessReuse ENABLED
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.ssl?.profile).to.exist;
            expect(adc.configObjectArryRx.add.ssl.profile['ssl_prof_custom']).to.exist;
        });
    });

    describe('Persistence Sessions', () => {
        it('should parse persistence session objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add lb persistenceSession custom_persist_session -persistenceType SOURCEIP -timeout 3600
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.lb?.persistenceSession).to.exist;
            expect(adc.configObjectArryRx.add.lb.persistenceSession['custom_persist_session']).to.exist;
        });
    });

    describe('Cache Policies', () => {
        it('should parse cache policy and action objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cache policy cache_pol -rule "HTTP.REQ.URL.CONTAINS(\"/images/\")" -action cache_act
                add cache action cache_act -storeinGroup images_group
                add cache contentGroup images_group -maxResSize 500000
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.cache?.policy).to.exist;
            expect(adc.configObjectArryRx.add.cache.policy['cache_pol']).to.exist;
            expect(adc.configObjectArryRx.add.cache.action['cache_act']).to.exist;
        });
    });

    describe('Compression Policies', () => {
        it('should parse compression policy objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add cmp policy cmp_pol -rule "HTTP.RES.HEADER(\"Content-Type\").CONTAINS(\"text\")" -resAction COMPRESS
                add cmp action cmp_act_gzip -cmpType gzip
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.cmp?.policy).to.exist;
            expect(adc.configObjectArryRx.add.cmp.policy['cmp_pol']).to.exist;
        });
    });

    describe('Authorization Policies', () => {
        it('should parse authorization policy objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add authorization policy authz_pol -rule "HTTP.REQ.USER.IS_MEMBER_OF(\"Admins\")" -action ALLOW
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.authorization?.policy).to.exist;
            expect(adc.configObjectArryRx.add.authorization.policy['authz_pol']).to.exist;
        });
    });

    describe('Rate Limiting', () => {
        it('should parse rate limit identifier objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns limitIdentifier limit_api_calls -threshold 1000 -timeSlice 60000 -mode REQUEST_RATE
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.ns?.limitIdentifier).to.exist;
            expect(adc.configObjectArryRx.add.ns.limitIdentifier['limit_api_calls']).to.exist;
        });
    });

    describe('Traffic Domains', () => {
        it('should parse traffic domain objects', async () => {
            const config = `
                #NS13.1 Build 37.38
                add ns trafficDomain 10 -aliasName "DMZ"
                bind ns trafficDomain 10 -vlan 100
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            expect(adc.configObjectArryRx.add?.ns?.trafficDomain).to.exist;
            expect(adc.configObjectArryRx.add.ns.trafficDomain['10']).to.exist;
        });
    });

    describe('Object Counter', () => {
        it('should count new object types', async () => {
            const config = `
                #NS13.1 Build 37.38
                add lb vserver web_vs HTTP 10.1.1.100 80
                add ns tcpProfile tcp_prof -WS ENABLED
                add ns httpProfile http_prof -dropInvalReqs ENABLED
                add ssl profile ssl_prof -tls12 ENABLED
                add cache policy cache_pol -rule true -action CACHE
                add cmp policy cmp_pol -rule true -resAction COMPRESS
                add authentication vserver auth_vs SSL 10.1.1.200 443
                add authorization policy authz_pol -rule true -action ALLOW
                add ns limitIdentifier limit1 -threshold 100
            `;

            const adc = new ADC();
            await adc.loadParseFromString(config);

            // Should count all 9 objects
            const count = adc.stats.objectCount;
            expect(count).to.be.greaterThanOrEqual(9);
        });
    });
});
```

### Deliverables

- [ ] Updated: `src/regex.ts` with 30+ new patterns
- [ ] Updated: `src/objectCounter.ts` to count new types
- [ ] New test file: `tests/027_objectTypeExpansion.unit.tests.ts`
- [ ] Documentation: List of all supported object types

### Success Criteria

✅ **Task 1.1 Complete When**:
1. Object type coverage increases from ~40 to 70+ types
2. Parser recognizes all Priority 1 object types (6 types)
3. Parser recognizes all Priority 2 object types (5 types)
4. Parser recognizes all Priority 3 object types (5+ types)
5. Object counter accurately counts new types
6. 30+ new tests passing
7. Zero regressions in existing tests
8. Documentation updated

**Estimated Time**: 1 week (40 hours)

---

## Success Metrics

### Phase 1 Overall Success Criteria

✅ **Phase 1 Complete When ALL Tasks Met**:

| Metric | Target | Tracking |
|--------|--------|----------|
| **Substring Match Prevention** | 100% exact matching | Task 1.1 tests passing |
| **nFactor Chain Walking** | 5-level depth support | Task 1.2 tests passing |
| **Object Type Coverage** | 40 → 70+ types | Object counter, Task 1.3 tests |
| **New Tests Added** | 97+ tests (27+40+30) | Test count: `npm run test` |
| **Test Pass Rate** | 100% (zero regressions) | CI/CD green |
| **Code Coverage** | Maintain 92%+ lines | Coverage report |
| **Documentation** | All new code documented | JSDoc, architecture docs |

### Key Performance Indicators (KPIs)

**Parsing Accuracy**:
- ✅ No false positive object matches (substring bug fixed)
- ✅ No missing object references (exact matching working)
- ✅ Complete auth chain capture (nFactor chains at 5 levels)

**Feature Completeness**:
- ✅ Authentication support: 0 → 100% (Task 1.2)
- ✅ Object type coverage: ~57% → 100% (40 → 70+ types, Task 1.3)
- ✅ Parsing patterns: +50 new regex patterns (Tasks 1.2, 1.3)

**Code Quality**:
- ✅ Test coverage: 92.47% → 93%+ (new tests added)
- ✅ Zero regressions: All 289 existing tests pass
- ✅ Type safety: All new code fully typed

---

## Testing Strategy

### Test Pyramid

**Unit Tests** (Fast, many):


- `tests/027_objectTypeExpansion.unit.tests.ts` - 30+ tests
- **Total**: 30+ new unit tests

**Integration Tests** (Medium speed, some):
- Use existing test artifacts: [tests/artifacts/](tests/artifacts/)
- Validate end-to-end parsing with new features
- Ensure application abstraction accuracy
- **Count**: Run all 289 existing tests for regression

**Snapshot Tests** (Fast, validate output):
- Update snapshots if output changes (expected)
- Validate JSON structure for new object types
- **Action**: `npm run test -- -u` to update snapshots

### Test Execution

**Commands**:
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- 

# Run tests with coverage
npm run test -- --coverage

# Watch mode during development
npm run test -- --watch

# Update snapshots (if needed)
npm run test -- -u
```

**CI/CD Integration**:
- GitHub Actions should run on every commit
- Must pass before merge to main
- Coverage report uploaded to coverage service

### Test Data

**Synthetic Configs**: Use `loadParseFromString()` for targeted unit tests
**Real Configs**: Use existing [tests/artifacts/](tests/artifacts/) for integration
**Production Configs**: If available, test with sanitized production data (see PROJECT_ORCID.md section 3.2)

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Breaking Changes** | HIGH | LOW | Comprehensive regression testing, snapshot tests |
| **Performance Degradation** | MEDIUM | LOW | Benchmark before/after, RX parser already 2-3x faster |
| **Complex nFactor Logic** | HIGH | MEDIUM | Extensive unit tests, cycle detection, max depth limit |
| **Regex Pattern Conflicts** | MEDIUM | LOW | Test coverage, manual review of patterns |
| **Type System Changes** | LOW | LOW | Incremental type additions, backward compatible |

### Project Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Timeline Overrun** | MEDIUM | MEDIUM | Break tasks into smaller chunks, prioritize critical items |
| **Scope Creep** | MEDIUM | MEDIUM | Stick to Phase 1 scope, defer non-critical items to Phase 2 |
| **Resource Availability** | HIGH | LOW | Single developer (Ted), predictable timeline |
| **Integration Issues** | LOW | LOW | Modular design, isolated changes per task |

### Acceptance Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **User Confusion** | LOW | LOW | No UI changes in Phase 1, purely internal improvements |
| **Documentation Gaps** | MEDIUM | MEDIUM | JSDoc all functions, update architecture docs |
| **Test Data Availability** | LOW | LOW | Synthetic configs sufficient, loadParseFromString() enables easy testing |

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review [BORG.md](BORG.md) research findings
- [ ] Review [PROJECT_ORCID.md](PROJECT_ORCID.md) section 2.2 (Parser Refinements)
- [ ] Ensure all existing tests pass: `npm run test`
- [ ] Create feature branch: `git checkout -b phase1-borg-object-expansion`
- [ ] Capture baseline metrics (test count, coverage, object count)


### Task 1.1: Object Type Expansion (Week 1)

- [ ] Day 1: Audit current object coverage, prioritize missing types
- [ ] Day 2: Add Priority 1 regex patterns (6 types)
- [ ] Day 3: Add Priority 2 & 3 regex patterns (10+ types)
- [ ] Day 4: Update object counter, write tests `tests/027_objectTypeExpansion.unit.tests.ts`
- [ ] Day 5: Integration testing, documentation

**Exit Criteria**: ✅ Object count increases to 70+ types

### Post-Implementation

- [ ] Run full test suite: `npm run test`
- [ ] Verify coverage maintains 92%+: Check coverage report
- [ ] Update documentation: [CLAUDE.md](CLAUDE.md), [docs/architecture.md](docs/architecture.md)
- [ ] Create pull request with detailed description
- [ ] Code review (self or peer)
- [ ] Merge to main branch
- [ ] Update [PROJECT_ORCID.md](PROJECT_ORCID.md) status for Phase 1 → Complete ✅

---

## Next Steps (Phase 2 Preview)

After Phase 1 completion, proceed to **Phase 2: AppFW & Expression Parsing** ([BORG.md lines 115-122](BORG.md#L115)):

**Phase 2 Goals** (Weeks 5-12):
1. **AppFW Support** (3 weeks) - Parse Application Firewall policies, profiles
2. **Expression Parser Integration** (4 weeks) - Integrate NSPEPI or build custom parser

**Preparation**:
- [ ] Review [BORG.md](BORG.md) AppFW analysis (ns2f5.pl comprehensive)
- [ ] Review [BORG.md](BORG.md) NSPEPI tool analysis (PLY-based parser)
- [ ] Assess expression parsing requirements (NetScaler → iRule conversion)

---

## References

- **[BORG.md](BORG.md)** - Complete research document (13 tools analyzed)
- **[PROJECT_ORCID.md](PROJECT_ORCID.md)** - Project planning document
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and architecture
- **cstalhood/Get-ADCVServerConfig.ps1** - https://github.com/cstalhood/PowerShell/blob/master/Get-ADCVServerConfig.ps1
- **NSPEPI** - https://github.com/citrix/ADM-StyleBooks/tree/master/Default/Policy%20Extensions/NSPEPI
- **F5 AS3 Documentation** - https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/

---

**Document Version**: 1.0
**Created**: 2025-10-12
**Author**: Ted (with Claude Code assistance)
**Status**: Ready for Implementation

---

**End of Phase 1 Implementation Plan**
