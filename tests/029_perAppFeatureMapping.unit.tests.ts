/**
 * Unit tests for per-app feature mapping
 * Tests the integration of feature detection with individual apps
 */

import * as assert from 'assert';
import { mapFeaturesToApp, calculateAppComplexity, getAppPlatformRecommendation, DetectedFeature } from '../src/featureDetector';
import { AdcApp, AdcConfObjRx } from '../src/models';

describe('Per-App Feature Mapping Tests', () => {

    describe('mapFeaturesToApp()', () => {

        it('should map SSL features to SSL protocol app', () => {
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

            assert.ok(result.some(f => f.name === 'SSL Offload'), 'Should include SSL Offload feature');
            assert.ok(result.length > 0, 'Should return at least one feature');
        });

        it('should map Content Switching features to CS app', () => {
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

            assert.ok(result.some(f => f.name === 'Content Switching'), 'Should include Content Switching feature');
        });

        it('should map load balancing features to LB app', () => {
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

            assert.ok(result.some(f => f.name === 'Load Balancing Methods'), 'Should include Load Balancing Methods feature');
        });

        it('should map GSLB features to GSLB app', () => {
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

            assert.ok(result.some(f => f.name === 'GSLB'), 'Should include GSLB feature');
        });

        it('should deduplicate features', () => {
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
            assert.strictEqual(sslFeatures.length, 1, 'Should deduplicate features with same name');
        });

        it('should return empty array when no features match', () => {
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

            // TCP app shouldn't match Authentication features
            assert.strictEqual(result.length, 0, 'Should return empty array when no features match');
        });

        it('should map features from app options (persistence)', () => {
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

            assert.ok(result.some(f => f.category === 'Session Management & Persistence'),
                'Should map persistence features from app options');
        });

        it('should map features from app lines (authentication)', () => {
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

            assert.ok(result.some(f => f.category === 'Authentication & Authorization'),
                'Should map authentication features from app lines');
        });

        it('should map HTTP features to HTTP/HTTPS apps', () => {
            const app: AdcApp = {
                name: 'http_vs',
                type: 'lb',
                protocol: 'HTTP'
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Performance Optimization',
                    name: 'Compression',
                    detected: true,
                    complexityWeight: 3,
                    evidence: 'HTTP compression enabled'
                }
            ];

            const result = mapFeaturesToApp(app, globalFeatures, {});

            assert.ok(result.some(f => f.name === 'Compression'), 'Should map HTTP features to HTTP apps');
        });

    });

    describe('calculateAppComplexity()', () => {

        it('should return 1 for empty features', () => {
            const result = calculateAppComplexity([]);
            assert.strictEqual(result, 1, 'Empty features should return complexity of 1');
        });

        it('should calculate complexity for single feature', () => {
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
            assert.ok(result >= 1, 'Complexity should be at least 1');
            assert.ok(result <= 10, 'Complexity should not exceed 10');
        });

        it('should calculate complexity for multiple features', () => {
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
            assert.ok(result > 5, 'High complexity features should result in higher score');
            assert.ok(result <= 10, 'Complexity should not exceed 10');
        });

        it('should apply diversity multiplier', () => {
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
            assert.ok(multiResult >= singleResult,
                'Multi-category features should have equal or higher complexity due to diversity multiplier');
        });

        it('should not exceed 10', () => {
            const features: DetectedFeature[] = [
                { category: 'C1', name: 'F1', detected: true, complexityWeight: 10, evidence: 'Test' },
                { category: 'C2', name: 'F2', detected: true, complexityWeight: 10, evidence: 'Test' },
                { category: 'C3', name: 'F3', detected: true, complexityWeight: 10, evidence: 'Test' }
            ];

            const result = calculateAppComplexity(features);
            assert.ok(result <= 10, 'Complexity should never exceed 10');
        });

        it('should round to 1 decimal place', () => {
            const features: DetectedFeature[] = [
                { category: 'C1', name: 'F1', detected: true, complexityWeight: 3, evidence: 'Test' }
            ];

            const result = calculateAppComplexity(features);
            const decimals = result.toString().split('.')[1]?.length || 0;
            assert.ok(decimals <= 1, 'Should round to at most 1 decimal place');
        });

    });

    describe('getAppPlatformRecommendation()', () => {

        it('should return "Any" for empty features', () => {
            const result = getAppPlatformRecommendation([]);
            assert.strictEqual(result.recommended, 'Any', 'Empty features should recommend Any platform');
            assert.strictEqual(result.confidence, 'Low', 'Empty features should have Low confidence');
        });

        it('should recommend TMOS when TMOS has highest score', () => {
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
            assert.strictEqual(result.recommended, 'TMOS', 'Should recommend TMOS when it has best support');
        });

        it('should recommend NGINX+ when NGINX has highest score', () => {
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
            assert.strictEqual(result.recommended, 'NGINX+', 'Should recommend NGINX+ when it has best support');
        });

        it('should provide High confidence when clear winner', () => {
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
                        xc: 'none'
                    }
                },
                {
                    category: 'Auth',
                    name: 'Auth Feature',
                    detected: true,
                    complexityWeight: 7,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'none',
                        xc: 'none'
                    }
                },
                {
                    category: 'LB',
                    name: 'LB Feature',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test',
                    f5Mapping: {
                        tmos: 'full',
                        nginx: 'none',
                        xc: 'none'
                    }
                }
            ];

            const result = getAppPlatformRecommendation(features);
            // TMOS: 40 points (4 full), NGINX: 0, XC: 0 -> gap of 40 -> High confidence
            assert.strictEqual(result.confidence, 'High', 'Should have High confidence when one platform dominates');
        });

        it('should provide Low confidence when scores are close', () => {
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
            assert.strictEqual(result.confidence, 'Low', 'Should have Low confidence when all platforms are equal');
        });

        it('should handle features without f5Mapping', () => {
            const features: DetectedFeature[] = [
                {
                    category: 'Test',
                    name: 'Test Feature',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test'
                    // No f5Mapping
                }
            ];

            const result = getAppPlatformRecommendation(features);
            assert.ok(result.recommended, 'Should still return a recommendation');
            assert.ok(result.confidence, 'Should still return a confidence level');
        });

    });

    describe('Integration: features array population', () => {

        it('should populate app.features array with feature names', () => {
            const app: AdcApp = {
                name: 'test_app',
                type: 'lb',
                protocol: 'HTTPS',
                ipAddress: '10.1.1.1',
                port: '443',
                bindings: {
                    certs: [{ '-certKeyName': 'cert1' }]
                }
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Security',
                    name: 'SSL Certificates',
                    detected: true,
                    complexityWeight: 3,
                    evidence: 'Test'
                },
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    complexityWeight: 1,
                    evidence: 'Test'
                }
            ];

            const appFeatures = mapFeaturesToApp(app, globalFeatures, {});

            // Simulate what CitrixADC.ts does
            app.features = appFeatures.map(f => f.name);

            assert.ok(Array.isArray(app.features), 'features should be an array');
            assert.ok(app.features.length > 0, 'features array should not be empty');
            assert.ok(app.features.every(f => typeof f === 'string'), 'all features should be strings');
            assert.ok(app.features.includes('SSL Certificates'), 'should include SSL Certificates');
        });

        it('should have features array with same length as featureAnalysis.features', () => {
            const app: AdcApp = {
                name: 'test_app',
                type: 'cs',
                protocol: 'HTTP',
                ipAddress: '10.1.1.1',
                port: '80'
            };

            const globalFeatures: DetectedFeature[] = [
                {
                    category: 'Traffic Management',
                    name: 'Content Switching',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test',
                    objectType: 'cs vserver'
                },
                {
                    category: 'Policy Framework',
                    name: 'Rewrite Policies',
                    detected: true,
                    complexityWeight: 5,
                    evidence: 'Test'
                }
            ];

            const appFeatures = mapFeaturesToApp(app, globalFeatures, {});

            // Simulate what CitrixADC.ts does
            app.features = appFeatures.map(f => f.name);
            app.featureAnalysis = {
                features: appFeatures,
                complexity: calculateAppComplexity(appFeatures),
                recommendedPlatform: 'TMOS',
                confidence: 'High'
            };

            assert.strictEqual(app.features.length, app.featureAnalysis.features.length,
                'features array length should match featureAnalysis.features length');

            // Verify each name matches
            app.features.forEach((name, i) => {
                assert.strictEqual(name, app.featureAnalysis!.features[i].name,
                    'feature names should match at same index');
            });
        });

    });

});
