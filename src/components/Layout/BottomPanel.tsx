import { useCallback, useRef, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save } from "lucide-react";
import { BottomTab, useAppStore } from "../../store";
import { ShellManager } from "../Shell/ShellManager";

const TABS: { id: BottomTab; label: string }[] = [
  { id: "shell", label: "SHELL" },
  { id: "output", label: "OUTPUT" },
  { id: "problems", label: "PROBLEMS" },
];

export function BottomPanel() {
  const {
    bottomPanelOpen,
    toggleBottomPanel,
    bottomPanelHeight,
    setBottomPanelHeight,
    activeBottomTab,
    setActiveBottomTab,
  } = useAppStore();

  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startY: e.clientY, startH: bottomPanelHeight };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        const newH = Math.max(120, Math.min(600, dragRef.current.startH + delta));
        setBottomPanelHeight(newH);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [bottomPanelHeight, setBottomPanelHeight]
  );

  if (!bottomPanelOpen) return null;

  return (
    <div
      className="flex flex-col bg-bg-base border-t border-border flex-shrink-0"
      style={{ height: bottomPanelHeight }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="h-1 cursor-row-resize hover:bg-accent-red transition-colors flex-shrink-0"
      />

      {/* Tab bar */}
      <div className="flex items-center bg-surface border-b border-border h-8 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBottomTab(tab.id)}
            className={`
              px-3 h-full text-xs font-medium tracking-wider transition-colors
              ${
                activeBottomTab === tab.id
                  ? "text-text-primary border-b-2 border-accent-red"
                  : "text-text-muted hover:text-text-primary"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleBottomPanel}
          className="px-3 h-full text-text-muted hover:text-text-primary text-xs"
          title="Close Panel"
        >
          ×
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeBottomTab === "shell" && <ShellManager />}
        {activeBottomTab === "output" && <OutputPanel />}
        {activeBottomTab === "problems" && <PanelPlaceholder label="Problems" />}
      </div>
    </div>
  );
}

function PanelPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-text-muted">
      {label}
    </div>
  );
}

function OutputPanel() {
  const [lines, setLines] = useState<string[]>([
    `[NullForge] Session started at ${new Date().toLocaleString()}`,
  ]);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail;
      if (text) setLines((prev) => [...prev, text]);
    };
    window.addEventListener("nullforge:output-log", handler);
    return () => window.removeEventListener("nullforge:output-log", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  async function saveOutput() {
    setSaving(true);
    try {
      const home = await invoke<string | null>("show_save_dialog", { defaultName: "nullforge_session.log" });
      if (home) {
        await invoke("save_text_file", { path: home, content: lines.join("\n") });
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-border bg-surface flex-shrink-0">
        <span className="text-[10px] text-text-dim">{lines.length} lines</span>
        <div className="flex gap-1">
          <button
            onClick={() => setLines([`[NullForge] Cleared at ${new Date().toLocaleString()}`])}
            className="text-[10px] text-text-dim hover:text-text-primary px-1 py-0.5 rounded hover:bg-elevated"
          >
            clear
          </button>
          <button
            onClick={saveOutput}
            disabled={saving}
            className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-elevated transition-colors disabled:opacity-50"
          >
            <Save size={9} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[10px] text-text-muted px-2 py-1 space-y-px">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
