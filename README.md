# NullForge

> AI-Powered Exploit Development Platform for macOS ARM64

NullForge is an open-source, AI-native IDE for security researchers, red team operators, and vulnerability researchers. It combines a professional code editor, integrated debugger, disassembler, payload/exploit library, multi-LLM AI assistant, and an interactive PTY shell — all in a single native desktop application.

---

## Features

- **Monaco Editor** — VS Code's editor engine with custom NullForge dark theme, ASM syntax highlighting, and exploit-focused code snippets
- **Multi-LLM AI Assistant** — Stream-based chat with Claude (Anthropic), OpenAI GPT-4, and local Ollama models; inline AI (Cmd+K) for in-editor completions
- **Integrated PTY Shell** — Full xterm.js shell with tab management, SSH, netcat, and meterpreter session types
- **LLDB Debugger** — Breakpoint manager, register view, memory viewer, call stack, watch expressions, and step controls
- **Disassembler** — Capstone-powered binary disassembly with symbol resolution and cross-references
- **Payload Library** — Curated database of shellcode, ROP chains, stagers, and encoders — searchable and filterable
- **Exploit Database** — Offline-capable exploit reference with CVE metadata and PoC code
- **Network Tools** — HTTP Repeater, Port Scanner, and DNS Lookup built into the sidebar
- **Plugin System** — YAML-defined plugins loaded from disk; extend NullForge with custom tools and commands
- **Command Palette** — Fuzzy-search all commands via Cmd+Shift+P
- **Settings UI** — Full settings modal (Cmd+,) for provider config, appearance, and keybindings
- **Onboarding Wizard** — First-run setup for AI providers and project creation

---

## Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript |
| UI styling | Tailwind CSS v3 |
| Editor | Monaco Editor |
| Terminal | xterm.js |
| State management | Zustand |
| Database | SQLite via rusqlite |
| Disassembler | Capstone (Rust bindings) |
| AI providers | Anthropic Claude, OpenAI, Ollama |

---

## Getting Started

### Prerequisites

- macOS 13+ on Apple Silicon (ARM64)
- [Rust](https://rustup.rs/) stable toolchain
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- Xcode Command Line Tools (`xcode-select --install`)

### Installation

```bash
git clone https://github.com/nullforge/nullforge.git
cd nullforge

# Install JavaScript dependencies
pnpm install

# Start development server (Tauri + Vite hot-reload)
pnpm tauri dev
```

### First Run

On first launch, the onboarding wizard walks you through:

1. **Welcome** — Feature overview
2. **AI Setup** — Connect Claude, OpenAI, or Ollama
3. **Project** — Create your first exploit workspace

After onboarding, the full IDE loads with the Monaco editor, shell, and AI panel ready.

### Production Build

```bash
pnpm tauri build
# Output: src-tauri/target/release/bundle/
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Command Palette | Cmd+Shift+P |
| Toggle Sidebar | Cmd+B |
| Toggle AI Panel | Cmd+J |
| Toggle Bottom Panel | Cmd+` |
| Inline AI | Cmd+K |
| Settings | Cmd+, |
| New Shell | Cmd+Shift+T |

---

## Project Structure

```
nullforge/
├── src/                        # React/TypeScript frontend
│   ├── ai/                     # AI provider adapters (Claude, OpenAI, Ollama)
│   ├── components/
│   │   ├── AI/                 # AI panel + inline AI
│   │   ├── CommandPalette/     # Fuzzy command search
│   │   ├── Debugger/           # Debug UI components
│   │   ├── Disassembler/       # Disasm viewer
│   │   ├── Editor/             # Monaco wrapper + theme
│   │   ├── ExploitDB/          # Exploit browser
│   │   ├── Layout/             # App shell (sidebar, status bar, panels)
│   │   ├── NetworkTools/       # HTTP repeater, port scanner, DNS
│   │   ├── Onboarding/         # First-run wizard
│   │   ├── PayloadLib/         # Payload browser
│   │   ├── Plugins/            # Plugin loader UI
│   │   ├── Settings/           # Settings modal
│   │   └── Shell/              # PTY shell tabs
│   └── store/                  # Zustand global state
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # Tauri command handlers
│       ├── db.rs               # SQLite initialization
│       └── lib.rs              # App entry point
└── README.md
```

---

## Screenshots

*Screenshots will be added after the first stable release.*

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, branch naming conventions, and the PR process.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
