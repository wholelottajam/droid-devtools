# PRD: Adapt claude-devtools to droid-devtools for Droid/Factory CLI

## Status Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Core Path & Config | DONE (2026-04-05) | All `.claude` → `.factory`, `projects` → `sessions`, types renamed |
| Phase 2: JSONL Parser | DONE (2026-04-05) | Unwrapping, session_start, settings reader, tests |
| Phase 3: Branding | DONE (2026-04-05) | CLAUDE.md→AGENTS.md, ClaudeMd→AgentsMd types, UI strings, package.json |
| Phase 4: Droid UI Features | NOT STARTED | Independent — next up |
| Phase 5-Basic: Token Analysis Foundations | NOT STARTED | Depends on Phase 2 |
| Phase 5-Advanced: Token Analysis UI | NOT STARTED | Depends on Phase 5-Basic |

---

## Context

This is a forked Electron app (claude-devtools, MIT) that visualizes Claude Code session logs. We're adapting it to read Droid/Factory CLI session data from `~/.factory/` instead of `~/.claude/`. The goal is a **Droid-only** fork — no backward compatibility with Claude Code needed.

### Critical Structural Differences Discovered

| Aspect | Claude Code | Droid |
|--------|------------|-------|
| Base path | `~/.claude/` | `~/.factory/` |
| Sessions | `~/.claude/projects/{encoded}/` | `~/.factory/sessions/{encoded}/` |
| JSONL wrapper | Flat: `{type: "user", role: "user", content: ...}` | Wrapped: `{type: "message", id, timestamp, message: {role, content}}` |
| Session start | First system message | Explicit `{type: "session_start", id, title, owner, cwd}` entry |
| Session settings | Inline in JSONL | Separate `{uuid}.settings.json` files |
| Todos | `~/.claude/todos/{sessionId}.json` | Inline (no separate todo dir found) |
| Agent configs | `CLAUDE.md` + `.claude/agents/` | `AGENTS.md` + `~/.factory/droids/` |
| Config file | `~/.claude/claude-devtools-config.json` | `~/.factory/droid-devtools-config.json` |
| Session index | None (scans filesystem) | `~/.factory/sessions-index.json` |
| Missions | N/A | `~/.factory/missions/{uuid}/` (orchestrator + workers) |
| Settings per session | N/A | `.settings.json` with autonomyLevel, model, provider, tags |

**The JSONL wrapper difference is the most impactful change** — every message is wrapped in `{type: "message", message: {...}}` instead of being flat.

---

## Phase 1: Core Path & Config Adaptation

**Goal**: App reads from `~/.factory/sessions/` and stores config in `~/.factory/`.

### 1A. Path Constants
**File**: `src/main/utils/pathDecoder.ts`
- Line 259: `'.claude'` -> `'.factory'`
- Line 321: `'projects'` -> `'sessions'`
- Line 328: `'todos'` -> remove or point to a no-op (Droid has no separate todos dir)
- Rename exports: `getClaudeBasePath` -> `getFactoryBasePath`, `setClaudeBasePathOverride` -> `setFactoryBasePathOverride`, `getAutoDetectedClaudeBasePath` -> `getAutoDetectedFactoryBasePath`
- Update all consumers of these functions (grep for them)

### 1B. Config Manager
**File**: `src/main/services/infrastructure/ConfigManager.ts`
- Line 26: `'.claude'` -> `'.factory'`
- Line 27: `'claude-devtools-config.json'` -> `'droid-devtools-config.json'`

### 1C. Notification Manager
**File**: `src/main/services/infrastructure/NotificationManager.ts`
- Line 80: Update notification storage path to `~/.factory/droid-devtools-notifications.json`

### 1D. SSH Connection Manager
**File**: `src/main/services/infrastructure/SshConnectionManager.ts`
- Lines 433-451: All remote path candidates change from `.claude/projects` -> `.factory/sessions`

### 1E. IPC Config (WSL paths)
**File**: `src/main/ipc/config.ts`
- Lines 923-947: WSL path resolution — `.claude` -> `.factory`, `projects` -> `sessions`

### 1F. Shared API Types
**File**: `src/shared/types/api.ts`
- Rename `ClaudeRootInfo` -> `FactoryRootInfo`
- Rename `ClaudeRootFolderSelection` -> `FactoryRootFolderSelection`
- Rename `WslClaudeRootCandidate` -> `WslFactoryRootCandidate`
- Update all consumers

### 1G. Tests
- `test/main/utils/pathDecoder.test.ts` — update all path expectations
- `test/main/ipc/configValidation.test.ts` — update path refs
- `test/mocks/electronAPI.ts` — update mock paths

### Verification
```bash
pnpm typecheck         # No type errors from path renames
pnpm test              # Existing tests pass with new paths
pnpm dev               # App starts, scans ~/.factory/sessions/
```

---

## Phase 2: JSONL Parser Adaptation

**Goal**: Parse Droid's wrapped message format and extract session metadata from `.settings.json` files.

### 2A. JSONL Types — Unwrap Message Format
**File**: `src/main/types/jsonl.ts`

Current Claude Code format expects flat entries:
```typescript
// Claude: { type: "user", role: "user", content: [...] }
```

Droid wraps messages:
```typescript
// Droid: { type: "message", id: "uuid", timestamp: "ISO", message: { role: "user", content: [...] } }
```

Changes:
- Add `'message'` and `'session_start'` to `EntryType`
- Add `DroidMessageEntry` interface with `id`, `timestamp`, `message` wrapper
- Add `SessionStartEntry` interface with `id`, `title`, `owner`, `cwd`, `version`
- Update `ChatHistoryEntry` union type

### 2B. Session Parser — Unwrap Logic
**File**: `src/main/services/parsing/SessionParser.ts`

Changes:
- In `parseJsonlLine()` / `parseChatHistoryEntry()`: detect `type: "message"` entries and unwrap `entry.message` to get the actual role/content
- Extract `entry.id` as the message UUID (instead of generating one)
- Extract `entry.timestamp` directly (instead of inferring from content)
- Handle `type: "session_start"` to extract `cwd`, `title`, `owner`

### 2C. Session Settings Reader (NEW)
**New file**: `src/main/services/parsing/SessionSettingsReader.ts`

Reads `{sessionId}.settings.json` alongside the JSONL file:
```typescript
interface DroidSessionSettings {
  assistantActiveTimeMs: number;
  model: string;
  reasoningEffort: string;
  interactionMode: string;
  autonomyLevel: 'off' | 'light' | 'medium' | 'high';
  autonomyMode: string;
  specModeModel?: string;
  specModeReasoningEffort?: string;
  tags: Array<{ name: string }>;
  providerLock?: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    thinkingTokens: number;
  };
}
```

- Read settings file at session load time
- Merge settings into `SessionDetail` / `SessionMetrics`
- Surface `autonomyLevel`, `model`, `tags` in UI

### 2D. JSONL Utilities
**File**: `src/main/utils/jsonl.ts`

- Update `parseJsonlFile()` to handle the unwrapping
- Update `extractCwd()` to look for `session_start` entry first (authoritative), fall back to first user message
- Update `calculateMetrics()` — token data may come from `.settings.json` instead of per-message usage blocks

### 2E. Tool Extraction
**File**: `src/main/utils/toolExtraction.ts`

- Verify tool_use/tool_result blocks are in the same format inside the unwrapped message
- The tool names appear to be the same (TodoWrite, Read, Bash, etc.) — just confirm and adapt if needed

### 2F. Session Index Integration (Optional Enhancement)
**File**: `src/main/services/discovery/ProjectScanner.ts`

Droid provides `~/.factory/sessions-index.json` with pre-indexed session metadata (title, cwd, message count, mtime). This could replace or supplement filesystem scanning for faster startup.

### Verification
```bash
pnpm test:chunks       # Chunk building still works
pnpm test:semantic     # Semantic steps extracted correctly
```
- Load a real Droid session -> verify messages render correctly
- Check that `session_start` entry provides correct cwd/title
- Verify token metrics from `.settings.json` appear in session summary

---

## Phase 3: Branding — Claude to Droid

**Goal**: Eliminate all user-visible "Claude" references.

### 3A. Tailwind Config
**File**: `tailwind.config.js`
- Rename `'claude-dark'` key -> `'droid-dark'`

### 3B. CSS Class References (bulk find-replace)
Files using `bg-claude-dark-*`, `text-claude-dark-*`:
- `src/renderer/components/layout/TabbedLayout.tsx`
- `src/renderer/components/layout/SessionTabContent.tsx`
- `src/renderer/components/common/ErrorBoundary.tsx`
- `src/renderer/components/chat/DisplayItemList.tsx`
- Any others found via grep

### 3C. CLAUDE.md to AGENTS.md Rename Chain

**Renames** (file + all internal types/constants):
| Old File | New File |
|----------|----------|
| `src/renderer/types/claudeMd.ts` | `src/renderer/types/agentsMd.ts` |
| `src/renderer/utils/claudeMdTracker.ts` | `src/renderer/utils/agentsMdTracker.ts` |
| `src/main/services/parsing/ClaudeMdReader.ts` | `src/main/services/parsing/AgentsMdReader.ts` |
| `SessionContextPanel/components/ClaudeMdFilesSection.tsx` | `AgentsMdFilesSection.tsx` |
| `SessionContextPanel/components/ClaudeMdSection.tsx` | `AgentsMdSection.tsx` |
| `SessionContextPanel/items/ClaudeMdItem.tsx` | `AgentsMdItem.tsx` |

**Type renames**: `ClaudeMdSource` -> `AgentsMdSource`, `ClaudeMdInjection` -> `AgentsMdInjection`, `ClaudeMdStats` -> `AgentsMdStats`, `CLAUDE_MD_FILENAME` -> `AGENTS_MD_FILENAME` (value: `'AGENTS.md'`)

**Path change in AgentConfigReader**: `.claude/agents/` -> `.factory/droids/`

**Import updates** in all consumers (~15 files across renderer components, utils, store slices).

### 3D. Settings UI Text
- `GeneralSection.tsx`: "Local Claude Root" -> "Local Factory Root", all `claudeRoot*` vars -> `factoryRoot*`
- `ConnectionSection.tsx`: "Claude Code sessions" -> "Droid sessions"
- `AdvancedSection.tsx`: description text update

### 3E. IPC Channel Renames
- `ipcChannels.ts`: `CONFIG_SELECT_CLAUDE_ROOT_FOLDER` -> `CONFIG_SELECT_FACTORY_ROOT_FOLDER`, etc.
- `preload/index.ts`: Update exposed API method names
- Main-side IPC handlers: Update to match

### 3F. Package Metadata
**File**: `package.json`
- `name`: `"droid-devtools"`
- `description`: Update for Droid
- URLs: Update to correct repo

### Verification
```bash
grep -ri "claude" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```
- Confirm no remaining "Claude" references in source
- Visual check: no "Claude" text in running app
- `pnpm typecheck` passes after all renames

---

## Phase 4: Droid-Specific UI Features

**Goal**: Surface Droid-unique capabilities in the UI.

### 4A. Session Settings Badge
Show session-level metadata from `.settings.json` in the session header:
- Model name + provider (e.g., "gpt-5.3-codex via OpenAI")
- Autonomy level badge (off/light/medium/high)
- Session tags (e.g., "exec")
- Reasoning effort level

**Integration**: `src/renderer/components/chat/` — add to session header area.

### 4B. Droid Agent Viewer
Show custom droids from `~/.factory/droids/` in a sidebar section:
- List droid names with descriptions (from YAML frontmatter)
- Link to sessions that used each droid

**New file**: `src/renderer/components/sidebar/DroidList.tsx`

### 4C. Mission Control Panel (Future Phase)
**Files**: `src/renderer/components/dashboard/MissionControlView.tsx`
- Read `~/.factory/missions/` directory
- Show mission state, worker sessions, feature progress
- Link worker sessions to session viewer

This is a larger feature and should be a separate PR.

### Verification
- Verify autonomy badge shows correct level per session
- Verify droid list shows agents from `~/.factory/droids/`

---

## Phase 5: Token Efficiency Analysis

**Goal**: Help users understand token usage patterns, cache efficiency, and compare models — all in token units (no dollar costs, since the team sees token usage not billing).

### Foundation: What Already Exists
- `SessionMetrics` in `src/main/types/domain.ts:120-134` — tracks inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens per session
- `TokenUsageDisplay` in `src/renderer/components/common/TokenUsageDisplay.tsx` — hover popover with per-turn breakdown
- `modelParser.ts` in `src/shared/utils/` — parses Claude model strings only (rejects non-Claude models)
- `modelExtractor.ts` in `src/renderer/utils/` — extracts model-per-turn from semantic steps
- `costUsd` field exists in `SessionMetrics` but is hardcoded to `0` (`src/main/utils/jsonl.ts:274`)

### 5A. Extend Model Parser for Multi-Provider
**File**: `src/shared/utils/modelParser.ts`

Currently rejects anything not starting with "claude". Droid uses multiple providers:
- `gpt-5.3-codex`, `gpt-5.4` (OpenAI)
- `claude-sonnet-4-6`, `claude-opus-4-6` (Anthropic)
- Future: Gemini, etc.

Changes:
- Remove the `if (!normalized.startsWith('claude'))` guard
- Add parsing for OpenAI format: `gpt-{version}[-variant]` -> `ModelInfo { name: "gpt-5.3-codex", family: "gpt", majorVersion: 5, minorVersion: 3 }`
- Add a `provider` field to `ModelInfo`: `'anthropic' | 'openai' | 'google' | 'unknown'`
- Keep existing Claude parsing intact, add branches for other formats
- Update `getModelColorClass()` with distinct colors per provider (not just per family)

### 5B. Token Weight Multipliers
**New file**: `src/shared/constants/modelWeights.ts`

Relative token "weight" per model — not dollar cost, but a normalized multiplier reflecting relative expense. This lets us say "opus tokens are 5x heavier than haiku tokens" without tracking actual pricing.

```typescript
// Relative weight: 1.0 = baseline (e.g., claude-sonnet-4)
const MODEL_WEIGHTS: Record<string, { input: number; output: number; cached: number }> = {
  // Anthropic
  'opus':     { input: 5.0,  output: 5.0,  cached: 0.5 },
  'sonnet':   { input: 1.0,  output: 1.0,  cached: 0.1 },
  'haiku':    { input: 0.25, output: 0.25, cached: 0.03 },
  // OpenAI (approximate relative to sonnet baseline)
  'gpt-5':    { input: 3.0,  output: 3.0,  cached: 0.3 },
  'gpt-5-codex': { input: 2.0, output: 2.0, cached: 0.2 },
  // Fallback
  'default':  { input: 1.0,  output: 1.0,  cached: 0.1 },
};
```

- Weights are user-editable via config (stored in `droid-devtools-config.json`)
- Used for "weighted token" calculations and what-if comparisons
- Lookup by model family string from the extended `ModelInfo`

### 5C. Cache Efficiency Score
**New file**: `src/main/utils/tokenAnalysis.ts`

Calculate per-session and per-turn cache efficiency:

```typescript
interface TokenEfficiency {
  cacheHitRate: number;        // cacheRead / (cacheRead + freshInput), 0-1
  totalWeightedTokens: number; // tokens * model weight multiplier
  thinkingRatio: number;       // thinkingTokens / totalOutput (from .settings.json)
  turnsCount: number;
}
```

- `cacheHitRate` = `cacheReadTokens / (cacheReadTokens + inputTokens)` — higher is better
- Expose as a percentage badge on sessions (e.g., "87% cache hit")
- Color-code: green (>70%), yellow (40-70%), red (<40%)

### 5D. What-If Model Comparison
**New file**: `src/renderer/components/chat/TokenAnalysisPanel.tsx`

Given a session's actual token usage, show what the "weighted token cost" would be with different models:

```
This session: gpt-5.3-codex
  Input: 34,045 tokens x 2.0 weight = 68,090 weighted
  Output: 12,641 tokens x 2.0 weight = 25,282 weighted
  Cache: 784,768 tokens x 0.2 weight = 156,954 weighted
  Total weighted: 250,326

What if claude-sonnet-4-6?
  Input: 34,045 x 1.0 = 34,045 weighted
  Output: 12,641 x 1.0 = 12,641 weighted
  Cache: 784,768 x 0.1 = 78,477 weighted
  Total weighted: 125,163  (50% lighter)

What if claude-haiku-4-5?
  Total weighted: 31,291  (88% lighter)
```

This is a simple panel — it takes the actual token counts and applies different weight multipliers. No prediction of "would haiku use more turns" — just raw multiplier comparison.

- Dropdown to select comparison model
- Bar chart showing side-by-side weighted tokens
- Percentage savings/increase indicator

### 5E. Project Token Trends
**New file**: `src/renderer/components/dashboard/TokenTrendsView.tsx`

Per-project view showing token usage over time:

- **Line chart**: total tokens per session over time (x-axis = date, y-axis = tokens)
- **Stacked bar**: breakdown by category (input, output, cache read, cache write) per session
- **Model usage pie**: which models were used across sessions, weighted by token volume
- **Cache efficiency trend**: cache hit rate over time (are you getting better at caching?)
- **Average tokens per turn**: are sessions becoming more/less efficient?

Data source: iterate `SessionMetrics` for all sessions in the project. Supplement with `.settings.json` data for model/provider info.

**Integration**: Add as a new tab/view alongside the existing dashboard. Accessible from sidebar or session list header.

### 5F. Session Summary Enhancement
**File**: `src/renderer/components/common/TokenUsageDisplay.tsx`

Extend the existing hover popover to include:
- Cache hit rate percentage
- Weighted token total (using model multiplier)
- Model name + provider badge
- Comparison hint: "2.3x lighter than opus" (relative to heaviest common model)

### 5G. Metrics in Session List
**File**: `src/renderer/components/sidebar/` (session list items)

Add small inline indicators to session list entries:
- Token count badge (compact: "45k")
- Cache efficiency dot (green/yellow/red)
- Model icon/badge

### Phase 5 Priority Split

**5-Basic** (do first): 5A + 5B + 5C + 5F
- These build on existing infrastructure, minimal new UI
- Unblocks everything else

**5-Advanced** (do after basics work): 5D + 5E + 5G
- These are new UI surfaces, can be separate PRs

### Verification

After Phase 5-Basic:
```bash
pnpm test              # Model parser tests pass for all providers
```
- Parse "gpt-5.3-codex" -> correct ModelInfo
- Parse "claude-sonnet-4-6" -> correct ModelInfo
- Cache hit rate calculates correctly (manual check with known session)
- TokenUsageDisplay popover shows cache %, weighted tokens, model badge

After Phase 5-Advanced:
- What-if panel shows comparison for 3+ models with correct math
- Project trends chart renders with real session data
- Session list shows token badges

---

## Execution Order

**Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5-Basic -> Phase 5-Advanced**

Phases 1 and 2 are sequential (2 depends on 1). Phase 3 (branding) can be interleaved with Phase 2 since they touch different files mostly. Phase 4 is independent new features. Phase 5-Basic depends on Phase 2 (needs `.settings.json` data). Phase 5-Advanced depends on 5-Basic.

Within each phase, independent file changes can be parallelized.
