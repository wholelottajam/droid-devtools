# droid-devtools

> **Fork notice:** droid-devtools is a fork of [claude-devtools](https://github.com/matt1398/claude-devtools) by [Matt1398](https://github.com/matt1398), ported for the Droid/Factory CLI.

A desktop app that visualizes Droid/Factory CLI session execution — explore conversations, track context usage, and analyze tool calls.

## What It Does

Reads session logs from `~/.factory/sessions/` and reconstructs the full execution trace: file reads, tool calls, token usage, subagent trees, team coordination, and context injections — organized into a visual interface.

No API keys. No configuration. No CLI required. Works purely from the JSONL session files already on your machine.

## Data Requirements

**Required:** `~/.factory/sessions/` — JSONL session files organized by encoded project path.

**Optional (enhances display, not required):**
- `~/.factory/droid-devtools-config.json` — app config (auto-created on first use)
- `~/.factory/droids/` — droid definition files
- `~/.factory/AGENTS.md` — global memory display
- `{projectRoot}/.claude/agents/` — agent metadata for display
- `{projectRoot}/.factory/AGENTS.md` or `{projectRoot}/AGENTS.md` — project memory display

## Installation

### Build from Source

**Prerequisites:** Node.js 20+, pnpm 10+

```bash
git clone https://github.com/wholelottajam/droid-devtools.git
cd droid-devtools
pnpm install
pnpm dev
```

### Build for Distribution

```bash
pnpm dist:mac:arm64  # macOS Apple Silicon (.dmg)
pnpm dist:mac:x64    # macOS Intel (.dmg)
pnpm dist:win        # Windows (.exe)
pnpm dist:linux      # Linux (AppImage/.deb/.rpm/.pacman)
```

## Docker / Standalone

Run without Electron — in Docker or anywhere Node.js runs.

```bash
# Docker Compose
docker compose up
# Open http://localhost:3456

# Docker
docker build -t droid-devtools .
docker run -p 3456:3456 -v ~/.factory:/data/.factory:ro droid-devtools

# Network-isolated (maximum security)
docker run --network none -p 3456:3456 -v ~/.factory:/data/.factory:ro droid-devtools

# Node.js
pnpm standalone:build
node dist-standalone/index.cjs
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FACTORY_ROOT` | `~/.factory` | Path to the `.factory` data directory |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3456` | Listen port |
| `CORS_ORIGIN` | `*` (standalone) | CORS origin policy |

## Development

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

## Security

Zero telemetry. Zero data exfiltration. All session data stays on your machine.

Network activity:
- **Auto-updater**: Checks GitHub Releases API on launch (Electron only). No user data sent.
- **SSH**: Only when you configure a remote host in Settings.
- **HTTP server**: Localhost only, opt-in.

For maximum isolation, run Docker with `--network none`. See [SECURITY.md](SECURITY.md).

## What's Different from claude-devtools

- Reads from `~/.factory/sessions/` instead of `~/.claude/projects/`
- Droid/Factory CLI path encoding and config paths (`droid-devtools-config.json`)
- Token analysis with Droid-specific model weights and provider efficiency metrics
- Droid/Factory CLI branding throughout (no Claude Code references)
- Factory CLI session format support

## Credits

Built on top of [claude-devtools](https://github.com/matt1398/claude-devtools) by [Matt1398](https://github.com/matt1398). Licensed under MIT.

## License

[MIT](LICENSE)
