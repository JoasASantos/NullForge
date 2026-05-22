import type * as Monaco from "monaco-editor";

// ── Assembly instruction table ────────────────────────────────────────────────

const ASM_INSTRUCTIONS = [
  // Data movement
  { label: "mov",     detail: "mov dst, src",          doc: "Move: dst ← src" },
  { label: "movq",    detail: "movq dst, src",         doc: "Move quadword" },
  { label: "movl",    detail: "movl dst, src",         doc: "Move doubleword (AT&T)" },
  { label: "movsx",   detail: "movsx dst, src",        doc: "Move with sign-extension" },
  { label: "movzx",   detail: "movzx dst, src",        doc: "Move with zero-extension" },
  { label: "movsxd",  detail: "movsxd dst, src",       doc: "Sign-extend dword to qword" },
  { label: "lea",     detail: "lea dst, [expr]",       doc: "Load effective address" },
  { label: "xchg",    detail: "xchg a, b",             doc: "Exchange registers/memory" },
  { label: "xadd",    detail: "xadd dst, src",         doc: "Exchange and add" },
  { label: "cmpxchg", detail: "cmpxchg dst, src",      doc: "Compare and exchange (rax implied)" },
  { label: "bswap",   detail: "bswap reg",             doc: "Byte-swap register" },
  { label: "push",    detail: "push src",              doc: "Push onto stack (rsp -= 8)" },
  { label: "pop",     detail: "pop dst",               doc: "Pop from stack (rsp += 8)" },
  { label: "pushf",   detail: "pushf",                 doc: "Push flags register" },
  { label: "popf",    detail: "popf",                  doc: "Pop flags register" },
  // Arithmetic
  { label: "add",     detail: "add dst, src",          doc: "dst ← dst + src" },
  { label: "sub",     detail: "sub dst, src",          doc: "dst ← dst - src" },
  { label: "mul",     detail: "mul src",               doc: "Unsigned rdx:rax ← rax × src" },
  { label: "imul",    detail: "imul dst, src[, imm]",  doc: "Signed multiply" },
  { label: "div",     detail: "div src",               doc: "Unsigned divide rdx:rax / src" },
  { label: "idiv",    detail: "idiv src",              doc: "Signed divide rdx:rax / src" },
  { label: "inc",     detail: "inc dst",               doc: "dst ← dst + 1 (no CF update)" },
  { label: "dec",     detail: "dec dst",               doc: "dst ← dst - 1 (no CF update)" },
  { label: "neg",     detail: "neg dst",               doc: "Two's complement negation" },
  { label: "adc",     detail: "adc dst, src",          doc: "Add with carry: dst ← dst + src + CF" },
  { label: "sbb",     detail: "sbb dst, src",          doc: "Subtract with borrow" },
  // Bitwise / shift
  { label: "and",     detail: "and dst, src",          doc: "Bitwise AND" },
  { label: "or",      detail: "or dst, src",           doc: "Bitwise OR" },
  { label: "xor",     detail: "xor dst, src",          doc: "Bitwise XOR — xor reg, reg zeroes it" },
  { label: "not",     detail: "not dst",               doc: "Bitwise NOT (one's complement)" },
  { label: "shl",     detail: "shl dst, cnt",          doc: "Logical shift left" },
  { label: "shr",     detail: "shr dst, cnt",          doc: "Logical shift right" },
  { label: "sal",     detail: "sal dst, cnt",          doc: "Arithmetic shift left (≡ shl)" },
  { label: "sar",     detail: "sar dst, cnt",          doc: "Arithmetic shift right (sign-preserve)" },
  { label: "rol",     detail: "rol dst, cnt",          doc: "Rotate left through carry" },
  { label: "ror",     detail: "ror dst, cnt",          doc: "Rotate right through carry" },
  { label: "rcl",     detail: "rcl dst, cnt",          doc: "Rotate left with carry" },
  { label: "rcr",     detail: "rcr dst, cnt",          doc: "Rotate right with carry" },
  { label: "bt",      detail: "bt base, offset",       doc: "Bit test → CF" },
  { label: "bts",     detail: "bts base, offset",      doc: "Bit test and set" },
  { label: "btr",     detail: "btr base, offset",      doc: "Bit test and reset" },
  { label: "btc",     detail: "btc base, offset",      doc: "Bit test and complement" },
  // Compare / test
  { label: "cmp",     detail: "cmp a, b",              doc: "Set flags from (a - b), no store" },
  { label: "test",    detail: "test a, b",             doc: "Set flags from (a AND b), no store" },
  // Conditional moves
  { label: "cmove",   detail: "cmove dst, src",        doc: "Move if equal (ZF=1)" },
  { label: "cmovne",  detail: "cmovne dst, src",       doc: "Move if not equal (ZF=0)" },
  { label: "cmovl",   detail: "cmovl dst, src",        doc: "Move if less (signed)" },
  { label: "cmovg",   detail: "cmovg dst, src",        doc: "Move if greater (signed)" },
  // Jumps
  { label: "jmp",     detail: "jmp target",            doc: "Unconditional jump" },
  { label: "je",      detail: "je target",             doc: "Jump if equal / zero (ZF=1)" },
  { label: "jne",     detail: "jne target",            doc: "Jump if not equal (ZF=0)" },
  { label: "jz",      detail: "jz target",             doc: "Jump if zero (ZF=1)" },
  { label: "jnz",     detail: "jnz target",            doc: "Jump if not zero (ZF=0)" },
  { label: "jg",      detail: "jg target",             doc: "Jump if greater (signed, ZF=0 & SF=OF)" },
  { label: "jge",     detail: "jge target",            doc: "Jump if greater or equal (signed)" },
  { label: "jl",      detail: "jl target",             doc: "Jump if less (signed, SF≠OF)" },
  { label: "jle",     detail: "jle target",            doc: "Jump if less or equal (signed)" },
  { label: "ja",      detail: "ja target",             doc: "Jump if above (unsigned, CF=0 & ZF=0)" },
  { label: "jae",     detail: "jae target",            doc: "Jump if above or equal (unsigned)" },
  { label: "jb",      detail: "jb target",             doc: "Jump if below (unsigned, CF=1)" },
  { label: "jbe",     detail: "jbe target",            doc: "Jump if below or equal (unsigned)" },
  { label: "jo",      detail: "jo target",             doc: "Jump if overflow (OF=1)" },
  { label: "jno",     detail: "jno target",            doc: "Jump if no overflow (OF=0)" },
  { label: "js",      detail: "js target",             doc: "Jump if sign (SF=1)" },
  { label: "jns",     detail: "jns target",            doc: "Jump if no sign (SF=0)" },
  { label: "jrcxz",   detail: "jrcxz target",          doc: "Jump if rcx == 0" },
  { label: "loop",    detail: "loop target",           doc: "Decrement rcx, jump if rcx ≠ 0" },
  // Call / ret
  { label: "call",    detail: "call target",           doc: "Call subroutine (push rip, jmp)" },
  { label: "ret",     detail: "ret",                   doc: "Return (pop rip)" },
  { label: "retn",    detail: "retn imm16",            doc: "Return and discard N bytes from stack" },
  { label: "retf",    detail: "retf",                  doc: "Far return" },
  { label: "iret",    detail: "iret",                  doc: "Interrupt return" },
  { label: "iretq",   detail: "iretq",                 doc: "Interrupt return (64-bit)" },
  { label: "int",     detail: "int n",                 doc: "Software interrupt (e.g. int 0x80)" },
  { label: "int3",    detail: "int3",                  doc: "Breakpoint trap (0xCC)" },
  { label: "into",    detail: "into",                  doc: "Interrupt on overflow" },
  { label: "syscall", detail: "syscall",               doc: "Fast syscall (x86-64 Linux entry)" },
  { label: "sysret",  detail: "sysret",                doc: "Return from syscall" },
  { label: "sysenter",detail: "sysenter",              doc: "Fast syscall (32-bit)" },
  { label: "sysexit", detail: "sysexit",               doc: "Return from sysenter" },
  // String operations
  { label: "rep",     detail: "rep <string-op>",       doc: "Repeat string op rcx times" },
  { label: "repe",    detail: "repe <string-op>",      doc: "Repeat while equal (ZF=1)" },
  { label: "repne",   detail: "repne <string-op>",     doc: "Repeat while not equal (ZF=0)" },
  { label: "movsb",   detail: "movsb",                 doc: "Copy byte [rsi]→[rdi], advance both" },
  { label: "movsw",   detail: "movsw",                 doc: "Copy word [rsi]→[rdi]" },
  { label: "movsd",   detail: "movsd",                 doc: "Copy dword [rsi]→[rdi]" },
  { label: "movsq",   detail: "movsq",                 doc: "Copy qword [rsi]→[rdi]" },
  { label: "stosb",   detail: "stosb",                 doc: "Store al → [rdi], advance rdi" },
  { label: "stosw",   detail: "stosw",                 doc: "Store ax → [rdi]" },
  { label: "stosd",   detail: "stosd",                 doc: "Store eax → [rdi]" },
  { label: "stosq",   detail: "stosq",                 doc: "Store rax → [rdi]" },
  { label: "lodsb",   detail: "lodsb",                 doc: "Load byte [rsi]→al, advance rsi" },
  { label: "lodsq",   detail: "lodsq",                 doc: "Load qword [rsi]→rax" },
  { label: "scasb",   detail: "scasb",                 doc: "Compare al vs [rdi], advance rdi" },
  { label: "scasq",   detail: "scasq",                 doc: "Compare rax vs [rdi]" },
  // Misc
  { label: "nop",     detail: "nop",                   doc: "No operation (0x90)" },
  { label: "hlt",     detail: "hlt",                   doc: "Halt — wait for interrupt" },
  { label: "cpuid",   detail: "cpuid",                 doc: "CPU identification (eax selects leaf)" },
  { label: "rdtsc",   detail: "rdtsc",                 doc: "Read timestamp counter → edx:eax" },
  { label: "rdtscp",  detail: "rdtscp",                doc: "Read timestamp counter + CPU ID" },
  { label: "rdmsr",   detail: "rdmsr",                 doc: "Read MSR[ecx] → edx:eax" },
  { label: "wrmsr",   detail: "wrmsr",                 doc: "Write edx:eax → MSR[ecx]" },
  { label: "lfence",  detail: "lfence",                doc: "Load fence (serialize loads)" },
  { label: "mfence",  detail: "mfence",                doc: "Memory fence (serialize all)" },
  { label: "sfence",  detail: "sfence",                doc: "Store fence (serialize stores)" },
  { label: "pause",   detail: "pause",                 doc: "Spin-wait hint (reduces power in loops)" },
  { label: "ud2",     detail: "ud2",                   doc: "Undefined instruction (raises #UD)" },
  { label: "clc",     detail: "clc",                   doc: "Clear carry flag" },
  { label: "stc",     detail: "stc",                   doc: "Set carry flag" },
  { label: "cmc",     detail: "cmc",                   doc: "Complement carry flag" },
  { label: "cld",     detail: "cld",                   doc: "Clear direction flag (forward string ops)" },
  { label: "std",     detail: "std",                   doc: "Set direction flag (backward string ops)" },
  { label: "cli",     detail: "cli",                   doc: "Clear interrupt flag (disable IRQs)" },
  { label: "sti",     detail: "sti",                   doc: "Set interrupt flag (enable IRQs)" },
  // ARM64
  { label: "ldr",     detail: "ldr Xn, [Xm]",         doc: "Load register (ARM64)" },
  { label: "ldrb",    detail: "ldrb Wn, [Xm]",        doc: "Load byte zero-extended (ARM64)" },
  { label: "ldrh",    detail: "ldrh Wn, [Xm]",        doc: "Load halfword zero-extended (ARM64)" },
  { label: "ldrsb",   detail: "ldrsb Xn, [Xm]",       doc: "Load byte sign-extended (ARM64)" },
  { label: "ldrsw",   detail: "ldrsw Xn, [Xm]",       doc: "Load word sign-extended to 64-bit (ARM64)" },
  { label: "str",     detail: "str Xn, [Xm]",         doc: "Store register (ARM64)" },
  { label: "strb",    detail: "strb Wn, [Xm]",        doc: "Store byte (ARM64)" },
  { label: "strh",    detail: "strh Wn, [Xm]",        doc: "Store halfword (ARM64)" },
  { label: "ldp",     detail: "ldp Xn, Xm, [Xk]",    doc: "Load pair (ARM64)" },
  { label: "stp",     detail: "stp Xn, Xm, [Xk]",    doc: "Store pair (ARM64)" },
  { label: "adrp",    detail: "adrp Xn, label",       doc: "Load page address (ARM64)" },
  { label: "adr",     detail: "adr Xn, label",        doc: "Load PC-relative address (ARM64)" },
  { label: "bl",      detail: "bl label",             doc: "Branch with link / call (ARM64)" },
  { label: "blr",     detail: "blr Xn",              doc: "Branch with link to register (ARM64)" },
  { label: "br",      detail: "br Xn",               doc: "Branch to register (ARM64)" },
  { label: "b",       detail: "b label",             doc: "Branch (ARM64)" },
  { label: "cbz",     detail: "cbz Xn, label",        doc: "Branch if zero (ARM64)" },
  { label: "cbnz",    detail: "cbnz Xn, label",       doc: "Branch if not zero (ARM64)" },
  { label: "tbz",     detail: "tbz Xn, #bit, label",  doc: "Branch if bit zero (ARM64)" },
  { label: "tbnz",    detail: "tbnz Xn, #bit, label", doc: "Branch if bit nonzero (ARM64)" },
  { label: "svc",     detail: "svc #0",              doc: "Supervisor call / syscall (ARM64)" },
  { label: "mrs",     detail: "mrs Xn, sysreg",       doc: "Move from system register (ARM64)" },
  { label: "msr",     detail: "msr sysreg, Xn",       doc: "Move to system register (ARM64)" },
  { label: "eret",    detail: "eret",                 doc: "Exception return (ARM64)" },
];

// ── Assembly register table ───────────────────────────────────────────────────

const ASM_REGISTERS = [
  // x86-64 64-bit GPR
  { label: "rax", detail: "64-bit GPR", doc: "Accumulator; syscall number; return value" },
  { label: "rbx", detail: "64-bit GPR", doc: "Base register (callee-saved)" },
  { label: "rcx", detail: "64-bit GPR", doc: "Counter; 4th arg (syscall: rcx clobbered, use r10)" },
  { label: "rdx", detail: "64-bit GPR", doc: "Data; 3rd argument" },
  { label: "rsi", detail: "64-bit GPR", doc: "Source index; 2nd argument" },
  { label: "rdi", detail: "64-bit GPR", doc: "Destination index; 1st argument" },
  { label: "rbp", detail: "64-bit GPR", doc: "Frame/base pointer (callee-saved)" },
  { label: "rsp", detail: "64-bit GPR", doc: "Stack pointer (always aligned to 16 bytes at call)" },
  { label: "r8",  detail: "64-bit GPR", doc: "5th argument" },
  { label: "r9",  detail: "64-bit GPR", doc: "6th argument" },
  { label: "r10", detail: "64-bit GPR", doc: "4th syscall arg (kernel ABI); temporary" },
  { label: "r11", detail: "64-bit GPR", doc: "Temporary (clobbered by syscall along with rflags)" },
  { label: "r12", detail: "64-bit GPR", doc: "Callee-saved" },
  { label: "r13", detail: "64-bit GPR", doc: "Callee-saved" },
  { label: "r14", detail: "64-bit GPR", doc: "Callee-saved" },
  { label: "r15", detail: "64-bit GPR", doc: "Callee-saved" },
  // 32-bit
  { label: "eax",  detail: "32-bit", doc: "Low 32 bits of rax; zeroes upper 32 bits on write" },
  { label: "ebx",  detail: "32-bit", doc: "Low 32 bits of rbx" },
  { label: "ecx",  detail: "32-bit", doc: "Low 32 bits of rcx" },
  { label: "edx",  detail: "32-bit", doc: "Low 32 bits of rdx" },
  { label: "esi",  detail: "32-bit", doc: "Low 32 bits of rsi" },
  { label: "edi",  detail: "32-bit", doc: "Low 32 bits of rdi" },
  { label: "esp",  detail: "32-bit", doc: "Low 32 bits of rsp" },
  { label: "ebp",  detail: "32-bit", doc: "Low 32 bits of rbp" },
  { label: "r8d",  detail: "32-bit", doc: "Low 32 bits of r8" },
  { label: "r9d",  detail: "32-bit", doc: "Low 32 bits of r9" },
  { label: "r10d", detail: "32-bit", doc: "Low 32 bits of r10" },
  { label: "r11d", detail: "32-bit", doc: "Low 32 bits of r11" },
  { label: "r12d", detail: "32-bit", doc: "Low 32 bits of r12" },
  { label: "r13d", detail: "32-bit", doc: "Low 32 bits of r13" },
  { label: "r14d", detail: "32-bit", doc: "Low 32 bits of r14" },
  { label: "r15d", detail: "32-bit", doc: "Low 32 bits of r15" },
  // 16-bit
  { label: "ax", detail: "16-bit", doc: "Low 16 bits of rax" },
  { label: "bx", detail: "16-bit", doc: "Low 16 bits of rbx" },
  { label: "cx", detail: "16-bit", doc: "Low 16 bits of rcx" },
  { label: "dx", detail: "16-bit", doc: "Low 16 bits of rdx" },
  { label: "si", detail: "16-bit", doc: "Low 16 bits of rsi" },
  { label: "di", detail: "16-bit", doc: "Low 16 bits of rdi" },
  { label: "sp", detail: "16-bit", doc: "Low 16 bits of rsp" },
  { label: "bp", detail: "16-bit", doc: "Low 16 bits of rbp" },
  // 8-bit
  { label: "al",  detail: "8-bit low",  doc: "Low byte of rax" },
  { label: "bl",  detail: "8-bit low",  doc: "Low byte of rbx" },
  { label: "cl",  detail: "8-bit low",  doc: "Low byte of rcx (shift count operand)" },
  { label: "dl",  detail: "8-bit low",  doc: "Low byte of rdx" },
  { label: "sil", detail: "8-bit",      doc: "Low byte of rsi" },
  { label: "dil", detail: "8-bit",      doc: "Low byte of rdi" },
  { label: "bpl", detail: "8-bit",      doc: "Low byte of rbp" },
  { label: "spl", detail: "8-bit",      doc: "Low byte of rsp" },
  { label: "ah",  detail: "8-bit high", doc: "Bits 8-15 of rax" },
  { label: "bh",  detail: "8-bit high", doc: "Bits 8-15 of rbx" },
  { label: "ch",  detail: "8-bit high", doc: "Bits 8-15 of rcx" },
  { label: "dh",  detail: "8-bit high", doc: "Bits 8-15 of rdx" },
  // Special purpose
  { label: "rip",    detail: "instruction pointer", doc: "Points to next instruction (read-only via lea)" },
  { label: "eip",    detail: "instruction pointer", doc: "32-bit instruction pointer" },
  { label: "rflags", detail: "flags",               doc: "CPU flags (CF, ZF, SF, OF, PF, DF...)" },
  { label: "eflags", detail: "flags",               doc: "32-bit flags" },
  // Segment
  { label: "cs", detail: "segment", doc: "Code segment" },
  { label: "ds", detail: "segment", doc: "Data segment" },
  { label: "es", detail: "segment", doc: "Extra segment" },
  { label: "fs", detail: "segment", doc: "FS segment (TLS base on Linux)" },
  { label: "gs", detail: "segment", doc: "GS segment (TLS base on Windows)" },
  { label: "ss", detail: "segment", doc: "Stack segment" },
  // SSE/AVX — xmm0-15, ymm0-7, zmm0-7
  ...Array.from({ length: 16 }, (_, i) => ({
    label: `xmm${i}`, detail: "128-bit SSE", doc: `XMM register ${i} — 128-bit scalar/packed`,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    label: `ymm${i}`, detail: "256-bit AVX", doc: `YMM register ${i} — 256-bit AVX`,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    label: `zmm${i}`, detail: "512-bit AVX-512", doc: `ZMM register ${i} — 512-bit AVX-512`,
  })),
  // ARM64
  ...Array.from({ length: 31 }, (_, i) => ({
    label: `x${i}`, detail: "ARM64 64-bit", doc: `ARM64 general-purpose register X${i}`,
  })),
  ...Array.from({ length: 16 }, (_, i) => ({
    label: `w${i}`, detail: "ARM64 32-bit", doc: `ARM64 32-bit view of X${i}`,
  })),
  { label: "xzr", detail: "ARM64 zero",  doc: "Zero register 64-bit (reads 0, discards writes)" },
  { label: "wzr", detail: "ARM64 zero",  doc: "Zero register 32-bit" },
  { label: "lr",  detail: "ARM64 link",  doc: "Link register (X30) — return address on bl" },
  { label: "fp",  detail: "ARM64 frame", doc: "Frame pointer (X29)" },
  { label: "pc",  detail: "ARM64 pc",    doc: "Program counter" },
];

// ── Assembly directives ───────────────────────────────────────────────────────

const ASM_DIRECTIVES = [
  { label: "section",   detail: "section .name",    doc: "Begin named section" },
  { label: "segment",   detail: "segment .name",    doc: "Begin named segment (NASM)" },
  { label: ".text",     detail: "section",          doc: "Switch to code section" },
  { label: ".data",     detail: "section",          doc: "Switch to initialized data section" },
  { label: ".bss",      detail: "section",          doc: "Switch to uninitialized data section" },
  { label: ".rodata",   detail: "section",          doc: "Switch to read-only data section" },
  { label: "global",    detail: "global sym",       doc: "Export symbol (NASM)" },
  { label: ".global",   detail: ".global sym",      doc: "Export symbol (GAS)" },
  { label: ".globl",    detail: ".globl sym",       doc: "Export symbol (GAS alias)" },
  { label: "extern",    detail: "extern sym",       doc: "Import external symbol (NASM)" },
  { label: ".extern",   detail: ".extern sym",      doc: "Import external symbol (GAS)" },
  { label: "db",        detail: "db val[, ...]",    doc: "Define byte(s)" },
  { label: "dw",        detail: "dw val",           doc: "Define word (2 bytes)" },
  { label: "dd",        detail: "dd val",           doc: "Define dword (4 bytes)" },
  { label: "dq",        detail: "dq val",           doc: "Define qword (8 bytes)" },
  { label: ".byte",     detail: ".byte val",        doc: "Define byte (GAS)" },
  { label: ".word",     detail: ".word val",        doc: "Define 2 bytes (GAS)" },
  { label: ".long",     detail: ".long val",        doc: "Define 4 bytes (GAS)" },
  { label: ".quad",     detail: ".quad val",        doc: "Define 8 bytes (GAS)" },
  { label: ".ascii",    detail: '.ascii "str"',     doc: "String without null terminator" },
  { label: ".asciz",    detail: '.asciz "str"',     doc: "Null-terminated string" },
  { label: ".string",   detail: '.string "str"',    doc: "Null-terminated string (alias)" },
  { label: ".space",    detail: ".space n",         doc: "Reserve n zero bytes" },
  { label: ".zero",     detail: ".zero n",          doc: "Emit n zero bytes" },
  { label: ".fill",     detail: ".fill n, sz, val", doc: "Fill n items of size sz with val" },
  { label: ".align",    detail: ".align n",         doc: "Align to 2^n boundary (GAS)" },
  { label: "align",     detail: "align n",          doc: "Align to n-byte boundary (NASM)" },
  { label: "alignb",    detail: "alignb n",         doc: "Align in BSS (NASM)" },
  { label: "equ",       detail: "name equ val",     doc: "Define a constant (NASM)" },
  { label: ".set",      detail: ".set name, val",   doc: "Define a constant (GAS)" },
  { label: ".equ",      detail: ".equ name, val",   doc: "Define a constant (GAS)" },
  { label: "times",     detail: "times n ...",      doc: "Repeat directive N times (NASM)" },
  { label: "resb",      detail: "resb n",           doc: "Reserve n bytes (NASM BSS)" },
  { label: "resw",      detail: "resw n",           doc: "Reserve n words" },
  { label: "resd",      detail: "resd n",           doc: "Reserve n dwords" },
  { label: "resq",      detail: "resq n",           doc: "Reserve n qwords" },
  { label: "bits",      detail: "bits 64",          doc: "Set output bit mode (NASM)" },
  { label: "BITS",      detail: "BITS 64",          doc: "Set output bit mode uppercase (NASM)" },
  { label: "use32",     detail: "use32",            doc: "32-bit mode" },
  { label: "use64",     detail: "use64",            doc: "64-bit mode" },
  { label: ".if",       detail: ".if expr",         doc: "Conditional assembly" },
  { label: ".else",     detail: ".else",            doc: "Else branch" },
  { label: ".endif",    detail: ".endif",           doc: "End conditional" },
  { label: ".macro",    detail: ".macro name args", doc: "Define macro" },
  { label: ".endm",     detail: ".endm",            doc: "End macro definition" },
  { label: ".type",     detail: ".type sym, @type", doc: "Set symbol type (GAS)" },
  { label: ".size",     detail: ".size sym, expr",  doc: "Set symbol size (GAS)" },
  { label: "proc",      detail: "proc",             doc: "Begin procedure (MASM)" },
  { label: "endp",      detail: "endp",             doc: "End procedure (MASM)" },
];

const ASM_SIZE_SPECIFIERS = [
  { label: "byte ptr",    detail: "size", doc: "1-byte memory operand" },
  { label: "word ptr",    detail: "size", doc: "2-byte memory operand" },
  { label: "dword ptr",   detail: "size", doc: "4-byte memory operand" },
  { label: "qword ptr",   detail: "size", doc: "8-byte memory operand" },
  { label: "xmmword ptr", detail: "size", doc: "16-byte (SSE) memory operand" },
  { label: "ymmword ptr", detail: "size", doc: "32-byte (AVX) memory operand" },
  { label: "zmmword ptr", detail: "size", doc: "64-byte (AVX-512) memory operand" },
];

// ── C / C++ keyword + type tables ────────────────────────────────────────────

const C_KEYWORDS = [
  "if","else","for","while","do","switch","case","default","break","continue",
  "return","goto","sizeof","typeof","alignof","alignas","_Alignof","_Alignas",
  "struct","union","enum","typedef","static","extern","auto","register",
  "const","volatile","restrict","inline","_Noreturn","_Static_assert",
  "void","char","short","int","long","float","double","signed","unsigned",
  "_Bool","_Complex","_Thread_local","_Atomic",
].map(k => ({ label: k, detail: "keyword", doc: `C keyword` }));

const CPP_KEYWORDS = [
  "class","namespace","template","typename","virtual","override","final",
  "public","protected","private","friend","operator","new","delete","this",
  "try","catch","throw","noexcept","explicit","mutable","constexpr",
  "consteval","constinit","static_assert","decltype","using","nullptr",
  "bool","true","false","and","or","not","xor","bitand","bitor",
  "concept","requires","co_await","co_return","co_yield","export","import","module",
].map(k => ({ label: k, detail: "C++ keyword", doc: `C++ keyword` }));

const C_TYPES = [
  { label: "uint8_t",   detail: "type <stdint.h>",  doc: "Unsigned 8-bit integer" },
  { label: "uint16_t",  detail: "type <stdint.h>",  doc: "Unsigned 16-bit integer" },
  { label: "uint32_t",  detail: "type <stdint.h>",  doc: "Unsigned 32-bit integer" },
  { label: "uint64_t",  detail: "type <stdint.h>",  doc: "Unsigned 64-bit integer" },
  { label: "int8_t",    detail: "type <stdint.h>",  doc: "Signed 8-bit integer" },
  { label: "int16_t",   detail: "type <stdint.h>",  doc: "Signed 16-bit integer" },
  { label: "int32_t",   detail: "type <stdint.h>",  doc: "Signed 32-bit integer" },
  { label: "int64_t",   detail: "type <stdint.h>",  doc: "Signed 64-bit integer" },
  { label: "uintptr_t", detail: "type <stdint.h>",  doc: "Unsigned pointer-width integer" },
  { label: "intptr_t",  detail: "type <stdint.h>",  doc: "Signed pointer-width integer" },
  { label: "size_t",    detail: "type <stddef.h>",  doc: "Unsigned size type (sizeof result)" },
  { label: "ssize_t",   detail: "type <sys/types.h>",doc:"Signed size type (read/write return)" },
  { label: "ptrdiff_t", detail: "type <stddef.h>",  doc: "Pointer subtraction result type" },
  { label: "off_t",     detail: "type <sys/types.h>",doc:"File offset type" },
  { label: "pid_t",     detail: "type <sys/types.h>",doc:"Process ID type" },
  { label: "uid_t",     detail: "type <sys/types.h>",doc:"User ID type" },
  { label: "gid_t",     detail: "type <sys/types.h>",doc:"Group ID type" },
  { label: "FILE",      detail: "type <stdio.h>",   doc: "Opaque file stream type" },
  { label: "NULL",      detail: "macro <stddef.h>", doc: "Null pointer constant ((void*)0)" },
  { label: "bool",      detail: "type <stdbool.h>", doc: "Boolean type" },
  { label: "true",      detail: "macro <stdbool.h>",doc: "Boolean true (1)" },
  { label: "false",     detail: "macro <stdbool.h>",doc: "Boolean false (0)" },
  { label: "EOF",       detail: "macro <stdio.h>",  doc: "End-of-file sentinel (-1)" },
  { label: "va_list",   detail: "type <stdarg.h>",  doc: "Variadic argument list type" },
];

const C_FUNCTIONS = [
  // Memory
  { label: "malloc",    detail: "void* malloc(size_t n)",               doc: "Allocate n uninitialized bytes" },
  { label: "calloc",    detail: "void* calloc(size_t n, size_t sz)",    doc: "Allocate n×sz zero-initialized bytes" },
  { label: "realloc",   detail: "void* realloc(void* p, size_t n)",     doc: "Resize allocation to n bytes" },
  { label: "free",      detail: "void free(void* p)",                   doc: "Release heap allocation" },
  { label: "memcpy",    detail: "void* memcpy(dst, src, n)",            doc: "Copy n bytes (no overlap)" },
  { label: "memmove",   detail: "void* memmove(dst, src, n)",           doc: "Copy n bytes (overlap-safe)" },
  { label: "memset",    detail: "void* memset(ptr, c, n)",              doc: "Fill n bytes with value c" },
  { label: "memcmp",    detail: "int memcmp(a, b, n)",                  doc: "Compare n bytes of two buffers" },
  { label: "memchr",    detail: "void* memchr(ptr, c, n)",              doc: "Find byte c in first n bytes" },
  // String
  { label: "strlen",    detail: "size_t strlen(const char* s)",         doc: "Length of string (not counting \\0)" },
  { label: "strcpy",    detail: "char* strcpy(dst, src)",               doc: "Copy string — no bounds check, unsafe" },
  { label: "strncpy",   detail: "char* strncpy(dst, src, n)",           doc: "Copy at most n chars (may not NUL-terminate)" },
  { label: "strlcpy",   detail: "size_t strlcpy(dst, src, sz)",        doc: "Safe string copy (always NUL-terminates)" },
  { label: "strcat",    detail: "char* strcat(dst, src)",               doc: "Concatenate (unsafe)" },
  { label: "strncat",   detail: "char* strncat(dst, src, n)",           doc: "Concatenate at most n chars" },
  { label: "strcmp",    detail: "int strcmp(a, b)",                     doc: "Compare strings (<0, 0, >0)" },
  { label: "strncmp",   detail: "int strncmp(a, b, n)",                doc: "Compare at most n chars" },
  { label: "strcasecmp",detail: "int strcasecmp(a, b)",                doc: "Case-insensitive string compare" },
  { label: "strchr",    detail: "char* strchr(s, c)",                  doc: "Find first occurrence of char" },
  { label: "strrchr",   detail: "char* strrchr(s, c)",                 doc: "Find last occurrence of char" },
  { label: "strstr",    detail: "char* strstr(haystack, needle)",       doc: "Find first occurrence of substring" },
  { label: "strtok",    detail: "char* strtok(s, delim)",              doc: "Tokenize string (not thread-safe)" },
  { label: "strtol",    detail: "long strtol(s, endptr, base)",        doc: "String to long with error detection" },
  { label: "strtoul",   detail: "unsigned long strtoul(s, endptr, base)",doc: "String to unsigned long" },
  { label: "strtoll",   detail: "long long strtoll(s, endptr, base)",  doc: "String to long long" },
  { label: "atoi",      detail: "int atoi(const char* s)",             doc: "String to int (no error check)" },
  { label: "atol",      detail: "long atol(const char* s)",            doc: "String to long" },
  // I/O
  { label: "printf",    detail: "int printf(const char* fmt, ...)",    doc: "Print formatted text to stdout" },
  { label: "fprintf",   detail: "int fprintf(FILE* f, fmt, ...)",      doc: "Print formatted text to stream" },
  { label: "sprintf",   detail: "int sprintf(char* buf, fmt, ...)",    doc: "Format into buffer (unsafe, no bounds)" },
  { label: "snprintf",  detail: "int snprintf(buf, n, fmt, ...)",      doc: "Format into buffer, at most n-1 chars" },
  { label: "vprintf",   detail: "int vprintf(fmt, va_list)",           doc: "printf with va_list" },
  { label: "vsnprintf", detail: "int vsnprintf(buf, n, fmt, va_list)", doc: "snprintf with va_list" },
  { label: "scanf",     detail: "int scanf(const char* fmt, ...)",     doc: "Read formatted from stdin" },
  { label: "sscanf",    detail: "int sscanf(const char* s, fmt, ...)", doc: "Read formatted from string" },
  { label: "fscanf",    detail: "int fscanf(FILE* f, fmt, ...)",       doc: "Read formatted from stream" },
  { label: "puts",      detail: "int puts(const char* s)",             doc: "Print string + newline to stdout" },
  { label: "putchar",   detail: "int putchar(int c)",                  doc: "Print single char to stdout" },
  { label: "getchar",   detail: "int getchar(void)",                   doc: "Read single char from stdin" },
  { label: "fgets",     detail: "char* fgets(buf, n, FILE* f)",        doc: "Read line, at most n-1 chars (safe)" },
  { label: "fputs",     detail: "int fputs(const char* s, FILE* f)",   doc: "Write string to stream" },
  { label: "fopen",     detail: "FILE* fopen(path, mode)",             doc: "Open file stream (\"r\",\"w\",\"rb\"...)" },
  { label: "fclose",    detail: "int fclose(FILE* f)",                 doc: "Flush and close stream" },
  { label: "fread",     detail: "size_t fread(ptr, sz, n, FILE* f)",   doc: "Read n items of sz bytes" },
  { label: "fwrite",    detail: "size_t fwrite(ptr, sz, n, FILE* f)",  doc: "Write n items of sz bytes" },
  { label: "fseek",     detail: "int fseek(FILE* f, off, whence)",     doc: "Set stream position" },
  { label: "ftell",     detail: "long ftell(FILE* f)",                 doc: "Get stream position" },
  { label: "rewind",    detail: "void rewind(FILE* f)",                doc: "Reset stream to beginning" },
  { label: "feof",      detail: "int feof(FILE* f)",                   doc: "Test end-of-file indicator" },
  { label: "ferror",    detail: "int ferror(FILE* f)",                 doc: "Test error indicator" },
  { label: "perror",    detail: "void perror(const char* s)",          doc: "Print error message from errno" },
  // Process / stdlib
  { label: "exit",      detail: "void exit(int code)",                 doc: "Flush buffers and terminate" },
  { label: "_exit",     detail: "void _exit(int code)",                doc: "Terminate without flushing" },
  { label: "abort",     detail: "void abort(void)",                    doc: "Abnormal termination (SIGABRT)" },
  { label: "atexit",    detail: "int atexit(void (*f)(void))",         doc: "Register exit handler" },
  { label: "system",    detail: "int system(const char* cmd)",         doc: "Execute shell command" },
  { label: "getenv",    detail: "char* getenv(const char* name)",      doc: "Get environment variable" },
  { label: "setenv",    detail: "int setenv(name, value, overwrite)",  doc: "Set environment variable" },
  { label: "rand",      detail: "int rand(void)",                      doc: "Pseudo-random integer [0, RAND_MAX]" },
  { label: "srand",     detail: "void srand(unsigned seed)",           doc: "Seed PRNG" },
  { label: "qsort",     detail: "void qsort(base, n, sz, cmp)",       doc: "Sort array in-place" },
  { label: "bsearch",   detail: "void* bsearch(key, base, n, sz, cmp)",doc:"Binary search sorted array" },
  // POSIX
  { label: "open",      detail: "int open(path, flags[, mode])",       doc: "Open file → fd" },
  { label: "close",     detail: "int close(int fd)",                   doc: "Close file descriptor" },
  { label: "read",      detail: "ssize_t read(fd, buf, count)",        doc: "Read from fd" },
  { label: "write",     detail: "ssize_t write(fd, buf, count)",       doc: "Write to fd" },
  { label: "lseek",     detail: "off_t lseek(fd, offset, whence)",     doc: "Reposition fd read/write offset" },
  { label: "dup",       detail: "int dup(int fd)",                     doc: "Duplicate file descriptor" },
  { label: "dup2",      detail: "int dup2(int oldfd, int newfd)",      doc: "Duplicate fd to specific number" },
  { label: "pipe",      detail: "int pipe(int pipefd[2])",             doc: "Create unidirectional pipe" },
  { label: "mmap",      detail: "void* mmap(addr,len,prot,flags,fd,off)",doc: "Map file/anonymous memory" },
  { label: "munmap",    detail: "int munmap(void* addr, size_t len)",  doc: "Unmap memory region" },
  { label: "mprotect",  detail: "int mprotect(addr, len, prot)",       doc: "Change memory protection" },
  { label: "mlock",     detail: "int mlock(const void* addr, size_t len)",doc:"Lock pages in RAM" },
  { label: "fork",      detail: "pid_t fork(void)",                    doc: "Clone process (returns 0 in child)" },
  { label: "execve",    detail: "int execve(path, argv[], envp[])",    doc: "Replace process image" },
  { label: "execvp",    detail: "int execvp(file, argv[])",            doc: "Execute with PATH search" },
  { label: "waitpid",   detail: "pid_t waitpid(pid, &status, opts)",   doc: "Wait for child process state" },
  { label: "kill",      detail: "int kill(pid_t pid, int sig)",        doc: "Send signal to process" },
  { label: "getpid",    detail: "pid_t getpid(void)",                  doc: "Get current process ID" },
  { label: "getppid",   detail: "pid_t getppid(void)",                 doc: "Get parent process ID" },
  { label: "getuid",    detail: "uid_t getuid(void)",                  doc: "Get real user ID" },
  { label: "geteuid",   detail: "uid_t geteuid(void)",                 doc: "Get effective user ID" },
  { label: "setuid",    detail: "int setuid(uid_t uid)",               doc: "Set user identity" },
  { label: "socket",    detail: "int socket(domain, type, proto)",     doc: "Create socket endpoint" },
  { label: "connect",   detail: "int connect(fd, addr, addrlen)",      doc: "Initiate connection on socket" },
  { label: "bind",      detail: "int bind(fd, addr, addrlen)",         doc: "Bind name to socket" },
  { label: "listen",    detail: "int listen(fd, backlog)",             doc: "Mark socket as passive" },
  { label: "accept",    detail: "int accept(fd, addr, &addrlen)",      doc: "Accept incoming connection" },
  { label: "send",      detail: "ssize_t send(fd, buf, len, flags)",   doc: "Send data on connected socket" },
  { label: "recv",      detail: "ssize_t recv(fd, buf, len, flags)",   doc: "Receive data from socket" },
  { label: "sendto",    detail: "ssize_t sendto(fd,buf,len,flags,addr,alen)",doc:"Send datagram" },
  { label: "recvfrom",  detail: "ssize_t recvfrom(fd,buf,len,flags,addr,&alen)",doc:"Receive datagram" },
  { label: "setsockopt",detail: "int setsockopt(fd,level,optname,optval,optlen)",doc:"Set socket option" },
  { label: "getsockopt",detail: "int getsockopt(fd,level,optname,optval,&optlen)",doc:"Get socket option" },
  { label: "ioctl",     detail: "int ioctl(fd, request, ...)",         doc: "Device-specific control" },
  { label: "fcntl",     detail: "int fcntl(fd, cmd, ...)",             doc: "File descriptor control" },
  { label: "ptrace",    detail: "long ptrace(request, pid, addr, data)",doc: "Process tracing and debugging" },
  { label: "prctl",     detail: "int prctl(option, arg2, ...)",        doc: "Process control operations" },
  { label: "seccomp",   detail: "int seccomp(operation, flags, args)", doc: "Restrict process syscalls" },
  { label: "usleep",    detail: "int usleep(useconds_t usec)",         doc: "Sleep for usec microseconds" },
  { label: "sleep",     detail: "unsigned int sleep(unsigned int sec)", doc: "Sleep for sec seconds" },
  { label: "alarm",     detail: "unsigned int alarm(unsigned int sec)", doc: "Schedule SIGALRM" },
  { label: "signal",    detail: "sighandler_t signal(int sig, handler)",doc: "Install signal handler" },
  { label: "sigaction", detail: "int sigaction(sig, &act, &oldact)",   doc: "Examine/change signal action" },
  // Misc stdlib
  { label: "assert",    detail: "void assert(expr)",                   doc: "Abort if expression is false" },
  { label: "strerror",  detail: "char* strerror(int errnum)",          doc: "Error message string for errno" },
  { label: "errno",     detail: "int errno",                           doc: "Last error number (thread-local)" },
];

const C_MACROS = [
  { label: "STDIN_FILENO",   detail: "macro <unistd.h>",  doc: "fd 0 — standard input" },
  { label: "STDOUT_FILENO",  detail: "macro <unistd.h>",  doc: "fd 1 — standard output" },
  { label: "STDERR_FILENO",  detail: "macro <unistd.h>",  doc: "fd 2 — standard error" },
  { label: "EXIT_SUCCESS",   detail: "macro <stdlib.h>",  doc: "0 — successful exit code" },
  { label: "EXIT_FAILURE",   detail: "macro <stdlib.h>",  doc: "1 — failure exit code" },
  { label: "INT_MAX",        detail: "macro <limits.h>",  doc: "Maximum value of int (2³¹-1)" },
  { label: "INT_MIN",        detail: "macro <limits.h>",  doc: "Minimum value of int (-2³¹)" },
  { label: "UINT_MAX",       detail: "macro <limits.h>",  doc: "Maximum unsigned int (2³²-1)" },
  { label: "LONG_MAX",       detail: "macro <limits.h>",  doc: "Maximum long value" },
  { label: "LLONG_MAX",      detail: "macro <limits.h>",  doc: "Maximum long long (2⁶³-1)" },
  { label: "SIZE_MAX",       detail: "macro <stdint.h>",  doc: "Maximum size_t value" },
  { label: "PTRDIFF_MAX",    detail: "macro <stddef.h>",  doc: "Maximum pointer difference" },
  { label: "RAND_MAX",       detail: "macro <stdlib.h>",  doc: "Maximum value from rand()" },
  // mmap flags
  { label: "PROT_READ",      detail: "macro <sys/mman.h>",doc: "Pages are readable" },
  { label: "PROT_WRITE",     detail: "macro <sys/mman.h>",doc: "Pages are writable" },
  { label: "PROT_EXEC",      detail: "macro <sys/mman.h>",doc: "Pages are executable" },
  { label: "PROT_NONE",      detail: "macro <sys/mman.h>",doc: "No access" },
  { label: "MAP_ANONYMOUS",  detail: "macro <sys/mman.h>",doc: "Not backed by file (use fd=-1)" },
  { label: "MAP_ANON",       detail: "macro <sys/mman.h>",doc: "Alias for MAP_ANONYMOUS" },
  { label: "MAP_PRIVATE",    detail: "macro <sys/mman.h>",doc: "Copy-on-write mapping" },
  { label: "MAP_SHARED",     detail: "macro <sys/mman.h>",doc: "Shared mapping" },
  { label: "MAP_FIXED",      detail: "macro <sys/mman.h>",doc: "Use exact address (dangerous)" },
  { label: "MAP_FAILED",     detail: "macro <sys/mman.h>",doc: "mmap error sentinel ((void*)-1)" },
  // open flags
  { label: "O_RDONLY",       detail: "macro <fcntl.h>",   doc: "Open read-only" },
  { label: "O_WRONLY",       detail: "macro <fcntl.h>",   doc: "Open write-only" },
  { label: "O_RDWR",         detail: "macro <fcntl.h>",   doc: "Open read-write" },
  { label: "O_CREAT",        detail: "macro <fcntl.h>",   doc: "Create file if absent" },
  { label: "O_TRUNC",        detail: "macro <fcntl.h>",   doc: "Truncate file to zero length" },
  { label: "O_APPEND",       detail: "macro <fcntl.h>",   doc: "Writes always go to end" },
  { label: "O_NONBLOCK",     detail: "macro <fcntl.h>",   doc: "Non-blocking I/O" },
  { label: "O_CLOEXEC",      detail: "macro <fcntl.h>",   doc: "Close fd on exec" },
  // socket
  { label: "AF_INET",        detail: "macro <sys/socket.h>",doc: "IPv4 address family" },
  { label: "AF_INET6",       detail: "macro <sys/socket.h>",doc: "IPv6 address family" },
  { label: "AF_UNIX",        detail: "macro <sys/socket.h>",doc: "Unix domain socket" },
  { label: "SOCK_STREAM",    detail: "macro <sys/socket.h>",doc: "TCP reliable stream" },
  { label: "SOCK_DGRAM",     detail: "macro <sys/socket.h>",doc: "UDP datagram" },
  { label: "SOCK_RAW",       detail: "macro <sys/socket.h>",doc: "Raw socket" },
  { label: "SOL_SOCKET",     detail: "macro <sys/socket.h>",doc: "Socket-level option layer" },
  { label: "SO_REUSEADDR",   detail: "macro <sys/socket.h>",doc: "Allow reuse of local address" },
  { label: "SO_REUSEPORT",   detail: "macro <sys/socket.h>",doc: "Allow reuse of local port" },
  { label: "IPPROTO_TCP",    detail: "macro <netinet/in.h>",doc: "TCP protocol" },
  { label: "IPPROTO_UDP",    detail: "macro <netinet/in.h>",doc: "UDP protocol" },
  { label: "INADDR_ANY",     detail: "macro <netinet/in.h>",doc: "Bind to all interfaces (0.0.0.0)" },
  { label: "INADDR_LOOPBACK",detail: "macro <netinet/in.h>",doc: "Loopback address (127.0.0.1)" },
  // signals
  { label: "SIGKILL",  detail: "macro <signal.h>", doc: "Kill signal (9) — cannot be caught" },
  { label: "SIGTERM",  detail: "macro <signal.h>", doc: "Termination request (15)" },
  { label: "SIGSEGV",  detail: "macro <signal.h>", doc: "Segmentation fault (11)" },
  { label: "SIGCHLD",  detail: "macro <signal.h>", doc: "Child status change (17)" },
  { label: "SIGINT",   detail: "macro <signal.h>", doc: "Interrupt from keyboard (Ctrl-C) (2)" },
  { label: "SIGALRM",  detail: "macro <signal.h>", doc: "Timer alarm (14)" },
  { label: "SIGUSR1",  detail: "macro <signal.h>", doc: "User-defined signal 1 (10)" },
  { label: "SIGUSR2",  detail: "macro <signal.h>", doc: "User-defined signal 2 (12)" },
  { label: "SIG_IGN",  detail: "macro <signal.h>", doc: "Ignore signal handler" },
  { label: "SIG_DFL",  detail: "macro <signal.h>", doc: "Default signal handler" },
  // ptrace
  { label: "PTRACE_ATTACH",    detail: "macro <sys/ptrace.h>",doc: "Attach to running process" },
  { label: "PTRACE_DETACH",    detail: "macro <sys/ptrace.h>",doc: "Detach from tracee" },
  { label: "PTRACE_PEEKDATA",  detail: "macro <sys/ptrace.h>",doc: "Read word from tracee memory" },
  { label: "PTRACE_POKEDATA",  detail: "macro <sys/ptrace.h>",doc: "Write word to tracee memory" },
  { label: "PTRACE_GETREGS",   detail: "macro <sys/ptrace.h>",doc: "Read general-purpose registers" },
  { label: "PTRACE_SETREGS",   detail: "macro <sys/ptrace.h>",doc: "Write general-purpose registers" },
  { label: "PTRACE_CONT",      detail: "macro <sys/ptrace.h>",doc: "Continue tracee execution" },
  { label: "PTRACE_SINGLESTEP",detail: "macro <sys/ptrace.h>",doc: "Single-step one instruction" },
  // waitpid status macros
  { label: "WIFEXITED",    detail: "macro <sys/wait.h>",doc: "True if child exited normally" },
  { label: "WEXITSTATUS",  detail: "macro <sys/wait.h>",doc: "Get exit status (if WIFEXITED)" },
  { label: "WIFSIGNALED",  detail: "macro <sys/wait.h>",doc: "True if child killed by signal" },
  { label: "WTERMSIG",     detail: "macro <sys/wait.h>",doc: "Get terminating signal number" },
  { label: "WIFSTOPPED",   detail: "macro <sys/wait.h>",doc: "True if child is stopped" },
  { label: "WNOHANG",      detail: "macro <sys/wait.h>",doc: "Don't block if no child changed state" },
];

// ── Python tables ─────────────────────────────────────────────────────────────

const PY_BUILTINS = [
  { label: "print",       detail: "builtin", doc: "Print objects to stdout" },
  { label: "len",         detail: "builtin", doc: "Number of items in a container" },
  { label: "range",       detail: "builtin", doc: "Immutable integer sequence" },
  { label: "enumerate",   detail: "builtin", doc: "Add index to iterable → (i, val) pairs" },
  { label: "zip",         detail: "builtin", doc: "Parallel iteration over multiple iterables" },
  { label: "map",         detail: "builtin", doc: "Apply function to every item" },
  { label: "filter",      detail: "builtin", doc: "Filter items by predicate" },
  { label: "sorted",      detail: "builtin", doc: "Return new sorted list" },
  { label: "reversed",    detail: "builtin", doc: "Return reverse iterator" },
  { label: "list",        detail: "builtin", doc: "Mutable ordered sequence" },
  { label: "dict",        detail: "builtin", doc: "Mutable key-value mapping" },
  { label: "set",         detail: "builtin", doc: "Unordered unique-item collection" },
  { label: "tuple",       detail: "builtin", doc: "Immutable ordered sequence" },
  { label: "str",         detail: "builtin", doc: "Unicode string type" },
  { label: "int",         detail: "builtin", doc: "Integer type (arbitrary precision)" },
  { label: "float",       detail: "builtin", doc: "IEEE 754 double-precision float" },
  { label: "bool",        detail: "builtin", doc: "Boolean: True or False" },
  { label: "bytes",       detail: "builtin", doc: "Immutable byte string" },
  { label: "bytearray",   detail: "builtin", doc: "Mutable byte string" },
  { label: "memoryview",  detail: "builtin", doc: "Memory view over buffer protocol" },
  { label: "open",        detail: "builtin", doc: "Open file and return stream" },
  { label: "type",        detail: "builtin", doc: "Get type of object" },
  { label: "isinstance",  detail: "builtin", doc: "Check if object is instance of type" },
  { label: "issubclass",  detail: "builtin", doc: "Check subclass relationship" },
  { label: "hasattr",     detail: "builtin", doc: "Check if attribute exists" },
  { label: "getattr",     detail: "builtin", doc: "Get attribute by name" },
  { label: "setattr",     detail: "builtin", doc: "Set attribute by name" },
  { label: "delattr",     detail: "builtin", doc: "Delete attribute" },
  { label: "dir",         detail: "builtin", doc: "List names in scope / object attributes" },
  { label: "vars",        detail: "builtin", doc: "Return __dict__ of object" },
  { label: "globals",     detail: "builtin", doc: "Return current global namespace dict" },
  { label: "locals",      detail: "builtin", doc: "Return current local namespace dict" },
  { label: "id",          detail: "builtin", doc: "Unique identity (memory address) of object" },
  { label: "hash",        detail: "builtin", doc: "Hash value of object" },
  { label: "hex",         detail: "builtin", doc: "Integer to '0x...' hex string" },
  { label: "oct",         detail: "builtin", doc: "Integer to '0o...' octal string" },
  { label: "bin",         detail: "builtin", doc: "Integer to '0b...' binary string" },
  { label: "abs",         detail: "builtin", doc: "Absolute value" },
  { label: "max",         detail: "builtin", doc: "Maximum of iterable / arguments" },
  { label: "min",         detail: "builtin", doc: "Minimum of iterable / arguments" },
  { label: "sum",         detail: "builtin", doc: "Sum of iterable" },
  { label: "any",         detail: "builtin", doc: "True if any element is truthy" },
  { label: "all",         detail: "builtin", doc: "True if all elements are truthy" },
  { label: "chr",         detail: "builtin", doc: "Integer code point → character string" },
  { label: "ord",         detail: "builtin", doc: "Character → code point integer" },
  { label: "repr",        detail: "builtin", doc: "Canonical string representation of object" },
  { label: "format",      detail: "builtin", doc: "Format value using format spec" },
  { label: "input",       detail: "builtin", doc: "Read line from stdin (strips trailing newline)" },
  { label: "exec",        detail: "builtin", doc: "Execute Python code string or code object" },
  { label: "eval",        detail: "builtin", doc: "Evaluate expression string" },
  { label: "compile",     detail: "builtin", doc: "Compile source to code object" },
  { label: "super",       detail: "builtin", doc: "Proxy for parent class" },
  { label: "object",      detail: "builtin", doc: "Base class of all new-style classes" },
  { label: "property",    detail: "builtin", doc: "Descriptor for managed attributes" },
  { label: "staticmethod",detail: "builtin", doc: "Convert to static method" },
  { label: "classmethod", detail: "builtin", doc: "Convert to class method" },
  { label: "next",        detail: "builtin", doc: "Get next item from iterator" },
  { label: "iter",        detail: "builtin", doc: "Get iterator from iterable" },
  { label: "callable",    detail: "builtin", doc: "True if object appears callable" },
  { label: "divmod",      detail: "builtin", doc: "Return (quotient, remainder) tuple" },
  { label: "pow",         detail: "builtin", doc: "pow(base, exp[, mod])" },
  { label: "round",       detail: "builtin", doc: "Round to n decimal places" },
  { label: "slice",       detail: "builtin", doc: "Slice object for subscript notation" },
  { label: "NotImplemented",detail:"builtin",doc: "Sentinel: operation not implemented" },
  { label: "Ellipsis",    detail: "builtin", doc: "The ... literal object" },
  { label: "__name__",    detail: "builtin", doc: "'__main__' when run directly" },
  { label: "__file__",    detail: "builtin", doc: "Path to current module file" },
  { label: "__doc__",     detail: "builtin", doc: "Module/function/class docstring" },
];

const PY_KEYWORDS = [
  "if","elif","else","for","while","try","except","finally","with",
  "def","class","return","yield","import","from","as","pass","break",
  "continue","raise","lambda","and","or","not","in","is","del",
  "global","nonlocal","assert","async","await","True","False","None",
  "match","case",
].map(k => ({ label: k, detail: "keyword", doc: `Python keyword` }));

const PY_PWNTOOLS = [
  { label: "p8",              detail: "pwntools",  doc: "Pack 1-byte integer (little-endian by default)" },
  { label: "p16",             detail: "pwntools",  doc: "Pack 2-byte integer" },
  { label: "p32",             detail: "pwntools",  doc: "Pack 4-byte integer" },
  { label: "p64",             detail: "pwntools",  doc: "Pack 8-byte integer" },
  { label: "u8",              detail: "pwntools",  doc: "Unpack 1-byte integer from bytes" },
  { label: "u16",             detail: "pwntools",  doc: "Unpack 2-byte integer" },
  { label: "u32",             detail: "pwntools",  doc: "Unpack 4-byte integer" },
  { label: "u64",             detail: "pwntools",  doc: "Unpack 8-byte integer" },
  { label: "ELF",             detail: "pwntools",  doc: "Load and analyze ELF binary: ELF('./vuln')" },
  { label: "ROP",             detail: "pwntools",  doc: "Build ROP chain: ROP(elf)" },
  { label: "process",         detail: "pwntools",  doc: "Spawn local process: process('./bin')" },
  { label: "remote",          detail: "pwntools",  doc: "TCP connection: remote('host', port)" },
  { label: "listen",          detail: "pwntools",  doc: "TCP listener: listen(port)" },
  { label: "context",         detail: "pwntools",  doc: "Global settings: context.arch, context.os..." },
  { label: "log",             detail: "pwntools",  doc: "Logging: log.info(), log.success(), log.error()" },
  { label: "cyclic",          detail: "pwntools",  doc: "De Bruijn sequence: cyclic(n)" },
  { label: "cyclic_find",     detail: "pwntools",  doc: "Find offset of pattern: cyclic_find(value)" },
  { label: "flat",            detail: "pwntools",  doc: "Flatten list of ints/bytes: flat([0x41, p64(x)])" },
  { label: "fit",             detail: "pwntools",  doc: "Payload with offset dict: fit({0x10: b'A'})" },
  { label: "asm",             detail: "pwntools",  doc: "Assemble instructions: asm('xor rax, rax')" },
  { label: "disasm",          detail: "pwntools",  doc: "Disassemble bytes: disasm(b'\\x90')" },
  { label: "shellcraft",      detail: "pwntools",  doc: "Shellcode generator: shellcraft.sh()" },
  { label: "fmtstr_payload",  detail: "pwntools",  doc: "Format string write payload: fmtstr_payload(offset, {addr: val})" },
  { label: "enhex",           detail: "pwntools",  doc: "Bytes to hex string: enhex(b'\\x41')" },
  { label: "unhex",           detail: "pwntools",  doc: "Hex string to bytes: unhex('4142')" },
  { label: "xor",             detail: "pwntools",  doc: "XOR bytes: xor(b'data', b'key')" },
  { label: "gdb",             detail: "pwntools",  doc: "GDB integration: gdb.attach(proc)" },
  { label: "pause",           detail: "pwntools",  doc: "Wait for keypress (debug helper)" },
  { label: "interactive",     detail: "pwntools",  doc: "Drop to interactive shell: io.interactive()" },
  { label: "sendline",        detail: "pwntools",  doc: "Send data + newline: io.sendline(b'data')" },
  { label: "sendlineafter",   detail: "pwntools",  doc: "Wait then send: io.sendlineafter(delim, data)" },
  { label: "send",            detail: "pwntools",  doc: "Send raw data: io.send(b'data')" },
  { label: "recvline",        detail: "pwntools",  doc: "Receive one line: io.recvline()" },
  { label: "recvuntil",       detail: "pwntools",  doc: "Receive until delimiter: io.recvuntil(b':')" },
  { label: "recv",            detail: "pwntools",  doc: "Receive n bytes: io.recv(n)" },
  { label: "recvall",         detail: "pwntools",  doc: "Receive until EOF: io.recvall()" },
  { label: "clean",           detail: "pwntools",  doc: "Discard buffered data: io.clean()" },
  { label: "make_packer",     detail: "pwntools",  doc: "Create custom pack function" },
  { label: "pack",            detail: "pwntools",  doc: "Pack integer with current context" },
  { label: "unpack",          detail: "pwntools",  doc: "Unpack bytes with current context" },
  { label: "b64e",            detail: "pwntools",  doc: "Base64 encode" },
  { label: "b64d",            detail: "pwntools",  doc: "Base64 decode" },
  { label: "rot13",           detail: "pwntools",  doc: "ROT13 string" },
  { label: "ncat",            detail: "pwntools",  doc: "netcat-style connection" },
  { label: "ssh",             detail: "pwntools",  doc: "SSH connection: ssh('user', 'host')" },
];

// ── Document symbol extraction ───────────────────────────────────────────────

function extractAsmLabels(model: Monaco.editor.ITextModel): string[] {
  const lines = model.getValue().split("\n");
  const labels = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*:/);
    if (m && !m[1].startsWith(".")) labels.add(m[1]);
    // local labels (.Lname:)
    const ml = line.match(/^\s*(\.[a-zA-Z_][a-zA-Z0-9_.]*)\s*:/);
    if (ml) labels.add(ml[1]);
  }
  return [...labels];
}

function extractCSymbols(model: Monaco.editor.ITextModel) {
  const text = model.getValue();
  const out: { name: string; kind: "function" | "variable" | "type" }[] = [];
  const seen = new Set<string>();
  const add = (name: string, kind: "function" | "variable" | "type") => {
    if (!seen.has(name)) { seen.add(name); out.push({ name, kind }); }
  };
  let m: RegExpExecArray | null;
  const funcRe = /\b(?:void|int|char|long|short|float|double|size_t|ssize_t|uint\w+|int\w+|bool|__\w+)\s+\**\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const typeRe = /\btypedef\s+(?:struct|union|enum)?\s*\w*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g;
  const defineRe = /^#define\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  const structRe = /\bstruct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/g;
  while ((m = funcRe.exec(text)) !== null) add(m[1], "function");
  while ((m = typeRe.exec(text)) !== null) add(m[1], "type");
  while ((m = defineRe.exec(text)) !== null) add(m[1], "variable");
  while ((m = structRe.exec(text)) !== null) add(m[1], "type");
  return out;
}

function extractPySymbols(model: Monaco.editor.ITextModel) {
  const text = model.getValue();
  const out: { name: string; kind: "function" | "class" | "variable" }[] = [];
  const seen = new Set<string>();
  const add = (name: string, kind: "function" | "class" | "variable") => {
    if (!seen.has(name)) { seen.add(name); out.push({ name, kind }); }
  };
  let m: RegExpExecArray | null;
  const defRe   = /^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm;
  const classRe = /^class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:(]/gm;
  const varRe   = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm;
  while ((m = defRe.exec(text)) !== null) add(m[1], "function");
  while ((m = classRe.exec(text)) !== null) add(m[1], "class");
  while ((m = varRe.exec(text)) !== null) {
    if (!["if","else","for","while","True","False","None"].includes(m[1])) add(m[1], "variable");
  }
  return out;
}

// ── ASM context detection ─────────────────────────────────────────────────────

type AsmCtx = "instruction" | "operand" | "directive";

function detectAsmContext(line: string, column: number): AsmCtx {
  const before = line.slice(0, column - 1);
  const trimmed = before.trimStart();

  // Inside a comment — irrelevant
  if (/^[;#]|\/\//.test(trimmed)) return "instruction";

  // Typing a directive (starts with dot)
  if (/^\.[a-zA-Z]*$/.test(trimmed)) return "directive";

  // Nothing typed yet (blank / only whitespace) → instruction position
  if (trimmed === "") return "instruction";

  // First word has been completed (space or comma follows) → operand
  if (/^[a-zA-Z_][a-zA-Z0-9_]*[\s,]/.test(trimmed)) return "operand";

  // Single word, no space yet → still typing instruction
  return "instruction";
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerIntelligentComplete(monaco: typeof Monaco) {
  const K = monaco.languages.CompletionItemKind;

  function range(model: Monaco.editor.ITextModel, position: Monaco.IPosition): Monaco.IRange {
    const w = model.getWordUntilPosition(position);
    return {
      startLineNumber: position.lineNumber,
      endLineNumber:   position.lineNumber,
      startColumn:     w.startColumn,
      endColumn:       w.endColumn,
    };
  }

  // ── Assembly (asm + nasm) ──────────────────────────────────────────────────
  for (const lang of ["asm", "nasm"] as const) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: [" ", "\t", ",", "."],

      provideCompletionItems(model, position) {
        const r    = range(model, position);
        const line = model.getLineContent(position.lineNumber);
        const ctx  = detectAsmContext(line, position.column);
        const items: Monaco.languages.CompletionItem[] = [];

        if (ctx === "operand") {
          // Registers — highest priority in operand position
          for (const reg of ASM_REGISTERS) {
            items.push({
              label: reg.label,
              kind: K.Variable,
              detail: `reg  ${reg.detail}`,
              documentation: { value: reg.doc },
              insertText: reg.label,
              range: r,
              sortText: `0${reg.label}`,
            });
          }
          // Size specifiers
          for (const s of ASM_SIZE_SPECIFIERS) {
            items.push({
              label: s.label,
              kind: K.Keyword,
              detail: s.detail,
              documentation: { value: s.doc },
              insertText: s.label,
              range: r,
              sortText: `1${s.label}`,
            });
          }
          // Labels defined in this file (jump targets, call targets)
          for (const lbl of extractAsmLabels(model)) {
            items.push({
              label: lbl,
              kind: K.Reference,
              detail: "label",
              documentation: { value: "Label defined in this file" },
              insertText: lbl,
              range: r,
              sortText: `2${lbl}`,
            });
          }
        } else if (ctx === "directive") {
          for (const d of ASM_DIRECTIVES) {
            items.push({
              label: d.label,
              kind: K.Keyword,
              detail: d.detail,
              documentation: { value: d.doc },
              insertText: d.label,
              range: r,
              sortText: `0${d.label}`,
            });
          }
        } else {
          // Instruction position — show instructions, directives, and labels
          for (const instr of ASM_INSTRUCTIONS) {
            items.push({
              label: instr.label,
              kind: K.Keyword,
              detail: instr.detail,
              documentation: { value: instr.doc },
              insertText: instr.label,
              range: r,
              sortText: `0${instr.label}`,
            });
          }
          for (const d of ASM_DIRECTIVES) {
            items.push({
              label: d.label,
              kind: K.Keyword,
              detail: d.detail,
              documentation: { value: d.doc },
              insertText: d.label,
              range: r,
              sortText: `1${d.label}`,
            });
          }
          for (const lbl of extractAsmLabels(model)) {
            items.push({
              label: lbl,
              kind: K.Reference,
              detail: "label",
              documentation: { value: "Label defined in this file" },
              insertText: lbl,
              range: r,
              sortText: `2${lbl}`,
            });
          }
        }

        return { suggestions: items };
      },
    });
  }

  // ── C / C++ ────────────────────────────────────────────────────────────────
  for (const lang of ["c", "cpp"] as const) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: [".", ">", "#", "("],

      provideCompletionItems(model, position) {
        const r = range(model, position);
        const items: Monaco.languages.CompletionItem[] = [];

        // File symbols first (sort 0xx)
        for (const sym of extractCSymbols(model)) {
          items.push({
            label: sym.name,
            kind: sym.kind === "function" ? K.Function
                : sym.kind === "type"     ? K.Class
                :                           K.Variable,
            detail: `${sym.kind}  (this file)`,
            documentation: { value: "Symbol defined in this file" },
            insertText: sym.name,
            range: r,
            sortText: `0${sym.name}`,
          });
        }

        // Standard library functions (sort 1xx)
        for (const fn of C_FUNCTIONS) {
          items.push({
            label: fn.label,
            kind: K.Function,
            detail: fn.detail,
            documentation: { value: fn.doc },
            insertText: fn.label,
            range: r,
            sortText: `1${fn.label}`,
          });
        }

        // Types (sort 2xx)
        for (const t of C_TYPES) {
          items.push({
            label: t.label,
            kind: K.TypeParameter,
            detail: t.detail,
            documentation: { value: t.doc },
            insertText: t.label,
            range: r,
            sortText: `2${t.label}`,
          });
        }

        // Macros / constants (sort 2xx)
        for (const m of C_MACROS) {
          items.push({
            label: m.label,
            kind: K.Constant,
            detail: m.detail,
            documentation: { value: m.doc },
            insertText: m.label,
            range: r,
            sortText: `2${m.label}`,
          });
        }

        // Keywords (sort 3xx — lower priority than identifiers)
        const keywords = lang === "cpp" ? [...C_KEYWORDS, ...CPP_KEYWORDS] : C_KEYWORDS;
        for (const kw of keywords) {
          items.push({
            label: kw.label,
            kind: K.Keyword,
            detail: kw.detail,
            documentation: { value: kw.doc },
            insertText: kw.label,
            range: r,
            sortText: `3${kw.label}`,
          });
        }

        return { suggestions: items };
      },
    });
  }

  // ── Python ────────────────────────────────────────────────────────────────
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", "(", " ", "=", ","],

    provideCompletionItems(model, position) {
      const r = range(model, position);
      const items: Monaco.languages.CompletionItem[] = [];

      // File symbols first
      for (const sym of extractPySymbols(model)) {
        items.push({
          label: sym.name,
          kind: sym.kind === "function" ? K.Function
              : sym.kind === "class"    ? K.Class
              :                           K.Variable,
          detail: `${sym.kind}  (this file)`,
          documentation: { value: "Defined in this file" },
          insertText: sym.name,
          range: r,
          sortText: `0${sym.name}`,
        });
      }

      // pwntools (sort 1xx — exploit context is primary)
      for (const p of PY_PWNTOOLS) {
        items.push({
          label: p.label,
          kind: K.Function,
          detail: p.detail,
          documentation: { value: p.doc },
          insertText: p.label,
          range: r,
          sortText: `1${p.label}`,
        });
      }

      // Builtins (sort 2xx)
      for (const b of PY_BUILTINS) {
        items.push({
          label: b.label,
          kind: K.Function,
          detail: b.detail,
          documentation: { value: b.doc },
          insertText: b.label,
          range: r,
          sortText: `2${b.label}`,
        });
      }

      // Keywords (sort 3xx)
      for (const kw of PY_KEYWORDS) {
        items.push({
          label: kw.label,
          kind: K.Keyword,
          detail: kw.detail,
          documentation: { value: kw.doc },
          insertText: kw.label,
          range: r,
          sortText: `3${kw.label}`,
        });
      }

      return { suggestions: items };
    },
  });
}
