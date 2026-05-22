import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export interface BinaryFunction {
  addr: number;
  name: string;
  size: number;
}

interface FunctionNavProps {
  functions: BinaryFunction[];
  selectedAddr?: number;
  onSelect: (fn: BinaryFunction) => void;
}

const PRIORITY_NAMES = ["main", "_start", "entry", "start"];

export function FunctionNav({ functions, selectedAddr, onSelect }: FunctionNavProps) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const prioritised = [...functions].sort((a, b) => {
      const pa = PRIORITY_NAMES.indexOf(a.name);
      const pb = PRIORITY_NAMES.indexOf(b.name);
      if (pa !== -1 && pb === -1) return -1;
      if (pa === -1 && pb !== -1) return 1;
      if (pa !== -1 && pb !== -1) return pa - pb;
      return a.addr - b.addr;
    });
    if (!query.trim()) return prioritised;
    const q = query.toLowerCase();
    return prioritised.filter(
      (f) => f.name.toLowerCase().includes(q) || f.addr.toString(16).includes(q)
    );
  }, [functions, query]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-elevated border border-border rounded px-2 py-1">
          <Search size={11} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter functions..."
            className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-1 text-xs text-text-muted flex-shrink-0">
        {sorted.length} function{sorted.length !== 1 ? "s" : ""}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-3 py-4 text-xs text-text-muted text-center">No functions found</div>
        ) : (
          sorted.map((fn) => {
            const isEntry = fn.name === "_start" || fn.name === "entry" || fn.name === "main";
            const isSelected = selectedAddr === fn.addr;
            return (
              <button
                key={`${fn.addr}-${fn.name}`}
                onClick={() => onSelect(fn)}
                className={`
                  w-full flex flex-col px-3 py-1.5 text-left transition-colors hover:bg-elevated
                  ${isSelected ? "bg-elevated border-l-2 border-accent-red" : ""}
                `}
              >
                <span
                  className={`font-mono text-xs truncate ${
                    isEntry ? "text-accent-red" : "text-text-primary"
                  }`}
                >
                  {fn.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-text-muted">
                    0x{fn.addr.toString(16).padStart(8, "0")}
                  </span>
                  {fn.size > 0 && (
                    <span className="text-xs text-text-dim">{fn.size}b</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
