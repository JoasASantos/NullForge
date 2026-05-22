import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Clock, FolderOpen, Loader, Microscope, Pin, Terminal, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { FunctionNav, type BinaryFunction } from "./FunctionNav";
import type { BinaryInfo, DisasmInstruction } from "./DisasmView";

// ─── Recent files ─────────────────────────────────────────────────────────────

const RECENT_KEY = "nullforge_recent_disasm";

interface RecentFile {
  path: string;
  name: string;
  lastOpened: string;
  pinned?: boolean;
}

function getRecent(): RecentFile[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as RecentFile[]; } catch { return []; }
}

function pushRecent(path: string) {
  const name = path.split(/[\\/]/).pop() || path;
  const existing = getRecent().filter((f) => f.path !== path);
  const updated = [{ path, name, lastOpened: new Date().toISOString() }, ...existing].slice(0, 15);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function togglePin(path: string) {
  const list = getRecent().map((f) => f.path === path ? { ...f, pinned: !f.pinned } : f);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function removeRecent(path: string) {
  const list = getRecent().filter((f) => f.path !== path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

type SideTab = "binary" | "shellcode";

const ARCH_OPTIONS = ["x86_64", "x86", "aarch64", "arm"] as const;
type Arch = (typeof ARCH_OPTIONS)[number];

// ─── Rust command return shapes ───────────────────────────────────────────────
// (Rust uses snake_case; Tauri serialises to camelCase by default on v2)

interface RustBinaryInfo {
  path: string;
  arch: string;
  format: string;
  entry_point: number;
  functions: Array<{ addr: number; name: string; size: number }>;
  sections: Array<{ name: string; addr: number; size: number; flags: string }>;
  strings: Array<{ addr: number; value: string; section: string }>;
  is_64bit: boolean;
}

interface RustInstruction {
  addr: number;
  hex: string;
  mnemonic: string;
  op_str: string;
  is_call: boolean;
  is_jump: boolean;
  is_ret: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adaptBinaryInfo(raw: RustBinaryInfo): BinaryInfo {
  return {
    path: raw.path,
    arch: raw.arch,
    format: raw.format,
    entry_point: raw.entry_point,
    functions: raw.functions,
    sections: raw.sections,
    strings: raw.strings,
    is_64bit: raw.is_64bit,
  };
}

function adaptInstructions(raw: RustInstruction[]): DisasmInstruction[] {
  return raw.map((i) => ({
    addr: i.addr,
    hex: i.hex,
    mnemonic: i.mnemonic,
    op_str: i.op_str,
    is_call: i.is_call,
    is_jump: i.is_jump,
    is_ret: i.is_ret,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DisasmSidePanel() {
  const [sideTab, setSideTab] = useState<SideTab>("binary");

  // Binary load state
  const [binaryPath, setBinaryPath] = useState("");
  const [loadingBinary, setLoadingBinary] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [binaryInfo, setBinaryInfo] = useState<BinaryInfo | null>(null);
  const [selectedFnAddr, setSelectedFnAddr] = useState<number | undefined>();
  const [recentOpen, setRecentOpen] = useState(false);
  const [recent, setRecent] = useState<RecentFile[]>(getRecent);
  const [crossOpen, setCrossOpen] = useState<{ path: string } | null>(null);

  // Listen for "open in disassembler" dispatched by Debugger
  useEffect(() => {
    const handler = (e: Event) => {
      const { binaryPath: path } = (e as CustomEvent<{ binaryPath: string }>).detail ?? {};
      if (path) handleLoadBinary(path);
    };
    window.addEventListener("nullforge:open-in-disassembler", handler);
    return () => window.removeEventListener("nullforge:open-in-disassembler", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Shellcode state
  const [shellcodeText, setShellcodeText] = useState("");
  const [shellcodeArch, setShellcodeArch] = useState<Arch>("x86_64");
  const [shellcodeLoading, setShellcodeLoading] = useState(false);
  const [shellcodeError, setShellcodeError] = useState<string | null>(null);

  function refreshRecent() {
    setRecent(getRecent());
  }

  const handleBrowse = async () => {
    try {
      const lastDir = localStorage.getItem("nullforge_last_dir_disasm") || undefined;
      const selected = await openDialog({ multiple: false, defaultPath: lastDir });
      if (typeof selected === "string" && selected) {
        const dir = selected.includes("/")
          ? selected.split("/").slice(0, -1).join("/")
          : selected.split("\\").slice(0, -1).join("\\");
        localStorage.setItem("nullforge_last_dir_disasm", dir);
        setBinaryPath(selected);
        // Auto-load after selection
        handleLoadBinary(selected);
      }
    } catch {
      // user cancelled
    }
  };

  const handleLoadBinary = async (path?: string) => {
    const target = (path ?? binaryPath).trim();
    if (!target) return;
    if (path) setBinaryPath(path);
    setLoadingBinary(true);
    setLoadError(null);
    setBinaryInfo(null);
    try {
      const raw = await invoke<RustBinaryInfo>("disasm_load_binary", { path: target });
      const info = adaptBinaryInfo(raw);
      setBinaryInfo(info);
      pushRecent(target);
      refreshRecent();
      setRecentOpen(false);
      setCrossOpen({ path: target });

      // Auto-disassemble the first function / entry point immediately
      if (info.functions.length > 0) {
        const first = info.functions[0];
        setSelectedFnAddr(first.addr);
        try {
          const insns = await invoke<RustInstruction[]>("disasm_function", {
            path: target,
            funcAddr: first.addr,
            funcSize: first.size,
            arch: info.arch,
          });
          openDisasmView(info, adaptInstructions(insns), first.name);
        } catch {
          openDisasmView(info, null, null);
        }
      } else {
        openDisasmView(info, null, null);
      }
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoadingBinary(false);
    }
  };

  const handleFunctionSelect = async (fn: BinaryFunction) => {
    if (!binaryInfo) return;
    setSelectedFnAddr(fn.addr);
    setLoadError(null);
    try {
      const raw = await invoke<RustInstruction[]>("disasm_function", {
        path: binaryInfo.path,
        funcAddr: fn.addr,
        funcSize: fn.size,
        arch: binaryInfo.arch,
      });
      openDisasmView(binaryInfo, adaptInstructions(raw), fn.name);
    } catch (e) {
      setLoadError(`Disasm failed: ${String(e)}`);
    }
  };

  const handleShellcode = async () => {
    if (!shellcodeText.trim()) return;
    setShellcodeLoading(true);
    setShellcodeError(null);
    try {
      const raw = await invoke<RustInstruction[]>("disasm_shellcode", {
        hexBytes: shellcodeText.trim(),
        arch: shellcodeArch,
      });
      openDisasmView(null, adaptInstructions(raw), `shellcode [${shellcodeArch}]`);
    } catch (e) {
      setShellcodeError(String(e));
    } finally {
      setShellcodeLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setSideTab("binary")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors ${
            sideTab === "binary"
              ? "text-text-primary border-b-2 border-accent-red"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Microscope size={11} />
          Binary
        </button>
        <button
          onClick={() => setSideTab("shellcode")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors ${
            sideTab === "shellcode"
              ? "text-text-primary border-b-2 border-accent-red"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Terminal size={11} />
          Shellcode
        </button>
      </div>

      {/* Cross-open prompt */}
      {crossOpen && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-accent-blue/10 border-b border-accent-blue/30 flex-shrink-0 text-xs">
          <span className="text-text-muted flex-1">Also open in Debugger?</span>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("nullforge:open-in-debugger", { detail: { binaryPath: crossOpen.path } }));
              setCrossOpen(null);
            }}
            className="px-2 py-0.5 rounded bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors"
          >
            Open
          </button>
          <button onClick={() => setCrossOpen(null)} className="text-text-dim hover:text-text-muted">Dismiss</button>
        </div>
      )}

      {/* ── Binary tab ── */}
      {sideTab === "binary" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Load section */}
          <div className="px-2 py-2 border-b border-border flex-shrink-0 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Load Binary</p>
              {recent.length > 0 && (
                <button
                  onClick={() => setRecentOpen((v) => !v)}
                  title="Recent files"
                  className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-muted transition-colors"
                >
                  <Clock size={10} />
                  Recent
                </button>
              )}
            </div>

            {/* Recent files dropdown */}
            {recentOpen && (
              <div className="bg-bg-base border border-border rounded overflow-hidden">
                {[...recent].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((f) => (
                  <div key={f.path} className="flex items-center gap-1 px-2 py-1 hover:bg-elevated group">
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => handleLoadBinary(f.path)}
                    >
                      <div className="text-xs text-text-primary truncate font-mono">{f.name}</div>
                      <div className="text-[10px] text-text-dim truncate">{f.path}</div>
                    </button>
                    <button
                      onClick={() => { togglePin(f.path); refreshRecent(); }}
                      title={f.pinned ? "Unpin" : "Pin"}
                      className={`p-0.5 rounded flex-shrink-0 ${f.pinned ? "text-accent-yellow" : "text-text-dim hover:text-text-muted opacity-0 group-hover:opacity-100"}`}
                    >
                      <Pin size={9} />
                    </button>
                    <button
                      onClick={() => { removeRecent(f.path); refreshRecent(); }}
                      title="Remove"
                      className="p-0.5 rounded flex-shrink-0 text-text-dim hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1">
              <input
                type="text"
                value={binaryPath}
                onChange={(e) => setBinaryPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadBinary()}
                placeholder="/path/to/binary"
                className="flex-1 min-w-0 bg-elevated border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors font-mono"
              />
              <button
                onClick={handleBrowse}
                title="Browse"
                className="flex-shrink-0 px-2 py-1 bg-elevated border border-border rounded hover:border-accent-red text-text-muted hover:text-text-primary transition-colors"
              >
                <FolderOpen size={13} />
              </button>
            </div>
            <button
              onClick={() => handleLoadBinary()}
              disabled={loadingBinary || !binaryPath.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-accent-red rounded text-xs text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loadingBinary ? (
                <><Loader size={11} className="animate-spin" /> Loading…</>
              ) : (
                <><Zap size={11} /> Load & Disassemble</>
              )}
            </button>
            {loadError && (
              <p className="text-xs text-accent-red bg-elevated rounded px-2 py-1 break-all">
                {loadError}
              </p>
            )}
          </div>

          {/* Binary info summary */}
          {binaryInfo && (
            <div className="px-2 py-1.5 border-b border-border flex-shrink-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-accent-green font-mono font-semibold">
                  {binaryInfo.arch}
                </span>
                <span className="text-xs text-text-muted">{binaryInfo.format}</span>
                <span className="text-xs text-text-muted">{binaryInfo.is_64bit ? "64-bit" : "32-bit"}</span>
              </div>
              <div className="text-xs text-text-muted font-mono">
                ep: 0x{binaryInfo.entry_point.toString(16)}
              </div>
              <div className="text-xs text-text-dim">
                {binaryInfo.functions.length} fns · {binaryInfo.strings.length} strings
              </div>
            </div>
          )}

          {/* Function list */}
          {binaryInfo ? (
            <div className="flex-1 overflow-hidden">
              <FunctionNav
                functions={binaryInfo.functions}
                selectedAddr={selectedFnAddr}
                onSelect={handleFunctionSelect}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-xs text-text-muted text-center px-4">
              Load a binary to browse functions
            </div>
          )}
        </div>
      )}

      {/* ── Shellcode tab ── */}
      {sideTab === "shellcode" && (
        <div className="flex flex-col flex-1 overflow-hidden p-2 gap-2">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider flex-shrink-0">
            Shellcode Disassembler
          </p>

          {/* Arch selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-muted flex-shrink-0">Arch:</span>
            <select
              value={shellcodeArch}
              onChange={(e) => setShellcodeArch(e.target.value as Arch)}
              className="flex-1 bg-elevated border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-red transition-colors"
            >
              {ARCH_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <textarea
            value={shellcodeText}
            onChange={(e) => setShellcodeText(e.target.value)}
            placeholder={"48 31 c0 50 48 bb …\nor \\x48\\x31\\xc0\\x50…"}
            rows={8}
            className="flex-1 min-h-0 bg-elevated border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted font-mono resize-none focus:outline-none focus:border-accent-red transition-colors"
          />

          {/* Disassemble button */}
          <button
            onClick={handleShellcode}
            disabled={shellcodeLoading || !shellcodeText.trim()}
            className="flex-shrink-0 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-accent-red rounded text-xs text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {shellcodeLoading ? (
              <><Loader size={11} className="animate-spin" /> Disassembling…</>
            ) : (
              <><Zap size={11} /> Disassemble</>
            )}
          </button>

          {shellcodeError && (
            <p className="text-xs text-accent-red bg-elevated rounded px-2 py-1 break-all flex-shrink-0">
              {shellcodeError}
            </p>
          )}

          {/* Format hint */}
          <div className="flex-shrink-0 bg-elevated border border-border rounded px-2 py-1.5 space-y-0.5">
            <p className="text-xs text-text-muted font-medium">Accepted formats:</p>
            <p className="font-mono text-xs text-text-dim">48 31 c0 50 …</p>
            <p className="font-mono text-xs text-text-dim">\x48\x31\xc0\x50…</p>
            <p className="font-mono text-xs text-text-dim">48,31,c0,50,…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper to dispatch open-disasm-view event ───────────────────────────────

function openDisasmView(
  binaryInfo: BinaryInfo | null,
  instructions: DisasmInstruction[] | null,
  funcName: string | null
) {
  window.dispatchEvent(
    new CustomEvent("nullforge:open-disasm-view", {
      detail: { binaryInfo, instructions, funcName },
    })
  );
}
