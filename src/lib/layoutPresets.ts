// Layout preset definitions for NullForge

export type LayoutPresetId = "exploit-dev" | "reversing" | "rop-hunting" | "fuzzing" | "default";

export interface LayoutPreset {
  id: LayoutPresetId;
  label: string;
  description: string;
  icon: string;
  // Panel visibility
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  bottomPanelOpen: boolean;
  // Panel dimensions
  sidebarWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  // Panel content focus
  activePanel: "explorer" | "search" | "payloads" | "exploitdb" | "sysapi";
  activeBottomTab: "shell" | "output" | "problems";
  // Which tool panels to open in main area
  openToolPanels: string[];
  activeToolPanel: string | null;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "default",
    label: "Default",
    description: "Balanced layout for general use",
    icon: "⊞",
    sidebarOpen: true,
    aiPanelOpen: true,
    bottomPanelOpen: true,
    sidebarWidth: 240,
    rightPanelWidth: 320,
    bottomPanelHeight: 220,
    activePanel: "explorer",
    activeBottomTab: "shell",
    openToolPanels: [],
    activeToolPanel: null,
  },
  {
    id: "exploit-dev",
    label: "Exploit Dev",
    description: "Editor + Shell focused — wide editor, compact AI sidebar",
    icon: "💥",
    sidebarOpen: true,
    aiPanelOpen: true,
    bottomPanelOpen: true,
    sidebarWidth: 200,
    rightPanelWidth: 280,
    bottomPanelHeight: 280,
    activePanel: "explorer",
    activeBottomTab: "shell",
    openToolPanels: [],
    activeToolPanel: null,
  },
  {
    id: "reversing",
    label: "Reversing",
    description: "Disassembler central — wide disasm, AI on the right",
    icon: "🔬",
    sidebarOpen: false,
    aiPanelOpen: true,
    bottomPanelOpen: true,
    sidebarWidth: 200,
    rightPanelWidth: 360,
    bottomPanelHeight: 200,
    activePanel: "explorer",
    activeBottomTab: "output",
    openToolPanels: ["disasm", "debugger"],
    activeToolPanel: "disasm",
  },
  {
    id: "rop-hunting",
    label: "ROP Hunting",
    description: "ROP gadgets + Editor + AI — three-column power layout",
    icon: "⛓",
    sidebarOpen: true,
    aiPanelOpen: true,
    bottomPanelOpen: false,
    sidebarWidth: 220,
    rightPanelWidth: 360,
    bottomPanelHeight: 180,
    activePanel: "payloads",
    activeBottomTab: "shell",
    openToolPanels: [],
    activeToolPanel: null,
  },
  {
    id: "fuzzing",
    label: "Fuzzing",
    description: "Build + Output + Problems — fuzzing and crash triage",
    icon: "🎯",
    sidebarOpen: false,
    aiPanelOpen: false,
    bottomPanelOpen: true,
    sidebarWidth: 200,
    rightPanelWidth: 320,
    bottomPanelHeight: 320,
    activePanel: "explorer",
    activeBottomTab: "output",
    openToolPanels: ["build"],
    activeToolPanel: "build",
  },
];

export function getPreset(id: LayoutPresetId): LayoutPreset {
  return LAYOUT_PRESETS.find((p) => p.id === id) ?? LAYOUT_PRESETS[0];
}
