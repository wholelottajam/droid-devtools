/**
 * TokenAggregator - Aggregates token usage across all sessions by calendar month.
 *
 * Scans all project directories, reads .settings.json files for token data,
 * and groups results by YYYY-MM for comparison with Factory AI usage page.
 */

import { getProjectsBasePath } from '@main/utils/pathDecoder';
import { createLogger } from '@shared/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { DroidSessionSettings } from '../parsing/SessionSettingsReader';
import type { MonthlyTokenUsage, MonthlyUsageByModel } from '@shared/types/analytics';

const logger = createLogger('Service:TokenAggregator');

/** Cache TTL: 60 seconds */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  data: MonthlyTokenUsage[];
  timestamp: number;
}

export class TokenAggregator {
  private cache: CacheEntry | null = null;

  /**
   * Get monthly token usage aggregated across all projects and sessions.
   * Results are cached for 60 seconds.
   *
   * @param months - Number of months to return (default 12, most recent first)
   */
  async getMonthlyUsage(months = 12): Promise<MonthlyTokenUsage[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < CACHE_TTL_MS) {
      return this.sliceMonths(this.cache.data, months);
    }

    try {
      const data = await this.computeMonthlyUsage();
      this.cache = { data, timestamp: now };
      return this.sliceMonths(data, months);
    } catch (error) {
      logger.error('Failed to compute monthly usage:', error);
      return [];
    }
  }

  /** Invalidate cache (useful after config changes). */
  invalidate(): void {
    this.cache = null;
  }

  private sliceMonths(data: MonthlyTokenUsage[], months: number): MonthlyTokenUsage[] {
    // data is sorted newest-first; return up to `months` entries
    return data.slice(0, months);
  }

  private async computeMonthlyUsage(): Promise<MonthlyTokenUsage[]> {
    const projectsBase = getProjectsBasePath();

    let projectDirs: string[] = [];
    try {
      const entries = await fs.readdir(projectsBase, { withFileTypes: true });
      projectDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => path.join(projectsBase, e.name));
    } catch {
      logger.debug('No sessions directory found');
      return [];
    }

    // month key → accumulator
    const monthMap = new Map<
      string,
      {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheCreationTokens: number;
        sessionCount: number;
        projectIds: Set<string>;
        modelMap: Map<
          string,
          {
            totalTokens: number;
            inputTokens: number;
            outputTokens: number;
            cacheReadTokens: number;
            cacheCreationTokens: number;
          }
        >;
      }
    >();

    for (const projectDir of projectDirs) {
      const projectId = path.basename(projectDir);
      let files: string[] = [];
      try {
        const entries = await fs.readdir(projectDir);
        files = entries.filter((f) => f.endsWith('.settings.json'));
      } catch {
        continue;
      }

      for (const file of files) {
        const settingsPath = path.join(projectDir, file);
        try {
          const stat = await fs.stat(settingsPath);
          const raw = await fs.readFile(settingsPath, 'utf8');
          const settings = JSON.parse(raw) as DroidSessionSettings;

          if (!settings.tokenUsage) continue;

          const { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } =
            settings.tokenUsage;

          const total = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;
          if (total === 0) continue;

          // Use file modification time as session date
          const date = new Date(stat.mtimeMs);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
              totalTokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              sessionCount: 0,
              projectIds: new Set(),
              modelMap: new Map(),
            });
          }

          const acc = monthMap.get(monthKey)!;
          acc.totalTokens += total;
          acc.inputTokens += inputTokens;
          acc.outputTokens += outputTokens;
          acc.cacheReadTokens += cacheReadTokens;
          acc.cacheCreationTokens += cacheCreationTokens;
          acc.sessionCount++;
          acc.projectIds.add(projectId);

          // Accumulate per-model
          const family = this.extractFamily(settings.model ?? '');
          if (!acc.modelMap.has(family)) {
            acc.modelMap.set(family, {
              totalTokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
            });
          }
          const modelAcc = acc.modelMap.get(family)!;
          modelAcc.totalTokens += total;
          modelAcc.inputTokens += inputTokens;
          modelAcc.outputTokens += outputTokens;
          modelAcc.cacheReadTokens += cacheReadTokens;
          modelAcc.cacheCreationTokens += cacheCreationTokens;
        } catch {
          // Skip unreadable or malformed settings files
        }
      }
    }

    // Convert to sorted array (newest first)
    const result: MonthlyTokenUsage[] = [];
    for (const [month, acc] of monthMap.entries()) {
      const byModel: MonthlyUsageByModel[] = [];
      for (const [family, m] of acc.modelMap.entries()) {
        byModel.push({ family, ...m });
      }
      byModel.sort((a, b) => b.totalTokens - a.totalTokens);

      result.push({
        month,
        totalTokens: acc.totalTokens,
        inputTokens: acc.inputTokens,
        outputTokens: acc.outputTokens,
        cacheReadTokens: acc.cacheReadTokens,
        cacheCreationTokens: acc.cacheCreationTokens,
        sessionCount: acc.sessionCount,
        projectCount: acc.projectIds.size,
        byModel,
      });
    }

    result.sort((a, b) => b.month.localeCompare(a.month));
    return result;
  }

  private extractFamily(modelStr: string): string {
    if (!modelStr) return 'unknown';
    const lower = modelStr.toLowerCase();
    // Anthropic
    if (lower.includes('opus')) return 'opus';
    if (lower.includes('sonnet')) return 'sonnet';
    if (lower.includes('haiku')) return 'haiku';
    // OpenAI — check more specific patterns first
    if (lower.includes('gpt-5.4-fast')) return 'gpt-5.4-fast';
    if (lower.includes('gpt-5.4-mini')) return 'gpt-5.4-mini';
    if (lower.includes('gpt-5.4')) return 'gpt-5.4';
    if (lower.includes('gpt-5.3-codex')) return 'gpt-5.3-codex';
    if (lower.includes('gpt-5.2-codex')) return 'gpt-5.2-codex';
    if (lower.includes('gpt-5.2')) return 'gpt-5.2';
    if (lower.includes('gpt-5.1-codex')) return 'gpt-5.1-codex';
    if (lower.includes('gpt-5.1')) return 'gpt-5.1';
    // Google
    if (lower.includes('gemini-flash')) return 'gemini-flash';
    if (lower.includes('gemini-pro')) return 'gemini-pro';
    if (lower.includes('gemini')) return 'gemini-pro';
    // GLM
    if (lower.includes('glm-5')) return 'glm-5';
    if (lower.includes('glm-4.7') || lower.includes('glm4.7')) return 'glm-4.7';
    if (lower.includes('glm')) return 'glm-4.7';
    // Other
    if (lower.includes('kimi-k2.5') || lower.includes('kimi')) return 'kimi-k2.5';
    if (lower.includes('minimax-m2.5') || lower.includes('minimax')) return 'minimax-m2.5';
    return modelStr.split('/').pop()?.split(':')[0] ?? modelStr;
  }
}

/** Singleton instance */
export const tokenAggregator = new TokenAggregator();
