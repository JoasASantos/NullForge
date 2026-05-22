import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { useAppStore } from "../../store";

const FONT_FAMILIES = [
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "Cascadia Code", value: "'Cascadia Code', monospace" },
  { label: "Menlo", value: "Menlo, monospace" },
];

const APPEARANCE_KEY = "nullforge_appearance";

const DEFAULTS: AppearanceConfig = {
  fontSize: 13,
  tabSize: 4,
  lineHeight: 1.6,
  showMinimap: true,
  compactUI: false,
  fontFamily: "'JetBrains Mono', monospace",
};

export interface AppearanceConfig {
  fontSize: number;
  tabSize: 2 | 4;
  lineHeight: number;
  showMinimap: boolean;
  compactUI: boolean;
  fontFamily: string;
}

export function getAppearanceConfig(): AppearanceConfig {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return JSON.parse(raw) as AppearanceConfig;
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

function saveAppearanceConfig(cfg: AppearanceConfig) {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("nullforge:settings-changed", { detail: cfg }));
}

export function AppearanceSettings() {
  const { theme, setTheme } = useAppStore();
  const [cfg, setCfg] = useState<AppearanceConfig>(getAppearanceConfig);

  function update<K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    saveAppearanceConfig(next);
  }

  // Live preview text
  const previewStyle: React.CSSProperties = {
    fontFamily: cfg.fontFamily,
    fontSize: `${cfg.fontSize}px`,
    lineHeight: cfg.lineHeight,
  };

  useEffect(() => {
    saveAppearanceConfig(cfg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Reset appearance */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-text-primary">Appearance</h3>
        <button
          onClick={() => {
            setCfg({ ...DEFAULTS });
            saveAppearanceConfig({ ...DEFAULTS });
          }}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
          title="Reset appearance to defaults"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Color Theme</label>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-2 text-xs rounded border transition-colors capitalize ${
                theme === t
                  ? "bg-accent-red/20 border-accent-red/50 text-accent-red"
                  : "bg-bg-base border-border text-text-muted hover:border-text-muted"
              }`}
            >
              {t === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-text-muted">Font Size</label>
          <span className="text-xs text-text-primary font-mono">{cfg.fontSize}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={20}
          value={cfg.fontSize}
          onChange={(e) => update("fontSize", parseInt(e.target.value, 10))}
          className="w-full accent-accent-red"
        />
      </div>

      {/* Tab Size */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Tab Size</label>
        <div className="flex gap-2">
          {([2, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => update("tabSize", n)}
              className={`px-4 py-1.5 text-xs rounded border transition-colors ${
                cfg.tabSize === n
                  ? "bg-accent-red/20 border-accent-red/50 text-accent-red"
                  : "bg-bg-base border-border text-text-muted hover:border-text-muted"
              }`}
            >
              {n} spaces
            </button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-text-muted">Line Height</label>
          <span className="text-xs text-text-primary font-mono">{cfg.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={12}
          max={20}
          value={Math.round(cfg.lineHeight * 10)}
          onChange={(e) => update("lineHeight", parseInt(e.target.value, 10) / 10)}
          className="w-full accent-accent-red"
        />
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs text-text-muted mb-1">Font Family</label>
        <select
          value={cfg.fontFamily}
          onChange={(e) => update("fontFamily", e.target.value)}
          className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.showMinimap}
            onChange={(e) => update("showMinimap", e.target.checked)}
            className="accent-accent-red"
          />
          <span className="text-xs text-text-primary">Show Minimap</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.compactUI}
            onChange={(e) => update("compactUI", e.target.checked)}
            className="accent-accent-red"
          />
          <span className="text-xs text-text-primary">Compact UI</span>
          <span className="text-xs text-text-muted">(reduces padding)</span>
        </label>
      </div>

      {/* Live Preview */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Preview</label>
        <div
          className="bg-bg-base border border-border rounded p-3 text-text-primary"
          style={previewStyle}
        >
          <span className="text-accent-red">fn </span>
          <span className="text-accent-green">exploit</span>
          <span className="text-text-muted">(target: </span>
          <span className="text-accent-yellow">u64</span>
          <span className="text-text-muted">) -&gt; </span>
          <span className="text-accent-yellow">Result</span>
          <span className="text-text-primary">{" {"}</span>
          <br />
          <span style={{ marginLeft: `${cfg.tabSize * 7}px` }} className="text-text-muted">
            // craft payload
          </span>
          <br />
          <span className="text-text-primary">{"}"}</span>
        </div>
      </div>
    </div>
  );
}
