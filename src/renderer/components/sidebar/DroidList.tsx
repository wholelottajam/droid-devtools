/**
 * DroidList - Collapsible sidebar section listing custom droids from ~/.factory/droids/.
 *
 * Shows droid names and descriptions parsed from YAML frontmatter.
 * Collapsed by default; click header to expand.
 */

import React, { useEffect, useState } from 'react';

import { Bot, ChevronDown, ChevronRight } from 'lucide-react';

import type { DroidConfig } from '@shared/types/api';

export const DroidList = React.memo(function DroidList(): React.JSX.Element | null {
  const [droids, setDroids] = useState<DroidConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load droids when first expanded
  useEffect(() => {
    if (!expanded || loaded) return;

    setLoading(true);
    void window.electronAPI
      .getDroidConfigs()
      .then((configs) => {
        setDroids(configs);
        setLoaded(true);
      })
      .catch(() => {
        setDroids([]);
        setLoaded(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [expanded, loaded]);

  return (
    <div className="shrink-0 border-t" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-opacity hover:opacity-80"
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <ChevronRight className="size-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        )}
        <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Droids
        </span>
        {loaded && droids.length > 0 && (
          <span
            className="ml-auto text-[10px] tabular-nums"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {droids.length}
          </span>
        )}
      </button>

      {/* Droid list */}
      {expanded && (
        <div className="pb-2">
          {loading && (
            <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Loading…
            </div>
          )}

          {!loading && loaded && droids.length === 0 && (
            <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              No droids found in ~/.factory/droids/
            </div>
          )}

          {!loading &&
            droids.map((droid) => (
              <div key={droid.filename} className="flex items-start gap-2 px-4 py-1.5">
                <Bot
                  className="mt-0.5 size-3 shrink-0"
                  style={{ color: droid.color ?? 'var(--color-text-muted)' }}
                />
                <div className="min-w-0">
                  <div
                    className="truncate text-[12px] font-medium leading-tight"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {droid.name}
                  </div>
                  {droid.description && (
                    <div
                      className="mt-0.5 line-clamp-2 text-[10px] leading-tight"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {droid.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
});
