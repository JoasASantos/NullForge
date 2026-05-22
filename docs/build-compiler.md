# Build & Compiler

The **Build Panel** integrates an inline compiler so you can compile and run code without leaving NullForge.

## Opening the Build Panel

- Menu: **Tools → Build Panel**
- Keyboard: `Cmd+Shift+B` (when editor is focused, builds the current file)

## Supported Languages & Compilers

| Language | Compiler | Required |
|----------|----------|----------|
| C | `gcc` / `clang` | Must be installed |
| C++ | `g++` / `clang++` | Must be installed |
| Python | `python3` | Must be installed |
| Rust | `cargo` | Must be installed |
| Assembly (x86/x64) | `nasm` + `ld` | Must be installed |
| Go | `go` | Must be installed |

> NullForge calls system compilers — ensure the compiler for your language is in your `$PATH`.

## Build Modes

### Single File

Compiles the selected source file directly:

```
gcc -o output exploit.c -m64 -no-pie -fno-stack-protector
```

Useful for: self-contained exploit scripts, shellcode tests, PoC code.

### Makefile

Runs `make` in the project directory using an existing `Makefile`:

```
make -C /path/to/project all
```

Useful for: multi-file projects, custom build pipelines.

### Folder / Multi-file

Compiles all `.c` (or relevant) files in a directory:

```
gcc -o output *.c -I./include -lm
```

Useful for: small multi-file exploits, CTF challenges with multiple source files.

## Compiler Flags

Common flags can be set via the Build Panel UI:

| Flag | Effect |
|------|--------|
| `-no-pie` | Disable Position Independent Executable |
| `-fno-stack-protector` | Disable stack canary |
| `-z execstack` | Mark stack as executable |
| `-m32` | Compile for 32-bit |
| `-static` | Static linking |
| `-g` | Include debug symbols |
| `-O0` | Disable optimisations |

## Output

Build output (stdout/stderr) streams to the **Output** tab in the bottom panel. Errors and warnings link back to the source line (when debug info is available).

## Running After Build

After a successful build:
1. The output binary path appears in the build panel
2. Click **Run** to execute it in the embedded **Shell**
3. Or click **Debug** to open the binary in the Debugger
4. Or click **Disassemble** to open it in the Disassembler

## Tips

- For CTF pwn: compile with `-no-pie -fno-stack-protector -z execstack` to match the challenge binary's protections
- Use the **Problems** tab to see compiler errors without switching away from the editor
- The build panel remembers the last source file and output path per project
