import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";

interface Technique {
  name: string;
  description: string;
  detail?: string;
  os?: string[];
  tags?: string[];
  example?: string;
}

interface Category {
  id: string;
  label: string;
  color: string;
  techniques: Technique[];
}

const BYPASS_DATA: Category[] = [
  {
    id: "dep",
    label: "DEP / NX Bypass",
    color: "text-orange-400 border-orange-500/30",
    techniques: [
      {
        name: "ret2libc",
        os: ["linux", "windows"],
        description: "Return into libc/ntdll functions instead of shellcode to bypass non-executable stack.",
        detail: "Chain: system('/bin/sh') — find /bin/sh string in libc, pop-ret gadget for argument setup, then call system(). Works without ASLR or with a known libc base.",
        tags: ["stack", "x86", "classic"],
        example: "payload = b'A'*offset + p32(system_addr) + p32(exit_addr) + p32(binsh_addr)",
      },
      {
        name: "ret2plt",
        os: ["linux"],
        description: "Call PLT stub to invoke a libc function with controlled arguments.",
        detail: "The PLT entry resolves the real function on first call. No need to know the libc base — only the binary's PLT address (no ASLR on binary). Leaks libc base when combined with puts/printf.",
        tags: ["stack", "pie-bypass"],
        example: "payload = b'A'*offset + p64(puts_plt) + p64(pop_rdi_ret) + p64(got_addr) + p64(main)",
      },
      {
        name: "ret2plt + GOT leak",
        os: ["linux"],
        description: "Leak a GOT entry via puts/printf to calculate libc base, then call system().",
        tags: ["aslr-bypass", "2-stage"],
        example: "# Stage 1: leak puts@got → calculate libc base\n# Stage 2: ret2system with computed address",
      },
      {
        name: "ROP chain (mprotect)",
        os: ["linux"],
        description: "Use mprotect() gadgets to mark the stack or a data region executable, then jump to shellcode.",
        detail: "Requires a writable+executable page or stack. Chain: pop rdi ; pop rsi ; pop rdx ; ret → mprotect(page, size, PROT_RWX) → jmp shellcode.",
        tags: ["stack", "x86-64", "shellcode"],
        example: "chain  = rop.ret()  # stack align\nchain += rop.call('mprotect', page, 0x1000, 7)\nchain += p64(shellcode_addr)",
      },
      {
        name: "ROP chain (VirtualProtect)",
        os: ["windows"],
        description: "Call VirtualProtect() via ROP to mark payload memory as PAGE_EXECUTE_READWRITE.",
        detail: "Typical WinExploit chain: set up args on stack → call VirtualProtect(shellcode_addr, size, PAGE_EXECUTE_READWRITE, &oldProtect) → return to shellcode.",
        tags: ["windows", "stack", "x86-64"],
        example: "# Set up stack frame for VirtualProtect then jump to shellcode",
      },
      {
        name: "JIT Spray",
        os: ["windows", "linux"],
        description: "Abuse JIT engines (JS, Flash, PDF) to spray predictable executable memory with embedded shellcode.",
        tags: ["browser", "heap", "advanced"],
      },
    ],
  },
  {
    id: "aslr",
    label: "ASLR Bypass",
    color: "text-blue-400 border-blue-500/30",
    techniques: [
      {
        name: "Information leak",
        os: ["linux", "windows"],
        description: "Use a format-string, use-after-free, or out-of-bounds read to leak a pointer and calculate base addresses.",
        detail: "Common leaks: stack address (via %p/%x format), heap pointer (via UAF), binary base (via &main leak), libc base (via GOT/stack pointer).",
        tags: ["universal", "prerequisite"],
        example: "# printf format string: %p.%p.%p...\n# Calculate: libc_base = leaked_ptr - offset_of_leaked_symbol_in_libc",
      },
      {
        name: "Partial overwrite",
        os: ["linux"],
        description: "Overwrite only the low bytes of a return address to redirect control within a known module page.",
        detail: "ASLR randomises the high bits of addresses but the low 12 bits (page offset) are fixed. A 1-2 byte overwrite can redirect within a fixed page offset. Useful when a write primitive is byte-limited.",
        tags: ["x86-64", "narrow-write"],
      },
      {
        name: "Heap spray",
        os: ["linux", "windows", "osx"],
        description: "Fill heap with NOPs + shellcode so that any address in a large range hits the payload.",
        detail: "Works when attacker controls memory allocation size and content. Combine with info leak for reliable targeting. Less effective with modern mitigations.",
        tags: ["heap", "browser"],
      },
      {
        name: "ret2text / ret2win",
        os: ["linux"],
        description: "Return to an existing function in the binary (no ASLR effect on non-PIE). No address leak needed.",
        detail: "If the binary is not PIE, .text addresses are fixed. Win function, system wrappers, or useful code paths can be called directly.",
        tags: ["ctf", "non-pie"],
        example: "payload = b'A'*offset + p64(win_function)",
      },
      {
        name: "BROP (Blind ROP)",
        os: ["linux"],
        description: "Remotely bruteforce and discover gadget addresses in a forked server process with ASLR.",
        detail: "Works against services that fork (address space preserved across connections). Steps: find stop/crash gadgets → find ROP gadgets → find PLT → leak GOT → ret2libc.",
        tags: ["advanced", "remote", "forked-server"],
      },
      {
        name: "Stack pivot",
        os: ["linux", "windows"],
        description: "Use xchg/mov/leave gadgets to move RSP to a controlled buffer, then continue ROP from there.",
        detail: "Useful when original stack overwrite is small. Pivot: xchg rsp, rax ; ret — then rax points to your fake stack with the real ROP chain.",
        tags: ["x86-64", "advanced"],
        example: "# Find: xchg rsp, rax ; ret\n# Set rax = fake_stack_addr before reaching pivot",
      },
    ],
  },
  {
    id: "canary",
    label: "Stack Canary Bypass",
    color: "text-green-400 border-green-500/30",
    techniques: [
      {
        name: "Canary leak via format string",
        os: ["linux", "windows"],
        description: "Use a format-string vulnerability to print the canary value from the stack, then include it in the overflow payload.",
        example: "# printf offset to canary: %23$p  (depends on frame)\n# Then: payload = b'A'*offset + p64(canary) + p64(rbp) + p64(ret_addr)",
        tags: ["format-string"],
      },
      {
        name: "Canary bruteforce",
        os: ["linux"],
        description: "In a forked server, bruteforce the canary byte-by-byte (256 attempts per byte × 8 bytes = 2048 max attempts).",
        detail: "Since fork() preserves the address space, the canary is the same across child processes. Each wrong byte causes SIGABRT; right byte continues. Works on x86 and x86-64.",
        tags: ["forked-server", "bruteforce"],
      },
      {
        name: "Off-by-one to partial overwrite",
        os: ["linux"],
        description: "A single null byte overwrite (off-by-one) can corrupt the LSB of saved RBP without touching the canary.",
        tags: ["off-by-one", "subtle"],
      },
    ],
  },
  {
    id: "pie",
    label: "PIE / KASLR Bypass",
    color: "text-purple-400 border-purple-500/30",
    techniques: [
      {
        name: "PIE leak via read primitive",
        os: ["linux"],
        description: "Read an address from .got.plt or a function pointer to reveal the binary base (base = leaked - static_offset).",
        tags: ["read-primitive"],
      },
      {
        name: "KASLR via /proc/kallsyms",
        os: ["linux"],
        description: "On misconfigured kernels, /proc/kallsyms exposes all kernel symbols including the kernel base.",
        detail: "cat /proc/kallsyms | grep ' T startup_64' — if entries are non-zero, KASLR is off or you have root. With perf_event_open(CAP_SYS_PERF or unprivileged) can also leak.",
        tags: ["kernel", "lpe"],
        example: "# check: head /proc/kallsyms — non-zero addresses = leakable",
      },
      {
        name: "Side-channel timing (Spectre-class)",
        os: ["linux", "windows"],
        description: "Use CPU microarchitectural side channels (cache timing, TSX, etc.) to leak KASLR base.",
        tags: ["advanced", "hardware", "kernel"],
      },
    ],
  },
  {
    id: "cfg",
    label: "CFG / CFI Bypass",
    color: "text-red-400 border-red-500/30",
    techniques: [
      {
        name: "Valid target hijack (CFG)",
        os: ["windows"],
        description: "Windows CFG validates indirect call targets. Hijack a CFG-valid target (e.g. ntdll export) to redirect execution.",
        detail: "CFG maintains a bitmap of valid indirect call targets. All ntdll/kernel32 exports are valid. Hijack a vtable or function pointer to point to an existing export, then arrange arguments.",
        tags: ["windows", "advanced"],
      },
      {
        name: "Shadow stack bypass (CET)",
        os: ["windows", "linux"],
        description: "Intel CET shadow stack protects return addresses. Bypass requires a write primitive to corrupt the shadow stack, or use allowed control flows.",
        tags: ["advanced", "hardware"],
      },
      {
        name: "Ret2reg",
        os: ["linux"],
        description: "Return to a register that points to your shellcode (jmp rax, call rsp etc.) when CFI doesn't cover all registers.",
        tags: ["x86", "shellcode"],
        example: "# Find: jmp rax ; or call rsp ;\n# Ensure register points to shellcode before reaching gadget",
      },
    ],
  },
];

function TechniqueCard({ t }: { t: Technique }) {
  const [open, setOpen] = useState(false);

  const copyExample = () => {
    if (t.example) navigator.clipboard.writeText(t.example).catch(() => {});
  };

  const openInEditor = () => {
    if (!t.example) return;
    window.dispatchEvent(new CustomEvent("nullforge:open-file", {
      detail: { name: t.name.replace(/\s+/g, "_") + ".py", language: "python", content: t.example },
    }));
  };

  return (
    <div className="border border-border rounded mb-1 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-elevated transition-colors text-left"
      >
        {open ? <ChevronDown size={10} className="text-text-dim flex-shrink-0" /> : <ChevronRight size={10} className="text-text-dim flex-shrink-0" />}
        <span className="font-mono text-[10px] text-text-primary flex-1">{t.name}</span>
        <div className="flex gap-1 flex-shrink-0">
          {t.os?.map((o) => (
            <span key={o} className={`text-[8px] px-1 py-px rounded border ${
              o === "windows" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              o === "linux"   ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
              o === "osx"     ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
              "bg-gray-500/10 text-gray-400 border-gray-500/20"
            }`}>{o}</span>
          ))}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-border bg-bg-base/50">
          <p className="text-[10px] text-text-muted leading-snug mt-1.5">{t.description}</p>
          {t.detail && (
            <p className="text-[10px] text-text-dim leading-snug">{t.detail}</p>
          )}
          {t.tags && (
            <div className="flex gap-1 flex-wrap">
              {t.tags.map((tag) => (
                <span key={tag} className="text-[8px] px-1 py-px rounded bg-elevated text-text-dim border border-border">{tag}</span>
              ))}
            </div>
          )}
          {t.example && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-text-dim">Example</span>
                <div className="flex gap-1">
                  <button onClick={copyExample} className="flex items-center gap-0.5 text-[9px] text-text-dim hover:text-text-primary px-1 py-px rounded hover:bg-elevated">
                    <Copy size={8} /> copy
                  </button>
                  <button onClick={openInEditor} className="flex items-center gap-0.5 text-[9px] text-text-dim hover:text-text-primary px-1 py-px rounded hover:bg-elevated">
                    <ExternalLink size={8} /> editor
                  </button>
                </div>
              </div>
              <pre className="font-mono text-[9px] text-text-muted bg-elevated rounded p-1.5 whitespace-pre-wrap break-all leading-relaxed">
                {t.example}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BypassReference() {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["dep"]));

  function toggleCat(id: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs px-2 py-2 space-y-1">
      {BYPASS_DATA.map((cat) => (
        <div key={cat.id}>
          <button
            onClick={() => toggleCat(cat.id)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded border text-left mb-1 transition-colors ${cat.color} ${
              openCats.has(cat.id) ? "bg-elevated" : "hover:bg-elevated"
            }`}
          >
            {openCats.has(cat.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span className="font-semibold text-[10px]">{cat.label}</span>
            <span className="ml-auto text-[9px] text-text-dim">{cat.techniques.length}</span>
          </button>
          {openCats.has(cat.id) && (
            <div className="pl-2">
              {cat.techniques.map((t) => (
                <TechniqueCard key={t.name} t={t} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
