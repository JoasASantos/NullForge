# Disassembler

NullForge's disassembler performs **static binary analysis** using [Capstone](https://www.capstone-engine.org/) and the [`object`](https://crates.io/crates/object) crate for binary parsing.

## Supported Formats

| Format | Description |
|--------|-------------|
| ELF | Linux/Android executables, shared libraries, kernel modules |
| Mach-O | macOS/iOS binaries (arm64 and x86_64) |
| PE | Windows executables and DLLs |

## Supported Architectures

| Architecture | Modes |
|-------------|-------|
| x86_64 | 64-bit Intel/AMD |
| x86 | 32-bit legacy |
| ARM64 / AArch64 | Apple Silicon, Android, embedded |
| ARM | 32-bit ARM |
| MIPS | MIPS32 / MIPS64 |

## Opening the Disassembler

- Keyboard: `Cmd+Shift+D` or `Cmd+4`
- Menu: **Tools → Disassembler**
- Status bar: Disassembler button

## Loading a Binary

1. Click the **Browse** button (folder icon) — opens a file picker with no extension filter, so any file type is selectable including Unix executables without extensions
2. Or paste the full path into the input field and press **Enter**
3. Or click **Load & Disassemble**

> The binary loads automatically when selected via Browse. The first function is disassembled immediately.

## Binary Tab

After loading, the sidebar shows:

- **Binary info**: architecture, format (ELF/Mach-O/PE), bit-width, entry point
- **Function count** and **string count**
- **Function list**: all symbols found in the binary, sorted by address

Click any function in the list to disassemble it. The main panel shows:

```
Address         Hex bytes        Mnemonic    Operands
0x100003658     ff 83 00 d1      sub         sp, sp, #0x20
0x10000365c     fd 7b 01 a9      stp         x29, x30, [sp, #0x10]
...
```

### Instruction colours

| Colour | Meaning |
|--------|---------|
| Red | Call instructions (`call`, `bl`) |
| Purple | Return instructions (`ret`, `bx`) |
| Amber | Jumps (`jmp`, `b`, `cbz`, etc.) |
| Blue | Data moves (`mov`, `lea`) |
| Default | Arithmetic and other |

### Right-click context menu

- **Copy Address** — copies `0xADDR` to clipboard
- **Set Breakpoint** — sends the address to the Debugger
- **Show in CFG** — switches bottom panel to Control Flow Graph view

### Double-click

Double-clicking a `call` or `jump` instruction navigates to the target address (if the address is within the loaded binary).

## Shellcode Tab

Disassemble raw hex bytes without loading a binary:

1. Click the **Shellcode** tab in the sidebar
2. Select architecture
3. Paste hex bytes (e.g. `\x48\x31\xc0\x50...` or `4831c050...`)
4. Click **Disassemble**

## Bottom Tabs

| Tab | Description |
|-----|-------------|
| Strings | All printable strings found in data sections (`.rodata`, `__cstring`, etc.) |
| XRefs | Cross-references — where addresses are called or jumped to |
| CFG | Control flow graph of the selected function |
| ROP | ROP gadget search results |
| Chain | ROP chain builder |
| Bypass | Anti-sandbox / anti-debug technique reference |

## ROP Gadget Search

From the **ROP** bottom tab or via `Cmd+Shift+R`:

1. Select the target architecture
2. Set max instructions per gadget (default: 6)
3. Click **Find Gadgets**
4. Results show address, instruction sequence, and raw bytes
5. Click **+ Add to Chain** to build an exploit chain

## Tips

- Stripped binaries (no symbols) — NullForge synthesises a `_start` entry at the start of the first code section
- For large binaries, only the selected function is disassembled (not the whole binary at once)
- Use the **Recent** dropdown to quickly reload previously analysed files
- Pin a binary with the pin icon to keep it at the top of the recent list
