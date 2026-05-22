import { ChevronDown, Maximize2, Minimize2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";
import type { ToolPanelId } from "../../store";
import { EditorToolbar } from "../Editor/EditorToolbar";
import { MonacoEditorWrapper } from "../Editor/MonacoEditorWrapper";
import { PluginDetail } from "../Plugins/PluginDetail";
import type { PluginState } from "../Plugins/types";
import { DisasmLayout } from "../Disassembler/DisasmLayout";
import { ShellcodeGenerator } from "../Shellcode/ShellcodeGenerator";
import { BuildPanel } from "../Build/BuildPanel";
import { NetworkToolsPanel } from "../NetworkTools/NetworkToolsPanel";
import { DebuggerPanel } from "../Debugger/DebuggerPanel";
import { PluginManager } from "../Plugins/PluginManager";
import { PatternTool } from "../ExploitTools/PatternTool";
import { ExploitTimeline } from "../ExploitTools/ExploitTimeline";

const LANG_ICONS: Record<string, string> = {
  python: "🐍",
  c: "©",
  cpp: "⊕",
  rust: "🦀",
  asm: "⚙",
  nasm: "⚙",
  bash: "🖥",
  powershell: "🔷",
  yaml: "📄",
  json: "{ }",
  markdown: "📝",
};

const TOOL_NAMES: Record<ToolPanelId, string> = {
  disasm: "Disassembler",
  shellcode: "Shellcode",
  build: "Build",
  network: "Network Tools",
  debugger: "Debugger",
  plugins: "Plugins",
  primitives: "Primitives",
  timeline: "Timeline",
};

const TOOL_ICONS: Record<ToolPanelId, string> = {
  disasm: "⊕",
  shellcode: "⚙",
  build: "🔨",
  network: "🌐",
  debugger: "🐛",
  plugins: "🔌",
  primitives: "#",
  timeline: "⏱",
};

function renderToolPanel(id: ToolPanelId) {
  switch (id) {
    case "disasm":    return <DisasmLayout />;
    case "shellcode": return <ShellcodeGenerator />;
    case "build":     return <BuildPanel />;
    case "network":   return <NetworkToolsPanel />;
    case "debugger":   return <DebuggerPanel />;
    case "plugins":    return <PluginManager />;
    case "primitives": return <PatternTool />;
    case "timeline":   return <ExploitTimeline />;
  }
}

// Map file extension → Monaco language id
const EXT_LANG: Record<string, string> = {
  py: "python", c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp",
  rs: "rust", asm: "asm", s: "asm", nasm: "nasm", sh: "bash",
  ps1: "powershell", js: "javascript", ts: "typescript",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown", xml: "xml", sql: "sql",
};

export function MainArea() {
  const {
    editorTabs, activeEditorId, closeEditorTab, setActiveEditor, openEditorTab,
    reorderEditorTab,
    editorMaximized, toggleEditorMaximized,
    openToolPanels, activeToolPanelId, closeToolPanel, focusToolPanel, openToolPanel,
  } = useAppStore();
  const [pluginDetailView, setPluginDetailView] = useState<PluginState | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  // + button dropdown state
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [toolSubmenuOpen, setToolSubmenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Inline new-file rename state
  const [newFileState, setNewFileState] = useState<{ id: string; name: string } | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state (local refs — no re-render needed)
  const dragFromId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Close add-menu on outside click
  useEffect(() => {
    if (!addMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
        setToolSubmenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [addMenuOpen]);

  // Focus new-file input when it appears
  useEffect(() => {
    if (newFileState) setTimeout(() => newFileInputRef.current?.focus(), 30);
  }, [newFileState !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewFile() {
    const id = `new-${Date.now()}`;
    setNewFileState({ id, name: "" });
    setAddMenuOpen(false);
    setToolSubmenuOpen(false);
  }

  function commitNewFile(name: string) {
    if (!newFileState) return;
    const trimmed = name.trim();
    if (trimmed) {
      const ext = trimmed.split(".").pop()?.toLowerCase() ?? "";
      const lang = EXT_LANG[ext] ?? "python";
      openEditorTab({ id: newFileState.id, name: trimmed, language: lang, content: "", dirty: false });
    }
    setNewFileState(null);
  }

  function handleOpenTool(id: ToolPanelId) {
    openToolPanel(id);
    setAddMenuOpen(false);
    setToolSubmenuOpen(false);
  }

  // Handle nullforge:open-file events dispatched by PayloadBrowser / ExploitBrowser
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; language: string; content: string }>).detail;
      if (!detail) return;
      const id = `payload-${detail.name}-${Date.now()}`;
      openEditorTab({ id, name: detail.name, language: detail.language, content: detail.content, dirty: false });
    };
    window.addEventListener("nullforge:open-file", handler);
    return () => window.removeEventListener("nullforge:open-file", handler);
  }, [openEditorTab]);

  // Handle nullforge:open-plugin-detail events dispatched by PluginManager
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ plugin: PluginState }>).detail;
      if (!detail?.plugin) return;
      setPluginDetailView(detail.plugin);
    };
    window.addEventListener("nullforge:open-plugin-detail", handler);
    return () => window.removeEventListener("nullforge:open-plugin-detail", handler);
  }, []);

  const handlePluginToggle = async (pluginId: string, enabled: boolean) => {
    if (!pluginDetailView) return;
    if (pluginDetailView.manifest.id === pluginId) {
      setPluginDetailView((prev) => prev ? { ...prev, enabled } : null);
    }
  };

  const activeTab = editorTabs.find((t) => t.id === activeEditorId);

  // If a plugin detail view is active, overlay it in the main area
  if (pluginDetailView) {
    return (
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <PluginDetail
          plugin={pluginDetailView}
          onClose={() => setPluginDetailView(null)}
          onToggle={handlePluginToggle}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center bg-surface border-b border-border h-9 flex-shrink-0 relative">
        {/* Scrollable tab list */}
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto">
          {/* Editor tabs — draggable */}
          {editorTabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onClick={() => setActiveEditor(tab.id)}
              onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeEditorTab(tab.id); } }}
              onDragStart={(e) => { dragFromId.current = tab.id; e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(tab.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFromId.current && dragFromId.current !== tab.id) {
                  reorderEditorTab(dragFromId.current, tab.id);
                }
                setDragOverId(null);
                dragFromId.current = null;
              }}
              onDragEnd={() => { setDragOverId(null); dragFromId.current = null; }}
              className={[
                "group flex items-center gap-1.5 px-3 h-9 cursor-pointer border-r border-border text-xs flex-shrink-0 select-none transition-colors duration-100",
                dragOverId === tab.id ? "border-l-2 border-l-accent-blue" : "",
                activeEditorId === tab.id && !activeToolPanelId
                  ? "bg-bg-base text-text-primary border-t-2 border-t-accent-red"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated",
              ].join(" ")}
            >
              <span className="opacity-60 text-xs">{LANG_ICONS[tab.language] ?? "📄"}</span>
              <span className="max-w-[120px] truncate">{tab.name}</span>
              {tab.dirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange flex-shrink-0" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); closeEditorTab(tab.id); }}
                className="text-text-muted hover:text-text-primary rounded p-0.5 hover:bg-elevated ml-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {/* Inline new-file rename tab */}
          {newFileState && (
            <div className="flex items-center px-3 h-9 border-r border-border bg-bg-base flex-shrink-0">
              <span className="opacity-60 text-xs mr-1.5">📄</span>
              <input
                ref={newFileInputRef}
                type="text"
                value={newFileState.name}
                onChange={(e) => setNewFileState({ ...newFileState, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewFile(newFileState.name);
                  if (e.key === "Escape") setNewFileState(null);
                }}
                onBlur={() => commitNewFile(newFileState.name)}
                placeholder="filename.py"
                className="bg-transparent text-xs text-text-primary border-b border-accent-red outline-none w-28 placeholder-text-dim"
              />
            </div>
          )}

          {/* Tool panel tabs */}
          {openToolPanels.map((toolId) => (
            <div
              key={`tool-${toolId}`}
              onClick={() => focusToolPanel(toolId)}
              onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeToolPanel(toolId); } }}
              className={`group flex items-center gap-1.5 px-3 h-9 cursor-pointer border-r border-border
                text-xs flex-shrink-0 select-none transition-colors duration-100
                ${activeToolPanelId === toolId
                  ? "bg-bg-base text-accent-blue border-t-2 border-t-accent-blue"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated"}`}
            >
              <span className="opacity-60 text-xs">{TOOL_ICONS[toolId]}</span>
              <span>{TOOL_NAMES[toolId]}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeToolPanel(toolId); }}
                className="text-text-muted hover:text-text-primary rounded p-0.5 hover:bg-elevated ml-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Right fixed area: + button · overflow · breadcrumb · maximize */}
        <div className="flex items-center flex-shrink-0">

          {/* + dropdown — outside overflow-x:auto so the menu floats freely */}
          <div ref={addMenuRef} className="relative flex-shrink-0">
            <button
              title="New file or tool"
              onClick={() => { setAddMenuOpen((v) => !v); setToolSubmenuOpen(false); }}
              className="px-2.5 h-9 border-l border-r border-border text-text-muted hover:text-text-primary flex items-center transition-colors"
            >
              <Plus size={13} />
            </button>
            {addMenuOpen && (
              <div className="absolute left-0 top-full z-[200] mt-0.5 w-44 bg-bg-surface border border-border rounded-md shadow-xl overflow-visible">
                <button
                  onClick={handleNewFile}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors text-left"
                >
                  <span className="opacity-60">📄</span>
                  New File
                </button>
                <div className="relative">
                  <button
                    onClick={() => setToolSubmenuOpen((v) => !v)}
                    onMouseEnter={() => setToolSubmenuOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors text-left"
                  >
                    <span className="opacity-60">🔧</span>
                    <span className="flex-1">New Tool</span>
                    <span className="opacity-40">›</span>
                  </button>
                  {toolSubmenuOpen && (
                    <div
                      className="absolute right-full top-0 mr-0.5 w-44 bg-bg-surface border border-border rounded-md shadow-xl overflow-hidden"
                      onMouseLeave={() => setToolSubmenuOpen(false)}
                    >
                      {(Object.entries(TOOL_NAMES) as [ToolPanelId, string][]).map(([id, name]) => (
                        <button
                          key={id}
                          onClick={() => handleOpenTool(id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors text-left"
                        >
                          <span className="opacity-60">{TOOL_ICONS[id]}</span>
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Overflow · breadcrumb · maximize */}
          <div className="flex items-center flex-shrink-0 border-l border-border pl-1">
          {/* Overflow: show all tabs in a dropdown */}
          {(editorTabs.length + openToolPanels.length) > 0 && (
            <div className="relative">
              <button
                onClick={() => setOverflowOpen((o) => !o)}
                title="All open tabs"
                className="px-2 h-9 flex items-center gap-0.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <ChevronDown size={12} />
              </button>
              {overflowOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-0.5 w-56 bg-bg-surface border border-border
                    rounded-md shadow-md overflow-hidden"
                  onMouseLeave={() => setOverflowOpen(false)}
                >
                  {editorTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveEditor(tab.id); setOverflowOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left
                        hover:bg-bg-elevated transition-colors
                        ${activeEditorId === tab.id && !activeToolPanelId
                          ? "text-text-primary" : "text-text-muted"}`}
                    >
                      <span className="opacity-60">{LANG_ICONS[tab.language] ?? "📄"}</span>
                      <span className="flex-1 truncate">{tab.name}</span>
                      {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-accent-orange flex-shrink-0" />}
                    </button>
                  ))}
                  {openToolPanels.map((toolId) => (
                    <button
                      key={`tool-${toolId}`}
                      onClick={() => { focusToolPanel(toolId); setOverflowOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left
                        hover:bg-bg-elevated transition-colors
                        ${activeToolPanelId === toolId ? "text-accent-blue" : "text-text-muted"}`}
                    >
                      <span className="opacity-60">{TOOL_ICONS[toolId]}</span>
                      <span>{TOOL_NAMES[toolId]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Breadcrumb */}
          <div className="px-2 text-xs text-text-muted flex items-center gap-1 max-w-[180px] truncate">
            {activeTab && !activeToolPanelId ? (
              <>
                <span className="text-text-dim">NullForge /</span>
                <span className="text-text-muted truncate">{activeTab.name}</span>
              </>
            ) : activeToolPanelId ? (
              <>
                <span className="text-text-dim">NullForge /</span>
                <span className="text-text-muted">{TOOL_NAMES[activeToolPanelId]}</span>
              </>
            ) : null}
          </div>

          {/* Maximize */}
          <button
            onClick={toggleEditorMaximized}
            title={editorMaximized ? "Restore Layout" : "Maximize Editor"}
            className="px-2 h-9 text-text-muted hover:text-text-primary flex items-center flex-shrink-0"
          >
            {editorMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
        {/* end Right fixed area */}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {activeToolPanelId ? (
          <div className="absolute inset-0 overflow-hidden">
            {renderToolPanel(activeToolPanelId)}
          </div>
        ) : editorTabs.length === 0 ? (
          <EmptyEditor onNewFile={handleNewFile} />
        ) : (
          editorTabs.map((tab) => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeEditorId ? "flex" : "none", flexDirection: "column" }}
            >
              <EditorToolbar tab={tab} />
              <MonacoEditorWrapper
                path={tab.id}
                value={tab.content}
                language={tab.language}
                onChange={(value) => {
                  useAppStore.setState((s) => ({
                    editorTabs: s.editorTabs.map((t) =>
                      t.id === tab.id ? { ...t, content: value, dirty: true } : t
                    ),
                  }));
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyEditor({ onNewFile }: { onNewFile: () => void }) {
  const { openEditorTab, setShowWorkspaceScreen } = useAppStore();
  const [recents, setRecents] = useState<{ id: string; name: string; language: string; lastOpened: string }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nullforge_recent_files");
      if (raw) setRecents(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function handleOpenProject() {
    window.dispatchEvent(new CustomEvent("nullforge:project-file"));
  }

  function handleOpenWelcome() {
    setShowWorkspaceScreen(true);
  }

  function openRecent(r: { id: string; name: string; language: string }) {
    openEditorTab({ id: r.id, name: r.name, language: r.language, content: "", dirty: false });
  }

  const Btn = ({ icon, label, hint, onClick }: { icon: string; label: string; hint?: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 bg-surface border border-border rounded hover:border-accent-red hover:bg-elevated transition-colors text-left group w-full"
    >
      <span className="text-base opacity-70 group-hover:opacity-100">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-text-primary">{label}</span>
        {hint && <span className="block text-[10px] text-text-dim">{hint}</span>}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none px-8">
      <div className="flex flex-col gap-1.5 w-64">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-0.5 px-1">Get Started</p>
        <Btn icon="✦" label="New File" hint="Create empty file" onClick={onNewFile} />
        <Btn icon="📂" label="Open Project…" hint="Import .nullforge project" onClick={handleOpenProject} />
        <Btn icon="◆" label="Workspace Manager" hint="Switch or create workspace" onClick={handleOpenWelcome} />
      </div>

      {recents.length > 0 && (
        <div className="flex flex-col gap-1 w-64 mt-2">
          <p className="text-[10px] text-text-dim uppercase tracking-widest mb-0.5 px-1">Recent Files</p>
          {recents.slice(0, 5).map((r) => (
            <button
              key={r.id + r.lastOpened}
              onClick={() => openRecent(r)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded hover:border-accent-red transition-colors text-left"
            >
              <span className="text-[10px] opacity-60">📄</span>
              <span className="text-xs text-text-primary font-mono truncate">{r.name}</span>
              <span className="ml-auto text-[10px] text-text-dim flex-shrink-0">{r.language}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center items-center gap-1.5 text-[10px] text-text-dim mt-1">
        <span className="px-1.5 py-0.5 bg-surface border border-border rounded font-mono">⌘⇧P</span>
        <span>Command Palette</span>
        <span className="ml-2 px-1.5 py-0.5 bg-surface border border-border rounded font-mono">⌘K</span>
        <span>Inline AI</span>
      </div>
    </div>
  );
}
