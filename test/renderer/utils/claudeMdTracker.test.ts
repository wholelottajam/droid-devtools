import { describe, expect, it } from 'vitest';

import {
  detectAgentsMdFromFilePath,
  getDirectory,
  getParentDirectory,
} from '@renderer/utils/agentsMdTracker';

describe('agentsMdTracker path helpers', () => {
  describe('getDirectory', () => {
    it('returns directory from Unix path', () => {
      expect(getDirectory('/a/b/file.ts')).toBe('/a/b');
    });

    it('returns directory from Windows path', () => {
      expect(getDirectory('C:\\a\\b\\file.ts')).toBe('C:\\a\\b');
    });

    it('returns directory from mixed-separator path', () => {
      expect(getDirectory('C:\\a/b\\file.ts')).toBe('C:\\a/b');
    });

    it('returns empty for bare filename', () => {
      expect(getDirectory('file.ts')).toBe('');
    });

    it('returns root for root-level file', () => {
      expect(getDirectory('/file.ts')).toBe('');
    });
  });

  describe('getParentDirectory', () => {
    it('returns parent from Unix path', () => {
      expect(getParentDirectory('/a/b/c')).toBe('/a/b');
    });

    it('returns parent from Windows path', () => {
      expect(getParentDirectory('C:\\a\\b\\c')).toBe('C:\\a\\b');
    });

    it('returns null at root', () => {
      expect(getParentDirectory('/a')).toBeNull();
    });

    it('returns null for single segment', () => {
      expect(getParentDirectory('a')).toBeNull();
    });

    it('returns parent from deeply nested path', () => {
      expect(getParentDirectory('/a/b/c/d/e')).toBe('/a/b/c/d');
    });
  });

  describe('detectAgentsMdFromFilePath', () => {
    it('detects AGENTS.md files walking up Unix paths', () => {
      const result = detectAgentsMdFromFilePath('/repo/src/lib/file.ts', '/repo');
      expect(result).toContain('/repo/src/lib/AGENTS.md');
      expect(result).toContain('/repo/src/AGENTS.md');
      expect(result).toContain('/repo/AGENTS.md');
      expect(result).toHaveLength(3);
    });

    it('detects AGENTS.md files walking up Windows paths', () => {
      const result = detectAgentsMdFromFilePath('C:\\repo\\src\\file.ts', 'C:\\repo');
      expect(result).toContain('C:\\repo\\src\\AGENTS.md');
      expect(result).toContain('C:\\repo\\AGENTS.md');
      expect(result).toHaveLength(2);
    });

    it('uses correct separator for generated paths', () => {
      const unixResult = detectAgentsMdFromFilePath('/repo/src/file.ts', '/repo');
      for (const p of unixResult) {
        expect(p).not.toContain('\\');
      }

      const winResult = detectAgentsMdFromFilePath('C:\\repo\\src\\file.ts', 'C:\\repo');
      for (const p of winResult) {
        expect(p).toContain('\\');
        expect(p).not.toContain('/');
      }
    });

    it('returns empty array when file is at project root', () => {
      const result = detectAgentsMdFromFilePath('/repo/file.ts', '/repo');
      expect(result).toEqual(['/repo/AGENTS.md']);
    });

    it('stops at project root boundary', () => {
      const result = detectAgentsMdFromFilePath('/repo/src/file.ts', '/repo');
      // Should not go above /repo
      const aboveRoot = result.some((p) => !p.startsWith('/repo'));
      expect(aboveRoot).toBe(false);
    });
  });
});
