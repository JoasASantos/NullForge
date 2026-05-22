import { useEffect, useRef, useState } from "react";
import { Check, X, Plus, Trash2 } from "lucide-react";
import { useAppStore, type Workspace } from "../../store";

const PRESET_COLORS = [
  "#e63946",
  "#2196f3",
  "#4caf50",
  "#ff9800",
  "#9c27b0",
  "#00bcd4",
] as const;

function generateId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

type PanelView = "detail" | "create";

export function WorkspaceManager() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    addWorkspace,
    deleteWorkspace,
    updateWorkspace,
    setShowWorkspaceManager,
    currentProject,
  } = useAppStore();

  // Prefer currentWorkspace as initially selected; fall back to last in list (most recently added)
  const initSelectedId = currentWorkspace?.id ?? (workspaces.length > 0 ? workspaces[workspaces.length - 1].id : null);

  const [selectedId, setSelectedId] = useState<string | null>(initSelectedId);
  const [panelView, setPanelView] = useState<PanelView>(
    workspaces.length === 0 ? "create" : "detail"
  );
  const listRef = useRef<HTMLDivElement>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0]);
  const [createError, setCreateError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedId) ?? null;

  // Count projects per workspace — currently projects aren't associated to workspaces yet,
  // but keep the hook for future use; for now it always returns 0 unless the project
  // is in the current workspace.
  function projectCountFor(wsId: string): number {
    if (currentProject && currentWorkspace?.id === wsId) return 1;
    return 0;
  }

  // Close on overlay background click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) {
      setShowWorkspaceManager(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowWorkspaceManager(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowWorkspaceManager]);

  function handleCreate() {
    if (!newName.trim()) {
      setCreateError("Workspace name is required.");
      return;
    }
    const ws: Workspace = {
      id: generateId(),
      name: newName.trim(),
      description: newDesc.trim(),
      color: newColor,
      created_at: new Date().toISOString(),
    };
    addWorkspace(ws);
    setCurrentWorkspace(ws);
    setSelectedId(ws.id);
    setNewName("");
    setNewDesc("");
    setNewColor(PRESET_COLORS[0]);
    setCreateError(null);
    // Close manager and open workspace screen so user can immediately create/open a project
    setShowWorkspaceManager(false);
    useAppStore.getState().setShowWorkspaceScreen(true);
  }

  function handleDelete(ws: Workspace) {
    const confirmed = window.confirm(
      `Delete workspace "${ws.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    deleteWorkspace(ws.id);
    const remaining = workspaces.filter((w) => w.id !== ws.id);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
      setPanelView("detail");
    } else {
      setSelectedId(null);
      setPanelView("create");
    }
  }

  function handleActivate(ws: Workspace) {
    setCurrentWorkspace(ws);
    setShowWorkspaceManager(false);
  }

  const inputClass =
    "w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors";
  const labelClass = "block text-xs font-medium text-text-muted mb-1";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-2xl mx-4 bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Workspace Manager</h2>
          <button
            onClick={() => setShowWorkspaceManager(false)}
            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel — workspace list */}
          <div className="w-52 flex-shrink-0 border-r border-border flex flex-col bg-surface">
            <div ref={listRef} className="flex-1 overflow-y-auto py-1">
              {workspaces.length === 0 && (
                <p className="text-xs text-text-dim px-3 py-3">No workspaces yet.</p>
              )}
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  data-ws-id={ws.id}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors mx-1 text-xs",
                    selectedId === ws.id && panelView === "detail"
                      ? "bg-elevated text-text-primary"
                      : "hover:bg-elevated text-text-muted hover:text-text-primary",
                  ].join(" ")}
                  onClick={() => {
                    setSelectedId(ws.id);
                    setPanelView("detail");
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ws.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary truncate">{ws.name}</div>
                    <div className="text-text-dim">
                      {projectCountFor(ws.id)} project{projectCountFor(ws.id) !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {currentWorkspace?.id === ws.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Bottom create button */}
            <div className="border-t border-border p-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setPanelView("create");
                }}
                className={[
                  "w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs transition-colors",
                  panelView === "create"
                    ? "bg-accent-red text-white"
                    : "bg-elevated text-text-muted hover:text-text-primary hover:bg-surface border border-border",
                ].join(" ")}
              >
                <Plus size={12} />
                New Workspace
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {panelView === "create" ? (
              /* Create form */
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-text-primary">Create Workspace</h3>
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. ROP Research"
                    className={inputClass}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Color</label>
                  <div className="flex gap-2 mt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={[
                          "w-6 h-6 rounded-full transition-transform",
                          newColor === c
                            ? "ring-2 ring-offset-2 ring-offset-elevated ring-white scale-110"
                            : "hover:scale-110",
                        ].join(" ")}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
                {createError && (
                  <p className="text-xs text-accent-red">{createError}</p>
                )}
                <button
                  onClick={handleCreate}
                  className="py-2 rounded bg-accent-red hover:bg-accent-red/80 text-white text-sm font-semibold transition-colors"
                >
                  Create Workspace
                </button>
              </div>
            ) : selectedWorkspace ? (
              /* Workspace detail */
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: selectedWorkspace.color }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {selectedWorkspace.name}
                      </h3>
                      {currentWorkspace?.id === selectedWorkspace.id && (
                        <span className="text-[10px] text-accent-green">Active workspace</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedWorkspace)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-dim hover:text-accent-red hover:bg-surface transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>

                {selectedWorkspace.description ? (
                  <p className="text-xs text-text-muted leading-relaxed">
                    {selectedWorkspace.description}
                  </p>
                ) : (
                  <p className="text-xs text-text-dim italic">No description.</p>
                )}

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-dim mb-2">Color</p>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateWorkspace({ ...selectedWorkspace, color: c })}
                        className={[
                          "w-5 h-5 rounded-full transition-transform hover:scale-110",
                          selectedWorkspace.color === c
                            ? "ring-2 ring-offset-1 ring-offset-elevated ring-white scale-110"
                            : "",
                        ].join(" ")}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-dim mb-2">Projects</p>
                  {projectCountFor(selectedWorkspace.id) > 0 ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface text-xs text-text-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                      {currentProject?.name}
                    </div>
                  ) : (
                    <p className="text-xs text-text-dim italic">No projects in this workspace.</p>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-dim mb-1">Created</p>
                  <p className="text-xs text-text-muted">
                    {new Date(selectedWorkspace.created_at).toLocaleString()}
                  </p>
                </div>

                {currentWorkspace?.id !== selectedWorkspace.id && (
                  <button
                    onClick={() => handleActivate(selectedWorkspace)}
                    className="py-1.5 rounded bg-accent-red hover:bg-accent-red/80 text-white text-xs font-semibold transition-colors"
                  >
                    Switch to This Workspace
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-dim">Select a workspace or create one.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
