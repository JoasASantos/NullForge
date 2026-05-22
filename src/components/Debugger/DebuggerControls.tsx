import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  FolderOpen,
  Pause,
  Pin,
  Play,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { useState } from "react";

// ── Recent binary files ───────────────────────────────────────────────────────

const RECENT_KEY = "nullforge_recent_debugger";

interface RecentFile {
  path: string;
  name: string;
  lastOpened: string;
  pinned?: boolean;
}

function getRecent(): RecentFile[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as RecentFile[]; } catch { return []; }
}

function pushRecent(path: string) {
  const name = path.split(/[\\/]/).pop() || path;
  const existing = getRecent().filter((f) => f.path !== path);
  const updated = [{ path, name, lastOpened: new Date().toISOString() }, ...existing].slice(0, 15);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function togglePin(path: string) {
  const list = getRecent().map((f) => f.path === path ? { ...f, pinned: !f.pinned } : f);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function removeRecent(path: string) {
  const list = getRecent().filter((f) => f.path !== path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DebuggerControlsProps {
  status: "idle" | "running" | "stopped" | "error";
  binaryPath: string;
  onLoadBinary: (path: string) => void;
  onCommand: (cmd: string) => void;
  onStop: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DebuggerControls({
  status,
  binaryPath,
  onLoadBinary,
  onCommand,
  onStop,
}: DebuggerControlsProps) {
  const [recent, setRecent] = useState<RecentFile[]>(getRecent);
  const [recentOpen, setRecentOpen] = useState(false);

  const isIdle = status === "idle";

  const btnClass = (disabled: boolean, danger = false) =>
    `flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
      disabled
        ? "border-border text-text-dim cursor-not-allowed opacity-40"
        : danger
        ? "border-accent-red text-accent-red hover:bg-accent-red hover:text-bg-base cursor-pointer"
        : "border-border text-text-muted hover:border-accent-green hover:text-accent-green cursor-pointer"
    }`;

  const activeClass =
    status === "running"
      ? "border-accent-red text-accent-red"
      : "border-border text-text-muted hover:border-accent-green hover:text-accent-green";

  function refreshRecent() {
    setRecent(getRecent());
  }

  const handleBrowse = async () => {
    try {
      const lastDir = localStorage.getItem("nullforge_last_dir_debugger") || undefined;
      const selected = await openDialog({
        multiple: false,
        defaultPath: lastDir,
      });
      if (typeof selected === "string" && selected) {
        const dir = selected.includes("/")
          ? selected.split("/").slice(0, -1).join("/")
          : selected.split("\\").slice(0, -1).join("\\");
        localStorage.setItem("nullforge_last_dir_debugger", dir);
        pushRecent(selected);
        refreshRecent();
        onLoadBinary(selected);
      }
    } catch {
      // user cancelled
    }
  };

  const handleSelectRecent = (path: string) => {
    pushRecent(path);
    refreshRecent();
    setRecentOpen(false);
    onLoadBinary(path);
  };

  return (
    <div className="flex flex-col gap-1 px-2 py-1 border-b border-border bg-surface flex-shrink-0">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Load Binary — opens native file dialog */}
        <button
          onClick={handleBrowse}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors border-border text-text-muted hover:border-accent-blue hover:text-accent-blue cursor-pointer"
          title="Open binary file"
        >
          <FolderOpen size={12} />
          <span>Load</span>
        </button>

        {/* Recent files button */}
        <button
          onClick={() => setRecentOpen((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
            recentOpen
              ? "border-accent-blue text-accent-blue"
              : "border-border text-text-dim hover:border-text-muted hover:text-text-muted"
          }`}
          title="Recent binaries"
        >
          <Clock size={12} />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Run */}
        <button
          disabled={isIdle}
          onClick={() => !isIdle && onCommand("-exec-run")}
          className={btnClass(isIdle)}
          title="Run (-exec-run)"
        >
          <Play size={12} />
          <span>Run</span>
        </button>

        {/* Pause */}
        <button
          disabled={isIdle || status !== "running"}
          onClick={() => status === "running" && onCommand("-exec-interrupt")}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
            status === "running"
              ? "border-accent-red text-accent-red hover:bg-accent-red hover:text-bg-base cursor-pointer"
              : "border-border text-text-dim cursor-not-allowed opacity-40"
          }`}
          title="Pause (-exec-interrupt)"
        >
          <Pause size={12} />
          <span>Pause</span>
        </button>

        {/* Step Over */}
        <button
          disabled={status !== "stopped"}
          onClick={() => status === "stopped" && onCommand("-exec-next")}
          className={btnClass(status !== "stopped")}
          title="Step Over (-exec-next)"
        >
          <SkipForward size={12} />
          <span>Over</span>
        </button>

        {/* Step Into */}
        <button
          disabled={status !== "stopped"}
          onClick={() => status === "stopped" && onCommand("-exec-step")}
          className={btnClass(status !== "stopped")}
          title="Step Into (-exec-step)"
        >
          <ArrowDown size={12} />
          <span>Into</span>
        </button>

        {/* Step Out */}
        <button
          disabled={status !== "stopped"}
          onClick={() => status === "stopped" && onCommand("-exec-finish")}
          className={btnClass(status !== "stopped")}
          title="Step Out (-exec-finish)"
        >
          <ArrowUp size={12} />
          <span>Out</span>
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Stop */}
        <button
          disabled={isIdle}
          onClick={() => !isIdle && onStop()}
          className={btnClass(isIdle, true)}
          title="Stop session"
        >
          <Square size={12} />
          <span>Stop</span>
        </button>

        {/* Status badge */}
        <div className="flex-1" />
        <div
          className={`px-2 py-0.5 rounded text-xs font-mono border ${
            status === "idle"
              ? "border-border text-text-dim"
              : status === "running"
              ? `border-accent-red text-accent-red ${activeClass}`
              : status === "stopped"
              ? "border-accent-green text-accent-green"
              : "border-accent-yellow text-accent-yellow"
          }`}
        >
          {status.toUpperCase()}
        </div>
      </div>

      {/* Recent files dropdown */}
      {recentOpen && (
        <div className="border border-border rounded bg-bg-base overflow-hidden">
          {recent.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-text-dim">No recent files.</p>
          ) : (
            [...recent]
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
              .map((f) => (
                <div key={f.path} className="flex items-center gap-1 px-2 py-1 hover:bg-elevated group">
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => handleSelectRecent(f.path)}
                  >
                    <div className="text-xs text-text-primary truncate font-mono">{f.name}</div>
                    <div className="text-[10px] text-text-dim truncate">{f.path}</div>
                  </button>
                  <button
                    onClick={() => { togglePin(f.path); refreshRecent(); }}
                    title={f.pinned ? "Unpin" : "Pin"}
                    className={`p-0.5 rounded flex-shrink-0 ${
                      f.pinned ? "text-accent-yellow" : "text-text-dim hover:text-text-muted opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Pin size={9} />
                  </button>
                  <button
                    onClick={() => { removeRecent(f.path); refreshRecent(); }}
                    title="Remove"
                    className="p-0.5 rounded flex-shrink-0 text-text-dim hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {/* Current binary label */}
      {binaryPath && (
        <div className="text-xs font-mono text-text-dim truncate">
          Target: <span className="text-text-muted">{binaryPath}</span>
        </div>
      )}
    </div>
  );
}
