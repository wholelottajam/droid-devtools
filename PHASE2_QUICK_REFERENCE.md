# Phase 2: JSONL Parser Adaptation - Quick Reference

## Problem Statement
Claude Code JSONL format is **flat**:
```json
{ "type": "user", "role": "user", "content": [...], "uuid": "...", ... }
```

Droid JSONL format is **wrapped**:
```json
{ "type": "message", "id": "...", "timestamp": "...", "message": { "role": "user", "content": [...] } }
```

Every message must be unwrapped, and session metadata moved to explicit `session_start` entry.

---

## Entry Types (Droid Format)

### session_start
```json
{
  "type": "session_start",
  "id": "9252660f-001f-4aaf-8e6f-4811c456a372",
  "title": "# Worker Brief: project-scaffold ...",
  "sessionTitle": "# Worker Brief: project-scaffold ...",
  "owner": "cana",
  "version": 2,
  "cwd": "/Users/cana/workspace/droid-devtools"
}
```
**Use**: Extract authoritative `cwd`, `title`, `owner` at session start.

### message
```json
{
  "type": "message",
  "id": "ff94d87a-4161-4c61-bcd0-a3e09d39968a",
  "timestamp": "2026-04-05T13:49:09.991Z",
  "message": {
    "role": "user",  // or "assistant"
    "content": [
      { "type": "text", "text": "..." },
      { "type": "tool_use", "id": "...", "name": "Read", "input": {...} }
    ]
  }
}
```
**Use**: Unwrap `.message` field to get role/content. Use `.id` as message UUID, `.timestamp` directly.

### todo_state
```json
{
  "type": "todo_state",
  "id": "09c39469-8db8-4f92-8bfe-b803b393c747",
  "timestamp": "2026-04-05T13:49:19.894Z",
  "todos": {
    "todos": "1. [in_progress] Review...\n2. [pending] ..."
  },
  "messageIndex": 1
}
```
**Use**: Store for future todo panel. Not part of chunks; separate context.

---

## Settings File (NEW)

**File**: `{sessionId}.settings.json` (same directory as JSONL)

**Key fields**:
- `model`: "gpt-5.3-codex" (or any provider model)
- `autonomyLevel`: "off" | "light" | "medium" | "high"
- `tags`: [{ "name": "exec" }, ...]
- `providerLock`: "openai" | "anthropic" | ... (API provider)
- `tokenUsage`: { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, thinkingTokens }

**Use**: Merge `tokenUsage` into session metrics. Surface model, autonomyLevel, tags in UI.

---

## Implementation Checklist

### 1. Types (src/main/types/jsonl.ts)
- [ ] Add `'message'`, `'session_start'`, `'todo_state'` to `EntryType`
- [ ] Add `DroidMessageEntry` interface (id, timestamp, message wrapper)
- [ ] Add `SessionStartEntry` interface (id, title, owner, cwd, version)
- [ ] Add `TodoStateEntry` interface (id, timestamp, todos, messageIndex)
- [ ] Update `ChatHistoryEntry` union to include new types
- [ ] Add type guards: `isDroidMessageEntry()`, `isSessionStartEntry()`, `isTodoStateEntry()`

### 2. Session Parser (src/main/services/parsing/SessionParser.ts)
- [ ] Update `parseJsonlLine()` to detect `type: "message"` and unwrap
- [ ] Extract `.id` as message UUID (don't generate new)
- [ ] Extract `.timestamp` directly
- [ ] Return unwrapped message with `type: entry.message.role` (converts "user"/"assistant" to type)
- [ ] Handle `type: "session_start"` — extract and store metadata
- [ ] Handle `type: "todo_state"` — return null (store separately)

### 3. Settings Reader (src/main/services/parsing/SessionSettingsReader.ts) - NEW
- [ ] Create class `SessionSettingsReader`
- [ ] Method: `async readSettings(sessionPath: string): Promise<DroidSessionSettings | null>`
- [ ] Replace `.jsonl` with `.settings.json`
- [ ] Parse JSON with type safety
- [ ] Return null if not found (fallback to JSONL-only parsing)

### 4. JSONL Utilities (src/main/utils/jsonl.ts)
- [ ] Update `extractCwd()`:
  - **First**: Look for `session_start.cwd` (authoritative)
  - **Fallback**: Look in first user message content
- [ ] Update `calculateMetrics()`:
  - **First**: Try loading `.settings.json` tokenUsage (total)
  - **Fallback**: Sum per-message usage blocks
- [ ] Add `thinkingTokens` to metrics (from settings)

### 5. Verification
- [ ] Run `pnpm typecheck` — no errors
- [ ] Run `pnpm test:chunks` — tests pass
- [ ] Load real Droid session manually — check rendering
- [ ] Verify message UUIDs come from `.id` (not generated)
- [ ] Verify timestamps are ISO from `.timestamp`
- [ ] Verify cwd extracted correctly from `session_start`

---

## Test Data Locations

**Sample Droid JSONL files**:
```
~/.factory/sessions/-Users-cana-workspace-droid-devtools/
  9252660f-001f-4aaf-8e6f-4811c456a372.jsonl          (44KB, ~100 entries)
  9252660f-001f-4aaf-8e6f-4811c456a372.settings.json  (metadata)
  
  03316614-c895-4b58-b05d-b90969ffd9bd.jsonl
  03316614-c895-4b58-b05d-b90969ffd9bd.settings.json
  
  ... (more sessions)
```

**To inspect**:
```bash
# Show first 5 entries
head -5 ~/.factory/sessions/-Users-cana-workspace-droid-devtools/9252660f-001f-4aaf-8e6f-4811c456a372.jsonl | jq '.'

# Count entry types
grep -o '"type":"[^"]*"' ~/.factory/sessions/-Users-cana-workspace-droid-devtools/9252660f-001f-4aaf-8e6f-4811c456a372.jsonl | sort | uniq -c

# Read settings
cat ~/.factory/sessions/-Users-cana-workspace-droid-devtools/9252660f-001f-4aaf-8e6f-4811c456a372.settings.json | jq '.'
```

---

## Content Blocks (NO CHANGE)

Inside unwrapped `.message.content[]`, the same as Claude Code:

```typescript
TextContent:       { type: 'text', text: string }
ThinkingContent:   { type: 'thinking', thinking: string, signature: string }
ToolUseContent:    { type: 'tool_use', id: string, name: string, input: Record }
ToolResultContent: { type: 'tool_result', tool_use_id: string, content: string | ContentBlock[] }
ImageContent:      { type: 'image', source: { type: 'base64', media_type, data } }
```

**No updates needed** — parsing already generic.

---

## Risk Areas

1. **Message UUID generation**: Must use `.id` from entry, not generate new. Affects timeline deduplication, tool linking.
2. **Timestamp extraction**: Must use `.timestamp` directly, not infer from content. Affects session duration calc.
3. **CWD extraction**: Must prioritize `session_start.cwd` over content parsing. Affects path resolution.
4. **Settings fallback**: If `.settings.json` missing, app should still work (graceful degradation).
5. **Todo state handling**: Must not create chunks for `todo_state` entries (only metadata storage).

---

## Files Modified (Phase 2)

```
src/main/types/jsonl.ts                                  [Major]
src/main/services/parsing/SessionParser.ts               [Major]
src/main/services/parsing/SessionSettingsReader.ts       [New]
src/main/utils/jsonl.ts                                  [Major]
src/main/services/parsing/MessageClassifier.ts           [Verify]
src/main/services/analysis/ChunkBuilder.ts               [Verify]
```

---

## Estimated Effort

- **Types + SessionSettingsReader**: 2-3 hours (straightforward)
- **SessionParser unwrapping**: 3-4 hours (logic correct but many code paths)
- **JSONL utilities refactor**: 2-3 hours (straightforward)
- **Testing + debugging**: 2-3 hours (integration testing)
- **Total**: ~10-13 hours (medium complexity phase)

