import type { PluginState } from "./types";

export interface RegistryPlugin {
  name: string;
  id: string;
  description: string;
  author: string;
  version: string;
}

// ── Permission badge config ───────────────────────────────────────────────────

const PERMISSION_COLORS: Record<string, string> = {
  shell:      "bg-red-500/20 text-red-400 border border-red-500/30",
  network:    "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  aiContext:  "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  filesystem: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
};

// ── Icon helpers ──────────────────────────────────────────────────────────────

/** Generate a deterministic hue from a string so each plugin gets a unique icon colour. */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 360;
}

function PluginIcon({ name }: { name: string }) {
  const hue = nameToHue(name);
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm select-none"
      style={{
        background: `hsl(${hue},55%,35%)`,
        border: `1px solid hsl(${hue},55%,45%)`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      title={enabled ? "Disable" : "Enable"}
      className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
        enabled ? "bg-accent-green" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── PluginCard ────────────────────────────────────────────────────────────────

interface PluginCardProps {
  plugin: PluginState | RegistryPlugin;
  onToggle?: (id: string, enabled: boolean) => void;
  onSelect: () => void;
}

function isPluginState(p: PluginState | RegistryPlugin): p is PluginState {
  return "installed" in p;
}

export function PluginCard({ plugin, onToggle, onSelect }: PluginCardProps) {
  const installed = isPluginState(plugin);
  const enabled = installed ? plugin.enabled : false;
  const permissions = installed ? plugin.manifest.permissions : [];
  const name = installed ? plugin.manifest.name : plugin.name;
  const version = installed ? plugin.manifest.version : plugin.version;
  const description = installed ? plugin.manifest.description : plugin.description;
  const id = installed ? plugin.manifest.id : plugin.id;

  return (
    <div
      onClick={onSelect}
      className="px-2 py-2 cursor-pointer hover:bg-elevated transition-colors group border-b border-border last:border-b-0"
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <PluginIcon name={name} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-text-primary truncate leading-tight">
              {name}
            </span>
            <span className="text-[10px] text-text-dim flex-shrink-0">v{version}</span>
          </div>
          <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Permission badges */}
          {permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {permissions.map((perm) => (
                <span
                  key={perm}
                  className={`text-[9px] px-1 py-0.5 rounded ${
                    PERMISSION_COLORS[perm] ?? "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {perm}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 flex items-center pt-0.5">
          {installed ? (
            <Toggle
              enabled={enabled}
              onChange={(v) => onToggle?.(id, v)}
            />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Install action placeholder
              }}
              className="text-[10px] px-2 py-0.5 rounded border border-accent-red text-accent-red hover:bg-accent-red/10 transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
