import {
  ChevronDown, ChevronRight, File, FilePlus,
  Folder, FolderOpen, FolderPlus, Minus,
} from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { type ActivePanel, useAppStore } from "../../store";
import { PayloadBrowser } from "../PayloadLib/PayloadBrowser";
import { ExploitBrowser } from "../ExploitDB/ExploitBrowser";
import { SysAPIBrowser } from "../SysAPI/SysAPIBrowser";
import { BINARY_EXTS } from "../Workspace/WelcomeScreen";

// ─── Tree types & pure helpers ────────────────────────────────────────────────

interface TreeNode {
  id: string;
  name: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function insertNode(nodes: TreeNode[], parentId: string | null, node: TreeNode): TreeNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), node] };
    if (n.children) return { ...n, children: insertNode(n.children, parentId, node) };
    return n;
  });
}

function renameInTree(nodes: TreeNode[], id: string, name: string): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name };
    if (n.children) return { ...n, children: renameInTree(n.children, id, name) };
    return n;
  });
}

function deleteFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: deleteFromTree(n.children, id) } : n));
}

function findById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findById(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

// ─── Language detection ───────────────────────────────────────────────────────

function detectLanguage(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".py": "python", ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp",
    ".cxx": "cpp", ".rs": "rust", ".asm": "asm", ".s": "asm", ".rb": "ruby",
    ".js": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".jsx": "javascript", ".go": "go", ".sh": "bash", ".bash": "bash",
    ".ps1": "powershell", ".md": "markdown", ".yml": "yaml", ".yaml": "yaml",
    ".json": "json", ".toml": "toml",
  };
  return map[ext] ?? "plaintext";
}

// ─── Inline input (for create / rename) ──────────────────────────────────────

interface InlineInputProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  depth: number;
  icon: React.ReactNode;
}

const InlineInput = forwardRef<HTMLInputElement | null, InlineInputProps>(
  ({ value, onChange, onCommit, onCancel, depth, icon }, ref) => (
    <div
      className="flex items-center gap-1 py-0.5 bg-elevated"
      style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: 8 }}
    >
      {icon}
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onCommit(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        onBlur={onCommit}
        className="flex-1 bg-bg-base border border-accent-red rounded px-1 py-0.5 text-xs text-text-primary outline-none min-w-0"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
);
InlineInput.displayName = "InlineInput";

// ─── Context menu ─────────────────────────────────────────────────────────────

interface CtxMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  nodeType?: "file" | "dir";
  onNewFile: (parentId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function ContextMenu({ x, y, nodeId, nodeType, onNewFile, onNewFolder, onRename, onDelete, onClose }: CtxMenuProps) {
  const items: { label: string; action: () => void; danger?: boolean; sep?: boolean }[] = [];

  if (nodeType === "dir" || nodeId === null) {
    items.push({ label: "New File",   action: () => onNewFile(nodeId) });
    items.push({ label: "New Folder", action: () => onNewFolder(nodeId) });
  }
  if (nodeId !== null) {
    if (items.length) items.push({ label: "", action: () => {}, sep: true });
    items.push({ label: "Rename", action: () => onRename(nodeId) });
    items.push({ label: "Delete", action: () => onDelete(nodeId), danger: true });
  }

  return (
    <div
      className="fixed z-[200] bg-elevated border border-border rounded shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.sep ? (
          <div key={i} className="border-t border-border my-1" />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            className={[
              "w-full text-left px-3 py-1 text-xs transition-colors",
              item.danger
                ? "text-[#e63946] hover:bg-[#e63946]/10"
                : "text-text-muted hover:text-text-primary hover:bg-surface",
            ].join(" ")}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ─── Edit state type ──────────────────────────────────────────────────────────

type EditState =
  | { mode: "rename"; nodeId: string; value: string }
  | { mode: "create"; parentId: string | null; type: "file" | "dir"; value: string }
  | null;

// ─── Tree item ────────────────────────────────────────────────────────────────

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  collapseKey: number;
  editState: EditState;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onContextMenu: (e: React.MouseEvent, nodeId: string, nodeType: "file" | "dir") => void;
  onEditChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  startCreate: (parentId: string | null, type: "file" | "dir") => void;
}

function TreeItemComp({
  node, depth, collapseKey, editState, inputRef,
  onContextMenu, onEditChange, onCommit, onCancel, startCreate,
}: TreeItemProps) {
  const [open, setOpen] = useState(depth === 0);
  const prevKey = useRef(collapseKey);

  useEffect(() => {
    if (collapseKey !== prevKey.current) {
      setOpen(false);
      prevKey.current = collapseKey;
    }
  }, [collapseKey]);

  // Auto-open when a child is being created inside this dir
  useEffect(() => {
    if (editState?.mode === "create" && editState.parentId === node.id) {
      setOpen(true);
    }
  }, [editState, node.id]);

  const isRenaming = editState?.mode === "rename" && editState.nodeId === node.id;
  const isCreatingInside = editState?.mode === "create" && editState.parentId === node.id;

  function openFile(n: TreeNode) {
    const ext = n.name.slice(n.name.lastIndexOf(".")).toLowerCase();
    if (BINARY_EXTS.has(ext)) {
      window.dispatchEvent(new CustomEvent("nullforge:open-disasm-view", { detail: { name: n.name } }));
    } else {
      window.dispatchEvent(new CustomEvent("nullforge:open-file", {
        detail: { name: n.name, language: detectLanguage(n.name), content: "" },
      }));
    }
  }

  if (node.type === "dir") {
    return (
      <div>
        {isRenaming ? (
          <InlineInput
            ref={inputRef}
            value={(editState as { value: string }).value}
            onChange={onEditChange}
            onCommit={onCommit}
            onCancel={onCancel}
            depth={depth}
            icon={<FolderOpen size={12} className="text-accent-yellow flex-shrink-0" />}
          />
        ) : (
          <button
            onContextMenu={(e) => onContextMenu(e, node.id, "dir")}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 w-full py-0.5 text-text-muted hover:text-text-primary hover:bg-elevated transition-colors text-xs"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open
              ? <FolderOpen size={12} className="text-accent-yellow flex-shrink-0" />
              : <Folder size={12} className="text-accent-yellow flex-shrink-0" />}
            <span className="truncate">{node.name}</span>
          </button>
        )}
        {open && (
          <div>
            {isCreatingInside && (
              <InlineInput
                ref={inputRef}
                value={(editState as { value: string }).value}
                onChange={onEditChange}
                onCommit={onCommit}
                onCancel={onCancel}
                depth={depth + 1}
                icon={
                  (editState as { type: string }).type === "dir"
                    ? <Folder size={12} className="text-accent-yellow flex-shrink-0" />
                    : <File size={12} className="flex-shrink-0" />
                }
              />
            )}
            {node.children?.map((child) => (
              <TreeItemComp
                key={child.id}
                node={child}
                depth={depth + 1}
                collapseKey={collapseKey}
                editState={editState}
                inputRef={inputRef}
                onContextMenu={onContextMenu}
                onEditChange={onEditChange}
                onCommit={onCommit}
                onCancel={onCancel}
                startCreate={startCreate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return isRenaming ? (
    <InlineInput
      ref={inputRef}
      value={(editState as { value: string }).value}
      onChange={onEditChange}
      onCommit={onCommit}
      onCancel={onCancel}
      depth={depth}
      icon={<File size={12} className="flex-shrink-0" />}
    />
  ) : (
    <button
      onContextMenu={(e) => onContextMenu(e, node.id, "file")}
      onClick={() => openFile(node)}
      className="flex items-center gap-1 w-full py-0.5 text-text-muted hover:text-text-primary hover:bg-elevated transition-colors text-xs"
      style={{ paddingLeft: `${20 + depth * 12}px` }}
    >
      <File size={12} className="flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Panel titles ─────────────────────────────────────────────────────────────

const PANEL_TITLES: Record<ActivePanel, string> = {
  explorer:  "EXPLORER",
  search:    "SEARCH",
  payloads:  "PAYLOAD LIBRARY",
  exploitdb: "EXPLOIT DATABASE",
  sysapi:    "SYSCALL / API REFERENCE",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { activePanel, sidebarOpen, sidebarWidth, setSidebarWidth } = useAppStore();
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startX: e.clientX, startW: sidebarWidth };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const newW = Math.max(160, Math.min(500, dragRef.current.startW + delta));
        setSidebarWidth(newW);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  if (!sidebarOpen) return null;

  return (
    <div
      className="h-full flex flex-col bg-surface border-r border-border flex-shrink-0 overflow-hidden relative"
      style={{ width: sidebarWidth }}
    >
      <div className="px-3 py-2 text-xs font-semibold text-text-muted tracking-wider border-b border-border flex-shrink-0">
        {PANEL_TITLES[activePanel]}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activePanel === "explorer"  && <ExplorerPanel />}
        {activePanel === "search"    && <SearchPanel />}
        {activePanel === "payloads"  && <PayloadBrowser />}
        {activePanel === "exploitdb" && <ExploitBrowser />}
        {activePanel === "sysapi"    && <SysAPIBrowser />}
      </div>
      <div
        onMouseDown={onDragStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-red/50 transition-colors z-10"
      />
    </div>
  );
}

// ─── ExplorerPanel ────────────────────────────────────────────────────────────

function ExplorerPanel() {
  const {
    currentProject, setShowWorkspaceScreen,
    workspaces, currentWorkspace, setCurrentWorkspace,
  } = useAppStore();

  const storageKey = currentProject ? `nullforge_tree_${currentProject.id}` : null;

  const [tree, setTree] = useState<TreeNode[]>(() => {
    if (!storageKey) return [];
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });

  const treeRef = useRef(tree);
  treeRef.current = tree;

  const [collapseKey, setCollapseKey] = useState(0);

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(tree)); } catch {}
  }, [tree, storageKey]);

  const [ctxMenu, setCtxMenu] = useState<{
    x: number; y: number;
    nodeId: string | null;
    nodeType?: "file" | "dir";
  } | null>(null);

  const [editState, setEditState] = useState<EditState>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editSessionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const h = () => setCtxMenu(null);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [ctxMenu]);

  // Focus only when a NEW edit session starts, not on every keystroke value change
  useEffect(() => {
    if (!editState) { editSessionKey.current = null; return; }
    const key = editState.mode === "rename"
      ? `rename-${editState.nodeId}`
      : `create-${editState.parentId ?? "root"}-${editState.type}`;
    if (key !== editSessionKey.current) {
      editSessionKey.current = key;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editState]);

  function startCreate(parentId: string | null, type: "file" | "dir") {
    setCtxMenu(null);
    setEditState({ mode: "create", parentId, type, value: "" });
  }

  function startRename(nodeId: string) {
    const node = findById(treeRef.current, nodeId);
    if (!node) return;
    setCtxMenu(null);
    setEditState({ mode: "rename", nodeId, value: node.name });
  }

  function commitEdit() {
    if (!editState) return;
    const val = editState.value.trim();
    if (!val) { setEditState(null); return; }
    if (editState.mode === "create") {
      const newNode: TreeNode = {
        id: genId(),
        name: val,
        type: editState.type,
        ...(editState.type === "dir" ? { children: [] } : {}),
      };
      setTree((t) => insertNode(t, editState.parentId, newNode));
      if (editState.type === "file") {
        window.dispatchEvent(new CustomEvent("nullforge:open-file", {
          detail: { name: val, language: detectLanguage(val), content: "" },
        }));
      }
    } else {
      setTree((t) => renameInTree(t, editState.nodeId, val));
    }
    setEditState(null);
  }

  function deleteNode(nodeId: string) {
    setCtxMenu(null);
    setTree((t) => deleteFromTree(t, nodeId));
  }

  function handleContextMenu(e: React.MouseEvent, nodeId: string | null, nodeType?: "file" | "dir") {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId, nodeType });
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 px-4 text-center">
        <span className="text-xs text-text-muted">No project open</span>
        <button
          onClick={() => setShowWorkspaceScreen(true)}
          className="text-xs px-3 py-1.5 rounded bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30 hover:bg-[#e63946]/30 transition-colors"
        >
          Open Workspace
        </button>
      </div>
    );
  }

  return (
    <div onContextMenu={(e) => handleContextMenu(e, null, undefined)}>
      {/* Project header + toolbar */}
      <div className="flex items-center justify-between px-2 py-1 sticky top-0 bg-surface border-b border-border z-10">
        <span
          className="text-xs text-text-muted font-medium uppercase tracking-wider truncate max-w-[65%]"
          title={currentProject.name}
        >
          PROJECT: {currentProject.name}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            title="New File"
            onClick={() => startCreate(null, "file")}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <FilePlus size={13} />
          </button>
          <button
            title="New Folder"
            onClick={() => startCreate(null, "dir")}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <FolderPlus size={13} />
          </button>
          <button
            title="Collapse All"
            onClick={() => setCollapseKey((k) => k + 1)}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Minus size={13} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="py-1">
        {tree.length === 0 && !editState && (
          <div className="px-4 py-6 text-xs text-text-dim text-center select-none leading-loose">
            Empty project
            <br />
            <span className="opacity-60">Right-click or use + to add files</span>
          </div>
        )}

        {/* Root-level create input */}
        {editState?.mode === "create" && editState.parentId === null && (
          <InlineInput
            ref={inputRef}
            value={editState.value}
            onChange={(v) => setEditState((s) => (s ? { ...s, value: v } : s))}
            onCommit={commitEdit}
            onCancel={() => setEditState(null)}
            depth={0}
            icon={
              editState.type === "dir"
                ? <Folder size={12} className="text-accent-yellow flex-shrink-0" />
                : <File size={12} className="flex-shrink-0" />
            }
          />
        )}

        {tree.map((node) => (
          <TreeItemComp
            key={node.id}
            node={node}
            depth={0}
            collapseKey={collapseKey}
            editState={editState}
            inputRef={inputRef}
            onContextMenu={handleContextMenu}
            onEditChange={(v) => setEditState((s) => (s ? { ...s, value: v } : s))}
            onCommit={commitEdit}
            onCancel={() => setEditState(null)}
            startCreate={startCreate}
          />
        ))}
      </div>

      {/* Workspace section */}
      <div className="border-t border-border mt-1 pt-1 pb-2">
        <div className="px-3 py-1 text-xs text-text-muted font-medium uppercase tracking-wider">
          WORKSPACE
        </div>
        {workspaces.length === 0 ? (
          <div className="px-3 pb-1 text-xs text-text-dim">No workspaces yet</div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setCurrentWorkspace(ws)}
              className={[
                "flex items-center gap-2 px-3 py-1 text-xs transition-colors text-left w-full",
                currentWorkspace?.id === ws.id
                  ? "text-text-primary bg-elevated"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated",
              ].join(" ")}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: ws.color ?? "#475569" }}
              />
              <span className="truncate flex-1">{ws.name}</span>
              {currentWorkspace?.id === ws.id && (
                <span className="text-[9px] text-text-dim">active</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          nodeId={ctxMenu.nodeId}
          nodeType={ctxMenu.nodeType}
          onNewFile={(pid) => startCreate(pid, "file")}
          onNewFolder={(pid) => startCreate(pid, "dir")}
          onRename={startRename}
          onDelete={deleteNode}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

// ─── SearchPanel ──────────────────────────────────────────────────────────────

function SearchPanel() {
  return (
    <div className="px-2 py-2">
      <input
        type="text"
        placeholder="Search files..."
        className="w-full bg-elevated border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors"
      />
    </div>
  );
}

