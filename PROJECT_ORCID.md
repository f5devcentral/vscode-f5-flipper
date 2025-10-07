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
| 3.1 | [Unit Test Coverage](#31-unit-test-coverage) | 🔄 In Progress | High |
| 3.2 | [Production Config Testing](#32-production-config-testing) | Not Started | Medium |
| 4.1 | [Review Related Tools](#41-review-related-tools) | Not Started | Medium |
| 5.1 | [Config Sanitization Function](#51-config-sanitization-function) | Not Started | High |
| 6.1 | [JSON Output WebView](#61-json-output-webview) | Not Started | Medium |
| 7.1 | [Extended Feature Detection](#71-extended-feature-detection) | Not Started | High |

**Overall Progress**: 2/9 sections complete, 1 in progress (22%)

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
**Status**: 🔄 In Progress
**Priority**: High
**Description**: Extend unit tests, especially for new JSON parsing

**Current Coverage** (as of 2025-10-07):
- **Overall**: 91.51% lines, 73.33% branches, 87.87% functions ✅
- **Tests**: 140 passing (was 119)
- **Thresholds**: Exceeds required 80% lines/functions, 70% branches ✅

**Completed Work**:
- [x] Audit current test coverage gaps → [TEST_COVERAGE_ANALYSIS.md](TEST_COVERAGE_ANALYSIS.md)
- [x] Write unit tests for utilities.ts helper functions (21 new tests)
- [x] Identify critical untested modules (nsDiag, fastCore, view providers)
- [x] Document zero-coverage modules and priorities

**Focus Areas - Remaining**:
- [ ] **nsDiag.ts** - Diagnostics engine (CRITICAL, 0% coverage)
- [ ] **fastCore.ts** - FAST template integration (CRITICAL, 0% coverage)
- [ ] digCsVserver.ts - Improve from 50% to 80% function coverage
- [ ] digCStoLbRefs.ts - Improve branch coverage to 80%+
- [ ] Create test fixtures for complex NS configs

**Next Steps**:
1. Write tests for nsDiag.ts (diagnostics engine) - 15-20 tests estimated
2. Write tests for fastCore.ts (template processing) - 10-15 tests estimated
3. Expand digCsVserver.ts tests for missing functions
4. Create NetScaler config fixtures with diagnostic issues

**Deliverables**:
- ✅ [TEST_COVERAGE_ANALYSIS.md](TEST_COVERAGE_ANALYSIS.md) - Comprehensive coverage audit
- ✅ [tests/044_utilities.unit.tests.ts](tests/044_utilities.unit.tests.ts) - 21 new tests

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
**Description**: Extend diagnostics to identify and categorize application features

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

---

**Last Updated**: 2025-10-01
**Project Lead**: Ted
**Status**: Planning Phase
