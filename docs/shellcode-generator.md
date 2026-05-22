# Shellcode Generator

The **Shellcode Generator** panel provides tools for encoding, transforming, and testing shellcode across multiple architectures.

## Opening

- Keyboard: `Cmd+Shift+K`
- Menu: **Tools → Shellcode Generator**

## Input Formats

Paste shellcode in any of these formats:

```
\x48\x31\xd2\x48\xbb\x2f\x2f\x62\x69\x6e...   (escaped hex)
4831d248bb2f2f62696e...                           (raw hex string)
H1.H./bin...                                      (ASCII if printable)
```

## Architectures

| Architecture | Notes |
|-------------|-------|
| x86_64 | 64-bit Intel/AMD Linux/Windows |
| x86 | 32-bit legacy |
| ARM64 / AArch64 | macOS Apple Silicon, Android |
| ARM | 32-bit embedded Linux |
| MIPS | MIPS32 big/little endian |

## Transformations

| Transform | Description |
|-----------|-------------|
| Hex string | `\x41\x42\x43...` |
| Raw hex | `414243...` |
| Base64 | Standard base64 encoding |
| C array | `unsigned char sc[] = { 0x41, 0x42, ... };` |
| Python bytes | `b"\x41\x42\x43..."` |
| Disassemble | Send to Disassembler for static analysis |

## Null-byte Detection

The generator highlights null bytes (`\x00`) in the shellcode, since these often break string-based vulnerabilities like `strcpy`, `gets`, etc. Use null-byte-free shellcode variants from the Payload Library when needed.

## Length

The byte count and hex length are displayed automatically — useful for calculating buffer padding.

## Integration

- **Send to Disassembler**: opens the shellcode in the Disassembler's **Shellcode** tab for analysis
- **Copy**: copies the transformed output to clipboard
- **Open in Editor**: creates a new editor tab with the shellcode in the selected format
