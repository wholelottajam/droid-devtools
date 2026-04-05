import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isDroidMessageEntry,
  isSessionStartEntry,
  type ChatHistoryEntry,
  type DroidMessageEntry,
  type SessionStartEntry,
} from '../../../src/main/types';
import {
  analyzeSessionFileMetadata,
  parseJsonlFile,
  parseJsonlLine,
} from '../../../src/main/utils/jsonl';
import { extractCwd } from '../../../src/main/utils/metadataExtraction';

// =============================================================================
// Test Data Helpers
// =============================================================================

function droidSessionStart(overrides: Partial<SessionStartEntry> = {}): string {
  return JSON.stringify({
    type: 'session_start',
    id: 'session-001',
    title: 'Test session title',
    sessionTitle: 'Test session title',
    owner: 'testuser',
    version: 2,
    cwd: '/Users/testuser/project',
    ...overrides,
  });
}

function droidUserMessage(
  id: string,
  content: string | unknown[],
  overrides: Partial<DroidMessageEntry> = {}
): string {
  return JSON.stringify({
    type: 'message',
    id,
    timestamp: '2026-04-05T12:00:00.000Z',
    message: { role: 'user', content },
    ...overrides,
  });
}

function droidAssistantMessage(
  id: string,
  content: unknown[],
  overrides: Partial<DroidMessageEntry> = {}
): string {
  return JSON.stringify({
    type: 'message',
    id,
    timestamp: '2026-04-05T12:00:05.000Z',
    parentId: 'parent-001',
    message: { role: 'assistant', content },
    ...overrides,
  });
}

function droidTodoState(): string {
  return JSON.stringify({
    type: 'todo_state',
    id: 'todo-001',
    timestamp: '2026-04-05T12:00:03.000Z',
    todos: [{ text: 'Do something', completed: false }],
    messageIndex: 1,
  });
}

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('Droid type guards', () => {
  it('isDroidMessageEntry detects wrapped messages', () => {
    const entry = JSON.parse(droidUserMessage('msg-1', 'Hello')) as ChatHistoryEntry;
    expect(isDroidMessageEntry(entry)).toBe(true);
  });

  it('isDroidMessageEntry rejects Claude flat entries', () => {
    const entry: ChatHistoryEntry = {
      type: 'user',
      uuid: 'test',
      message: { role: 'user', content: 'Hello' },
      parentUuid: null,
      isSidechain: false,
      userType: 'external',
      cwd: '/test',
      sessionId: 'sess-1',
      version: '1',
      gitBranch: 'main',
    } as ChatHistoryEntry;
    expect(isDroidMessageEntry(entry)).toBe(false);
  });

  it('isSessionStartEntry detects session_start', () => {
    const entry = JSON.parse(droidSessionStart()) as ChatHistoryEntry;
    expect(isSessionStartEntry(entry)).toBe(true);
  });

  it('isSessionStartEntry rejects other types', () => {
    const entry = JSON.parse(droidUserMessage('msg-1', 'Hello')) as ChatHistoryEntry;
    expect(isSessionStartEntry(entry)).toBe(false);
  });
});

// =============================================================================
// parseJsonlLine Tests
// =============================================================================

describe('parseJsonlLine with Droid format', () => {
  it('parses a Droid user message with string content', () => {
    const line = droidUserMessage('msg-user-1', 'Hello, how are you?');
    const parsed = parseJsonlLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed!.uuid).toBe('msg-user-1');
    expect(parsed!.type).toBe('user');
    expect(parsed!.role).toBe('user');
    expect(parsed!.content).toBe('Hello, how are you?');
    expect(parsed!.isMeta).toBe(false);
    expect(parsed!.isSidechain).toBe(false);
    expect(parsed!.timestamp).toEqual(new Date('2026-04-05T12:00:00.000Z'));
  });

  it('parses a Droid assistant message with text content', () => {
    const line = droidAssistantMessage('msg-asst-1', [
      { type: 'text', text: 'I can help with that.' },
    ]);
    const parsed = parseJsonlLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed!.uuid).toBe('msg-asst-1');
    expect(parsed!.type).toBe('assistant');
    expect(parsed!.role).toBe('assistant');
    expect(parsed!.parentUuid).toBe('parent-001');
    expect(parsed!.content).toEqual([{ type: 'text', text: 'I can help with that.' }]);
  });

  it('parses a Droid assistant message with tool_use', () => {
    const toolUse = {
      type: 'tool_use',
      id: 'call_abc123',
      name: 'Read',
      input: { file_path: '/test.ts' },
    };
    const line = droidAssistantMessage('msg-asst-2', [toolUse]);
    const parsed = parseJsonlLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed!.toolCalls).toHaveLength(1);
    expect(parsed!.toolCalls[0].name).toBe('Read');
    expect(parsed!.toolCalls[0].id).toBe('call_abc123');
  });

  it('infers isMeta=true for user messages with tool_result content', () => {
    const toolResult = {
      type: 'tool_result',
      tool_use_id: 'call_abc123',
      content: 'File contents here',
    };
    const line = droidUserMessage('msg-user-2', [toolResult]);
    const parsed = parseJsonlLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed!.isMeta).toBe(true);
    expect(parsed!.toolResults).toHaveLength(1);
    expect(parsed!.toolResults[0].toolUseId).toBe('call_abc123');
  });

  it('returns null for session_start entries', () => {
    const line = droidSessionStart();
    const parsed = parseJsonlLine(line);
    expect(parsed).toBeNull();
  });

  it('returns null for todo_state entries', () => {
    const line = droidTodoState();
    const parsed = parseJsonlLine(line);
    expect(parsed).toBeNull();
  });

  it('sets cwd/gitBranch/model to undefined for Droid entries', () => {
    const line = droidUserMessage('msg-1', 'test');
    const parsed = parseJsonlLine(line);

    expect(parsed!.cwd).toBeUndefined();
    expect(parsed!.gitBranch).toBeUndefined();
    expect(parsed!.model).toBeUndefined();
  });
});

// =============================================================================
// File-level parsing tests
// =============================================================================

describe('parseJsonlFile with Droid format', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeJsonl(filename: string, lines: string[]): string {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
    return filePath;
  }

  it('parses a Droid session file, skipping session_start and todo_state', async () => {
    const filePath = writeJsonl('test.jsonl', [
      droidSessionStart(),
      droidUserMessage('msg-1', [{ type: 'text', text: 'Hello' }]),
      droidTodoState(),
      droidAssistantMessage('msg-2', [{ type: 'text', text: 'Hi there' }]),
      droidUserMessage('msg-3', [{ type: 'tool_result', tool_use_id: 'call_1', content: 'done' }]),
    ]);

    const messages = await parseJsonlFile(filePath);

    expect(messages).toHaveLength(3);
    expect(messages[0].uuid).toBe('msg-1');
    expect(messages[0].type).toBe('user');
    expect(messages[0].isMeta).toBe(false);

    expect(messages[1].uuid).toBe('msg-2');
    expect(messages[1].type).toBe('assistant');

    expect(messages[2].uuid).toBe('msg-3');
    expect(messages[2].type).toBe('user');
    expect(messages[2].isMeta).toBe(true);
  });
});

// =============================================================================
// extractCwd with Droid session_start
// =============================================================================

describe('extractCwd with Droid format', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-cwd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts cwd from session_start entry', async () => {
    const filePath = path.join(tmpDir, 'test.jsonl');
    fs.writeFileSync(
      filePath,
      [
        droidSessionStart({ cwd: '/Users/testuser/my-project' }),
        droidUserMessage('msg-1', 'Hello'),
      ].join('\n') + '\n'
    );

    const cwd = await extractCwd(filePath);
    expect(cwd).toBe('/Users/testuser/my-project');
  });
});

// =============================================================================
// analyzeSessionFileMetadata with Droid format
// =============================================================================

describe('analyzeSessionFileMetadata with Droid format', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-meta-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects displayable content in Droid sessions', async () => {
    const filePath = path.join(tmpDir, 'test.jsonl');
    fs.writeFileSync(
      filePath,
      [
        droidSessionStart(),
        droidUserMessage('msg-1', [{ type: 'text', text: 'Build the app' }]),
        droidAssistantMessage('msg-2', [{ type: 'text', text: 'Sure!' }]),
      ].join('\n') + '\n'
    );

    const metadata = await analyzeSessionFileMetadata(filePath);
    expect(metadata.hasDisplayableContent).toBe(true);
    expect(metadata.messageCount).toBeGreaterThan(0);
  });

  it('uses session_start title as fallback for firstUserMessage', async () => {
    const filePath = path.join(tmpDir, 'test.jsonl');
    // Session with only system-reminder user messages (no real user text)
    fs.writeFileSync(
      filePath,
      [
        droidSessionStart({
          title: 'Worker: scaffold project',
          sessionTitle: 'Worker: scaffold project',
        }),
        droidUserMessage('msg-1', [
          { type: 'text', text: '<system-reminder>env info</system-reminder>' },
        ]),
        droidAssistantMessage('msg-2', [{ type: 'text', text: 'Working...' }]),
      ].join('\n') + '\n'
    );

    const metadata = await analyzeSessionFileMetadata(filePath);
    expect(metadata.firstUserMessage).not.toBeNull();
    expect(metadata.firstUserMessage!.text).toBe('Worker: scaffold project');
  });
});
