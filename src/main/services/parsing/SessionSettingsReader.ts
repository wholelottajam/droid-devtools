/**
 * SessionSettingsReader - Reads Droid .settings.json files alongside JSONL sessions.
 *
 * Each Droid session has a companion {sessionId}.settings.json file containing
 * session-level metadata: model, provider, autonomy, tags, and aggregate token usage.
 */

import { createLogger } from '@shared/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger('Service:SessionSettingsReader');

export interface DroidSessionSettings {
  assistantActiveTimeMs: number;
  model: string;
  reasoningEffort: string;
  interactionMode: string;
  autonomyLevel: 'off' | 'light' | 'medium' | 'high';
  autonomyMode: string;
  specModeModel?: string;
  specModeReasoningEffort?: string;
  tags: { name: string }[];
  providerLock?: string;
  providerLockTimestamp?: string;
  apiProviderLock?: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    thinkingTokens: number;
  };
}

/**
 * Read the .settings.json file for a Droid session.
 *
 * @param jsonlFilePath - Path to the session JSONL file
 * @returns Parsed settings or null if not found
 */
export async function readSessionSettings(
  jsonlFilePath: string
): Promise<DroidSessionSettings | null> {
  const settingsPath = jsonlFilePath.replace(/\.jsonl$/, '.settings.json');

  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw) as DroidSessionSettings;
    return parsed;
  } catch {
    logger.debug(`No settings file found at ${settingsPath}`);
    return null;
  }
}

/**
 * Read settings for a session given the session directory and session ID.
 *
 * @param sessionDir - Directory containing session files
 * @param sessionId - UUID of the session
 * @returns Parsed settings or null if not found
 */
export async function readSessionSettingsById(
  sessionDir: string,
  sessionId: string
): Promise<DroidSessionSettings | null> {
  const settingsPath = path.join(sessionDir, `${sessionId}.settings.json`);

  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw) as DroidSessionSettings;
    return parsed;
  } catch {
    logger.debug(`No settings file for session ${sessionId}`);
    return null;
  }
}
