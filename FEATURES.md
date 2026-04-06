# droid-devtools — Feature Overview

> **The CLI tells you nothing. This shows you everything.**
>
> A desktop app that reconstructs exactly what Droid/Factory CLI did — every file path, every tool call, every token — from the raw session logs already on your machine.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Session Replay & Visualization](#session-replay--visualization)
- [Visible Context Tracking](#visible-context-tracking)
- [Token Analysis & Model Comparison](#token-analysis--model-comparison)
- [Model Weight Multipliers](#model-weight-multipliers)
- [Monthly Token Aggregation](#monthly-token-aggregation)
- [Token Efficiency Insights](#token-efficiency-insights)
- [Team & Subagent Visualization](#team--subagent-visualization)
- [Notification & Alert System](#notification--alert-system)
- [Multi-Pane Workspace](#multi-pane-workspace)
- [SSH Remote Sessions](#ssh-remote-sessions)
- [Command Palette & Search](#command-palette--search)
- [Settings & Configuration](#settings--configuration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        droid-devtools                                │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  Main Process │    │   Preload    │    │   Renderer Process    │  │
│  │  (Node.js)    │◄──►│   Bridge     │◄──►│   (React + Zustand)   │  │
│  │               │    │              │    │                       │  │
│  │  • JSONL      │    │  contextBridge│    │  • Chat Timeline     │  │
│  │    Parsing    │    │  • 50+ IPC   │    │  • Token Analysis    │  │
│  │  • File       │    │    channels  │    │  • Context Panel     │  │
│  │    Watching   │    │              │    │  • Multi-Pane Layout  │  │
│  │  • Config     │    └──────────────┘    │  • Settings UI       │  │
│  │  • SSH        │                        │  • Notifications     │  │
│  │  • Analytics  │                        │  • Search            │  │
│  └──────────────┘                        └───────────────────────┘  │
│                                                                     │
│        Data Source: ~/.factory/sessions/{encoded-path}/*.jsonl       │
└─────────────────────────────────────────────────────────────────────┘
```

**Tech Stack:** Electron 28, React 18, TypeScript 5, Tailwind CSS 3, Zustand 4

**Platforms:** macOS (Apple Silicon + Intel), Linux, Windows, Docker

---

## Session Replay & Visualization

Reconstructs the full execution trace from raw JSONL session logs into an interactive timeline.

```
┌─────────────────────────────────────────────────────────────────┐
│  Session Timeline                                                │
│                                                                  │
│  ┌─ UserChunk ─────────────────────────────────────────────────┐ │
│  │  "Fix the auth bug in session.ts"                           │ │
│  │  3:41 PM · 127 tokens                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ AIChunk ───────────────────────────────────────────────────┐ │
│  │  ◆ Thinking (2.1k tokens)                                   │ │
│  │  ├─ Read  src/auth/session.ts  (450 tokens)                 │ │
│  │  ├─ Edit  src/auth/session.ts  line 45  (+3 -1)             │ │
│  │  ├─ Bash  npm test -- auth.test.ts  ✓ passed                │ │
│  │  └─ Text  "Fixed the timeout..."  (89 tokens)               │ │
│  │                                                              │ │
│  │  ⏱ 34s · 8,240 tokens · claude-sonnet-4-6                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ CompactBoundary ───────────────────────────────────────────┐ │
│  │  ⚡ Context compaction: 128k → 42k tokens (-67%)             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**What you see for every session:**

| CLI Shows | droid-devtools Shows |
|-----------|---------------------|
| Final output only | Full thinking + tool chain + output |
| "Read file" | Which file, which lines, how many tokens consumed |
| "Edited file" | Exact diff with added/removed highlighting |
| "Ran command" | Full command + stdout/stderr + exit code |
| Nothing about cost | Per-turn token breakdown by type |
| Nothing about context | Exactly what filled the context window |

**Tool-specific viewers:**
- **Read** — Syntax-highlighted code with line numbers
- **Edit** — Inline diff viewer (green/red highlighting)
- **Bash** — Command + output with error detection
- **Write** — New file content with syntax highlighting
- **Skill** — Slash command invocation and result

---

## Visible Context Tracking

Tracks exactly what consumes tokens in the AI's context window across 6 categories.

```
┌─────────────────────────────────────────────────────────────────┐
│  Context Breakdown (Turn 5)                     Total: 48,230   │
│                                                                  │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  38% of 128k limit  │
│                                                                  │
│  ┌──────────────────┬────────┬────────────────────────────────┐  │
│  │ Category          │ Tokens │ Visual                         │  │
│  ├──────────────────┼────────┼────────────────────────────────┤  │
│  │ AGENTS.md files   │ 12,400 │ ████████████░░░░░░  26%       │  │
│  │ Tool outputs      │ 18,200 │ ██████████████████░  38%      │  │
│  │ User messages     │  3,100 │ ███░░░░░░░░░░░░░░░   6%      │  │
│  │ Mentioned files   │  5,800 │ █████░░░░░░░░░░░░░  12%      │  │
│  │ Thinking text     │  7,400 │ ███████░░░░░░░░░░░  15%      │  │
│  │ Team coordination │  1,330 │ █░░░░░░░░░░░░░░░░░   3%      │  │
│  └──────────────────┴────────┴────────────────────────────────┘  │
│                                                                  │
│  Compactions: 2 · Cache hit rate: 72%                            │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- **ContextBadge** — Per-turn popover showing what entered the context that turn
- **SessionContextPanel** — Full panel view, switchable between "By Category" and "By Size"
- **Compaction boundaries** — Visual markers when context was compressed, showing before/after delta
- **Phase tracking** — Each compaction resets injection tracking; view per-phase breakdowns
- **AGENTS.md directory tree** — Hierarchical view of which AGENTS.md files (global, project, directory) are loaded

---

## Token Analysis & Model Comparison

### Session-Level Token Summary

Every session shows a prominent token summary card:

```
┌─────────────────────────────────────────────────────────────────┐
│  Token Summary                          claude-sonnet-4-6       │
│                                                                  │
│  Total: 142,380 tokens                  Weighted: 170,856       │
│                                                                  │
│  Input     ████████████████░░░░  62,400  (44%)                  │
│  Output    ████████░░░░░░░░░░░░  31,200  (22%)                  │
│  Cache Read ██████░░░░░░░░░░░░░  38,780  (27%)  ← 72% hit rate │
│  Cache Write ██░░░░░░░░░░░░░░░░  10,000  ( 7%)                  │
│                                                                  │
│  Duration: 4m 32s · Turns: 8 · Tools: 23                        │
└─────────────────────────────────────────────────────────────────┘
```

### What-If Model Comparison Panel

Compare weighted token cost across different models:

```
┌─────────────────────────────────────────────────────────────────┐
│  What-If: Model Comparison                                       │
│                                                                  │
│  Current: claude-sonnet-4-6 (1.2x)         170,856 weighted     │
│                                                                  │
│  ┌─────────────────┬──────────┬──────────┬───────────────────┐  │
│  │ Model            │ Mult.    │ Weighted │ vs Current         │  │
│  ├─────────────────┼──────────┼──────────┼───────────────────┤  │
│  │ claude-opus-4-6  │ 2.0x     │ 284,760  │ +67% more costly  │  │
│  │ claude-haiku-4-5 │ 0.4x     │  56,952  │ -67% cheaper      │  │
│  │ gpt-5.4          │ 1.0x     │ 142,380  │ -17% cheaper      │  │
│  │ glm-4.7          │ 0.25x    │  35,595  │ -79% cheaper      │  │
│  └─────────────────┴──────────┴──────────┴───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Trends (Per-Project)

Bar chart showing token usage across sessions within a project, with cache efficiency color coding.

---

## Model Weight Multipliers

> **Planned improvement:** Simplify from 3 weights (input/output/cache) to a single multiplier matching Droid's billing model.

Configurable per-model multipliers for cross-model token comparison. Droid charges different rates per model — multipliers normalize everything to a common unit.

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings → Models                                               │
│                                                                  │
│  MODEL WEIGHT MULTIPLIERS                           Reset all    │
│  Relative weights for cross-model token comparison.              │
│  Sonnet = 1.0 baseline.                                          │
│                                                                  │
│  ┌────────────────────────────┬────────────┬─────────────────┐  │
│  │ Model                      │ Multiplier │ Actions          │  │
│  ├────────────────────────────┼────────────┼─────────────────┤  │
│  │ claude-opus-4-6             │    2.0x    │  Reset           │  │
│  │ claude-opus-4-6-fast        │   12.0x    │  Reset           │  │
│  │ claude-sonnet-4-6           │    1.2x    │  Reset           │  │
│  │ claude-haiku-4-5            │    0.4x    │  Reset           │  │
│  │ gpt-5.4                    │    1.0x    │  Reset           │  │
│  │ gpt-5.4-fast               │    2.0x    │  Reset           │  │
│  │ gpt-5.4-mini               │    0.3x    │  Reset           │  │
│  │ gpt-5.2-codex              │    0.7x    │  Reset           │  │
│  │ gemini-3.1-pro             │    0.8x    │  Reset           │  │
│  │ gemini-3-flash             │    0.2x    │  Reset           │  │
│  │ droid-core (glm-4.7)       │    0.25x   │  Reset           │  │
│  │ droid-core (glm-5)         │    0.4x    │  Reset           │  │
│  │ droid-core (kimi-k2.5)     │    0.25x   │  Reset           │  │
│  │ droid-core (minimax-m2.5)  │    0.12x   │  Reset           │  │
│  └────────────────────────────┴────────────┴─────────────────┘  │
│                                                                  │
│  ADD CUSTOM MODEL  [________________]  [Add]                     │
└─────────────────────────────────────────────────────────────────┘
```

**How it works:**
```
Weighted Tokens = Total Raw Tokens × Model Multiplier

Example: 100k tokens on Opus (2.0x) = 200k weighted
         100k tokens on Haiku (0.4x) =  40k weighted
         → Opus session costs 5x more than Haiku for same work
```

---

## Monthly Token Aggregation

> **Status:** Backend complete, frontend in progress

Cross-project monthly overview of token consumption, broken down by model family.

```
┌─────────────────────────────────────────────────────────────────┐
│  Monthly Token Usage                                             │
│                                                                  │
│  Apr 2026  ████████████████████████████████████  2.4M tokens    │
│            opus ██████  sonnet ████████████  haiku ██            │
│            42 sessions · 8 projects                              │
│                                                                  │
│  Mar 2026  ██████████████████████████████████████████  3.1M     │
│            opus ██████████  sonnet ██████████████  gpt ████      │
│            67 sessions · 12 projects                             │
│                                                                  │
│  Feb 2026  ████████████████████████████  1.8M                    │
│            sonnet ██████████████████  haiku ████                  │
│            38 sessions · 6 projects                              │
│                                                                  │
│  Jan 2026  ██████████████████████  1.2M                          │
│            sonnet ████████████  haiku ██████                      │
│            29 sessions · 5 projects                              │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:**
```
~/.factory/sessions/*/.settings.json
          │
          ▼
   TokenAggregator (Main Process)
   • Scans all project directories
   • Groups by YYYY-MM using file timestamps
   • Accumulates per-model-family
   • 60-second cache
          │
          ▼
   analytics:monthlyUsage IPC
          │
          ▼
   MonthlyTokenUsageView (Renderer)
   • Bar chart by month
   • Per-model breakdown
   • Session/project counts
```

---

## Token Efficiency Insights

> **Status:** Planned

Analyzes session data against Droid's documented token efficiency patterns and surfaces actionable suggestions.

```
┌─────────────────────────────────────────────────────────────────┐
│  Efficiency Insights                               3 suggestions │
│                                                                  │
│  🔴 HIGH  Model overkill detected                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Used Opus (2x) for a simple task (14k tokens, 3 tool       │ │
│  │ calls). Haiku (0.4x) would cost ~80% less for this type    │ │
│  │ of work.                                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🟡 MEDIUM  High exploration overhead                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 18 Read + 12 Grep calls before productive work. Add more   │ │
│  │ project structure to AGENTS.md to reduce exploration.       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🟢 LOW  Consider Spec Mode                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Session used 87k tokens with no planning phase. Complex     │ │
│  │ tasks benefit from Spec Mode (Shift+Tab) to prevent        │ │
│  │ expensive false starts.                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Detection rules (based on Droid documentation):**

```
┌────────────────────────┬──────────────────────────┬──────────────────────────────┐
│ What We Detect          │ How                      │ What We Suggest              │
├────────────────────────┼──────────────────────────┼──────────────────────────────┤
│ Model overkill          │ Opus for <20k tokens     │ Use Haiku/Sonnet             │
│ High exploration        │ >15 Reads or >10 Greps   │ Better AGENTS.md             │
│ Low cache efficiency    │ Cache hit rate <30%       │ Check project structure      │
│ Long conversation       │ >20 user turns           │ Break into smaller tasks     │
│ Failed tool calls       │ >3 tool errors           │ Add linting/typecheck        │
│ High thinking ratio     │ Thinking >40% of output  │ Lower reasoning effort       │
│ No planning phase       │ >50k tokens, no /spec    │ Use Spec Mode                │
│ Sequential subagents    │ >3 non-parallel           │ Parallelize work             │
│ Bulk work on expensive  │ 2x model, repetitive     │ Use Droid Core (0.25x)       │
│   model                 │   patterns               │                              │
└────────────────────────┴──────────────────────────┴──────────────────────────────┘
```

**All analysis runs client-side using existing session data — no new backend work required.**

---

## Team & Subagent Visualization

Full visualization of Droid's "Orchestrate Teams" feature where multiple sessions coordinate as a team.

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Response                                                     │
│                                                                  │
│  ├─ Read  src/api/routes.ts                                     │
│  ├─ Edit  src/api/routes.ts  (+12 -3)                           │
│  │                                                               │
│  ├─ 🤖 Subagent: "test-runner"  (parallel)                      │
│  │   ├─ Bash  npm test -- routes.test.ts                        │
│  │   └─ Text  "All 12 tests pass"                               │
│  │   └─ ⏱ 8s · 4,200 tokens · haiku                             │
│  │                                                               │
│  ├─ 🤖 Subagent: "lint-checker"  (parallel)                     │
│  │   ├─ Bash  npm run lint -- src/api/                          │
│  │   └─ Text  "No issues found"                                 │
│  │   └─ ⏱ 3s · 1,800 tokens · haiku                             │
│  │                                                               │
│  ├─ 💬 Teammate: "backend-team" (Alice)  🟢                     │
│  │   "Routes look good. I've updated the middleware to match."  │
│  │                                                               │
│  └─ Text  "Implementation complete, tests pass, lint clean."    │
│                                                                  │
│  ⏱ 34s · 24,600 tokens · sonnet · 2 subagents · 1 teammate     │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Expandable subagent cards with full internal message history
- Parallel execution detection and visual grouping
- Team member color coding and name badges
- Team lifecycle events (create, message, shutdown)
- Per-subagent token/duration metrics
- Nested subagent rendering (recursive tree)

---

## Notification & Alert System

Configurable alerts triggered by session activity patterns.

```
┌─────────────────────────────────────────────────────────────────┐
│  Notifications                                    3 unread       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🔴 .env File Access Alert                      2m ago       │ │
│  │    Session read .env.production in project api-server       │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 🟡 High Token Usage                            15m ago      │ │
│  │    Tool call exceeded 8,000 token threshold                 │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 🔵 Tool Result Error                           1h ago       │ │
│  │    Bash command failed with exit code 1                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Built-in triggers:**
- `.env File Access Alert` — monitors sensitive file access
- `Tool Result Error` — catches failed tool executions
- `High Token Usage` — per-tool-call token threshold

**Custom triggers:** Regex-based pattern matching on file paths, commands, prompts, content, or thinking text. Configurable token thresholds, color coding, and repository scoping.

---

## Multi-Pane Workspace

Side-by-side session comparison with drag-and-drop tab management.

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─ Tab: auth-fix ──┬─ Tab: settings ──┐  ┌─ Tab: api-refactor │
│  │                                       │  │                    │
│  │  Pane 1                               │  │  Pane 2            │
│  │                                       │  │                    │
│  │  Session: "Fix auth timeout"          │  │  Session: "Refactor│
│  │                                       │  │  API endpoints"    │
│  │  [Chat timeline...]                   │  │                    │
│  │  [Tool calls...]                      │  │  [Chat timeline...│ │
│  │  [Context panel...]                   │  │  [Tool calls...]  │ │
│  │                                       │  │                    │
│  └───────────────────────────────────────┘  └────────────────────┘
```

**Features:**
- Drag tabs between panes
- Drag to edge to create new pane
- Resizable pane dividers
- Per-tab scroll position and UI state isolation
- Auto-close empty panes

**Keyboard shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+1-9` | Jump to tab |
| `Cmd+\` | Split right |
| `Cmd+B` | Toggle sidebar |
| `Cmd+K` | Command palette |
| `Cmd+F` | Find in session |
| `Cmd+,` | Settings |

---

## SSH Remote Sessions

Connect to remote machines and view their Droid session logs as if they were local.

```
┌─────────────────────────────────────────────────────────────────┐
│  Connection Settings                                             │
│                                                                  │
│  Mode:  ○ Local   ● Remote (SSH)                                │
│                                                                  │
│  Host:   [dev-server.internal______]   ← autocomplete from      │
│  Port:   [22___]                          ~/.ssh/config          │
│  User:   [deploy_]                                               │
│  Auth:   [SSH Agent         ▾]                                   │
│                                                                  │
│  [Test Connection]  [Connect]                                    │
│                                                                  │
│  Status: 🟢 Connected · Factory root: /home/deploy/.factory     │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- SSH config alias autocomplete
- Auth methods: Auto, SSH Agent, Private Key, Password
- Factory root auto-detection on remote
- WSL path resolution
- Saved connection profiles
- Context switching between local and remote (`Cmd+Shift+K`)

---

## Command Palette & Search

### Command Palette (`Cmd+K`)

Spotlight-style search across projects and sessions:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍  [api-server___________________________]                    │
│                                                                  │
│  Projects                                                        │
│  ├─ api-server        /Users/team/api-server         12 sessions │
│  ├─ api-server-v2     /Users/team/api-v2              3 sessions │
│                                                                  │
│  Sessions (in api-server)                                        │
│  ├─ "Fix auth timeout bug"          Apr 6, 13 msgs              │
│  ├─ "Add rate limiting"             Apr 5, 8 msgs               │
│  └─ "Refactor middleware"           Apr 4, 22 msgs              │
└─────────────────────────────────────────────────────────────────┘
```

### In-Session Search (`Cmd+F`)

Full-text search within a session with match highlighting and navigation.

---

## Settings & Configuration

Six settings tabs covering all app configuration:

| Tab | What It Controls |
|-----|-----------------|
| **General** | Theme, startup behavior, Factory root path, HTTP server |
| **Connection** | Local vs SSH, connection profiles, auth methods |
| **Workspaces** | Project management, worktree handling, ignore patterns |
| **Notifications** | Triggers, snooze, custom regex alerts, token thresholds |
| **Models** | Per-model weight multipliers for token comparison |
| **Advanced** | Reset, export/import config, open in editor |

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Session Replay & Timeline | **Shipped** | Full JSONL reconstruction |
| Visible Context Tracking | **Shipped** | 6 categories, compaction-aware |
| Token Analysis & What-If | **Shipped** | Per-session, per-model comparison |
| Token Trends (per-project) | **Shipped** | Bar chart with cache efficiency |
| Model Weight Multipliers | **Simplifying** | 3 columns → single multiplier to match Droid |
| Monthly Token Aggregation | **In Progress** | Backend done, frontend wiring needed |
| Token Efficiency Insights | **Planned** | Detection rules defined, all data available |
| Team & Subagent Viz | **Shipped** | Full team lifecycle, nested subagents |
| Notification System | **Shipped** | Built-in + custom regex triggers |
| Multi-Pane Workspace | **Shipped** | Drag-and-drop, resizable, per-tab state |
| SSH Remote Sessions | **Shipped** | Full SSH with config autocomplete |
| Command Palette & Search | **Shipped** | Projects + sessions + in-session search |
| Settings | **Shipped** | 6 tabs, full config UI |
