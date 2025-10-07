# Test Coverage Analysis

**Generated**: 2025-10-07
**Current Status**: 91.51% lines, 73.33% branches, 87.87% functions

---

## Executive Summary

The project has **excellent overall coverage** (91%+), meeting the required thresholds (80% lines/functions, 70% branches). However, several critical modules have **0% coverage** and need testing.

**Test Suite Stats**:
- 119 passing tests
- 17 test files
- All tests passing ✅

---

## Coverage by Module

### ✅ Well-Covered Modules (90%+ coverage)

| Module | Lines | Branches | Functions | Status |
|--------|-------|----------|-----------|--------|
| `CitrixADC.ts` | 96.55% | 85.71% | 83.33% | ✅ Excellent |
| `unPackerStream.ts` | 98% | 92.85% | 90% | ✅ Excellent |
| `digLbVserver.ts` | 93.41% | 73.52% | 96% | ✅ Very Good |
| `regex.ts` | 100% | 100% | 100% | ✅ Perfect |
| `parseAdcUtils.ts` | 100% | 100% | 100% | ✅ Perfect |
| `parseAdcArrys.ts` | 100% | 100% | 100% | ✅ Perfect |
| `objectCounter.ts` | 100% | 100% | 100% | ✅ Perfect |
| `logger.ts` | 100% | 100% | 100% | ✅ Perfect |
| `objects.ts` | 100% | 100% | 100% | ✅ Perfect |
| `digGslbVserver.ts` | 100% | 80% | 100% | ✅ Very Good |
| `digGslbService.ts` | 100% | 62.5% | 100% | ✅ Good |

### ⚠️ Under-Covered Modules (50-80% coverage)

| Module | Lines | Branches | Functions | Priority |
|--------|-------|----------|-----------|----------|
| `digCStoLbRefs.ts` | 79.59% | 66.66% | 80% | Medium |
| `digCsVserver.ts` | 69.04% | **50%** | **50%** | **High** |

**Issues**:
- `digCsVserver.ts` has only 50% function coverage - missing tests for half the functions
- Branch coverage needs improvement (complex conditionals not fully tested)

### ❌ Zero Coverage Modules (Critical Priority)

The following critical modules have **0% test coverage**:

#### Core Functionality (High Priority)
1. **`nsDiag.ts`** - Diagnostics Engine ⚠️ **CRITICAL**
   - **LOC**: ~200+ lines
   - **Functionality**: Diagnostic rule engine, regex matching, VS Code integration
   - **Risk**: High - diagnostics are a key feature
   - **Test Needs**:
     - Rule loading from diagnostics.json
     - Pattern matching against config text
     - Diagnostic severity levels
     - VS Code diagnostic collection integration

2. **`fastCore.ts`** - FAST Template Integration ⚠️ **CRITICAL**
   - **LOC**: ~150+ lines
   - **Functionality**: AS3 conversion command, template rendering, GSLB rejection logic
   - **Risk**: High - core conversion feature
   - **Test Needs**:
     - Template loading and rendering
     - AdcApp validation (isAdcApp)
     - GSLB rejection logic
     - Command registration

3. **`utilities.ts`** - Helper Functions
   - **LOC**: ~60 lines
   - **Functionality**: Webview URI helpers, nonce generation, type guards
   - **Risk**: Medium - utility functions used across extension
   - **Test Needs**:
     - `getUri()` webview URI generation
     - `getNonce()` security token generation
     - `isAdcApp()` type guard validation

#### VS Code Integration (Medium Priority)
4. **`extension.ts`** - Main Extension Entry Point
   - **LOC**: ~300+ lines
   - **Functionality**: Command registration, activation, VS Code API integration
   - **Risk**: Medium - integration/glue code (hard to unit test)
   - **Test Needs**: Integration tests or mock-based unit tests

5. **`extLoader.ts`** - Extension Loader
   - **LOC**: ~100 lines
   - **Functionality**: Extension initialization with performance tracking
   - **Risk**: Low - simple wrapper
   - **Test Needs**: Activation timing, error handling

6. **`nsCfgViewProvider.ts`** - Config Tree View Provider
   - **LOC**: ~400+ lines
   - **Functionality**: VS Code tree view for parsed configs
   - **Risk**: Medium - UI component (hard to unit test)
   - **Test Needs**: Mock VS Code tree view API

7. **`templateViewProvider.ts`** - Template Tree View Provider
   - **LOC**: ~150+ lines
   - **Functionality**: VS Code tree view for FAST templates
   - **Risk**: Low - UI component
   - **Test Needs**: Template file discovery, tree structure

#### Web Views (Medium Priority)
8. **`fastWebView.ts`** - FAST Template Web View
   - **LOC**: ~300+ lines
   - **Functionality**: Web panel for template rendering
   - **Risk**: Medium - user-facing feature
   - **Test Needs**: HTML generation, message passing

9. **`fastWebViewFull.ts`** - Full FAST Web View
   - **LOC**: ~200+ lines
   - **Functionality**: Extended web view functionality
   - **Risk**: Medium
   - **Test Needs**: Similar to fastWebView.ts

10. **`localHtmlPreview.ts`** - HTML Preview
    - **LOC**: ~100+ lines
    - **Functionality**: Local HTML preview rendering
    - **Risk**: Low
    - **Test Needs**: HTML output validation

#### Additional Modules
11. **`ns2FastParams.ts`** - NetScaler to FAST Parameter Mapping
    - **LOC**: Unknown
    - **Functionality**: Parameter conversion logic
    - **Risk**: Medium - conversion accuracy

12. **`telemetry.ts`** - Anonymous Usage Analytics
    - **LOC**: ~100 lines
    - **Functionality**: F5 TEEM integration
    - **Risk**: Low - non-critical feature
    - **Test Needs**: Event capture, opt-out logic

13. **`hovers.ts`** - Hover Providers
    - **LOC**: Unknown
    - **Functionality**: VS Code hover information
    - **Risk**: Low - optional feature

14. **`codeLens.ts`** - Code Lens Provider
    - **LOC**: Unknown
    - **Functionality**: VS Code code lens
    - **Risk**: Low - optional feature

---

## Priority Test Development Plan

### Phase 1: Critical Modules (Immediate)
1. **`nsDiag.ts`** - Diagnostics engine testing
   - Create test configs with known issues
   - Test rule loading and matching
   - Test diagnostic severity mapping
   - **Estimated Tests**: 15-20

2. **`fastCore.ts`** - FAST template testing
   - Mock VS Code context and commands
   - Test template loading
   - Test AdcApp validation
   - Test GSLB rejection
   - **Estimated Tests**: 10-15

3. **`utilities.ts`** - Helper function testing
   - Test type guards
   - Test nonce generation (uniqueness)
   - Mock webview for URI tests
   - **Estimated Tests**: 5-8

### Phase 2: Improve Under-Covered Modules
4. **`digCsVserver.ts`** - Content switching digester
   - Test remaining functions (50% not covered)
   - Test complex branching scenarios
   - Test CS-to-LB policy references
   - **Estimated Tests**: 10-15

5. **`digCStoLbRefs.ts`** - CS/LB reference resolution
   - Test edge cases for policy actions
   - Test target vserver resolution
   - **Estimated Tests**: 5-8

### Phase 3: Integration/UI Modules (Lower Priority)
6. **VS Code integration modules** (extension.ts, extLoader.ts, view providers)
   - These require mocking VS Code API
   - Consider integration tests vs unit tests
   - **Estimated Tests**: 20-30

7. **Web view modules** (fastWebView.ts, localHtmlPreview.ts)
   - Test HTML generation
   - Test message passing
   - **Estimated Tests**: 10-15

---

## Test Fixtures Needed

### NetScaler Config Fixtures
- [ ] Config with diagnostic issues (for nsDiag.ts)
- [ ] Config with responder policies
- [ ] Config with rewrite policies
- [ ] Config with authentication policies
- [ ] Config with WAF/AppFirewall
- [ ] Config with rate limiting
- [ ] Config with complex CS-to-LB references
- [ ] Config with GSLB (for rejection testing)

### FAST Template Fixtures
- [ ] Valid AS3 templates
- [ ] Template with parameter schemas
- [ ] Template with Mustache partials
- [ ] Invalid/malformed templates (error handling)

---

## Testing Strategy Recommendations

### Unit Testing Approach
1. **Pure Logic Functions** (High Priority)
   - `nsDiag.ts` - regex matching, rule evaluation
   - `utilities.ts` - type guards, helpers
   - `fastCore.ts` - template processing logic

2. **VS Code Integration** (Medium Priority)
   - Use mock objects for VS Code API
   - Test command handlers in isolation
   - Mock webview panels

3. **View Providers** (Lower Priority)
   - Mock tree view API
   - Test tree structure generation
   - Test refresh/update logic

### What NOT to Test (Out of Scope)
- VS Code extension API itself
- Third-party libraries (@f5devcentral/f5-fast-core)
- File system operations (mock instead)
- UI rendering (test data generation only)

---

## Success Criteria

### Target Coverage Goals
- **Overall Lines**: Maintain 90%+ (currently 91.51%)
- **Overall Branches**: Improve to 80%+ (currently 73.33%)
- **Overall Functions**: Maintain 90%+ (currently 87.87%)

### Module-Specific Goals
- `nsDiag.ts`: 80%+ coverage
- `fastCore.ts`: 80%+ coverage
- `utilities.ts`: 100% coverage
- `digCsVserver.ts`: 80%+ functions, 70%+ branches

### Test Count Goals
- Add 50-75 new tests
- Total tests: 170-200 (currently 119)

---

## Implementation Roadmap

### Week 1-2: Critical Modules
- [ ] Write `042_nsDiag.unit.tests.ts` (20 tests)
- [ ] Write `043_fastCore.unit.tests.ts` (15 tests)
- [ ] Write `044_utilities.unit.tests.ts` (8 tests)

### Week 3-4: Improve Under-Covered
- [ ] Expand `013_confParser.unit.tests.ts` for CS vserver edge cases (15 tests)
- [ ] Add CS-to-LB reference edge case tests (8 tests)

### Week 5-6: Integration Testing (Optional)
- [ ] Mock-based tests for extension.ts commands
- [ ] Web view HTML generation tests

---

## Notes

### Why Some Modules Have 0% Coverage
- **VS Code Extensions**: Hard to unit test without mocking entire VS Code API
- **Web Views**: Primarily UI/HTML generation (integration tests more appropriate)
- **Extension Entry Points**: Glue code that wires up the extension

### Testing Philosophy
Focus on **business logic** and **data transformation** rather than UI/integration glue code. The core parsing, digesting, and conversion logic is well-tested (90%+), which is the right priority.

### Production Config Testing Connection
Once we add the config sanitization function (Section 5.1), we can use sanitized production configs to:
1. Build regression test suite
2. Discover edge cases for new tests
3. Validate diagnostic rules
4. Test FAST template outputs

---

**Next Steps**: Start with Phase 1 - implement tests for `nsDiag.ts`, `fastCore.ts`, and `utilities.ts`.