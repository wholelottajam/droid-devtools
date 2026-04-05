import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readSessionSettings,
  readSessionSettingsById,
} from '../../../../src/main/services/parsing/SessionSettingsReader';

const SAMPLE_SETTINGS = {
  assistantActiveTimeMs: 187628,
  model: 'gpt-5.3-codex',
  reasoningEffort: 'medium',
  interactionMode: 'auto',
  autonomyLevel: 'off' as const,
  autonomyMode: 'normal',
  specModeModel: 'claude-opus-4-6',
  specModeReasoningEffort: 'high',
  tags: [{ name: 'exec' }],
  providerLock: 'openai',
  tokenUsage: {
    inputTokens: 34045,
    outputTokens: 12641,
    cacheCreationTokens: 0,
    cacheReadTokens: 784768,
    thinkingTokens: 3890,
  },
};

describe('SessionSettingsReader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-settings-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('readSessionSettings', () => {
    it('reads settings from a .settings.json file alongside a .jsonl file', async () => {
      const sessionId = 'abc-123';
      fs.writeFileSync(path.join(tmpDir, `${sessionId}.jsonl`), '');
      fs.writeFileSync(
        path.join(tmpDir, `${sessionId}.settings.json`),
        JSON.stringify(SAMPLE_SETTINGS)
      );

      const settings = await readSessionSettings(path.join(tmpDir, `${sessionId}.jsonl`));

      expect(settings).not.toBeNull();
      expect(settings!.model).toBe('gpt-5.3-codex');
      expect(settings!.autonomyLevel).toBe('off');
      expect(settings!.tags).toEqual([{ name: 'exec' }]);
      expect(settings!.tokenUsage.inputTokens).toBe(34045);
      expect(settings!.tokenUsage.thinkingTokens).toBe(3890);
    });

    it('returns null when settings file does not exist', async () => {
      const settings = await readSessionSettings(path.join(tmpDir, 'nonexistent.jsonl'));
      expect(settings).toBeNull();
    });
  });

  describe('readSessionSettingsById', () => {
    it('reads settings by session ID and directory', async () => {
      const sessionId = 'def-456';
      fs.writeFileSync(
        path.join(tmpDir, `${sessionId}.settings.json`),
        JSON.stringify(SAMPLE_SETTINGS)
      );

      const settings = await readSessionSettingsById(tmpDir, sessionId);

      expect(settings).not.toBeNull();
      expect(settings!.model).toBe('gpt-5.3-codex');
      expect(settings!.providerLock).toBe('openai');
    });

    it('returns null for missing session ID', async () => {
      const settings = await readSessionSettingsById(tmpDir, 'missing-id');
      expect(settings).toBeNull();
    });
  });
});
