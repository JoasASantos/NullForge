# Overview

NullForge is a desktop exploit development IDE built on top of [Tauri v2](https://tauri.app), combining a professional code editor, binary analysis tools, an AI assistant, and a curated offensive security payload library — all in one native application.

## Who is it for?

- **Security researchers** performing vulnerability research
- **CTF players** solving pwn, reversing and binary exploitation challenges
- **Red team operators** developing exploits and post-exploitation tooling
- **Malware analysts** reverse-engineering binaries

## Core Components

| Component | Description |
|-----------|-------------|
| Monaco Editor | Full-featured code editor with syntax highlighting for C, Python, Assembly, Rust and more |
| Disassembler | Static binary analysis powered by Capstone — supports x86, x64, ARM, ARM64, MIPS |
| Debugger | LLDB-backed dynamic analysis with breakpoints, step-over/into/out, register view |
| AI Assistant | Integrated Claude / OpenAI / Ollama for code generation, vulnerability analysis, and inline suggestions |
| Payload Library | Curated database of shellcodes, reverse shells, and exploit templates |
| ROP Toolkit | Automated gadget finder, chain builder, and bypass reference |
| Shellcode Generator | Encode, test and generate shellcode for multiple architectures |
| Build System | Inline compiler for C, C++, Python, Rust, Assembly with configurable build modes |
| ExploitDB Browser | Offline exploit template viewer |
| Sysapi Browser | System call reference for Linux, macOS and Windows |

## Architecture

```
NullForge
├── Frontend  (React + TypeScript + Zustand + Monaco)
│   ├── UI components  (src/components/)
│   ├── State store    (src/store/)
│   └── AI providers   (src/ai/)
└── Backend   (Rust + Tauri v2)
    ├── Shell PTY      (portable-pty)
    ├── Disassembler   (capstone + object)
    ├── Debugger       (LLDB subprocess)
    ├── Database       (SQLite via rusqlite)
    └── AI streaming   (reqwest)
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | Tauri v2 (Rust + WebView) |
| Frontend framework | React 18 + TypeScript |
| State management | Zustand |
| Code editor | Monaco Editor |
| Disassembly engine | Capstone |
| Binary parsing | `object` crate |
| Database | SQLite (bundled rusqlite) |
| Shell emulation | portable-pty / xterm.js |
| Styling | Tailwind CSS |
| Build tool | Vite |
