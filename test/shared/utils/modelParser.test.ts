import { describe, expect, it } from 'vitest';

import { getModelColorClass, parseModelString } from '../../../src/shared/utils/modelParser';

describe('modelParser', () => {
  describe('parseModelString', () => {
    it('should return null for empty string', () => {
      expect(parseModelString('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(parseModelString(undefined)).toBeNull();
    });

    it('should return null for synthetic model', () => {
      expect(parseModelString('<synthetic>')).toBeNull();
    });

    it('should return null for unknown provider prefix', () => {
      expect(parseModelString('llama-3-70b')).toBeNull();
    });

    // -------------------------------------------------------------------------
    // Anthropic models
    // -------------------------------------------------------------------------

    // New format tests: claude-{family}-{major}-{minor}-{date}
    it('should parse new format: claude-sonnet-4-5-20250929', () => {
      const result = parseModelString('claude-sonnet-4-5-20250929');
      expect(result).toEqual({
        name: 'sonnet4.5',
        family: 'sonnet',
        majorVersion: 4,
        minorVersion: 5,
        provider: 'anthropic',
      });
    });

    it('should parse new format without minor version', () => {
      const result = parseModelString('claude-opus-5-20260101');
      expect(result).toEqual({
        name: 'opus5',
        family: 'opus',
        majorVersion: 5,
        minorVersion: null,
        provider: 'anthropic',
      });
    });

    it('should parse new format without date: claude-opus-4-6', () => {
      const result = parseModelString('claude-opus-4-6');
      expect(result).toEqual({
        name: 'opus4.6',
        family: 'opus',
        majorVersion: 4,
        minorVersion: 6,
        provider: 'anthropic',
      });
    });

    it('should parse new format: claude-haiku-3-20240307', () => {
      const result = parseModelString('claude-haiku-3-20240307');
      expect(result).toEqual({
        name: 'haiku3',
        family: 'haiku',
        majorVersion: 3,
        minorVersion: null,
        provider: 'anthropic',
      });
    });

    // Old format tests: claude-{major}[-{minor}]-{family}-{date}
    it('should parse old format: claude-3-opus-20240229', () => {
      const result = parseModelString('claude-3-opus-20240229');
      expect(result).toEqual({
        name: 'opus3',
        family: 'opus',
        majorVersion: 3,
        minorVersion: null,
        provider: 'anthropic',
      });
    });

    it('should parse old format with minor: claude-3-5-sonnet-20241022', () => {
      const result = parseModelString('claude-3-5-sonnet-20241022');
      expect(result).toEqual({
        name: 'sonnet3.5',
        family: 'sonnet',
        majorVersion: 3,
        minorVersion: 5,
        provider: 'anthropic',
      });
    });

    it('should handle case insensitivity', () => {
      const result = parseModelString('CLAUDE-SONNET-4-5-20250929');
      expect(result).toEqual({
        name: 'sonnet4.5',
        family: 'sonnet',
        majorVersion: 4,
        minorVersion: 5,
        provider: 'anthropic',
      });
    });

    it('should handle whitespace', () => {
      const result = parseModelString('  claude-sonnet-4-5-20250929  ');
      expect(result).toEqual({
        name: 'sonnet4.5',
        family: 'sonnet',
        majorVersion: 4,
        minorVersion: 5,
        provider: 'anthropic',
      });
    });

    it('should return null for invalid format with only two parts', () => {
      expect(parseModelString('claude-sonnet')).toBeNull();
    });

    it('should handle unknown anthropic model families', () => {
      const result = parseModelString('claude-newmodel-4-5-20250929');
      expect(result).toEqual({
        name: 'newmodel4.5',
        family: 'newmodel',
        majorVersion: 4,
        minorVersion: 5,
        provider: 'anthropic',
      });
    });

    // -------------------------------------------------------------------------
    // OpenAI models
    // -------------------------------------------------------------------------

    it('should parse gpt-5.3-codex', () => {
      const result = parseModelString('gpt-5.3-codex');
      expect(result).toEqual({
        name: 'gpt-5.3-codex',
        family: 'gpt-5-codex',
        majorVersion: 5,
        minorVersion: 3,
        provider: 'openai',
      });
    });

    it('should parse gpt-5.4', () => {
      const result = parseModelString('gpt-5.4');
      expect(result).toEqual({
        name: 'gpt-5.4',
        family: 'gpt-5',
        majorVersion: 5,
        minorVersion: 4,
        provider: 'openai',
      });
    });

    it('should parse gpt-4 (no minor version)', () => {
      const result = parseModelString('gpt-4');
      expect(result).toEqual({
        name: 'gpt-4',
        family: 'gpt-4',
        majorVersion: 4,
        minorVersion: null,
        provider: 'openai',
      });
    });

    it('should handle uppercase GPT model', () => {
      const result = parseModelString('GPT-5.3-CODEX');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('openai');
      expect(result?.majorVersion).toBe(5);
      expect(result?.minorVersion).toBe(3);
    });
  });

  describe('getModelColorClass', () => {
    it('should return color for opus', () => {
      expect(getModelColorClass('opus')).toBe('text-zinc-400');
    });

    it('should return color for sonnet', () => {
      expect(getModelColorClass('sonnet')).toBe('text-zinc-400');
    });

    it('should return color for haiku', () => {
      expect(getModelColorClass('haiku')).toBe('text-zinc-400');
    });

    it('should return green for gpt families', () => {
      expect(getModelColorClass('gpt-5')).toBe('text-emerald-400');
      expect(getModelColorClass('gpt-5-codex')).toBe('text-emerald-400');
      expect(getModelColorClass('gpt-4')).toBe('text-emerald-400');
    });

    it('should return default color for unknown family', () => {
      expect(getModelColorClass('unknown')).toBe('text-zinc-500');
    });

    it('should return default color for arbitrary string', () => {
      expect(getModelColorClass('newmodel')).toBe('text-zinc-500');
    });
  });
});
