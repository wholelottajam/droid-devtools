/**
 * Analytics IPC handlers.
 * Provides token usage aggregation data to the renderer.
 */

import { tokenAggregator } from '../services/analysis/TokenAggregator';

import type { IpcMain } from 'electron';

const ANALYTICS_MONTHLY_USAGE = 'analytics:monthlyUsage';

export function registerAnalyticsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(ANALYTICS_MONTHLY_USAGE, async (_event, months?: number) => {
    try {
      const data = await tokenAggregator.getMonthlyUsage(months);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

export function removeAnalyticsHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler(ANALYTICS_MONTHLY_USAGE);
}
