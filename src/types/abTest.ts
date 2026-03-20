/**
 * @fileoverview A/B Test 类型定义
 * @description 定义 A/B 测试实体及其相关类型
 * @module types/abTest
 */

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';
export type ABTestType = 'landing' | 'offer';
export type TrafficAllocation = 'equal' | 'custom' | 'winner';

export interface ABTestVariant {
  id: string;
  name: string;
  // For landing page test
  landingPageId?: string;
  landingPageName?: string;
  // For offer test
  offerId?: string;
  offerName?: string;
  // Traffic allocation percentage (0-100)
  weight: number;
  // Statistics
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  // Calculated metrics
  cr?: number;
  epc?: number;
  roi?: number;
  // Winner flag
  isWinner?: boolean;
}

export interface ABTest {
  id: string;
  campaignId: string;
  campaignName?: string;
  name: string;
  description?: string;
  type: ABTestType;
  status: ABTestStatus;
  trafficAllocation: TrafficAllocation;
  // Variants
  variants: ABTestVariant[];
  // Winner selection criteria
  winnerCriteria: 'conversion_rate' | 'epc' | 'roi' | 'revenue';
  // Minimum sample size for auto-select winner
  minSampleSize?: number;
  // Minimum confidence level (0-100)
  minConfidence?: number;
  // Auto-select winner enabled
  autoSelectWinner: boolean;
  // Start and end dates
  startDate?: string;
  endDate?: string;
  // Created/Updated
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateABTestDTO {
  campaignId: string;
  name: string;
  description?: string;
  type: ABTestType;
  trafficAllocation?: TrafficAllocation;
  variants: Omit<ABTestVariant, 'id' | 'clicks' | 'conversions' | 'revenue' | 'cost' | 'cr' | 'epc' | 'roi' | 'isWinner'>[];
  winnerCriteria?: 'conversion_rate' | 'epc' | 'roi' | 'revenue';
  minSampleSize?: number;
  minConfidence?: number;
  autoSelectWinner?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UpdateABTestDTO {
  name?: string;
  description?: string;
  status?: ABTestStatus;
  trafficAllocation?: TrafficAllocation;
  variants?: ABTestVariant[];
  winnerCriteria?: 'conversion_rate' | 'epc' | 'roi' | 'revenue';
  minSampleSize?: number;
  minConfidence?: number;
  autoSelectWinner?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ABTestResult {
  testId: string;
  testName: string;
  status: ABTestStatus;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  variants: {
    variantId: string;
    variantName: string;
    clicks: number;
    conversions: number;
    revenue: number;
    cr: number;
    epc: number;
    roi: number;
    confidence?: number;
    isWinner: boolean;
    improvement?: number; // Percentage improvement over baseline
  }[];
  winner?: {
    variantId: string;
    variantName: string;
    confidence: number;
  };
  recommendations?: string[];
}

// Traffic split calculation
export interface TrafficSplit {
  variantId: string;
  weight: number;
  percentage: number;
}

/**
 * Calculate traffic split based on weights
 */
export function calculateTrafficSplit(variants: { id: string; weight: number }[]): TrafficSplit[] {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  
  if (totalWeight === 0) {
    // Equal distribution if no weights
    const equalWeight = 100 / variants.length;
    return variants.map(v => ({
      variantId: v.id,
      weight: v.weight,
      percentage: equalWeight,
    }));
  }
  
  return variants.map(v => ({
    variantId: v.id,
    weight: v.weight,
    percentage: (v.weight / totalWeight) * 100,
  }));
}

/**
 * Select variant based on traffic split and visitor ID (consistent hashing)
 */
export function selectVariant(
  variants: { id: string; weight: number }[],
  visitorId: string
): string {
  const split = calculateTrafficSplit(variants);
  
  // Use visitor ID to create consistent hash
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    const char = visitorId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Normalize hash to 0-100
  const normalizedHash = Math.abs(hash) % 100;
  
  // Select variant based on cumulative percentage
  let cumulative = 0;
  for (const variant of split) {
    cumulative += variant.percentage;
    if (normalizedHash < cumulative) {
      return variant.variantId;
    }
  }
  
  // Fallback to last variant
  const lastVariant = split[split.length - 1];
  const firstVariant = variants[0];
  return (lastVariant?.variantId || firstVariant?.id) ?? '';
}

/**
 * Calculate statistical significance (simplified chi-square test)
 */
export function calculateSignificance(
  controlClicks: number,
  controlConversions: number,
  variantClicks: number,
  variantConversions: number
): number {
  if (controlClicks === 0 || variantClicks === 0) return 0;
  
  const controlCR = controlConversions / controlClicks;
  const variantCR = variantConversions / variantClicks;
  
  // Pooled conversion rate
  const totalClicks = controlClicks + variantClicks;
  const totalConversions = controlConversions + variantConversions;
  const pooledCR = totalConversions / totalClicks;
  
  // Standard error
  const se = Math.sqrt(
    pooledCR * (1 - pooledCR) * (1 / controlClicks + 1 / variantClicks)
  );
  
  if (se === 0) return 0;
  
  // Z-score
  const zScore = (variantCR - controlCR) / se;
  
  // Convert to confidence level (simplified)
  // For a proper implementation, use a Z-table or statistical library
  const confidence = Math.min(Math.abs(zScore) * 25, 99);
  
  return Math.round(confidence * 100) / 100;
}

/**
 * Determine winner based on criteria
 */
export function determineWinner(
  variants: ABTestVariant[],
  criteria: 'conversion_rate' | 'epc' | 'roi' | 'revenue',
  minConfidence: number = 95
): { winnerId: string | null; confidence: number } {
  if (variants.length < 2) return { winnerId: null, confidence: 0 };
  
  // Sort by criteria
  const sorted = [...variants].sort((a, b) => {
    let aValue: number, bValue: number;
    
    switch (criteria) {
      case 'conversion_rate':
        aValue = a.cr || 0;
        bValue = b.cr || 0;
        break;
      case 'epc':
        aValue = a.epc || 0;
        bValue = b.epc || 0;
        break;
      case 'roi':
        aValue = a.roi || 0;
        bValue = b.roi || 0;
        break;
      case 'revenue':
        aValue = a.revenue || 0;
        bValue = b.revenue || 0;
        break;
      default:
        aValue = a.cr || 0;
        bValue = b.cr || 0;
    }
    
    return bValue - aValue; // Descending order
  });
  
  const winner = sorted[0];
  const control = sorted[1]; // Use second best as control for comparison
  
  if (!winner || !control) return { winnerId: null, confidence: 0 };
  
  // Calculate confidence
  const confidence = calculateSignificance(
    control.clicks,
    control.conversions,
    winner.clicks,
    winner.conversions
  );
  
  if (confidence >= minConfidence) {
    return { winnerId: winner.id, confidence };
  }
  
  return { winnerId: null, confidence };
}
