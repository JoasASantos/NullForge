import { useAppStore } from "../../store";
import { getPlatform } from "../../lib/platform";
import { LAYOUT_PRESETS } from "../../lib/layoutPresets";

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  openai: "OpenAI",
  ollama: "Ollama",
};

const PLATFORM_LABELS: Record<ReturnType<typeof getPlatform>, string> = {
  mac:     "macOS",
  windows: "Windows",
  linux:   "Linux",
};

const LANG_LABELS: Record<string, string> = {
  python:     "Python",
  c:          "C",
  cpp:        "C++",
  rust:       "Rust",
  asm:        "Assembly x86-64",
  nasm:       "NASM",
  javascript: "JavaScript",
  typescript: "TypeScript",
  bash:       "Shell",
  powershell: "PowerShell",
  json:       "JSON",
  yaml:       "YAML",
  markdown:   "Markdown",
  xml:        "XML",
  sql:        "SQL",
};

export function StatusBar() {
  const {
    aiConfig,
    activeEditorId,
    editorTabs,
    activeLayoutPreset,
  } = useAppStore();

  const platform = getPlatform();
  const platformLabel = PLATFORM_LABELS[platform];

  const providerLabel = PROVIDER_LABELS[aiConfig.provider] ?? aiConfig.provider;
  const modelShort = aiConfig.model
    ? aiConfig.model.length > 24
      ? aiConfig.model.slice(0, 24) + "…"
      : aiConfig.model
    : "no model";

  const activeTab = editorTabs.find((t) => t.id === activeEditorId);
  const langLabel = activeTab ? (LANG_LABELS[activeTab.language] ?? activeTab.language) : null;

  const preset = LAYOUT_PRESETS.find((p) => p.id === activeLayoutPreset);

  function openSettings() {
    window.dispatchEvent(new CustomEvent("nullforge:open-settings"));
  }
  function openLayoutPalette() {
    window.dispatchEvent(new CustomEvent("nullforge:layout-palette"));
  }
  function openCheatSheet() {
    window.dispatchEvent(new CustomEvent("nullforge:cheat-sheet"));
  }

  return (
    <div className="h-5 flex items-center px-3 bg-bg-surface border-t border-border flex-shrink-0 text-[11px] text-text-muted gap-2.5 select-none">
      {/* Left: NullForge version */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block" />
        <span className="text-accent-green font-semibold">NullForge</span>
        <span>v0.1.0</span>
      </div>

      <span className="text-border">│</span>

      {/* AI provider — click to open settings */}
      <button
        onClick={openSettings}
        className="flex items-center gap-1.5 hover:text-text-primary transition-colors flex-shrink-0"
        title="AI Settings"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            aiConfig.apiKey || aiConfig.provider === "ollama"
              ? "bg-accent-green"
              : "bg-accent-yellow"
          }`}
        />
        <span>{providerLabel}</span>
        <span className="text-border">·</span>
        <span className="font-mono">{modelShort}</span>
      </button>

      <div className="flex-1" />

      {/* Active language */}
      {langLabel && (
        <>
          <span className="text-text-muted flex-shrink-0">{langLabel}</span>
          <span className="text-border">│</span>
        </>
      )}

      {/* Layout preset — click to switch */}
      {preset && (
        <>
          <button
            onClick={openLayoutPalette}
            className="flex items-center gap-1 hover:text-text-primary transition-colors flex-shrink-0"
            title="Switch layout preset"
          >
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
          <span className="text-border">│</span>
        </>
      )}

      {/* Platform */}
      <span className="text-text-muted flex-shrink-0">{platformLabel}</span>
      <span className="text-border">│</span>

      {/* Encoding / line endings */}
      <span className="text-text-muted flex-shrink-0">UTF-8</span>
      <span className="text-border">│</span>
      <span className="text-text-muted flex-shrink-0">LF</span>
      <span className="text-border">│</span>

      {/* Cheat sheet shortcut hint */}
      <button
        onClick={openCheatSheet}
        className="hover:text-text-primary transition-colors flex-shrink-0"
        title="Keyboard shortcuts"
      >
        ?
      </button>
    </div>
  );
}
