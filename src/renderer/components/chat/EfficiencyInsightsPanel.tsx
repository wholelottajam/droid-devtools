/**
 * EfficiencyInsightsPanel - Per-session token efficiency suggestions.
 *
 * Collapsible panel shown below the token analysis section.
 * Only renders when the session has actionable suggestions.
 */

import React, { useMemo, useState } from 'react';

import { useStore } from '@renderer/store';
import { analyzeEfficiency } from '@renderer/utils/tokenEfficiency';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import type { EfficiencySuggestion } from '@renderer/types/efficiency';

interface EfficiencyInsightsPanelProps {
  tabId?: string;
}

function severityColor(severity: EfficiencySuggestion['severity']): string {
  switch (severity) {
    case 'high':
      return '#f87171';
    case 'medium':
      return '#fbbf24';
    case 'low':
      return '#60a5fa';
  }
}

function severityLabel(severity: EfficiencySuggestion['severity']): string {
  switch (severity) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MED';
    case 'low':
      return 'LOW';
  }
}

function categoryLabel(category: EfficiencySuggestion['category']): string {
  switch (category) {
    case 'model':
      return 'Model';
    case 'workflow':
      return 'Workflow';
    case 'project-setup':
      return 'Project Setup';
    case 'prompting':
      return 'Prompting';
  }
}

const SuggestionRow = ({
  suggestion,
}: Readonly<{ suggestion: EfficiencySuggestion }>): React.JSX.Element => {
  const color = severityColor(suggestion.severity);

  return (
    <div
      className="flex flex-col gap-0.5 border-b py-2.5"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      <div className="flex items-start gap-2">
        {/* Severity badge */}
        <span
          className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold tabular-nums"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {severityLabel(suggestion.severity)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              {suggestion.title}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {categoryLabel(suggestion.category)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            {suggestion.description}
          </p>
          {suggestion.estimatedSavings && (
            <p className="mt-0.5 text-[10px]" style={{ color: '#4ade80' }}>
              Potential savings: {suggestion.estimatedSavings}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const EfficiencyInsightsPanel = React.memo(function EfficiencyInsightsPanel({
  tabId,
}: EfficiencyInsightsPanelProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);

  const sessionDetail = useStore(
    useShallow((s) => {
      const td = tabId ? s.tabSessionData[tabId] : null;
      return td?.sessionDetail ?? s.sessionDetail;
    })
  );

  const suggestions = useMemo(() => {
    if (!sessionDetail) return [];
    return analyzeEfficiency(sessionDetail);
  }, [sessionDetail]);

  if (suggestions.length === 0) return null;

  const highCount = suggestions.filter((s) => s.severity === 'high').length;
  const medCount = suggestions.filter((s) => s.severity === 'medium').length;

  return (
    <div
      className="mx-2 mb-1 rounded-sm border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-opacity hover:opacity-80"
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0 text-text-muted" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-text-muted" />
        )}
        <Lightbulb className="size-3 shrink-0" style={{ color: '#fbbf24' }} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Efficiency Insights
        </span>

        {/* Summary badges */}
        {!expanded && (
          <div className="ml-auto flex items-center gap-1.5">
            {highCount > 0 && (
              <span
                className="rounded px-1 py-0.5 text-[9px] font-bold"
                style={{ color: '#f87171', backgroundColor: '#f8717118' }}
              >
                {highCount} HIGH
              </span>
            )}
            {medCount > 0 && (
              <span
                className="rounded px-1 py-0.5 text-[9px] font-bold"
                style={{ color: '#fbbf24', backgroundColor: '#fbbf2418' }}
              >
                {medCount} MED
              </span>
            )}
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t px-3 pb-2" style={{ borderColor: 'var(--color-border)' }}>
          {suggestions.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
});
