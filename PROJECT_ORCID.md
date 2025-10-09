# Project Orcid - Major Updates Planning

## Overview
Major enhancements to F5 Flipper extension focusing on improved architecture, testing, documentation, and feature expansion.

---

## Index & Status

| # | Section | Status | Priority |
|---|---------|--------|----------|
| 1.1 | [Main README Update](#11-main-readme-update) | ✅ Complete | High |
| 1.2 | [Documentation Website](#12-documentation-website) | ✅ Complete (Initial) | High |
| 2.1 | [JSON Conversion Engine Redesign](#21-json-conversion-engine-redesign) | Not Started | Critical |
| 3.1 | [Unit Test Coverage](#31-unit-test-coverage) | ✅ Complete | High |
| 3.2 | [Production Config Testing](#32-production-config-testing) | Not Started | Medium |
| 4.1 | [Review Related Tools](#41-review-related-tools) | Not Started | Medium |
| 5.1 | [Config Sanitization Function](#51-config-sanitization-function) | Not Started | High |
| 6.1 | [JSON Output WebView](#61-json-output-webview) | Not Started | Medium |
| 7.1 | [Extended Feature Detection](#71-extended-feature-detection) | Not Started | High |
| 7.2 | [Reference Validation UI Integration](#72-reference-validation-ui-integration) | Not Started | High |

**Overall Progress**: 3/10 sections complete (30%)

---

## Release History

### v1.16.0 (2025-10-08)
- ✅ **Test Coverage Enhancement** - Added 69 new tests
  - CS vserver functionality testing (27 tests)
  - CS→LB reference error handling (8 tests)
  - Diagnostic rules validation (34 tests)
- ✅ **Code Quality** - Refactored digCStoLbRefs.ts
- ✅ **Type Safety** - Enhanced TypeScript models
- **Coverage**: 92.47% lines, 75.11% branches, 255 tests ✅

### v1.15.0 (2025-10-07)
- ✅ Comprehensive regex tree test coverage
- ✅ Test coverage analysis documentation
- ✅ Documentation website (Docsify)
- ✅ README modernization

---

## 1. Documentation Updates

### 1.1 Main README Update
**Status**: ✅ Complete
**Priority**: High
**Description**: Update main README to reflect completion of all phases

**Decisions Made**:
- Created short and punchy README focused on key features
- Highlighted AS3 output with FAST templates (primary value proposition)
- Added emojis throughout for visual appeal
- Removed technical details (moved to ROADMAP.md)
- Replaced "I need help" with standard open source contribution text
- Added badges for marketplace and downloads
- Referenced ROADMAP.md for technical architecture

**Tasks**:
- [x] Review current README.md against completed phases
- [x] Document all completed features and capabilities
- [x] Add emojis and make it punchy
- [x] Move technical details to ROADMAP.md
- [x] Add badges for marketplace and downloads
- [x] Update contribution section
- [x] Reference documentation site (coming soon)

**Deliverables**:
- New [README.md](README.md) - Short, punchy, user-focused
- New [ROADMAP.md](ROADMAP.md) - Technical architecture and details

---

### 1.2 Documentation Website
**Status**: ✅ Complete (Initial Setup)
**Priority**: High
**Description**: Create comprehensive documentation website

**Decisions Made**:
- Selected **Docsify** (same as vscode-f5 project for consistency)
- Using **GitHub Pages** deployment from `/docs` folder
- Latest Docsify v4.13.1 with Mermaid diagram support
- Sidebar and navbar navigation configured

**Completed Setup**:
- [x] Choose documentation framework (Docsify)
- [x] Set up documentation structure
- [x] Create index.html with full Docsify configuration
- [x] Set up sidebar and navbar navigation
- [x] Create initial content sections
- [x] Configure GitHub Pages deployment (manual setup required)
- [x] Integrate with main README

**Content Created**:
- [x] Getting started guide (Installation, Basic Usage, Interface)
- [x] Architecture overview (links to existing A10 docs)
- [x] Feature documentation (Parsing, Abstraction stubs)
- [x] Reference documentation (API, Troubleshooting stubs)
- [x] Contributing guides (Development, Testing, Vendor Support)

**Deployment**:
- Documentation URL (once enabled): `https://f5devcentral.github.io/vscode-f5-flipper/`
- Deployment instructions: [`docs/DEPLOY.md`](docs/DEPLOY.md)

**Next Steps** (Future Content Expansion):
- [ ] Complete AS3 conversion documentation
- [ ] Add more examples and screenshots
- [ ] Create NetScaler feature support matrix
- [ ] Expand FAST template development guide
- [ ] Add video tutorials/demos
- [ ] Create migration guides

---

## 2. Core Architecture Enhancements

### 2.1 JSON Conversion Engine Redesign
**Status**: Not Started
**Priority**: Critical
**Description**: Redesign conversion engine to convert every NS config line to JSON first, then abstract applications

**Current Approach**:
- Parse config lines using regex patterns
- Create nested JSON structure
- Walk structure to abstract applications

**Proposed Approach**:
- Convert ALL NS config lines to JSON representation
- Maintain complete config as JSON
- Abstract applications from JSON model
- Enables better querying, validation, and transformation

**Deep Dive Required**:
- [ ] Analyze current RegExTree patterns (`src/regex.ts`)
- [ ] Design new JSON schema for NS config objects
- [ ] Map all NS object types to JSON structure
- [ ] Plan migration path from current to new approach
- [ ] Consider performance implications
- [ ] Design API for querying JSON config

**Implementation Steps**:
- [ ] Create JSON schema definitions for NS objects
- [ ] Extend/refactor regex parser for complete JSON conversion
- [ ] Update ADC class to use new JSON model
- [ ] Refactor digesters to work with JSON model
- [ ] Update tree view provider for JSON model
- [ ] Migration testing with existing configs

**Benefits**:
- More complete representation of NS config
- Easier to query and analyze
- Better foundation for conversions
- Improved diagnostics capabilities
- Potential for config editing/manipulation

---

## 3. Testing Expansion

### 3.1 Unit Test Coverage
**Status**: ✅ Complete
**Priority**: High
**Description**: Extend unit tests, especially for new JSON parsing

**Current Coverage** (as of 2025-10-08):
- **Overall**: 91.81% lines, 74.66% branches, 88.88% functions ✅
- **Tests**: 255 passing (up from 220 at start of session)
- **Thresholds**: Exceeds all required targets ✅

**Completed Work**:
- [x] Audit current test coverage gaps → [TEST_COVERAGE_ANALYSIS.md](TEST_COVERAGE_ANALYSIS.md)
- [x] Write unit tests for utilities.ts helper functions (21 new tests)
- [x] Identify critical untested modules (nsDiag, fastCore, view providers)
- [x] Document zero-coverage modules and priorities
- [x] **nsDiag.ts** - Created 34 tests for diagnostic rules validation
- [x] **digCsVserver.ts** - Created 27 tests for CS vserver functionality
- [x] **digCStoLbRefs.ts** - Created 8 tests for error handling paths

**Test Session Results** (69 new tests added):
- ✅ [tests/050_nsDiag.unit.tests.ts](tests/050_nsDiag.unit.tests.ts) - 34 tests for diagnostic rules
- ✅ [tests/051_digCsVserver.unit.tests.ts](tests/051_digCsVserver.unit.tests.ts) - 27 tests for CS vservers
- ✅ [tests/052_digCStoLbRefs.unit.tests.ts](tests/052_digCStoLbRefs.unit.tests.ts) - 8 tests for reference validation

**Known Limitations**:
- NsDiag class not directly testable (requires VS Code Extension Host)
- Appflow code (lines 158-206 in digCsVserver.ts) not covered due to test complexity
- fastCore.ts still at 0% coverage (requires FAST template integration testing)
- View providers require VS Code environment

**Code Quality Findings**:
- ⚠️ **Improvement Opportunity Identified**: digCStoLbRefs.ts error handling
  - Missing reference errors only logged to console, not exposed in UI
  - See TODO comment in [tests/052_digCStoLbRefs.unit.tests.ts:154-166](tests/052_digCStoLbRefs.unit.tests.ts#L154)
  - Recommendation: Add diagnostics collection for broken references
  - Task added to section 7.2 below

**Deliverables**:
- ✅ [TEST_COVERAGE_ANALYSIS.md](TEST_COVERAGE_ANALYSIS.md) - Comprehensive coverage audit
- ✅ [tests/044_utilities.unit.tests.ts](tests/044_utilities.unit.tests.ts) - 21 tests
- ✅ [tests/050_nsDiag.unit.tests.ts](tests/050_nsDiag.unit.tests.ts) - 34 tests
- ✅ [tests/051_digCsVserver.unit.tests.ts](tests/051_digCsVserver.unit.tests.ts) - 27 tests
- ✅ [tests/052_digCStoLbRefs.unit.tests.ts](tests/052_digCStoLbRefs.unit.tests.ts) - 8 tests

---

### 3.2 Production Config Testing
**Status**: Not Started
**Priority**: Medium
**Description**: Test with ~24 production configs (sensitive data - not added to repo)

**Approach**:
- [ ] Set up secure testing environment
- [ ] Create sanitization function (see 5.1)
- [ ] Run all configs through Flipper
- [ ] Document issues/edge cases discovered
- [ ] Create test fixtures from sanitized data
- [ ] Build regression test suite

**Success Metrics**:
- [ ] Parsing success rate
- [ ] Application abstraction accuracy
- [ ] Diagnostic coverage
- [ ] Conversion output quality

---

## 4. Feature Research & Integration

### 4.1 Review Related Tools
**Status**: Not Started
**Priority**: Medium
**Description**: Review 3+ other tools for logic/feature mapping incorporation

**Tools to Review**:
1. [ ] Tool 1: (name/details to be provided)
2. [ ] Tool 2: (name/details to be provided)
3. [ ] Tool 3: (name/details to be provided)

**Review Process**:
- [ ] Document each tool's approach
- [ ] Identify unique features/capabilities
- [ ] Map applicable features to Flipper
- [ ] Design integration approach
- [ ] Prioritize features for implementation

**Integration Areas**:
- Parsing techniques
- Application abstraction logic
- Conversion mappings
- Diagnostics patterns
- UI/UX approaches

---

## 5. Utility Functions

### 5.1 Config Sanitization Function
**Status**: Not Started
**Priority**: High
**Description**: Create function to sanitize NS configs for testing/sharing

**Sanitization Targets**:
- IP addresses
- Hostnames/FQDNs
- Certificates/keys
- Passwords/secrets
- Organization-specific names
- Custom URLs

**Approaches**:
- [ ] **Per-config sanitization**: Complete config file
- [ ] **Per-app sanitization**: Individual application basis (preferred?)
- [ ] Hybrid approach with options

**Implementation**:
- [ ] Design sanitization rules/patterns
- [ ] Create reversible sanitization (for testing)
- [ ] Build sanitization API
- [ ] Add CLI/command for sanitization
- [ ] Generate sanitization report
- [ ] Validate sanitized configs still parse correctly

**Use Cases**:
- Sharing configs for testing
- Creating public examples
- Bug reports
- Documentation examples

---

## 6. UI/UX Enhancements

### 6.1 JSON Output WebView
**Status**: Not Started
**Priority**: Medium
**Description**: Create new webview for JSON outputs based on preferred example

**Reference**:
- Based on example from [flipper_webview](https://github.com/DumpySquare/flipper_webview)
- See flipper_webview for prototype ideas

**Features**:
- [ ] Navigation buttons for view switching
- [ ] Multiple data view modes:
  - [ ] Original NetScaler config lines
  - [ ] Abstracted NS applications as JSON
  - [ ] FAST template HTML output
  - [ ] FAST template processed results
- [ ] Monaco editor integration
- [ ] Syntax highlighting for JSON
- [ ] Collapsible JSON trees
- [ ] Search/filter capabilities
- [ ] Export functionality

**Implementation**:
- [ ] Review flipper_webview prototype
- [ ] Design webview architecture
- [ ] Implement message passing (extension ↔ webview)
- [ ] Create view templates
- [ ] Integrate Monaco editor
- [ ] Add navigation controls
- [ ] Implement data transformations
- [ ] Add styling/CSS

**Integration Points**:
- `src/fastWebView.ts` & `src/fastWebViewFull.ts`
- New webview provider class
- Extension command registration
- Tree view context menu integration

---

## 7. Diagnostics Engine Expansion

### 7.1 Extended Feature Detection
**Status**: Not Started
**Priority**: High
**Description**: Implement comprehensive feature detection and F5 platform compatibility assessment

**Design Document**: [FEATURE_DETECTION_DESIGN.md](FEATURE_DETECTION_DESIGN.md)

**Overview**:
Create a hybrid system that detects NetScaler application features during abstraction and validates compatibility through diagnostic rules. This enables intelligent platform recommendations (TMOS, NGINX+, F5 XC) and conversion guidance.

**Key Components**:
1. **Feature Detection During Abstraction**
   - Detect features as applications are parsed (SSL, persistence, LB methods, etc.)
   - Add `features`, `f5Compatibility`, and `complexityScore` to AdcApp objects
   - Single-pass efficiency during digestion

2. **Compatibility Assessment via Diagnostics**
   - Diagnostic rules for platform-specific feature gaps
   - Actionable warnings for conversion challenges
   - Leverages existing nsDiag infrastructure

**Implementation Tasks**:

- [ ] Create FeatureDetector utility class ([FEATURE_DETECTION_DESIGN.md](FEATURE_DETECTION_DESIGN.md#phase-1-feature-detector-framework))
- [ ] Extend models.ts with AppFeatures and F5Compatibility interfaces
- [ ] Update digesters (digLbVserver, digCsVserver) to collect features
- [ ] Add feature compatibility diagnostic rules to nsDiag.ts
- [ ] Create feature summary webview for UI display
- [ ] Add platform recommendation icons to tree view
- [ ] Generate feature matrix reports
- [ ] Write unit tests for feature detection (tests/400_featureDetector.unit.tests.ts)

**Feature Categories**:

- SSL/TLS (client, server, SNI, ciphers)
- Persistence (types, timeout, backup)
- Load Balancing (methods, monitors, weights)
- Content Switching (policies, rules)
- HTTP Features (compression, caching, HTTP/2)
- Security (WAF, auth, rate limiting, bot management)
- Network (IPv6, VLANs, profiles)
- Advanced (appflow, spillover, traffic domains)

**Platform Compatibility**:

- **TMOS**: Score features against LTM/ASM/APM/GTM/AFM module capabilities
- **NGINX+**: Identify unsupported features (GSLB, advanced auth, etc.)
- **F5 XC**: Assess cloud-native fit and legacy feature gaps

**Benefits**:

- Automated platform recommendations with confidence scores
- Feature gap analysis per target platform
- Complexity assessment for migration planning
- Template auto-suggestion based on detected features
- Better conversion planning and risk evaluation

**Success Metrics**:

- Feature detection accuracy > 95%
- Platform recommendations validated against 50+ real migrations
- UI integration with < 100ms overhead per app
- Diagnostic rules cover 80%+ common migration issues

---

### 7.2 Reference Validation UI Integration
**Status**: Not Started
**Priority**: High
**Description**: Surface broken reference errors in VS Code UI instead of console-only logging

**Background**:
During unit test development (section 3.1), tests revealed that when CS vservers reference non-existent LB vservers, errors are only logged to console via `logger.error()` and not exposed to users in the VS Code UI. This creates poor user experience as errors are not discoverable.

**Affected Code**:
- [src/digCStoLbRefs.ts:56, 84, 119, 151](src/digCStoLbRefs.ts) - Four error logging locations
- [tests/052_digCStoLbRefs.unit.tests.ts:154-166](tests/052_digCStoLbRefs.unit.tests.ts#L154) - TODO with detailed recommendations

**Current Behavior**:
- Missing `-policyName` references → console error only
- Missing `-targetLBVserver` in policies → console error only
- Missing `-targetLBVserver` in actions → console error only
- Missing `-lbvserver` bindings → console error only

**Proposed Improvements**:
1. **Diagnostics Collection**
   - [ ] Add VS Code diagnostics for broken references
   - [ ] Show inline squiggles in editor at error locations
   - [ ] Provide diagnostic codes for each error type

2. **Tree View Integration**
   - [ ] Display warning/error icons next to apps with broken references
   - [ ] Use existing icon assets (redDot, orangeDot from nsCfgViewProvider)
   - [ ] Add tooltip showing which references are broken

3. **App Object Enhancement**
   - [ ] Populate `app.diagnostics` array with reference errors
   - [ ] Data model already supports this ([models.ts:34](src/models.ts#L34))
   - [ ] Enable programmatic access to validation issues

4. **Quick Fix Actions** (optional enhancement)
   - [ ] Suggest available LB vservers for broken references
   - [ ] Provide "Go to definition" for valid references
   - [ ] Auto-complete for targetLBVserver values

**Implementation Notes**:
- NsDiag class already demonstrates correct pattern for diagnostics
- Use `vscode.languages.createDiagnosticCollection()`
- Tree view already has icon infrastructure for status indication
- Consider adding diagnostic severity levels (Error vs Warning)

**Benefits**:
- Improved user experience and error discoverability
- Consistent with existing NsDiag diagnostic patterns
- Better debugging for complex NetScaler configs
- Reduced reliance on Output panel console monitoring

**Testing**:
- Tests already exist to validate error cases ([tests/052_digCStoLbRefs.unit.tests.ts](tests/052_digCStoLbRefs.unit.tests.ts))
- Will need integration tests for VS Code UI components
- Test with starlord.ns.conf (known to have reference errors)

---

**Feature Categories**:

#### SSL/TLS Features
- [ ] Client-side SSL (frontend)
- [ ] Server-side SSL (backend)
- [ ] SSL cipher suites
- [ ] Certificate bindings
- [ ] SSL offloading patterns
- [ ] SNI configurations

#### Persistence Features
- [ ] Persistence types (source IP, cookie, SSL session, etc.)
- [ ] Persistence timeout settings
- [ ] Backup persistence
- [ ] Persistence across services

#### Load Balancing
- [ ] LB method/algorithm
- [ ] Health monitors
- [ ] Service weights
- [ ] Connection limits
- [ ] Spillover settings

#### Security Features
- [ ] WAF/AppFirewall policies
- [ ] Authentication policies
- [ ] Authorization policies
- [ ] Responder policies
- [ ] Rewrite policies
- [ ] Rate limiting
- [ ] IP reputation
- [ ] Bot management

#### HTTP Settings
- [ ] HTTP profiles
- [ ] HTTP/2 support
- [ ] Compression
- [ ] Caching
- [ ] Header insertion/removal
- [ ] URL transformations

#### Protocol-Specific Features
- [ ] FTP features
- [ ] DNS features
- [ ] GSLB configurations
- [ ] RADIUS/LDAP integration
- [ ] SAML configurations

#### Network Features
- [ ] VLANs
- [ ] SNIPs
- [ ] Routes
- [ ] Network profiles

**Implementation**:
- [ ] Design feature detection framework
- [ ] Create feature taxonomy/schema
- [ ] Implement detection logic per category
- [ ] Update diagnostic rules in `src/nsDiag.ts`
- [ ] Create feature summary reports
- [ ] Add feature-based recommendations
- [ ] Visualize features in tree view
- [ ] Export feature matrix

**Benefits**:
- Better conversion planning
- Feature gap analysis
- Complexity assessment
- Migration risk evaluation
- Automated documentation

---

## Implementation Phases

### Phase 1: Foundation (Q1)
- [ ] Documentation framework selection
- [ ] JSON conversion engine design
- [ ] Test coverage audit
- [ ] Tool review planning

### Phase 2: Core Architecture (Q2)
- [ ] Implement new JSON conversion engine
- [ ] Expand unit test coverage
- [ ] Begin diagnostics expansion
- [ ] Config sanitization function

### Phase 3: Enhancement (Q3)
- [ ] JSON output webview
- [ ] Complete diagnostics features
- [ ] Production config testing
- [ ] Tool integration research

### Phase 4: Documentation & Polish (Q4)
- [ ] Documentation website launch
- [ ] README updates
- [ ] Feature integration from tool review
- [ ] Final testing and validation

---

## Success Metrics

- [ ] 90%+ test coverage
- [ ] All production configs parse successfully
- [ ] Complete documentation site live
- [ ] 100% NS config line to JSON conversion
- [ ] 50+ diagnostic rules active
- [ ] WebView with multi-format display
- [ ] Config sanitization in production use

---

## Open Questions

1. **Documentation**: Which framework to use? (Docsify vs alternatives)
2. **JSON Schema**: What's the optimal structure for NS config representation?
3. **WebView Example**: Which specific example from flipper_webview?
4. **Tool Review**: Names of the 3 tools to review?
5. **Sanitization**: Per-config or per-app approach?
6. **Timeline**: What's the target timeline for each phase?
7. **Resources**: Team size and allocation?

---

## Notes

- All phases from original project plan completed
- This represents next major evolution of Flipper
- Focus on architecture, testing, and usability
- Maintain backward compatibility where possible
- Consider performance implications of JSON conversion

---

## Related Documents

- [README.md](README.md) - Main project README
- [CLAUDE.md](CLAUDE.md) - Development guidelines
- [flipper_webview](https://github.com/DumpySquare/flipper_webview) - Prototype repository
- Package.json - Extension configuration
- Test coverage reports in `.nyc_output/`
- [FEATURE_DETECTION_DESIGN.md](FEATURE_DETECTION_DESIGN.md) - Feature detection system design

---

**Last Updated**: 2025-10-08
**Project Lead**: Ted
**Status**: Active Development (3/10 sections complete - 30%)
