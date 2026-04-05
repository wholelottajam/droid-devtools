# Droid/Factory JSONL Format Research - Complete Documentation

## Overview

This research documents the **Droid/Factory CLI session format** — a completely different format from Claude Code's JSONL. The goal of **Phase 2** is to adapt the parser to read Droid format while maintaining all visualization features.

## Documents

### 1. DROID_FORMAT_RESEARCH.md (11KB)
**Comprehensive reference** covering:
- Found data locations (~/.factory/sessions/)
- JSONL format differences (flat vs wrapped)
- Session settings file structure (.settings.json)
- Parsing strategy with code samples
- Content block structure (unchanged)
- Test data availability
- Files needing changes with priority
- Verification checklist

**Best for**: Deep understanding of the format, architectural decisions, implementation strategy.

### 2. PHASE2_QUICK_REFERENCE.md (6.8KB)
**Developer quick reference** covering:
- Problem statement (what changed)
- Entry types with JSON examples (session_start, message, todo_state)
- Settings file key fields
- Implementation checklist (5 major tasks)
- Test data inspection commands
- Risk areas to watch
- Files modified list with impact levels
- Estimated effort

**Best for**: Developers implementing Phase 2, quick lookup, checklists.

---

## Key Findings

### 1. Format Difference
**Claude Code** (flat, current):
```json
{ "type": "user", "role": "user", "content": [...], "uuid": "...", ... }
```

**Droid** (wrapped, target):
```json
{ "type": "message", "id": "...", "timestamp": "...", "message": { "role": "user", "content": [...] } }
```

### 2. New Entry Types
- `session_start` — authoritative session metadata (cwd, title, owner, version)
- `message` — wrapped messages with explicit timestamps
- `todo_state` — inline todo tracking (no separate todo files)

### 3. New Metadata File
Each session has `{sessionId}.settings.json` with:
- Model name and provider (e.g., gpt-5.3-codex, claude-opus-4-6)
- Autonomy level (off/light/medium/high)
- Tags and provider lock
- Aggregated token usage with **thinkingTokens** (new)

### 4. Test Data
587 Droid JSONL files available in `~/.factory/sessions/`:
- **Sample**: `~/.factory/sessions/-Users-cana-workspace-droid-devtools/`
- **Example file**: `9252660f-001f-4aaf-8e6f-4811c456a372.jsonl` (44KB, 100+ entries)
- **Paired settings**: `9252660f-001f-4aaf-8e6f-4811c456a372.settings.json`
- Ready for testing and verification

---

## Phase 2 Impact

### Major Changes
1. **Message unwrapping** — Every parsed message must extract `.id`, `.timestamp`, unwrap `.message` field
2. **Session metadata** — Extract authoritative `cwd`/title from `session_start` entry (not content)
3. **Settings integration** — Load `.settings.json` for token metrics, model, autonomy level
4. **Todo tracking** — Capture `todo_state` entries for future UI

### Files Affected
```
src/main/types/jsonl.ts                          [Major] - Add 3 new entry types
src/main/services/parsing/SessionParser.ts       [Major] - Unwrap messages
src/main/services/parsing/SessionSettingsReader.ts [New] - Load .settings.json
src/main/utils/jsonl.ts                          [Major] - Update CWD/metrics extraction
src/main/services/parsing/MessageClassifier.ts   [Verify] - Should work as-is
src/main/services/analysis/ChunkBuilder.ts       [Verify] - Should work as-is
```

### Estimated Effort
**~10-13 hours** (medium complexity)
- Types + Settings Reader: 2-3h
- SessionParser unwrapping: 3-4h
- JSONL utilities: 2-3h
- Testing + integration: 2-3h

---

## Research Quality Notes

### Data Validation
- Used actual Droid session files from `~/.factory/sessions/`
- Cross-referenced with existing Claude Code JSONL types
- Verified entry structure with `jq` parsing
- Found 5+ different projects with real Droid data

### Coverage
- Entry types: session_start, message, todo_state (confirmed)
- Settings fields: model, autonomyLevel, tags, tokenUsage, providerLock (all validated)
- Content blocks: All unchanged from Claude Code format
- Test data: 587 sessions across 10+ projects (high confidence)

### Gaps (Future Verification)
- Other entry types may exist (rare edge cases not in samples)
- Message conversational fields may vary by Droid version
- Settings file fields may evolve (only saw v1 format in samples)

---

## Quick Start for Developers

1. **Read PHASE2_QUICK_REFERENCE.md** — Get the checklist and entry types
2. **Review sample data** (commands in reference):
   ```bash
   head -5 ~/.factory/sessions/-Users-cana-workspace-droid-devtools/9252660f-001f-4aaf-8e6f-4811c456a372.jsonl | jq '.'
   cat ~/.factory/sessions/-Users-cana-workspace-droid-devtools/9252660f-001f-4aaf-8e6f-4811c456a372.settings.json | jq '.'
   ```
3. **Start with types** — Add DroidMessageEntry, SessionStartEntry, TodoStateEntry to jsonl.ts
4. **Implement SessionSettingsReader** — New class for loading .settings.json
5. **Update SessionParser** — Add unwrapping logic in parseJsonlLine()
6. **Refactor JSONL utilities** — Update CWD extraction and metrics calculation
7. **Test against real data** — Use sessions from ~/.factory/sessions/

---

## Files in This Documentation

| File | Size | Content | Audience |
|------|------|---------|----------|
| DROID_FORMAT_RESEARCH.md | 11KB | Complete reference with code samples | Architects, tech leads, reference |
| PHASE2_QUICK_REFERENCE.md | 6.8KB | Checklists, entry types, quick lookup | Developers implementing Phase 2 |
| This file (RESEARCH_INDEX.md) | 2KB | Navigation, summary, quick start | Everyone |

---

## Next Steps (Phase 2 Implementation)

1. **Planning** — Review both documents, estimate story points
2. **Type definition** — Add new entry types (straightforward)
3. **Settings reader** — Create new service (straightforward)
4. **Parser unwrapping** — Update SessionParser (high complexity, most risk)
5. **Utilities refactor** — Update CWD/metrics logic (straightforward)
6. **Integration testing** — Load real Droid sessions, verify rendering
7. **Verification** — Run `pnpm test:chunks`, manual smoke tests

---

## Reference Links

- **PRD.md** — Project requirements and phase breakdown (in repo root)
- **src/main/types/jsonl.ts** — Current JSONL type definitions
- **src/main/services/parsing/SessionParser.ts** — Current parsing logic
- **~/.factory/sessions/** — Live test data (587 JSONL files)

