// Central keybinding definitions — single source of truth for all shortcuts.
// Every entry has mac[] and win[] arrays of key labels for display purposes.

import { keys } from "./platform";

export interface KbDef {
  id: string;
  action: string;
  category: Category;
  mac: string[];
  win: string[];
  // For runtime matching (App.tsx handler)
  match?: {
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;   // raw Ctrl (Mac only, separate from Cmd)
    key: string;
  }[];
}

export type Category =
  | "global"
  | "navigation"
  | "editor"
  | "debugger"
  | "disassembler"
  | "rop"
  | "terminal";

export function getDisplay(kb: KbDef): string[] {
  return keys(kb.mac, kb.win);
}

// ── Global ───────────────────────────────────────────────────────────────────

export const KEYBINDINGS: KbDef[] = [
  // ── Global ────────────────────────────────────────────────────────────────
  {
    id: "command-palette",
    action: "Command Palette",
    category: "global",
    mac: ["⌘", "⇧", "P"],
    win: ["Ctrl", "⇧", "P"],
  },
  {
    id: "open-file",
    action: "Open File",
    category: "global",
    mac: ["⌘", "O"],
    win: ["Ctrl", "O"],
  },
  {
    id: "new-file",
    action: "New File",
    category: "global",
    mac: ["⌘", "N"],
    win: ["Ctrl", "N"],
  },
  {
    id: "save",
    action: "Save",
    category: "global",
    mac: ["⌘", "S"],
    win: ["Ctrl", "S"],
  },
  {
    id: "save-as",
    action: "Save As",
    category: "global",
    mac: ["⌘", "⇧", "S"],
    win: ["Ctrl", "⇧", "S"],
  },
  {
    id: "close-tab",
    action: "Close Tab",
    category: "global",
    mac: ["⌘", "W"],
    win: ["Ctrl", "W"],
  },
  {
    id: "settings",
    action: "Settings",
    category: "global",
    mac: ["⌘", ","],
    win: ["Ctrl", ","],
  },
  {
    id: "toggle-sidebar",
    action: "Toggle Left Sidebar",
    category: "global",
    mac: ["⌘", "B"],
    win: ["Ctrl", "B"],
  },
  {
    id: "toggle-ai-panel",
    action: "Toggle AI Panel",
    category: "global",
    mac: ["⌘", "⇧", "B"],
    win: ["Ctrl", "⇧", "B"],
  },
  {
    id: "toggle-terminal",
    action: "Toggle Terminal",
    category: "global",
    mac: ["⌘", "`"],
    win: ["Ctrl", "`"],
  },
  {
    id: "toggle-bottom-panel",
    action: "Toggle Bottom Panel",
    category: "global",
    mac: ["⌘", "J"],
    win: ["Ctrl", "J"],
  },
  {
    id: "layout-palette",
    action: "Layout Presets",
    category: "global",
    mac: ["⌘", "⇧", "L"],
    win: ["Ctrl", "⇧", "L"],
  },
  {
    id: "cheat-sheet",
    action: "Keyboard Shortcuts",
    category: "global",
    mac: ["⌘", "⇧", "/"],
    win: ["Ctrl", "⇧", "/"],
  },
  {
    id: "zoom-in",
    action: "Zoom In",
    category: "global",
    mac: ["⌘", "+"],
    win: ["Ctrl", "+"],
  },
  {
    id: "zoom-out",
    action: "Zoom Out",
    category: "global",
    mac: ["⌘", "-"],
    win: ["Ctrl", "-"],
  },
  {
    id: "zoom-reset",
    action: "Reset Zoom",
    category: "global",
    mac: ["⌘", "0"],
    win: ["Ctrl", "0"],
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: "focus-editor",
    action: "Focus Editor",
    category: "navigation",
    mac: ["⌘", "1"],
    win: ["Ctrl", "1"],
  },
  {
    id: "focus-terminal",
    action: "Focus Terminal",
    category: "navigation",
    mac: ["⌘", "2"],
    win: ["Ctrl", "2"],
  },
  {
    id: "focus-debugger",
    action: "Focus Debugger",
    category: "navigation",
    mac: ["⌘", "3"],
    win: ["Ctrl", "3"],
  },
  {
    id: "focus-disassembler",
    action: "Focus Disassembler",
    category: "navigation",
    mac: ["⌘", "4"],
    win: ["Ctrl", "4"],
  },
  {
    id: "focus-ai",
    action: "Focus AI Sidebar",
    category: "navigation",
    mac: ["⌘", "5"],
    win: ["Ctrl", "5"],
  },
  {
    id: "next-tab",
    action: "Next Tab",
    category: "navigation",
    mac: ["⌘", "⌥", "→"],
    win: ["Ctrl", "Tab"],
  },
  {
    id: "prev-tab",
    action: "Previous Tab",
    category: "navigation",
    mac: ["⌘", "⌥", "←"],
    win: ["Ctrl", "⇧", "Tab"],
  },
  {
    id: "inline-ai",
    action: "Inline AI",
    category: "navigation",
    mac: ["⌘", "K"],
    win: ["Ctrl", "K"],
  },

  // ── Editor ────────────────────────────────────────────────────────────────
  {
    id: "find",
    action: "Find in File",
    category: "editor",
    mac: ["⌘", "F"],
    win: ["Ctrl", "F"],
  },
  {
    id: "find-replace",
    action: "Find & Replace",
    category: "editor",
    mac: ["⌘", "H"],
    win: ["Ctrl", "H"],
  },
  {
    id: "find-all-files",
    action: "Find in All Files",
    category: "editor",
    mac: ["⌘", "⇧", "F"],
    win: ["Ctrl", "⇧", "F"],
  },
  {
    id: "go-to-line",
    action: "Go to Line",
    category: "editor",
    mac: ["⌘", "G"],
    win: ["Ctrl", "G"],
  },
  {
    id: "go-to-symbol",
    action: "Go to Symbol",
    category: "editor",
    mac: ["⌘", "⇧", "O"],
    win: ["Ctrl", "⇧", "O"],
  },
  {
    id: "toggle-comment",
    action: "Toggle Comment",
    category: "editor",
    mac: ["⌘", "/"],
    win: ["Ctrl", "/"],
  },
  {
    id: "block-comment",
    action: "Block Comment",
    category: "editor",
    mac: ["⌘", "⌥", "/"],
    win: ["Ctrl", "⇧", "/"],
  },
  {
    id: "duplicate-line",
    action: "Duplicate Line",
    category: "editor",
    mac: ["⌘", "⇧", "D"],
    win: ["Ctrl", "⇧", "D"],
  },
  {
    id: "move-line-up",
    action: "Move Line Up",
    category: "editor",
    mac: ["⌥", "↑"],
    win: ["Alt", "↑"],
  },
  {
    id: "move-line-down",
    action: "Move Line Down",
    category: "editor",
    mac: ["⌥", "↓"],
    win: ["Alt", "↓"],
  },
  {
    id: "delete-line",
    action: "Delete Line",
    category: "editor",
    mac: ["⌘", "⇧", "K"],
    win: ["Ctrl", "⇧", "K"],
  },
  {
    id: "select-line",
    action: "Select Line",
    category: "editor",
    mac: ["⌘", "L"],
    win: ["Ctrl", "L"],
  },
  {
    id: "multicursor-above",
    action: "Add Cursor Above",
    category: "editor",
    mac: ["⌘", "⌥", "↑"],
    win: ["Ctrl", "Alt", "↑"],
  },
  {
    id: "multicursor-below",
    action: "Add Cursor Below",
    category: "editor",
    mac: ["⌘", "⌥", "↓"],
    win: ["Ctrl", "Alt", "↓"],
  },
  {
    id: "select-occurrences",
    action: "Select All Occurrences",
    category: "editor",
    mac: ["⌘", "⇧", "L"],
    win: ["Ctrl", "⇧", "L"],
  },
  {
    id: "go-to-definition",
    action: "Go to Definition",
    category: "editor",
    mac: ["F12"],
    win: ["F12"],
  },
  {
    id: "peek-definition",
    action: "Peek Definition",
    category: "editor",
    mac: ["⌥", "F12"],
    win: ["Alt", "F12"],
  },
  {
    id: "rename-symbol",
    action: "Rename Symbol",
    category: "editor",
    mac: ["F2"],
    win: ["F2"],
  },
  {
    id: "format-document",
    action: "Format Document",
    category: "editor",
    mac: ["⌘", "⇧", "I"],
    win: ["Ctrl", "⇧", "I"],
  },
  {
    id: "trigger-autocomplete",
    action: "Trigger Autocomplete",
    category: "editor",
    mac: ["⌃", "Space"],
    win: ["Ctrl", "Space"],
  },

  // ── Debugger ──────────────────────────────────────────────────────────────
  {
    id: "debug-continue",
    action: "Continue / Start",
    category: "debugger",
    mac: ["F5"],
    win: ["F5"],
  },
  {
    id: "debug-pause",
    action: "Pause",
    category: "debugger",
    mac: ["F6"],
    win: ["F6"],
  },
  {
    id: "debug-stop",
    action: "Stop",
    category: "debugger",
    mac: ["⇧", "F5"],
    win: ["⇧", "F5"],
  },
  {
    id: "debug-restart",
    action: "Restart",
    category: "debugger",
    mac: ["⌘", "⇧", "F5"],
    win: ["Ctrl", "⇧", "F5"],
  },
  {
    id: "debug-step-over",
    action: "Step Over",
    category: "debugger",
    mac: ["F10"],
    win: ["F10"],
  },
  {
    id: "debug-step-into",
    action: "Step Into",
    category: "debugger",
    mac: ["F11"],
    win: ["F11"],
  },
  {
    id: "debug-step-out",
    action: "Step Out",
    category: "debugger",
    mac: ["⇧", "F11"],
    win: ["⇧", "F11"],
  },
  {
    id: "debug-breakpoint",
    action: "Toggle Breakpoint",
    category: "debugger",
    mac: ["F9"],
    win: ["F9"],
  },
  {
    id: "debug-cond-breakpoint",
    action: "Conditional Breakpoint",
    category: "debugger",
    mac: ["⇧", "F9"],
    win: ["⇧", "F9"],
  },

  // ── Disassembler ──────────────────────────────────────────────────────────
  {
    id: "disasm-goto-addr",
    action: "Go to Address",
    category: "disassembler",
    mac: ["⌘", "G"],
    win: ["Ctrl", "G"],
  },
  {
    id: "disasm-goto-func",
    action: "Go to Function",
    category: "disassembler",
    mac: ["⌘", "⇧", "G"],
    win: ["Ctrl", "⇧", "G"],
  },
  {
    id: "disasm-toggle-graph",
    action: "Toggle Graph / Listing",
    category: "disassembler",
    mac: ["Space"],
    win: ["Space"],
  },
  {
    id: "disasm-rename",
    action: "Rename Label / Function",
    category: "disassembler",
    mac: ["N"],
    win: ["N"],
  },
  {
    id: "disasm-comment",
    action: "Add Comment",
    category: "disassembler",
    mac: [";"],
    win: [";"],
  },
  {
    id: "disasm-xrefs",
    action: "Cross-References",
    category: "disassembler",
    mac: ["X"],
    win: ["X"],
  },

  // ── ROP Chain ─────────────────────────────────────────────────────────────
  {
    id: "rop-search",
    action: "Search Gadgets",
    category: "rop",
    mac: ["⌘", "⇧", "R"],
    win: ["Ctrl", "⇧", "R"],
  },
  {
    id: "rop-simulate",
    action: "Simulate Chain",
    category: "rop",
    mac: ["⌘", "↩"],
    win: ["Ctrl", "Enter"],
  },
  {
    id: "rop-export",
    action: "Export Chain",
    category: "rop",
    mac: ["⌘", "⇧", "E"],
    win: ["Ctrl", "⇧", "E"],
  },

  // ── Terminal ──────────────────────────────────────────────────────────────
  {
    id: "new-shell",
    action: "New Shell Session",
    category: "terminal",
    mac: ["⌘", "⇧", "T"],
    win: ["Ctrl", "⇧", "T"],
  },
  {
    id: "next-shell",
    action: "Next Shell Session",
    category: "terminal",
    mac: ["⌘", "⌥", "]"],
    win: ["Ctrl", "Alt", "]"],
  },
  {
    id: "prev-shell",
    action: "Previous Shell Session",
    category: "terminal",
    mac: ["⌘", "⌥", "["],
    win: ["Ctrl", "Alt", "["],
  },
  {
    id: "clear-terminal",
    action: "Clear Terminal",
    category: "terminal",
    mac: ["⌘", "K"],
    win: ["Ctrl", "L"],
  },
];

// Group by category
export function groupedKeybindings(): Record<Category, KbDef[]> {
  const grouped = {} as Record<Category, KbDef[]>;
  for (const kb of KEYBINDINGS) {
    (grouped[kb.category] ??= []).push(kb);
  }
  return grouped;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  global:       "Global",
  navigation:   "Navigation & Panels",
  editor:       "Code Editor",
  debugger:     "Debugger",
  disassembler: "Disassembler",
  rop:          "ROP Chain Builder",
  terminal:     "Terminal / Shell",
};
