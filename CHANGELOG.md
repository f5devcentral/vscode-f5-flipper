
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

