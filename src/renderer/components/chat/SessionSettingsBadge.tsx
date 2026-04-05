/**
 * SessionSettingsBadge - Displays Droid session metadata from .settings.json.
 *
 * Shows model, autonomy level, tags, and reasoning effort at the top of the
 * session view, sourced from the companion .settings.json file.
 */

import React from 'react';

import { useStore } from '@renderer/store';
import { useShallow } from 'zustand/react/shallow';

import type { DroidSessionSettings } from '@renderer/types/data';

interface SessionSettingsBadgeProps {
  tabId?: string;
}

const AUTONOMY_STYLES: Record<
  DroidSessionSettings['autonomyLevel'],
  { label: string; color: string; bg: string }
> = {
  off: { label: 'off', color: 'var(--color-text-muted)', bg: 'rgba(255,255,255,0.05)' },
  light: { label: 'light', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  medium: { label: 'medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high: { label: 'high', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

/**
 * Derive a short provider label from the model string or providerLock.
 */
function inferProvider(settings: DroidSessionSettings): string | null {
  const model = settings.model?.toLowerCase() ?? '';
  const lock = (settings.apiProviderLock ?? settings.providerLock ?? '').toLowerCase();

  if (
    lock.includes('openai') ||
    model.startsWith('gpt') ||
    model.startsWith('o1') ||
    model.startsWith('o3')
  ) {
    return 'OpenAI';
  }
  if (lock.includes('anthropic') || model.startsWith('claude')) {
    return 'Anthropic';
  }
  if (lock.includes('google') || model.startsWith('gemini')) {
    return 'Google';
  }
  if (lock) {
    // Capitalize first letter of the lock value
    return lock.charAt(0).toUpperCase() + lock.slice(1);
  }
  return null;
}

export const SessionSettingsBadge = React.memo(function SessionSettingsBadge({
  tabId,
}: SessionSettingsBadgeProps): React.JSX.Element | null {
  const droidSettings = useStore(
    useShallow((s) => {
      const td = tabId ? s.tabSessionData[tabId] : null;
      return (td?.sessionDetail ?? s.sessionDetail)?.droidSettings ?? null;
    })
  );

  if (!droidSettings) return null;

  const autonomy = AUTONOMY_STYLES[droidSettings.autonomyLevel] ?? AUTONOMY_STYLES.off;
  const provider = inferProvider(droidSettings);
  const modelLabel = droidSettings.model
    ? provider
      ? `${droidSettings.model} · ${provider}`
      : droidSettings.model
    : null;

  const hasReasoningEffort =
    droidSettings.reasoningEffort &&
    droidSettings.reasoningEffort !== 'none' &&
    droidSettings.reasoningEffort !== '';
  const hasTags = droidSettings.tags.length > 0;

  if (!modelLabel && !hasTags && !hasReasoningEffort) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b px-3 py-1.5 text-[10px]"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Model + provider */}
      {modelLabel && (
        <span
          className="truncate font-mono"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '220px' }}
          title={modelLabel}
        >
          {modelLabel}
        </span>
      )}

      {/* Autonomy level */}
      <span
        className="rounded px-1.5 py-0.5 font-medium"
        style={{ color: autonomy.color, backgroundColor: autonomy.bg }}
      >
        {autonomy.label}
      </span>

      {/* Reasoning effort */}
      {hasReasoningEffort && (
        <span style={{ color: 'var(--color-text-muted)' }}>
          reasoning:{' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {droidSettings.reasoningEffort}
          </span>
        </span>
      )}

      {/* Tags */}
      {droidSettings.tags.map((tag) => (
        <span
          key={tag.name}
          className="rounded px-1.5 py-0.5"
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
});
