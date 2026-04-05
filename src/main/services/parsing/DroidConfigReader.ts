/**
 * Droid Config Reader
 *
 * Reads droid definition files from ~/.factory/droids/ and extracts
 * frontmatter metadata (name, description, color) for sidebar display.
 *
 * Supports both .md (with YAML frontmatter) and .yaml/.yml files.
 */

import { createLogger } from '@shared/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { DroidConfig } from '@shared/types/api';

const logger = createLogger('DroidConfigReader');

/**
 * Parse simple YAML frontmatter from markdown content.
 * Extracts top-level scalar key: value pairs between --- delimiters.
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Parse a simple YAML file (flat key: value pairs only).
 */
function parseYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (key.startsWith('#')) continue;
    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Read all droid definitions from ~/.factory/droids/.
 * Returns an array of DroidConfig objects sorted by name.
 */
export async function readDroidConfigs(droidsDir: string): Promise<DroidConfig[]> {
  const results: DroidConfig[] = [];

  try {
    const entries = await fs.readdir(droidsDir);
    const droidFiles = entries.filter(
      (f) => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml')
    );

    await Promise.all(
      droidFiles.map(async (filename) => {
        try {
          const content = await fs.readFile(path.join(droidsDir, filename), 'utf8');
          const isYaml = filename.endsWith('.yaml') || filename.endsWith('.yml');
          const meta = isYaml ? parseYaml(content) : parseFrontmatter(content);

          const name = meta.name ?? filename.replace(/\.(md|yaml|yml)$/, '');
          const config: DroidConfig = {
            name,
            filename,
          };
          if (meta.description) config.description = meta.description;
          if (meta.color) config.color = meta.color;

          results.push(config);
        } catch {
          // Skip unreadable files
        }
      })
    );
  } catch {
    logger.debug(`No droids directory at ${droidsDir}`);
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
