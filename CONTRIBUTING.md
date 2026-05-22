# Contributing to NullForge

Thank you for your interest in contributing to NullForge. This guide covers everything you need to go from zero to your first merged PR.

---

## Development Setup

### 1. Prerequisites

- macOS 13+ (Apple Silicon recommended; Intel supported)
- Rust stable via [rustup](https://rustup.rs/)
- Node.js 20+ via [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)
- pnpm 9+ (`npm install -g pnpm`)
- Xcode Command Line Tools

### 2. Clone and install

```bash
git clone https://github.com/JoasASantos/NullForge.git
cd nullforge
pnpm install
```

### 3. Run in development mode

```bash
pnpm tauri dev
```

This starts the Vite dev server with hot-reload and the Tauri app in debug mode. Rust code changes require a rebuild (automatic via `cargo watch`).

### 4. Type-check without building

```bash
pnpm exec tsc --noEmit
```

### 5. Lint

```bash
pnpm exec eslint src --ext .ts,.tsx
```

---

## Repository Layout

```
src/                  React/TypeScript frontend
src-tauri/src/        Rust backend (commands, DB, lib)
src/components/       UI components — one directory per feature area
src/ai/               AI provider adapters
src/store/            Zustand global state (single file)
```

---

## Branch Naming

Use the format: `<type>/<short-description>`

| Type | When to use |
|---|---|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `refactor/` | Code cleanup, no behavior change |
| `docs/` | Documentation only |
| `test/` | Adding or improving tests |
| `chore/` | Build scripts, deps, tooling |

Examples:
- `feat/ssl-inspector`
- `fix/ollama-reconnect`
- `docs/plugin-sdk`

---

## Commit Style

NullForge uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

Scope is the component or area affected, e.g. `ai`, `editor`, `shell`, `debugger`, `settings`.

Examples:
```
feat(network): add SSL inspector to network tools panel
fix(ai): prevent duplicate stream messages on reconnect
refactor(editor): extract theme constants to separate file
```

---

## PR Checklist

Before submitting a pull request, verify:

- [ ] `pnpm exec tsc --noEmit` passes with no errors
- [ ] New Rust commands are registered in `lib.rs` `invoke_handler!`
- [ ] New components follow the existing design system (see below)
- [ ] No `console.log` or debug artifacts left in code
- [ ] `src-tauri/src/commands/mod.rs` updated if a new command module was added
- [ ] PR description explains *what* changed and *why*
- [ ] Screenshots attached for UI changes

---

## Design System

NullForge uses Tailwind CSS with a custom dark theme. Use these semantic tokens:

| Token | Value | Use |
|---|---|---|
| `bg-bg-base` | `#0d0f14` | Page background |
| `bg-surface` | `#141720` | Panel/card surface |
| `bg-elevated` | `#1a1f2e` | Hover states, dropdowns |
| `border-border` | `#1e2330` | All borders |
| `text-text-primary` | `#e2e8f0` | Primary readable text |
| `text-text-muted` | `#64748b` | Labels, subtitles |
| `text-accent-red` | `#e63946` | Actions, active states, NullForge brand |
| `text-accent-green` | `#4ade80` | Success, online status |
| `text-accent-yellow` | — | Warnings, file icons |

Never use raw hex colors in components. Use the Tailwind tokens.

---

## Plugin SDK Overview

NullForge plugins are YAML manifests placed in `~/.nullforge/plugins/<name>/plugin.yml`.

### Minimal plugin manifest

```yaml
id: my-tool
name: My Tool
version: "0.1.0"
description: Does something useful
author: Your Name
commands:
  - id: my-tool.run
    title: Run My Tool
    script: run.sh
panels:
  - id: my-tool.panel
    title: My Tool Panel
    icon: wrench
    url: ui/index.html
```

### Plugin anatomy

```
~/.nullforge/plugins/my-tool/
├── plugin.yml          # Manifest (required)
├── run.sh              # Shell script for commands
└── ui/
    └── index.html      # Optional webview panel
```

Plugins are loaded at startup and hot-reloaded when the `plugins` panel is refreshed. Shell script commands are executed via the Tauri shell plugin with the project directory as `cwd`.

### Plugin API (JavaScript — available in webview panels)

```javascript
// Post message to NullForge host
window.__nullforge.sendCommand("my-tool.run", { arg: "value" });

// Listen for events
window.__nullforge.on("editor:file-changed", (path) => { /* ... */ });
```

Full plugin API documentation is available in `docs/plugin-sdk.md` (coming soon).

---

## Getting Help

- Open a [GitHub Discussion](https://github.com/JoasASantos/NullForge/discussions) for questions
- Open an [Issue](https://github.com/JoasASantos/NullForge/issues) for bugs
- Tag PRs with the appropriate area label: `area:ai`, `area:editor`, `area:debugger`, `area:shell`, `area:network`, `area:plugins`
