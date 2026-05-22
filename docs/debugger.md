# Debugger

NullForge's debugger launches **LLDB** as a subprocess and communicates via its machine-interface (MI) protocol, providing a GUI layer over standard debug sessions.

## Opening the Debugger

- Keyboard: `Cmd+Shift+G` or `Cmd+3`
- Menu: **Tools → Debugger**

## Loading a Binary

1. Click **Browse** — file picker with no extension filter (supports any executable: ELF, Mach-O, PE, scripts)
2. Or paste the path manually
3. Click **Start Debug Session**

> Use **"Open in Debugger"** from the Disassembler context menu to send a binary directly.

## Debug Controls

| Button | Shortcut | Action |
|--------|----------|--------|
| Continue | `F5` | Resume execution |
| Pause | `F6` | Interrupt running process |
| Stop | `Shift+F5` | Kill the debug session |
| Step Over | `F10` | Execute next line (skip function calls) |
| Step Into | `F11` | Step into function calls |
| Step Out | `Shift+F11` | Run until current function returns |
| Breakpoint | `F9` | Toggle breakpoint at current address |

## Breakpoints

- Set from the Debugger panel by entering an address or function name
- Set from the Disassembler via right-click → **Set Breakpoint**
- Listed in the breakpoints section of the Debugger panel

## Output

The debugger output panel streams all LLDB output in real time, including:
- Register values at each stop
- Backtrace / call stack
- Variable inspection results
- Custom LLDB commands

## Supported Platforms

| OS | Format | Notes |
|----|--------|-------|
| macOS | Mach-O arm64 / x86_64 | Native LLDB |
| Linux | ELF x64 / ARM64 | LLDB must be installed |
| Windows | PE x64 | Limited support |

## Tips

- For CTF pwn challenges, run the target binary in the bottom **Shell** panel first to understand I/O, then attach the debugger
- Combine with the **Disassembler**: set a breakpoint at an interesting address, run to it, inspect registers
- All debugger sessions are listed in the session panel — you can have multiple sessions open
