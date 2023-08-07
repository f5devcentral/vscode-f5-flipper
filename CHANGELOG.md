
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

