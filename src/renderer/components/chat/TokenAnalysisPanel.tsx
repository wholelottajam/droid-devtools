/**
 * TokenAnalysisPanel - What-if model comparison panel.
 *
 * Given a session's actual token counts (from .settings.json tokenUsage),
 * shows the weighted token cost under the current model and lets the user
 * compare against alternative models using normalized weight multipliers.
 */

import React, { useState } from 'react';

import { useStore } from '@renderer/store';
import {
  computeWeightedTokens,
  getModelWeights,
  MODEL_WEIGHTS,
} from '@shared/constants/modelWeights';
import { parseModelString } from '@shared/utils/modelParser';
import { formatTokensCompact } from '@shared/utils/tokenFormatting';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

// Models available for comparison (excludes 'default' fallback)
const COMPARISON_MODELS = Object.keys(MODEL_WEIGHTS).filter((k) => k !== 'default');

/**
 * Derive the model family key used in MODEL_WEIGHTS from a raw model string.
 */
function modelFamily(modelStr: string): string {
  const info = parseModelString(modelStr);
  if (!info) return 'default';
  // Try exact match first, then family
  const exactKey = info.name.toLowerCase();
  if (exactKey in MODEL_WEIGHTS) return exactKey;
  const familyKey = info.family.toLowerCase();
  if (familyKey in MODEL_WEIGHTS) return familyKey;
  return 'default';
}

/**
 * Human-readable label for a model family key.
 */
function modelLabel(key: string): string {
  const labels: Record<string, string> = {
    opus: 'Claude Opus',
    sonnet: 'Claude Sonnet',
    haiku: 'Claude Haiku',
    'gpt-5-codex': 'GPT-5 Codex',
    'gpt-5': 'GPT-5',
    'gpt-4o': 'GPT-4o',
    'gpt-4': 'GPT-4',
  };
  return labels[key] ?? key;
}

/** Horizontal bar for token category comparison */
const TokenBar = ({
  label,
  current,
  comparison,
  maxValue,
  currentColor,
  comparisonColor,
}: Readonly<{
  label: string;
  current: number;
  comparison: number;
  maxValue: number;
  currentColor: string;
  comparisonColor: string;
}>): React.JSX.Element => {
  const currentPct = maxValue > 0 ? (current / maxValue) * 100 : 0;
  const compPct = maxValue > 0 ? (comparison / maxValue) * 100 : 0;

  return (
    <div className="space-y-0.5">
      <div
        className="flex items-center justify-between text-[9px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>{label}</span>
        <span className="tabular-nums">
          {formatTokensCompact(current)} → {formatTokensCompact(comparison)}
        </span>
      </div>
      {/* Current */}
      <div
        className="h-1 w-full rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: `${currentPct}%`, backgroundColor: currentColor }}
        />
      </div>
      {/* Comparison */}
      <div
        className="h-1 w-full rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: `${compPct}%`, backgroundColor: comparisonColor }}
        />
      </div>
    </div>
  );
};

interface TokenAnalysisPanelProps {
  tabId?: string;
}

export const TokenAnalysisPanel = React.memo(function TokenAnalysisPanel({
  tabId,
}: TokenAnalysisPanelProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  const [compModel, setCompModel] = useState<string>('haiku');

  const droidSettings = useStore(
    useShallow((s) => {
      const td = tabId ? s.tabSessionData[tabId] : null;
      return (td?.sessionDetail ?? s.sessionDetail)?.droidSettings ?? null;
    })
  );

  if (!droidSettings?.model || !droidSettings.tokenUsage) return null;

  const { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } =
    droidSettings.tokenUsage;

  // Skip if no meaningful usage
  if (inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens === 0) return null;

  const currentFamily = modelFamily(droidSettings.model);
  const currentWeighted = computeWeightedTokens(
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    currentFamily
  );

  const compWeighted = computeWeightedTokens(
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    compModel
  );

  const savings = currentWeighted - compWeighted;
  const savingsPct = currentWeighted > 0 ? (savings / currentWeighted) * 100 : 0;
  const isLighter = savings > 0;

  const currentW = getModelWeights(currentFamily);
  const compW = getModelWeights(compModel);

  const maxInput = Math.max(inputTokens * currentW.input, inputTokens * compW.input);
  const maxOutput = Math.max(outputTokens * currentW.output, outputTokens * compW.output);
  const maxCache = Math.max(
    (cacheReadTokens + cacheCreationTokens) * currentW.cached,
    (cacheReadTokens + cacheCreationTokens) * compW.cached
  );

  return (
    <div
      className="border-b text-[10px]"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition-opacity hover:opacity-80"
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <ChevronRight className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        )}
        <Zap className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-muted)' }}>Model Comparison</span>
        {!expanded && (
          <span className="ml-auto tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {formatTokensCompact(currentWeighted)} weighted
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 px-3 pb-3">
          {/* Current model summary */}
          <div
            className="rounded px-2 py-1.5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>{droidSettings.model}</span>
              <span className="font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                {formatTokensCompact(currentWeighted)} wt
              </span>
            </div>
            <div className="flex gap-3" style={{ color: 'var(--color-text-muted)' }}>
              <span>in {formatTokensCompact(Math.round(inputTokens * currentW.input))}</span>
              <span>out {formatTokensCompact(Math.round(outputTokens * currentW.output))}</span>
              <span>
                cache{' '}
                {formatTokensCompact(
                  Math.round((cacheReadTokens + cacheCreationTokens) * currentW.cached)
                )}
              </span>
            </div>
          </div>

          {/* Comparison model picker */}
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--color-text-muted)' }}>Compare with:</span>
            <select
              value={compModel}
              onChange={(e) => setCompModel(e.target.value)}
              className="rounded border px-1.5 py-0.5 text-[10px] outline-none"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border-emphasis)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {COMPARISON_MODELS.map((k) => (
                <option key={k} value={k}>
                  {modelLabel(k)}
                </option>
              ))}
            </select>
            {/* Savings indicator */}
            <span
              className="ml-auto font-medium tabular-nums"
              style={{ color: isLighter ? '#4ade80' : '#f87171' }}
            >
              {isLighter ? '↓' : '↑'} {Math.abs(Math.round(savingsPct))}%
            </span>
          </div>

          {/* Comparison bars */}
          <div className="space-y-2">
            <div className="flex gap-4 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-3 rounded-full"
                  style={{ backgroundColor: 'rgba(96,165,250,0.7)' }}
                />
                current
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-3 rounded-full"
                  style={{ backgroundColor: 'rgba(167,139,250,0.7)' }}
                />
                {modelLabel(compModel)}
              </span>
            </div>
            <TokenBar
              label="Input"
              current={Math.round(inputTokens * currentW.input)}
              comparison={Math.round(inputTokens * compW.input)}
              maxValue={maxInput}
              currentColor="rgba(96,165,250,0.7)"
              comparisonColor="rgba(167,139,250,0.7)"
            />
            <TokenBar
              label="Output"
              current={Math.round(outputTokens * currentW.output)}
              comparison={Math.round(outputTokens * compW.output)}
              maxValue={maxOutput}
              currentColor="rgba(96,165,250,0.7)"
              comparisonColor="rgba(167,139,250,0.7)"
            />
            <TokenBar
              label="Cache"
              current={Math.round((cacheReadTokens + cacheCreationTokens) * currentW.cached)}
              comparison={Math.round((cacheReadTokens + cacheCreationTokens) * compW.cached)}
              maxValue={maxCache}
              currentColor="rgba(96,165,250,0.7)"
              comparisonColor="rgba(167,139,250,0.7)"
            />
          </div>

          {/* Total comparison */}
          <div
            className="flex items-center justify-between rounded px-2 py-1.5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>{modelLabel(compModel)} total</span>
            <span
              className="font-medium tabular-nums"
              style={{ color: isLighter ? '#4ade80' : '#f87171' }}
            >
              {formatTokensCompact(compWeighted)} wt{' '}
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                ({isLighter ? '' : '+'}
                {Math.round(savingsPct)}%)
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
