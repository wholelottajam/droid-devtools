/**
 * TokenTrendsView - Per-project session token trends chart.
 *
 * Shows a horizontal bar chart of contextConsumption for the last N sessions,
 * plus aggregate cache efficiency stats when available.
 */

import React, { useMemo, useState } from 'react';

import { useStore } from '@renderer/store';
import { formatTokensCompact } from '@shared/utils/tokenFormatting';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import type { Session } from '@renderer/types/data';

const MAX_SESSIONS = 20;

/** Map getCacheHitRateColorClass Tailwind classes to inline hex for sidebar dots */
function cacheRateColor(rate: number): string {
  if (rate >= 0.7) return '#4ade80';
  if (rate >= 0.4) return '#fbbf24';
  return '#f87171';
}

/** Single bar representing one session */
const SessionBar = ({
  session,
  maxTokens,
}: Readonly<{ session: Session; maxTokens: number }>): React.JSX.Element => {
  const [hovered, setHovered] = useState(false);
  const tokens = session.contextConsumption ?? 0;
  const widthPct = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;
  const cacheRate = session.cacheHitRate;
  const label = session.firstMessage?.slice(0, 40) ?? 'Untitled';
  const date = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="group relative flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Date label */}
      <span
        className="w-12 shrink-0 text-right text-[9px] tabular-nums"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {date}
      </span>

      {/* Bar track */}
      <div
        className="relative h-3 flex-1 rounded-sm"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="h-3 rounded-sm transition-all duration-300"
          style={{
            width: `${widthPct}%`,
            backgroundColor:
              cacheRate != null ? `${cacheRateColor(cacheRate)}55` : 'rgba(99,102,241,0.5)',
            borderLeft: `2px solid ${cacheRate != null ? cacheRateColor(cacheRate) : 'rgb(99,102,241)'}`,
          }}
        />
        {/* Tooltip */}
        {hovered && tokens > 0 && (
          <div
            className="pointer-events-none absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded px-2 py-1 text-[9px] shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface-overlay)',
              border: '1px solid var(--color-border-emphasis)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
              {label}
            </div>
            <div>{formatTokensCompact(tokens)} tokens</div>
            {cacheRate != null && <div>Cache: {Math.round(cacheRate * 100)}%</div>}
            {session.primaryModel && <div>{session.primaryModel}</div>}
          </div>
        )}
      </div>

      {/* Token count */}
      <span
        className="w-10 shrink-0 text-right text-[9px] tabular-nums"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {tokens > 0 ? formatTokensCompact(tokens) : '—'}
      </span>
    </div>
  );
};

/** Aggregate stats derived from session list */
function computeStats(sessions: Session[]): {
  avgTokens: number;
  avgCacheRate: number | null;
  sessionsWithCache: number;
  totalTokens: number;
} {
  const withTokens = sessions.filter((s) => (s.contextConsumption ?? 0) > 0);
  const totalTokens = withTokens.reduce((acc, s) => acc + (s.contextConsumption ?? 0), 0);
  const avgTokens = withTokens.length > 0 ? totalTokens / withTokens.length : 0;

  const withCache = sessions.filter((s) => s.cacheHitRate != null);
  const avgCacheRate =
    withCache.length > 0
      ? withCache.reduce((acc, s) => acc + (s.cacheHitRate ?? 0), 0) / withCache.length
      : null;

  return { avgTokens, avgCacheRate, sessionsWithCache: withCache.length, totalTokens };
}

export const TokenTrendsView = React.memo(function TokenTrendsView(): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);

  const { sessions, selectedProjectId } = useStore(
    useShallow((s) => ({
      sessions: s.sessions,
      selectedProjectId: s.selectedProjectId,
    }))
  );

  // Only render when a project is selected and has sessions with token data
  const recentSessions = useMemo(() => {
    const withData = sessions.filter((s) => (s.contextConsumption ?? 0) > 0);
    return withData.slice(0, MAX_SESSIONS);
  }, [sessions]);

  if (!selectedProjectId || recentSessions.length < 2) return null;

  const maxTokens = Math.max(...recentSessions.map((s) => s.contextConsumption ?? 0));
  const stats = computeStats(recentSessions);

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
        <TrendingUp className="size-3.5 shrink-0 text-text-muted" />
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Session Token Trends
        </span>

        {/* Summary stats in header */}
        {!expanded && (
          <div
            className="ml-auto flex items-center gap-4 text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span>avg {formatTokensCompact(Math.round(stats.avgTokens))}</span>
            {stats.avgCacheRate != null && (
              <span>
                cache{' '}
                <span style={{ color: cacheRateColor(stats.avgCacheRate) }}>
                  {Math.round(stats.avgCacheRate * 100)}%
                </span>
              </span>
            )}
            <span>{recentSessions.length} sessions</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {/* Aggregate stats row */}
          <div
            className="mb-3 flex flex-wrap gap-4 text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span>
              Avg context:{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {formatTokensCompact(Math.round(stats.avgTokens))}
              </span>
            </span>
            {stats.avgCacheRate != null && (
              <span>
                Avg cache:{' '}
                <span style={{ color: cacheRateColor(stats.avgCacheRate) }}>
                  {Math.round(stats.avgCacheRate * 100)}%
                </span>
              </span>
            )}
            <span>
              Sessions shown:{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>{recentSessions.length}</span>
            </span>
          </div>

          {/* Legend */}
          <div className="mb-2 flex gap-4 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            <span>Bar color = cache hit rate (green &gt;70%, yellow 40-70%, red &lt;40%)</span>
          </div>

          {/* Session bars */}
          <div className="space-y-1.5">
            {recentSessions.map((session) => (
              <SessionBar key={session.id} session={session} maxTokens={maxTokens} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
