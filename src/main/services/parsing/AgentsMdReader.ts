/**
 * AgentsMdReader service - Reads AGENTS.md files and calculates token counts.
 *
 * Responsibilities:
 * - Read AGENTS.md files from various locations
 * - Calculate character counts and estimate token counts
 * - Handle file not found gracefully
 * - Support tilde (~) expansion to home directory
 */

import { encodePath, getFactoryBasePath } from '@main/utils/pathDecoder';
import { countTokens } from '@main/utils/tokenizer';
import { createLogger } from '@shared/utils/logger';
import { app } from 'electron';
import * as path from 'path';

import { LocalFileSystemProvider } from '../infrastructure/LocalFileSystemProvider';

import type { FileSystemProvider } from '../infrastructure/FileSystemProvider';

const logger = createLogger('Service:AgentsMdReader');

const defaultProvider = new LocalFileSystemProvider();

// ===========================================================================
// Types
// ===========================================================================

export interface AgentsMdFileInfo {
  path: string;
  exists: boolean;
  charCount: number;
  estimatedTokens: number; // charCount / 4
}

export interface AgentsMdReadResult {
  files: Map<string, AgentsMdFileInfo>;
}

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Expands tilde (~) in a path to the actual home directory.
 * @param filePath - Path that may contain ~
 * @returns Expanded path with ~ replaced by home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~')) {
    const homeDir = app.getPath('home');
    return path.join(homeDir, filePath.slice(1));
  }
  return filePath;
}

// ===========================================================================
// Main Functions
// ===========================================================================

/**
 * Reads a single AGENTS.md file and returns its info.
 * @param filePath - Path to the AGENTS.md file (supports ~ expansion)
 * @param fsProvider - Optional filesystem provider (defaults to local)
 * @returns AgentsMdFileInfo with file details
 */
async function readAgentsMdFile(
  filePath: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<AgentsMdFileInfo> {
  const expandedPath = expandTilde(filePath);

  try {
    if (!(await fsProvider.exists(expandedPath))) {
      return {
        path: expandedPath,
        exists: false,
        charCount: 0,
        estimatedTokens: 0,
      };
    }

    const content = await fsProvider.readFile(expandedPath);
    const charCount = content.length;
    const estimatedTokens = countTokens(content);

    return {
      path: expandedPath,
      exists: true,
      charCount,
      estimatedTokens,
    };
  } catch (error) {
    // Handle permission denied, file not readable, etc.
    logger.error(`Error reading AGENTS.md file at ${expandedPath}:`, error);
    return {
      path: expandedPath,
      exists: false,
      charCount: 0,
      estimatedTokens: 0,
    };
  }
}

/**
 * Reads all .md files in a directory and returns combined info.
 * Used for project rules directory.
 * @param dirPath - Path to the directory (supports ~ expansion)
 * @param fsProvider - Optional filesystem provider (defaults to local)
 * @returns AgentsMdFileInfo with combined stats from all .md files
 */
async function readDirectoryMdFiles(
  dirPath: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<AgentsMdFileInfo> {
  const expandedPath = expandTilde(dirPath);

  try {
    if (!(await fsProvider.exists(expandedPath))) {
      return {
        path: expandedPath,
        exists: false,
        charCount: 0,
        estimatedTokens: 0,
      };
    }

    const stats = await fsProvider.stat(expandedPath);
    if (!stats.isDirectory()) {
      return {
        path: expandedPath,
        exists: false,
        charCount: 0,
        estimatedTokens: 0,
      };
    }

    const mdFiles = await collectMdFiles(expandedPath, fsProvider);

    if (mdFiles.length === 0) {
      return {
        path: expandedPath,
        exists: false,
        charCount: 0,
        estimatedTokens: 0,
      };
    }

    let totalCharCount = 0;
    const allContent: string[] = [];

    for (const filePath of mdFiles) {
      try {
        const content = await fsProvider.readFile(filePath);
        totalCharCount += content.length;
        allContent.push(content);
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    // Count tokens on combined content for accuracy
    const estimatedTokens = countTokens(allContent.join('\n'));

    return {
      path: expandedPath,
      exists: true,
      charCount: totalCharCount,
      estimatedTokens,
    };
  } catch (error) {
    logger.error(`Error reading directory ${expandedPath}:`, error);
    return {
      path: expandedPath,
      exists: false,
      charCount: 0,
      estimatedTokens: 0,
    };
  }
}

/**
 * Recursively collect all .md files in a directory tree.
 */
async function collectMdFiles(
  dir: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<string[]> {
  const mdFiles: string[] = [];
  try {
    const entries = await fsProvider.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          mdFiles.push(fullPath);
        } else if (entry.isDirectory()) {
          mdFiles.push(...(await collectMdFiles(fullPath, fsProvider)));
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Directory not readable
  }
  return mdFiles;
}

/**
 * Returns the platform-specific enterprise AGENTS.md path.
 */
function getEnterprisePath(): string {
  switch (process.platform) {
    case 'win32':
      return 'C:\\Program Files\\FactoryCLI\\AGENTS.md';
    case 'darwin':
      return '/Library/Application Support/FactoryCLI/AGENTS.md';
    default:
      return '/etc/factory-cli/AGENTS.md';
  }
}

/**
 * Reads auto memory MEMORY.md file for a project.
 * Only reads the first 200 lines.
 */
async function readAutoMemoryFile(
  projectRoot: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<AgentsMdFileInfo> {
  const expandedRoot = expandTilde(projectRoot);
  const encoded = encodePath(expandedRoot);
  const memoryPath = path.join(getFactoryBasePath(), 'sessions', encoded, 'memory', 'MEMORY.md');

  try {
    if (!(await fsProvider.exists(memoryPath))) {
      return { path: memoryPath, exists: false, charCount: 0, estimatedTokens: 0 };
    }

    const content = await fsProvider.readFile(memoryPath);
    // Only first 200 lines
    const lines = content.split('\n');
    const truncated = lines.slice(0, 200).join('\n');
    const charCount = truncated.length;
    const estimatedTokens = countTokens(truncated);

    return { path: memoryPath, exists: true, charCount, estimatedTokens };
  } catch (error) {
    logger.error(`Error reading auto memory at ${memoryPath}:`, error);
    return { path: memoryPath, exists: false, charCount: 0, estimatedTokens: 0 };
  }
}

/**
 * Reads all potential AGENTS.md locations for a project.
 * @param projectRoot - The root directory of the project
 * @param fsProvider - Optional filesystem provider (defaults to local)
 * @returns AgentsMdReadResult with Map of path -> AgentsMdFileInfo
 */
export async function readAllAgentsMdFiles(
  projectRoot: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<AgentsMdReadResult> {
  const files = new Map<string, AgentsMdFileInfo>();
  const expandedProjectRoot = expandTilde(projectRoot);

  // 1. Enterprise AGENTS.md (platform-specific path)
  const enterprisePath = getEnterprisePath();
  files.set('enterprise', await readAgentsMdFile(enterprisePath, fsProvider));

  // 2. User memory: <Factory root>/AGENTS.md
  const userMemoryPath = path.join(getFactoryBasePath(), 'AGENTS.md');
  files.set('user', await readAgentsMdFile(userMemoryPath, fsProvider));

  // 3. Project memory: ${projectRoot}/AGENTS.md
  const projectMemoryPath = path.join(expandedProjectRoot, 'AGENTS.md');
  files.set('project', await readAgentsMdFile(projectMemoryPath, fsProvider));

  // 4. Project memory alt: ${projectRoot}/.factory/AGENTS.md
  const projectMemoryAltPath = path.join(expandedProjectRoot, '.factory', 'AGENTS.md');
  files.set('project-alt', await readAgentsMdFile(projectMemoryAltPath, fsProvider));

  // 5. Project rules: ${projectRoot}/.factory/rules/*.md
  const projectRulesPath = path.join(expandedProjectRoot, '.factory', 'rules');
  files.set('project-rules', await readDirectoryMdFiles(projectRulesPath, fsProvider));

  // 6. Project local: ${projectRoot}/AGENTS.local.md
  const projectLocalPath = path.join(expandedProjectRoot, 'AGENTS.local.md');
  files.set('project-local', await readAgentsMdFile(projectLocalPath, fsProvider));

  // 7. User rules: <Factory root>/rules/**/*.md
  const userRulesPath = path.join(getFactoryBasePath(), 'rules');
  files.set('user-rules', await readDirectoryMdFiles(userRulesPath, fsProvider));

  // 8. Auto memory: ~/.factory/sessions/<encoded>/memory/MEMORY.md
  files.set('auto-memory', await readAutoMemoryFile(projectRoot, fsProvider));

  return { files };
}

/**
 * Reads a specific directory's AGENTS.md file.
 * Used for directory-specific AGENTS.md detected from file reads.
 * @param dirPath - Path to the directory (supports ~ expansion)
 * @param fsProvider - Optional filesystem provider (defaults to local)
 * @returns AgentsMdFileInfo for the AGENTS.md file in that directory
 */
export async function readDirectoryAgentsMd(
  dirPath: string,
  fsProvider: FileSystemProvider = defaultProvider
): Promise<AgentsMdFileInfo> {
  const expandedDirPath = expandTilde(dirPath);
  const agentsMdPath = path.join(expandedDirPath, 'AGENTS.md');
  return readAgentsMdFile(agentsMdPath, fsProvider);
}
