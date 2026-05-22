import { create } from "zustand";
import type { AIConfig, AIConversation, AIMessage } from "../ai/types";
import { DEFAULT_SYSTEM_PROMPT } from "../ai/types";
import { getClaudeKey } from "../ai/providers/claude";
import { getOpenAIKey } from "../ai/providers/openai";
import { getOllamaEndpoint } from "../ai/providers/ollama";
import type { LayoutPresetId } from "../lib/layoutPresets";
import { getPreset } from "../lib/layoutPresets";

export type ToolPanelId = "disasm" | "shellcode" | "build" | "network" | "debugger" | "plugins" | "primitives" | "timeline";
export type ActivePanel = "explorer" | "search" | "payloads" | "exploitdb" | "sysapi";
export type BottomTab = "shell" | "output" | "problems";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  target_arch: string;
  target_os: string;
  path?: string;
  created_at: string;
}

export interface ShellSession {
  id: string;
  name: string;
  type: "local" | "ssh" | "netcat" | "meterpreter";
  active: boolean;
}

export interface EditorTab {
  id: string;
  name: string;
  language: string;
  content: string;
  dirty: boolean;
}

interface AppState {
  // ── AI state ────────────────────────────────────────────────────────────────
  aiConfig: AIConfig;
  setAiConfig: (config: Partial<AIConfig>) => void;

  conversations: AIConversation[];
  setConversations: (convs: AIConversation[]) => void;
  addConversation: (conv: AIConversation) => void;

  currentMessages: AIMessage[];
  setCurrentMessages: (msgs: AIMessage[]) => void;
  appendCurrentMessage: (msg: AIMessage) => void;
  updateLastAssistantMessage: (content: string) => void;

  streamingSessionId: string | null;
  setStreamingSessionId: (id: string | null) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  // ── Theme ────────────────────────────────────────────────────────────────────
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;

  // ── App layout ───────────────────────────────────────────────────────────────
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;

  aiPanelOpen: boolean;
  toggleAiPanel: () => void;
  setAiPanelOpen: (v: boolean) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (w: number) => void;

  bottomPanelOpen: boolean;
  toggleBottomPanel: () => void;
  setBottomPanelOpen: (v: boolean) => void;
  bottomPanelHeight: number;
  setBottomPanelHeight: (h: number) => void;

  editorMaximized: boolean;
  toggleEditorMaximized: () => void;

  activeBottomTab: BottomTab;
  setActiveBottomTab: (tab: BottomTab) => void;

  shellSessions: ShellSession[];
  activeShellId: string | null;
  addShellSession: (session: ShellSession) => void;
  removeShellSession: (id: string) => void;
  setActiveShell: (id: string) => void;

  editorTabs: EditorTab[];
  activeEditorId: string | null;
  openEditorTab: (tab: EditorTab) => void;
  closeEditorTab: (id: string) => void;
  setActiveEditor: (id: string) => void;
  reorderEditorTab: (fromId: string, toId: string) => void;

  // ── Tool panels (open in main area) ──────────────────────────────────────────
  openToolPanels: ToolPanelId[];
  activeToolPanelId: ToolPanelId | null;
  openToolPanel: (id: ToolPanelId) => void;
  closeToolPanel: (id: ToolPanelId) => void;
  focusToolPanel: (id: ToolPanelId) => void;

  // ── Layout presets ────────────────────────────────────────────────────────────
  activeLayoutPreset: LayoutPresetId;
  applyLayoutPreset: (id: LayoutPresetId) => void;

  // ── Project state ─────────────────────────────────────────────────────────────
  currentProject: Project | null;
  setCurrentProject: (p: Project | null) => void;
  showWorkspaceScreen: boolean;
  setShowWorkspaceScreen: (v: boolean) => void;

  // ── Workspace state ───────────────────────────────────────────────────────────
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (w: Workspace | null) => void;
  addWorkspace: (w: Workspace) => void;
  deleteWorkspace: (id: string) => void;
  updateWorkspace: (w: Workspace) => void;
  showWorkspaceManager: boolean;
  setShowWorkspaceManager: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // ── AI state ─────────────────────────────────────────────────────────────────
  aiConfig: {
    provider: "claude",
    model: "claude-sonnet-4-5",
    apiKey: getClaudeKey() || getOpenAIKey() || undefined,
    endpoint: getOllamaEndpoint(),
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    maxTokens: 4096,
  },
  setAiConfig: (config) =>
    set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),

  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),

  currentMessages: [],
  setCurrentMessages: (msgs) => set({ currentMessages: msgs }),
  appendCurrentMessage: (msg) =>
    set((s) => ({ currentMessages: [...s.currentMessages, msg] })),
  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.currentMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content };
          return { currentMessages: msgs };
        }
      }
      return {};
    }),

  streamingSessionId: null,
  setStreamingSessionId: (id) => set({ streamingSessionId: id }),
  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),

  // ── Theme ─────────────────────────────────────────────────────────────────────
  theme: (() => {
    try {
      const saved = localStorage.getItem("nullforge_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* ignore */ }
    return "dark";
  })() as "dark" | "light",
  setTheme: (t) => {
    try { localStorage.setItem("nullforge_theme", t); } catch { /* ignore */ }
    set({ theme: t });
  },

  // ── App layout ───────────────────────────────────────────────────────────────
  activePanel: "explorer",
  setActivePanel: (panel) => set({ activePanel: panel }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  sidebarWidth: (() => { try { return Number(localStorage.getItem("nullforge_sidebar_w") || "240"); } catch { return 240; } })(),
  setSidebarWidth: (w) => {
    try { localStorage.setItem("nullforge_sidebar_w", String(w)); } catch { /* ignore */ }
    set({ sidebarWidth: w });
  },

  aiPanelOpen: true,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setAiPanelOpen: (v) => set({ aiPanelOpen: v }),
  rightPanelWidth: (() => { try { return Number(localStorage.getItem("nullforge_right_w") || "320"); } catch { return 320; } })(),
  setRightPanelWidth: (w) => {
    try { localStorage.setItem("nullforge_right_w", String(w)); } catch { /* ignore */ }
    set({ rightPanelWidth: w });
  },

  bottomPanelOpen: true,
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelOpen: (v) => set({ bottomPanelOpen: v }),
  bottomPanelHeight: 220,
  setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),

  editorMaximized: false,
  toggleEditorMaximized: () => set((s) => ({ editorMaximized: !s.editorMaximized })),

  activeBottomTab: "shell",
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

  shellSessions: [],
  activeShellId: null,
  addShellSession: (session) =>
    set((s) => ({
      shellSessions: [...s.shellSessions, session],
      activeShellId: session.id,
    })),
  removeShellSession: (id) =>
    set((s) => {
      const remaining = s.shellSessions.filter((sess) => sess.id !== id);
      return {
        shellSessions: remaining,
        activeShellId: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
      };
    }),
  setActiveShell: (id) => set({ activeShellId: id }),

  editorTabs: [],
  activeEditorId: null,
  openEditorTab: (tab) =>
    set((s) => {
      const existing = s.editorTabs.find((t) => t.id === tab.id);
      if (existing) return { activeEditorId: tab.id, activeToolPanelId: null };
      return { editorTabs: [...s.editorTabs, tab], activeEditorId: tab.id, activeToolPanelId: null };
    }),
  closeEditorTab: (id) =>
    set((s) => {
      const remaining = s.editorTabs.filter((t) => t.id !== id);
      const newActive =
        s.activeEditorId === id
          ? remaining.length > 0
            ? remaining[remaining.length - 1].id
            : null
          : s.activeEditorId;
      return { editorTabs: remaining, activeEditorId: newActive };
    }),
  setActiveEditor: (id) => set({ activeEditorId: id, activeToolPanelId: null }),
  reorderEditorTab: (fromId, toId) =>
    set((s) => {
      const tabs = [...s.editorTabs];
      const from = tabs.findIndex((t) => t.id === fromId);
      const to   = tabs.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0 || from === to) return {};
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved);
      return { editorTabs: tabs };
    }),

  // ── Tool panels ───────────────────────────────────────────────────────────────
  openToolPanels: [],
  activeToolPanelId: null,
  openToolPanel: (id) =>
    set((s) => ({
      openToolPanels: s.openToolPanels.includes(id) ? s.openToolPanels : [...s.openToolPanels, id],
      activeToolPanelId: id,
      activeEditorId: null,
    })),
  closeToolPanel: (id) =>
    set((s) => {
      const remaining = s.openToolPanels.filter((p) => p !== id);
      return {
        openToolPanels: remaining,
        activeToolPanelId:
          s.activeToolPanelId === id
            ? remaining.length > 0 ? remaining[remaining.length - 1] : null
            : s.activeToolPanelId,
      };
    }),
  focusToolPanel: (id) => set({ activeToolPanelId: id, activeEditorId: null }),

  // ── Layout presets ────────────────────────────────────────────────────────────
  activeLayoutPreset: "default",
  applyLayoutPreset: (id) => {
    const p = getPreset(id);
    try { localStorage.setItem("nullforge_sidebar_w", String(p.sidebarWidth)); } catch {}
    try { localStorage.setItem("nullforge_right_w", String(p.rightPanelWidth)); } catch {}
    set({
      activeLayoutPreset: id,
      sidebarOpen:       p.sidebarOpen,
      sidebarWidth:      p.sidebarWidth,
      aiPanelOpen:       p.aiPanelOpen,
      rightPanelWidth:   p.rightPanelWidth,
      bottomPanelOpen:   p.bottomPanelOpen,
      bottomPanelHeight: p.bottomPanelHeight,
      activePanel:       p.activePanel,
      activeBottomTab:   p.activeBottomTab,
      openToolPanels:    p.openToolPanels as ToolPanelId[],
      activeToolPanelId: (p.activeToolPanel as ToolPanelId | null),
    });
  },

  // ── Project state ─────────────────────────────────────────────────────────────
  currentProject: null,
  setCurrentProject: (p) => set({ currentProject: p }),
  showWorkspaceScreen: true,
  setShowWorkspaceScreen: (v) => set({ showWorkspaceScreen: v }),

  // ── Workspace state ───────────────────────────────────────────────────────────
  workspaces: (() => {
    try {
      const raw = localStorage.getItem("nullforge_workspaces");
      if (!raw) return [];
      return JSON.parse(raw) as Workspace[];
    } catch {
      return [];
    }
  })(),
  currentWorkspace: null,
  setCurrentWorkspace: (w) => set((s) => {
    // Switching workspace: reset workspace-scoped state (project, open tabs, tool panels)
    if (s.currentWorkspace?.id === w?.id) {
      return { currentWorkspace: w };
    }
    return {
      currentWorkspace: w,
      currentProject: null,
      editorTabs: [],
      activeEditorId: null,
      openToolPanels: [],
      activeToolPanelId: null,
    };
  }),
  addWorkspace: (w) =>
    set((s) => {
      const updated = [...s.workspaces, w];
      try {
        localStorage.setItem("nullforge_workspaces", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return { workspaces: updated };
    }),
  deleteWorkspace: (id) =>
    set((s) => {
      const updated = s.workspaces.filter((ws) => ws.id !== id);
      try {
        localStorage.setItem("nullforge_workspaces", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return {
        workspaces: updated,
        currentWorkspace: s.currentWorkspace?.id === id ? null : s.currentWorkspace,
      };
    }),
  updateWorkspace: (w) =>
    set((s) => {
      const updated = s.workspaces.map((ws) => ws.id === w.id ? w : ws);
      try { localStorage.setItem("nullforge_workspaces", JSON.stringify(updated)); } catch {}
      return { workspaces: updated, currentWorkspace: s.currentWorkspace?.id === w.id ? w : s.currentWorkspace };
    }),
  showWorkspaceManager: false,
  setShowWorkspaceManager: (v) => set({ showWorkspaceManager: v }),
}));
