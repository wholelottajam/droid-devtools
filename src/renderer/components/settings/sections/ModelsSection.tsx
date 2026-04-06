/**
 * ModelsSection - Settings for per-model token weight multipliers.
 * Lets users configure how tokens are weighted for cross-model comparison.
 */

import { useCallback, useState } from 'react';

import { MODEL_WEIGHTS } from '@shared/constants/modelWeights';

import { SettingsSectionHeader } from '../components';

interface ModelWeightEntry {
  input: number;
  output: number;
  cached: number;
}

interface ModelsSectionProps {
  readonly weights: Record<string, ModelWeightEntry>;
  readonly onUpdateWeight: (family: string, field: keyof ModelWeightEntry, value: number) => void;
  readonly onResetFamily: (family: string) => void;
  readonly onResetAll: () => void;
  readonly onAddModel: (family: string) => void;
  readonly onRemoveModel: (family: string) => void;
}

const DEFAULT_FAMILIES = new Set(Object.keys(MODEL_WEIGHTS));

/** Numeric input that enforces positive-finite values and calls onChange on blur/enter */
const WeightInput = ({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (v: number) => void }>): React.JSX.Element => {
  const [localValue, setLocalValue] = useState(String(value));

  const commit = useCallback(() => {
    const n = parseFloat(localValue);
    if (Number.isFinite(n) && n > 0) {
      onChange(n);
    } else {
      setLocalValue(String(value));
    }
  }, [localValue, onChange, value]);

  return (
    <input
      type="number"
      min="0.001"
      step="0.01"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      className="w-16 rounded border px-1.5 py-0.5 text-center text-xs outline-none"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border-emphasis)',
        color: 'var(--color-text-secondary)',
      }}
    />
  );
};

export const ModelsSection = ({
  weights,
  onUpdateWeight,
  onResetFamily,
  onResetAll,
  onAddModel,
  onRemoveModel,
}: ModelsSectionProps): React.JSX.Element => {
  const [newFamily, setNewFamily] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    const key = newFamily.trim().toLowerCase();
    if (!key) return;
    if (weights[key] !== undefined) {
      setAddError(`"${key}" already exists`);
      return;
    }
    onAddModel(key);
    setNewFamily('');
    setAddError(null);
  }, [newFamily, weights, onAddModel]);

  const families = Object.keys(weights).sort((a, b) => {
    // default always last
    if (a === 'default') return 1;
    if (b === 'default') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <SettingsSectionHeader title="Model Weight Multipliers" />
        <button
          onClick={onResetAll}
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Reset all
        </button>
      </div>

      <p className="mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Relative weights used for cross-model token comparison. Sonnet = 1.0 baseline.
      </p>

      {/* Column headers */}
      <div
        className="mb-1 grid items-center gap-2 text-[10px] font-medium uppercase tracking-wider"
        style={{
          gridTemplateColumns: '1fr 4rem 4rem 4rem 5rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>Family</span>
        <span className="text-center">Input</span>
        <span className="text-center">Output</span>
        <span className="text-center">Cache</span>
        <span />
      </div>

      {/* Rows */}
      {families.map((family) => {
        const w = weights[family];
        const isDefault = DEFAULT_FAMILIES.has(family);
        const isOnlyDefault = family === 'default';

        return (
          <div
            key={family}
            className="grid items-center gap-2 border-b py-2"
            style={{
              gridTemplateColumns: '1fr 4rem 4rem 4rem 5rem',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <span className="truncate text-sm" style={{ color: 'var(--color-text)' }}>
              {family}
            </span>
            <WeightInput value={w.input} onChange={(v) => onUpdateWeight(family, 'input', v)} />
            <WeightInput value={w.output} onChange={(v) => onUpdateWeight(family, 'output', v)} />
            <WeightInput value={w.cached} onChange={(v) => onUpdateWeight(family, 'cached', v)} />
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onResetFamily(family)}
                className="rounded px-1.5 py-0.5 text-[10px] transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'var(--color-surface-raised)',
                }}
                title={`Reset ${family} to default`}
              >
                Reset
              </button>
              {!isDefault && !isOnlyDefault && (
                <button
                  onClick={() => onRemoveModel(family)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-red-400 transition-colors hover:text-red-300"
                  title={`Remove ${family}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add custom model */}
      <div className="pt-3">
        <SettingsSectionHeader title="Add Custom Model" />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newFamily}
            onChange={(e) => {
              setNewFamily(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="e.g. gemini-pro"
            className="flex-1 rounded border px-2 py-1 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border-emphasis)',
              color: 'var(--color-text)',
            }}
          />
          <button
            onClick={handleAdd}
            className="rounded px-3 py-1 text-sm transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-emphasis)',
            }}
          >
            Add
          </button>
        </div>
        {addError && <p className="mt-1 text-xs text-red-400">{addError}</p>}
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          New models start with sonnet weights (1.0 / 1.0 / 0.1). Adjust as needed.
        </p>
      </div>
    </div>
  );
};
