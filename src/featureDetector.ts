/**
 * Feature Detection System
 *
 * Analyzes NetScaler configurations to identify features, calculate complexity,
 * and provide platform recommendations.
 *
 * @see FEATURE_DETECTION_DESIGN.md
 */

import { AdcConfObjRx, AdcApp } from './models';

/**
 * Detected NetScaler feature
 */
export interface DetectedFeature {
    /** Feature category (e.g., "Load Balancing", "Security") */
    category: string;

    /** Feature name (e.g., "Content Switching", "SSL Offload") */
    name: string;

    /** Whether feature is detected in config */
    detected: boolean;

    /** Number of instances of this feature */
    count?: number;

    /** Related object type from parsed config */
    objectType?: string;

    /** Complexity weight (1-10) */
    complexityWeight: number;

    /** Evidence string (what was found) */
    evidence: string;

    /** Optional: F5 mapping info */
    f5Mapping?: FeatureMapping;
}

/**
 * F5 platform feature mapping
 */
export interface FeatureMapping {
    /** TMOS support level */
    tmos: 'full' | 'partial' | 'none';

    /** TMOS implementation notes */
    tmosNotes?: string;

    /** NGINX+ support level */
    nginx: 'full' | 'partial' | 'none';

    /** NGINX+ implementation notes */
    nginxNotes?: string;

    /** XC support level */
    xc: 'full' | 'partial' | 'none';

    /** XC implementation notes */
    xcNotes?: string;

    /** Special requirements (e.g., "APM license", "GTM module") */
    requires?: string[];
}

/**
 * Feature detector - identifies NetScaler features from parsed config
 */
export class FeatureDetector {

    /**
     * Analyze parsed NetScaler config and detect features
     */
    public analyze(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // Category 1: Load Balancing & Traffic Management
        features.push(...this.detectLoadBalancing(config));

        // Category 2: Security & SSL
        features.push(...this.detectSecurity(config));

        // Category 3: Application Firewall & Protection
        features.push(...this.detectApplicationFirewall(config));

        // Category 4: Session Management & Persistence
        features.push(...this.detectSessionManagement(config));

        // Category 5: Policy Framework
        features.push(...this.detectPolicies(config));

        // Category 6: Performance Optimization
        features.push(...this.detectPerformanceOptimization(config));

        // Category 7: Global Server Load Balancing
        features.push(...this.detectGSLB(config));

        // Category 8: Authentication & Authorization
        features.push(...this.detectAuthentication(config));

        // Category 9: Monitoring & Health Checks
        features.push(...this.detectMonitoring(config));

        // Category 10: Network Configuration
        features.push(...this.detectNetworking(config));

        return this.deduplicateAndSort(features);
    }

    /**
     * Category 1: Load Balancing & Traffic Management
     */
    private detectLoadBalancing(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // LB vServers
        const lbCount = Object.keys(config.add?.lb?.vserver || {}).length;
        if (lbCount > 0) {
            const methods = this.getLBMethods(config);
            features.push({
                category: 'Load Balancing',
                name: 'LB Virtual Servers',
                detected: true,
                count: lbCount,
                objectType: 'lb.vserver',
                complexityWeight: 1,
                evidence: `${lbCount} LB vServer(s), Methods: ${methods.join(', ') || 'default'}`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to LTM Virtual Servers',
                    nginx: 'full',
                    nginxNotes: 'Maps to upstream + server blocks',
                    xc: 'full',
                    xcNotes: 'Maps to Origin Pools + Load Balancers'
                }
            });
        }

        // Content Switching
        const csCount = Object.keys(config.add?.cs?.vserver || {}).length;
        if (csCount > 0) {
            features.push({
                category: 'Traffic Management',
                name: 'Content Switching',
                detected: true,
                count: csCount,
                objectType: 'cs.vserver',
                complexityWeight: 5,
                evidence: `${csCount} CS vServer(s) with policy-based routing`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to iRules or LTM Policies',
                    nginx: 'full',
                    nginxNotes: 'Maps to location blocks with routing logic',
                    xc: 'full',
                    xcNotes: 'Maps to Routes with conditions'
                }
            });
        }

        // Service Groups
        const sgCount = Object.keys(config.add?.serviceGroup || {}).length;
        if (sgCount > 0) {
            features.push({
                category: 'Load Balancing',
                name: 'Service Groups',
                detected: true,
                count: sgCount,
                objectType: 'serviceGroup',
                complexityWeight: 1,
                evidence: `${sgCount} Service Group(s)`,
                f5Mapping: {
                    tmos: 'full',
                    nginx: 'full',
                    xc: 'full'
                }
            });
        }

        // Traffic Domains
        const tdCount = Object.keys(config.add?.ns?.trafficDomain || {}).length;
        if (tdCount > 0) {
            features.push({
                category: 'Traffic Management',
                name: 'Traffic Domains',
                detected: true,
                count: tdCount,
                objectType: 'ns.trafficDomain',
                complexityWeight: 4,
                evidence: `${tdCount} Traffic Domain(s) (multi-tenancy)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to Route Domains',
                    nginx: 'none',
                    nginxNotes: 'Not supported - requires separate instances',
                    xc: 'partial',
                    xcNotes: 'Maps to Namespaces or Virtual Sites'
                }
            });
        }

        return features;
    }

    /**
     * Category 2: Security & SSL (Enhanced Phase 2)
     */
    private detectSecurity(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // SSL Certificates
        const certKeys = config.add?.ssl?.certKey || {};
        const certCount = Object.keys(certKeys).length;
        if (certCount > 0) {
            // Detect certificate chains (intermediate CAs)
            let chainCount = 0;
            for (const cert of Object.values(certKeys)) {
                if (cert['-linkcertKeyName']) {
                    chainCount++;
                }
            }

            features.push({
                category: 'Security',
                name: 'SSL Certificates',
                detected: true,
                count: certCount,
                objectType: 'ssl.certKey',
                complexityWeight: chainCount > 0 ? 3 : 2,
                evidence: chainCount > 0
                    ? `${certCount} SSL certificate(s) including ${chainCount} with chains`
                    : `${certCount} SSL certificate(s) (import required)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Import certificates and chains, bind to SSL profiles',
                    nginx: 'full',
                    nginxNotes: 'Place certificate files, configure ssl_certificate directive',
                    xc: 'full',
                    xcNotes: 'Upload certificates via UI or API'
                }
            });
        }

        // SSL Profiles with detailed cipher/protocol analysis
        const sslProfiles = config.add?.ssl?.profile || {};
        const profileCount = Object.keys(sslProfiles).length;
        if (profileCount > 0) {
            // Analyze cipher suites and protocols
            let customCiphers = 0;
            let legacyProtocols = 0;
            for (const profile of Object.values(sslProfiles)) {
                if (profile['-cipherName']) customCiphers++;
                // Check for SSLv3, TLS1.0, TLS1.1 (legacy)
                const protocols = profile['-sslProfile'] as string || '';
                if (protocols.match(/SSLv3|TLS1\.0|TLS1\.1/i)) legacyProtocols++;
            }

            const weight = customCiphers > 0 ? 4 : 3;
            const legacyWarning = legacyProtocols > 0 ? ` (${legacyProtocols} use legacy protocols)` : '';

            features.push({
                category: 'Security',
                name: 'SSL Profiles',
                detected: true,
                count: profileCount,
                objectType: 'ssl.profile',
                complexityWeight: weight,
                evidence: `${profileCount} custom SSL profile(s), ${customCiphers} with custom ciphers${legacyWarning}`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to Client SSL and Server SSL profiles',
                    nginx: 'full',
                    nginxNotes: 'Configure ssl_protocols and ssl_ciphers directives',
                    xc: 'partial',
                    xcNotes: 'Limited cipher customization'
                }
            });
        }

        // SSL Policies (for SNI, cipher selection, etc.)
        const sslPolicies = Object.keys((config.add?.ssl as any)?.policy || {}).length;
        if (sslPolicies > 0) {
            features.push({
                category: 'Security',
                name: 'SSL Policies',
                detected: true,
                count: sslPolicies,
                objectType: 'ssl.policy',
                complexityWeight: 5,
                evidence: `${sslPolicies} SSL policy/policies (SNI/cipher routing)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to SSL Orchestrator or iRules',
                    nginx: 'partial',
                    nginxNotes: 'Limited SNI support via server blocks',
                    xc: 'partial',
                    xcNotes: 'Basic SNI supported'
                }
            });
        }

        // Client Authentication (mutual TLS)
        const clientAuthCount = Object.values(sslProfiles).filter(
            p => p['-clientAuth'] === 'ENABLED'
        ).length;
        if (clientAuthCount > 0) {
            features.push({
                category: 'Security',
                name: 'Client Certificate Authentication',
                detected: true,
                count: clientAuthCount,
                objectType: 'ssl.profile',
                complexityWeight: 6,
                evidence: `${clientAuthCount} profile(s) with mutual TLS`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Client SSL profile with certificate validation',
                    nginx: 'full',
                    nginxNotes: 'ssl_verify_client directive',
                    xc: 'full',
                    xcNotes: 'mTLS supported'
                }
            });
        }

        return features;
    }

    /**
     * Category 3: Application Firewall & Protection (Enhanced Phase 2)
     */
    private detectApplicationFirewall(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // AppFW Policies with profile analysis
        const appfwPolicies = config.add?.appfw?.policy || {};
        const policyCount = Object.keys(appfwPolicies).length;
        if (policyCount > 0) {
            // Check for advanced AppFW features in profiles
            const profiles = config.add?.appfw?.profile || {};
            let sqlInjection = 0;
            let xss = 0;
            let csrfProtection = 0;

            for (const profile of Object.values(profiles)) {
                if (profile['-sqlInjectionAction']) sqlInjection++;
                if (profile['-crossSiteScriptingAction']) xss++;
                if (profile['-CSRFTagAction']) csrfProtection++;
            }

            const advancedFeatures = [
                sqlInjection > 0 && `SQL Injection (${sqlInjection})`,
                xss > 0 && `XSS (${xss})`,
                csrfProtection > 0 && `CSRF (${csrfProtection})`
            ].filter(Boolean).join(', ') || 'basic protections';

            features.push({
                category: 'Application Security',
                name: 'Application Firewall',
                detected: true,
                count: policyCount,
                objectType: 'appfw.policy',
                complexityWeight: 8,
                evidence: `${policyCount} AppFW policy/policies with ${advancedFeatures}`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Requires ASM or AWAF module, policy recreation needed',
                    nginx: 'partial',
                    nginxNotes: 'Requires NGINX App Protect (additional license)',
                    xc: 'full',
                    xcNotes: 'Built-in WAF, policy migration required',
                    requires: ['ASM/AWAF license (TMOS)', 'NGINX App Protect (NGINX)']
                }
            });
        }

        // Bot Protection
        const botPolicies = Object.keys((config.add as any)?.bot?.policy || {}).length;
        if (botPolicies > 0) {
            features.push({
                category: 'Application Security',
                name: 'Bot Protection',
                detected: true,
                count: botPolicies,
                objectType: 'bot.policy',
                complexityWeight: 7,
                evidence: `${botPolicies} bot protection policy/policies`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'ASM/AWAF Bot Defense',
                    nginx: 'partial',
                    nginxNotes: 'App Protect with Bot Defense signature package',
                    xc: 'full',
                    xcNotes: 'Built-in Bot Defense'
                }
            });
        }

        // Rate Limiting (via responder/filter policies or stream identifiers)
        const rateLimitPolicies = Object.values(config.add?.responder?.policy || {}).filter(
            p => {
                const line = p._line as string || '';
                return line.match(/LIMIT|RATE|THROTTLE/i);
            }
        ).length;

        if (rateLimitPolicies > 0) {
            features.push({
                category: 'Application Security',
                name: 'Rate Limiting',
                detected: true,
                count: rateLimitPolicies,
                objectType: 'responder.policy',
                complexityWeight: 6,
                evidence: `${rateLimitPolicies} rate limiting policy/policies`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'iRules with rate class or APM session rate limiting',
                    nginx: 'full',
                    nginxNotes: 'limit_req_zone and limit_req directives',
                    xc: 'full',
                    xcNotes: 'Rate limiting via Service Policies'
                }
            });
        }

        // IP Reputation / GeoIP blocking
        const locationPolicies = Object.values(config.add?.responder?.policy || {}).filter(
            p => {
                const line = p._line as string || '';
                return line.match(/CLIENT\.IP\.(SRC|DST)\.(COUNTRY|CONTINENT|REGION)/i);
            }
        ).length;

        if (locationPolicies > 0) {
            features.push({
                category: 'Application Security',
                name: 'GeoIP/IP Reputation',
                detected: true,
                count: locationPolicies,
                objectType: 'responder.policy',
                complexityWeight: 5,
                evidence: `${locationPolicies} policy/policies with geo-location rules`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Geolocation DB + iRules',
                    nginx: 'full',
                    nginxNotes: 'GeoIP2 module',
                    xc: 'full',
                    xcNotes: 'Built-in IP reputation and geo-blocking'
                }
            });
        }

        return features;
    }

    /**
     * Category 4: Session Management & Persistence
     */
    private detectSessionManagement(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // Collect persistence types from LB vServers
        const persistenceTypes = new Set<string>();
        for (const vs of Object.values(config.add?.lb?.vserver || {})) {
            if (vs['-persistenceType']) {
                persistenceTypes.add(vs['-persistenceType'] as string);
            }
        }

        if (persistenceTypes.size > 0) {
            const weight = this.getPersistenceComplexity(Array.from(persistenceTypes));
            features.push({
                category: 'Session Management',
                name: 'Session Persistence',
                detected: true,
                count: persistenceTypes.size,
                complexityWeight: weight,
                evidence: `Persistence types: ${Array.from(persistenceTypes).join(', ')}`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to Persistence Profiles',
                    nginx: 'partial',
                    nginxNotes: 'Cookie and IP hash supported, limited other types',
                    xc: 'partial',
                    xcNotes: 'Cookie and Source IP supported'
                }
            });
        }

        return features;
    }

    /**
     * Category 5: Policy Framework
     */
    private detectPolicies(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // Rewrite Policies
        const rewriteCount = Object.keys(config.add?.rewrite?.policy || {}).length;
        if (rewriteCount > 0) {
            features.push({
                category: 'Policy Framework',
                name: 'Rewrite Policies',
                detected: true,
                count: rewriteCount,
                objectType: 'rewrite.policy',
                complexityWeight: 5,
                evidence: `${rewriteCount} rewrite policy/policies (translate to iRules/NGINX rewrite)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Translate to iRules or LTM Policies',
                    nginx: 'full',
                    nginxNotes: 'Use rewrite or sub_filter directives',
                    xc: 'partial',
                    xcNotes: 'Limited rewrite capabilities'
                }
            });
        }

        // Responder Policies
        const responderCount = Object.keys(config.add?.responder?.policy || {}).length;
        if (responderCount > 0) {
            features.push({
                category: 'Policy Framework',
                name: 'Responder Policies',
                detected: true,
                count: responderCount,
                objectType: 'responder.policy',
                complexityWeight: 4,
                evidence: `${responderCount} responder policy/policies (translate to iRules)`,
                f5Mapping: {
                    tmos: 'full',
                    nginx: 'partial',
                    xc: 'partial'
                }
            });
        }

        return features;
    }

    /**
     * Category 6: Performance Optimization
     */
    private detectPerformanceOptimization(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // Compression
        const cmpPolicies = Object.keys(config.add?.cmp?.policy || {}).length;
        if (cmpPolicies > 0) {
            features.push({
                category: 'Performance',
                name: 'Compression',
                detected: true,
                count: cmpPolicies,
                objectType: 'cmp.policy',
                complexityWeight: 3,
                evidence: `${cmpPolicies} compression policy/policies`,
                f5Mapping: {
                    tmos: 'full',
                    nginx: 'full',
                    xc: 'full'
                }
            });
        }

        // Caching
        const cacheGroups = Object.keys(config.add?.cache?.contentGroup || {}).length;
        if (cacheGroups > 0) {
            features.push({
                category: 'Performance',
                name: 'Content Caching',
                detected: true,
                count: cacheGroups,
                objectType: 'cache.contentGroup',
                complexityWeight: 4,
                evidence: `${cacheGroups} cache content group(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'RAM Cache profile',
                    nginx: 'full',
                    nginxNotes: 'proxy_cache directive',
                    xc: 'full'
                }
            });
        }

        return features;
    }

    /**
     * Category 7: Global Server Load Balancing (GSLB)
     */
    private detectGSLB(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        const gslbCount = Object.keys(config.add?.gslb?.vserver || {}).length;
        if (gslbCount > 0) {
            const siteCount = Object.keys(config.add?.gslb?.site || {}).length;

            features.push({
                category: 'Global Load Balancing',
                name: 'GSLB',
                detected: true,
                count: gslbCount,
                objectType: 'gslb.vserver',
                complexityWeight: 7,
                evidence: `${gslbCount} GSLB vServer(s) across ${siteCount} site(s) (maps to GTM)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Maps to GTM (Global Traffic Manager)',
                    nginx: 'none',
                    nginxNotes: 'DNS module only provides basic DNS, no GSLB',
                    xc: 'full',
                    xcNotes: 'Global Load Balancer with multi-region support',
                    requires: ['GTM module (TMOS)']
                }
            });
        }

        return features;
    }

    /**
     * Category 8: Authentication & Authorization (Enhanced Phase 2)
     */
    private detectAuthentication(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // Authentication vServers with nFactor detection
        const authVS = (config.add as any)?.authentication?.vserver || {};
        const authVSCount = Object.keys(authVS).length;
        if (authVSCount > 0) {
            // Detect nFactor policies (multi-stage authentication)
            const loginSchemas = Object.keys((config.add as any)?.authentication?.loginSchema || {}).length;
            const authPolicies = Object.keys((config.add as any)?.authentication?.policy || {}).length;

            // Estimate nFactor complexity (multiple login schemas = complex flow)
            const isNFactor = loginSchemas > 1 || authPolicies > 2;
            const weight = isNFactor ? 10 : 6;
            const nFactorNote = isNFactor ? ` with nFactor (${loginSchemas} schemas, ${authPolicies} policies)` : '';

            features.push({
                category: 'Authentication',
                name: isNFactor ? 'nFactor Authentication' : 'Authentication vServers',
                detected: true,
                count: authVSCount,
                objectType: 'authentication.vserver',
                complexityWeight: weight,
                evidence: `${authVSCount} authentication vServer(s)${nFactorNote} (APM required)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: isNFactor ? 'Complex APM flow recreation required' : 'APM module required',
                    nginx: 'none',
                    nginxNotes: 'Use 3rd party authentication services',
                    xc: 'partial',
                    xcNotes: 'Basic authentication supported, nFactor not available',
                    requires: ['APM license (TMOS)']
                }
            });
        }

        // AAA vServers (legacy) with VPN detection
        const aaaVS = config.add?.aaa?.vserver || {};
        const aaaVSCount = Object.keys(aaaVS).length;
        if (aaaVSCount > 0) {
            // Check if VPN Gateway is enabled
            let vpnCount = 0;
            for (const vs of Object.values(aaaVS)) {
                // VPN is indicated by ICA/VPN service type or specific bindings
                const line = vs._line as string || '';
                if (line.match(/ICA|VPN|GATEWAY/i)) {
                    vpnCount++;
                }
            }

            const isVPN = vpnCount > 0;
            const weight = isVPN ? 10 : 6;
            const vpnNote = isVPN ? ` (${vpnCount} with VPN Gateway)` : '';

            features.push({
                category: 'Authentication',
                name: isVPN ? 'VPN Gateway' : 'AAA vServers (Legacy)',
                detected: true,
                count: aaaVSCount,
                objectType: 'aaa.vserver',
                complexityWeight: weight,
                evidence: `${aaaVSCount} AAA vServer(s)${vpnNote} (legacy auth, APM required)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: isVPN ? 'Full APM VPN configuration required' : 'APM module required',
                    nginx: 'none',
                    nginxNotes: 'Not supported - use F5 APM',
                    xc: 'none',
                    xcNotes: 'VPN not supported',
                    requires: ['APM license (TMOS)']
                }
            });
        }

        // LDAP Authentication
        const ldapActions = Object.keys((config.add as any)?.authentication?.ldapAction || {}).length;
        if (ldapActions > 0) {
            features.push({
                category: 'Authentication',
                name: 'LDAP Authentication',
                detected: true,
                count: ldapActions,
                objectType: 'authentication.ldapAction',
                complexityWeight: 5,
                evidence: `${ldapActions} LDAP authentication action(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'APM LDAP authentication server',
                    nginx: 'partial',
                    nginxNotes: 'auth_ldap module (3rd party)',
                    xc: 'partial',
                    xcNotes: 'OIDC/SAML integration recommended'
                }
            });
        }

        // RADIUS Authentication
        const radiusActions = Object.keys((config.add as any)?.authentication?.radiusAction || {}).length;
        if (radiusActions > 0) {
            features.push({
                category: 'Authentication',
                name: 'RADIUS Authentication',
                detected: true,
                count: radiusActions,
                objectType: 'authentication.radiusAction',
                complexityWeight: 5,
                evidence: `${radiusActions} RADIUS authentication action(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'APM RADIUS authentication server',
                    nginx: 'none',
                    nginxNotes: 'Not natively supported',
                    xc: 'none',
                    xcNotes: 'OIDC/SAML integration recommended'
                }
            });
        }

        // SAML IdP/SP
        const samlActions = Object.keys((config.add as any)?.authentication?.samlAction || {}).length;
        if (samlActions > 0) {
            features.push({
                category: 'Authentication',
                name: 'SAML SSO',
                detected: true,
                count: samlActions,
                objectType: 'authentication.samlAction',
                complexityWeight: 7,
                evidence: `${samlActions} SAML action(s) (IdP/SP configuration)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'APM SAML SP or IdP configuration',
                    nginx: 'none',
                    nginxNotes: 'Use external SAML proxy',
                    xc: 'full',
                    xcNotes: 'SAML authentication supported'
                }
            });
        }

        // OAuth/OIDC
        const oauthActions = Object.keys((config.add as any)?.authentication?.oAuthAction || {}).length;
        if (oauthActions > 0) {
            features.push({
                category: 'Authentication',
                name: 'OAuth/OIDC',
                detected: true,
                count: oauthActions,
                objectType: 'authentication.oAuthAction',
                complexityWeight: 6,
                evidence: `${oauthActions} OAuth/OIDC action(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'APM OAuth/OIDC client configuration',
                    nginx: 'partial',
                    nginxNotes: 'OIDC module available (OpenID Connect)',
                    xc: 'full',
                    xcNotes: 'OIDC authentication supported'
                }
            });
        }

        return features;
    }

    /**
     * Category 9: Monitoring & Health Checks (Enhanced Phase 2)
     */
    private detectMonitoring(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        const monitors = config.add?.lb?.monitor || {};
        const monitorCount = Object.keys(monitors).length;
        if (monitorCount > 0) {
            const monitorTypes = new Set<string>();
            let scriptBased = 0;
            let customSend = 0;
            let customReceive = 0;

            for (const mon of Object.values(monitors)) {
                if (mon.protocol) {
                    monitorTypes.add(mon.protocol as string);
                }
                // USER monitor = script-based (most complex)
                if (mon.protocol === 'USER') {
                    scriptBased++;
                }
                // Custom send/receive strings (moderate complexity)
                if (mon['-send'] || mon['-customHeaders']) {
                    customSend++;
                }
                if (mon['-recv'] || mon['-respCode']) {
                    customReceive++;
                }
            }

            // Determine complexity based on monitor sophistication
            const weight = scriptBased > 0 ? 5 : (customSend > 0 || customReceive > 0 ? 3 : 2);

            const details = [
                scriptBased > 0 && `${scriptBased} script-based`,
                customSend > 0 && `${customSend} custom send`,
                customReceive > 0 && `${customReceive} custom receive`
            ].filter(Boolean).join(', ');

            const typeList = Array.from(monitorTypes).join(', ') || 'various';
            const evidenceText = details
                ? `${monitorCount} monitor(s) (${typeList}) - ${details}`
                : `${monitorCount} monitor(s), Types: ${typeList}`;

            features.push({
                category: 'Monitoring',
                name: scriptBased > 0 ? 'Custom Script Monitors' : 'Health Monitors',
                detected: true,
                count: monitorCount,
                objectType: 'lb.monitor',
                complexityWeight: weight,
                evidence: evidenceText,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: scriptBased > 0 ? 'External monitor scripts require conversion' : 'Direct monitor mapping',
                    nginx: scriptBased > 0 ? 'partial' : 'full',
                    nginxNotes: scriptBased > 0 ? 'Custom health check scripts via API' : 'Standard health checks supported',
                    xc: scriptBased > 0 ? 'partial' : 'full',
                    xcNotes: scriptBased > 0 ? 'Custom checks via API' : 'Standard health checks supported'
                }
            });
        }

        // SNMP Monitoring
        const snmpAlarms = Object.keys((config.add as any)?.snmp?.alarm || {}).length;
        const snmpTraps = Object.keys((config.add as any)?.snmp?.trap || {}).length;
        if (snmpAlarms > 0 || snmpTraps > 0) {
            features.push({
                category: 'Monitoring',
                name: 'SNMP Monitoring',
                detected: true,
                count: snmpAlarms + snmpTraps,
                objectType: 'snmp',
                complexityWeight: 3,
                evidence: `${snmpAlarms} alarm(s), ${snmpTraps} trap(s) configured`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'SNMP v1/v2c/v3 supported',
                    nginx: 'partial',
                    nginxNotes: 'SNMP via external monitoring',
                    xc: 'none',
                    xcNotes: 'Use API/metrics export instead'
                }
            });
        }

        // Syslog/Audit Logging
        const auditPolicies = Object.keys((config.add as any)?.audit?.syslogPolicy || {}).length;
        if (auditPolicies > 0) {
            features.push({
                category: 'Monitoring',
                name: 'Audit Logging',
                detected: true,
                count: auditPolicies,
                objectType: 'audit.syslogPolicy',
                complexityWeight: 2,
                evidence: `${auditPolicies} audit syslog policy/policies`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Syslog and HSL (high-speed logging)',
                    nginx: 'full',
                    nginxNotes: 'access_log and error_log to syslog',
                    xc: 'full',
                    xcNotes: 'Log streaming to SIEM'
                }
            });
        }

        return features;
    }

    /**
     * Category 10: Network Configuration & HA (Enhanced Phase 2)
     */
    private detectNetworking(config: AdcConfObjRx): DetectedFeature[] {
        const features: DetectedFeature[] = [];

        // VLANs
        const vlanCount = Object.keys(config.add?.vlan || {}).length;
        if (vlanCount > 0) {
            features.push({
                category: 'Network',
                name: 'VLANs',
                detected: true,
                count: vlanCount,
                objectType: 'vlan',
                complexityWeight: 2,
                evidence: `${vlanCount} VLAN definition(s)`,
                f5Mapping: {
                    tmos: 'full',
                    nginx: 'none',
                    nginxNotes: 'OS-level VLAN configuration',
                    xc: 'none',
                    xcNotes: 'Cloud networking, VLANs not applicable'
                }
            });
        }

        // High Availability (HA)
        const haNodes = Object.keys((config.add as any)?.ha?.node || {}).length;
        const haSync = Object.keys((config.set as any)?.ha?.node || {}).length;
        if (haNodes > 0 || haSync > 0) {
            features.push({
                category: 'High Availability',
                name: 'HA Pair Configuration',
                detected: true,
                count: Math.max(haNodes, haSync),
                objectType: 'ha.node',
                complexityWeight: 4,
                evidence: `${Math.max(haNodes, haSync)} HA node(s) - active/passive or active/active`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Device Service Clustering (DSC) and ConfigSync',
                    nginx: 'none',
                    nginxNotes: 'Use external HA (keepalived, pacemaker)',
                    xc: 'full',
                    xcNotes: 'Multi-site resilience built-in'
                }
            });
        }

        // Network Profiles (TCP/HTTP optimization)
        const nsTcpProfiles = Object.keys((config.add as any)?.ns?.tcpProfile || {}).length;
        const nsHttpProfiles = Object.keys((config.add as any)?.ns?.httpProfile || {}).length;
        if (nsTcpProfiles > 0 || nsHttpProfiles > 0) {
            features.push({
                category: 'Performance',
                name: 'Custom Network Profiles',
                detected: true,
                count: nsTcpProfiles + nsHttpProfiles,
                objectType: 'ns.tcpProfile',
                complexityWeight: 5,
                evidence: `${nsTcpProfiles} TCP + ${nsHttpProfiles} HTTP custom profile(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'TCP and HTTP profiles with parameter mapping',
                    nginx: 'partial',
                    nginxNotes: 'Limited TCP tuning, HTTP settings configurable',
                    xc: 'none',
                    xcNotes: 'Managed TCP/HTTP settings'
                }
            });
        }

        // SNIPs (Subnet IPs) - backend connectivity
        const snipCount = Object.keys((config.add as any)?.ns?.ip || {}).length;
        if (snipCount > 0) {
            features.push({
                category: 'Network',
                name: 'Subnet IPs (SNIPs)',
                detected: true,
                count: snipCount,
                objectType: 'ns.ip',
                complexityWeight: 2,
                evidence: `${snipCount} SNIP(s) for backend communication`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Self IPs for routing',
                    nginx: 'full',
                    nginxNotes: 'OS-level IP configuration',
                    xc: 'none',
                    xcNotes: 'Cloud networking handles routing'
                }
            });
        }

        // Link Load Balancing (LL)
        const llVservers = Object.keys((config.add as any)?.ll?.vserver || {}).length;
        if (llVservers > 0) {
            features.push({
                category: 'Network',
                name: 'Link Load Balancing',
                detected: true,
                count: llVservers,
                objectType: 'll.vserver',
                complexityWeight: 6,
                evidence: `${llVservers} link load balancing vServer(s)`,
                f5Mapping: {
                    tmos: 'partial',
                    tmosNotes: 'Use iRules for link selection',
                    nginx: 'none',
                    nginxNotes: 'Not supported',
                    xc: 'none',
                    xcNotes: 'Not applicable in cloud'
                }
            });
        }

        // Cluster configuration
        const clusterNodes = Object.keys((config.add as any)?.cluster?.node || {}).length;
        const clusterInstances = Object.keys((config.add as any)?.cluster?.instance || {}).length;
        if (clusterNodes > 0 || clusterInstances > 0) {
            features.push({
                category: 'High Availability',
                name: 'Cluster Configuration',
                detected: true,
                count: Math.max(clusterNodes, clusterInstances),
                objectType: 'cluster.node',
                complexityWeight: 7,
                evidence: `${clusterNodes} node(s) in ${clusterInstances} cluster instance(s)`,
                f5Mapping: {
                    tmos: 'full',
                    tmosNotes: 'Device groups and traffic groups',
                    nginx: 'none',
                    nginxNotes: 'Not supported',
                    xc: 'full',
                    xcNotes: 'Multi-node deployment with automatic failover'
                }
            });
        }

        return features;
    }

    /**
     * Helper: Get LB methods used
     */
    private getLBMethods(config: AdcConfObjRx): string[] {
        const methods = new Set<string>();
        for (const vs of Object.values(config.add?.lb?.vserver || {})) {
            if (vs['-lbMethod']) {
                methods.add(vs['-lbMethod'] as string);
            }
        }
        return Array.from(methods);
    }

    /**
     * Helper: Calculate persistence complexity
     */
    private getPersistenceComplexity(types: string[]): number {
        const complexTypes = ['RULE', 'CALLID', 'SRCIPDESTIP'];
        const simpleTypes = ['SOURCEIP', 'DESTIP'];

        if (types.some(t => complexTypes.includes(t))) {
            return 4; // Cookie or complex types
        } else if (types.some(t => simpleTypes.includes(t))) {
            return 2; // Simple IP-based
        }
        return 3; // Default
    }

    /**
     * Helper: Deduplicate and sort features
     */
    private deduplicateAndSort(features: DetectedFeature[]): DetectedFeature[] {
        // Remove duplicates by name
        const unique = features.filter((feature, index, self) =>
            index === self.findIndex(f => f.name === feature.name)
        );

        // Sort by category, then by complexity (descending)
        return unique.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return b.complexityWeight - a.complexityWeight;
        });
    }
}

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
