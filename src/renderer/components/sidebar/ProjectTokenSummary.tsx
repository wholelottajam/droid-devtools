/**
 * ProjectTokenSummary - Compact token summary card shown above the session list.
 * Aggregates context consumption across all loaded sessions for the current project.
 */

import React, { useMemo } from 'react';

import { useStore } from '@renderer/store';
import { formatTokensCompact } from '@shared/utils/tokenFormatting';
import { useShallow } from 'zustand/react/shallow';

export const ProjectTokenSummary = React.memo(
  function ProjectTokenSummary(): React.JSX.Element | null {
    const { sessions, selectedProjectId } = useStore(
      useShallow((s) => ({
        sessions: s.sessions,
        selectedProjectId: s.selectedProjectId,
      }))
    );

    const stats = useMemo(() => {
      if (!sessions.length) return null;

      let totalTokens = 0;
      let sessionWithTokens = 0;
      const modelCounts: Record<string, number> = {};

      for (const s of sessions) {
        if (s.contextConsumption != null && s.contextConsumption > 0) {
          totalTokens += s.contextConsumption;
          sessionWithTokens++;
        }
        if (s.primaryModel) {
          modelCounts[s.primaryModel] = (modelCounts[s.primaryModel] ?? 0) + 1;
        }
      }

      if (sessionWithTokens === 0) return null;

      const avgTokens = Math.round(totalTokens / sessionWithTokens);
      const dominantModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        totalTokens,
        sessionCount: sessions.length,
        sessionWithTokens,
        avgTokens,
        dominantModel,
      };
    }, [sessions]);

    if (!selectedProjectId || !stats) return null;

    return (
      <div
        className="border-b px-3 py-2"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Total tokens — large and prominent */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-base font-semibold tabular-nums"
            style={{ color: 'var(--color-text)' }}
          >
            {formatTokensCompact(stats.totalTokens)}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            tokens
          </span>
          <span
            className="ml-auto text-[10px] tabular-nums"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {stats.sessionCount} sessions
          </span>
        </div>

        {/* Detail row */}
        <div
          className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>avg {formatTokensCompact(stats.avgTokens)}/session</span>
          {stats.dominantModel && (
            <>
              <span>·</span>
              <span
                className="rounded px-1 py-0.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {stats.dominantModel}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }
);
