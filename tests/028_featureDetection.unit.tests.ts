/**
 * Unit Tests: Feature Detection System
 *
 * Tests for FeatureDetector, ComplexityScorer, and CapabilityMapper
 */

import * as assert from 'assert';
import { FeatureDetector } from '../src/featureDetector';
import { ComplexityScorer } from '../src/complexityScorer';
import { CapabilityMapper } from '../src/capabilityMapper';
import { AdcConfObjRx } from '../src/models';

describe('Feature Detection System', () => {

    describe('FeatureDetector', () => {

        it('should detect basic load balancing', () => {
            const config = {
                add: {
                    lb: {
                        vserver: {
                            'vs1': {
                                name: 'vs1',
                                protocol: 'HTTP',
                                ipAddress: '1.2.3.4',
                                port: '80',
                                _line: 'add lb vserver vs1 HTTP 1.2.3.4 80'
                            }
                        }
                    }
                }
            } as any;

            const detector = new FeatureDetector();
            const features = detector.analyze(config);

            const lbFeature = features.find(f => f.name === 'LB Virtual Servers');
            assert.ok(lbFeature, 'LB feature should be detected');
            assert.strictEqual(lbFeature.detected, true);
            assert.strictEqual(lbFeature.count, 1);
            assert.strictEqual(lbFeature.complexityWeight, 1);
        });

        it('should detect content switching', () => {
            const config = {
                add: {
                    cs: {
                        vserver: {
                            'cs1': {
                                name: 'cs1',
                                protocol: 'HTTP'
                            }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);

            const csFeature = features.find(f => f.name === 'Content Switching');
            assert.ok(csFeature, 'CS feature should be detected');
            assert.strictEqual(csFeature.complexityWeight, 5);
            assert.strictEqual(csFeature.category, 'Traffic Management');
        });

        it('should detect SSL certificates', () => {
            const config = {
                add: {
                    ssl: {
                        certKey: {
                            'cert1': {
                                name: 'cert1',
                                '-cert': '/path/to/cert.pem',
                                '-key': '/path/to/key.pem'
                            },
                            'cert2': {
                                name: 'cert2',
                                '-cert': '/path/to/cert2.pem',
                                '-key': '/path/to/key2.pem'
                            }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);

            const sslFeature = features.find(f => f.name === 'SSL Certificates');
            assert.ok(sslFeature, 'SSL feature should be detected');
            assert.strictEqual(sslFeature.count, 2);
            assert.strictEqual(sslFeature.complexityWeight, 2);
        });

        it('should detect session persistence', () => {
            const config = {
                add: {
                    lb: {
                        vserver: {
                            'vs1': {
                                name: 'vs1',
                                protocol: 'HTTP',
                                '-persistenceType': 'COOKIEINSERT'
                            },
                            'vs2': {
                                name: 'vs2',
                                protocol: 'HTTP',
                                '-persistenceType': 'SOURCEIP'
                            }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);

            const persistFeature = features.find(f => f.name === 'Session Persistence');
            assert.ok(persistFeature, 'Persistence feature should be detected');
            assert.strictEqual(persistFeature.count, 2); // Two unique types
            assert.ok(persistFeature.evidence?.includes('COOKIEINSERT'));
            assert.ok(persistFeature.evidence?.includes('SOURCEIP'));
        });

        it('should detect GSLB', () => {
            const config = {
                add: {
                    gslb: {
                        vserver: {
                            'gslb1': {
                                name: 'gslb1',
                                protocol: 'DNS'
                            }
                        },
                        site: {
                            'site1': { name: 'site1' },
                            'site2': { name: 'site2' }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);

            const gslbFeature = features.find(f => f.name === 'GSLB');
            assert.ok(gslbFeature, 'GSLB feature should be detected');
            assert.strictEqual(gslbFeature.complexityWeight, 7);
            assert.ok(gslbFeature.evidence?.includes('2 site(s)'));
        });

        it('should detect application firewall', () => {
            const config = {
                add: {
                    appfw: {
                        policy: {
                            'pol1': { name: 'pol1' },
                            'pol2': { name: 'pol2' }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);

            const appfwFeature = features.find(f => f.name === 'Application Firewall');
            assert.ok(appfwFeature, 'AppFW feature should be detected');
            assert.strictEqual(appfwFeature.count, 2);
            assert.strictEqual(appfwFeature.complexityWeight, 8);
        });

        it('should not detect features from empty config', () => {
            const config = { add: {} };

            const features = new FeatureDetector().analyze(config);

            assert.strictEqual(features.length, 0, 'No features should be detected');
        });

        it('should include F5 mapping information', () => {
            const config = {
                add: {
                    lb: {
                        vserver: {
                            'vs1': { name: 'vs1', protocol: 'HTTP' }
                        }
                    }
                }
            } as any;

            const features = new FeatureDetector().analyze(config);
            const lbFeature = features.find(f => f.name === 'LB Virtual Servers');

            assert.ok(lbFeature?.f5Mapping);
            assert.strictEqual(lbFeature.f5Mapping.tmos, 'full');
            assert.strictEqual(lbFeature.f5Mapping.nginx, 'full');
            assert.strictEqual(lbFeature.f5Mapping.xc, 'full');
        });
    });

    describe('ComplexityScorer', () => {

        it('should score simple config as 1-3', () => {
            const features = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 5,
                    complexityWeight: 1,
                    evidence: '5 LB vServers'
                }
            ];

            const scorer = new ComplexityScorer();
            const result = scorer.calculate(features);

            assert.ok(result.score >= 1 && result.score <= 3, 'Score should be 1-3');
            assert.strictEqual(result.rating, 'Simple');
            assert.strictEqual(result.riskLevel, 'Low');
            assert.ok(result.estimatedEffort.includes('day'));
        });

        it('should score complex config as 8-10', () => {
            const features = [
                {
                    category: 'Application Security',
                    name: 'Application Firewall',
                    detected: true,
                    count: 10,
                    complexityWeight: 8,
                    evidence: '10 AppFW policies'
                },
                {
                    category: 'Authentication',
                    name: 'nFactor Authentication',
                    detected: true,
                    count: 5,
                    complexityWeight: 10,
                    evidence: '5 nFactor chains'
                },
                {
                    category: 'Traffic Management',
                    name: 'Content Switching',
                    detected: true,
                    count: 20,
                    complexityWeight: 5,
                    evidence: '20 CS vServers'
                }
            ];

            const result = new ComplexityScorer().calculate(features);

            assert.ok(result.score >= 8, 'Score should be 8 or higher');
            assert.strictEqual(result.rating, 'Very Complex');
            assert.strictEqual(result.riskLevel, 'High');
            assert.ok(result.estimatedEffort.includes('week'));
        });

        it('should apply interaction multiplier for diverse features', () => {
            const singleCategory = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 10,
                    complexityWeight: 1,
                    evidence: '10 LB vServers'
                }
            ];

            const multiCategory = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 10,
                    complexityWeight: 1,
                    evidence: '10 LB vServers'
                },
                {
                    category: 'Security',
                    name: 'SSL Certificates',
                    detected: true,
                    count: 5,
                    complexityWeight: 2,
                    evidence: '5 certs'
                },
                {
                    category: 'Traffic Management',
                    name: 'Content Switching',
                    detected: true,
                    count: 5,
                    complexityWeight: 5,
                    evidence: '5 CS vServers'
                },
                {
                    category: 'Performance',
                    name: 'Compression',
                    detected: true,
                    count: 1,
                    complexityWeight: 3,
                    evidence: '1 compression policy'
                }
            ];

            const scorer = new ComplexityScorer();
            const singleScore = scorer.calculate(singleCategory);
            const multiScore = scorer.calculate(multiCategory);

            // Multi-category should have higher score due to multiplier
            assert.ok(multiScore.score > singleScore.score,
                'Multi-category config should score higher');
        });

        it('should include justification text', () => {
            const features = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 10,
                    complexityWeight: 1,
                    evidence: '10 LB vServers'
                }
            ];

            const result = new ComplexityScorer().calculate(features);

            assert.ok(result.justification);
            assert.ok(result.justification.includes('Simple'));
            assert.ok(result.justification.includes('feature'));
        });

        it('should list contributing features for complex configs', () => {
            const features = [
                {
                    category: 'Application Security',
                    name: 'Application Firewall',
                    detected: true,
                    count: 1,
                    complexityWeight: 8,
                    evidence: '1 AppFW policy'
                }
            ];

            const result = new ComplexityScorer().calculate(features);

            assert.ok(result.contributingFeatures);
            assert.ok(result.contributingFeatures.length > 0);
            assert.ok(result.contributingFeatures[0].includes('Application Firewall'));
        });
    });

    describe('CapabilityMapper', () => {

        it('should recommend TMOS for VPN Gateway', () => {
            const features = [
                {
                    category: 'Authentication',
                    name: 'VPN Gateway',
                    detected: true,
                    count: 1,
                    complexityWeight: 10,
                    evidence: '1 VPN Gateway',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'none' as const,
                        xc: 'none' as const,
                        requires: ['APM license (TMOS)']
                    }
                }
            ];

            const mapper = new CapabilityMapper();
            const rec = mapper.recommendPlatform(features);

            assert.strictEqual(rec.recommended, 'TMOS');
            assert.strictEqual(rec.confidence, 'High');
            assert.ok(rec.rationale.includes('VPN'));
        });

        it('should recommend TMOS for GSLB', () => {
            const features = [
                {
                    category: 'Global Load Balancing',
                    name: 'GSLB',
                    detected: true,
                    count: 5,
                    complexityWeight: 7,
                    evidence: '5 GSLB vServers',
                    f5Mapping: {
                        tmos: 'full' as const,
                        tmosNotes: 'Maps to GTM',
                        nginx: 'none' as const,
                        xc: 'full' as const,
                        requires: ['GTM module (TMOS)']
                    }
                }
            ];

            const rec = new CapabilityMapper().recommendPlatform(features);

            assert.strictEqual(rec.recommended, 'TMOS');
            assert.ok(rec.requirements.includes('GTM module (TMOS)'));
        });

        it('should provide alternatives', () => {
            const features = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 10,
                    complexityWeight: 1,
                    evidence: '10 LB vServers',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'full' as const,
                        xc: 'full' as const
                    }
                }
            ];

            const rec = new CapabilityMapper().recommendPlatform(features);

            assert.ok(rec.alternatives);
            assert.strictEqual(rec.alternatives.length, 2);
            assert.ok(rec.alternatives[0].score > 0);
        });

        it('should identify conversion gaps', () => {
            const features = [
                {
                    category: 'Network',
                    name: 'VLANs',
                    detected: true,
                    count: 5,
                    complexityWeight: 2,
                    evidence: '5 VLANs',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'none' as const,
                        xc: 'none' as const
                    }
                }
            ];

            const rec = new CapabilityMapper().recommendPlatform(features);

            assert.ok(rec.gaps);
            const vlanGap = rec.gaps.find(g => g.feature === 'VLANs');
            assert.ok(vlanGap, 'Should identify VLAN as partial support gap');
        });

        it('should extract requirements from features', () => {
            const features = [
                {
                    category: 'Application Security',
                    name: 'Application Firewall',
                    detected: true,
                    count: 1,
                    complexityWeight: 8,
                    evidence: '1 AppFW policy',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'partial' as const,
                        xc: 'full' as const,
                        requires: ['ASM/AWAF module (TMOS) or NGINX App Protect']
                    }
                },
                {
                    category: 'Global Load Balancing',
                    name: 'GSLB',
                    detected: true,
                    count: 1,
                    complexityWeight: 7,
                    evidence: '1 GSLB vServer',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'none' as const,
                        xc: 'full' as const,
                        requires: ['GTM module (TMOS)']
                    }
                }
            ];

            const rec = new CapabilityMapper().recommendPlatform(features);

            assert.ok(rec.requirements.length >= 2);
            assert.ok(rec.requirements.some(r => r.includes('GTM')));
        });

        it('should provide rationale for recommendation', () => {
            const features = [
                {
                    category: 'Load Balancing',
                    name: 'LB Virtual Servers',
                    detected: true,
                    count: 10,
                    complexityWeight: 1,
                    evidence: '10 LB vServers',
                    f5Mapping: {
                        tmos: 'full' as const,
                        nginx: 'full' as const,
                        xc: 'full' as const
                    }
                }
            ];

            const rec = new CapabilityMapper().recommendPlatform(features);

            assert.ok(rec.rationale);
            assert.ok(rec.rationale.length > 0);
            assert.ok(rec.rationale.includes('score'));
        });
    });

    describe('Integration Tests', () => {

        it('should handle complete feature detection flow', () => {
            const config = {
                add: {
                    lb: {
                        vserver: {
                            'vs1': { name: 'vs1', protocol: 'HTTP' },
                            'vs2': { name: 'vs2', protocol: 'HTTPS', '-persistenceType': 'COOKIEINSERT' }
                        },
                        monitor: {
                            'mon1': { name: 'mon1', protocol: 'HTTP' }
                        }
                    },
                    ssl: {
                        certKey: {
                            'cert1': { name: 'cert1' }
                        }
                    },
                    cs: {
                        vserver: {
                            'cs1': { name: 'cs1', protocol: 'HTTP' }
                        }
                    }
                }
            } as any;

            // Step 1: Detect features
            const detector = new FeatureDetector();
            const features = detector.analyze(config);
            assert.ok(features.length > 0, 'Should detect features');

            // Step 2: Calculate complexity
            const scorer = new ComplexityScorer();
            const complexity = scorer.calculate(features);
            assert.ok(complexity.score >= 1 && complexity.score <= 10);
            assert.ok(complexity.rating);
            assert.ok(complexity.justification);

            // Step 3: Get platform recommendation
            const mapper = new CapabilityMapper();
            const recommendation = mapper.recommendPlatform(features);
            assert.ok(recommendation.recommended);
            assert.ok(recommendation.confidence);
            assert.ok(recommendation.rationale);
        });
    });

    describe('Phase 2 Enhanced Detection', () => {

        describe('Enhanced SSL Detection', () => {
            it('should detect certificate chains', () => {
                const config = {
                    add: {
                        ssl: {
                            certKey: {
                                'root': {
                                    name: 'root',
                                    '-cert': '/path/to/root.pem',
                                    '-key': '/path/to/root.key'
                                },
                                'intermediate': {
                                    name: 'intermediate',
                                    '-cert': '/path/to/int.pem',
                                    '-key': '/path/to/int.key',
                                    '-linkcertKeyName': 'root'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const sslFeature = features.find(f => f.name === 'SSL Certificates');
                assert.ok(sslFeature);
                assert.strictEqual(sslFeature.complexityWeight, 3, 'Should have weight 3 for cert chains');
                assert.ok(sslFeature.evidence.includes('chains'));
            });

            it('should detect custom cipher configurations', () => {
                const config = {
                    add: {
                        ssl: {
                            profile: {
                                'custom': {
                                    name: 'custom',
                                    '-cipherName': 'CUSTOM_CIPHER_GROUP'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const profileFeature = features.find(f => f.name === 'SSL Profiles');
                assert.ok(profileFeature);
                assert.strictEqual(profileFeature.complexityWeight, 4, 'Custom ciphers increase complexity');
            });

            it('should detect client authentication (mTLS)', () => {
                const config = {
                    add: {
                        ssl: {
                            profile: {
                                'mtls': {
                                    name: 'mtls',
                                    '-clientAuth': 'ENABLED'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const mtlsFeature = features.find(f => f.name === 'Client Certificate Authentication');
                assert.ok(mtlsFeature, 'Should detect mTLS');
                assert.strictEqual(mtlsFeature.complexityWeight, 6);
            });
        });

        describe('Enhanced Security Detection', () => {
            it('should detect AppFW with SQL injection protection', () => {
                const config = {
                    add: {
                        appfw: {
                            policy: {
                                'pol1': { name: 'pol1' }
                            },
                            profile: {
                                'prof1': {
                                    name: 'prof1',
                                    '-sqlInjectionAction': 'block'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const appfwFeature = features.find(f => f.name === 'Application Firewall');
                assert.ok(appfwFeature);
                assert.ok(appfwFeature.evidence.includes('SQL Injection'));
            });

            it('should detect rate limiting policies', () => {
                const config = {
                    add: {
                        responder: {
                            policy: {
                                'ratelimit': {
                                    name: 'ratelimit',
                                    _line: 'add responder policy ratelimit "CLIENT.VSERVER.LIMIT_RATE > 100"'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const rateLimitFeature = features.find(f => f.name === 'Rate Limiting');
                assert.ok(rateLimitFeature, 'Should detect rate limiting');
                assert.strictEqual(rateLimitFeature.complexityWeight, 6);
            });

            it('should detect GeoIP blocking', () => {
                const config = {
                    add: {
                        responder: {
                            policy: {
                                'geoblock': {
                                    name: 'geoblock',
                                    _line: 'add responder policy geoblock "CLIENT.IP.SRC.COUNTRY == CN"'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const geoFeature = features.find(f => f.name === 'GeoIP/IP Reputation');
                assert.ok(geoFeature, 'Should detect GeoIP');
                assert.strictEqual(geoFeature.complexityWeight, 5);
            });
        });

        describe('Enhanced Authentication Detection', () => {
            it('should detect nFactor authentication', () => {
                const config = {
                    add: {
                        authentication: {
                            vserver: {
                                'auth1': { name: 'auth1' }
                            },
                            loginSchema: {
                                'schema1': { name: 'schema1' },
                                'schema2': { name: 'schema2' },
                                'schema3': { name: 'schema3' }
                            },
                            policy: {
                                'pol1': { name: 'pol1' },
                                'pol2': { name: 'pol2' },
                                'pol3': { name: 'pol3' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const nFactorFeature = features.find(f => f.name === 'nFactor Authentication');
                assert.ok(nFactorFeature, 'Should detect nFactor');
                assert.strictEqual(nFactorFeature.complexityWeight, 10, 'nFactor is most complex');
                assert.ok(nFactorFeature.evidence.includes('nFactor'));
            });

            it('should detect VPN Gateway', () => {
                const config = {
                    add: {
                        aaa: {
                            vserver: {
                                'vpn1': {
                                    name: 'vpn1',
                                    _line: 'add aaa vserver vpn1 SSL VPN 1.2.3.4 443'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const vpnFeature = features.find(f => f.name === 'VPN Gateway');
                assert.ok(vpnFeature, 'Should detect VPN');
                assert.strictEqual(vpnFeature.complexityWeight, 10);
            });

            it('should detect LDAP authentication', () => {
                const config = {
                    add: {
                        authentication: {
                            ldapAction: {
                                'ldap1': { name: 'ldap1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const ldapFeature = features.find(f => f.name === 'LDAP Authentication');
                assert.ok(ldapFeature);
                assert.strictEqual(ldapFeature.complexityWeight, 5);
            });

            it('should detect SAML SSO', () => {
                const config = {
                    add: {
                        authentication: {
                            samlAction: {
                                'saml1': { name: 'saml1' },
                                'saml2': { name: 'saml2' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const samlFeature = features.find(f => f.name === 'SAML SSO');
                assert.ok(samlFeature);
                assert.strictEqual(samlFeature.count, 2);
                assert.strictEqual(samlFeature.complexityWeight, 7);
            });
        });

        describe('Enhanced Monitoring Detection', () => {
            it('should detect script-based monitors', () => {
                const config = {
                    add: {
                        lb: {
                            monitor: {
                                'custom': {
                                    name: 'custom',
                                    protocol: 'USER',
                                    '-scriptName': '/path/to/script.pl'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const monitorFeature = features.find(f => f.name === 'Custom Script Monitors');
                assert.ok(monitorFeature, 'Should detect script-based monitors');
                assert.strictEqual(monitorFeature.complexityWeight, 5);
            });

            it('should detect custom send/receive monitors', () => {
                const config = {
                    add: {
                        lb: {
                            monitor: {
                                'http1': {
                                    name: 'http1',
                                    protocol: 'HTTP',
                                    '-send': 'GET /health HTTP/1.1',
                                    '-recv': '200 OK'
                                }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const monitorFeature = features.find(f => f.name === 'Health Monitors');
                assert.ok(monitorFeature);
                assert.strictEqual(monitorFeature.complexityWeight, 3, 'Custom send/receive adds complexity');
            });

            it('should detect SNMP monitoring', () => {
                const config = {
                    add: {
                        snmp: {
                            alarm: {
                                'alarm1': { name: 'alarm1' }
                            },
                            trap: {
                                'trap1': { name: 'trap1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const snmpFeature = features.find(f => f.name === 'SNMP Monitoring');
                assert.ok(snmpFeature);
                assert.strictEqual(snmpFeature.count, 2);
            });
        });

        describe('High Availability Detection', () => {
            it('should detect HA pair configuration', () => {
                const config = {
                    add: {
                        ha: {
                            node: {
                                'node1': { name: 'node1', id: '0' },
                                'node2': { name: 'node2', id: '1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const haFeature = features.find(f => f.name === 'HA Pair Configuration');
                assert.ok(haFeature, 'Should detect HA');
                assert.strictEqual(haFeature.complexityWeight, 4);
            });

            it('should detect cluster configuration', () => {
                const config = {
                    add: {
                        cluster: {
                            node: {
                                'node1': { name: 'node1' },
                                'node2': { name: 'node2' },
                                'node3': { name: 'node3' }
                            },
                            instance: {
                                'cluster1': { name: 'cluster1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const clusterFeature = features.find(f => f.name === 'Cluster Configuration');
                assert.ok(clusterFeature, 'Should detect cluster');
                assert.strictEqual(clusterFeature.complexityWeight, 7);
            });
        });

        describe('Network Features Detection', () => {
            it('should detect custom TCP/HTTP profiles', () => {
                const config = {
                    add: {
                        ns: {
                            tcpProfile: {
                                'tcp1': { name: 'tcp1' }
                            },
                            httpProfile: {
                                'http1': { name: 'http1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const profileFeature = features.find(f => f.name === 'Custom Network Profiles');
                assert.ok(profileFeature);
                assert.strictEqual(profileFeature.count, 2);
                assert.strictEqual(profileFeature.complexityWeight, 5);
            });

            it('should detect link load balancing', () => {
                const config = {
                    add: {
                        ll: {
                            vserver: {
                                'll1': { name: 'll1' }
                            }
                        }
                    }
                } as any;

                const features = new FeatureDetector().analyze(config);
                const llFeature = features.find(f => f.name === 'Link Load Balancing');
                assert.ok(llFeature);
                assert.strictEqual(llFeature.complexityWeight, 6);
            });
        });
    });
});
