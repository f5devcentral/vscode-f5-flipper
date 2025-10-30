/**
 * Complexity Scoring System
 *
 * Calculates migration complexity score (1-10) based on detected features.
 *
 * @see FEATURE_DETECTION_DESIGN.md
 */

import { DetectedFeature } from './featureDetector';

/**
 * Complexity score result
 */
export interface ComplexityScore {
    /** Numeric score (1-10) */
    score: number;

    /** Rating label */
    rating: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';

    /** Justification text */
    justification: string;

    /** Estimated migration effort */
    estimatedEffort: string;

    /** Risk level */
    riskLevel: 'Low' | 'Medium' | 'High';

    /** Contributing features (high complexity only) */
    contributingFeatures?: string[];
}

/**
 * Complexity scorer - calculates migration difficulty
 */
export class ComplexityScorer {

    /**
     * Calculate overall complexity score from detected features
     */
    public calculate(features: DetectedFeature[]): ComplexityScore {
        let totalWeight = 0;
        let maxWeight = 0;
        const contributingFeatures: string[] = [];

        // Calculate weighted sum
        for (const feature of features) {
            const weight = feature.complexityWeight;
            const count = feature.count || 1;
            const contribution = weight * count;

            totalWeight += contribution;
            maxWeight = Math.max(maxWeight, weight);

            // Track high-complexity features (weight >= 7)
            if (weight >= 7) {
                contributingFeatures.push(
                    `${feature.name} (${weight}/10): ${feature.evidence}`
                );
            }
        }

        // Apply interaction multiplier based on feature diversity
        const multiplier = this.getInteractionMultiplier(features);
        totalWeight = totalWeight * multiplier;

        // Normalize to 1-10 scale
        const rawScore = totalWeight / 10;
        const finalScore = Math.min(10, Math.ceil(rawScore));

        // Generate justification
        const justification = this.generateJustification(
            features,
            finalScore,
            contributingFeatures
        );

        return {
            score: finalScore,
            rating: this.getRating(finalScore),
            justification,
            estimatedEffort: this.estimateEffort(finalScore),
            riskLevel: this.getRiskLevel(finalScore),
            contributingFeatures: contributingFeatures.length > 0 ? contributingFeatures : undefined
        };
    }

    /**
     * Calculate interaction multiplier based on feature diversity
     */
    private getInteractionMultiplier(features: DetectedFeature[]): number {
        // Count unique categories
        const categories = new Set(features.map(f => f.category));
        const categoryCount = categories.size;

        // Single feature type: 1.0
        if (categoryCount <= 1) {
            return 1.0;
        }

        // Multiple related features: 1.2
        if (categoryCount <= 3) {
            return 1.2;
        }

        // Complex architecture: 1.5
        if (categoryCount <= 6) {
            return 1.5;
        }

        // Enterprise architecture: 2.0
        return 2.0;
    }

    /**
     * Get rating label from score
     */
    private getRating(score: number): 'Simple' | 'Moderate' | 'Complex' | 'Very Complex' {
        if (score <= 3) return 'Simple';
        if (score <= 5) return 'Moderate';
        if (score <= 7) return 'Complex';
        return 'Very Complex';
    }

    /**
     * Estimate migration effort from score
     */
    private estimateEffort(score: number): string {
        if (score <= 3) return '1-2 days';
        if (score <= 5) return '3-5 days';
        if (score <= 7) return '1-2 weeks';
        return '2-4+ weeks';
    }

    /**
     * Get risk level from score
     */
    private getRiskLevel(score: number): 'Low' | 'Medium' | 'High' {
        if (score <= 3) return 'Low';
        if (score <= 6) return 'Medium';
        return 'High';
    }

    /**
     * Generate justification text
     */
    private generateJustification(
        features: DetectedFeature[],
        score: number,
        contributingFeatures: string[]
    ): string {
        const parts: string[] = [];

        // Overall assessment
        const rating = this.getRating(score);
        parts.push(`Migration complexity rated as ${rating} (${score}/10).`);

        // Feature count
        parts.push(`Detected ${features.length} feature(s) across ${new Set(features.map(f => f.category)).size} category/categories.`);

        // High-complexity features
        if (contributingFeatures.length > 0) {
            parts.push('\n\nHigh-complexity features requiring significant effort:');
            contributingFeatures.forEach(cf => {
                parts.push(`  • ${cf}`);
            });
        }

        // Top 3 contributing features by weight
        const topFeatures = [...features]
            .sort((a, b) => b.complexityWeight - a.complexityWeight)
            .slice(0, 3)
            .filter(f => f.complexityWeight >= 4); // Only show if weight >= 4

        if (topFeatures.length > 0 && contributingFeatures.length === 0) {
            parts.push('\n\nTop contributing features:');
            topFeatures.forEach(f => {
                parts.push(`  • ${f.name} (${f.complexityWeight}/10)`);
            });
        }

        return parts.join('\n');
    }
}
