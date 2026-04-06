/**
 * Token weight multipliers per model family.
 * Not dollar costs — single relative multiplier per model (sonnet = 1.0 baseline).
 * Used to compute "weighted tokens" for cross-model comparisons.
 */

export interface ModelWeights {
  /** Single multiplier applied to all tokens */
  multiplier: number;
}

/**
 * Official Droid multipliers keyed by model family string (lowercase).
 * Weights are relative to claude-sonnet as baseline (1.0).
 */
export const MODEL_WEIGHTS: Record<string, ModelWeights> = {
  // Anthropic
  opus: { multiplier: 2.0 },
  sonnet: { multiplier: 1.2 },
  haiku: { multiplier: 0.4 },
  // OpenAI
  'gpt-5.4': { multiplier: 1.0 },
  'gpt-5.4-fast': { multiplier: 2.0 },
  'gpt-5.4-mini': { multiplier: 0.3 },
  'gpt-5.2': { multiplier: 0.7 },
  'gpt-5.2-codex': { multiplier: 0.7 },
  'gpt-5.3-codex': { multiplier: 0.7 },
  'gpt-5.1': { multiplier: 0.5 },
  'gpt-5.1-codex': { multiplier: 0.5 },
  // Google
  'gemini-pro': { multiplier: 0.8 },
  'gemini-flash': { multiplier: 0.2 },
  // GLM
  'glm-4.7': { multiplier: 0.25 },
  'glm-5': { multiplier: 0.4 },
  // Other
  'kimi-k2.5': { multiplier: 0.25 },
  'minimax-m2.5': { multiplier: 0.12 },
  // Fallback
  default: { multiplier: 1.0 },
};

/**
 * Look up weights for a model family string.
 * Falls back to 'default' if the family is not found.
 * @param family - Model family key (e.g. "sonnet", "opus")
 * @param configWeights - Optional config-overridden weights (from AppConfig.models.weights)
 */
export function getModelWeights(
  family: string,
  configWeights?: Record<string, ModelWeights>
): ModelWeights {
  const key = family.toLowerCase();
  if (configWeights) {
    return configWeights[key] ?? configWeights.default ?? MODEL_WEIGHTS.default;
  }
  return MODEL_WEIGHTS[key] ?? MODEL_WEIGHTS.default;
}

/**
 * Compute total weighted tokens for a given token breakdown.
 * Applies a single multiplier to the sum of all token types.
 * @param configWeights - Optional config-overridden weights (from AppConfig.models.weights)
 */
export function computeWeightedTokens(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
  family: string,
  configWeights?: Record<string, ModelWeights>
): number {
  const weights = getModelWeights(family, configWeights);
  return (inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens) * weights.multiplier;
}
