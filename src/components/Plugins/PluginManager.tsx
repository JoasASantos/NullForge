import { invoke } from "@tauri-apps/api/core";
import { Search, X, Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { PluginCard, type RegistryPlugin } from "./PluginCard";
import { PluginDetail } from "./PluginDetail";
import type { PluginState } from "./types";

// ── Community registry (not-yet-installed plugins) ───────────────────────────

const REGISTRY_PLUGINS: RegistryPlugin[] = [
  {
    name: "Burp Suite Collaborator",
    id: "nullforge.burp-collab",
    description: "Burp Collaborator integration",
    author: "PortSwigger",
    version: "1.0.0",
  },
  {
    name: "Docker Target Launcher",
    id: "nullforge.docker-launcher",
    description: "Launch vulnerable Docker containers",
    author: "Community",
    version: "0.8.0",
  },
  {
    name: "ROPgadget Panel",
    id: "nullforge.ropgadget",
    description: "ROPgadget integration — search gadgets visually",
    author: "Community",
    version: "1.1.0",
  },
  {
    name: "Wireshark Capture",
    id: "nullforge.wireshark",
    description: "libpcap capture viewer inside NullForge",
    author: "Community",
    version: "0.5.0",
  },
  {
    name: "SQLMap Integration",
    id: "nullforge.sqlmap",
    description: "Visual SQLMap interface",
    author: "Community",
    version: "0.9.0",
  },
];

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "installed" | "available" | "all";

// ── PluginManager ─────────────────────────────────────────────────────────────

export function PluginManager() {
  const [plugins, setPlugins] = useState<PluginState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("installed");
  const [selectedPlugin, setSelectedPlugin] = useState<PluginState | null>(null);

  // Load plugins on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    invoke<PluginState[]>("plugins_list")
      .then((list) => {
        if (!cancelled) {
          setPlugins(list);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for nullforge:open-plugin-detail events from elsewhere in the UI
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ pluginId: string }>).detail;
      if (!detail?.pluginId) return;
      const found = plugins.find((p) => p.manifest.id === detail.pluginId);
      if (found) setSelectedPlugin(found);
    };
    window.addEventListener("nullforge:open-plugin-detail", handler);
    return () => window.removeEventListener("nullforge:open-plugin-detail", handler);
  }, [plugins]);

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    try {
      await invoke("plugin_set_enabled", { pluginId, enabled });
      setPlugins((prev) =>
        prev.map((p) =>
          p.manifest.id === pluginId ? { ...p, enabled } : p
        )
      );
      // Keep selected plugin in sync
      setSelectedPlugin((prev) =>
        prev?.manifest.id === pluginId ? { ...prev, enabled } : prev
      );
    } catch {
      // Silently keep current state if command fails
    }
  };

  // ── If a plugin is selected, show detail view ────────────────────────────
  if (selectedPlugin) {
    return (
      <PluginDetail
        plugin={selectedPlugin}
        onClose={() => setSelectedPlugin(null)}
        onToggle={handleToggle}
      />
    );
  }

  // ── Filter logic ─────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  const installedFiltered = plugins.filter((p) => {
    if (!q) return true;
    return (
      p.manifest.name.toLowerCase().includes(q) ||
      p.manifest.description.toLowerCase().includes(q)
    );
  });

  const availableFiltered = REGISTRY_PLUGINS.filter((p) => {
    // Exclude already-installed IDs
    if (plugins.some((inst) => inst.manifest.id === p.id)) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const allInstalled = installedFiltered;
  const allAvailable = availableFiltered;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Search */}
      <div className="px-2 py-1.5 flex-shrink-0 border-b border-border">
        <div className="relative">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full bg-elevated border border-border rounded pl-6 pr-6 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {(["installed", "available", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-medium transition-colors capitalize ${
              tab === t
                ? "text-text-primary border-b-2 border-accent-red -mb-px"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            {/* Installed tab */}
            {(tab === "installed" || tab === "all") && (
              <>
                {tab === "all" && installedFiltered.length > 0 && (
                  <SectionHeader label="Installed" count={installedFiltered.length} />
                )}
                {installedFiltered.length === 0 && tab === "installed" && (
                  <EmptyState
                    message={
                      search ? "No installed plugins match your search." : "No plugins installed yet."
                    }
                  />
                )}
                {installedFiltered.map((p) => (
                  <PluginCard
                    key={p.manifest.id}
                    plugin={p}
                    onToggle={handleToggle}
                    onSelect={() => setSelectedPlugin(p)}
                  />
                ))}
              </>
            )}

            {/* Available tab */}
            {(tab === "available" || tab === "all") && (
              <>
                {tab === "all" && allAvailable.length > 0 && (
                  <SectionHeader label="Available" count={allAvailable.length} />
                )}
                {allAvailable.length === 0 && tab === "available" && (
                  <EmptyState
                    message={
                      search
                        ? "No community plugins match your search."
                        : "All community plugins are already installed."
                    }
                  />
                )}
                {allAvailable.map((p) => (
                  <PluginCard
                    key={p.id}
                    plugin={p}
                    onSelect={() => {
                      // Registry plugins don't have a detail view yet — show a toast-like message
                    }}
                  />
                ))}
              </>
            )}

            {/* All tab: both empty */}
            {tab === "all" &&
              allInstalled.length === 0 &&
              allAvailable.length === 0 && (
                <EmptyState message="No plugins match your search." />
              )}
          </>
        )}
      </div>

      {/* Footer: installed count */}
      {!loading && !error && (
        <div className="px-2 py-1.5 border-t border-border flex-shrink-0 text-text-dim text-[10px]">
          <Plug size={9} className="inline mr-1 opacity-60" />
          {plugins.length} installed · {plugins.filter((p) => p.enabled).length} enabled
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-2 py-1 bg-elevated border-b border-border text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
      <span>{label}</span>
      <span className="text-text-dim">{count}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-24 gap-2 text-text-muted">
      <div className="w-5 h-5 border-2 border-border border-t-accent-red rounded-full animate-spin" />
      <span className="text-[10px]">Loading plugins…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-24 gap-1 px-3 text-center text-accent-red">
      <span className="text-[10px] font-semibold">Failed to load plugins</span>
      <span className="text-[10px] text-text-muted break-all">{message}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-20 text-text-muted text-[10px] px-3 text-center">
      {message}
    </div>
  );
}
