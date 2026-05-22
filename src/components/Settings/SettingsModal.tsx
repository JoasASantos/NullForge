import { useRef, useState, useEffect } from "react";
import { X, Cpu, Palette, Keyboard, Info, Download, Upload, RotateCcw } from "lucide-react";
import { ProvidersSettings } from "./ProvidersSettings";
import { AppearanceSettings, getAppearanceConfig } from "./AppearanceSettings";
import { KeybindingsSettings } from "./KeybindingsSettings";
import { useAppStore } from "../../store";

type Tab = "providers" | "appearance" | "keybindings" | "about";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "providers",    label: "Providers",    icon: <Cpu      size={14} /> },
  { id: "appearance",   label: "Appearance",   icon: <Palette  size={14} /> },
  { id: "keybindings",  label: "Keybindings",  icon: <Keyboard size={14} /> },
  { id: "about",        label: "About",        icon: <Info     size={14} /> },
];

// ── Settings snapshot serialization ──────────────────────────────────────────

const LS_KEYS = [
  "nullforge_appearance",
  "nullforge_theme",
  "nullforge_sidebar_w",
  "nullforge_right_w",
  "nullforge_ai_provider",
  "nullforge_claude_key",
  "nullforge_openai_key",
  "nullforge_ollama_endpoint",
];

function exportSettings() {
  const snapshot: Record<string, unknown> = { _version: 1 };
  for (const key of LS_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { snapshot[key] = JSON.parse(raw); }
        catch { snapshot[key] = raw; }
      }
    } catch { /* ignore */ }
  }
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "nullforge-settings.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importSettings(file: File, onDone: () => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const snapshot = JSON.parse(e.target?.result as string) as Record<string, unknown>;
      for (const key of LS_KEYS) {
        if (key in snapshot) {
          const val = snapshot[key];
          localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
        }
      }
      // Apply appearance immediately
      const appearance = snapshot["nullforge_appearance"];
      if (appearance) {
        window.dispatchEvent(new CustomEvent("nullforge:settings-changed", { detail: appearance }));
      }
      // Apply theme
      const theme = snapshot["nullforge_theme"];
      if (theme === "light" || theme === "dark") {
        useAppStore.getState().setTheme(theme);
      }
      onDone();
    } catch {
      // ignore malformed JSON
    }
  };
  reader.readAsText(file);
}

function resetAllSettings(onDone: () => void) {
  for (const key of LS_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
  useAppStore.getState().setTheme("dark");
  window.dispatchEvent(new CustomEvent("nullforge:settings-changed", {
    detail: getAppearanceConfig(), // returns defaults
  }));
  onDone();
}

// ── About panel ───────────────────────────────────────────────────────────────

function AboutPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-bg-elevated border border-border/50 flex items-center justify-center overflow-hidden">
        <img src="/logo.png" alt="NullForge" className="w-16 h-16 object-contain" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-text-primary mb-0.5">NullForge</h2>
        <p className="text-sm text-text-muted">AI-Powered Exploit Development Platform</p>
        <p className="text-xs text-text-dim mt-0.5">v0.1.0</p>
      </div>

      {/* Creator */}
      <div className="bg-bg-elevated border border-border rounded-lg px-5 py-3 w-full max-w-xs">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-1">Created by</p>
        <p className="text-sm font-semibold text-text-primary">Joas A Santos</p>
        <p className="text-xs text-accent-red font-medium">Null Forge</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs w-full max-w-xs">
        {[
          ["Framework",  "Tauri v2"],
          ["UI",         "React + TypeScript"],
          ["Editor",     "Monaco Editor"],
          ["Disasm",     "Capstone"],
          ["AI",         "Claude / GPT / Ollama"],
          ["License",    "MIT"],
        ].map(([k, v]) => (
          <div key={k} className="bg-bg-elevated rounded p-2 border border-border text-left">
            <div className="text-text-dim text-[10px]">{k}</div>
            <div className="text-text-primary font-medium">{v}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-dim max-w-xs leading-relaxed">
        Built for security researchers, CTF players, red teamers and vulnerability researchers.
      </p>
    </div>
  );
}

// ── Settings modal ─────────────────────────────────────────────────────────────

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("providers");
  const [toast, setToast] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[80vw] h-[80vh] max-w-4xl bg-bg-base border border-border rounded-xl shadow-lg
          flex flex-col overflow-hidden scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-surface flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary tracking-wide">Settings</span>
          <div className="flex items-center gap-1">
            {/* Export */}
            <button
              onClick={() => { exportSettings(); showToast("Settings exported"); }}
              title="Export settings as JSON"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted
                hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <Download size={12} />
              Export
            </button>
            {/* Import */}
            <button
              onClick={() => importRef.current?.click()}
              title="Import settings from JSON"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted
                hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <Upload size={12} />
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importSettings(file, () => { showToast("Settings imported"); e.target.value = ""; });
              }}
            />
            {/* Reset all */}
            <button
              onClick={() => {
                if (confirm("Reset all settings to defaults?")) {
                  resetAllSettings(() => showToast("Settings reset to defaults"));
                }
              }}
              title="Reset all settings to defaults"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted
                hover:text-semantic-danger hover:bg-bg-elevated transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-44 bg-bg-surface border-r border-border flex flex-col flex-shrink-0 py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors text-left ${
                  activeTab === tab.id
                    ? "bg-accent-red/10 text-accent-red border-r-2 border-accent-red"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "providers"   && <ProvidersSettings />}
            {activeTab === "appearance"  && <AppearanceSettings />}
            {activeTab === "keybindings" && <KeybindingsSettings />}
            {activeTab === "about"       && <AboutPanel />}
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md
            bg-bg-elevated border border-border text-xs text-text-primary shadow-md fade-in">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
