/**
 * F5 Platform Capability Mapping
 *
 * Maps NetScaler features to F5 platform capabilities and recommends best fit.
 *
 * @see FEATURE_DETECTION_DESIGN.md
 */

import { DetectedFeature } from './featureDetector';

/**
 * Feature gap (unsupported feature)
 */
export interface FeatureGap {
    /** Feature name */
    feature: string;

    /** Why it's a gap */
    reason: string;

    /** Recommended action */
    recommendation: string;

    /** Severity */
    severity?: 'Info' | 'Warning' | 'Critical';
}

/**
 * Platform recommendation result
 */
export interface PlatformRecommendation {
    /** Recommended F5 platform */
    recommended: 'TMOS' | 'NGINX+' | 'XC';

    /** Confidence level */
    confidence: 'High' | 'Medium' | 'Low';

    /** Alternative platforms with scores */
    alternatives: Array<{ name: string; score: number }>;

    /** Required modules/licenses */
    requirements: string[];

    /** Features with no direct mapping */
    gaps: FeatureGap[];

    /** Recommendation rationale */
    rationale: string;
}

/**
 * Platform compatibility scores
 */
interface PlatformScores {
    tmos: number;
    nginx: number;
    xc: number;
}

/**
 * Capability mapper - maps features to F5 platforms and recommends best fit
 */
export class CapabilityMapper {

    /**
     * Assess F5 platform compatibility and recommend best fit
     */
    public recommendPlatform(features: DetectedFeature[]): PlatformRecommendation {
        const scores = this.scorePlatforms(features);
        const requirements = this.extractRequirements(features);
        const gaps = this.identifyGaps(features);

        // Determine recommended platform
        const platforms = [
            { name: 'TMOS', score: scores.tmos },
            { name: 'NGINX+', score: scores.nginx },
            { name: 'XC', score: scores.xc }
        ].sort((a, b) => b.score - a.score);

        const recommended = platforms[0].name as 'TMOS' | 'NGINX+' | 'XC';
        const confidence = this.calculateConfidence(platforms);
        const alternatives = platforms.slice(1).map(p => ({ name: p.name, score: p.score }));
        const rationale = this.generateRationale(recommended, features, platforms);

        return {
            recommended,
            confidence,
            alternatives,
            requirements,
            gaps,
            rationale
        };
    }

    /**
     * Score each platform based on feature support
     */
    private scorePlatforms(features: DetectedFeature[]): PlatformScores {
        const scores: PlatformScores = {
            tmos: 0,
            nginx: 0,
            xc: 0
        };

        for (const feature of features) {
            const mapping = feature.f5Mapping;
            if (!mapping) {
                continue;
            }

            // TMOS scoring
            if (mapping.tmos === 'full') scores.tmos += 10;
            else if (mapping.tmos === 'partial') scores.tmos += 5;

            // NGINX+ scoring
            if (mapping.nginx === 'full') scores.nginx += 10;
            else if (mapping.nginx === 'partial') scores.nginx += 5;

            // XC scoring
            if (mapping.xc === 'full') scores.xc += 10;
            else if (mapping.xc === 'partial') scores.xc += 5;

            // Apply feature-specific bonuses/penalties
            this.applyFeatureBonus(feature, scores);
        }

        return scores;
    }

    /**
     * Apply feature-specific scoring adjustments
     */
    private applyFeatureBonus(feature: DetectedFeature, scores: PlatformScores): void {
        // VPN Gateway - TMOS only
        if (feature.name.includes('VPN') || feature.name.includes('Gateway')) {
            scores.tmos += 50;
            scores.nginx -= 20; // Penalty for not supporting
            scores.xc -= 20;
        }

        // GSLB - TMOS strong, XC good, NGINX weak
        if (feature.name === 'GSLB') {
            scores.tmos += 30;
            scores.xc += 20;
            scores.nginx -= 10;
        }

        // Application Firewall - All support but different complexity
        if (feature.name === 'Application Firewall') {
            scores.tmos += 10; // ASM/AWAF very mature
            scores.xc += 10;   // Built-in WAF
            scores.nginx += 5; // Requires App Protect license
        }

        // nFactor Auth - TMOS only
        if (feature.name.includes('nFactor') || feature.name.includes('Authentication')) {
            scores.tmos += 20;
            scores.nginx -= 10;
            scores.xc -= 5;
        }

        // Traffic Domains - TMOS full, XC partial, NGINX none
        if (feature.name === 'Traffic Domains') {
            scores.tmos += 15;
            scores.xc += 5;
            scores.nginx -= 15;
        }
    }

    /**
     * Calculate confidence level based on score spread
     */
    private calculateConfidence(platforms: Array<{ name: string; score: number }>): 'High' | 'Medium' | 'Low' {
        const diff = platforms[0].score - platforms[1].score;

        if (diff > 50) return 'High';
        if (diff > 20) return 'Medium';
        return 'Low';
    }

    /**
     * Extract required modules/licenses from features
     */
    private extractRequirements(features: DetectedFeature[]): string[] {
        const requirements = new Set<string>();

        for (const feature of features) {
            if (feature.f5Mapping?.requires) {
                feature.f5Mapping.requires.forEach(req => requirements.add(req));
            }

            // Infer requirements from feature names
            if (feature.name === 'GSLB') {
                requirements.add('GTM module (TMOS)');
            }
            if (feature.name === 'Application Firewall') {
                requirements.add('ASM/AWAF module (TMOS) or NGINX App Protect');
            }
            if (feature.name.includes('Authentication')) {
                requirements.add('APM module (TMOS)');
            }
        }

        return Array.from(requirements).sort();
    }

    /**
     * Identify conversion gaps (unsupported features)
     */
    private identifyGaps(features: DetectedFeature[]): FeatureGap[] {
        const gaps: FeatureGap[] = [];

        for (const feature of features) {
            const mapping = feature.f5Mapping;
            if (!mapping) {
                gaps.push({
                    feature: feature.name,
                    reason: 'No known F5 equivalent documented',
                    recommendation: 'Manual review required - contact F5 for guidance',
                    severity: 'Warning'
                });
                continue;
            }

            // Check for features not supported on any platform
            if (mapping.tmos === 'none' && mapping.nginx === 'none' && mapping.xc === 'none') {
                gaps.push({
                    feature: feature.name,
                    reason: 'Not supported on any F5 platform',
                    recommendation: 'Consider alternative approach or manual implementation',
                    severity: 'Critical'
                });
            }

            // Check for partial support warnings
            const partialPlatforms: string[] = [];
            if (mapping.tmos === 'partial') partialPlatforms.push('TMOS');
            if (mapping.nginx === 'partial') partialPlatforms.push('NGINX+');
            if (mapping.xc === 'partial') partialPlatforms.push('XC');

            if (partialPlatforms.length > 0) {
                gaps.push({
                    feature: feature.name,
                    reason: `Partial support on: ${partialPlatforms.join(', ')}`,
                    recommendation: `Review ${partialPlatforms.join('/')} documentation for limitations`,
                    severity: 'Info'
                });
            }

            // Check for limited platform support (supported on some, but not all)
            const unsupportedPlatforms: string[] = [];
            if (mapping.tmos === 'none') unsupportedPlatforms.push('TMOS');
            if (mapping.nginx === 'none') unsupportedPlatforms.push('NGINX+');
            if (mapping.xc === 'none') unsupportedPlatforms.push('XC');

            // Only flag as gap if at least one platform supports it (not all none)
            if (unsupportedPlatforms.length > 0 && unsupportedPlatforms.length < 3) {
                gaps.push({
                    feature: feature.name,
                    reason: `Not supported on: ${unsupportedPlatforms.join(', ')}`,
                    recommendation: `Feature available on other F5 platforms`,
                    severity: 'Info'
                });
            }
        }

        return gaps;
    }

    /**
     * Generate recommendation rationale
     */
    private generateRationale(
        recommended: string,
        features: DetectedFeature[],
        platforms: Array<{ name: string; score: number }>
    ): string {
        const reasons: string[] = [];

        // Check for platform-specific features
        const hasGSLB = features.some(f => f.name === 'GSLB');
        const hasVPN = features.some(f => f.name.includes('VPN') || f.name.includes('Gateway'));
        const hasAppFW = features.some(f => f.name === 'Application Firewall');
        const hasAuth = features.some(f => f.category === 'Authentication');
        const hasTrafficDomains = features.some(f => f.name === 'Traffic Domains');

        // TMOS-specific rationale
        if (recommended === 'TMOS') {
            if (hasVPN) {
                reasons.push('VPN Gateway features require F5 APM (TMOS-only)');
            }
            if (hasGSLB) {
                reasons.push('GSLB features best supported by GTM module (TMOS)');
            }
            if (hasAuth) {
                reasons.push('Advanced authentication requires APM module (TMOS)');
            }
            if (hasTrafficDomains) {
                reasons.push('Traffic Domains map to Route Domains (TMOS)');
            }
            if (hasAppFW) {
                reasons.push('Application Firewall migration to ASM/AWAF (TMOS provides most mature WAF)');
            }

            // If no specific reasons, provide general rationale
            if (reasons.length === 0) {
                reasons.push('TMOS provides comprehensive feature support for enterprise NetScaler migrations');
            }
        }

        // NGINX+ rationale
        if (recommended === 'NGINX+') {
            reasons.push('Configuration uses primarily basic load balancing and HTTP features');
            reasons.push('NGINX+ recommended for modern microservices architectures');
            if (hasAppFW) {
                reasons.push('Note: Application Firewall requires NGINX App Protect (additional license)');
            }
        }

        // XC rationale
        if (recommended === 'XC') {
            reasons.push('Good fit for multi-cloud and distributed architectures');
            if (hasGSLB) {
                reasons.push('GSLB features supported via Global Load Balancer');
            }
            if (hasAppFW) {
                reasons.push('Built-in WAF capabilities available');
            }
        }

        // Add score comparison
        const scoreText = platforms.map(p => `${p.name}: ${p.score}`).join(', ');
        reasons.push(`\nCompatibility scores: ${scoreText}`);

        return reasons.join('\n');
    }
}
