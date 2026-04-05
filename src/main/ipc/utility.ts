/**
 * IPC Handlers for Utility Operations.
 *
 * Handlers:
 * - shell:openPath: Opens a folder or file in the system's default application
 * - read-agents-md-files: Reads all global AGENTS.md files for a project
 * - read-directory-agents-md: Reads a specific directory's AGENTS.md file
 * - read-mentioned-file: Validates mentioned files for context injection
 */

import { createLogger } from '@shared/utils/logger';
import { app, type IpcMain, type IpcMainInvokeEvent, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import {
  type AgentsMdFileInfo,
  readAgentConfigs,
  readAllAgentsMdFiles,
  readDirectoryAgentsMd,
  readDroidConfigs,
} from '../services';
import { getFactoryBasePath } from '../utils/pathDecoder';

import type { AgentConfig, DroidConfig } from '@shared/types/api';

const logger = createLogger('IPC:utility');
import { validateFilePath, validateOpenPath } from '../utils/pathValidation';
import { countTokens } from '../utils/tokenizer';

/**
 * Registers all utility-related IPC handlers.
 */
export function registerUtilityHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('get-app-version', handleGetAppVersion);
  ipcMain.handle('shell:openPath', handleShellOpenPath);
  ipcMain.handle('shell:openExternal', handleShellOpenExternal);
  ipcMain.handle('read-agents-md-files', handleReadAgentsMdFiles);
  ipcMain.handle('read-directory-agents-md', handleReadDirectoryAgentsMd);
  ipcMain.handle('read-mentioned-file', handleReadMentionedFile);
  ipcMain.handle('read-agent-configs', handleReadAgentConfigs);
  ipcMain.handle('get-droid-configs', handleGetDroidConfigs);

  logger.info('Utility handlers registered');
}

/**
 * Removes all utility IPC handlers.
 */
export function removeUtilityHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('get-app-version');
  ipcMain.removeHandler('shell:openPath');
  ipcMain.removeHandler('shell:openExternal');
  ipcMain.removeHandler('read-agents-md-files');
  ipcMain.removeHandler('read-directory-agents-md');
  ipcMain.removeHandler('read-mentioned-file');
  ipcMain.removeHandler('read-agent-configs');
  ipcMain.removeHandler('get-droid-configs');

  logger.info('Utility handlers removed');
}

// =============================================================================
// Handler Implementations
// =============================================================================

/**
 * Handler for 'get-app-version' IPC call.
 * Returns the app version from package.json.
 */
function handleGetAppVersion(): string {
  return app.getVersion();
}

/**
 * Handler for 'shell:openExternal' IPC call.
 * Opens a URL in the system's default browser.
 */
async function handleShellOpenExternal(
  _event: IpcMainInvokeEvent,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: 'Invalid URL' };
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:') {
      logger.error(`shell:openExternal - invalid URL scheme: ${url}`);
      return { success: false, error: 'Only http, https, and mailto URLs are allowed' };
    }

    await shell.openExternal(parsedUrl.toString());
    return { success: true };
  } catch (error) {
    logger.error('Error in shell:openExternal:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handler for 'shell:openPath' IPC call.
 * Opens a folder or file in the system's default application (Finder on macOS).
 * Validates path security before opening.
 */
async function handleShellOpenPath(
  _event: IpcMainInvokeEvent,
  targetPath: string,
  projectRoot?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate path security
    const validation = validateOpenPath(targetPath, projectRoot ?? null);
    if (!validation.valid) {
      logger.error(`shell:openPath - validation failed: ${validation.error ?? 'Unknown error'}`);
      return { success: false, error: validation.error };
    }

    const safePath = validation.normalizedPath!;

    // Check if path exists
    try {
      await fs.promises.access(safePath);
    } catch {
      logger.error(`shell:openPath - path does not exist: ${safePath}`);
      return { success: false, error: 'Path does not exist' };
    }

    // Open in default application (Finder on macOS)
    const errorMessage = await shell.openPath(safePath);
    if (errorMessage) {
      logger.error(`shell:openPath - failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in shell:openPath:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handler for 'read-agents-md-files' IPC call.
 * Reads all global CLAUDE.md files for a project.
 */
async function handleReadAgentsMdFiles(
  _event: IpcMainInvokeEvent,
  projectRoot: string
): Promise<Record<string, AgentsMdFileInfo>> {
  try {
    const result = await readAllAgentsMdFiles(projectRoot);
    // Convert Map to object for IPC serialization
    const files: Record<string, AgentsMdFileInfo> = {};
    result.files.forEach((info, key) => {
      files[key] = info;
    });

    return files;
  } catch (error) {
    logger.error(`Error in read-agents-md-files:`, error);
    return {};
  }
}

/**
 * Handler for 'read-directory-agents-md' IPC call.
 * Reads a specific directory's CLAUDE.md file.
 */
async function handleReadDirectoryAgentsMd(
  _event: IpcMainInvokeEvent,
  dirPath: string
): Promise<AgentsMdFileInfo> {
  try {
    const info = await readDirectoryAgentsMd(dirPath);
    return info;
  } catch (error) {
    logger.error(`Error in read-directory-agents-md:`, error);
    return {
      path: dirPath,
      exists: false,
      charCount: 0,
      estimatedTokens: 0,
    };
  }
}

/**
 * Handler for 'read-mentioned-file' IPC call.
 * Validates mentioned files for context injection.
 * Returns file info if file exists, is a regular file, within allowed directories, and within token limits.
 *
 * Security: Validates path against allowed directories and sensitive file patterns.
 */
async function handleReadMentionedFile(
  _event: IpcMainInvokeEvent,
  absolutePath: string,
  projectRoot: string,
  maxTokens: number = 25000
): Promise<{ path: string; exists: boolean; charCount: number; estimatedTokens: number } | null> {
  try {
    // Validate path security
    const validation = validateFilePath(absolutePath, projectRoot || null);
    if (!validation.valid) {
      return null;
    }

    const safePath = validation.normalizedPath!;

    // Check if file exists
    try {
      await fs.promises.access(safePath);
    } catch {
      return null;
    }

    // Check if it's a file (not directory)
    const stats = await fs.promises.stat(safePath);
    if (!stats.isFile()) {
      return null;
    }

    // Read file content
    const content = await fs.promises.readFile(safePath, 'utf8');

    // Calculate tokens
    const estimatedTokens = countTokens(content);

    // Check token limit
    if (estimatedTokens > maxTokens) {
      return null;
    }

    return {
      path: safePath,
      exists: true,
      charCount: content.length,
      estimatedTokens,
    };
  } catch (error) {
    logger.error(`Error in read-mentioned-file for ${absolutePath}:`, error);
    return null;
  }
}

/**
 * Handler for 'read-agent-configs' IPC call.
 * Reads agent definitions from project's .claude/agents/ directory.
 */
async function handleReadAgentConfigs(
  _event: IpcMainInvokeEvent,
  projectRoot: string
): Promise<Record<string, AgentConfig>> {
  try {
    return await readAgentConfigs(projectRoot);
  } catch (error) {
    logger.error('Error in read-agent-configs:', error);
    return {};
  }
}

/**
 * Handler for 'get-droid-configs' IPC call.
 * Reads droid definitions from global ~/.factory/droids/ directory.
 */
async function handleGetDroidConfigs(_event: IpcMainInvokeEvent): Promise<DroidConfig[]> {
  try {
    const droidsDir = path.join(getFactoryBasePath(), 'droids');
    return await readDroidConfigs(droidsDir);
  } catch (error) {
    logger.error('Error in get-droid-configs:', error);
    return [];
  }
}
