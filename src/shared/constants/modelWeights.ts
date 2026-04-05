/**
 * Token weight multipliers per model family.
 * Not dollar costs — normalized relative weights (sonnet = 1.0 baseline).
 * Used to compute "weighted tokens" for cross-model comparisons.
 */

export interface ModelWeights {
  /** Weight applied to input tokens */
  input: number;
  /** Weight applied to output tokens */
  output: number;
  /** Weight applied to cache read tokens */
  cached: number;
}

/**
 * Relative token weights keyed by model family string (lowercase).
 * Weights are relative to claude-sonnet as baseline (1.0).
 */
export const MODEL_WEIGHTS: Record<string, ModelWeights> = {
  // Anthropic
  opus: { input: 5.0, output: 5.0, cached: 0.5 },
  sonnet: { input: 1.0, output: 1.0, cached: 0.1 },
  haiku: { input: 0.25, output: 0.25, cached: 0.03 },
  // OpenAI (approximate relative to sonnet baseline)
  'gpt-5-codex': { input: 2.0, output: 2.0, cached: 0.2 },
  'gpt-5': { input: 3.0, output: 3.0, cached: 0.3 },
  'gpt-4o': { input: 0.5, output: 0.5, cached: 0.05 },
  'gpt-4': { input: 1.5, output: 1.5, cached: 0.15 },
  // Fallback
  default: { input: 1.0, output: 1.0, cached: 0.1 },
};

/**
 * Look up weights for a model family string.
 * Falls back to 'default' if the family is not found.
 */
export function getModelWeights(family: string): ModelWeights {
  const key = family.toLowerCase();
  return MODEL_WEIGHTS[key] ?? MODEL_WEIGHTS.default;
}

/**
 * Compute total weighted tokens for a given token breakdown.
 */
export function computeWeightedTokens(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
  family: string
): number {
  const weights = getModelWeights(family);
  return (
    inputTokens * weights.input +
    outputTokens * weights.output +
    cacheReadTokens * weights.cached +
    cacheCreationTokens * weights.input
  );
}
