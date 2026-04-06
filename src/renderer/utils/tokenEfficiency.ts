/**
 * Token efficiency analyzer.
 *
 * Analyzes a SessionDetail and returns prioritized efficiency suggestions
 * based on patterns from Droid's token efficiency documentation.
 *
 * All detection is done purely on already-available session data —
 * no new backend calls needed.
 */

import { MODEL_WEIGHTS } from '@shared/constants/modelWeights';
import { parseModelString } from '@shared/utils/modelParser';

import type { SessionDetail } from '@main/types/chunks';
import type {
  EfficiencyCategory,
  EfficiencySeverity,
  EfficiencySuggestion,
} from '@renderer/types/efficiency';

// ---------------------------------------------------------------------------
// Internal detection helpers
// ---------------------------------------------------------------------------

function getModelFamily(modelStr: string): string {
  const info = parseModelString(modelStr);
  if (!info) return 'default';
  const exactKey = info.name.toLowerCase();
  if (exactKey in MODEL_WEIGHTS) return exactKey;
  const familyKey = info.family.toLowerCase();
  if (familyKey in MODEL_WEIGHTS) return familyKey;
  return 'default';
}

function getMultiplier(modelStr: string): number {
  const family = getModelFamily(modelStr);
  return MODEL_WEIGHTS[family]?.multiplier ?? MODEL_WEIGHTS.default.multiplier;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a session and return actionable efficiency suggestions.
 * Returns an empty array for sessions with insufficient data.
 */
export function analyzeEfficiency(detail: SessionDetail): EfficiencySuggestion[] {
  const suggestions: EfficiencySuggestion[] = [];
  const { chunks, metrics, droidSettings, processes } = detail;

  // -------------------------------------------------------------------------
  // Count tool calls by type across all AI chunks
  // -------------------------------------------------------------------------
  let readCount = 0;
  let grepCount = 0;
  let errorCount = 0;
  let totalToolCalls = 0;

  for (const chunk of chunks) {
    if (chunk.chunkType !== 'ai') continue;
    for (const exec of chunk.toolExecutions) {
      totalToolCalls++;
      const name = exec.toolCall.name;
      if (name === 'Read') readCount++;
      else if (name === 'Grep' || name === 'Glob') grepCount++;
      if (exec.result?.isError) errorCount++;
    }
  }

  // Count user turns
  const userTurns = chunks.filter((c) => c.chunkType === 'user').length;

  // Count sequential (non-parallel) subagents
  const sequentialSubagents = processes.filter((p) => !p.isParallel).length;

  // -------------------------------------------------------------------------
  // Rule 1: High read/grep count → add more context to AGENTS.md
  // -------------------------------------------------------------------------
  if (readCount > 15 || grepCount > 10) {
    suggestions.push(
      make(
        'high-exploration',
        'high',
        'Excessive file exploration',
        `${readCount} Read and ${grepCount} Grep/Glob calls detected. Add more context to AGENTS.md to reduce exploration overhead.`,
        'project-setup',
        '~20–40% fewer tokens'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 2: Expensive model for simple task
  // -------------------------------------------------------------------------
  const modelStr = droidSettings?.model ?? '';
  const multiplier = modelStr ? getMultiplier(modelStr) : 1.0;
  if (multiplier >= 2.0 && metrics.totalTokens < 20_000 && totalToolCalls < 5) {
    suggestions.push(
      make(
        'expensive-model-simple-task',
        'high',
        'High-cost model for a simple task',
        `Used a ${multiplier}× model for a task with <20k tokens and <5 tool calls. Consider Sonnet (1.2×) or Haiku (0.4×) for simple tasks.`,
        'model',
        `~${Math.round((1 - 1.2 / multiplier) * 100)}% cost reduction`
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 3: Low cache hit rate
  // -------------------------------------------------------------------------
  const cacheablePart = metrics.inputTokens + metrics.cacheReadTokens;
  const cacheHitRate = cacheablePart > 0 ? metrics.cacheReadTokens / cacheablePart : null;
  if (cacheHitRate !== null && cacheHitRate < 0.3 && metrics.totalTokens > 10_000) {
    suggestions.push(
      make(
        'low-cache-rate',
        'medium',
        'Low cache efficiency',
        `Cache hit rate is ${Math.round(cacheHitRate * 100)}% (target: >70%). Check AGENTS.md size and project structure to improve caching.`,
        'project-setup',
        '~30–50% input token reduction'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 4: Very long conversation
  // -------------------------------------------------------------------------
  if (userTurns > 20) {
    suggestions.push(
      make(
        'long-conversation',
        'medium',
        'Very long session',
        `${userTurns} user turns detected. Long conversations accumulate context cost. Consider breaking large tasks into smaller, focused sessions.`,
        'workflow',
        '~30% average token reduction'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 5: Many failed tool calls
  // -------------------------------------------------------------------------
  if (errorCount > 3) {
    suggestions.push(
      make(
        'tool-errors',
        'medium',
        'Multiple tool errors',
        `${errorCount} tool call errors detected. Add linting/typecheck commands to AGENTS.md to catch errors earlier and reduce retry overhead.`,
        'project-setup'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 6: High thinking ratio
  // -------------------------------------------------------------------------
  const thinkingTokens = droidSettings?.tokenUsage?.thinkingTokens ?? 0;
  if (thinkingTokens > 0 && metrics.outputTokens > 0) {
    const thinkingRatio = thinkingTokens / metrics.outputTokens;
    if (thinkingRatio > 0.4) {
      suggestions.push(
        make(
          'high-thinking-ratio',
          'low',
          'High thinking token ratio',
          `${Math.round(thinkingRatio * 100)}% of output tokens were thinking tokens. Consider lower reasoning effort for routine tasks.`,
          'model',
          '~10–25% output cost reduction'
        )
      );
    }
  }

  // -------------------------------------------------------------------------
  // Rule 7: No spec mode for complex session
  // -------------------------------------------------------------------------
  const usedSpecMode = !!droidSettings?.specModeModel;
  if (!usedSpecMode && metrics.totalTokens > 50_000 && userTurns > 5) {
    suggestions.push(
      make(
        'no-spec-mode',
        'low',
        'Consider Spec Mode for complex tasks',
        'Complex session (>50k tokens) without Spec Mode. Spec Mode plans before executing, preventing expensive false starts.',
        'workflow',
        '~20–40% fewer wasted tokens'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 8: Sequential subagents
  // -------------------------------------------------------------------------
  if (sequentialSubagents > 3) {
    suggestions.push(
      make(
        'sequential-subagents',
        'low',
        'Sequential subagent execution',
        `${sequentialSubagents} subagents ran sequentially. Consider parallelizing independent subagent work with multi-agent orchestration.`,
        'workflow',
        '~50% wall-clock time reduction'
      )
    );
  }

  // -------------------------------------------------------------------------
  // Rule 9: Model mismatch for bulk/repetitive work
  // -------------------------------------------------------------------------
  if (multiplier >= 2.0 && readCount + grepCount > 20) {
    suggestions.push(
      make(
        'model-mismatch-bulk',
        'medium',
        'Expensive model for bulk file operations',
        `High-cost model (${multiplier}×) performing ${readCount + grepCount} read/grep operations. Use Droid Core (0.25×) or Haiku (0.4×) for bulk operations.`,
        'model',
        `~${Math.round((1 - 0.4 / multiplier) * 100)}% cost reduction for these operations`
      )
    );
  }

  // Sort: high → medium → low
  const order: Record<EfficiencySeverity, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.severity] - order[b.severity]);

  return suggestions;
}

function make(
  id: string,
  severity: EfficiencySeverity,
  title: string,
  description: string,
  category: EfficiencyCategory,
  estimatedSavings?: string
): EfficiencySuggestion {
  return { id, severity, title, description, category, estimatedSavings };
}
