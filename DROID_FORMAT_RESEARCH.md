# Droid/Factory JSONL Format Research Summary

## Found Locations & Data

### System Locations
- **Factory sessions**: `~/.factory/sessions/` (587 total .jsonl files across projects)
- **Sample session directory**: `/Users/username/.factory/sessions/-Users-username-workspace-droid-devtools/`
  - Contains multiple `.jsonl` files (session records)
  - Each paired with `.settings.json` (session metadata)
- **Example file**: `9252660f-001f-4aaf-8e6f-4811c456a372.jsonl` (44KB, ~100+ entries)

### Existing Project Support
This project already reads from Claude Code format in `~/.claude/`. Phase 1 changed paths to `~/.factory/`.
Key files tracking paths:
- `src/main/utils/pathDecoder.ts` — path constants (now using `.factory`)
- `src/main/types/jsonl.ts` — JSONL entry type definitions (currently Claude format only)
- `src/main/services/parsing/SessionParser.ts` — JSONL parsing logic

---

## JSONL Format Differences

### Claude Code Format (Current)
```typescript
// Flat message entries - no wrapper
{
  "type": "user",                    // or "assistant", "system"
  "role": "user",                    // Direct on entry
  "content": [...],                  // Direct on entry
  "uuid": "...",
  // + many conversational fields (parentUuid, isSidechain, cwd, gitBranch, sessionId, version, userType)
}
```

**Entry Types**: `user`, `assistant`, `system`, `summary`, `file-history-snapshot`, `queue-operation`

### Droid/Factory Format (New)
```typescript
// Three main entry types:

// 1. SESSION START - Explicit session metadata
{
  "type": "session_start",
  "id": "9252660f-001f-4aaf-8e6f-4811c456a372",
  "title": "# Worker Brief: project-scaffold ...",
  "sessionTitle": "# Worker Brief: project-scaffold ...",
  "owner": "cana",
  "version": 2,
  "cwd": "/Users/username/workspace/droid-devtools"
}

// 2. MESSAGE - Wrapped in .message field
{
  "type": "message",
  "id": "ff94d87a-4161-4c61-bcd0-a3e09d39968a",      // UUID of THIS message
  "timestamp": "2026-04-05T13:49:09.991Z",           // ISO timestamp
  "message": {                                         // WRAPPER
    "role": "user",                                    // or "assistant"
    "content": [
      {
        "type": "text",
        "text": "..."
      },
      {
        "type": "text",
        "text": "..."
      }
    ]
  }
}

// 3. TODO STATE - Inline todo tracking (no separate todo files)
{
  "type": "todo_state",
  "id": "09c39469-8db8-4f92-8bfe-b803b393c747",
  "timestamp": "2026-04-05T13:49:19.894Z",
  "todos": {
    "todos": "1. [in_progress] Review current project files...\n2. [pending] ..."
  },
  "messageIndex": 1                                    // Links to message position
}
```

**Entry Types**: `session_start`, `message`, `todo_state` (+ potentially others)

---

## Session Settings File (NEW)

Each session has a `.settings.json` file with metadata:

**File**: `~/.factory/sessions/{encoded_path}/{sessionId}.settings.json`

**Contents**:
```json
{
  "assistantActiveTimeMs": 0,
  "model": "gpt-5.3-codex",                    // Model used
  "reasoningEffort": "medium",                 // Thinking level
  "interactionMode": "auto",
  "autonomyLevel": "high",                     // Droid autonomy: off|light|medium|high
  "autonomyMode": "auto-high",
  "specModeModel": "claude-opus-4-6",          // Fallback model
  "specModeReasoningEffort": "high",
  "tags": [
    { "name": "exec" },                        // Session tags
    // ... more tags
  ],
  "providerLock": "openai",                    // API provider
  "providerLockTimestamp": "2026-04-05T13:49:09.933Z",
  "apiProviderLock": "openai",
  "tokenUsage": {                              // Aggregated tokens for session
    "inputTokens": 13201,
    "outputTokens": 632,
    "cacheCreationTokens": 0,
    "cacheReadTokens": 0,
    "thinkingTokens": 347                      // NEW: Extended thinking tokens
  }
}
```

**Key differences from Claude Code**:
- `autonomyLevel` field (Droid-specific)
- `specModeModel` — fallback model configuration
- `tokenUsage` with `thinkingTokens` (Claude Code doesn't track thinking separately)
- `providerLock` — locks to specific API provider
- `tags` — session categorization

---

## Parsing Strategy for Phase 2

### 1. **Update Type Definitions** (`src/main/types/jsonl.ts`)
Add new entry types:
```typescript
type EntryType = 'user' | 'assistant' | ... | 'session_start' | 'message' | 'todo_state';

interface DroidMessageEntry {
  type: 'message';
  id: string;                    // Message UUID
  timestamp: string;             // ISO timestamp
  message: {                      // Wrapper
    role: 'user' | 'assistant';
    content: ContentBlock[];      // Same as Claude Code
  };
}

interface SessionStartEntry {
  type: 'session_start';
  id: string;                    // Session UUID
  title: string;                 // Raw title (may include markdown)
  sessionTitle: string;          // Display title
  owner: string;                 // Session owner
  cwd: string;                   // Working directory (authoritative)
  version: 2;
}

interface TodoStateEntry {
  type: 'todo_state';
  id: string;
  timestamp: string;
  todos: {
    todos: string;               // Markdown-formatted todo list
  };
  messageIndex: number;          // Position in conversation
}
```

### 2. **Unwrap in SessionParser** (`src/main/services/parsing/SessionParser.ts`)
In `parseJsonlLine()`:
```typescript
function parseJsonlLine(line: string): ChatHistoryEntry | null {
  const entry = JSON.parse(line);
  
  if (entry.type === 'message') {
    // Unwrap the message field
    const unwrapped = entry.message;
    // Use entry.id as message UUID
    // Use entry.timestamp directly
    return {
      type: unwrapped.role,  // 'user' or 'assistant'
      uuid: entry.id,
      timestamp: entry.timestamp,
      message: unwrapped,
      // ... propagate other conversational fields from wrapper if present
    };
  }
  
  if (entry.type === 'session_start') {
    // Might not need chunk representation, but extract metadata
    // Return null to skip, or create a SystemEntry
  }
  
  if (entry.type === 'todo_state') {
    // Store separately for todo context panel
    return null;
  }
  
  // ... handle other types
}
```

### 3. **Load Settings File** (NEW: `src/main/services/parsing/SessionSettingsReader.ts`)
```typescript
class SessionSettingsReader {
  async readSettings(sessionPath: string): Promise<DroidSessionSettings | null> {
    // Read {sessionId}.settings.json from same directory as .jsonl
    const settingsPath = sessionPath.replace('.jsonl', '.settings.json');
    // Parse and return with type safety
  }
}
```

Integrate into session loading:
- Load `.settings.json` when reading session JSONL
- Merge token data into `SessionMetrics`
- Surface `autonomyLevel`, `model`, `tags` to UI

### 4. **Extract CWD from Session Start**
In `extractCwd()`:
- **First check**: Look for `session_start` entry — if found, use its `cwd` field (authoritative)
- **Fallback**: Look for first user message content (existing logic)

### 5. **Token Metrics from Settings**
In `calculateMetrics()`:
- Use `.settings.json` `tokenUsage` as source of truth for total tokens
- May differ from per-message usage blocks (settings is aggregated)
- Include `thinkingTokens` in metrics (Phase 5 feature)

---

## Content Block Structure (SAME)

Good news: Inside the unwrapped `.message.content[]`, the structure is identical to Claude Code:
- `TextContent`: `{ type: 'text', text: string }`
- `ThinkingContent`: `{ type: 'thinking', thinking: string, signature: string }`
- `ToolUseContent`: `{ type: 'tool_use', id: string, name: string, input: Record }`
- `ToolResultContent`: `{ type: 'tool_result', tool_use_id: string, content: string | ContentBlock[] }`
- `ImageContent`: `{ type: 'image', source: { type: 'base64', media_type, data } }`

No changes needed to content block parsing — they're already generic.

---

## Test Data Available

### Location
- `~/.factory/sessions/-Users-username-workspace-droid-devtools/` — test fixtures with actual Droid format
  - Multiple `.jsonl` files (different session histories)
  - Each has paired `.settings.json`

### Example Entry Sequence
```
1. session_start       { type: "session_start", id, title, owner, cwd, version }
2. message (user)      { type: "message", id, timestamp, message: { role: "user", content: [...] } }
3. message (assistant) { type: "message", id, timestamp, message: { role: "assistant", content: [...] } }
4. todo_state          { type: "todo_state", id, timestamp, todos, messageIndex }
5. message (user)      { type: "message", ... }
...
```

### File Stats
- Sample file: `9252660f-001f-4aaf-8e6f-4811c456a372.jsonl` (44KB)
- Contains ~100+ entries
- Parseable JSON (one entry per line)

---

## Key Takeaways for Phase 2

1. **Message wrapper is the main challenge**: Every message is `{ type: "message", id, timestamp, message: {...} }` instead of flat.
2. **Session metadata is now explicit**: `session_start` entry provides authoritative `cwd`, `title`, `owner`.
3. **Settings file is required**: `.settings.json` contains token totals, model info, autonomy level, and thinking tokens.
4. **Todo tracking moved inline**: No separate `~/.factory/todos/` directory; todos are `todo_state` entries in the JSONL.
5. **Content blocks are unchanged**: Tool use, thinking, text, etc. have the same structure inside unwrapped messages.
6. **Provider diversity**: Model field is now arbitrary (gpt-5.3-codex, claude-opus-4-6, etc.) — not just Claude.

---

## Files Needing Changes (Phase 2)

| Priority | File | Change | Complexity |
|----------|------|--------|-----------|
| 1 | `src/main/types/jsonl.ts` | Add `DroidMessageEntry`, `SessionStartEntry`, `TodoStateEntry` types | Medium |
| 2 | `src/main/services/parsing/SessionParser.ts` | Unwrap `type: "message"` entries; handle `session_start` | High |
| 3 | `src/main/services/parsing/SessionSettingsReader.ts` | **NEW** — Read `.settings.json` files | Medium |
| 4 | `src/main/utils/jsonl.ts` | Update `parseJsonlFile()`, `extractCwd()`, `calculateMetrics()` | Medium |
| 5 | `src/main/services/parsing/MessageClassifier.ts` | Verify works with unwrapped messages | Low |
| 6 | `src/main/services/analysis/ChunkBuilder.ts` | Verify works with unwrapped messages | Low |

---

## Verification Checklist

After Phase 2 implementation:

- [ ] `pnpm typecheck` — no type errors from new types
- [ ] `pnpm test:chunks` — chunk building tests pass with Droid format
- [ ] Load real Droid session from `~/.factory/sessions/` — messages render correctly
- [ ] `session_start` entry provides correct `cwd` in session detail
- [ ] Token metrics from `.settings.json` appear in session summary
- [ ] Model field (gpt-5.3-codex) displays without errors
- [ ] Todo state entries are captured (for future todo panel)

