
# Change Log

[BACK TO MAIN README](README.md)

All notable changes to "vscode-f5-flipper" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file

---

## [Unreleased]

### Added

### Changed

### Fixed

[BUG] clean up quotes from strings with spaces #47


---

## [1.12.0] - (03-17-2025)

### Fixed

- Had to rework [BUG] not capturing DISABLED state of serviceGroup/service members #49
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

