# ROP Toolkit

The **Return-Oriented Programming (ROP) Toolkit** helps you find gadgets, build chains, and reference bypass techniques — all integrated with the disassembler.

## Opening the ROP Toolkit

- From the Disassembler's bottom tabs → **ROP**
- Keyboard: `Cmd+Shift+R` to trigger a gadget search

## Gadget Finder

1. Load a binary in the **Disassembler**
2. Switch to the **ROP** bottom tab
3. Configure:
   - **Architecture** (auto-detected from binary)
   - **Max instructions per gadget** (default: 6)
4. Click **Find Gadgets**

Results show:
- Address
- Instruction sequence
- Raw bytes

Click **+ Add to Chain** on any gadget to build a chain.

## Chain Builder

The **Chain** tab provides a drag-and-reorder interface for assembling your ROP chain:

- Add gadgets from search results
- Set register/memory values for each gadget
- Export as Python (pwntools), C array, or raw hex

### Export formats

```python
# pwntools format
rop  = p64(0x00401234)  # pop rdi; ret
rop += p64(0x00601060)  # /bin/sh address
rop += p64(0x00401100)  # system
```

```c
// C array format
uint64_t chain[] = {
    0x00401234,  // pop rdi; ret
    0x00601060,  // /bin/sh
    0x00401100,  // system
};
```

## Bypass Reference

The **Bypass** tab is an offline reference database for:

| Technique | Notes |
|-----------|-------|
| ASLR bypass | ret2plt, partial overwrite, info leak |
| Stack Canary bypass | Format string leak, brute force (fork) |
| NX/DEP bypass | ROP, ret2libc, JOP |
| PIE bypass | Relative leaks, got overwrite |
| RELRO bypass | GOT overwrite on Partial RELRO |
| Seccomp bypass | ROP-based filter bypass |
| Heap protections | tcache poisoning, safe-linking bypass |
| VM detection | Anti-sandbox technique reference |

Each entry includes a description, technique variants, and code examples.

## ROP Search Export

`Cmd+Shift+E` exports the current gadget search results to a file (JSON or text).

## Tips

- **Filter gadgets**: type in the search box above the gadget list to filter by mnemonic (e.g. `pop rdi`, `xchg`, `syscall`)
- **Pivot gadgets**: look for `xchg rsp` or `mov rsp` to find stack pivot gadgets
- **System call gadgets** (Linux): look for `syscall; ret` or `int 0x80; ret`
- **ARM64**: `ret` gadgets are `c0 03 5f d6` — NullForge searches these automatically
