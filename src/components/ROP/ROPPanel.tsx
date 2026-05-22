import { useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, Copy, Zap, AlertCircle } from "lucide-react";
import type { BinaryInfo } from "../Disassembler/DisasmView";

interface RopGadget {
  addr: number;
  instructions: string[];
  bytes: string;
  size: number;
}

interface ROPPanelProps {
  binaryInfo?: BinaryInfo;
}

type GadgetFilter = "all" | "pop" | "mov" | "xchg" | "load" | "store";

const FILTERS: { id: GadgetFilter; label: string }[] = [
  { id: "all",   label: "All" },
  { id: "pop",   label: "pop" },
  { id: "mov",   label: "mov" },
  { id: "xchg",  label: "xchg" },
  { id: "load",  label: "load" },
  { id: "store", label: "store" },
];

function matchesFilter(gadget: RopGadget, filter: GadgetFilter): boolean {
  if (filter === "all") return true;
  const chain = gadget.instructions.join(" ").toLowerCase();
  if (filter === "pop")   return chain.includes("pop");
  if (filter === "mov")   return chain.includes("mov") || chain.includes("lea");
  if (filter === "xchg")  return chain.includes("xchg");
  if (filter === "load")  return /\[/.test(chain) && /(mov|lea|ldr)/.test(chain);
  if (filter === "store") return /\[/.test(chain) && /(mov|str)\s+\[/.test(chain);
  return true;
}

export function ROPPanel({ binaryInfo }: ROPPanelProps) {
  const [gadgets, setGadgets] = useState<RopGadget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GadgetFilter>("all");
  const [maxInsns, setMaxInsns] = useState(6);

  async function findGadgets() {
    if (!binaryInfo?.path) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<RopGadget[]>("disasm_find_gadgets", {
        path: binaryInfo.path,
        arch: binaryInfo.arch,
        maxInsns,
      });
      setGadgets(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return gadgets.filter((g) => {
      if (!matchesFilter(g, filter)) return false;
      if (!q) return true;
      const chain = g.instructions.join(" ; ").toLowerCase();
      return chain.includes(q) || g.bytes.includes(q);
    });
  }, [gadgets, query, filter]);

  function copyGadget(g: RopGadget) {
    const text = `0x${g.addr.toString(16)} : ${g.instructions.join(" ; ")}`;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function copyAddr(g: RopGadget) {
    navigator.clipboard.writeText(`0x${g.addr.toString(16).padStart(16, "0")}`).catch(() => {});
  }

  if (!binaryInfo) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-text-dim">
        Load a binary first
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1 text-text-muted">
          <span>Max insns:</span>
          <select
            value={maxInsns}
            onChange={(e) => setMaxInsns(Number(e.target.value))}
            className="bg-elevated border border-border rounded px-1 py-0.5 text-[10px] text-text-primary focus:outline-none focus:border-accent-red"
          >
            {[3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={findGadgets}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded bg-accent-red hover:bg-accent-red/80 text-white text-[10px] font-medium transition-colors disabled:opacity-50"
        >
          <Zap size={10} />
          {loading ? "Scanning…" : "Find Gadgets"}
        </button>
        {gadgets.length > 0 && (
          <span className="text-text-dim">
            {filtered.length}/{gadgets.length} gadgets
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[10px] flex-shrink-0">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      {gadgets.length > 0 && (
        <>
          {/* Search + filter */}
          <div className="px-2 py-1.5 border-b border-border flex-shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5 bg-elevated border border-border rounded px-2 py-1">
              <Search size={10} className="text-text-dim flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter gadgets…"
                className="flex-1 bg-transparent text-[10px] text-text-primary placeholder-text-muted outline-none"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    filter === f.id
                      ? "border-accent-red text-accent-red bg-red-500/10"
                      : "border-border text-text-muted hover:border-text-dim"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gadget list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-12 text-[10px] text-text-dim">
                No matching gadgets
              </div>
            ) : (
              filtered.map((g) => (
                <div
                  key={g.addr}
                  className="flex items-start gap-2 px-2 py-1 border-b border-border/50 hover:bg-elevated group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-text-dim w-24 flex-shrink-0">
                      0x{g.addr.toString(16).padStart(16, "0")}
                    </div>
                    <div className="font-mono text-[10px] text-text-primary mt-px">
                      {g.instructions.map((ins, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-text-dim"> ; </span>}
                          <span className={
                            ins.startsWith("ret") ? "text-purple-400" :
                            ins.startsWith("pop") ? "text-amber-400" :
                            ins.startsWith("mov") || ins.startsWith("lea") ? "text-blue-400" :
                            ins.startsWith("xchg") ? "text-cyan-400" :
                            "text-text-primary"
                          }>{ins}</span>
                        </span>
                      ))}
                    </div>
                    <div className="font-mono text-[9px] text-text-dim mt-0.5">{g.bytes}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => copyAddr(g)}
                      title="Copy address"
                      className="p-0.5 rounded hover:bg-surface text-text-dim hover:text-text-primary"
                    >
                      <Copy size={9} />
                    </button>
                    <button
                      onClick={() => copyGadget(g)}
                      title="Copy gadget"
                      className="p-0.5 rounded hover:bg-surface text-text-dim hover:text-text-primary text-[9px] px-1"
                    >
                      gadget
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {gadgets.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-1.5 text-center px-4">
          <span className="text-text-dim text-[10px]">
            Scan <span className="font-mono text-text-muted">{binaryInfo.path.split("/").pop()}</span> for ROP gadgets
          </span>
          <span className="text-text-dim text-[9px]">{binaryInfo.arch} / {binaryInfo.format}</span>
        </div>
      )}
    </div>
  );
}
