import {
  Bot,
  Bug,
  Cpu,
  Database,
  FileCode,
  FolderOpen,
  Globe,
  Hash,
  Layers,
  Plug,
  Plus,
  Search,
  Settings,
  Shield,
  Skull,
  Terminal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivePanel, BottomTab, useAppStore } from "../../store";
import type { Command, CommandCategory } from "./commands";

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: "File",
  view: "View",
  debug: "Debug",
  ai: "AI",
  shell: "Shell",
  exploit: "Exploit",
  tools: "Tools",
};

const CATEGORY_COLORS: Record<CommandCategory, string> = {
  file: "text-blue-400",
  view: "text-purple-400",
  debug: "text-amber-400",
  ai: "text-accent-red",
  shell: "text-accent-green",
  exploit: "text-orange-400",
  tools: "text-cyan-400",
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function fuzzyMatch(query: string, text: string): { score: number; ranges: [number, number][] } {
  if (!query) return { score: 1, ranges: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) {
    const i = t.indexOf(q);
    return { score: 100 - i, ranges: [[i, i + q.length]] };
  }
  // Character-by-character fuzzy
  let qi = 0;
  let score = 0;
  const ranges: [number, number][] = [];
  let runStart = -1;
  let lastMatch = -1;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (lastMatch === i - 1) {
        // extend run
      } else {
        if (runStart >= 0) ranges.push([runStart, lastMatch + 1]);
        runStart = i;
      }
      lastMatch = i;
      score += i === 0 ? 10 : t[i - 1] === " " ? 8 : 1;
      qi++;
    }
  }
  if (runStart >= 0) ranges.push([runStart, lastMatch + 1]);
  if (qi < q.length) return { score: -1, ranges: [] };
  return { score, ranges };
}

function HighlightedText({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <span>{text}</span>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    if (start > last) parts.push(<span key={last}>{text.slice(last, start)}</span>);
    parts.push(
      <span key={start} className="text-accent-red font-semibold">
        {text.slice(start, end)}
      </span>
    );
    last = end;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

function getCategoryIcon(cat: CommandCategory) {
  const cls = "flex-shrink-0 " + CATEGORY_COLORS[cat];
  switch (cat) {
    case "file":    return <FileCode size={14} className={cls} />;
    case "view":    return <Layers size={14} className={cls} />;
    case "debug":   return <Bug size={14} className={cls} />;
    case "ai":      return <Bot size={14} className={cls} />;
    case "shell":   return <Terminal size={14} className={cls} />;
    case "exploit": return <Skull size={14} className={cls} />;
    case "tools":   return <Hash size={14} className={cls} />;
  }
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const store = useAppStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = useMemo(
    () => buildCommands(store, onClose),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((cmd) => {
        const { score, ranges } = fuzzyMatch(query, cmd.label);
        return { cmd, score, ranges };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ ...r.cmd, _ranges: r.ranges }));
  }, [commands, query]);

  const run = useCallback(
    (cmd: Command) => {
      onClose();
      setQuery("");
      setSelected(0);
      cmd.action();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl overflow-hidden fade-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { onClose(); setQuery(""); }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((s) => Math.min(s + 1, filtered.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((s) => Math.max(s - 1, 0));
          }
          if (e.key === "Enter" && filtered[selected]) {
            run(filtered[selected] as Command);
          }
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          )}
          <kbd className="text-xs text-text-dim border border-border rounded px-1 py-0.5">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              No commands match "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => {
              const c = cmd as Command & { _ranges?: [number, number][] };
              return (
                <button
                  key={cmd.id}
                  onClick={() => run(cmd)}
                  onMouseEnter={() => setSelected(i)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left transition-colors
                    ${i === selected ? "bg-elevated" : "hover:bg-elevated/50"}
                  `}
                >
                  {getCategoryIcon(cmd.category)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">
                      <HighlightedText text={cmd.label} ranges={c._ranges ?? []} />
                    </div>
                    {cmd.description && (
                      <div className="text-xs text-text-muted truncate mt-0.5">
                        {cmd.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${CATEGORY_COLORS[cmd.category]}`}>
                      {CATEGORY_LABELS[cmd.category]}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="text-xs text-text-dim border border-border rounded px-1 py-0.5 hidden sm:block">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-base">
          <div className="flex items-center gap-3 text-xs text-text-dim">
            <span><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
            <span><kbd className="border border-border rounded px-1">↵</kbd> run</span>
            <span><kbd className="border border-border rounded px-1">esc</kbd> close</span>
          </div>
          <span className="text-xs text-text-dim">{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}

// ── Command definitions ────────────────────────────────────────────────────

type StoreSlice = ReturnType<typeof useAppStore.getState>;

function buildCommands(store: StoreSlice, onClose: () => void): Command[] {
  const {
    setActivePanel,
    openToolPanel,
    toggleSidebar,
    toggleAiPanel,
    toggleBottomPanel,
    setActiveBottomTab,
    openEditorTab,
    addShellSession,
    setActiveBottomTab: showBottom,
  } = store;

  function openPanel(id: ActivePanel) {
    return () => {
      setActivePanel(id);
      if (!store.sidebarOpen) toggleSidebar();
    };
  }

  function openTool(id: Parameters<typeof openToolPanel>[0]) {
    return () => { openToolPanel(id); onClose(); };
  }

  function newShell(name: string, type: "local" | "ssh" | "netcat") {
    return () => {
      const id = `shell-${Date.now()}`;
      addShellSession({ id, name, type, active: true });
      setActiveBottomTab("shell");
      if (!store.bottomPanelOpen) toggleBottomPanel();
    };
  }

  function openDemoFile(name: string, language: string, content: string) {
    return () => {
      openEditorTab({ id: name, name, language, content, dirty: false });
    };
  }

  return [
    // ── File ────────────────────────────────────────────────────────────
    {
      id: "file.new-python",
      label: "New Python Exploit",
      description: "Open a new Python exploit file in the editor",
      category: "file",
      shortcut: "",
      action: openDemoFile(
        "exploit.py",
        "python",
        "#!/usr/bin/env python3\nfrom pwn import *\n\n# Your exploit here\n"
      ),
    },
    {
      id: "file.new-c",
      label: "New C Exploit",
      description: "Open a new C PoC file",
      category: "file",
      action: openDemoFile(
        "exploit.c",
        "c",
        '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    // Your exploit\n    return 0;\n}\n'
      ),
    },
    {
      id: "file.new-asm",
      label: "New Assembly File",
      description: "Open a new x86-64 / ARM64 assembly file",
      category: "file",
      action: openDemoFile(
        "shellcode.asm",
        "asm",
        "; x86-64 shellcode\nBITS 64\nglobal _start\n_start:\n    nop\n"
      ),
    },
    {
      id: "file.new-rop",
      label: "New ROP Chain (Python)",
      description: "Open a new ROP chain script",
      category: "exploit",
      action: openDemoFile(
        "rop_chain.py",
        "python",
        "from pwn import *\n\nbinary = ELF('./vuln')\nrop    = ROP(binary)\n\n# Build chain here\n"
      ),
    },
    // ── View ────────────────────────────────────────────────────────────
    {
      id: "view.toggle-sidebar",
      label: "Toggle Sidebar",
      description: "Show or hide the left sidebar",
      category: "view",
      shortcut: "⌘B",
      action: () => toggleSidebar(),
    },
    {
      id: "view.toggle-ai",
      label: "Toggle AI Panel",
      description: "Show or hide the right AI chat panel",
      category: "view",
      shortcut: "⌘J",
      action: () => toggleAiPanel(),
    },
    {
      id: "view.toggle-bottom",
      label: "Toggle Bottom Panel",
      description: "Show or hide shell / debugger panel",
      category: "view",
      shortcut: "⌘`",
      action: () => toggleBottomPanel(),
    },
    {
      id: "view.explorer",
      label: "Show Explorer",
      description: "File tree and project browser",
      category: "view",
      action: openPanel("explorer"),
    },
    {
      id: "view.payloads",
      label: "Show Payload Library",
      category: "view",
      action: openPanel("payloads"),
    },
    {
      id: "view.exploitdb",
      label: "Show Exploit Database",
      category: "view",
      action: openPanel("exploitdb"),
    },
    {
      id: "view.disasm",
      label: "Show Disassembler",
      category: "view",
      action: openTool("disasm"),
    },
    {
      id: "view.debugger",
      label: "Show Debugger",
      category: "view",
      action: openTool("debugger"),
    },
    {
      id: "view.network",
      label: "Show Network Tools",
      category: "view",
      action: openTool("network"),
    },
    {
      id: "view.plugins",
      label: "Show Plugin Manager",
      category: "view",
      action: openTool("plugins"),
    },
    // ── Shell ────────────────────────────────────────────────────────────
    {
      id: "shell.new-local",
      label: "New Local Shell",
      description: "Open a new local bash/zsh session",
      category: "shell",
      action: newShell("bash", "local"),
    },
    {
      id: "shell.new-netcat",
      label: "New Netcat Listener",
      description: "Start a netcat reverse shell listener",
      category: "shell",
      action: newShell("nc listener", "netcat"),
    },
    {
      id: "shell.show",
      label: "Focus Shell Panel",
      category: "shell",
      shortcut: "⌘`",
      action: () => {
        showBottom("shell");
        if (!store.bottomPanelOpen) toggleBottomPanel();
      },
    },
    // ── Debug ────────────────────────────────────────────────────────────
    {
      id: "debug.show",
      label: "Show Debugger Panel",
      category: "debug",
      action: openTool("debugger"),
    },
    // ── AI ────────────────────────────────────────────────────────────
    {
      id: "ai.focus",
      label: "Focus AI Chat",
      description: "Open the AI assistant panel",
      category: "ai",
      shortcut: "⌘J",
      action: () => {
        if (!store.aiPanelOpen) toggleAiPanel();
      },
    },
    {
      id: "ai.analyze-file",
      label: "AI: Analyze Current File",
      description: "Send current file to AI for security analysis",
      category: "ai",
      action: () => {
        if (!store.aiPanelOpen) toggleAiPanel();
        // Phase 3: wire to AI context injection
      },
    },
    // ── Exploit ────────────────────────────────────────────────────────
    {
      id: "exploit.pattern-gen",
      label: "Generate Cyclic Pattern",
      description: "De Bruijn sequence for offset detection",
      category: "exploit",
      action: () => {
        openDemoFile(
          "cyclic.py",
          "python",
          "from pwn import *\n\nprint(cyclic(200).decode())\n# To find offset: cyclic_find(0xdeadbeef)\n"
        )();
      },
    },
    // ── Tools ────────────────────────────────────────────────────────
    {
      id: "tools.primitives",
      label: "Open Exploit Primitives",
      description: "Cyclic pattern, format string builder, one-gadget finder",
      category: "exploit",
      action: openTool("primitives"),
    },
    {
      id: "tools.timeline",
      label: "Open Exploit Timeline",
      description: "Log your exploit development progress chronologically",
      category: "exploit",
      action: openTool("timeline"),
    },
    {
      id: "tools.settings",
      label: "Open Settings",
      description: "Configure AI providers, keybindings, and appearance",
      category: "tools",
      shortcut: "⌘,",
      action: () => {
        openDemoFile(
          "settings",
          "yaml",
          "# NullForge Settings — Phase 8 UI coming soon\n# Edit ~/.nullforge/config.yml manually for now\n"
        )();
      },
    },
  ];
}
