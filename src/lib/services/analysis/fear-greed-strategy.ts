/**
 * Fear & Greed Strategy Pattern
 *
 * Defines different algorithms for calculating the Fear & Greed Index.
 * Both strategies output on the 0-100 scale (matching CNN convention):
 * - 0 = Extreme Fear
 * - 50 = Neutral
 * - 100 = Extreme Greed
 */

/**
 * Interface for Fear & Greed calculation strategies.
 */
export interface FearGreedStrategy {
  /**
   * Calculate Fear & Greed Index value (0-100 scale).
   * @param avgCashPercentage - Average cash percentage across investors (0-100)
   * @param avgRiskScore - Average eToro risk score across investors (1-10)
   * @returns Fear & Greed Index value (0 = Extreme Fear, 100 = Extreme Greed)
   */
  calculate(avgCashPercentage: number, avgRiskScore: number): number;

  /** Strategy name for identification */
  readonly name: string;
}

/**
 * Linear Fear & Greed Strategy (V1)
 *
 * Uses a simple linear mapping based primarily on cash percentage:
 * - High cash = Fear (low index)
 * - Low cash = Greed (high index)
 *
 * This is the original/default strategy used in standard census analysis.
 */
export class LinearFearGreedStrategy implements FearGreedStrategy {
  readonly name = 'linear';

  calculate(avgCashPercentage: number): number {
    if (avgCashPercentage >= 35) {
      // Very high cash = Extreme Fear (0-24)
      return Math.max(0, 24 - (avgCashPercentage - 35) * 1.5);
    } else if (avgCashPercentage >= 20) {
      // High cash = Fear (25-44)
      return 44 - ((avgCashPercentage - 20) / 15) * 19;
    } else if (avgCashPercentage >= 12) {
      // Medium cash = Neutral (45-55)
      return 55 - ((avgCashPercentage - 12) / 8) * 10;
    } else if (avgCashPercentage >= 5) {
      // Low-medium cash = Greed (56-75)
      return 75 - ((avgCashPercentage - 5) / 7) * 19;
    } else {
      // Very low cash = Extreme Greed (76-100)
      return Math.min(100, 76 + (5 - avgCashPercentage) * 4.8);
    }
  }
}

/**
 * S-Curve (Sigmoid) Fear & Greed Strategy (V2)
 *
 * Uses a sigmoid transformation combining both cash percentage and risk score.
 * This provides more nuanced output that avoids extreme values and
 * incorporates investor risk tolerance into the calculation.
 *
 * Formula:
 * 1. Normalize cash (0-30%) and risk score (1-10)
 * 2. Combine with 70% cash weight, 30% risk weight
 * 3. Apply sigmoid transformation
 * 4. Map to 0-100 scale
 */
export class SCurveFearGreedStrategy implements FearGreedStrategy {
  readonly name = 's-curve';

  calculate(avgCashPercentage: number, avgRiskScore: number): number {
    // Normalize inputs
    // Cash: 0% = max greed, 30%+ = max fear
    const cashComponent = Math.min(30, Math.max(0, avgCashPercentage));

    // Risk: 1 = low risk (fear), 10 = high risk (greed)
    // Invert so high risk = greed, low risk = fear
    const riskComponent = Math.max(0, Math.min(10, 10 - avgRiskScore));

    // Weight combination: 70% cash, 30% risk (risk multiplied by 5 to scale)
    const combinedScore = (cashComponent * 0.7) + (riskComponent * 5 * 0.3);

    // Apply sigmoid (S-curve) transformation
    // Center around 15 (midpoint), with steepness factor of 0.15
    const sigmoid = 1 / (1 + Math.exp(-0.15 * (combinedScore - 15)));

    // Map sigmoid output (0-1) to Fear & Greed scale (0-100)
    // Invert so high combined score = fear (low index)
    const fearGreedIndex = Math.round(100 - (sigmoid * 100));

    return Math.max(0, Math.min(100, fearGreedIndex));
  }
}

// Pre-instantiated strategies for convenience
export const linearStrategy = new LinearFearGreedStrategy();
export const sCurveStrategy = new SCurveFearGreedStrategy();

// Default strategy
export const defaultFearGreedStrategy = linearStrategy;
