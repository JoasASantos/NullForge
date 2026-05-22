import { useState } from "react";

export interface MemoryRegion {
  start: number;
  end: number;
  perms: string;
  offset: number;
  dev: string;
  inode: number;
  name: string;
  kind: "stack" | "heap" | "executable" | "library" | "vdso" | "anonymous" | "other";
}

const KIND_COLORS: Record<MemoryRegion["kind"], string> = {
  executable: "bg-accent-red/20 text-accent-red border-accent-red/30",
  heap: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  stack: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  library: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  vdso: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  anonymous: "bg-text-dim/10 text-text-dim border-border",
  other: "bg-text-dim/10 text-text-muted border-border",
};

const DEMO_REGIONS: MemoryRegion[] = [
  { start: 0x400000, end: 0x401000, perms: "r--p", offset: 0, dev: "fd:01", inode: 1234567, name: "/opt/ctf/vuln", kind: "executable" },
  { start: 0x401000, end: 0x402000, perms: "r-xp", offset: 0x1000, dev: "fd:01", inode: 1234567, name: "/opt/ctf/vuln (.text)", kind: "executable" },
  { start: 0x402000, end: 0x403000, perms: "r--p", offset: 0x2000, dev: "fd:01", inode: 1234567, name: "/opt/ctf/vuln (.rodata)", kind: "executable" },
  { start: 0x403000, end: 0x404000, perms: "rw-p", offset: 0x3000, dev: "fd:01", inode: 1234567, name: "/opt/ctf/vuln (.data/.bss)", kind: "executable" },
  { start: 0x5555_5552_0000, end: 0x5555_5572_1000, perms: "rw-p", offset: 0, dev: "00:00", inode: 0, name: "[heap]", kind: "heap" },
  { start: 0x7fff_f79e_d000, end: 0x7fff_f7bc_e000, perms: "r-xp", offset: 0, dev: "fd:01", inode: 9876, name: "/lib/x86_64-linux-gnu/libc.so.6", kind: "library" },
  { start: 0x7fff_f7bc_e000, end: 0x7fff_f7dce000, perms: "---p", offset: 0x1e1000, dev: "fd:01", inode: 9876, name: "/lib/x86_64-linux-gnu/libc.so.6", kind: "library" },
  { start: 0x7fff_f7dce000, end: 0x7fff_f7dd2000, perms: "r--p", offset: 0x1e1000, dev: "fd:01", inode: 9876, name: "/lib/x86_64-linux-gnu/libc.so.6", kind: "library" },
  { start: 0x7fff_f7dd2000, end: 0x7fff_f7dd4000, perms: "rw-p", offset: 0x1e5000, dev: "fd:01", inode: 9876, name: "/lib/x86_64-linux-gnu/libc.so.6", kind: "library" },
  { start: 0x7fff_f7fcb000, end: 0x7fff_f7fce000, perms: "r--p", offset: 0, dev: "00:00", inode: 0, name: "[vvar]", kind: "vdso" },
  { start: 0x7fff_f7fce000, end: 0x7fff_f7fd0000, perms: "r-xp", offset: 0, dev: "00:00", inode: 0, name: "[vdso]", kind: "vdso" },
  { start: 0x7fff_e800_0000, end: 0x7fff_e8021000, perms: "rw-p", offset: 0, dev: "00:00", inode: 0, name: "[stack]", kind: "stack" },
];

function addr(n: number) {
  return `0x${n.toString(16).padStart(12, "0")}`;
}

function permBadge(perms: string) {
  return (
    <span className="font-mono text-[10px]">
      <span className={perms[0] === "r" ? "text-accent-green" : "text-text-dim"}>r</span>
      <span className={perms[1] === "w" ? "text-amber-400" : "text-text-dim"}>w</span>
      <span className={perms[2] === "x" ? "text-accent-red" : "text-text-dim"}>x</span>
      <span className="text-text-dim">{perms[3]}</span>
    </span>
  );
}

interface MemoryMapProps {
  regions?: MemoryRegion[];
  highlightAddr?: number;
}

export function MemoryMap({ regions = DEMO_REGIONS, highlightAddr }: MemoryMapProps) {
  const [filter, setFilter] = useState<"all" | MemoryRegion["kind"]>("all");
  const [search, setSearch] = useState("");

  const filtered = regions.filter((r) => {
    if (filter !== "all" && r.kind !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kinds = ["all", "executable", "heap", "stack", "library", "vdso", "anonymous"] as const;

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Filters */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-surface flex-shrink-0 overflow-x-auto">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k as typeof filter)}
            className={`px-2 py-0.5 rounded text-[10px] capitalize flex-shrink-0 transition-colors ${
              filter === k
                ? "bg-accent-red text-white"
                : "bg-elevated text-text-muted hover:text-text-primary"
            }`}
          >
            {k}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter name..."
          className="ml-auto bg-bg-base border border-border rounded px-2 py-0.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red w-28"
        />
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-0 px-2 py-0.5 bg-surface border-b border-border flex-shrink-0">
        <span className="w-28 flex-shrink-0 text-text-dim">Start</span>
        <span className="w-28 flex-shrink-0 text-text-dim">End</span>
        <span className="w-12 flex-shrink-0 text-text-dim">Perms</span>
        <span className="flex-1 text-text-dim">Name</span>
      </div>

      {/* Regions list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((r, i) => {
          const isHighlighted = highlightAddr !== undefined && highlightAddr >= r.start && highlightAddr < r.end;
          return (
            <div
              key={i}
              className={`flex items-center gap-0 px-2 py-px font-mono border-l-2 ${
                isHighlighted
                  ? "border-accent-red bg-accent-red/5"
                  : "border-transparent hover:bg-elevated"
              }`}
            >
              <span className="w-28 flex-shrink-0 text-text-muted">{addr(r.start)}</span>
              <span className="w-28 flex-shrink-0 text-text-dim">{addr(r.end)}</span>
              <span className="w-12 flex-shrink-0">{permBadge(r.perms)}</span>
              <span className={`flex-1 truncate px-2 rounded text-[10px] ${KIND_COLORS[r.kind]}`}>
                {r.name || "<anonymous>"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-border bg-surface flex-shrink-0 text-text-dim">
        {filtered.length} / {regions.length} regions
      </div>
    </div>
  );
}
