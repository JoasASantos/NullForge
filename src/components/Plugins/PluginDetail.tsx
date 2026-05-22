import { ArrowLeft, ExternalLink, Shield, Terminal, Network, Brain, HardDrive, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { PluginState } from "./types";

// ── Permission descriptions ───────────────────────────────────────────────────

const PERM_META: Record<
  string,
  { label: string; description: string; color: string; Icon: LucideIcon }
> = {
  shell: {
    label: "Shell",
    description: "Execute arbitrary shell commands on the host system.",
    color: "text-red-400",
    Icon: Terminal,
  },
  network: {
    label: "Network",
    description: "Establish outbound and inbound network connections.",
    color: "text-blue-400",
    Icon: Network,
  },
  aiContext: {
    label: "AI Context",
    description: "Inject plugin data into the NullForge AI assistant context.",
    color: "text-purple-400",
    Icon: Brain,
  },
  filesystem: {
    label: "Filesystem",
    description: "Read and write files outside the project workspace.",
    color: "text-orange-400",
    Icon: HardDrive,
  },
};

const UnknownIcon: LucideIcon = Shield;

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        enabled ? "bg-accent-green" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── PluginDetail ──────────────────────────────────────────────────────────────

interface PluginDetailProps {
  plugin: PluginState;
  onClose: () => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function PluginDetail({ plugin, onClose, onToggle }: PluginDetailProps) {
  const { manifest, enabled } = plugin;
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const handleOpenUrl = (url: string) => {
    // In a real Tauri app: invoke("open_url") or tauri shell open
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-bg-base text-xs">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 bg-surface">
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-elevated"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-text-muted">Plugins</span>
        <span className="text-text-dim">/</span>
        <span className="text-text-primary font-medium">{manifest.name}</span>
      </div>

      <div className="flex-1 px-5 py-4 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <PluginIconLarge name={manifest.name} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold text-text-primary leading-tight">
                {manifest.name}
              </h1>
              <Toggle
                enabled={enabled}
                onChange={(v) => onToggle(manifest.id, v)}
              />
            </div>
            <div className="flex items-center gap-2 mt-1 text-text-muted flex-wrap">
              <span>v{manifest.version}</span>
              <span className="text-border">·</span>
              <span>{manifest.author}</span>
              {manifest.license && (
                <>
                  <span className="text-border">·</span>
                  <span>{manifest.license}</span>
                </>
              )}
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {manifest.permissions.map((perm) => {
                const meta = PERM_META[perm];
                return (
                  <span
                    key={perm}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      perm === "shell"      ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      perm === "network"    ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      perm === "aiContext"  ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                      perm === "filesystem" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                             "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }`}
                  >
                    {meta ? meta.label : perm}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        <Section title="Description">
          <p className="text-text-muted leading-relaxed">{manifest.description}</p>
        </Section>

        {/* ── Permissions ── */}
        {manifest.permissions.length > 0 && (
          <Section title="Permissions">
            <div className="space-y-2">
              {manifest.permissions.map((perm) => {
                const meta = PERM_META[perm];
                const Icon = meta ? meta.Icon : UnknownIcon;
                return (
                  <div key={perm} className="flex items-start gap-2.5">
                    <Icon
                      size={14}
                      className={`mt-0.5 flex-shrink-0 ${meta ? meta.color : "text-text-muted"}`}
                    />
                    <div>
                      <span className="font-medium text-text-primary">
                        {meta ? meta.label : perm}
                      </span>
                      {meta && (
                        <p className="text-text-muted mt-0.5">{meta.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Commands ── */}
        {manifest.contributes.commands.length > 0 && (
          <Section title="Contributed Commands">
            <div className="border border-border rounded overflow-hidden">
              {manifest.contributes.commands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    idx < manifest.contributes.commands.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <span className="text-text-primary">{cmd.title}</span>
                  <code className="text-[10px] text-text-muted font-mono bg-elevated px-1.5 py-0.5 rounded">
                    {cmd.id}
                  </code>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Panels ── */}
        {manifest.contributes.panels.length > 0 && (
          <Section title="Contributed Panels">
            <div className="border border-border rounded overflow-hidden">
              {manifest.contributes.panels.map((panel, idx) => (
                <div
                  key={panel.id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    idx < manifest.contributes.panels.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <span className="text-text-primary">{panel.title}</span>
                  <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-elevated">
                    {panel.location}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Links ── */}
        {(manifest.repository || manifest.homepage) && (
          <Section title="Links">
            <div className="space-y-1.5">
              {manifest.repository && (
                <button
                  onClick={() => handleOpenUrl(manifest.repository!)}
                  className="flex items-center gap-1.5 text-text-muted hover:text-accent-red transition-colors"
                >
                  <ExternalLink size={11} />
                  <span className="truncate">{manifest.repository}</span>
                </button>
              )}
              {manifest.homepage && (
                <button
                  onClick={() => handleOpenUrl(manifest.homepage!)}
                  className="flex items-center gap-1.5 text-text-muted hover:text-accent-red transition-colors"
                >
                  <ExternalLink size={11} />
                  <span className="truncate">{manifest.homepage}</span>
                </button>
              )}
            </div>
          </Section>
        )}

        {/* ── Danger Zone ── */}
        <Section title="Danger Zone">
          <div className="border border-red-500/30 rounded p-3 bg-red-500/5">
            <p className="text-text-muted mb-3">
              Uninstalling a plugin removes its files from the user plugin directory. Built-in
              plugins cannot be uninstalled — they will be re-bundled on next launch.
            </p>
            {confirmUninstall ? (
              <div className="flex items-center gap-2">
                <span className="text-red-400">Are you sure?</span>
                <button
                  onClick={() => {
                    // Uninstall action placeholder
                    setConfirmUninstall(false);
                  }}
                  className="px-2 py-1 bg-accent-red/20 text-accent-red border border-accent-red/30 rounded hover:bg-accent-red/30 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmUninstall(false)}
                  className="px-2 py-1 text-text-muted border border-border rounded hover:bg-elevated transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmUninstall(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red/10 text-accent-red border border-accent-red/30 rounded hover:bg-accent-red/20 transition-colors"
              >
                <Trash2 size={12} />
                Uninstall Plugin
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function PluginIconLarge({ name }: { name: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-2xl select-none shadow-lg"
      style={{
        background: `hsl(${hue},55%,35%)`,
        border: `1px solid hsl(${hue},55%,45%)`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
