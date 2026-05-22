# Editor

NullForge uses [Monaco Editor](https://microsoft.github.io/monaco-editor/) — the same engine that powers VS Code — with a custom dark theme optimised for security research.

## Supported Languages

| Extension | Language | Notes |
|-----------|----------|-------|
| `.c`, `.h` | C | |
| `.cpp`, `.cc`, `.cxx` | C++ | |
| `.py` | Python | |
| `.rs` | Rust | |
| `.asm`, `.s`, `.S` | Assembly | x86 / ARM |
| `.sh`, `.bash` | Shell | |
| `.js`, `.ts` | JavaScript / TypeScript | |
| `.go` | Go | |
| `.rb` | Ruby | |
| `.java` | Java | |
| `.md` | Markdown | |
| `.json`, `.yaml`, `.toml` | Config | |
| *(no extension)* | Plain text | |

The language is detected from the file extension. You can override it via the language selector in the status bar.

## Creating Files

- **New File** button in the empty editor area or the `+` tab button → type the filename with extension (e.g. `exploit.c`)
- The language is auto-detected from the extension you type
- Files without extensions open as plain text

## Features

- Syntax highlighting for all supported languages
- Code folding
- Multi-cursor editing (`Option+Click`)
- Find & replace (`Cmd+H`)
- Go-to-line (`Ctrl+G`)
- Auto-indent and bracket matching
- IntelliSense completions (Monaco built-in)

## Exploit Snippets

NullForge ships with built-in exploit-focused code snippets accessible via the autocomplete dropdown:

- `rop_chain` — ROP chain skeleton in Python
- `heap_spray` — Basic heap spray template
- `format_string` — Format string exploit skeleton
- `pwn_template` — pwntools exploit boilerplate
- `shellcode_exec` — C shellcode execution stub
- `stack_pivot` — Stack pivot gadget helper

Type the snippet name and press `Tab` to expand.

## Inline AI

Press `Cmd+K` with the editor focused to open the **Inline AI** prompt. The AI has access to your current file content and can:
- Generate code at the cursor
- Refactor selected code
- Explain selected assembly or disassembly
- Add comments to complex logic

## Tabs

| Action | How |
|--------|-----|
| New file | `+` button or `Cmd+N` |
| Close tab | `Cmd+W` or middle-click |
| Switch tab | `Cmd+1`–`9`, or `Cmd+Option+←/→` |
| Reorder | Drag and drop |

Tabs with unsaved changes show a dot indicator.
