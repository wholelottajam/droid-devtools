/**
 * Token efficiency analysis utilities.
 * Computes cache efficiency scores and weighted token metrics per session/turn.
 */

export interface TokenEfficiency {
  /** Cache hit rate: cacheRead / (cacheRead + freshInput), range 0-1 */
  cacheHitRate: number;
  /** Total weighted tokens using model weight multipliers */
  totalWeightedTokens: number;
  /** Thinking token ratio: thinkingTokens / totalOutputTokens, range 0-1 */
  thinkingRatio: number;
  /** Number of conversation turns */
  turnsCount: number;
}

/**
 * Compute cache hit rate from token counts.
 * Returns 0 if there are no cacheable input tokens.
 */
export function computeCacheHitRate(cacheReadTokens: number, inputTokens: number): number {
  const cacheable = cacheReadTokens + inputTokens;
  if (cacheable === 0) return 0;
  return cacheReadTokens / cacheable;
}

/**
 * Return a color class (Tailwind) for a cache hit rate value.
 * green >= 0.7, yellow >= 0.4, red < 0.4
 */
export function getCacheHitRateColorClass(rate: number): string {
  if (rate >= 0.7) return 'text-emerald-400';
  if (rate >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Compute full token efficiency metrics for a session.
 */
export function computeTokenEfficiency(params: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  thinkingTokens: number;
  turnsCount: number;
  weightedTokens: number;
}): TokenEfficiency {
  const { inputTokens, outputTokens, cacheReadTokens, thinkingTokens, turnsCount, weightedTokens } =
    params;

  return {
    cacheHitRate: computeCacheHitRate(cacheReadTokens, inputTokens),
    totalWeightedTokens: weightedTokens,
    thinkingRatio: outputTokens > 0 ? thinkingTokens / outputTokens : 0,
    turnsCount,
  };
}
