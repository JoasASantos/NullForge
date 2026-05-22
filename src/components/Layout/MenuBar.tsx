import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { isMac } from "../../lib/platform";

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuItemDef =
  | { kind: "separator" }
  | {
      kind: "item";
      label: string;
      shortcut?: string;
      disabled?: boolean;
      submenuArrow?: boolean;
      action?: () => void;
    };

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

interface DropdownProps {
  items: MenuItemDef[];
  onClose: () => void;
}

function Dropdown({ items, onClose }: DropdownProps) {
  return (
    <div className="absolute top-full left-0 z-50 min-w-[200px] bg-elevated border border-border rounded shadow-lg py-1">
      {items.map((item, idx) => {
        if (item.kind === "separator") {
          return <div key={idx} className="border-t border-border my-1" />;
        }
        return (
          <div
            key={idx}
            className={[
              "flex items-center justify-between px-3 py-1 text-xs select-none",
              item.disabled
                ? "text-text-dim cursor-default"
                : "text-text-muted hover:bg-surface hover:text-text-primary cursor-pointer",
            ].join(" ")}
            onClick={() => {
              if (item.disabled) return;
              item.action?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            <span className="ml-8 text-text-dim text-[10px] flex items-center gap-1">
              {item.shortcut}
              {item.submenuArrow && <span className="ml-1 text-[10px]">▶</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── MenuBar ─────────────────────────────────────────────────────────────────

export function MenuBar() {
  const {
    toggleSidebar,
    toggleAiPanel,
    toggleBottomPanel,
    setActivePanel,
    setShowWorkspaceManager,
    currentWorkspace,
    currentProject,
    setSidebarWidth,
    setRightPanelWidth,
    setBottomPanelHeight,
    toggleEditorMaximized,
    setSidebarOpen,
    setAiPanelOpen,
    setBottomPanelOpen,
    openToolPanel,
  } = useAppStore();

  function applyLayout(name: "default" | "focus" | "wide-editor" | "wide-ai") {
    if (name === "default") {
      setSidebarOpen(true);
      setAiPanelOpen(true);
      setBottomPanelOpen(true);
      setSidebarWidth(240);
      setRightPanelWidth(320);
      setBottomPanelHeight(220);
    }
    if (name === "focus")       { toggleEditorMaximized(); }
    if (name === "wide-editor") { setSidebarOpen(true); setSidebarWidth(200); setRightPanelWidth(260); }
    if (name === "wide-ai")     { setSidebarOpen(true); setAiPanelOpen(true); setSidebarWidth(200); setRightPanelWidth(420); }
  }

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function toggleMenu(name: string) {
    setOpenMenu((prev) => (prev === name ? null : name));
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  // Platform-aware modifier key label
  const cmd = isMac() ? "⌘" : "Ctrl";
  const sh  = "⇧";

  // ── Menu definitions ───────────────────────────────────────────────────────
  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { kind: "item", label: "New File",    shortcut: `${cmd}+N` },
        { kind: "separator" },
        { kind: "item", label: "Open File...", shortcut: `${cmd}+O` },
        { kind: "separator" },
        { kind: "item", label: "Save",         shortcut: `${cmd}+S` },
        { kind: "item", label: "Save All",     shortcut: `${cmd}+${sh}+S` },
        { kind: "separator" },
        { kind: "item", label: "Export Project (.nullforge)...", action: () => window.dispatchEvent(new CustomEvent("nullforge:project-file")) },
        { kind: "item", label: "Import Project (.nullforge)...", action: () => window.dispatchEvent(new CustomEvent("nullforge:project-file")) },
        { kind: "separator" },
        { kind: "item", label: "Close Tab", shortcut: `${cmd}+W` },
        { kind: "item", label: "Exit" },
      ],
    },
    {
      label: "Edit",
      items: [
        { kind: "item", label: "Undo",       shortcut: `${cmd}+Z` },
        { kind: "item", label: "Redo",       shortcut: `${cmd}+${sh}+Z` },
        { kind: "separator" },
        { kind: "item", label: "Cut",        shortcut: `${cmd}+X` },
        { kind: "item", label: "Copy",       shortcut: `${cmd}+C` },
        { kind: "item", label: "Paste",      shortcut: `${cmd}+V` },
        { kind: "separator" },
        { kind: "item", label: "Find",       shortcut: `${cmd}+F` },
        { kind: "item", label: "Replace",    shortcut: `${cmd}+H` },
        { kind: "separator" },
        { kind: "item", label: "Select All", shortcut: `${cmd}+A` },
      ],
    },
    {
      label: "View",
      items: [
        { kind: "item", label: "Toggle Sidebar",      shortcut: `${cmd}+B`,           action: toggleSidebar },
        { kind: "item", label: "Toggle Terminal",      shortcut: `${cmd}+J`,           action: toggleBottomPanel },
        { kind: "item", label: "Toggle AI Panel",      shortcut: `${cmd}+${sh}+B`,    action: toggleAiPanel },
        { kind: "item", label: "Command Palette",      shortcut: `${cmd}+${sh}+P`,    action: () => window.dispatchEvent(new CustomEvent("nullforge:command-palette")) },
        { kind: "separator" },
        { kind: "item", label: "Layout: Default",      action: () => applyLayout("default") },
        { kind: "item", label: "Layout: Focus Mode",   action: () => applyLayout("focus") },
        { kind: "item", label: "Layout: Wide Editor",  action: () => applyLayout("wide-editor") },
        { kind: "item", label: "Layout: Wide AI",      action: () => applyLayout("wide-ai") },
        { kind: "separator" },
        { kind: "item", label: "Zoom In" },
        { kind: "item", label: "Zoom Out" },
        { kind: "item", label: "Reset Zoom" },
      ],
    },
    {
      label: "Tools",
      items: [
        { kind: "item", label: "Payload Library",   action: () => setActivePanel("payloads") },
        { kind: "item", label: "Exploit Database",  action: () => setActivePanel("exploitdb") },
        { kind: "item", label: "Syscall Reference", action: () => setActivePanel("sysapi") },
        { kind: "separator" },
        { kind: "item", label: "Disassembler",        shortcut: `${cmd}+${sh}+D`, action: () => openToolPanel("disasm") },
        { kind: "item", label: "Shellcode Generator", shortcut: `${cmd}+${sh}+K`, action: () => openToolPanel("shellcode") },
        { kind: "item", label: "Build / Compiler",                                  action: () => openToolPanel("build") },
        { kind: "item", label: "Network Tools",        shortcut: `${cmd}+${sh}+N`, action: () => openToolPanel("network") },
        { kind: "item", label: "Debugger",            shortcut: `${cmd}+${sh}+G`, action: () => openToolPanel("debugger") },
        { kind: "item", label: "Plugins",                                           action: () => openToolPanel("plugins") },
        { kind: "separator" },
        { kind: "item", label: "Exploit Primitives",  action: () => openToolPanel("primitives") },
        { kind: "item", label: "Exploit Timeline",    action: () => openToolPanel("timeline") },
      ],
    },
    {
      label: "Workspace",
      items: [
        {
          kind: "item",
          label: "New Workspace...",
          action: () => setShowWorkspaceManager(true),
        },
        {
          kind: "item",
          label: "Manage Workspaces...",
          action: () => setShowWorkspaceManager(true),
        },
        { kind: "separator" },
        {
          kind: "item",
          label: currentWorkspace
            ? `Active: ${currentWorkspace.name}`
            : "No workspace active",
          disabled: true,
        },
        {
          kind: "item",
          label: currentProject
            ? `Project: ${currentProject.name}`
            : "No project open",
          disabled: true,
        },
      ],
    },
    {
      label: "Help",
      items: [
        { kind: "item", label: "About NullForge" },
        { kind: "item", label: "Keyboard Shortcuts", shortcut: `${cmd}+${sh}+/`, action: () => window.dispatchEvent(new CustomEvent("nullforge:cheat-sheet")) },
        { kind: "item", label: "Report Issue" },
      ],
    },
  ];


  return (
    <div
      ref={barRef}
      className="h-8 flex-shrink-0 bg-surface border-b border-border flex items-stretch select-none relative"
    >
      {/* macOS traffic-light spacer — draggable */}
      <div
        className="w-[72px] flex-shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Menu items */}
      <div className="flex items-stretch" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {menus.map((menu) => (
          <div key={menu.label} className="relative flex items-stretch">
            <button
              className={[
                "px-3 text-xs font-medium transition-colors h-full flex items-center",
                openMenu === menu.label
                  ? "bg-elevated text-text-primary"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated",
              ].join(" ")}
              onMouseDown={(e) => {
                e.preventDefault();
                toggleMenu(menu.label);
              }}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(menu.label);
              }}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <Dropdown items={menu.items} onClose={closeMenu} />
            )}
          </div>
        ))}
      </div>

      {/* Center — draggable app title */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <img src="/logo.png" alt="NullForge" className="h-5 w-auto opacity-90" />
      </div>

      {/* Right — workspace pill */}
      <div
        className="flex items-center pr-3"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => setShowWorkspaceManager(true)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-elevated hover:border-accent-red/50 transition-colors"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: currentWorkspace?.color ?? "#475569",
            }}
          />
          <span className="text-[10px] text-text-muted max-w-[100px] truncate">
            {currentWorkspace?.name ?? "No Workspace"}
          </span>
        </button>
      </div>
    </div>
  );
}
