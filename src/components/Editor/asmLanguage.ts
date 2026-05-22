import type * as Monaco from "monaco-editor";

// x86-64 / ARM64 Assembly language definition for Monaco
export function registerAsmLanguage(monaco: typeof Monaco) {
  monaco.languages.register({ id: "asm", aliases: ["Assembly", "asm", "nasm", "gas"] });
  monaco.languages.register({ id: "nasm", aliases: ["NASM"] });

  const tokenizer: Monaco.languages.IMonarchLanguage = {
    defaultToken: "source",
    ignoreCase: true,

    registers: [
      // x86-64 GPR
      "rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp",
      "r8","r9","r10","r11","r12","r13","r14","r15",
      "eax","ebx","ecx","edx","esi","edi","ebp","esp",
      "r8d","r9d","r10d","r11d","r12d","r13d","r14d","r15d",
      "ax","bx","cx","dx","si","di","bp","sp",
      "al","bl","cl","dl","sil","dil","bpl","spl",
      "ah","bh","ch","dh",
      // Instruction pointer / flags
      "rip","eip","ip","rflags","eflags","flags",
      // Segment registers
      "cs","ds","es","fs","gs","ss",
      // SSE/AVX
      "xmm0","xmm1","xmm2","xmm3","xmm4","xmm5","xmm6","xmm7",
      "xmm8","xmm9","xmm10","xmm11","xmm12","xmm13","xmm14","xmm15",
      "ymm0","ymm1","ymm2","ymm3","ymm4","ymm5","ymm6","ymm7",
      "zmm0","zmm1","zmm2","zmm3","zmm4","zmm5","zmm6","zmm7",
      // ARM64
      "x0","x1","x2","x3","x4","x5","x6","x7",
      "x8","x9","x10","x11","x12","x13","x14","x15",
      "x16","x17","x18","x19","x20","x21","x22","x23",
      "x24","x25","x26","x27","x28","x29","x30",
      "w0","w1","w2","w3","w4","w5","w6","w7",
      "w8","w9","w10","w11","w12","w13","w14","w15",
      "sp","xzr","wzr","lr","fp","pc",
    ],

    keywords: [
      // Data movement
      "mov","movq","movl","movw","movb","movsx","movzx","movsxd",
      "lea","xchg","xadd","cmpxchg","bswap",
      "push","pop","pusha","popa","pushf","popf",
      // Arithmetic
      "add","sub","mul","imul","div","idiv","inc","dec","neg",
      "adc","sbb","and","or","xor","not","shl","shr","sal","sar",
      "rol","ror","rcl","rcr","bt","bts","btr","btc",
      // Compare / test
      "cmp","test",
      // Jumps
      "jmp","je","jne","jz","jnz","jg","jge","jl","jle",
      "ja","jae","jb","jbe","jo","jno","js","jns","jp","jnp",
      "jcxz","jecxz","jrcxz","loop","loope","loopne",
      // Call / ret
      "call","ret","retn","retf","iret","iretd","iretq",
      "int","int3","into","syscall","sysret","sysexit","sysenter",
      // String ops
      "rep","repe","repz","repne","repnz",
      "movsb","movsw","movsd","movsq",
      "cmpsb","cmpsw","cmpsd","cmpsq",
      "scasb","scasw","scasd","scasq",
      "lodsb","lodsw","lodsd","lodsq",
      "stosb","stosw","stosd","stosq",
      // Misc
      "nop","hlt","cpuid","rdtsc","rdtscp","rdmsr","wrmsr",
      "lfence","mfence","sfence","pause","ud2","clc","stc","cmc",
      "cli","sti","cld","std",
      // ARM64 instructions
      "ldr","ldrb","ldrh","ldrsb","ldrsh","ldrsw",
      "str","strb","strh","ldp","stp",
      "adrp","adr","bl","blr","br","b",
      "cbz","cbnz","tbz","tbnz",
      "svc","mrs","msr","eret",
    ],

    directives: [
      "section","segment","global","extern","bits","use32","use64",
      "db","dw","dd","dq","dt","do","dy","dz",
      "resb","resw","resd","resq","rest",
      "equ","times","align","alignb",
      ".text",".data",".bss",".rodata",".section",
      ".global",".extern",".align",".byte",".word",".long",".quad",
      ".ascii",".asciz",".string",".space",".fill",".zero",
      ".if",".else",".endif",".macro",".endm",
      "proc","endp","struct","ends",
    ],

    tokenizer: {
      root: [
        // Comments
        [/;.*$/, "comment"],
        [/#.*$/, "comment"],
        [/\/\/.*$/, "comment"],
        // Labels
        [/^\s*[a-zA-Z_][a-zA-Z0-9_]*:/, "type.identifier"],
        [/\.[a-zA-Z_][a-zA-Z0-9_]*:/, "type.identifier"],
        // Directives
        [/\.(text|data|bss|rodata|section|global|extern|align|byte|word|long|quad|ascii|asciz|string|space|fill|zero|if|else|endif|macro|endm|type|size|set|equ|globl|weak|hidden|protected|local)\b/, "keyword.control"],
        [/\b(section|segment|global|extern|bits|use32|use64|db|dw|dd|dq|dt|times|align|alignb|equ|resb|resw|resd|resq|proc|endp|struct|ends)\b/, "keyword.control"],
        // Registers
        [
          /\b(rax|rbx|rcx|rdx|rsi|rdi|rbp|rsp|r(?:[89]|1[0-5])|eax|ebx|ecx|edx|esi|edi|ebp|esp|ax|bx|cx|dx|si|di|bp|sp|al|bl|cl|dl|ah|bh|ch|dh|sil|dil|bpl|spl|rip|eip|rflags|eflags|[cdefgs]s|[xyz]mm(?:[0-9]|1[0-5])|x(?:[0-9]|[12][0-9]|30)|w(?:[0-9]|[12][0-9])|xzr|wzr|lr|fp|pc)\b/,
          "variable",
        ],
        // Numbers: hex, binary, octal, decimal
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/0[bB][01]+/, "number"],
        [/0[oO][0-7]+/, "number"],
        [/\b\d+\b/, "number"],
        // Strings
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/`([^`\\]|\\.)*`/, "string"],
        // Instructions / keywords
        [
          /\b(mov[a-z]*|lea|xchg|xadd|cmpxchg|bswap|push|pop[a-z]*|add|sub|mul|imul|div|idiv|inc|dec|neg|adc|sbb|and|or|xor|not|sh[lr]|sa[lr]|ro[lr]|rc[lr]|bt[src]?|cmp|test|j[a-z]+|call|ret[a-z]*|iret[a-z]*|int[a-z0-9]*|syscall|sysret|sysexit|sysenter|rep[a-z]*|movs[a-z]|cmps[a-z]|scas[a-z]|lods[a-z]|stos[a-z]|nop|hlt|cpuid|rdtsc[a-z]*|rdmsr|wrmsr|[lm]fence|sfence|pause|ud2|cl[ccs]|st[ccs]|cm[dc]|cli|sti|ldr[a-z]*|str[a-z]*|ldp|stp|adrp|adr|bl[r]?|cbz|cbnz|tbz|tbnz|svc|mrs|msr|eret|b[a-z]*)\b/,
          "keyword",
        ],
        // Size specifiers
        [/\b(byte|word|dword|qword|ptr|short|near|far|[xyz]mmword)\b/, "type"],
        // Brackets and punctuation
        [/[[\]]/, "delimiter.bracket"],
        [/[{}]/, "delimiter.curly"],
        [/[()]/, "delimiter.parenthesis"],
        [/[,+\-*/%&|^~]/, "operators"],
        // Identifiers
        [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
        // Whitespace
        { include: "@whitespace" },
      ],
      whitespace: [
        [/[ \t\r\n]+/, "white"],
      ],
    },
  };

  monaco.languages.setMonarchTokensProvider("asm", tokenizer);
  monaco.languages.setMonarchTokensProvider("nasm", tokenizer);

  // Basic language config
  const langConfig: Monaco.languages.LanguageConfiguration = {
    comments: { lineComment: ";" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };

  monaco.languages.setLanguageConfiguration("asm", langConfig);
  monaco.languages.setLanguageConfiguration("nasm", langConfig);
}
