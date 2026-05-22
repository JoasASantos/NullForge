import { AlertTriangle, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useState } from "react";

export interface HeapChunk {
  addr: number;
  size: number;
  prev_size: number;
  flags: { prev_inuse: boolean; is_mmapped: boolean; non_main_arena: boolean };
  status: "in_use" | "free" | "tcache" | "fastbin" | "unsorted" | "small" | "large";
  data_preview?: string;
}

export interface BinEntry {
  addr: number;
  size: number;
  fd?: number;
  bk?: number;
}

export interface HeapState {
  chunks: HeapChunk[];
  tcache_bins: Record<number, BinEntry[]>;
  fastbins: Record<number, BinEntry[]>;
  unsorted_bin: BinEntry[];
  small_bins: Record<number, BinEntry[]>;
  large_bins: Record<number, BinEntry[]>;
  top_chunk?: number;
  issues: HeapIssue[];
}

export interface HeapIssue {
  type: "double_free" | "heap_overlap" | "use_after_free" | "invalid_size" | "corrupted_bin";
  addr: number;
  description: string;
}

const STATUS_COLORS: Record<HeapChunk["status"], string> = {
  in_use: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  free: "bg-text-dim/10 border-border text-text-muted",
  tcache: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  fastbin: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
  unsorted: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  small: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  large: "bg-orange-500/20 border-orange-500/40 text-orange-300",
};

function addr(n: number) {
  return `0x${n.toString(16).padStart(12, "0")}`;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO: HeapState = {
  chunks: [
    { addr: 0x5555_5552_0290, size: 0x20, prev_size: 0, flags: { prev_inuse: true, is_mmapped: false, non_main_arena: false }, status: "in_use", data_preview: "41 41 41 41 ..." },
    { addr: 0x5555_5552_02b0, size: 0x20, prev_size: 0, flags: { prev_inuse: true, is_mmapped: false, non_main_arena: false }, status: "free", data_preview: "00 00 00 00 ..." },
    { addr: 0x5555_5552_02d0, size: 0x30, prev_size: 0, flags: { prev_inuse: true, is_mmapped: false, non_main_arena: false }, status: "tcache" },
    { addr: 0x5555_5552_0300, size: 0x40, prev_size: 0, flags: { prev_inuse: true, is_mmapped: false, non_main_arena: false }, status: "in_use" },
    { addr: 0x5555_5552_0340, size: 0x20, prev_size: 0, flags: { prev_inuse: false, is_mmapped: false, non_main_arena: false }, status: "fastbin" },
    { addr: 0x5555_5552_0360, size: 0x210, prev_size: 0, flags: { prev_inuse: true, is_mmapped: false, non_main_arena: false }, status: "unsorted" },
  ],
  tcache_bins: {
    0x20: [{ addr: 0x5555_5552_02d0, size: 0x20 }],
    0x30: [],
  },
  fastbins: {
    0x20: [{ addr: 0x5555_5552_0340, size: 0x20 }],
  },
  unsorted_bin: [{ addr: 0x5555_5552_0360, size: 0x210, fd: 0x7fff_f7db_9c00, bk: 0x7fff_f7db_9c00 }],
  small_bins: {},
  large_bins: {},
  top_chunk: 0x5555_5552_0570,
  issues: [
    { type: "double_free", addr: 0x5555_5552_02b0, description: "Chunk at 0x5555...02b0 appears in both free and tcache (double free suspected)" },
  ],
};

function BinSection({ title, bins, color }: { title: string; bins: Record<number, BinEntry[]> | BinEntry[]; color: string }) {
  const [open, setOpen] = useState(true);
  const entries = Array.isArray(bins)
    ? bins.map((e) => ({ size: e.size, list: [e] }))
    : Object.entries(bins).filter(([, v]) => v.length > 0).map(([k, v]) => ({ size: parseInt(k), list: v }));

  if (entries.length === 0) return null;

  return (
    <div className="mb-2">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-medium mb-1 text-text-muted hover:text-text-primary transition-colors">
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className={color}>{title}</span>
        <span className="text-text-dim ml-1">({entries.length} {entries.length === 1 ? "bin" : "bins"})</span>
      </button>
      {open && (
        <div className="pl-3 space-y-0.5">
          {entries.map(({ size, list }) => (
            <div key={size} className="flex items-center gap-2 text-xs font-mono">
              <span className="text-text-dim w-12 flex-shrink-0">sz={`0x${size.toString(16)}`}</span>
              <span className="text-text-dim">→</span>
              {list.map((e, i) => (
                <span key={i} className="text-text-primary">{addr(e.addr)}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeapVisualizerProps {
  heapState?: HeapState;
}

export function HeapVisualizer({ heapState = DEMO }: HeapVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"chunks" | "bins" | "issues">("chunks");

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-surface flex-shrink-0">
        {(["chunks", "bins", "issues"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-xs border-r border-border transition-colors capitalize ${
              activeTab === t
                ? "text-text-primary bg-bg-base border-t-2 border-t-accent-red"
                : "text-text-muted hover:text-text-primary hover:bg-elevated"
            }`}
          >
            {t}
            {t === "issues" && heapState.issues.length > 0 && (
              <span className="ml-1 text-accent-red font-bold">{heapState.issues.length}</span>
            )}
          </button>
        ))}
        <div className="ml-auto px-3 text-text-dim flex items-center gap-1">
          <Layers size={11} />
          <span>{heapState.chunks.length} chunks</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chunks" && (
          <div className="p-2 space-y-1">
            {heapState.top_chunk && (
              <div className="flex items-center gap-2 px-2 py-1 rounded border border-accent-green/30 bg-accent-green/5 mb-2">
                <span className="text-accent-green font-semibold">top</span>
                <span className="font-mono text-text-primary">{addr(heapState.top_chunk)}</span>
              </div>
            )}
            {heapState.chunks.map((chunk, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-2 py-1.5 rounded border ${STATUS_COLORS[chunk.status]}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{addr(chunk.addr)}</span>
                    <span className="text-text-dim">sz=0x{chunk.size.toString(16)}</span>
                    <span className="px-1 rounded text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {chunk.status}
                    </span>
                    {!chunk.flags.prev_inuse && (
                      <span className="text-text-dim text-[10px]">P=0</span>
                    )}
                  </div>
                  {chunk.data_preview && (
                    <div className="mt-0.5 text-text-dim font-mono text-[10px]">{chunk.data_preview}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "bins" && (
          <div className="p-3">
            <BinSection title="Tcache Bins" bins={heapState.tcache_bins} color="text-emerald-400" />
            <BinSection title="Fastbins" bins={heapState.fastbins} color="text-cyan-400" />
            <BinSection title="Unsorted Bin" bins={heapState.unsorted_bin} color="text-amber-400" />
            <BinSection title="Small Bins" bins={heapState.small_bins} color="text-purple-400" />
            <BinSection title="Large Bins" bins={heapState.large_bins} color="text-orange-400" />
          </div>
        )}

        {activeTab === "issues" && (
          <div className="p-2 space-y-2">
            {heapState.issues.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-text-dim">
                No heap issues detected
              </div>
            ) : (
              heapState.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded border border-accent-red/40 bg-accent-red/5">
                  <AlertTriangle size={13} className="text-accent-red flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-accent-red uppercase text-[10px] tracking-wide">
                      {issue.type.replace(/_/g, " ")}
                    </div>
                    <div className="font-mono text-text-dim text-[10px] mt-0.5">{addr(issue.addr)}</div>
                    <div className="text-text-muted mt-0.5 leading-relaxed">{issue.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
