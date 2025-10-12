# Feature Detection System - Design Document

**Status**: Planning
**Priority**: High
**Related**: [PROJECT_ORCID.md](PROJECT_ORCID.md) Section 7.1

---

## Overview

This document outlines the design for a comprehensive feature detection system that identifies and categorizes NetScaler application capabilities. The system will enable intelligent platform recommendations, conversion guidance, and feature gap analysis for F5 platform migrations.

---

## Goals

1. **Feature Inventory**: Automatically identify all features/capabilities used by each NetScaler application
2. **Platform Compatibility**: Assess which F5 platforms (TMOS, NGINX+, XC) can support detected features
3. **Conversion Guidance**: Provide recommendations and warnings during migration planning
4. **Reporting**: Generate feature summaries and compatibility matrices
5. **Template Selection**: Auto-suggest appropriate FAST templates based on detected features

---

## Architecture: Hybrid Approach

The system uses **both** abstraction-time detection **and** diagnostic rule validation:

### 1. Feature Detection During Abstraction
**Location**: Digesters ([src/digLbVserver.ts](src/digLbVserver.ts), [src/digCsVserver.ts](src/digCsVserver.ts), etc.)

**Purpose**: Detect what features are actively configured in applications

**Benefits**:
- Context-rich: Full application structure available
- Efficient: Single pass during abstraction
- Natural fit: Features belong to application objects
- Clean separation: "What capabilities does this use?"

### 2. Feature Compatibility via Diagnostics
**Location**: [src/nsDiag.ts](src/nsDiag.ts) diagnostic rules

**Purpose**: Validate feature compatibility and flag conversion issues

**Benefits**:
- Reuses existing diagnostic infrastructure
- Pattern-based validation
- Actionable warnings: "What's problematic for conversion?"
- Extensible rule system

---

## Data Model

### Feature Schema

```typescript
// In src/models.ts

/**
 * Application feature flags detected during abstraction
 */
export interface AppFeatures {
  // Core protocol configuration
  protocols: ProtocolType[];

  // SSL/TLS capabilities
  ssl: {
    client: boolean;          // Frontend SSL
    server: boolean;          // Backend SSL
    sni: boolean;             // SNI support
    cipherSuites?: string[];  // Specific cipher configurations
    certificates?: string[];  // Certificate names
  };

  // Session persistence
  persistence: {
    types: PersistenceType[];
    timeout?: number;
    backup?: boolean;
  };

  // Load balancing
  loadBalancing: {
    method: string;           // ROUNDROBIN, LEASTCONNECTION, etc.
    monitors: string[];       // Health monitor types
    weights: boolean;         // Service weights configured
    spillover: boolean;
  };

  // Content switching
  contentSwitching: {
    enabled: boolean;
    policies: number;         // Policy count
    rules: string[];          // Rule types (URL, HEADER, etc.)
  };

  // HTTP features
  http: {
    compression: boolean;
    caching: boolean;
    http2: boolean;
    headerManipulation: boolean;
  };

  // Security features
  security: {
    waf: boolean;
    authentication: AuthType[];   // LDAP, SAML, etc.
    authorization: boolean;
    responder: boolean;
    rewrite: boolean;
    rateLimit: boolean;
    botManagement: boolean;
    ipReputation: boolean;
  };

  // Advanced features
  advanced: {
    appflow: boolean;         // NetFlow/analytics
    spillover: boolean;
    backupVserver: boolean;
    redirectUrl: boolean;
    trafficDomains: boolean;
  };

  // Network features
  network: {
    ipv6: boolean;
    vlans: string[];
    networkProfiles?: string[];
  };
}

/**
 * F5 platform compatibility assessment
 */
export interface F5Compatibility {
  tmos: {
    compatible: boolean;
    score: number;            // 0-100 compatibility score
    missingFeatures: string[];
    notes: string[];
    recommendedModules?: string[];  // LTM, AFM, APM, etc.
  };

  nginx: {
    compatible: boolean;
    score: number;
    missingFeatures: string[];
    notes: string[];
    requiresNginxPlus?: boolean;
  };

  xc: {
    compatible: boolean;
    score: number;
    missingFeatures: string[];
    notes: string[];
  };

  // Overall recommendation
  recommended: 'tmos' | 'nginx' | 'xc' | 'hybrid';
  confidence: number;         // 0-100 confidence in recommendation
}

/**
 * Type definitions
 */
export type ProtocolType = 'HTTP' | 'HTTPS' | 'TCP' | 'UDP' | 'SSL' |
                           'DNS' | 'FTP' | 'RADIUS' | 'RDP';

export type PersistenceType = 'SOURCEIP' | 'COOKIEINSERT' | 'SSLSESSION' |
                              'DESTIP' | 'SRCIPDESTIP' | 'CALLID' | 'RULE';

export type AuthType = 'LDAP' | 'RADIUS' | 'SAML' | 'OAUTH' |
                       'CERT' | 'NEGOTIATE' | 'LOCAL';

/**
 * Extended AdcApp interface with feature detection
 */
export interface AdcApp {
  // ... existing fields (name, protocol, etc.)

  /**
   * Detected application features
   */
  features?: AppFeatures;

  /**
   * F5 platform compatibility assessment
   */
  f5Compatibility?: F5Compatibility;

  /**
   * Feature-based complexity score (0-100)
   */
  complexityScore?: number;
}
```

---

## Implementation Strategy

### Phase 1: Feature Detector Framework

**Create base feature detection utilities**:

```typescript
// src/featureDetector.ts

import { AppFeatures, F5Compatibility } from './models';

/**
 * Detects features from parsed NetScaler configuration
 */
export class FeatureDetector {

  /**
   * Analyze LB vserver and return detected features
   */
  static detectLbVserverFeatures(
    vserver: any,
    services: any[],
    bindings: any[]
  ): AppFeatures {
    return {
      protocols: this.detectProtocols(vserver),
      ssl: this.detectSslFeatures(vserver, bindings),
      persistence: this.detectPersistence(vserver, bindings),
      loadBalancing: this.detectLoadBalancing(vserver, services),
      http: this.detectHttpFeatures(vserver, bindings),
      security: this.detectSecurityFeatures(vserver, bindings),
      // ... etc
    };
  }

  /**
   * Analyze CS vserver and return detected features
   */
  static detectCsVserverFeatures(
    vserver: any,
    policies: any[],
    bindings: any[]
  ): AppFeatures {
    // Similar structure for CS vservers
  }

  /**
   * Assess F5 platform compatibility based on features
   */
  static assessF5Compatibility(features: AppFeatures): F5Compatibility {
    return {
      tmos: this.assessTmosCompatibility(features),
      nginx: this.assessNginxCompatibility(features),
      xc: this.assessXcCompatibility(features),
      recommended: this.getRecommendation(features),
      confidence: this.calculateConfidence(features)
    };
  }

  /**
   * Calculate application complexity score
   */
  static calculateComplexity(features: AppFeatures): number {
    // 0-100 score based on feature count and complexity
    // Simple HTTP LB = 20
    // Complex WAF + Auth + CS = 90
  }

  // Private helper methods for each feature category
  private static detectProtocols(vserver: any): ProtocolType[] { }
  private static detectSslFeatures(vserver: any, bindings: any[]): any { }
  // ... etc
}
```

### Phase 2: Digester Integration

**Update digesters to collect features**:

```typescript
// In src/digLbVserver.ts

import { FeatureDetector } from './featureDetector';

export function digLbVserver(config: any, appName: string): AdcApp {
  // ... existing digestion logic

  // NEW: Feature detection
  const features = FeatureDetector.detectLbVserverFeatures(
    vserver,
    services,
    bindings
  );

  const compatibility = FeatureDetector.assessF5Compatibility(features);
  const complexity = FeatureDetector.calculateComplexity(features);

  return {
    // ... existing app properties
    features,
    f5Compatibility: compatibility,
    complexityScore: complexity
  };
}
```

### Phase 3: Diagnostic Rules

**Add feature compatibility rules to nsDiag.ts**:

```typescript
// In src/nsDiag.ts

/**
 * Feature compatibility diagnostic rules
 */
const featureCompatibilityRules: DiagRule[] = [
  {
    id: 'FC001',
    name: 'WAF Feature Not Supported in NGINX+',
    description: 'NetScaler AppFirewall requires NGINX App Protect',
    match: (app) => app.features?.security.waf &&
                    app.f5Compatibility?.recommended === 'nginx',
    severity: 'warning',
    message: 'WAF features require NGINX App Protect (additional license)',
    recommendation: 'Consider F5 TMOS with ASM module or F5 XC WAF'
  },

  {
    id: 'FC002',
    name: 'GSLB Requires TMOS GTM',
    description: 'GSLB features best supported on TMOS',
    match: (app) => app.protocol === 'DNS' && app.features?.advanced.gslb,
    severity: 'info',
    message: 'GSLB features are best supported on F5 TMOS with GTM module',
    recommendation: 'Recommended platform: TMOS'
  },

  {
    id: 'FC003',
    name: 'Complex Authentication May Need APM',
    description: 'SAML/OAuth authentication patterns',
    match: (app) => app.features?.security.authentication.some(
      t => ['SAML', 'OAUTH'].includes(t)
    ),
    severity: 'info',
    message: 'SAML/OAuth authentication best handled by F5 APM',
    recommendation: 'Consider F5 TMOS with APM module or F5 XC'
  },

  // ... many more rules
];
```

### Phase 4: UI Integration

**Display features in tree view**:

```typescript
// In src/nsCfgViewProvider.ts

// Add icons for platform recommendations
const tmosIcon = this.context.asAbsolutePath('images/f5.png');
const nginxIcon = this.context.asAbsolutePath('images/nginx.png');
const xcIcon = this.context.asAbsolutePath('images/xc.png');

// Update tree item with compatibility icon
const compatIcon = this.getCompatibilityIcon(app.f5Compatibility);
item.iconPath = compatIcon;

// Add tooltip with feature summary
item.tooltip = this.generateFeatureTooltip(app.features, app.f5Compatibility);
```

**Feature summary webview**:

```typescript
// New file: src/featureSummaryView.ts

export class FeatureSummaryViewProvider {
  /**
   * Show feature summary for selected application
   */
  public showFeatureSummary(app: AdcApp): void {
    const panel = vscode.window.createWebviewPanel(
      'featureSummary',
      `Features: ${app.name}`,
      vscode.ViewColumn.Two,
      {}
    );

    panel.webview.html = this.generateHtml(app);
  }

  private generateHtml(app: AdcApp): string {
    // HTML showing:
    // - Feature checklist with icons
    // - Platform compatibility matrix
    // - Complexity score gauge
    // - Recommended platform with reasoning
    // - Missing feature warnings
  }
}
```

---

## Feature Detection Rules

### SSL/TLS Detection

```typescript
private static detectSslFeatures(vserver: any, bindings: any[]): any {
  const sslBindings = bindings.filter(b =>
    b.certKeyName || b.cipherName || b.sslProfile
  );

  return {
    client: vserver.sslProfile || sslBindings.some(b => b.certKeyName),
    server: bindings.some(b => b.sslBridgeBinding),
    sni: bindings.some(b => b.sniCert),
    cipherSuites: [...new Set(bindings.map(b => b.cipherName).filter(Boolean))],
    certificates: [...new Set(bindings.map(b => b.certKeyName).filter(Boolean))]
  };
}
```

### Persistence Detection

```typescript
private static detectPersistence(vserver: any, bindings: any[]): any {
  const persistTypes = new Set<PersistenceType>();

  if (vserver.persistenceType) {
    persistTypes.add(vserver.persistenceType);
  }

  const persistBindings = bindings.filter(b => b.persistenceType);
  persistBindings.forEach(b => persistTypes.add(b.persistenceType));

  return {
    types: Array.from(persistTypes),
    timeout: vserver.timeout,
    backup: vserver.persistenceBackup || vserver.backupPersistenceType
  };
}
```

### Security Feature Detection

```typescript
private static detectSecurityFeatures(vserver: any, bindings: any[]): any {
  const policyBindings = bindings.filter(b =>
    b.policyName || b.appfwPolicy || b.authPolicy
  );

  return {
    waf: policyBindings.some(b => b.appfwPolicy),
    authentication: this.detectAuthTypes(policyBindings),
    authorization: policyBindings.some(b => b.authzPolicy),
    responder: policyBindings.some(b => b.responderPolicy),
    rewrite: policyBindings.some(b => b.rewritePolicy),
    rateLimit: policyBindings.some(b => b.rateLimitIdentifier),
    botManagement: policyBindings.some(b => b.botPolicy),
    ipReputation: policyBindings.some(b => b.ipReputationPolicy)
  };
}
```

---

## Platform Compatibility Assessment

### TMOS Compatibility

```typescript
private static assessTmosCompatibility(features: AppFeatures): any {
  const compatible = true;  // TMOS is most feature-complete
  const missingFeatures: string[] = [];
  const modules: string[] = ['LTM'];  // Always needs LTM

  if (features.security.waf) modules.push('ASM');
  if (features.security.authentication.length > 0) modules.push('APM');
  if (features.protocol === 'DNS') modules.push('GTM');
  if (features.security.rateLimit) modules.push('AFM');

  const score = 100;  // TMOS can handle everything

  return {
    compatible,
    score,
    missingFeatures,
    notes: [`Requires modules: ${modules.join(', ')}`],
    recommendedModules: modules
  };
}
```

### NGINX+ Compatibility

```typescript
private static assessNginxCompatibility(features: AppFeatures): any {
  const missingFeatures: string[] = [];
  let score = 100;

  // Check for unsupported features
  if (features.security.waf) {
    missingFeatures.push('WAF (requires NGINX App Protect)');
    score -= 15;
  }

  if (features.security.authentication.some(t => ['SAML', 'OAUTH'].includes(t))) {
    missingFeatures.push('Advanced authentication (SAML/OAuth)');
    score -= 20;
  }

  if (features.protocol === 'DNS') {
    missingFeatures.push('DNS/GSLB features');
    score -= 30;
  }

  const compatible = score >= 50;

  return {
    compatible,
    score,
    missingFeatures,
    notes: missingFeatures.length > 0
      ? ['Some features require additional NGINX modules or alternatives']
      : ['Fully compatible with NGINX+'],
    requiresNginxPlus: true
  };
}
```

### F5 XC Compatibility

```typescript
private static assessXcCompatibility(features: AppFeatures): any {
  const missingFeatures: string[] = [];
  let score = 100;

  // XC is cloud-native, some legacy features not supported
  if (features.advanced.trafficDomains) {
    missingFeatures.push('Traffic domains (not applicable in XC)');
    score -= 10;
  }

  // XC has strong WAF/security
  if (features.security.waf) {
    score += 5;  // Bonus for security features
  }

  const compatible = score >= 60;

  return {
    compatible,
    score,
    missingFeatures,
    notes: compatible
      ? ['Good fit for modern cloud-native applications']
      : ['Better suited for TMOS or NGINX+']
  };
}
```

---

## Reporting & Visualization

### Feature Matrix Report

```typescript
// src/featureReport.ts

export function generateFeatureMatrix(apps: AdcApp[]): string {
  // Generate markdown table:
  // | App Name | Protocols | SSL | Persistence | LB Method | Platform Rec |
  // |----------|-----------|-----|-------------|-----------|--------------|
  // | app1     | HTTPS     | Yes | SOURCEIP    | RR        | TMOS (100)   |
}
```

### Complexity Heatmap

```typescript
export function generateComplexityReport(apps: AdcApp[]): any {
  return {
    simple: apps.filter(a => a.complexityScore < 30),
    moderate: apps.filter(a => a.complexityScore >= 30 && a.complexityScore < 70),
    complex: apps.filter(a => a.complexityScore >= 70)
  };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/400_featureDetector.unit.tests.ts

describe('FeatureDetector', () => {
  describe('SSL Feature Detection', () => {
    it('should detect client SSL from cert binding', () => {
      const features = FeatureDetector.detectLbVserverFeatures(
        vserver,
        services,
        [{ certKeyName: 'cert1' }]
      );
      expect(features.ssl.client).to.be.true;
    });

    it('should detect server SSL from SSL bridge', () => {
      // Test SSL bridge detection
    });
  });

  describe('Platform Compatibility', () => {
    it('should recommend TMOS for GSLB apps', () => {
      const features = { protocol: 'DNS', ... };
      const compat = FeatureDetector.assessF5Compatibility(features);
      expect(compat.recommended).to.equal('tmos');
    });
  });
});
```

### Integration Tests

```typescript
// Test with real configs
it('should detect all features in starlord.ns.conf', async () => {
  const config = await loadTestConfig('starlord.ns.conf');
  const apps = await parseAndAbstract(config);

  apps.forEach(app => {
    expect(app.features).to.exist;
    expect(app.f5Compatibility).to.exist;
    expect(app.complexityScore).to.be.a('number');
  });
});
```

---

## Future Enhancements

1. **Machine Learning**: Train model on migration outcomes to improve recommendations
2. **Cost Estimation**: Include licensing/module costs in recommendations
3. **Migration Templates**: Auto-generate migration plans based on features
4. **Feature Timeline**: Track feature usage trends across config history
5. **Custom Rules**: Allow users to define custom feature detection rules
6. **Export Formats**: JSON, CSV, PDF reports for stakeholders

---

## Success Metrics

- [ ] Feature detection accuracy > 95%
- [ ] Platform compatibility recommendations validated against 50+ migrations
- [ ] Complexity scores correlate with actual migration effort
- [ ] UI integration with < 100ms overhead per application
- [ ] Diagnostic rules cover 80%+ of common migration issues

---

## Related Documentation

- [PROJECT_ORCID.md](PROJECT_ORCID.md) - Main project planning document
- [src/models.ts](src/models.ts) - TypeScript interfaces
- [src/nsDiag.ts](src/nsDiag.ts) - Diagnostic engine
- [src/digLbVserver.ts](src/digLbVserver.ts) - LB vserver digester
- [F5 Platform Documentation](https://clouddocs.f5.com/) - Feature references

---

**Last Updated**: 2025-10-08
**Author**: Claude + Ted
**Status**: Design Phase
