/**
 * SessionTokenSummary - Prominent token summary card shown above the chat history.
 * Displays total tokens with accent color, cache hit rate, model badge, and session duration.
 */

import React, { useState } from 'react';

import { useStore } from '@renderer/store';
import { computeWeightedTokens, getModelWeights } from '@shared/constants/modelWeights';
import { parseModelString } from '@shared/utils/modelParser';
import { formatTokensCompact } from '@shared/utils/tokenFormatting';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

interface SessionTokenSummaryProps {
  tabId?: string;
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function tokenColor(totalTokens: number): string {
  if (totalTokens > 500_000) return '#f87171'; // red — heavy
  if (totalTokens > 200_000) return '#fbbf24'; // amber — moderate
  return '#4ade80'; // green — efficient
}

export const SessionTokenSummary = React.memo(function SessionTokenSummary({
  tabId,
}: SessionTokenSummaryProps): React.JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false);

  const { metrics, droidSettings, configWeights } = useStore(
    useShallow((s) => {
      const td = tabId ? s.tabSessionData[tabId] : null;
      const detail = td?.sessionDetail ?? s.sessionDetail;
      return {
        metrics: detail?.metrics ?? null,
        droidSettings: detail?.droidSettings ?? null,
        configWeights: s.appConfig?.models?.weights,
      };
    })
  );

  if (!metrics || metrics.totalTokens === 0) return null;

  const {
    totalTokens,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    durationMs,
  } = metrics;

  const cacheablePart = inputTokens + cacheReadTokens;
  const cacheHitRate = cacheablePart > 0 ? (cacheReadTokens / cacheablePart) * 100 : 0;

  let weightedTokens: number | null = null;
  let modelFamily: string | null = null;
  if (droidSettings?.model) {
    const info = parseModelString(droidSettings.model);
    if (info) {
      modelFamily = info.family.toLowerCase();
      weightedTokens = computeWeightedTokens(
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        modelFamily,
        configWeights
      );
    }
  }

  const color = tokenColor(totalTokens);

  if (collapsed) {
    return (
      <div
        className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 transition-colors hover:bg-white/[0.02]"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => setCollapsed(false)}
      >
        <ChevronRight className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          {formatTokensCompact(totalTokens)} tokens
        </span>
        {droidSettings?.model && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'var(--color-text-muted)',
            }}
          >
            {droidSettings.model}
          </span>
        )}
        {durationMs > 0 && (
          <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="border-b px-3 py-2"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex items-center gap-1 transition-opacity hover:opacity-70"
        >
          <ChevronDown className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        </button>

        {/* Big token number */}
        <span className="text-xl font-semibold tabular-nums" style={{ color }}>
          {formatTokensCompact(totalTokens)}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          tokens
        </span>

        {/* Model badge */}
        {droidSettings?.model && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'var(--color-text-muted)',
            }}
          >
            {droidSettings.model}
          </span>
        )}

        {/* Duration */}
        {durationMs > 0 && (
          <span
            className="ml-auto text-xs tabular-nums"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDuration(durationMs)}
          </span>
        )}
      </div>

      {/* Detail row */}
      <div
        className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="tabular-nums">
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {formatTokensCompact(inputTokens)}
          </span>{' '}
          in
        </span>
        <span className="tabular-nums">
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {formatTokensCompact(outputTokens)}
          </span>{' '}
          out
        </span>
        <span className="tabular-nums">
          <span style={{ color: cacheHitRate >= 40 ? '#4ade80' : '#fbbf24' }}>
            {cacheHitRate.toFixed(0)}%
          </span>{' '}
          cache
        </span>
        {weightedTokens !== null && modelFamily && (
          <span className="tabular-nums">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {formatTokensCompact(Math.round(weightedTokens))}
            </span>{' '}
            weighted
          </span>
        )}
      </div>
    </div>
  );
});
