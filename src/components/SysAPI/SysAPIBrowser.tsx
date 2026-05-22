import { useMemo, useState } from "react";
import { Search, Copy, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import {
  WINDOWS_SYSCALLS, LINUX_SYSCALLS, WINDOWS_APIS,
  CATEGORIES, CATEGORY_COLORS,
  type WinSyscall, type LinuxSyscall, type WinAPI, type SysCategory,
} from "../../data/syscallsData";

type Tab = "win_syscall" | "linux_syscall" | "win_api";
type Item = WinSyscall | LinuxSyscall | WinAPI;

function isWinSyscall(i: Item): i is WinSyscall { return "id" in i && "args" in i && !("returnType" in i) && !("module" in i); }
function isLinuxSyscall(i: Item): i is LinuxSyscall { return "id" in i && "returnType" in i; }
function isWinAPI(i: Item): i is WinAPI { return "module" in i && "signature" in i; }

function itemCategory(i: Item): SysCategory {
  return i.category;
}
function itemName(i: Item): string { return i.name; }

function CategoryBadge({ cat }: { cat: SysCategory }) {
  return (
    <span className={`text-[9px] px-1 py-px rounded border ${CATEGORY_COLORS[cat]}`}>
      {cat}
    </span>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ItemDetail({ item, onClose }: { item: Item; onClose: () => void }) {
  const openInEditor = () => {
    const code = item.example ?? `// ${item.name}\n// No example available`;
    window.dispatchEvent(new CustomEvent("nullforge:open-file", {
      detail: { name: item.name + ".c", language: "c", content: code },
    }));
  };

  const copyName = () => navigator.clipboard.writeText(item.name).catch(() => {});

  return (
    <div className="border-t border-border bg-bg-base flex flex-col max-h-72 overflow-y-auto">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-surface flex-shrink-0">
        <span className="font-mono text-xs text-text-primary font-medium truncate">{item.name}</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[10px] ml-2">✕</button>
      </div>

      <div className="px-2 py-2 space-y-2 text-[10px]">
        {/* Category + module */}
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge cat={itemCategory(item)} />
          {isWinSyscall(item) && (
            <span className="font-mono text-text-dim">id: 0x{item.id.toString(16).padStart(4, "0")}</span>
          )}
          {isLinuxSyscall(item) && (
            <span className="font-mono text-text-dim">#{item.id} → {item.returnType}</span>
          )}
          {isWinAPI(item) && (
            <span className="text-text-dim">{item.module}</span>
          )}
        </div>

        {/* Description */}
        <p className="text-text-muted leading-snug">{item.description}</p>

        {/* Malware use */}
        {isWinAPI(item) && item.malwareUse && (
          <div className="bg-red-500/10 border border-red-500/20 rounded px-1.5 py-1">
            <span className="text-red-400 font-medium">Malware use: </span>
            <span className="text-text-muted">{item.malwareUse}</span>
          </div>
        )}

        {/* Signature / args */}
        {isWinAPI(item) && (
          <div>
            <div className="text-text-dim mb-0.5">Signature:</div>
            <pre className="font-mono text-[9px] text-text-muted bg-elevated rounded p-1.5 whitespace-pre-wrap break-all leading-relaxed">
              {item.signature}
            </pre>
          </div>
        )}

        {(isWinSyscall(item) || isLinuxSyscall(item)) && item.args.length > 0 && (
          <div>
            <div className="text-text-dim mb-0.5">Parameters:</div>
            <div className="space-y-px">
              {item.args.map((a, i) => (
                <div key={i} className="font-mono text-[9px] text-text-muted bg-elevated rounded px-1.5 py-0.5">{a}</div>
              ))}
            </div>
          </div>
        )}

        {/* Example */}
        {item.example && (
          <div>
            <div className="text-text-dim mb-0.5">Example:</div>
            <pre className="font-mono text-[9px] text-text-muted bg-elevated rounded p-1.5 whitespace-pre-wrap break-all leading-relaxed">
              {item.example}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={copyName}
            className="flex items-center gap-1 px-2 py-1 rounded bg-elevated text-text-muted hover:text-text-primary border border-border hover:border-accent-red transition-colors text-[10px]"
          >
            <Copy size={9} /> Name
          </button>
          {item.example && (
            <button
              onClick={openInEditor}
              className="flex items-center gap-1 px-2 py-1 rounded bg-elevated text-text-muted hover:text-text-primary border border-border hover:border-accent-red transition-colors text-[10px]"
            >
              <ExternalLink size={9} /> Editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ItemRow({ item, selected, onClick }: { item: Item; selected: boolean; onClick: () => void }) {
  const cat = itemCategory(item);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-2 py-1 transition-colors ${
        selected ? "bg-elevated border-l-2 border-accent-red" : "border-l-2 border-transparent hover:bg-elevated"
      }`}
    >
      {selected ? <ChevronDown size={10} className="text-accent-red flex-shrink-0" /> : <ChevronRight size={10} className="text-text-dim flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] text-text-primary truncate">{item.name}</div>
        <div className="flex items-center gap-1.5 mt-px">
          <CategoryBadge cat={cat} />
          {(isWinSyscall(item) || isLinuxSyscall(item)) && (
            <span className="font-mono text-[9px] text-text-dim">#{(item as WinSyscall | LinuxSyscall).id}</span>
          )}
          {isWinAPI(item) && (
            <span className="text-[9px] text-text-dim truncate">{item.module}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main browser ──────────────────────────────────────────────────────────────

export function SysAPIBrowser() {
  const [tab, setTab] = useState<Tab>("win_syscall");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<SysCategory | "all">("all");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showCats, setShowCats] = useState(false);

  const allItems: Item[] = useMemo(() => {
    if (tab === "win_syscall") return WINDOWS_SYSCALLS;
    if (tab === "linux_syscall") return LINUX_SYSCALLS;
    return WINDOWS_APIS;
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const catMatch = catFilter === "all" || item.category === catFilter;
      return (nameMatch || descMatch) && catMatch;
    });
  }, [allItems, query, catFilter]);

  const selectedItem = filtered.find((i) => i.name === selectedName) ?? null;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "win_syscall", label: "NT Syscalls", count: WINDOWS_SYSCALLS.length },
    { id: "linux_syscall", label: "Linux", count: LINUX_SYSCALLS.length },
    { id: "win_api", label: "Win API", count: WINDOWS_APIS.length },
  ];

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedName(null); }}
            className={`flex-1 px-1 py-1.5 text-[10px] transition-colors border-b-2 ${
              tab === t.id
                ? "border-accent-red text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
            <span className="ml-1 text-text-dim">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-elevated border border-border rounded px-2 py-1">
          <Search size={10} className="text-text-dim flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or description..."
            className="flex-1 bg-transparent text-[10px] text-text-primary placeholder-text-muted outline-none"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="px-2 py-1 border-b border-border flex-shrink-0">
        <button
          onClick={() => setShowCats((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary"
        >
          {showCats ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          Category: <span className="text-text-primary ml-1">{catFilter}</span>
        </button>
        {showCats && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            <button
              onClick={() => { setCatFilter("all"); setShowCats(false); }}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${catFilter === "all" ? "border-accent-red text-accent-red bg-red-500/10" : "border-border text-text-muted hover:border-text-dim"}`}
            >
              all
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCatFilter(c); setShowCats(false); }}
                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${catFilter === c ? "border-accent-red text-accent-red bg-red-500/10" : "border-border text-text-muted hover:border-text-dim"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[10px] text-text-dim">
            No results
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.name}>
              <ItemRow
                item={item}
                selected={selectedName === item.name}
                onClick={() => setSelectedName(selectedName === item.name ? null : item.name)}
              />
              {selectedName === item.name && selectedItem && (
                <ItemDetail item={selectedItem} onClose={() => setSelectedName(null)} />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-border flex-shrink-0 text-[10px] text-text-dim">
        {filtered.length} / {allItems.length} entries
      </div>
    </div>
  );
}
