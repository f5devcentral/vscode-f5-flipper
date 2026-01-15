# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Pre-Work Requirements

**IMPORTANT: Always save all files before starting any work.** Use Ctrl+S (or Cmd+S) to save any open files with unsaved changes before beginning tasks. This prevents conflicts between user's unsaved changes and Claude's modifications.

## Project Overview

F5 Flipper is a VS Code extension that analyzes and converts Citrix NetScaler/ADC configurations to F5 solutions. The extension parses NetScaler config files (.conf) and archives (.tgz), abstracts applications, provides diagnostics, and plans conversion outputs to F5 technologies (TMOS, NGINX, F5 XC).

## Development Commands

### Core Development
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation
- `npm run lint` - Run TypeScript compiler checks and ESLint
- `npm run test` - Run tests with nyc coverage
- `npm run build-package` - Build extension package (.vsix)
- `npm run vscode:prepublish` - Prepare for publishing

### Testing
- Use nyc for test coverage (80% lines/functions, 70% branches required)
- Test files are in `tests/` directory with `.tests.ts` suffix
- Coverage reports generated in `.nyc_output/` and `out/`

## Architecture Overview

### Core Classes and Processing Pipeline

1. **ADC Class** (`src/CitrixADC.ts`) - Main orchestrator that:
   - Unpacks archives via `UnPacker` (`src/unPackerStream.ts`)
   - Parses config files using regex patterns (`src/regex.ts`)
   - Abstracts applications through specialized digesters
   - Manages the overall processing pipeline

2. **Configuration Processing**:
   - **Parsing**: Config lines sorted by verbs (add → set → bind → link → enable → disable)
   - **Object Creation**: Lines converted to nested JSON structure based on regex patterns
   - **Application Abstraction**: Walks parsed config to identify and extract applications

3. **Application Digesters** (Extract different app types):
   - `src/digLbVserver.ts` - Load balancer virtual servers
   - `src/digCsVserver.ts` - Content switching virtual servers  
   - `src/digGslbVserver.ts` - Global server load balancing virtual servers
   - `src/digGslbService.ts` - GSLB services
   - `src/digCStoLbRefs.ts` - Content switching to load balancer references

4. **VS Code Integration**:
   - `src/extension.ts` - Main extension entry point and command registration
   - `src/extLoader.ts` - Extension loader with performance tracking
   - `src/nsCfgViewProvider.ts` - Tree view provider for config exploration
   - `src/templateViewProvider.ts` - Template exploration view

5. **Supporting Components**:
   - `src/models.ts` - TypeScript interfaces and data models
   - `src/nsDiag.ts` - Diagnostics engine for configuration analysis
   - `src/telemetry.ts` - Anonymous usage analytics (F5 TEEM)
   - `src/fastCore.ts` & `src/fastWebView.ts` - FAST template integration

### Key Data Flow

1. User imports .conf/.tgz file
2. UnPacker extracts config files from archives
3. ADC class parses config using RegExTree patterns
4. Specialized digesters walk parsed config to abstract applications
5. Applications displayed in VS Code tree view with diagnostics
6. FAST templates can be generated for F5 conversion

### Templates System

- `templates/as3/` - AS3 templates for TMOS conversion
- `templates/ns/` - NetScaler-specific templates  
- FAST template integration for F5 declarative configurations

### F5 FAST Core Integration

**NOTE**: The FAST template approach is being replaced by direct TypeScript conversion. See [AS3 Direct Conversion Engine](#as3-direct-conversion-engine) below.

The project relied on the [@f5devcentral/f5-fast-core](https://github.com/f5devcentral/f5-fast-core) library (v0.23.0) for template processing:

**Core Functionality**:
- Parses Mustache templates with extended YAML format
- Generates parameter schemas from template definitions
- Validates parameters against schemas
- Renders templates with user-provided data
- Supports Mustache partials and sections

**Usage in Flipper**:
- `src/fastCore.ts` - Main integration point for FAST template system
- `src/fastWebView.ts` & `src/fastWebViewFull.ts` - Web views for template rendering
- `tests/009_fast.unit.tests.ts` - Template system testing

**Template Structure**:
```yaml
title: Template Title
description: Template description
definitions:
  parameter_name:
    title: Parameter Title
    type: string/integer/boolean
    propertyOrder: 1
template: |
  # Mustache template content with {{parameter_name}} variables
```

**Template Development Challenges**:
- Templates use Mustache syntax with F5-specific extensions
- Parameter definitions require proper schema structure
- Template rendering depends on correct data type mappings
- NetScaler to F5 feature mapping requires domain expertise

**Template Reference Repository**:
- [F5 Application Services Templates](https://github.com/f5networks/f5-appsvcs-templates) - Official F5 repository containing example FAST templates and comprehensive documentation for template development patterns and best practices

**AS3 Documentation**:
- [F5 Application Services 3 Extension (AS3)](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/#) - Official documentation for AS3, the declarative configuration format that Flipper templates output. Essential reference for understanding the target JSON schema and configuration structure.

**NetScaler Documentation**:
- [NetScaler Gateway Configuration](https://docs.netscaler.com/en-us/netscaler-gateway/13-1/install-citrix-gateway/configure-citrix-gateway-settings/create-gateway-virtual-servers.html) - Official NetScaler documentation for configuration reference and understanding source configuration patterns that Flipper processes.

**VS Code Extension Development**:
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview) - Official documentation for VS Code webview communication patterns, message passing between extension and webview, and security considerations. Essential for understanding bidirectional communication between the extension and HTML preview pages.

### AS3 Direct Conversion Engine

**Status**: IN PROGRESS (Phase 1 Complete, Phase 2 In Progress)

The project is transitioning from FAST templates to direct TypeScript-based AS3 generation:

**New Architecture** (`src/as3/`):
- `index.ts` - Main entry: `buildAS3()`, `buildAS3Bulk()`
- `builders.ts` - Declaration, Service, Pool, Monitor builders
- `mappings.ts` - All NS → F5 mappings (LB methods, persistence, service types, monitors)
- `coverage.ts` - Coverage analysis and reporting

**Key Functions**:
```typescript
import { buildAS3, buildAS3Bulk } from './as3';

// Single app conversion
const result = buildAS3(app);
if (result.success) {
  console.log(JSON.stringify(result.as3, null, 2));
}

// Bulk conversion (multiple apps → single declaration)
const bulkResult = buildAS3Bulk(apps);
if (bulkResult.merged) {
  // Deploy merged declaration with all tenants
}
```

**Design Decisions**:
- No `template` property in Application (uses implicit generic)
- Custom naming: `vs_${appName}`, `pool_${appName}`, `mon_${monName}`
- Configurable tenant prefix (default: `t_`)
- Full type safety with TypeScript
- ~160 unit tests for mappings, builders, integration, coverage

**Output Structure**:
```json
{
  "class": "AS3",
  "declaration": {
    "class": "ADC",
    "schemaVersion": "3.50.0",
    "t_web_app": {
      "class": "Tenant",
      "app_web_app": {
        "class": "Application",
        "vs_web_app": { "class": "Service_HTTP", ... },
        "pool_web_app": { "class": "Pool", ... }
      }
    }
  }
}
```

**Planning Documents**:
- `specs/DIRECT_CONVERSION_ADR.md` - Architecture decision record
- `specs/DIRECT_CONVERSION_IMPL_SPEC.md` - Implementation specification
- `specs/NS_TO_F5_MAPPINGS.md` - Complete mapping reference
- `specs/CONVERSION_COVERAGE_SPEC.md` - Coverage tracking spec

### Configuration Files

- Extension settings in `package.json` contributes section
- VS Code launch/debug config in `.vscode/launch.json`
- TypeScript config optimized for VS Code extension development
- GitHub workflows for automated testing and building

### Testing Strategy

- Run tests before making changes with `npm run test`
- Maintain coverage thresholds (80% lines/functions, 70% branches)
- Test files mirror src structure with `.tests.ts` suffix
- Use diagnostics.json for test fixtures and validation

## Project Planning Documents

The project uses two main planning frameworks located in `specs/`:

### PROJECT ORCID (`specs/PROJECT_ORCID.md`)
**Purpose**: Overall project roadmap and major enhancement tracking

- **Scope**: 12 major initiatives across documentation, architecture, testing, and features
- **Status**: 6/12 sections complete (50% progress)
- **Focus Areas**:
  - Documentation updates (website, README)
  - RX Parsing Engine (✅ Complete)
  - Parser refinements (✅ Complete)
  - Unit test coverage (✅ Complete)
  - Extended feature detection (✅ Complete Phases 1-4)
  - Future work: Conversion templates, sanitization, WebView enhancements

### PROJECT BORG (`specs/BORG*.md`)
**Purpose**: Research and integration of predecessor NetScaler conversion tools

- **Relationship**: Implements PROJECT_ORCID Section 4.1 (Review Related Tools)
- **Scope**: Analysis of 13 existing conversion tools (6 local, 7 external)
- **Status**: Phase 1 ✅ COMPLETE (October 2025)
- **Key Outcomes**:
  - Analyzed competing/complementary tools (ns2f5.pl, cstalhood/Get-ADCVServerConfig, NSPEPI)
  - Object Type Expansion: 41 → 81 regex patterns (from cstalhood research)
  - Parser type enhancements and architecture decisions
  - Identified critical gaps: AppFW, nFactor chains, expression parsing

**Related Documents**:
- `specs/BORG.md` - Main research document (2408 lines)
- `specs/BORG_AUTH_REFERENCE.md` - Authentication patterns reference
- `specs/BORG_PHASE1_IMPLEMENTATION.md` - Phase 1 implementation details
- `specs/BORG_PHASE1_SUMMARY.md` - Phase 1 completion summary

**Key Insight**: BORG research directly informed the parser expansion and type system enhancements, providing battle-tested patterns from the NetScaler community.

## Development Notes

- Extension activates on `onView:f5-ns-container`
- Main processing happens asynchronously with EventEmitter patterns
- Heavy use of regex patterns for NetScaler config parsing
- Config abstraction follows NetScaler object hierarchy (CS → LB → Services → Servers)
- Diagnostics system provides analysis and recommendations for configs

## Prototyping Ideas

The following experimental concepts are being explored in the companion repository [flipper_webview](https://github.com/DumpySquare/flipper_webview):

### Enhanced Web Interface Prototype

- **Goal**: Create an improved HTML-based interface for Flipper data visualization
- **Approach**: Single-page application with toggleable views
- **Key Features**:
  - Navigation buttons for switching between data representations
  - Monaco editor integration for code viewing/editing
  - Multiple data view modes:
    - Original NetScaler config lines
    - Abstracted NS applications as JSON
    - FAST template HTML output
    - FAST template processed results

### Technical Experiments

- **Interactive Data Views**: Dynamic div toggling for seamless navigation between different data formats
- **Code Editor Integration**: Monaco editor setup for enhanced config viewing and editing
- **Multi-format Display**: Simultaneous representation of the same application data in multiple formats
- **Custom Styling**: Improved visual presentation through dedicated CSS

### Potential Integration Opportunities

- These prototyping ideas could enhance the current VS Code extension's webview capabilities
- The multi-view approach aligns with the extension's goal of showing config abstraction and conversion outputs
- Monaco editor integration could improve the current text-based config viewing experience
- The single-page navigation concept could streamline the user workflow within the extension

### Future Considerations

- Evaluate integration of prototype features into main extension
- Consider adopting the multi-view approach for better user experience
- Explore Monaco editor as alternative to current text viewing methods
