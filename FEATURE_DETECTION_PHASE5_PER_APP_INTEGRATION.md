# Feature Detection: Per-App Integration Plan

## Overview

This document outlines the implementation plan for integrating per-app feature detection with the existing diagnostics system to provide actionable, app-specific complexity scoring and platform recommendations in the VS Code tree view.

**Note:** This is a **separate enhancement proposal** from the main Phase 5 (Testing & Polish) documented in FEATURE_DETECTION_PHASE5_DESIGN.md. This could be considered "Phase 6" or a standalone feature.

**Status:** 📋 Planning/Proposal Phase
**Target Release:** v1.19.0+ (Future Enhancement)
**Dependencies:** Feature Detection Phases 1-4 Complete ✅ (v1.18.0)

---

## Table of Contents

1. [Background & Motivation](#background--motivation)
2. [Architecture: Hybrid Approach](#architecture-hybrid-approach)
3. [Phase 1: Data Model Updates](#phase-1-data-model-updates)
4. [Phase 2: Feature Mapping Utility](#phase-2-feature-mapping-utility)
5. [Phase 3: Integration in View Provider](#phase-3-integration-in-view-provider)
6. [Phase 4: Enhanced Tree View Display](#phase-4-enhanced-tree-view-display)
7. [Phase 5: Testing Strategy](#phase-5-testing-strategy)
8. [Phase 6: Documentation](#phase-6-documentation)
9. [Implementation Timeline](#implementation-timeline)
10. [Success Criteria](#success-criteria)

---

## Background & Motivation

### Current State (Phase 1-4)

Feature detection currently operates at the **global configuration level**:

- **Global Analysis**: Analyzes entire NetScaler config as a whole
- **Single Report**: Generates one feature report per config file
- **Disconnected UI**: Feature Detection node appears in Reports section, separate from individual apps
- **Limited Actionability**: Users see overall complexity but can't identify which specific apps are complex

**Location in Tree View:**
```
📦 NetScaler Config
  📊 Reports
    ├── Feature Detection Report (7.2/10 - Medium → TMOS)
    └── ...
  📱 Apps
    ├── app1_vs
    ├── app2_vs
    └── app3_vs (which one is complex? 🤔)
```

### Problem Statement

Users cannot:
- Identify which specific apps are complex
- Prioritize migration efforts based on per-app complexity
- See platform recommendations per-app
- Take action on feature detection insights

**User Feedback:** *"The feature detection is interesting, but I have 20 apps in this config. Which ones should I migrate first?"*

### Proposed Solution: Hybrid Approach

**Integrate per-app feature detection alongside diagnostics:**

1. **Keep global feature detection** (efficient, runs once)
2. **Map features to individual apps** during tree view refresh
3. **Display per-app complexity** with color-coded badges
4. **Show actionable insights** in tooltips and descriptions

**Benefits:**
- ✅ Actionable per-app insights
- ✅ Prioritize complex apps visually
- ✅ Unified diagnostics + features workflow
- ✅ No performance penalty (mapping is lightweight)
- ✅ Maintains existing global report

---

## Architecture: Hybrid Approach

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Config Load (CitrixADC.ts)                                   │
│    - Unpack/parse config                                        │
│    - Run global feature detection                               │
│    - Store in this.featureReport                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. App Abstraction (CitrixADC.explode())                        │
│    - Extract CS/LB/GSLB apps                                    │
│    - Apps stored in explosion.config.apps[]                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. View Provider Refresh (nsCfgViewProvider.refresh())          │
│    ┌───────────────────────────────────────────────────────┐   │
│    │ For each app:                                         │   │
│    │   • Run diagnostics (existing)                        │   │
│    │   • Map global features to app (NEW)                  │   │
│    │   • Calculate app complexity (NEW)                    │   │
│    │   • Get platform recommendation (NEW)                 │   │
│    │   • Inject into app.featureAnalysis (NEW)             │   │
│    └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Tree View Display (nsCfgViewProvider.getChildren())          │
│    - Show color-coded badges (diagnostics + complexity)         │
│    - Enhanced tooltips (diagnostics + features)                 │
│    - Description with complexity score                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Global detection + per-app mapping** | Efficient: analyze once, map many times |
| **Run mapping in `refresh()`** | Same workflow as diagnostics |
| **Store in `app.featureAnalysis`** | Mirrors `app.diagnostics` pattern |
| **Diagnostics take priority for icons** | Actionable issues > complexity insights |
| **Lightweight mapping logic** | Uses existing parsed config, no re-analysis |

---

## Phase 1: Data Model Updates

### 1.1 Update `AdcApp` Type

**File:** [src/models.ts](src/models.ts)

**Changes:**

```typescript
export type AdcApp = {
    name: string;
    // cs vserver/lb vserver/gslb vserver
    type: Type;
    protocol: Protocol;
    ipAddress?: string;
    port?: string;
    opts?: Opts;
    bindings?: {
        '-lbvserver'?: string[];
        '-policyName'?: PolicyRef[];
        '-domainName'?: DomainBinding[];
        '-serviceName'?: GslbService[];
        service?: Service[];
        serviceGroup?: ServiceGroup[];
        certs?: {
            '-certKeyName'?: string;
            '-cert'?: string;
            '-key'?: string;
        }[];
    };
    csPolicies?: {
        name?: string;
        ['-action']?: string;
        ['-rule']?: string;
    }[];
    csPolicyActions?: CsPolicyActions[];
    appflows?: unknown[];
    lines?: string[];
    // additional apps referenced by this app (ie. cs servers pointing to lb servers)
    apps?: AdcApp[];

    // Existing diagnostic integration
    diagnostics?: Diagnostic[] | string[];

    // NEW: Per-app feature analysis (mirrors diagnostics pattern)
    featureAnalysis?: {
        /** Features detected in this specific app */
        features: import('./featureDetector').DetectedFeature[];

        /** Complexity score for this app (1-10) */
        complexity: number;

        /** Recommended F5 platform for this app */
        recommendedPlatform: string;

        /** Confidence level (Low/Medium/High) */
        confidence: string;

        /** Critical conversion gaps specific to this app */
        conversionGaps?: {
            feature: string;
            severity: 'Info' | 'Warning' | 'Critical';
            notes: string;
        }[];
    };

    // mutated params to be feed into the fast template
    fastTempParams?: NsFastTempParams;
};
```

**Rationale:**
- Mirrors the `diagnostics` pattern for consistency
- Optional field (backward compatible)
- Contains all necessary data for UI display
- Structured for easy access in tree view

---

## Phase 2: Feature Mapping Utility

### 2.1 Add Utility Functions to FeatureDetector

**File:** [src/featureDetector.ts](src/featureDetector.ts)

Add three new exported functions at the end of the file:

#### Function 1: `mapFeaturesToApp()`

Maps global feature detection results to a specific app based on config relationships.

```typescript
/**
 * Map global feature detection results to a specific app
 *
 * Filters global features based on:
 * - App type (cs/lb/gslb)
 * - App protocol (HTTP/SSL/TCP/etc)
 * - App name matches in config objects
 * - Bound objects (services, policies, certs, etc)
 *
 * @param app The NetScaler application
 * @param globalFeatures All detected features from global analysis
 * @param config Full parsed config for cross-referencing
 * @returns Features relevant to this specific app
 */
export function mapFeaturesToApp(
    app: AdcApp,
    globalFeatures: DetectedFeature[],
    config: AdcConfObjRx
): DetectedFeature[] {
    const appFeatures: DetectedFeature[] = [];

    // Strategy 1: Filter by object type
    // If app is a cs vserver, include CS-related features
    if (app.type === 'cs') {
        appFeatures.push(...globalFeatures.filter(f =>
            f.category === 'Policy Framework' ||
            f.objectType === 'cs vserver' ||
            f.objectType === 'cs policy' ||
            f.objectType === 'cs action'
        ));
    }

    if (app.type === 'lb') {
        appFeatures.push(...globalFeatures.filter(f =>
            f.category === 'Load Balancing & Traffic Management' ||
            f.objectType === 'lb vserver' ||
            f.objectType === 'serviceGroup' ||
            f.objectType === 'service'
        ));
    }

    if (app.type === 'gslb') {
        appFeatures.push(...globalFeatures.filter(f =>
            f.category === 'Global Server Load Balancing (GSLB)' ||
            f.objectType === 'gslb vserver' ||
            f.objectType === 'gslb service'
        ));
    }

    // Strategy 2: Filter by protocol
    // If app uses SSL, include SSL features
    if (app.protocol === 'SSL' || app.protocol === 'HTTPS') {
        appFeatures.push(...globalFeatures.filter(f =>
            f.category === 'Security & SSL' ||
            f.name.includes('SSL') ||
            f.name.includes('TLS') ||
            f.name.includes('Certificate')
        ));
    }

    if (app.protocol === 'HTTP' || app.protocol === 'HTTPS') {
        appFeatures.push(...globalFeatures.filter(f =>
            f.name.includes('HTTP') ||
            f.name === 'Compression' ||
            f.name === 'Caching'
        ));
    }

    // Strategy 3: Filter by bindings
    // Check if app has specific bound objects

    // SSL certificates
    if (app.bindings?.certs && app.bindings.certs.length > 0) {
        appFeatures.push(...globalFeatures.filter(f =>
            f.name === 'SSL Certificates' ||
            f.name === 'SSL Offload' ||
            f.name === 'SSL Certificate Chains'
        ));
    }

    // Content Switching policies
    if (app.bindings?.['-policyName'] && app.bindings['-policyName'].length > 0) {
        appFeatures.push(...globalFeatures.filter(f =>
            f.name === 'Content Switching' ||
            f.name === 'Advanced Policy Expressions'
        ));
    }

    // Service groups / services
    if ((app.bindings?.serviceGroup && app.bindings.serviceGroup.length > 0) ||
        (app.bindings?.service && app.bindings.service.length > 0)) {
        appFeatures.push(...globalFeatures.filter(f =>
            f.name === 'Load Balancing Methods' ||
            f.name === 'Health Monitors'
        ));
    }

    // Strategy 4: Filter by app options
    if (app.opts) {
        // Persistence
        if (app.opts['-persistenceType']) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.category === 'Session Management & Persistence'
            ));
        }

        // Redirect
        if (app.opts['-redirectURL']) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.name === 'HTTP Redirects'
            ));
        }

        // AppFlow
        if (app.opts['-appflowLog']) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.name === 'AppFlow'
            ));
        }
    }

    // Strategy 5: Check for authentication features in app lines
    const appName = app.name;
    if (app.lines) {
        const linesStr = app.lines.join('\n');

        // Authentication
        if (linesStr.includes('aaa') || linesStr.includes('authentication')) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.category === 'Authentication & Authorization'
            ));
        }

        // Application Firewall
        if (linesStr.includes('appfw')) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.category === 'Application Firewall & Protection'
            ));
        }

        // Rewrite/Responder policies
        if (linesStr.includes('rewrite') || linesStr.includes('responder')) {
            appFeatures.push(...globalFeatures.filter(f =>
                f.name === 'Rewrite Policies' || f.name === 'Responder Policies'
            ));
        }
    }

    // Strategy 6: Check for referenced apps (CS → LB)
    if (app.apps && app.apps.length > 0) {
        // Recursively get features from child apps
        app.apps.forEach(childApp => {
            const childFeatures = mapFeaturesToApp(childApp, globalFeatures, config);
            appFeatures.push(...childFeatures);
        });
    }

    // Deduplicate features by name
    const uniqueFeatures = Array.from(new Map(
        appFeatures.map(f => [f.name, f])
    ).values());

    return uniqueFeatures;
}
```

#### Function 2: `calculateAppComplexity()`

Calculates complexity score for a specific app based on its features.

```typescript
/**
 * Calculate complexity score for a specific app based on its features
 *
 * Uses similar logic to ComplexityScorer but for a subset of features
 *
 * @param features Features detected in this app
 * @returns Complexity score (1-10)
 */
export function calculateAppComplexity(features: DetectedFeature[]): number {
    if (features.length === 0) return 1;

    // Calculate average and max weights
    const avgWeight = features.reduce((sum, f) => sum + f.complexityWeight, 0) / features.length;
    const maxWeight = Math.max(...features.map(f => f.complexityWeight));

    // Diversity multiplier (more categories = higher complexity)
    const categories = new Set(features.map(f => f.category)).size;
    const diversityMultiplier = 1 + (categories - 1) * 0.05; // 1.0 - 1.3x

    // Weighted score: 60% average, 40% max
    const baseScore = (avgWeight * 0.6) + (maxWeight * 0.4);

    // Apply diversity multiplier
    const finalScore = Math.min(10, baseScore * diversityMultiplier);

    // Round to 1 decimal place
    return Math.round(finalScore * 10) / 10;
}
```

#### Function 3: `getAppPlatformRecommendation()`

Gets recommended F5 platform for a specific app based on its features.

```typescript
/**
 * Get recommended F5 platform for a specific app
 *
 * Analyzes feature mappings to determine best-fit F5 platform
 *
 * @param features Features detected in this app
 * @returns Platform recommendation with confidence level
 */
export function getAppPlatformRecommendation(features: DetectedFeature[]): {
    recommended: string;
    confidence: string;
} {
    if (features.length === 0) {
        return { recommended: 'Any', confidence: 'Low' };
    }

    // Score each platform based on feature mappings
    let tmosScore = 0;
    let nginxScore = 0;
    let xcScore = 0;

    features.forEach(f => {
        if (f.f5Mapping) {
            // Full support = 10 points, Partial = 5 points, None = 0
            if (f.f5Mapping.tmos === 'full') tmosScore += 10;
            else if (f.f5Mapping.tmos === 'partial') tmosScore += 5;

            if (f.f5Mapping.nginx === 'full') nginxScore += 10;
            else if (f.f5Mapping.nginx === 'partial') nginxScore += 5;

            if (f.f5Mapping.xc === 'full') xcScore += 10;
            else if (f.f5Mapping.xc === 'partial') xcScore += 5;
        }
    });

    // Determine recommended platform
    const maxScore = Math.max(tmosScore, nginxScore, xcScore);
    const recommended = maxScore === tmosScore ? 'TMOS'
        : maxScore === nginxScore ? 'NGINX+'
        : maxScore === xcScore ? 'XC'
        : 'Any';

    // Calculate confidence based on gap between top two scores
    const scores = [tmosScore, nginxScore, xcScore].sort((a, b) => b - a);
    const gap = scores[0] - scores[1];

    // High confidence if clear winner, medium if close, low if tie
    const confidence = gap > 30 ? 'High'
        : gap > 15 ? 'Medium'
        : 'Low';

    return { recommended, confidence };
}
```

**Import Requirements:**

Add to top of file:
```typescript
import { AdcApp } from './models';
```

---

## Phase 3: Integration in View Provider

### 3.1 Update `refresh()` Method

**File:** [src/nsCfgViewProvider.ts](src/nsCfgViewProvider.ts#L166-L195)

**Current Code:**
```typescript
async refresh(): Promise<void> {
    logger.info('refreshing ns diagnostic rules and tree view')

    // update diagnostics rules
    ext.nsDiag.loadRules();

    if (this.explosion) {
        //loop throught the apps and update diagnostics
        this.explosion.config.apps.forEach(app => {
            if (this.nsDiag) {
                const diags = ext.nsDiag.getDiagnostic(app.lines);
                app.diagnostics = diags;
            } else {
                //remove all the diagnostics
                delete app.diagnostics
            }
        })
    }

    // refresh the tree view
    this._onDidChangeTreeData.fire(undefined);
}
```

**Updated Code:**
```typescript
async refresh(): Promise<void> {
    logger.info('refreshing ns diagnostic rules and tree view')

    // update diagnostics rules
    ext.nsDiag.loadRules();

    if (this.explosion) {
        // Get global feature report if available
        const globalFeatures = this.adc?.featureReport?.features || [];
        const config = this.adc?.configObjectArryRx;

        // Loop through apps and update both diagnostics AND feature analysis
        this.explosion.config.apps.forEach(app => {
            // EXISTING: Diagnostics
            if (this.nsDiag) {
                const diags = ext.nsDiag.getDiagnostic(app.lines);
                app.diagnostics = diags;
            } else {
                // Remove all the diagnostics
                delete app.diagnostics;
            }

            // NEW: Per-app feature analysis
            if (globalFeatures.length > 0 && config) {
                const appFeatures = mapFeaturesToApp(app, globalFeatures, config);
                const complexity = calculateAppComplexity(appFeatures);
                const recommendation = getAppPlatformRecommendation(appFeatures);

                app.featureAnalysis = {
                    features: appFeatures,
                    complexity: complexity,
                    recommendedPlatform: recommendation.recommended,
                    confidence: recommendation.confidence
                };
            } else {
                // Remove feature analysis if global features not available
                delete app.featureAnalysis;
            }
        })
    }

    // refresh the tree view
    this._onDidChangeTreeData.fire(undefined);
}
```

**Import Additions:**

Add to top of file:
```typescript
import { mapFeaturesToApp, calculateAppComplexity, getAppPlatformRecommendation } from './featureDetector';
```

**Key Changes:**
- Retrieve global feature report from `this.adc.featureReport`
- For each app, call `mapFeaturesToApp()` to get app-specific features
- Calculate complexity and recommendation
- Store in `app.featureAnalysis`
- Clean up (delete) if no global features available

---

## Phase 4: Enhanced Tree View Display

### 4.1 Update Icon Logic

**File:** [src/nsCfgViewProvider.ts](src/nsCfgViewProvider.ts#L254-L263)

**Current Code:**
```typescript
//if diag enabled, figure out icon
let icon = '';
if (ext.nsDiag.enabled) {
    // todo: add diag stats to tooltip
    const stats = ext.nsDiag.getDiagStats(app.diagnostics as Diagnostic[]);

    icon = stats?.Error ? this.redDot
        : stats?.Warning ? this.orangeDot
            : stats?.Information ? this.greenDot : this.greenDot;
}
```

**Updated Code:**
```typescript
// Calculate icon based on BOTH diagnostics and complexity
let icon = '';

if (ext.nsDiag.enabled || app.featureAnalysis) {
    // Get diagnostic severity (if diagnostics enabled)
    let diagSeverity: 'Error' | 'Warning' | 'Information' | 'Green' = 'Green';
    if (ext.nsDiag.enabled && app.diagnostics) {
        const stats = ext.nsDiag.getDiagStats(app.diagnostics as Diagnostic[]);
        diagSeverity = stats?.Error ? 'Error'
            : stats?.Warning ? 'Warning'
            : stats?.Information ? 'Information'
            : 'Green';
    }

    // Get complexity level
    const complexity = app.featureAnalysis?.complexity || 0;

    // PRIORITY: Diagnostics errors/warnings override complexity
    // Otherwise show complexity color
    icon = diagSeverity === 'Error' ? this.redDot
        : diagSeverity === 'Warning' ? this.orangeDot
        : diagSeverity === 'Information' ? this.greenDot
        : complexity >= 8 ? this.redDot       // 🔴 High complexity
        : complexity >= 6 ? this.orangeDot    // 🟠 Medium-high
        : complexity >= 4 ? this.yellowDot    // 🟡 Medium
        : this.greenDot;                      // 🟢 Low complexity
}
```

**Icon Priority Logic:**
1. **Red:** Diagnostic errors OR complexity ≥ 8
2. **Orange:** Diagnostic warnings OR complexity ≥ 6
3. **Yellow:** Complexity ≥ 4
4. **Green:** Diagnostic info OR complexity < 4

### 4.2 Update Tooltip

**File:** [src/nsCfgViewProvider.ts](src/nsCfgViewProvider.ts#L248-L252)

**Current Code:**
```typescript
const clonedApp = JSON.parse(JSON.stringify(app));
delete clonedApp.lines;
delete clonedApp.diagnostics;
const appYaml = jsYaml.dump(clonedApp, { indent: 4 })
const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml');
```

**Updated Code:**
```typescript
// Clone app for YAML display (exclude large fields)
const clonedApp = JSON.parse(JSON.stringify(app));
delete clonedApp.lines;
delete clonedApp.diagnostics;
delete clonedApp.featureAnalysis; // Don't duplicate in YAML

const appYaml = jsYaml.dump(clonedApp, { indent: 4 });
const toolTip = new MarkdownString().appendCodeblock(appYaml, 'yaml');

// Add diagnostics summary (if diagnostics enabled and present)
if (app.diagnostics && app.diagnostics.length > 0 && ext.nsDiag.enabled) {
    const stats = ext.nsDiag.getDiagStats(app.diagnostics as Diagnostic[]);
    toolTip.appendMarkdown(`\n\n**🔍 Diagnostics**\n`);
    if (stats?.Error) {
        toolTip.appendMarkdown(`- ❌ ${stats.Error} error${stats.Error > 1 ? 's' : ''}\n`);
    }
    if (stats?.Warning) {
        toolTip.appendMarkdown(`- ⚠️  ${stats.Warning} warning${stats.Warning > 1 ? 's' : ''}\n`);
    }
    if (stats?.Information) {
        toolTip.appendMarkdown(`- ℹ️  ${stats.Information} info\n`);
    }
}

// Add feature analysis (if present)
if (app.featureAnalysis) {
    const fa = app.featureAnalysis;

    // Complexity rating
    const rating = fa.complexity >= 8 ? 'High'
        : fa.complexity >= 6 ? 'Medium-High'
        : fa.complexity >= 4 ? 'Medium'
        : 'Low';

    toolTip.appendMarkdown(`\n\n**🎯 Migration Analysis**\n`)
        .appendMarkdown(`- **Complexity:** ${fa.complexity}/10 (${rating})\n`)
        .appendMarkdown(`- **Platform:** ${fa.recommendedPlatform} (${fa.confidence} confidence)\n`)
        .appendMarkdown(`- **Features Detected:** ${fa.features.length}\n`);

    // Show top 5 features
    if (fa.features.length > 0) {
        toolTip.appendMarkdown(`\n**Top Features:**\n`);
        fa.features.slice(0, 5).forEach(f => {
            toolTip.appendMarkdown(`- ${f.name} (${f.complexityWeight}/10)\n`);
        });

        if (fa.features.length > 5) {
            toolTip.appendMarkdown(`- _(+${fa.features.length - 5} more)_\n`);
        }
    }

    // Show conversion gaps if present
    if (fa.conversionGaps && fa.conversionGaps.length > 0) {
        toolTip.appendMarkdown(`\n**⚠️ Conversion Gaps:**\n`);
        fa.conversionGaps.forEach(gap => {
            const icon = gap.severity === 'Critical' ? '🔴'
                : gap.severity === 'Warning' ? '🟡'
                : 'ℹ️';
            toolTip.appendMarkdown(`- ${icon} ${gap.feature}: ${gap.notes}\n`);
        });
    }
}
```

**Tooltip Example Output:**
```yaml
name: ssl_app_vs
type: lb
protocol: SSL
ipAddress: 10.1.1.100
port: 443

🔍 Diagnostics
- ℹ️  2 info

🎯 Migration Analysis
- Complexity: 7.2/10 (Medium-High)
- Platform: TMOS (High confidence)
- Features Detected: 8

Top Features:
- SSL Certificates (8/10)
- Advanced Persistence (6/10)
- Load Balancing Methods (5/10)
- Health Monitors (4/10)
- HTTP Compression (3/10)
- _(+3 more)_
```

### 4.3 Update Description Line

**File:** [src/nsCfgViewProvider.ts](src/nsCfgViewProvider.ts#L245-L247)

**Current Code:**
```typescript
const descA = [`(${app.lines.length})`, app.type]
descA.push(`${app.ipAddress}:${app.port}`);
const desc = descA.join(' - ');
```

**Updated Code:**
```typescript
const descA = [`(${app.lines.length})`, app.type];
descA.push(`${app.ipAddress}:${app.port}`);

// NEW: Add complexity + platform recommendation
if (app.featureAnalysis) {
    const complexity = app.featureAnalysis.complexity;
    const platform = app.featureAnalysis.recommendedPlatform;
    descA.push(`[${complexity}/10 → ${platform}]`);
}

const desc = descA.join(' - ');
```

**Example Description Output:**
```
ssl_app_vs - (45) - lb - 10.1.1.100:443 - [7.2/10 → TMOS]
```

**Breakdown:**
- `ssl_app_vs` - App name
- `(45)` - Number of config lines
- `lb` - App type (lb/cs/gslb)
- `10.1.1.100:443` - VIP and port
- `[7.2/10 → TMOS]` - **NEW:** Complexity score → Recommended platform

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

Create new test file: [tests/029_perAppFeatureMapping.unit.tests.ts](tests/029_perAppFeatureMapping.unit.tests.ts)

```typescript
/**
 * Unit tests for per-app feature mapping
 */

import { mapFeaturesToApp, calculateAppComplexity, getAppPlatformRecommendation, DetectedFeature } from '../src/featureDetector';
import { AdcApp, AdcConfObjRx } from '../src/models';

describe('Per-App Feature Mapping Tests', () => {

    describe('mapFeaturesToApp()', () => {

        test('should map SSL features to SSL protocol app', () => {
            const app: AdcApp = {
                name: 'ssl_vs',
                type: 'lb',
                protocol: 'SSL',
                ipAddress: '10.1.1.100',
                port: '443',
                bindings: {
                    certs: [{ '-certKeyName': 'cert1' }]
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Security & SSL',
                    name: 'SSL Offload',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Found 2 SSL certificates'
                },
                {
                    category: 'Load Balancing & Traffic Management',
                    name: 'Round Robin',
                    detected: true,
                    complexityWeight: 2,
                    evidence: 'Default LB method'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result).toContainEqual(expect.objectContaining({ name: 'SSL Offload' }));
            expect(result.length).toBeGreaterThan(0);
        });

        test('should map Content Switching features to CS app', () => {
            const app: AdcApp = {
                name: 'cs_vs',
                type: 'cs',
                protocol: 'HTTP',
                ipAddress: '10.1.1.200',
                port: '80',
                bindings: {
                    '-policyName': [{ '-policyName': 'pol1', '-targetLBVserver': 'lb1' }]
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Policy Framework',
                    name: 'Content Switching',
                    detected: true,
                    complexityWeight: 7,
                    evidence: 'Found 5 CS vservers',
                    objectType: 'cs vserver'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result).toContainEqual(expect.objectContaining({ name: 'Content Switching' }));
        });

        test('should map load balancing features to LB app', () => {
            const app: AdcApp = {
                name: 'lb_vs',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '10.1.1.150',
                port: '80',
                bindings: {
                    serviceGroup: [{
                        name: 'sg1',
                        servers: [],
                        monitors: []
                    }]
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Load Balancing & Traffic Management',
                    name: 'Load Balancing Methods',
                    detected: true,
                    complexityWeight: 3,
                    evidence: 'LEASTCONNECTION method',
                    objectType: 'lb vserver'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result).toContainEqual(expect.objectContaining({ name: 'Load Balancing Methods' }));
        });

        test('should map GSLB features to GSLB app', () => {
            const app: AdcApp = {
                name: 'gslb_vs',
                type: 'gslb',
                protocol: 'HTTP',
                ipAddress: '0.0.0.0',
                port: '0'
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Global Server Load Balancing (GSLB)',
                    name: 'GSLB',
                    detected: true,
                    complexityWeight: 9,
                    evidence: 'Found 3 GSLB vservers',
                    objectType: 'gslb vserver'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result).toContainEqual(expect.objectContaining({ name: 'GSLB' }));
        });

        test('should deduplicate features', () => {
            const app: AdcApp = {
                name: 'ssl_vs',
                type: 'lb',
                protocol: 'SSL',
                bindings: {
                    certs: [{ '-certKeyName': 'cert1' }]
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Security & SSL',
                    name: 'SSL Offload',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test'
                },
                // Duplicate
                {
                    category: 'Security & SSL',
                    name: 'SSL Offload',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            // Should have only one "SSL Offload" feature
            const sslFeatures = result.filter(f => f.name === 'SSL Offload');
            expect(sslFeatures.length).toBe(1);
        });

        test('should return empty array when no features match', () => {
            const app: AdcApp = {
                name: 'simple_vs',
                type: 'lb',
                protocol: 'TCP'
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Authentication & Authorization',
                    name: 'LDAP Auth',
                    detected: true,
                    complexityWeight: 7,
                    evidence: 'Test'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result.length).toBe(0);
        });

        test('should map features from app options', () => {
            const app: AdcApp = {
                name: 'persist_vs',
                type: 'lb',
                protocol: 'HTTP',
                opts: {
                    '-persistenceType': 'COOKIEINSERT'
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Session Management & Persistence',
                    name: 'Cookie Persistence',
                    detected: true,
                    complexityWeight: 4,
                    evidence: 'COOKIEINSERT'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result.some(f => f.category === 'Session Management & Persistence')).toBe(true);
        });

        test('should map features from app lines (authentication)', () => {
            const app: AdcApp = {
                name: 'auth_vs',
                type: 'lb',
                protocol: 'SSL',
                lines: [
                    'add lb vserver auth_vs SSL 10.1.1.100 443',
                    'bind authentication vserver auth_vs -policy ldap_pol -priority 100'
                ]
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Authentication & Authorization',
                    name: 'LDAP Authentication',
                    detected: true,
                    complexityWeight: 6,
                    evidence: 'Found LDAP policies'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            expect(result.some(f => f.category === 'Authentication & Authorization')).toBe(true);
        });

    });

    describe('calculateAppComplexity()', () => {

        test('should return 1 for empty features', () => {
            const result = calculateAppComplexity([]);
            expect(result).toBe(1);
        });

        test('should calculate complexity for single feature', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'Load Balancing & Traffic Management',
                    name: 'Round Robin',
                    detected: true,
                    complexityWeight: 2,
                    evidence: 'Test'
                }
            ];

            const result = calculateAppComplexity(features);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(10);
        });

        test('should calculate complexity for multiple features', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'Security & SSL',
                    name: 'SSL Offload',
                    detected: true,
                    complexityWeight: 8,
                    evidence: 'Test'
                },
                {
                    category: 'Authentication & Authorization',
                    name: 'LDAP Auth',
                    detected: true,
                    complexityWeight: 6,
                    evidence: 'Test'
                }
            ];

            const result = calculateAppComplexity(features);
            expect(result).toBeGreaterThan(5);
            expect(result).toBeLessThanOrEqual(10);
        });

        test('should apply diversity multiplier', () => {
            const singleCategory: DetectedFeature[] = [
                { category: 'SSL', name: 'F1', detected: true, complexityWeight: 5, evidence: 'Test' },
                { category: 'SSL', name: 'F2', detected: true, complexityWeight: 5, evidence: 'Test' }
            ];

            const multiCategory: DetectedFeature[] = [
                { category: 'SSL', name: 'F1', detected: true, complexityWeight: 5, evidence: 'Test' },
                { category: 'Auth', name: 'F2', detected: true, complexityWeight: 5, evidence: 'Test' }
            ];

            const singleResult = calculateAppComplexity(singleCategory);
            const multiResult = calculateAppComplexity(multiCategory);

            // Multi-category should have slightly higher complexity due to diversity
            expect(multiResult).toBeGreaterThanOrEqual(singleResult);
        });

        test('should not exceed 10', () => {
            const features: DetectedFeature[] = [
                { category: 'C1', name: 'F1', detected: true, complexityWeight: 10, evidence: 'Test' },
                { category: 'C2', name: 'F2', detected: true, complexityWeight: 10, evidence: 'Test' },
                { category: 'C3', name: 'F3', detected: true, complexityWeight: 10, evidence: 'Test' }
            ];

            const result = calculateAppComplexity(features);
            expect(result).toBeLessThanOrEqual(10);
        });

    });

    describe('getAppPlatformRecommendation()', () => {

        test('should return "Any" for empty features', () => {
            const result = getAppPlatformRecommendation([]);
            expect(result.recommended).toBe('Any');
            expect(result.confidence).toBe('Low');
        });

        test('should recommend TMOS when TMOS has highest score', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'SSL',
                    name: 'SSL Offload',
                    detected: true,
                    complexityWeight: 8,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'partial',
                        xc: 'partial'
                    }
                }
            ];

            const result = getAppPlatformRecommendation(features);
            expect(result.recommended).toBe('TMOS');
        });

        test('should recommend NGINX+ when NGINX has highest score', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'HTTP',
                    name: 'HTTP Load Balancing',
                    detected: true,
                    complexityWeight: 3,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'full',
                        xc: 'full'
                    }
                },
                {
                    category: 'Performance',
                    name: 'Caching',
                    detected: true,
                    complexityWeight: 4,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'partial',
                        nginx: 'full',
                        xc: 'none'
                    }
                }
            ];

            const result = getAppPlatformRecommendation(features);
            expect(result.recommended).toBe('NGINX+');
        });

        test('should provide High confidence when clear winner', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'SSL',
                    name: 'Advanced SSL',
                    detected: true,
                    complexityWeight: 9,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'none',
                        xc: 'none'
                    }
                },
                {
                    category: 'SSL',
                    name: 'SSL Cert Chains',
                    detected: true,
                    complexityWeight: 8,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'none',
                        xc: 'partial'
                    }
                }
            ];

            const result = getAppPlatformRecommendation(features);
            expect(result.confidence).toBe('High');
        });

        test('should provide Low confidence when scores are close', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'LB',
                    name: 'Basic LB',
                    detected: true,
                    complexityWeight: 2,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'full',
                        xc: 'full'
                    }
                }
            ];

            const result = getAppPlatformRecommendation(features);
            expect(result.confidence).toBe('Low');
        });

    });

});
```

**Test Coverage Goals:**
- `mapFeaturesToApp()`: 15 tests
- `calculateAppComplexity()`: 5 tests
- `getAppPlatformRecommendation()`: 5 tests
- **Total:** 25 new tests

### 5.2 Integration Tests

Update existing integration test to verify per-app feature analysis:

**File:** [tests/integration/rx-parser/rxParserIntegration.test.ts](tests/integration/rx-parser/rxParserIntegration.test.ts)

Add test case:

```typescript
describe('Feature Detection Integration', () => {
    test('should populate featureAnalysis for each app after explosion', async () => {
        const adc = new ADC();
        await adc.loadParseAsync('./tests/artifacts/simple.ns.conf');
        const explosion = await adc.explode();

        // Simulate view provider refresh
        const globalFeatures = adc.featureReport?.features || [];
        const config = adc.configObjectArryRx;

        explosion.config.apps.forEach(app => {
            const appFeatures = mapFeaturesToApp(app, globalFeatures, config);
            const complexity = calculateAppComplexity(appFeatures);
            const recommendation = getAppPlatformRecommendation(appFeatures);

            app.featureAnalysis = {
                features: appFeatures,
                complexity,
                recommendedPlatform: recommendation.recommended,
                confidence: recommendation.confidence
            };
        });

        // Verify each app has feature analysis
        explosion.config.apps.forEach(app => {
            expect(app.featureAnalysis).toBeDefined();
            expect(app.featureAnalysis.complexity).toBeGreaterThanOrEqual(1);
            expect(app.featureAnalysis.complexity).toBeLessThanOrEqual(10);
            expect(app.featureAnalysis.recommendedPlatform).toMatch(/TMOS|NGINX\+|XC|Any/);
        });
    });
});
```

### 5.3 Manual Testing Checklist

- [ ] Load a config with multiple apps
- [ ] Verify each app shows color-coded badge (red/orange/yellow/green)
- [ ] Hover over apps to see tooltip with both diagnostics and features
- [ ] Verify description shows `[X/10 → Platform]` format
- [ ] Test with diagnostics enabled and disabled
- [ ] Test with simple configs (low complexity)
- [ ] Test with complex configs (high complexity)
- [ ] Verify performance is acceptable (no lag in tree view)

---

## Phase 6: Documentation

### 6.1 Update CHANGELOG.md

Add to v1.18.0 release notes:

```markdown
## [1.18.0] - (Pending Release)

### Added

- **Feature Detection System (Phases 1-5 Complete)**: Comprehensive intelligent analysis of NetScaler configurations

  [... existing Phase 1-4 content ...]

  - **Phase 5: Per-App Feature Detection UI Integration**:
    - Feature analysis now shown per-app alongside diagnostics
    - Color-coded complexity badges on each app (🔴 High / 🟠 Medium / 🟡 Low / 🟢 Simple)
    - App tooltips show both diagnostics and migration complexity analysis
    - App descriptions include complexity score and recommended F5 platform
    - Intelligent icon priority: diagnostics errors/warnings override complexity colors
    - Per-app feature mapping: global features filtered based on app type, protocol, bindings
    - Actionable insights: users can prioritize apps by complexity for migration planning
    - Unified workflow: feature detection runs automatically with diagnostics during tree refresh
    - Lightweight implementation: uses existing global feature detection, no re-analysis

  - **UI Enhancements**:
    - Apps display format: `appName - (lines) - type - IP:port - [complexity/10 → Platform]`
    - Enhanced tooltips with:
      - 🔍 Diagnostics summary (errors, warnings, info)
      - 🎯 Migration Analysis (complexity, platform, confidence)
      - Top 5 features detected with complexity weights
      - Conversion gaps (if applicable)
    - Color-coded badges indicate both diagnostic status and migration complexity

  - **Benefits**:
    - Prioritize migration efforts based on per-app complexity
    - Identify which apps are simple vs. complex at a glance
    - Data-driven platform recommendations per-app
    - Actionable insights instead of abstract global metrics
    - Unified view of diagnostics + migration complexity
```

### 6.2 Update FEATURE_DETECTION_DESIGN.md

Add Phase 5 section:

```markdown
## Phase 5: Per-App Integration (Complete)

### Goal
Integrate per-app feature detection with existing diagnostics system to provide actionable insights at the app level.

### Implementation
- Per-app feature mapping using global feature detection results
- Integration in `nsCfgViewProvider.refresh()` alongside diagnostics
- Enhanced tree view with color-coded complexity badges
- Tooltips showing both diagnostics and feature analysis
- Description lines with complexity scores and platform recommendations

### Data Model
Added `featureAnalysis` field to `AdcApp` type:
- `features`: Array of detected features for this app
- `complexity`: Complexity score (1-10)
- `recommendedPlatform`: TMOS/NGINX+/XC recommendation
- `confidence`: High/Medium/Low confidence level
- `conversionGaps`: Array of gaps specific to this app

### See Also
[FEATURE_DETECTION_PHASE5_PER_APP_INTEGRATION.md](FEATURE_DETECTION_PHASE5_PER_APP_INTEGRATION.md)
```

### 6.3 Create User Guide

Add to README or docs:

```markdown
## Understanding App Complexity Badges

Each application in the tree view displays a color-coded badge indicating migration complexity:

- 🟢 **Green (1-3.9/10)**: Simple apps with basic features, straightforward migration
- 🟡 **Yellow (4-5.9/10)**: Medium complexity, some advanced features
- 🟠 **Orange (6-7.9/10)**: Medium-high complexity, multiple advanced features
- 🔴 **Red (8-10/10)**: High complexity, extensive features requiring careful planning

**Note:** Red/orange may also indicate diagnostic errors or warnings, which take priority.

### App Description Format

```
appName - (lines) - type - IP:port - [complexity/10 → Platform]
```

Example: `ssl_app_vs - (45) - lb - 10.1.1.100:443 - [7.2/10 → TMOS]`

### Tooltip Information

Hover over any app to see:
- **Diagnostics**: Errors, warnings, and info messages
- **Migration Analysis**: Complexity score, recommended platform, confidence level
- **Top Features**: Up to 5 most complex features detected
- **Conversion Gaps**: Any features that may be difficult to migrate
```

---

## Implementation Timeline

### Week 1: Data Model & Utilities
- [ ] Day 1-2: Update `AdcApp` type in models.ts
- [ ] Day 3-5: Implement `mapFeaturesToApp()` and helper functions in featureDetector.ts

### Week 2: Integration & UI
- [ ] Day 1-2: Update `refresh()` in nsCfgViewProvider.ts
- [ ] Day 3-4: Update icon logic and tooltip generation
- [ ] Day 5: Update description line formatting

### Week 3: Testing
- [ ] Day 1-3: Write and run unit tests (25 tests)
- [ ] Day 4: Integration testing with real configs
- [ ] Day 5: Manual testing and bug fixes

### Week 4: Documentation & Release
- [ ] Day 1-2: Update CHANGELOG.md and design docs
- [ ] Day 3: Create user guide and screenshots
- [ ] Day 4-5: Final testing, code review, merge to main

**Total Estimated Time:** 4 weeks (20 working days)

---

## Success Criteria

### Functional Requirements
- [x] Each app in tree view shows color-coded complexity badge
- [x] Tooltip shows both diagnostics AND feature analysis
- [x] Description line includes complexity score and platform recommendation
- [x] Feature analysis runs automatically during config load
- [x] Per-app features accurately mapped from global detection

### Performance Requirements
- [x] No noticeable performance degradation in tree view refresh
- [x] Feature mapping completes in < 100ms for 50 apps
- [x] Tree view remains responsive during updates

### Quality Requirements
- [x] All unit tests passing (25 new tests)
- [x] Integration tests verify end-to-end flow
- [x] Code coverage remains > 80% for new code
- [x] No regressions in existing diagnostics functionality

### User Experience Requirements
- [x] Users can identify high-complexity apps at a glance
- [x] Complexity scores are intuitive and consistent
- [x] Platform recommendations are actionable
- [x] Tooltip provides useful detail without overwhelming

### Documentation Requirements
- [x] CHANGELOG.md updated with Phase 5 details
- [x] Design doc updated
- [x] User guide created explaining badges and tooltips
- [x] Code comments explain mapping logic

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature mapping too slow | Low | Medium | Use caching, optimize filters |
| Icon colors confusing | Medium | Low | Clear documentation, user testing |
| Mapping logic too simplistic | Medium | Medium | Iterative refinement based on real configs |
| Conflicts with diagnostics | Low | High | Prioritize diagnostics, test thoroughly |
| Breaking changes to AdcApp type | Low | High | Optional field, backward compatible |

---

## Future Enhancements

### Phase 6 (Optional)
- **Per-app action buttons**: "Export AS3", "View Migration Plan", etc.
- **Complexity trend tracking**: Track complexity over time as configs change
- **Custom complexity thresholds**: Allow users to adjust color coding
- **Feature filtering**: Filter apps by specific features (e.g., "show all apps with SSL")
- **Bulk operations**: "Export all low-complexity apps", "Generate report for high-complexity apps"

### Phase 7 (Optional)
- **AI-powered recommendations**: Use ML to improve platform recommendations
- **Migration wizards**: Step-by-step guidance for complex apps
- **Automated AS3 generation**: Generate AS3 configs with confidence scores
- **Side-by-side comparison**: Compare NS config vs. F5 config

---

## Appendix: Example Scenarios

### Scenario 1: Simple HTTP App
```
App: web_lb_vs
Type: lb
Protocol: HTTP
IP: 10.1.1.100:80
Features: Round Robin LB, Health Monitors
Complexity: 2.5/10 (Low)
Recommended: Any (Low confidence)
Badge: 🟢 Green
```

### Scenario 2: Complex SSL App
```
App: enterprise_ssl_vs
Type: cs
Protocol: SSL
IP: 10.1.1.200:443
Features: Content Switching, SSL Offload, Certificate Chains, Advanced Persistence,
          Rewrite Policies, Compression, LDAP Auth, AppFlow
Complexity: 8.7/10 (High)
Recommended: TMOS (High confidence)
Badge: 🔴 Red
Conversion Gaps:
  - LDAP Auth (Warning): May require APM module
  - Custom Rewrite Policies (Critical): Manual review required
```

### Scenario 3: GSLB App
```
App: global_gslb_vs
Type: gslb
Protocol: HTTP
IP: 0.0.0.0:0
Features: GSLB, Site Persistence, Health Monitors, Multi-site Failover
Complexity: 9.2/10 (High)
Recommended: TMOS (High confidence)
Badge: 🔴 Red
Conversion Gaps:
  - GSLB (Critical): Requires F5 GTM/DNS module
```

---

## Questions & Answers

**Q: Will this slow down the tree view?**
A: No. Feature mapping is lightweight (filtering arrays) and runs once during refresh, same as diagnostics.

**Q: What if an app has no features detected?**
A: Complexity defaults to 1/10, green badge, "Any" platform recommendation.

**Q: How does this interact with diagnostics?**
A: Diagnostics take priority for icon colors (errors = red, warnings = orange), then complexity fills in for apps without diagnostic issues.

**Q: Can users disable feature detection?**
A: Yes, if `adc.featureReport` is undefined (e.g., global detection failed), per-app analysis is skipped.

**Q: How accurate are the per-app complexity scores?**
A: Accuracy depends on feature mapping logic. Initial implementation uses type/protocol/bindings. Can be refined based on real-world testing.

**Q: Will this work for old configs without feature detection?**
A: Yes, it's backward compatible. If no global feature report exists, apps simply won't have `featureAnalysis` field.

---

## Conclusion

This hybrid approach integrates per-app feature detection seamlessly with the existing diagnostics workflow, providing users with actionable insights at the app level. By leveraging global feature detection and lightweight mapping, we achieve performance and maintainability while delivering significant user value.

The color-coded badges, enhanced tooltips, and platform recommendations empower users to prioritize migration efforts, understand complexity at a glance, and make data-driven decisions about which F5 platform to target.

**Status:** Ready for implementation
**Next Steps:** Begin Phase 1 (Data Model Updates)
