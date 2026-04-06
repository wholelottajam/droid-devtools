/**
 * IPC Handlers for Analytics operations.
 *
 * Handlers:
 * - analytics:monthlyUsage - Monthly token usage aggregated across all sessions
 */

import { tokenAggregator } from '@main/services/analysis/TokenAggregator';
import { createLogger } from '@shared/utils/logger';
import { type IpcMain } from 'electron';

const logger = createLogger('IPC:analytics');

const ANALYTICS_MONTHLY_USAGE = 'analytics:monthlyUsage';

export function registerAnalyticsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(ANALYTICS_MONTHLY_USAGE, async (_event, months?: number) => {
    try {
      const data = await tokenAggregator.getMonthlyUsage(months);
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to get monthly usage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function removeAnalyticsHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler(ANALYTICS_MONTHLY_USAGE);
}
