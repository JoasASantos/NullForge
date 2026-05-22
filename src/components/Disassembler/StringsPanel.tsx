import { Copy, Search } from "lucide-react";
import { useState, useMemo } from "react";

export interface BinaryString {
  addr: number;
  value: string;
  section: string;
}

interface StringsPanelProps {
  strings: BinaryString[];
}

export function StringsPanel({ strings }: StringsPanelProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return strings;
    const q = query.toLowerCase();
    return strings.filter(
      (s) =>
        s.value.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.addr.toString(16).includes(q)
    );
  }, [strings, query]);

  const copyString = (s: BinaryString) => {
    navigator.clipboard.writeText(s.value).catch(() => {});
    setCopied(s.addr);
    setTimeout(() => setCopied(null), 1200);
  };

  const openInEditor = (s: BinaryString) => {
    window.dispatchEvent(
      new CustomEvent("nullforge:open-file", {
        detail: {
          name: `string_0x${s.addr.toString(16)}.txt`,
          language: "markdown",
          content: s.value,
        },
      })
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border flex-shrink-0">
        <Search size={11} className="text-text-muted flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter strings..."
          className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted focus:outline-none"
        />
        <span className="text-xs text-text-muted flex-shrink-0">{filtered.length}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 grid grid-cols-[70px_100px_1fr] gap-2 px-2 py-1 bg-surface border-b border-border text-xs text-text-muted font-medium flex-shrink-0">
          <span>Section</span>
          <span>Address</span>
          <span>Value</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-xs text-text-muted text-center">No strings found</div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.addr}
              className="group grid grid-cols-[70px_100px_1fr] gap-2 px-2 py-0.5 hover:bg-elevated transition-colors items-center"
            >
              <span className="font-mono text-xs text-text-muted truncate">{s.section}</span>
              <span className="font-mono text-xs text-text-muted">
                0x{s.addr.toString(16).padStart(8, "0")}
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-mono text-xs text-text-primary truncate max-w-[240px]" title={s.value}>
                  {s.value.length > 60 ? s.value.slice(0, 60) + "…" : s.value}
                </span>
                {/* Action buttons — appear on row hover */}
                <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <button
                    onClick={() => copyString(s)}
                    title="Copy string"
                    className="p-0.5 rounded hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Copy size={10} />
                  </button>
                  <button
                    onClick={() => openInEditor(s)}
                    title="Open in editor"
                    className="px-1 py-0.5 rounded text-xs text-text-muted hover:text-accent-red transition-colors"
                  >
                    edit
                  </button>
                </div>
                {copied === s.addr && (
                  <span className="text-xs text-accent-green ml-1 flex-shrink-0">copied</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
