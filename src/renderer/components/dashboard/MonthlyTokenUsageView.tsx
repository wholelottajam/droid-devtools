/**
 * MonthlyTokenUsageView - Cross-session monthly token aggregation dashboard.
 *
 * Fetches monthly usage data via the analytics IPC bridge and renders:
 * - Monthly bar chart (weighted tokens)
 * - Per-model-family breakdown
 * - Session and project counts
 */

import React, { useEffect, useMemo, useState } from 'react';

import { api } from '@renderer/api';
import { useStore } from '@renderer/store';
import { MODEL_WEIGHTS } from '@shared/constants/modelWeights';
import { formatTokensCompact } from '@shared/utils/tokenFormatting';
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import type { MonthlyTokenUsage, MonthlyUsageByModel } from '@shared/types/analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightedTokens(row: MonthlyUsageByModel): number {
  const multiplier = MODEL_WEIGHTS[row.family]?.multiplier ?? MODEL_WEIGHTS.default.multiplier;
  return (
    (row.inputTokens + row.outputTokens + row.cacheReadTokens + row.cacheCreationTokens) *
    multiplier
  );
}

function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function familyLabel(family: string): string {
  const labels: Record<string, string> = {
    opus: 'Opus',
    sonnet: 'Sonnet',
    haiku: 'Haiku',
    'gpt-5.4': 'GPT-5.4',
    'gpt-5.4-fast': 'GPT-5.4 Fast',
    'gpt-5.4-mini': 'GPT-5.4 Mini',
    'gemini-pro': 'Gemini Pro',
    'gemini-flash': 'Gemini Flash',
    'glm-4.7': 'GLM-4.7',
    'glm-5': 'GLM-5',
    'kimi-k2.5': 'Kimi K2.5',
    'minimax-m2.5': 'MiniMax M2.5',
    default: 'Other',
  };
  return labels[family] ?? family;
}

const MODEL_COLORS: Record<string, string> = {
  opus: '#a78bfa',
  sonnet: '#60a5fa',
  haiku: '#34d399',
  'gpt-5.4': '#f59e0b',
  'gpt-5.4-fast': '#fb923c',
  'gpt-5.4-mini': '#fbbf24',
  'gemini-pro': '#4ade80',
  'gemini-flash': '#86efac',
  'glm-4.7': '#f472b6',
  'glm-5': '#e879f9',
  'kimi-k2.5': '#38bdf8',
  'minimax-m2.5': '#818cf8',
  default: '#6b7280',
};

function modelColor(family: string): string {
  return MODEL_COLORS[family] ?? MODEL_COLORS.default;
}

// ---------------------------------------------------------------------------
// Month Bar
// ---------------------------------------------------------------------------

interface MonthBarProps {
  entry: MonthlyTokenUsage;
  maxWeighted: number;
}

const MonthBar = ({ entry, maxWeighted }: Readonly<MonthBarProps>): React.JSX.Element => {
  const [hovered, setHovered] = useState(false);

  const totalWeighted = useMemo(
    () => entry.byModel.reduce((sum, m) => sum + weightedTokens(m), 0),
    [entry]
  );
  const widthPct = maxWeighted > 0 ? (totalWeighted / maxWeighted) * 100 : 0;

  return (
    <div
      className="group relative flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Month label */}
      <span
        className="w-10 shrink-0 text-right text-[9px] tabular-nums"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {monthLabel(entry.month)}
      </span>

      {/* Bar track */}
      <div
        className="relative h-4 flex-1 overflow-hidden rounded-sm"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        {/* Stacked model segments */}
        <div className="flex h-4 w-full">
          {entry.byModel
            .filter((m) => m.totalTokens > 0)
            .sort((a, b) => weightedTokens(b) - weightedTokens(a))
            .map((m) => {
              const w = weightedTokens(m);
              const segPct = maxWeighted > 0 ? (w / maxWeighted) * 100 : 0;
              return (
                <div
                  key={m.family}
                  className="h-4 shrink-0"
                  style={{
                    width: `${segPct}%`,
                    backgroundColor: `${modelColor(m.family)}88`,
                    borderLeft: `1px solid ${modelColor(m.family)}`,
                  }}
                />
              );
            })}
        </div>

        {/* Tooltip */}
        {hovered && totalWeighted > 0 && (
          <div
            className="pointer-events-none absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded px-2 py-1.5 text-[9px] shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface-overlay)',
              border: '1px solid var(--color-border-emphasis)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div className="mb-1 font-semibold" style={{ color: 'var(--color-text)' }}>
              {monthLabel(entry.month)}
            </div>
            <div className="mb-1">
              {formatTokensCompact(totalWeighted)} weighted ·{' '}
              {formatTokensCompact(entry.totalTokens)} raw
            </div>
            <div className="mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {entry.sessionCount} sessions · {entry.projectCount} projects
            </div>
            {entry.byModel
              .filter((m) => m.totalTokens > 0)
              .sort((a, b) => weightedTokens(b) - weightedTokens(a))
              .map((m) => (
                <div key={m.family} className="flex items-center gap-1">
                  <span
                    className="inline-block size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: modelColor(m.family) }}
                  />
                  <span>
                    {familyLabel(m.family)}: {formatTokensCompact(weightedTokens(m))}×
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Token count */}
      <span
        className="w-12 shrink-0 text-right text-[9px] tabular-nums"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {totalWeighted > 0 ? formatTokensCompact(totalWeighted) : '—'}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MonthlyTokenUsageView = React.memo(
  function MonthlyTokenUsageView(): React.JSX.Element | null {
    const [expanded, setExpanded] = useState(false);
    const [data, setData] = useState<MonthlyTokenUsage[]>([]);
    const [loading, setLoading] = useState(false);

    const selectedProjectId = useStore(useShallow((s) => s.selectedProjectId));

    // Fetch on mount and when expanded
    useEffect(() => {
      if (!expanded) return;
      let cancelled = false;
      setLoading(true);
      api.analytics
        .getMonthlyUsage(12)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch(() => {
          if (!cancelled) setData([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [expanded]);

    // Don't show when a specific project is selected (TokenTrendsView covers that)
    if (selectedProjectId) return null;

    const maxWeighted = useMemo(
      () =>
        Math.max(1, ...data.map((e) => e.byModel.reduce((sum, m) => sum + weightedTokens(m), 0))),
      [data]
    );

    const totalSessions = data.reduce((s, e) => s + e.sessionCount, 0);
    const grandTotal = data.reduce(
      (sum, e) => sum + e.byModel.reduce((s, m) => s + weightedTokens(m), 0),
      0
    );

    return (
      <div
        className="mt-6 rounded-sm border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left transition-opacity hover:opacity-80"
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-text-muted" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
          )}
          <BarChart3 className="size-3.5 shrink-0 text-text-muted" />
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Monthly Token Usage
          </span>

          {!expanded && grandTotal > 0 && (
            <div
              className="ml-auto flex items-center gap-4 text-[10px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span>{formatTokensCompact(grandTotal)} weighted (12 mo)</span>
              <span>{totalSessions} sessions</span>
            </div>
          )}
        </button>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-border)' }}>
            {loading ? (
              <div
                className="py-4 text-center text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Loading usage data…
              </div>
            ) : data.length === 0 ? (
              <div
                className="py-4 text-center text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No usage data found
              </div>
            ) : (
              <>
                {/* Aggregate stats */}
                <div
                  className="mb-3 flex flex-wrap gap-4 text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span>
                    Total weighted:{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {formatTokensCompact(grandTotal)}
                    </span>
                  </span>
                  <span>
                    Sessions:{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>{totalSessions}</span>
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Bar color = model family · width = weighted tokens
                  </span>
                </div>

                {/* Month bars */}
                <div className="space-y-1.5">
                  {[...data].reverse().map((entry) => (
                    <MonthBar key={entry.month} entry={entry} maxWeighted={maxWeighted} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);
