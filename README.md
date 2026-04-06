<p align="center">
  <img src="resources/icons/png/1024x1024.png" alt="droid-devtools" width="120" />
</p>

<h1 align="center">droid-devtools</h1>

<p align="center">
  <strong><code>The CLI tells you nothing. This shows you everything.</code></strong>
  <br />
  A desktop app that reconstructs exactly what Droid/Factory CLI did — every file path, every tool call, every token — from the raw session logs already on your machine.
</p>

<p align="center">
  <a href="https://github.com/wholelottajam/droid-devtools/releases/latest"><img src="https://img.shields.io/github/v/release/wholelottajam/droid-devtools?style=flat-square&label=version&color=blue" alt="Latest Release" /></a>&nbsp;
  <a href="https://github.com/wholelottajam/droid-devtools/actions/workflows/ci.yml"><img src="https://github.com/wholelottajam/droid-devtools/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>&nbsp;
  <a href="https://github.com/wholelottajam/droid-devtools/releases"><img src="https://img.shields.io/github/downloads/wholelottajam/droid-devtools/total?style=flat-square&color=green" alt="Downloads" /></a>&nbsp;
  <img src="https://img.shields.io/badge/platform-macOS%20(Apple%20Silicon%20%2B%20Intel)%20%7C%20Linux%20%7C%20Windows%20%7C%20Docker-lightgrey?style=flat-square" alt="Platform" />
</p>

<br />

<p align="center">
  <a href="https://github.com/wholelottajam/droid-devtools/releases/latest">
    <img src="https://img.shields.io/badge/macOS-Download-black?logo=apple&logoColor=white&style=flat" alt="Download for macOS" height="30" />
  </a>&nbsp;&nbsp;
  <a href="https://github.com/wholelottajam/droid-devtools/releases/latest">
    <img src="https://img.shields.io/badge/Linux-Download-FCC624?logo=linux&logoColor=black&style=flat" alt="Download for Linux" height="30" />
  </a>&nbsp;&nbsp;
  <a href="https://github.com/wholelottajam/droid-devtools/releases/latest">
    <img src="https://img.shields.io/badge/Windows-Download-0078D4?logo=windows&logoColor=white&style=flat" alt="Download for Windows" height="30" />
  </a>&nbsp;&nbsp;
  <a href="#docker--standalone-deployment">
    <img src="https://img.shields.io/badge/Docker-Deploy-2496ED?logo=docker&logoColor=white&style=flat" alt="Deploy with Docker" height="30" />
  </a>
</p>

<p align="center">
  <sub>100% free, open source. No API keys. No configuration. Just download, open, and see everything Droid/Factory CLI did.</sub>
</p>

<br />

---

## What It Does

Reads session logs from `~/.factory/sessions/` and reconstructs the full execution trace: every file path that was read, every regex that was searched, every diff that was applied, every token that was consumed — organized into a visual interface you can actually reason about.

No API keys. No configuration. No CLI modification required. Works purely from the JSONL session files already on your machine.

---

## Installation

### Direct Download

| Platform | Download | Notes |
|----------|----------|-------|
| **macOS** (Apple Silicon) | [`.dmg`](https://github.com/wholelottajam/droid-devtools/releases/latest) | Download the `arm64` asset. Drag to Applications. On first launch: right-click → Open |
| **macOS** (Intel) | [`.dmg`](https://github.com/wholelottajam/droid-devtools/releases/latest) | Download the `x64` asset. Drag to Applications. On first launch: right-click → Open |
| **Linux** | [`.AppImage` / `.deb` / `.rpm`](https://github.com/wholelottajam/droid-devtools/releases/latest) | Choose the package format for your distro |
| **Windows** | [`.exe`](https://github.com/wholelottajam/droid-devtools/releases/latest) | Standard installer. May trigger SmartScreen — click "More info" → "Run anyway" |
| **Docker** | `docker compose up` | Open `http://localhost:3456`. See [Docker / Standalone Deployment](#docker--standalone-deployment) |

The app reads session logs from `~/.factory/` — the data is already on your machine. No setup, no API keys, no login.

---

## Key Features

### :mag: Visible Context Reconstruction

droid-devtools reverse-engineers what's in the context window.

The engine walks each turn of the session and reconstructs the full set of context injections — **CLAUDE.md / AGENTS.md files** (broken down by global, project, and directory-level), **skill activations**, **@-mentioned files**, **tool call inputs and outputs**, **extended thinking**, **team coordination overhead**, and **user prompt text**.

The result is a per-turn breakdown of estimated token attribution across 7 categories, surfaced in three places: a **Context Badge** on each assistant response, a **Token Usage popover** with percentage breakdowns, and a dedicated **Session Context Panel**.

### :chart_with_downwards_trend: Compaction Visualization

**See the moment your context hits the limit.**

When the CLI hits its context limit, it silently compresses your conversation and continues. droid-devtools detects these compaction boundaries, measures the token delta before and after, and visualizes how your context fills, compresses, and refills over the course of a session.

### :bell: Custom Notification Triggers

Define rules for when you want to receive **system notifications**. Match on regex patterns, assign colors, and filter your inbox by trigger.

- **Built-in defaults**: `.env File Access Alert`, `Tool Result Error` (`is_error: true`), and `High Token Usage` (default: 8,000 total tokens).
- **Custom matching**: use regex against specific fields like `file_path`, `command`, `prompt`, `content`, `thinking`, or `text`.
- **Sensitive-file monitoring**: create alerts for `.env`, `secrets`, payment/billing/stripe paths, or any project-specific pattern.
- **Noise control**: choose input/output/total token thresholds, add ignore patterns, and scope triggers to selected repositories.

### :hammer_and_wrench: Rich Tool Call Inspector

Every tool call is paired with its result in an expandable card. Specialized viewers render each tool natively:
- **Read** calls show syntax-highlighted code with line numbers
- **Edit** calls show inline diffs with added/removed highlighting
- **Bash** calls show command output
- **Subagent** calls show the full execution tree, expandable in-place

### :busts_in_silhouette: Team & Subagent Visualization

droid-devtools untangles multi-agent sessions.

- **Subagent sessions** are resolved from Task tool calls and rendered as expandable inline cards — each with its own tool trace, token metrics, duration, and cost. Nested subagents render as a recursive tree.
- **Teammate messages** are detected and rendered as distinct color-coded cards, separated from regular user messages.
- **Team lifecycle** is fully visible: `TeamCreate` initialization, `TaskCreate`/`TaskUpdate` coordination, `SendMessage` direct messages and broadcasts, shutdown requests and responses, and `TeamDelete` teardown.

### :zap: Command Palette & Cross-Session Search

Hit **Cmd+K** for a Spotlight-style command palette. Search across all sessions in a project — results show context snippets with highlighted keywords.

### :globe_with_meridians: SSH Remote Sessions

Connect to any remote machine over SSH and inspect sessions running there — same interface, no compromise.

### :bar_chart: Multi-Pane Layout

Open multiple sessions side-by-side. Drag-and-drop tabs between panes, split views, and compare sessions in parallel.

---

## What the CLI Hides vs. What droid-devtools Shows

| What you see in the terminal | What droid-devtools shows you |
|------------------------------|-------------------------------|
| `Read 3 files` | Exact file paths, syntax-highlighted content with line numbers |
| `Searched for 1 pattern` | The regex pattern, every matching file, and the matched lines |
| `Edited 2 files` | Inline diffs with added/removed highlighting per file |
| A three-segment context bar | Per-turn token attribution across 7 categories — AGENTS.md breakdown, skills, @-mentions, tool I/O, thinking, teams, user text — with compaction visualization |
| Subagent output interleaved with the main thread | Isolated execution trees per agent, expandable inline with their own metrics |
| Teammate messages buried in session logs | Color-coded teammate cards with name, message, and full team lifecycle visibility |
| Critical events mixed into normal output | Trigger-filtered notification inbox for `.env` access, payment-related file paths, execution errors, and high token usage |
| Raw session logs | Structured, filterable, navigable interface — no noise |

---

## Docker / Standalone Deployment

Run without Electron — in Docker, on a remote server, or anywhere Node.js runs.

### Quick Start (Docker Compose)

```bash
docker compose up
```

Open `http://localhost:3456` in your browser.

### Quick Start (Docker)

```bash
docker build -t droid-devtools .
docker run -p 3456:3456 -v ~/.factory:/data/.factory:ro droid-devtools
```

### Quick Start (Node.js)

```bash
pnpm install
pnpm standalone:build
node dist-standalone/index.cjs
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FACTORY_ROOT` | `~/.factory` | Path to the `.factory` data directory |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3456` | Listen port |
| `CORS_ORIGIN` | `*` (standalone) | CORS origin policy (`*`, specific origin, or comma-separated list) |

### Notes

- **Real-time updates may be slower than Electron.** The Electron app uses native file system watchers with IPC for instant updates. The Docker/standalone server uses SSE (Server-Sent Events) over HTTP, which may introduce slight delays when sessions are actively being written to.
- **Custom Factory root path.** If your `.factory` directory is not at `~/.factory`, update the volume mount:
  ```bash
  docker run -p 3456:3456 -v /custom/path:/data/.factory:ro droid-devtools
  FACTORY_DIR=/custom/path docker compose up
  ```

### Security-Focused Deployment

The standalone server has **zero** outbound network calls. For maximum isolation:

```bash
docker run --network none -p 3456:3456 -v ~/.factory:/data/.factory:ro droid-devtools
```

See [SECURITY.md](SECURITY.md) for a full audit of network activity.

---

## Development

<details>
<summary><strong>Build from source</strong></summary>

<br />

**Prerequisites:** Node.js 20+, pnpm 10+

```bash
git clone https://github.com/wholelottajam/droid-devtools.git
cd droid-devtools
pnpm install
pnpm dev
```

The app auto-discovers your Factory projects from `~/.factory/sessions/`.

#### Build for Distribution

```bash
pnpm dist:mac:arm64  # macOS Apple Silicon (.dmg)
pnpm dist:mac:x64    # macOS Intel (.dmg)
pnpm dist:win        # Windows (.exe)
pnpm dist:linux      # Linux (AppImage/.deb/.rpm)
pnpm dist            # All platforms
```

#### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development with hot reload |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format` | Format code |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm check` | Full quality gate (types + lint + test + build) |

</details>

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

IPC handlers validate all inputs with strict path containment checks. File reads are constrained to the project root and `~/.factory/`. Sensitive credential paths are blocked. See [SECURITY.md](SECURITY.md) for details.

## Credits

Built on top of [claude-devtools](https://github.com/matt1398/claude-devtools) by [Matt1398](https://github.com/matt1398). Licensed under MIT.

## License

[MIT](LICENSE)
