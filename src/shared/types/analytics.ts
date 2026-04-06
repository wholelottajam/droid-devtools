/**
 * Analytics types for cross-session token aggregation.
 */

/** Per-model token total within a month */
export interface MonthlyUsageByModel {
  /** Model family key (e.g. "sonnet", "opus") */
  family: string;
  /** Total tokens for this model family */
  totalTokens: number;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Cache read tokens */
  cacheReadTokens: number;
  /** Cache creation tokens */
  cacheCreationTokens: number;
}

/** Aggregated token usage for a calendar month */
export interface MonthlyTokenUsage {
  /** Month key in YYYY-MM format */
  month: string;
  /** Total tokens across all categories */
  totalTokens: number;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Cache read tokens */
  cacheReadTokens: number;
  /** Cache creation tokens */
  cacheCreationTokens: number;
  /** Number of sessions contributing to this month */
  sessionCount: number;
  /** Number of distinct projects contributing to this month */
  projectCount: number;
  /** Per-model-family breakdown */
  byModel: MonthlyUsageByModel[];
}
