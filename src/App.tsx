import { useCallback, useEffect, useState } from "react";
import { InlineAI } from "./components/AI/InlineAI";
import { CheatSheet } from "./components/CheatSheet/CheatSheet";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { ActivityBar } from "./components/Layout/ActivityBar";
import { BottomPanel } from "./components/Layout/BottomPanel";
import { MainArea } from "./components/Layout/MainArea";
import { MenuBar } from "./components/Layout/MenuBar";
import { RightPanel } from "./components/Layout/RightPanel";
import { Sidebar } from "./components/Layout/Sidebar";
import { StatusBar } from "./components/Layout/StatusBar";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { OnboardingWizard } from "./components/Onboarding/OnboardingWizard";
import { WelcomeScreen } from "./components/Workspace/WelcomeScreen";
import { WorkspaceManager } from "./components/Workspace/WorkspaceManager";
import { ProjectFileManager } from "./components/Workspace/ProjectFileManager";
import { applyPlatformClass, isMac } from "./lib/platform";
import { useAppStore } from "./store";
import type { LayoutPresetId } from "./lib/layoutPresets";
import { LAYOUT_PRESETS } from "./lib/layoutPresets";

// Apply platform class once at module load (before any render)
applyPlatformClass();

export default function App() {
  const {
    toggleSidebar,
    toggleAiPanel,
    toggleBottomPanel,
    setBottomPanelOpen,
    setActiveBottomTab,
    openToolPanel,
    showWorkspaceScreen,
    currentProject,
    showWorkspaceManager,
    editorMaximized,
    toggleEditorMaximized,
    theme,
    closeEditorTab,
    activeEditorId,
    editorTabs,
    setActiveEditor,
    applyLayoutPreset,
    aiPanelOpen,
    sidebarOpen,
  } = useAppStore();

  const [cmdPaletteOpen,  setCmdPaletteOpen]  = useState(false);
  const [settingsOpen,    setSettingsOpen]     = useState(false);
  const [projectFileOpen, setProjectFileOpen]  = useState(false);
  const [cheatSheetOpen,  setCheatSheetOpen]   = useState(false);
  const [layoutPaletteOpen, setLayoutPaletteOpen] = useState(false);

  const closePalette = useCallback(() => setCmdPaletteOpen(false), []);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod   = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt   = e.altKey;

      // ── Global panel toggles ───────────────────────────────────────────────
      if (mod && shift && e.key === "P") {
        e.preventDefault();
        setCmdPaletteOpen((o) => !o);
        return;
      }
      if (mod && e.key === "b" && !shift) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // AI panel: ⌘⇧B / Ctrl+Shift+B (+ legacy ⌘J / Ctrl+J)
      if (mod && shift && e.key === "B") {
        e.preventDefault();
        toggleAiPanel();
        return;
      }
      if (mod && !shift && !alt && e.key === "j") {
        e.preventDefault();
        toggleBottomPanel();
        return;
      }
      if (mod && e.key === "`") {
        e.preventDefault();
        setBottomPanelOpen(true);
        setActiveBottomTab("shell");
        return;
      }

      // ── Settings & UI ──────────────────────────────────────────────────────
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (mod && shift && (e.key === "/" || e.key === "?")) {
        e.preventDefault();
        setCheatSheetOpen(true);
        return;
      }
      if (mod && shift && e.key === "L") {
        e.preventDefault();
        setLayoutPaletteOpen((o) => !o);
        return;
      }

      // ── Inline AI ─────────────────────────────────────────────────────────
      if (mod && !shift && !alt && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:inline-ai", { detail: {} }));
        return;
      }

      // ── Tab management ────────────────────────────────────────────────────
      if (mod && !shift && !alt && e.key === "w") {
        e.preventDefault();
        if (activeEditorId) closeEditorTab(activeEditorId);
        return;
      }
      // ⌘[1-9] / Ctrl+[1-9]: go to tab N
      if (mod && !shift && !alt && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < editorTabs.length) {
          e.preventDefault();
          setActiveEditor(editorTabs[idx].id);
          return;
        }
      }
      // ⌘⌥→ / Ctrl+Tab: next tab
      if (isMac() ? (mod && alt && e.key === "ArrowRight") : (e.ctrlKey && e.key === "Tab" && !shift)) {
        e.preventDefault();
        if (editorTabs.length > 0 && activeEditorId) {
          const idx = editorTabs.findIndex((t) => t.id === activeEditorId);
          const next = editorTabs[(idx + 1) % editorTabs.length];
          setActiveEditor(next.id);
        }
        return;
      }
      // ⌘⌥← / Ctrl+Shift+Tab: prev tab
      if (isMac() ? (mod && alt && e.key === "ArrowLeft") : (e.ctrlKey && shift && e.key === "Tab")) {
        e.preventDefault();
        if (editorTabs.length > 0 && activeEditorId) {
          const idx = editorTabs.findIndex((t) => t.id === activeEditorId);
          const prev = editorTabs[(idx - 1 + editorTabs.length) % editorTabs.length];
          setActiveEditor(prev.id);
        }
        return;
      }

      // ── Panel focus shortcuts ─────────────────────────────────────────────
      // These only fire with EXACT mod (no shift/alt) to avoid conflicts
      if (mod && !shift && !alt) {
        if (e.key === "1") { /* handled by tab-goto above */ return; }
        if (e.key === "2") {
          e.preventDefault();
          setBottomPanelOpen(true);
          setActiveBottomTab("shell");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          openToolPanel("debugger");
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          openToolPanel("disasm");
          return;
        }
        if (e.key === "5") {
          e.preventDefault();
          // Focus AI panel (open if closed)
          if (!aiPanelOpen) toggleAiPanel();
          window.dispatchEvent(new CustomEvent("nullforge:focus-ai"));
          return;
        }
      }

      // ── Tool panel shortcuts (Cmd+Shift+D, Cmd+Shift+G, etc.) ────────────
      if (mod && shift) {
        if (e.key === "D") { e.preventDefault(); openToolPanel("disasm");   return; }
        if (e.key === "G") { e.preventDefault(); openToolPanel("debugger"); return; }
        if (e.key === "N") { e.preventDefault(); openToolPanel("network");  return; }
        if (e.key === "K") { e.preventDefault(); openToolPanel("shellcode"); return; }
      }

      // ── Debugger shortcuts ────────────────────────────────────────────────
      if (e.key === "F5" && !mod) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-continue"));
        return;
      }
      if (e.key === "F6" && !mod) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-pause"));
        return;
      }
      if (e.key === "F5" && shift) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-stop"));
        return;
      }
      if (e.key === "F10" && !mod) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-step-over"));
        return;
      }
      if (e.key === "F11" && !shift && !mod) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-step-into"));
        return;
      }
      if (e.key === "F11" && shift) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-step-out"));
        return;
      }
      if (e.key === "F9" && !shift) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:debug-breakpoint"));
        return;
      }

      // ── ROP shortcuts ─────────────────────────────────────────────────────
      if (mod && shift && e.key === "R") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:rop-search"));
        return;
      }
      if (mod && shift && e.key === "E") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("nullforge:rop-export"));
        return;
      }

      // ── Editor maximize ───────────────────────────────────────────────────
      if (mod && shift && e.key === "M") {
        e.preventDefault();
        toggleEditorMaximized();
        return;
      }

      // ── Escape: close modals ──────────────────────────────────────────────
      if (e.key === "Escape") {
        if (cheatSheetOpen)  { setCheatSheetOpen(false);  return; }
        if (layoutPaletteOpen) { setLayoutPaletteOpen(false); return; }
        if (cmdPaletteOpen)  { setCmdPaletteOpen(false);  return; }
        if (settingsOpen)    { setSettingsOpen(false);    return; }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    toggleSidebar, toggleAiPanel, toggleBottomPanel, setBottomPanelOpen,
    setActiveBottomTab, openToolPanel, closeEditorTab, setActiveEditor,
    toggleEditorMaximized, applyLayoutPreset,
    cmdPaletteOpen, cheatSheetOpen, settingsOpen, layoutPaletteOpen,
    activeEditorId, editorTabs, aiPanelOpen, sidebarOpen,
  ]);

  // ── Apply theme ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
    window.dispatchEvent(new CustomEvent("nullforge:theme-changed"));
  }, [theme]);

  // ── Event listeners (from MenuBar / StatusBar / etc.) ────────────────────
  useEffect(() => {
    const handlers: [string, () => void][] = [
      ["nullforge:open-settings",   () => setSettingsOpen(true)],
      ["nullforge:command-palette", () => setCmdPaletteOpen((o) => !o)],
      ["nullforge:project-file",    () => setProjectFileOpen(true)],
      ["nullforge:cheat-sheet",     () => setCheatSheetOpen(true)],
      ["nullforge:layout-palette",  () => setLayoutPaletteOpen((o) => !o)],
    ];
    for (const [ev, fn] of handlers) window.addEventListener(ev, fn);
    return () => { for (const [ev, fn] of handlers) window.removeEventListener(ev, fn); };
  }, []);

  return (
    <>
      <div className="flex flex-col h-screen w-screen bg-bg-base overflow-hidden">
        <MenuBar />

        {/* Main workspace */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {!editorMaximized && <ActivityBar />}
          {!editorMaximized && <Sidebar />}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <MainArea />
              {!editorMaximized && <RightPanel />}
            </div>
            {!editorMaximized && <BottomPanel />}
          </div>
        </div>

        <StatusBar />
      </div>

      {/* Modals & overlays */}
      <CommandPalette open={cmdPaletteOpen} onClose={closePalette} />
      <InlineAI />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CheatSheet open={cheatSheetOpen} onClose={() => setCheatSheetOpen(false)} />
      <OnboardingWizard />

      {/* Layout preset picker */}
      {layoutPaletteOpen && (
        <LayoutPresetPicker
          onSelect={(id) => { applyLayoutPreset(id); setLayoutPaletteOpen(false); }}
          onClose={() => setLayoutPaletteOpen(false)}
        />
      )}

      {showWorkspaceScreen && <WelcomeScreen />}
      {showWorkspaceManager && <WorkspaceManager />}
      {projectFileOpen && <ProjectFileManager onClose={() => setProjectFileOpen(false)} />}
    </>
  );
}

// ── Layout Preset Picker ──────────────────────────────────────────────────────

function LayoutPresetPicker({
  onSelect,
  onClose,
}: {
  onSelect: (id: LayoutPresetId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-80 rounded-lg border border-border bg-bg-surface shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Layout Presets</h2>
          <p className="text-[11px] text-text-muted mt-0.5">Choose a workspace layout</p>
        </div>
        <div className="p-2 space-y-1">
          {LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left
                hover:bg-bg-elevated transition-colors group"
            >
              <span className="text-lg leading-none">{preset.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary group-hover:text-accent-blue transition-colors">
                  {preset.label}
                </div>
                <div className="text-[11px] text-text-muted truncate">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-text-dim">Press Esc to cancel</p>
        </div>
      </div>
    </div>
  );
}
