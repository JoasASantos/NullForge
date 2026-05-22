import { useState } from "react";
import { KEYBINDINGS, CATEGORY_LABELS, getDisplay } from "../../lib/keybindings";
import type { Category } from "../../lib/keybindings";
import { isMac } from "../../lib/platform";

const ALL_CATEGORIES: Category[] = [
  "global", "navigation", "editor", "debugger", "disassembler", "rop", "terminal",
];

function KbdKey({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded
      text-[10px] font-semibold bg-bg-elevated border border-border text-text-primary shadow-sm">
      {k}
    </kbd>
  );
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <KbdKey k={k} />
          {i < keys.length - 1 && <span className="text-text-dim text-[10px]">+</span>}
        </span>
      ))}
    </div>
  );
}

export function KeybindingsSettings() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");

  const platform = isMac() ? "macOS" : navigator.userAgent.includes("Win") ? "Windows" : "Linux";

  const filtered = KEYBINDINGS.filter((kb) => {
    const q = query.toLowerCase();
    const matchesQ = !q || kb.action.toLowerCase().includes(q);
    const matchesCat = activeCategory === "all" || kb.category === activeCategory;
    return matchesQ && matchesCat;
  });

  const grouped = {} as Record<Category, typeof filtered>;
  for (const kb of filtered) {
    (grouped[kb.category] ??= []).push(kb);
  }

  const categoriesToShow = ALL_CATEGORIES.filter((c) =>
    activeCategory === "all" ? (grouped[c]?.length ?? 0) > 0 : c === activeCategory
  );

  return (
    <div className="space-y-4">
      {/* Platform notice */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Showing <span className="text-text-primary font-medium">{platform}</span> keybindings.
          {" "}Keybinding editing coming in a future release.
        </p>
        <span className="text-[11px] text-text-dim">{filtered.length} shortcuts</span>
      </div>

      {/* Filter + category tabs */}
      <input
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
              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
              : "bg-bg-elevated text-text-muted hover:text-text-primary border border-transparent"
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
                ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                : "bg-bg-elevated text-text-muted hover:text-text-primary border border-transparent"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Shortcut tables by category */}
      {filtered.length === 0 ? (
        <p className="text-center text-text-muted text-xs py-6">No shortcuts match "{query}"</p>
      ) : (
        categoriesToShow.map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          return (
            <div key={cat}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {items.map((kb, i) => (
                      <tr
                        key={kb.id}
                        className={`border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors ${
                          i % 2 === 0 ? "bg-bg-base" : "bg-bg-surface"
                        }`}
                      >
                        <td className="px-3 py-2 text-text-primary">{kb.action}</td>
                        <td className="px-3 py-2 text-right">
                          <ShortcutKeys keys={getDisplay(kb)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
