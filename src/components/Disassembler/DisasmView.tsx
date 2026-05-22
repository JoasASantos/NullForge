import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, GitBranch, Hash, Link2, Shield } from "lucide-react";
import { StringsPanel, type BinaryString } from "./StringsPanel";
import { XRefPanel } from "./XRefPanel";
import { CFGRenderer } from "./CFGRenderer";
import { ROPPanel } from "../ROP/ROPPanel";
import { ROPChainBuilder } from "../ROP/ROPChainBuilder";
import { BypassReference } from "../ROP/BypassReference";
import type { BinaryFunction } from "./FunctionNav";

// ─── Types (exported for use by other Disassembler components) ───────────────

export interface DisasmInstruction {
  addr: number;
  hex: string;
  mnemonic: string;
  op_str: string;
  is_call: boolean;
  is_jump: boolean;
  is_ret: boolean;
}

export interface BinaryInfo {
  path: string;
  arch: string;
  format: string;
  entry_point: number;
  functions: BinaryFunction[];
  sections: SectionInfo[];
  strings: BinaryString[];
  is_64bit: boolean;
}

export interface SectionInfo {
  name: string;
  addr: number;
  size: number;
  flags: string;
}

// ─── Mnemonic colouring ───────────────────────────────────────────────────────

function mnemonicClass(ins: DisasmInstruction): string {
  if (ins.is_call) return "text-accent-red";
  if (ins.is_ret) return "text-purple-400";
  if (ins.is_jump) return "text-amber-400";
  const m = ins.mnemonic.toLowerCase();
  if (m === "mov" || m === "movq" || m === "movl" || m === "lea" || m.startsWith("mov")) {
    return "text-blue-400";
  }
  return "text-text-primary";
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface CtxMenu {
  x: number;
  y: number;
  ins: DisasmInstruction;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  ins: DisasmInstruction;
  isSelected: boolean;
  onSelect: () => void;
  onRightClick: (e: React.MouseEvent, ins: DisasmInstruction) => void;
  onDoubleClick: (ins: DisasmInstruction) => void;
}

function InsnRow({ ins, isSelected, onSelect, onRightClick, onDoubleClick }: RowProps) {
  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => { e.preventDefault(); onRightClick(e, ins); }}
      onDoubleClick={() => onDoubleClick(ins)}
      className={`
        flex items-center gap-0 px-2 py-px cursor-pointer select-none transition-colors
        hover:bg-elevated
        ${isSelected ? "bg-elevated border-l-2 border-accent-red" : "border-l-2 border-transparent"}
      `}
    >
      {/* Address */}
      <span className="font-mono text-xs text-text-muted w-28 flex-shrink-0">
        0x{ins.addr.toString(16).padStart(8, "0")}
      </span>
      {/* Hex bytes */}
      <span className="font-mono text-xs text-text-dim w-28 flex-shrink-0 pr-2">
        {ins.hex}
      </span>
      {/* Mnemonic */}
      <span className={`font-mono text-xs w-20 flex-shrink-0 ${mnemonicClass(ins)}`}>
        {ins.mnemonic}
      </span>
      {/* Operands */}
      <span className="font-mono text-xs text-text-muted flex-1 truncate">
        {ins.op_str}
      </span>
    </div>
  );
}

// ─── DisasmView ───────────────────────────────────────────────────────────────

interface DisasmViewProps {
  instructions?: DisasmInstruction[];
  binaryInfo?: BinaryInfo;
  funcName?: string;
  currentAddr?: number;
  onNavigateToAddr?: (addr: number) => void;
}

type BottomTab = "strings" | "xrefs" | "cfg" | "rop" | "chain" | "bypass";

export function DisasmView({
  instructions = [],
  binaryInfo,
  funcName,
  currentAddr,
  onNavigateToAddr,
}: DisasmViewProps) {
  const [selectedAddr, setSelectedAddr] = useState<number | null>(
    currentAddr ?? (instructions[0]?.addr ?? null)
  );
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("strings");
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const handleDoubleClick = useCallback(
    (ins: DisasmInstruction) => {
      if (!ins.is_call && !ins.is_jump) return;
      const m = ins.op_str.match(/0x([0-9a-fA-F]+)/);
      if (m && onNavigateToAddr) onNavigateToAddr(parseInt(m[1], 16));
    },
    [onNavigateToAddr]
  );

  const copyAddr = (ins: DisasmInstruction) => {
    navigator.clipboard.writeText(`0x${ins.addr.toString(16)}`).catch(() => {});
    setCtxMenu(null);
  };

  const setBreakpoint = (ins: DisasmInstruction) => {
    window.dispatchEvent(
      new CustomEvent("nullforge:set-breakpoint", { detail: { addr: ins.addr } })
    );
    setCtxMenu(null);
  };

  const showInCfg = (_ins: DisasmInstruction) => {
    setBottomTab("cfg");
    setCtxMenu(null);
  };

  const selectedIns = instructions.find((i) => i.addr === selectedAddr) ?? null;

  // Arch badge colour
  const archColour =
    binaryInfo?.arch === "x86_64"
      ? "text-accent-green"
      : binaryInfo?.arch === "aarch64"
      ? "text-blue-400"
      : "text-amber-400";

  return (
    <div className="flex flex-col h-full bg-bg-base" style={{ position: "relative" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-surface flex-shrink-0">
        {binaryInfo && (
          <>
            <span className={`font-mono text-xs font-semibold ${archColour}`}>
              {binaryInfo.arch}
            </span>
            <span className="text-xs text-text-muted">{binaryInfo.format}</span>
            <span className="text-xs text-text-dim">
              entry: <span className="font-mono text-text-muted">0x{binaryInfo.entry_point.toString(16)}</span>
            </span>
          </>
        )}
        {funcName && (
          <>
            <span className="text-text-muted text-xs">/</span>
            <span className="font-mono text-xs text-accent-red">{funcName}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1 text-xs text-text-muted">
          <Hash size={11} />
          <span>{instructions.length} insns</span>
        </div>
      </div>

      {/* ── Column header ── */}
      <div className="flex items-center gap-0 px-2 py-0.5 bg-surface border-b border-border flex-shrink-0">
        <span className="font-mono text-xs text-text-muted w-28 flex-shrink-0">Address</span>
        <span className="font-mono text-xs text-text-muted w-28 flex-shrink-0">Bytes</span>
        <span className="font-mono text-xs text-text-muted w-20 flex-shrink-0">Mnemonic</span>
        <span className="font-mono text-xs text-text-muted flex-1">Operands</span>
      </div>

      {/* ── Instruction list (upper pane, ~60% height) ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0, maxHeight: "60%" }}
        onClick={() => setCtxMenu(null)}
      >
        {instructions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">
            No instructions loaded
          </div>
        ) : (
          instructions.map((ins) => (
            <InsnRow
              key={ins.addr}
              ins={ins}
              isSelected={selectedAddr === ins.addr}
              onSelect={() => setSelectedAddr(ins.addr)}
              onRightClick={(e, i) => setCtxMenu({ x: e.clientX, y: e.clientY, ins: i })}
              onDoubleClick={handleDoubleClick}
            />
          ))
        )}
      </div>

      {/* ── Bottom pane (Strings / XRefs / CFG) ── */}
      <div className="flex flex-col border-t border-border" style={{ height: "40%", minHeight: 0 }}>
        {/* Tab bar */}
        <div className="flex items-center bg-surface border-b border-border flex-shrink-0">
          {(["strings", "xrefs", "cfg", "rop", "chain", "bypass"] as BottomTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setBottomTab(tab)}
              className={`
                flex items-center gap-1 px-3 py-1.5 text-xs border-r border-border transition-colors
                ${
                  bottomTab === tab
                    ? "text-text-primary bg-bg-base border-t-2 border-t-accent-red"
                    : "text-text-muted hover:text-text-primary hover:bg-elevated"
                }
              `}
            >
              {tab === "cfg"    && <GitBranch size={11} />}
              {tab === "strings" && <Copy size={11} />}
              {tab === "rop"    && <Link2 size={11} />}
              {tab === "chain"  && <Link2 size={11} />}
              {tab === "bypass" && <Shield size={11} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "strings" && binaryInfo && (
                <span className="ml-1 text-text-dim">{binaryInfo.strings.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {bottomTab === "strings" && (
            <StringsPanel strings={binaryInfo?.strings ?? []} />
          )}
          {bottomTab === "xrefs" && (
            <XRefPanel
              address={selectedAddr}
              instructions={instructions}
              functions={binaryInfo?.functions ?? []}
            />
          )}
          {bottomTab === "cfg" && (
            <CFGRenderer
              instructions={instructions}
              funcName={funcName ?? "function"}
            />
          )}
          {bottomTab === "rop" && (
            <ROPPanel binaryInfo={binaryInfo} />
          )}
          {bottomTab === "chain" && (
            <ROPChainBuilder />
          )}
          {bottomTab === "bypass" && (
            <BypassReference />
          )}
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-elevated border border-border rounded shadow-lg py-1 min-w-[180px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={() => copyAddr(ctxMenu.ins)}
            className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface transition-colors"
          >
            Copy address
          </button>
          <button
            onClick={() => setBreakpoint(ctxMenu.ins)}
            className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface transition-colors"
          >
            Set breakpoint at address
          </button>
          <button
            onClick={() => showInCfg(ctxMenu.ins)}
            className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface transition-colors"
          >
            Show in CFG
          </button>
        </div>
      )}
    </div>
  );
}
