import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { KEYBINDINGS, CATEGORY_LABELS, getDisplay } from "../../lib/keybindings";
import type { Category } from "../../lib/keybindings";
import { isMac } from "../../lib/platform";

interface CheatSheetProps {
  open: boolean;
  onClose: () => void;
}

function KbdKey({ k }: { k: string }) {
  // Wider keys
  const wide = k.length > 2 && !["⌘","⇧","⌥","⌃","Alt","Ctrl","Shift","Tab","Enter","Space","Escape"].includes(k);
  return (
    <kbd
      className={`inline-flex items-center justify-center h-5 rounded text-[10px] font-semibold
        bg-bg-elevated border border-border text-text-primary shadow-sm px-1
        ${wide ? "min-w-[32px]" : "min-w-[20px]"}`}
    >
      {k}
    </kbd>
  );
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <KbdKey k={k} />
          {i < keys.length - 1 && <span className="text-text-dim text-[9px]">+</span>}
        </span>
      ))}
    </div>
  );
}

const ALL_CATEGORIES: Category[] = [
  "global", "navigation", "editor", "debugger", "disassembler", "rop", "terminal"
];

export function CheatSheet({ open, onClose }: CheatSheetProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return KEYBINDINGS.filter((kb) => {
      const matchesQuery = !q ||
        kb.action.toLowerCase().includes(q) ||
        kb.id.includes(q) ||
        getDisplay(kb).some((k) => k.toLowerCase().includes(q));
      const matchesCat = activeCategory === "all" || kb.category === activeCategory;
      return matchesQuery && matchesCat;
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const g = {} as Record<Category, typeof filtered>;
    for (const kb of filtered) {
      (g[kb.category] ??= []).push(kb);
    }
    return g;
  }, [filtered]);

  const categoriesToShow = ALL_CATEGORIES.filter((c) =>
    activeCategory === "all" ? (grouped[c]?.length ?? 0) > 0 : c === activeCategory
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-[720px] max-h-[80vh] flex flex-col rounded-lg border border-border shadow-lg bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isMac() ? "macOS" : isWindows() ? "Windows" : "Linux"} keybindings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="px-4 py-2 border-b border-border flex-shrink-0 space-y-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter shortcuts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-bg-elevated border border-border text-text-primary
              text-xs placeholder-text-dim focus:outline-none focus:border-accent-blue transition-colors"
          />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                activeCategory === "all"
                  ? "bg-accent-blue text-white"
                  : "bg-bg-elevated text-text-muted hover:text-text-primary"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeCategory === cat
                    ? "bg-accent-blue text-white"
                    : "bg-bg-elevated text-text-muted hover:text-text-primary"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcut list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 selectable">
          {filtered.length === 0 ? (
            <p className="text-center text-text-muted text-xs py-8">
              No shortcuts match "{query}"
            </p>
          ) : (
            categoriesToShow.map((cat) => {
              const items = grouped[cat];
              if (!items?.length) return null;
              return (
                <div key={cat}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="rounded-md border border-border overflow-hidden">
                    {items.map((kb, i) => (
                      <div
                        key={kb.id}
                        className={`flex items-center justify-between px-3 py-1.5 gap-4
                          ${i % 2 === 0 ? "bg-bg-base" : "bg-bg-surface"}
                          hover:bg-bg-elevated transition-colors`}
                      >
                        <span className="text-xs text-text-primary flex-1">{kb.action}</span>
                        <ShortcutKeys keys={getDisplay(kb)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex-shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-text-dim">{filtered.length} shortcuts</span>
          <span className="text-[11px] text-text-dim">
            Press <KbdKey k="Esc" /> to close
          </span>
        </div>
      </div>
    </div>
  );
}

// Platform helper used in CheatSheet
function isWindows() {
  return navigator.userAgent.includes("Win");
}
