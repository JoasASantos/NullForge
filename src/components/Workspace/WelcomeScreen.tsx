import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, Plus, X } from "lucide-react";
import { useAppStore, type Workspace, type Project } from "../../store";

// ─── Persistence ──────────────────────────────────────────────────────────────

const RECENT_KEY = "nullforge_recent_projects";
const BINARY_EXTS = new Set([".exe", ".bin", ".so", ".dll", ".dylib", ".elf", ".ko", ".o", ".out"]);

function loadRecentProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as Project[]; } catch { return []; }
}
function saveRecentProjects(ps: Project[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ps.slice(0, 8))); } catch { /* ignore */ }
}
function addToRecents(p: Project) {
  saveRecentProjects([p, ...loadRecentProjects().filter((x) => x.id !== p.id)]);
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Workspace color presets ──────────────────────────────────────────────────

const WS_COLORS = ["#e63946", "#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#00bcd4", "#f06292", "#8bc34a"] as const;

type TargetOS   = "linux" | "windows" | "macos" | "android" | "freebsd" | "solaris";
type TargetArch = "x64" | "x86" | "arm64" | "arm" | "mips";

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

export function WelcomeScreen() {
  const {
    workspaces, currentWorkspace,
    addWorkspace, setCurrentWorkspace,
    setCurrentProject, setShowWorkspaceScreen,
  } = useAppStore();

  // ── Workspace step ──────────────────────────────────────────────────────────
  const [selectedWsId, setSelectedWsId] = useState<string | null>(currentWorkspace?.id ?? null);
  const [showWsCreate, setShowWsCreate] = useState(workspaces.length === 0);
  const [wsName, setWsName]   = useState("");
  const [wsColor, setWsColor] = useState<string>(WS_COLORS[0]);
  const [wsErr, setWsErr]     = useState<string | null>(null);
  const wsInputRef = useRef<HTMLInputElement>(null);

  const selectedWs = workspaces.find((w) => w.id === selectedWsId) ?? null;

  // Force focus into workspace name input whenever the create form appears
  useEffect(() => {
    if (showWsCreate) {
      const t = setTimeout(() => wsInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showWsCreate]);

  function handleWsCreate() {
    if (!wsName.trim()) { setWsErr("Name required."); return; }
    const ws: Workspace = {
      id: generateId("ws"),
      name: wsName.trim(),
      description: "",
      color: wsColor,
      created_at: new Date().toISOString(),
    };
    addWorkspace(ws);
    setCurrentWorkspace(ws);
    setSelectedWsId(ws.id);
    setWsName("");
    setWsErr(null);
    setShowWsCreate(false);
  }

  // ── Project step ────────────────────────────────────────────────────────────
  const [projName, setProjName]   = useState("");
  const [projDesc, setProjDesc]   = useState("");
  const [targetOs, setTargetOs]   = useState<TargetOS>("linux");
  const [targetArch, setTargetArch] = useState<TargetArch>("x64");
  const [creating, setCreating]   = useState(false);
  const [projErr, setProjErr]     = useState<string | null>(null);
  const [recents, setRecents]     = useState<Project[]>([]);

  useEffect(() => { setRecents(loadRecentProjects()); }, []);

  const commitWorkspace = useCallback(() => {
    if (selectedWs) setCurrentWorkspace(selectedWs);
  }, [selectedWs, setCurrentWorkspace]);

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) { setProjErr("Project name is required."); return; }
    setProjErr(null);
    setCreating(true);
    commitWorkspace();

    let project: Project;
    try {
      project = await invoke<Project>("create_project", {
        name: projName.trim(),
        description: projDesc.trim(),
        target_arch: targetArch,
        target_os: targetOs,
      });
    } catch {
      project = {
        id: generateId("proj"),
        name: projName.trim(),
        description: projDesc.trim(),
        target_arch: targetArch,
        target_os: targetOs,
        created_at: new Date().toISOString(),
      };
    }

    addToRecents(project);
    setCurrentProject(project);
    setShowWorkspaceScreen(false);
    setCreating(false);
  }, [projName, projDesc, targetOs, targetArch, commitWorkspace, setCurrentProject, setShowWorkspaceScreen]);

  const handleOpenRecent = useCallback((p: Project) => {
    commitWorkspace();
    addToRecents(p);
    setCurrentProject(p);
    setShowWorkspaceScreen(false);
  }, [commitWorkspace, setCurrentProject, setShowWorkspaceScreen]);

  const handleSkip = useCallback(() => {
    commitWorkspace();
    setShowWorkspaceScreen(false);
  }, [commitWorkspace, setShowWorkspaceScreen]);

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const input = "w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors";
  const label = "block text-xs font-medium text-text-muted mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/90 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-border bg-elevated shadow-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: "92vh" }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <img src="/logo.png" alt="NullForge" className="h-8 w-auto" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary">NullForge</h1>
            <p className="text-[11px] text-text-muted">AI-Powered Exploit Development IDE</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ═══════════════════════════════════ WORKSPACE ════════════════════ */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">Workspace</span>
              {!showWsCreate && (
                <button
                  onClick={() => setShowWsCreate(true)}
                  className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-muted transition-colors"
                >
                  <Plus size={10} /> New
                </button>
              )}
            </div>

            {/* Existing workspace chips */}
            {workspaces.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => { setSelectedWsId(ws.id); setShowWsCreate(false); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      selectedWsId === ws.id
                        ? "border-accent-red text-text-primary bg-surface"
                        : "border-border text-text-muted hover:border-text-dim"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                    {ws.name}
                    {selectedWsId === ws.id && <Check size={10} className="text-accent-red" />}
                  </button>
                ))}
              </div>
            )}

            {/* Create workspace form */}
            {showWsCreate && (
              <div className="bg-bg-base border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">New Workspace</span>
                  {workspaces.length > 0 && (
                    <button onClick={() => { setShowWsCreate(false); setWsErr(null); }}
                      className="text-text-dim hover:text-text-muted transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <input
                  ref={wsInputRef}
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleWsCreate(); }
                  }}
                  placeholder="e.g. CVE Research"
                  className={input}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dim flex-shrink-0">Color:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {WS_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setWsColor(c)}
                        className="w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-110 ring-offset-1 ring-offset-bg-base"
                        style={{ backgroundColor: c, outline: wsColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                      />
                    ))}
                  </div>
                </div>
                {wsErr && <p className="text-xs text-accent-red">{wsErr}</p>}
                <button
                  onClick={handleWsCreate}
                  className="w-full py-1.5 rounded bg-accent-red hover:opacity-90 text-white text-xs font-medium transition-opacity"
                >
                  Create Workspace
                </button>
              </div>
            )}

            {workspaces.length === 0 && !showWsCreate && (
              <p className="text-xs text-text-dim">No workspaces yet. Create one above.</p>
            )}
          </div>

          {/* ═══════════════════════════════════ PROJECT ══════════════════════ */}
          <div className="px-6 py-5">
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest block mb-4">Project</span>

            {/* New project form */}
            <form onSubmit={handleCreateProject} className="space-y-3 mb-5">
              <div>
                <label className={label}>New Project</label>
                <input
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. heap_spray_cve_2024"
                  className={input}
                />
              </div>
              <input
                type="text"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Description (optional)"
                className={input}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Target OS</label>
                  <select value={targetOs} onChange={(e) => setTargetOs(e.target.value as TargetOS)}
                    className={`${input} cursor-pointer`}>
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                    <option value="macos">macOS</option>
                    <option value="android">Android</option>
                    <option value="freebsd">FreeBSD</option>
                    <option value="solaris">Solaris</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Architecture</label>
                  <select value={targetArch} onChange={(e) => setTargetArch(e.target.value as TargetArch)}
                    className={`${input} cursor-pointer`}>
                    <option value="x64">x64</option>
                    <option value="x86">x86</option>
                    <option value="arm64">arm64</option>
                    <option value="arm">arm</option>
                    <option value="mips">mips</option>
                  </select>
                </div>
              </div>
              {projErr && <p className="text-xs text-accent-red">{projErr}</p>}
              <button
                type="submit"
                disabled={creating || !projName.trim()}
                className="w-full py-2 rounded bg-accent-red hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-opacity"
              >
                {creating ? "Creating…" : "Create Project"}
              </button>
            </form>

            {/* Recent projects */}
            {recents.length > 0 && (
              <div>
                <p className={`${label} mb-2`}>Recent Projects</p>
                <div className="flex flex-col gap-1">
                  {recents.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleOpenRecent(p)}
                      className="flex items-center gap-3 px-3 py-2 rounded border border-border hover:border-accent-red/50 hover:bg-surface text-left transition-colors group"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-text-primary group-hover:text-accent-red transition-colors truncate">{p.name}</span>
                        {p.description && <span className="block text-[10px] text-text-dim truncate">{p.description}</span>}
                      </span>
                      <span className="text-[10px] text-text-dim flex-shrink-0">{p.target_os}/{p.target_arch}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border flex-shrink-0 text-center">
          <button
            onClick={handleSkip}
            className="text-xs text-text-dim hover:text-text-muted underline underline-offset-2 transition-colors"
          >
            Continue without a project
          </button>
        </div>
      </div>
    </div>
  );
}

export { BINARY_EXTS };
