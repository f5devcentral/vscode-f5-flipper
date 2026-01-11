
# Change Log

[BACK TO MAIN README](README.md)

All notable changes to "vscode-f5-flipper" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file

---

## [Unreleased]

### Added

### Changed

### Fixed

---

## [1.18.1] - 2026-01-11

### Changed

- Updated test configurations for verified NetScaler patterns
- Simplified SSL certificate examples (PEM format instead of PFX with encrypted passwords)

### Fixed

- Updated test assertions to match current config line counts
- Fixed SSL certificate test expectations to match simplified cert format

---

## [1.18.0] - (Pending Release)

### Added

- **Feature Detection System (Phases 1-4 Complete)**: Comprehensive intelligent analysis of NetScaler configurations
  - **FeatureDetector**: Automatically detects 50+ NetScaler features across 10 categories
    - Load Balancing & Traffic Management
    - Security & SSL (Enhanced: cert chains, custom ciphers, mTLS, SSL policies)
    - Application Firewall & Protection (Enhanced: SQL injection/XSS/CSRF detection, rate limiting, GeoIP)
    - Session Management & Persistence
    - Policy Framework
    - Performance Optimization (Enhanced: custom TCP/HTTP profiles)
    - Global Server Load Balancing (GSLB)
    - Authentication & Authorization (Enhanced: nFactor, VPN, LDAP, RADIUS, SAML, OAuth/OIDC)
    - Monitoring & Health Checks (Enhanced: script monitors, SNMP, audit logging)
    - Network Configuration & HA (Enhanced: HA pairs, clusters, link LB, SNIPs)
  - **ComplexityScorer**: Calculates migration complexity score (1-10) with justification
    - Estimates migration effort (days/weeks)
    - Assigns risk levels (Low/Medium/High)
    - Provides detailed justification for scores
  - **CapabilityMapper**: Recommends F5 platform based on detected features
    - Scores compatibility for TMOS, NGINX+, and XC
    - Identifies conversion gaps and requirements
    - Provides confidence levels and rationale
  - **Phase 2 Enhancements (Enhanced Detection)**:
    - SSL/TLS: Certificate chain detection, custom cipher analysis, legacy protocol warnings
    - Security: AppFW profile inspection, rate limiting patterns, GeoIP blocking detection
    - Authentication: nFactor (multi-schema), VPN Gateway, LDAP/RADIUS/SAML/OAuth
    - Monitoring: Script-based monitors (USER protocol), custom health checks, SNMP
    - HA: Cluster configuration, HA pairs, link load balancing
    - 23 new comprehensive unit tests covering all Phase 2 features
  - **Phase 3 & 4: Scoring and Mapping Engine**:
    - Interaction multipliers for feature diversity (1.0x to 1.3x based on categories)
    - Feature-specific platform bonuses (VPN Gateway, GSLB, AppFW)
    - Gap detection with severity levels (Info/Warning/Critical)
  - **Phase 5: Per-App Feature Detection** (replaces global report with actionable app-level insights):
    - **Simple features array**: `app.features` contains feature names for quick reference/filtering
    - **Per-app complexity analysis**: Each app shows individual migration complexity (1-10 scale)
    - **Color-coded badges**: Visual indicators on each app (🔴 High / 🟠 Medium / 🟡 Low / 🟢 Simple)
    - **Rich hover tooltips**: Comprehensive app details with diagnostics and migration insights
      - App header with type, protocol, and address
      - 🔍 Diagnostics summary (errors, warnings, info)
      - 🎯 Migration Analysis (complexity, platform, confidence)
      - Feature breakdown by category (top 3 categories shown)
      - F5 platform mapping indicators (✅ Full / ⚠️ Partial support)
      - Conversion gaps with severity indicators
      - Removed verbose YAML dump for cleaner, actionable information
    - **App descriptions**: Include `[complexity/10 → Platform]` format for quick scanning
    - **Intelligent icon priority**: Diagnostic errors/warnings override complexity colors
    - **Hybrid architecture**: Global feature detection + per-app mapping for efficiency
    - **Unified workflow**: Feature analysis runs automatically during config load alongside diagnostics
    - **Lightweight implementation**: Maps global features to apps using type, protocol, bindings analysis
  - **Architecture**: Hybrid approach - global feature detection once + per-app lightweight mapping
  - **Integration**: Runs automatically during config load alongside diagnostics
  - **Benefits** (per-app insights vs global report):
    - **Actionable per-app insights**: Identify which specific apps are complex, not just overall config
    - **Migration prioritization**: Sort apps by complexity to plan migration order
    - **Data-driven platform recommendations per-app**: Each app gets tailored platform suggestion
    - **Automated effort estimation**: Know complexity before starting each app migration
    - **Early gap identification**: See conversion challenges at app level
    - **Deep security analysis**: Certificate chains, mTLS, AppFW, rate limiting, GeoIP per-app
    - **Unified diagnostics + complexity view**: Single pane of glass for all app insights
  - **Files**: [src/featureDetector.ts](src/featureDetector.ts) (1,600+ lines), [src/complexityScorer.ts](src/complexityScorer.ts), [src/capabilityMapper.ts](src/capabilityMapper.ts), [src/CitrixADC.ts](src/CitrixADC.ts), [src/nsCfgViewProvider.ts](src/nsCfgViewProvider.ts), [src/models.ts](src/models.ts)
  - **Tests**: 349 tests passing (326 base + 23 per-app feature tests), 90%+ code coverage
  - **Design Documents**:
    - [FEATURE_DETECTION_DESIGN.md](FEATURE_DETECTION_DESIGN.md) - Complete architecture
    - [FEATURE_DETECTION_IMPLEMENTATION_SUMMARY.md](FEATURE_DETECTION_IMPLEMENTATION_SUMMARY.md) - Implementation summary
    - [FEATURE_DETECTION_PHASE5_PER_APP_INTEGRATION.md](FEATURE_DETECTION_PHASE5_PER_APP_INTEGRATION.md) - Per-app integration plan

- **Enhanced Type Definitions for AdcConfObjRx**: Comprehensive TypeScript interface improvements for better IDE experience
  - Created 10 specific object type interfaces: `LbVserver`, `CsVserver`, `GslbVserver`, `NsServiceGroup`, `NsService`, `NsServer`, `LbMonitor`, `SslCertKey`, `CsPolicy`, `CsAction`
  - Added 100+ documented properties with JSDoc comments and usage examples
  - Enhanced type safety with string literal unions for common options (persistence types, LB methods, SSL/TLS settings, etc.)
  - Updated `AdcConfObjRx` to use specific types instead of generic `NsObject` for all major object categories
  - Improved IDE autocomplete with property suggestions and hover documentation
  - Added NetScaler documentation links in JSDoc for quick reference
  - **Benefits**:
    - Better developer experience with autocomplete for NetScaler-specific properties
    - Compile-time type checking prevents typos in property names
    - Self-documenting code with comprehensive JSDoc examples
    - Foundation for future feature detection and validation work
  - **Files**: [src/models.ts](src/models.ts), [src/digLbVserverRx.ts](src/digLbVserverRx.ts), [src/digCsVserverRx.ts](src/digCsVserverRx.ts)
  - **Design Document**: [ADC_CONFOBJRX_TYPE_EXTENSIONS.md](ADC_CONFOBJRX_TYPE_EXTENSIONS.md)

### Changed

### Fixed

### Removed

- **Type Guards**: Removed `src/typeGuards.ts` and `tests/027_typeGuards.unit.tests.ts`
  - Type guards were not needed for Flipper's deterministic parsing pipeline
  - TypeScript interfaces provide compile-time type safety
  - No external/untrusted data sources requiring runtime validation
  - Parsed JSON structure controlled by regex patterns in `src/regex.ts`

- **Legacy Performance Tests**: Removed `tests/306_final.performance.tests.ts`
  - Performance comparison against old parser (CitrixADCold) no longer needed
  - Old parser has been deprecated and is being phased out
  - Snapshot-based integration tests provide better regression detection
  - Component-level performance tests in `tests/305_performance.comparison.tests.ts` remain for focused benchmarking

---

## [1.17.0] - (01-12-2025)

### 🚀 Major Performance Enhancement: New RX Parsing Engine

This release introduces a **complete rewrite** of the NetScaler configuration parser with a new RX-based engine that delivers **2-3x faster performance** while providing superior accuracy in configuration abstraction.

#### Performance Improvements

**End-to-End Processing:**

- **Up to 3.11x faster** complete processing pipeline
- **Average 1.48x speedup** (30% improvement) across all config sizes
- **2.05x faster** on complex GSLB configurations (t1.ns.conf)
- **1.43x faster** on enterprise configs with 17+ apps (bren.ns.conf)

**Parsing Phase:**

- **Up to 2.24x faster** regex matching and object creation
- **Average 1.46x speedup** (27% improvement)
- Pre-compiled regex patterns eliminate compilation overhead

**Digestion Phase:**

- **Up to 5.59x faster** application abstraction
- **Up to 82.1% faster** on GSLB configs
- Parallel digester execution with `Promise.all()` (3-6x speedup)

**Scalability:**

```
Small configs (100-500 lines):    1.2-1.5x faster
Medium configs (500-2000 lines):  1.5-2.0x faster
Large configs (2000+ lines):      2.0-3.0x faster
```

See [RX Parser Performance Report](docs/RX-Parser-Performance-Report.md) for comprehensive benchmarks and methodology.

#### Architecture Improvements

**NEW: Object-Based Storage**

- Replaced array-based structure with object storage keyed by name
- O(1) lookup by name vs O(n) array search
- Single-pass parsing with immediate object creation
- All properties extracted during parsing (no multi-pass required)

**Optimizations:**

1. **Pre-compiled Regex Patterns** - Compile once at initialization (~40% faster parsing)
2. **Improved Options Parsing** - Enhanced regex eliminates string concatenation hacks
3. **Parallel Digester Execution** - Run all digesters concurrently with `Promise.all()`
4. **Set-based Duplicate Removal** - O(n) complexity vs O(n²) with `indexOf()`
5. **Shared Utility Functions** - Centralized `extractOptions()` reduces code duplication
6. **Native structuredClone** - Faster deep cloning for CS→LB references

**Files:**

- [src/parseAdcArraysRx.ts](src/parseAdcArraysRx.ts) - New RX parsing engine
- [src/CitrixADC.ts](src/CitrixADC.ts) - Updated to use RX parser with parallel digestion
- [src/digLbVserverRx.ts](src/digLbVserverRx.ts) - RX-based LB digester
- [src/digCsVserverRx.ts](src/digCsVserverRx.ts) - RX-based CS digester
- [src/digGslbVserverRx.ts](src/digGslbVserverRx.ts) - RX-based GSLB digester
- [src/parseAdcUtils.ts](src/parseAdcUtils.ts) - Shared parsing utilities

#### Quality Improvements

**Better Accuracy:**

- ✅ Improved binding detection for CS→LB vserver relationships
- ✅ Fixed duplicate entries in SSL certificate arrays
- ✅ Complete SSL certificate handling in all scenarios
- ✅ Proper CS policy deduplication
- ✅ Enhanced server address/hostname detection with IP pattern matching
- ✅ Fixed SSL cert line ordering to match original behavior
- ✅ Fixed monitor protocol field inclusion

**100% Backward Compatible:**

- Drop-in replacement with identical output structure
- All existing code continues to work without changes
- Legacy parser preserved in `CitrixADCold.ts` for reference

#### Testing

**Comprehensive Test Coverage:**

- 25+ new tests for RX parser components
- Snapshot-based integration tests (48 tests across 14 configs)
- Performance comparison tests validating 2-3x improvements
- All tests passing with improved coverage metrics

**Test Files:**

- `tests/007_parseNsOpts.unit.tests.ts` - Options parsing tests
- `tests/045_objectCounter.unit.tests.ts` - Object counting tests
- `tests/046_csToLbRefs.unit.tests.ts` - CS→LB reference tests
- `tests/305_performance.comparison.tests.ts` - Component performance tests
- `tests/306_final.performance.tests.ts` - End-to-end benchmarks
- `tests/integration/rx-parser/` - Snapshot-based integration tests

#### Documentation

**New Documentation:**

- [docs/RX-Parser-Performance-Report.md](docs/RX-Parser-Performance-Report.md) - Comprehensive performance analysis
- [docs/RX-PARSER-TYPES.md](docs/RX-PARSER-TYPES.md) - Type system guide and migration guide
- [docs/RELEASE-2025-01-12.md](docs/RELEASE-2025-01-12.md) - Detailed release notes

**Enhanced Types:**

- Marked `AdcConfObj` as `@deprecated` with migration guidance
- Enhanced `AdcConfObjRx` with comprehensive JSDoc and examples
- Improved `NsObject` interface with specific common fields
- Better IDE autocomplete and tooltips

---

### Added

### Fixed

- **parseNsOptions Function Improvements**
  - Fixed `-cip` parameter parsing to handle multi-value options (e.g., `-cip ENABLED client-ip`)
  - Added filtering to exclude `-devno` internal device numbers from parsed output
  - Upgraded regex pattern to properly capture multi-word option values
  - Removed old string concatenation hack for last option handling
  - Added 6 new unit tests for edge cases and multi-value parameters

- **Eliminated Undefined Field Pollution**
  - Fixed `sortAdcApp()` function setting optional fields to `undefined` explicitly
  - Changed to conditional spread operator pattern to only include fields with values
  - Cleaner JSON output without undefined values in parser results
  - Reduced snapshot file sizes

### Added

- **Snapshot-Based Integration Tests**
  - Created new `tests/integration/rx-parser/` test framework
  - Generated golden snapshots for 14 NetScaler config files (48 individual app tests)
  - Added `generateSnapshots.ts` script for updating snapshots after intentional changes
  - Comprehensive README documentation for snapshot testing approach
  - All 48 integration tests passing

- **Enhanced Type System Documentation**
  - Created `docs/RX-PARSER-TYPES.md` comprehensive type system guide
  - Added migration guide from old parser (`AdcConfObj`) to new parser (`AdcConfObjRx`)
  - Documented common usage patterns with real-world examples
  - Added utility function documentation

### Changed

- **Deprecated Old Parser Tests**
  - Moved `tests/304_parseAdcArraysRx.allConfigs.int.tests.ts` to `.deprecated`
  - Created `tests/304_DEPRECATED_README.md` explaining migration
  - New snapshot tests replace old comparison tests (faster, no ADCold dependency)

- **Type Definitions Improvements**
  - Marked `AdcConfObj` as `@deprecated` with clear migration guidance
  - Enhanced `AdcConfObjRx` JSDoc with benefits, structure examples, and usage patterns
  - Improved `NsObject` interface with specific common fields (protocol, ipAddress, port, server)
  - Better IDE autocomplete and tooltips throughout

### Performance

- Integration test execution ~40% faster (no old parser comparison)
- Smaller JSON output without undefined fields
- Better IDE performance with enhanced type definitions

---

## [1.16.0] - (10-08-2025)

### Added

- **Enhanced Test Coverage for Content Switching**: Comprehensive test suite for CS vserver functionality
  - Added 27 tests for `digCsVserver.ts` covering CS vserver parsing, policy bindings, and actions
  - Tests validate CS policy abstraction, CS action abstraction with targetLBVserver
  - Coverage includes CS vserver options, SSL bindings, and complex multi-policy configurations
  - Integration tests for CS→LB vserver relationships
  - Edge case testing for empty CS vservers and missing references
  - Coverage improvement: 0% → 69.04% (appflow code path not covered due to complexity)

- **CS to LB Reference Error Handling Tests**: New test suite for error path validation
  - Added 8 tests for `digCStoLbRefs.ts` focusing on missing reference scenarios
  - Tests validate graceful handling of broken LB vserver references
  - Coverage for missing `-policyName`, `-targetLBVserver`, and `-lbvserver` references
  - Real-world error case testing using starlord config fixture
  - Coverage improvement: 79.59% → 95.45%

- **Diagnostic Rules Validation Suite**: Comprehensive testing of diagnostic system
  - Added 34 tests for `nsDiag.ts` diagnostic rules validation
  - Validates diagnostic rules file structure, severity levels, and regex patterns
  - Tests rule categorization (by category, technology, severity)
  - Simulates diagnostic matching logic without VS Code dependencies
  - Validates regex compilation and pattern matching accuracy
  - Rule statistics calculation testing

- **Project Documentation Updates**:
  - Updated [PROJECT_ORCID.md](PROJECT_ORCID.md) tracking document with test coverage completion status
  - Updated [TEST_COVERAGE_ANALYSIS.md](TEST_COVERAGE_ANALYSIS.md) with final coverage metrics
  - Documented test session results (69 new tests, coverage improvement to 92.47%)
  - Added improvement recommendations for reference validation UI integration

- **DNS AS3 Template**: Implemented complete DNS load balancer AS3 conversion template ([templates/as3/DNS.yaml](templates/as3/DNS.yaml))
  - Fixed error when converting DNS apps: `Error: could not find a template with name "as3/DNS"`
  - DNS applications now fully support AS3 conversion
  - Template includes DNS-specific features: DNS monitors, query types (A, AAAA, NS, MX, etc.), port 53 configuration
  - Supports DNS virtual servers, service groups, and health monitoring
  - Template follows established pattern from UDP/TCP templates
  - Tested with existing `dnsLoadBalancer.ns.conf` fixture

- **DNS Template Documentation**: Created comprehensive GitHub issue document ([ISSUE_DNS_TEMPLATE.md](ISSUE_DNS_TEMPLATE.md))
  - Documented the DNS template requirements and implementation details
  - Provided template structure reference and DNS-specific features
  - Included acceptance criteria for validation

### Changed

- **Code Quality Improvements**: Refactored `digCStoLbRefs.ts` for better maintainability
  - Removed unnecessary string-based policy reference handling (PolicyRef type is always object-based)
  - Simplified error handling logic with clearer error messages
  - Improved code readability and reduced cyclomatic complexity
  - Better alignment with TypeScript type definitions

- **TypeScript Model Enhancements**: Updated type definitions for better accuracy
  - Enhanced `PolicyRef` type to remove deprecated string union (object-only now)
  - Added `-priority` property to PolicyRef type
  - Fixed CsPolicy property names to use bracket notation (`['-action']`, `['-rule']`)
  - Added `-comment` property to CsPolicyActions type
  - Better type safety for CS vserver policy handling

- **Test Coverage Metrics**: Overall improvement across all metrics
  - **Lines**: 91.81% → **92.47%** (+0.66%)
  - **Branches**: 74.66% → **75.11%** (+0.45%)
  - **Functions**: 88.88% → **88.77%** (stable, rounding variation)
  - **Test Count**: 220 → **255 tests** (+35 tests, +15.9%)

- **Welcome View Enhancement**:
  - Improved visual appeal of the Citrix ADC/NS Config Explorer welcome screen
  - Updated to represent latest project status
  - Included a link to the new documentation website

### Fixed

- Corrected TypeScript type definitions for CS policy objects
- Improved error message clarity for missing LB vserver references
- Fixed PolicyRef type to match actual usage patterns (removed string union)

---

## [1.15.0] - (10-07-2025)

### Added

- **Comprehensive Regex Tree Test Coverage**: Complete test coverage for all NetScaler v13.1 configuration patterns
  - Added 44 new regex pattern tests covering all 40 patterns in RegExTree
  - Tests organized by functional categories: Network, Load Balancing, SSL/TLS, Content Switching, Policies, GSLB, etc.
  - Realistic NetScaler configuration snippets for each pattern
  - Comprehensive edge case testing: quoted names, wildcard ports, IPv4/IPv6 addresses, FQDNs, special characters
  - Validation of named capture groups (name, protocol, ipAddress, port, opts, etc.)
  - 100% regex pattern coverage (improved from 5% coverage)
  - Total test count increased from 140 to 186 tests (+33%)

- **Utilities Helper Function Tests**: New test suite for utility functions
  - 21 new tests for `getNonce()` security token generation
  - Comprehensive type guard tests for `isAdcApp()` function
  - Validation of null/undefined handling, primitive types, and object structure
  - Edge case coverage for empty strings and additional properties

- **Test Coverage Analysis Documentation**: Detailed audit of test coverage across the codebase
  - Created TEST_COVERAGE_ANALYSIS.md documenting coverage for all 29 source files
  - Identified 14 modules with 0% coverage and prioritized them
  - Documented well-covered modules (90%+ coverage): CitrixADC, unPackerStream, digLbVserver, regex parsers
  - Analysis of under-covered modules with improvement recommendations
  - Priority testing roadmap for critical untested modules (nsDiag, fastCore)
  - Testing strategy recommendations and success metrics

- **Project Planning Documentation**: Major updates planning document
  - Created PROJECT_ORCID.md for tracking next phase enhancements
  - Index with status tracking for all planned improvements
  - Detailed sections for JSON conversion engine redesign, testing expansion, feature research
  - Documentation of completed work with timestamps and deliverables

- **Documentation Website**: Complete documentation site using Docsify
  - Set up Docsify v4.13.1 with GitHub Pages deployment
  - Created comprehensive documentation structure with sidebar and navbar navigation
  - Getting Started guides: Installation, Basic Usage, Interface
  - Feature documentation: Parsing, Abstraction, Conversion, Diagnostics
  - Architecture overview with links to A10 docs
  - Contributing guides: Development, Testing, Vendor Support
  - Reference documentation: API, Troubleshooting
  - Deployment instructions in docs/DEPLOY.md
  - Documentation URL: https://f5devcentral.github.io/vscode-f5-flipper/

### Changed

- **Test Suite Improvements**: Enhanced overall test quality and coverage
  - Overall test coverage: 91.51% lines, 73.33% branches, 87.87% functions ✅
  - All tests passing (186 tests, up from 119)
  - Exceeds required thresholds (80% lines/functions, 70% branches)
  - Improved test organization with better categorization

- **README Modernization**: Complete rewrite with modern format
  - Short, punchy, user-focused content
  - Highlighted AS3 output with FAST templates as primary value proposition
  - Added visual appeal with consistent formatting
  - Moved technical architecture details to ROADMAP.md
  - Added standard open source contribution guidelines
  - Enhanced with badges for marketplace and downloads
  - Referenced new documentation website

### Fixed

- None

---

## [1.14.0] - (01-15-2025)

### Added

- **JSON Button for NS Application View**: Added "View NS App JSON" button alongside existing "View NS App Lines" button
  - Provides direct access to JSON representation of NetScaler applications
  - Consistent UI placement and functionality with existing view options
  - Enhanced user workflow for application data inspection

- **Enhanced FAST Template Webview Interface**: Modernized template preview and editing experience
  - **Default Template View**: New webview is now the primary interface for FAST template interaction
  - **AS3 Preview Functionality**: Live preview of AS3 output with dedicated Monaco editor
  - **Interactive Parameter Editing**: JSON Editor for modifying template parameters with real-time validation
  - **Schema and Start Values Inspection**: Dedicated Monaco editors for viewing template schema and default values
  - **Dual Rendering Modes**:
    - Preview mode for quick AS3 validation within the webview
    - Editor mode for opening AS3 output in new VS Code editor tabs
  - **VS Code Integration**: Bidirectional message passing between extension and webview for seamless data flow

### Changed

- **Information Diagnostics Visual Indicator**: Information level diagnostics now display with green indicators instead of yellow
  - Improved visual hierarchy where Information diagnostics appear less concerning than warnings
  - Consistent color coding: Red (Error), Orange (Warning), Green (Information/No Issues)

- **FAST Template Processing Architecture**: Modernized template handling with improved user experience
  - **Async File Operations**: Migrated from synchronous to Promise-based file reading for better performance
  - **TypeScript Type Safety**: Enhanced type checking with proper AdcApp interface usage and type guards
  - **Template Parameter Munging**: Improved NetScaler to FAST parameter transformation through mungeNS2FAST function
  - **HTML Template Refactoring**: Streamlined single-editor layout replacing complex multi-container approach
  - **Monaco Editor Configuration**: Optimized editor sizing and display with automatic layout management

### Fixed

- [BUG] clean up quotes from strings with spaces #47

---

## [1.13.0] - (09-12-2025)

### Added

- **Major Diagnostic Rules Enhancement**: Comprehensive expansion of NetScaler to F5 diagnostic rules system
  - Added 40+ new diagnostic rules covering all major NetScaler features
  - Technology-specific rule prefixes: XC- (F5 Distributed Cloud), TMOS- (F5 BIG-IP), NGINX- (NGINX Plus)
  - New rule categories: SSL/TLS, Load Balancing, Persistence, Monitoring, Security, Performance, Networking, Policies
  - Enhanced rule statistics with `getRuleStats()` method for rule management and reporting
  - Extended DiagRule type with optional category, technology, and description fields
  - Comprehensive coverage for SSL certificates, authentication policies, health monitoring, compression, caching, GSLB configurations, and best practices

- **Comprehensive Protocol Test Suite**: Complete NetScaler application testing coverage
  - SSL_BRIDGE application tests with end-to-end SSL encryption validation
  - DNS Load Balancer tests with geographic distribution and health monitoring
  - TCP LDAPS tests for enterprise directory services with multi-site architecture
  - UDP NTP tests for time synchronization services with weighted load balancing
  - TCP Listen Policy tests for wildcard virtual servers with selective port filtering
  - ANY Protocol tests for transparent multi-protocol Exchange server deployments

- **Configuration Sanitization Framework**: Systematic approach to creating secure test fixtures
  - Sanitized NetScaler configurations for educational and testing purposes
  - IP address anonymization using RFC 1918 private ranges
  - Corporate naming convention removal with generic patterns
  - Comprehensive sanitization documentation with automation guidance

- **AS3 Conversion Examples**: NetScaler to F5 AS3 translation demonstrations
  - TCP Listen Policy AS3 conversion showing multi-service mapping approach
  - Production-validated AS3 declarations tested on F5 BIG-IP systems

- **Reports Section**: New view provider section for configuration analysis
  - Organized reporting interface above Diagnostics section
  - Enhanced user workflow for NetScaler configuration insights

- **GSLB Conversion Notifications**: User guidance for unsupported conversion scenarios
  - Warning messages when attempting AS3 conversion of GSLB applications
  - Informative notifications about GSLB limitation in current FAST template set

### Changed

- Updated diagnostic rule structure to support categorization and technology classification
- Enhanced diagnostic system architecture for better rule organization and management
- major template updates to include paremeter definitions for main details
  - updated ns2FastParams.ts to accomdate template updates
- Updated models
- rebuild htmlPreview stub from f5-fast-core
  - This will allow the extension to customize the html preview as needed
  - added details about the params fed to fast templates so they are visible in the html page for debugging
- integrated Claude with claude.md file
- upgraded f5-fast-core to latest v0.25.0
- Created a report header in the main view
  - Moved the main YAML report here
  - Created a new JSON report
  - Moved the NS config as JSON here also

### Fixed

- [BUG] abstraction error dalvarez #61
- Fixed diagnostic rule regex compatibility issues with JavaScript RegExp engine
  - Removed unsupported inline case-insensitive flags (`(?i)`) that caused "Invalid group" errors
  - Fixed lookbehind assertions and named capture groups for broader JavaScript compatibility
  - Enhanced error handling with try-catch blocks for regex compilation failures
- Fixed port number type assertions in protocol test files
  - Corrected SSL_BRIDGE, DNS, TCP LDAPS, and UDP NTP tests to expect string port values
  - Aligned test expectations with actual NetScaler parsing behavior

---

## [1.12.1] - (03-26-2025)

### Fixed

- [BUG] monitor details missing protocol

---

## [1.12.0] - (03-17-2025)

### Fixed

- [BUG] state missing from abstraction #52
  - rework [BUG] not capturing DISABLED state of serviceGroup/service members #49
  - adjust parsing of options and make sure opts are added back into the json object for the app
  - update the munge functin to carry params through fqdn/address branch logic
- Added more ssl parsing
- Added more parsing of objects with space in name
  - continuation of #46
- Added more tests to support serviceGroup details for extended details
- Added tests for Namaste app to round out advanced features;
  - Health monitors details

---

## [1.11.1] - (12-11-2024)

### Fixed

- [RFE] Add another iteration for monitors and ssl settings #39
  - monitors, ssl and pool members can be applied at the "service" level
    - Most of the time they are applied at the "service group"
- [RFE] Processing vservers using IPv6 addresses #43
- [RFE] ns json output to main work flow #45
- [BUG] options parsing breaks with spaces/quotes/special-chars #46
- [BUG] not capturing DISABLED state of serviceGroup/service members #49

---

## [1.10.1] - (05-19-2024)

### Fixed

- Added monitor abstraction and mutation for templates
  - Updated tests for this abstraction
- Added virtual server and pool port mutation from "*" (NS) to "0" (F5)
- Moved mungeNS2FAST function to it's own file for easier reference
- Updated some of the filters to search for specific object names, not just objects that "startWith" the name

---

## [1.10.0] - (04-30-2024)

### Added

- Moved FAST templates to dedicated view outside of Citrix ADC exploring
  - This includes a dedicated folder for templates with each template name aliging with the different major NS app protocol types (ANY/SSL/TCP/UDP/RDP/...)
  - refresh button for this view
- AFTON command to process bulk conversions
  - This work flow is still in progress.  There is a key difference in how the HTML view mutates the NS config data
- increased and streamlined ns app parameter mutating for FAST templates


### Fixed

- Logger now works with env logging levels of (info/warn/error/debug)
- Updated FAST templates from latest work/testing

---

## [1.8.0] - (04-10-2024)

### Fixed

- [BUG] report output blending with previous config #24

### Added

- [RFE] provide easy button for feedback/issues #4
- specify hostname or address with server references
- Added multiple fast templates for different general apps (tcp/udp/http/https)
  - this includes being able to select this fast template to convert with in the ns app json view
- added diagnostic rule to identify when a vserver is pointing to another vserver as a -backupVServer
  - this should be converted to f5 priority group activation, not multiple vs

---

## [1.7.0] - (04-08-2024)

### Fixed

- [BUG] Flipper 1.6.0 Service Parsing Error #29

### Added

- [RFE] TMOS/AS3 conversion output #7
- [RFE] add confObjArray to the view #20
- [RFE] code actions to provide conversion output #6
- documentation details about cs/lb-vserver serviceTypes
- documentation logic flow through cs/lb vserver details
  - show how everything gets mapped through cs/lb/services/serviceGroups (diagram)

---

## [1.6.0] - (04-03-2024)

### Fixed

- [Bug] Missing "add server" from "bind serviceGroup" reference
- Bug when config is missing title information with code version
  - defaults to v13.0
- Bug when config is missing hostname (should use filename instead)
- Moved conversion codeLense from preview to main
- added test for serviceGroup abstraction

---

## [1.5.0] - (03-25-2024)

### Added

- A second report that is better formated for capturing application output
- added line count to application description in view list

### Changed

- sorting application list by name (alpha-descending)

---

## [1.4.0] - (03-21-2024)

### Added

- "add server" collected from "add service" reference
  - This helps to provide the destination/origin server IP address
- added service to pool member mapping for FAST template/as3 conversion
- added CS to LB reference digging
  - this adds the full LB config to CS that reference them
    - direct cs policy referencecs (bind cs vserver cs_vserver_name -policyName policy_name -targetLBVserver lbvserver_name)
    - cs policy action reference (add cs action action_name -targetLBVserver lbvserver_name)
    - -lbserver reference (bind cs vserver cs_vserver_name -lbvserver lbvserver_name)

### Changed

- Updated FAST template HTML view CSS to look more like vscode
  - should support different color schemes
  - font should look more like bigip also

---

## [1.3.1] - (08-07-2023)

### Fixed

- Fixed templater changes not displaying
- updated deps

---

## [1.3.0] - (08-06-2023)

### Added

- NS->AS3 Fast template conversion process (initial)
- Fast templates list/modify process

### Fixed

- GSLB parsing bug

---

## [1.2.0] - (06-06-2023)

### Added

- test for gslb name with space

### Changed

- Moved gslb items from apps to it's own group in UI/view
- updated vserver regexs (cs/lb/gslb) to handle names with spaces (wrapped in "")
- updated all deps

### Fixed

- sorting of cs/lb by IP descending now working
- couple of async/parsing bugs

---

## [1.1.0] - (06-03-2023)

### Added

- vscode peacock color scheme for development
- [RFE] Add binding information for Service Groups #14
- [BUG] Flipper does not add bind ssl certkey items to the virtual server application. #16
- [RFE] Export Apps list as CSV #15

### Changed

- README updates
  - more Citrix links/documentation
  - ChatGPT reference
  - Items to consider for migration
  - more notes
- TEEM/Telemetry tweaks
- [RFE] Group or sort Apps category by virtual IP address #17

### Fixed

- [BUG] source files display as single line/string #18

---

## [1.0.0] - (04-13-2023)

- General Availability release
  - phase 1 - unpack/parse config (complete)
  - phase 2 - abstract apps (~80%-complete)
  - phase 3 - analyze apps (diagnostics) (~10%-complete)
    - rule system in place, need to develop rules
  - phase 4 - provide conversion output to XC/TMOS/NGINX (pending)
  - Need feedback on phases 2/3 before we can really be ready to provide conversions
- README updates
  - project breakdown
  - contribution requests
  - roadmap
  - architecture
- [BUG] cfg explore clear button produces error #1
- [RFE] default to expanded apps after config import #2
- [RFE] setup issue/bug/enhancement templates #8
- [RFE] remove internal commands from command palette #10
- [RFE] setup dev flag for early release features #3
- [RFE] save button codeLens for the diagnostic rules #12

---

## [0.4.0] - (04-05-2023)

- enabled diagnostics
  - started updating rule set
  - stop-light/icons
  - rule editing and refresh functions working
  - diagnostics stats
- more tests work and code coverage >75%
  - code clean up
- extended report with diags/stats

---

## [0.3.0] - (03-30-2023)

- Updated 'bind cs vserver' regex to include server name, which fixed options parsing
- extended 'add cs policy' and 'add cs action' parsing
- added appflow parsing from cs -policyName reference
- initial tests and github actions for publishing
- cleaned up app output

---

## [0.2.0] - (03-12-2023)

- Added initial logic for gslb
  - changed app 'type' to 'protocol' and added a new type for cs/lb/gslb
- Reworked/extended vserver parsing
- Telemetry working
- Expose ADC/NS explore via explorer view

---

## [0.1.0] - (03-07-2023)

- initial project
  - document goals and supporting details
  - create initial unPacking/parsing/abstraction functions similar to f5-corkscrew (explorer)
  - provide tree view to list abstraction stats/details and applications for browsing
  - build basic abstraction report

