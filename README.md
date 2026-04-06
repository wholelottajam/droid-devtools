<p align="center">
  <img src="resources/icons/png/1024x1024.png" alt="droid-devtools" width="120" />
</p>

<h1 align="center">droid-devtools</h1>

<p align="center">
  A session inspector for <strong>Droid/Factory CLI</strong> — see every tool call, token, and decision your agent made, directly from the logs on your machine.
</p>

---

## Background

This project is a fork of [claude-devtools](https://github.com/matt1398/claude-devtools) by Matt1398, which was built to inspect Claude Code sessions. claude-devtools does an excellent job of turning raw JSONL logs into a readable execution trace — tool calls, context breakdowns, subagent trees, compaction events — and rebuilding that foundation from scratch made little sense.

The Droid/Factory CLI is a separate tool that wraps Claude and writes its own session logs to `~/.factory/sessions/` in a compatible JSONL format. claude-devtools couldn't read these out of the box, and the original lacked the token analytics needed when working across multiple models at scale.

This fork adapts claude-devtools for that workflow.

---

## What's Different

### Droid/Factory CLI support

Reads session data from `~/.factory/sessions/` instead of `~/.claude/`. Path encoding, session settings, and the data layout all follow the Factory convention.

### Token analytics with model weights

Factory sessions frequently span multiple Claude models. Raw token counts are misleading when a cheaper and a more capable model both register as "1 token." This fork adds:

- **Model weight multipliers** — assign a relative weight to each model so token comparisons reflect actual cost ratios
- **Session and project summaries** — weighted token totals per session, rolled up to project level
- **Monthly aggregation** — token consumption month by month, across all projects, with weighted and unweighted breakdowns

The result is an accurate picture of where compute is going over time — not just per-session raw numbers.

---

## What's Inherited from claude-devtools

The rest of the app is the original claude-devtools feature set, adapted to the Factory path structure:

- **Tool call inspector** — every Read, Edit, Bash, and Subagent call with its result, syntax-highlighted and diffed inline
- **Context reconstruction** — per-turn token attribution across AGENTS.md files, @-mentions, tool I/O, thinking, team coordination, and user text
- **Compaction visualization** — detects when the context window fills and compresses, shows the before/after delta
- **Subagent and team visualization** — resolves Task calls to their spawned sessions, renders nested subagent trees inline
- **Notification triggers** — regex-based rules that fire system notifications on `.env` access, errors, token spikes, or any custom pattern
- **Command palette** — Cmd+K cross-session search across all projects
- **Multi-pane layout** — open sessions side by side, drag tabs between panes
- **SSH remote sessions** — inspect sessions on a remote machine over SFTP

---

## Installation

### Download a release

[Latest release →](https://github.com/wholelottajam/droid-devtools/releases/latest)

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `*-arm64.dmg` — drag to Applications, right-click → Open on first launch |
| macOS (Intel) | `*-x64.dmg` — same as above |
| Linux | `.AppImage`, `.deb`, or `.rpm` |
| Windows | `.exe` — click "More info" → "Run anyway" if SmartScreen triggers |

### Run from source

**Prerequisites:** Node.js 20+, pnpm 10+

```bash
git clone https://github.com/wholelottajam/droid-devtools.git
cd droid-devtools
pnpm install
```

```bash
pnpm dev          # dev mode with hot reload
pnpm build        # compile TypeScript + bundle
pnpm preview      # run the compiled app (no dev tools)
```

To build a distributable installer (output goes to `release/`):

```bash
pnpm dist:mac     # .dmg for macOS
pnpm dist:win     # .exe for Windows
pnpm dist:linux   # AppImage/.deb/.rpm for Linux
```

> macOS builds without a signing certificate will show "unidentified developer." Right-click → Open to run anyway.

---

## Docker / Standalone

Run as a web app without Electron:

```bash
# Docker Compose
docker compose up
# → http://localhost:3456

# Docker
docker build -t droid-devtools .
docker run -p 3456:3456 -v ~/.factory:/data/.factory:ro droid-devtools

# Node.js
pnpm standalone:build
node dist-standalone/index.cjs
```

| Variable | Default | Description |
|----------|---------|-------------|
| `FACTORY_ROOT` | `~/.factory` | Path to Factory data directory |
| `PORT` | `3456` | Listen port |

---

## License

[MIT](LICENSE) — based on [claude-devtools](https://github.com/matt1398/claude-devtools) by Matt1398.
