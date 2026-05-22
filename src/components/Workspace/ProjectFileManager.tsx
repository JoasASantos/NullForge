import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useAppStore } from "../../store";

// ── .nullforge project file format ────────────────────────────────────────────

export interface NullForgeFile {
  version: "1.0";
  exported_at: string;
  project?: {
    id: string;
    name: string;
    description: string;
    target_arch: string;
    target_os: string;
    created_at: string;
  };
  workspace?: {
    id: string;
    name: string;
    description: string;
    color: string;
    created_at: string;
  };
  editor_tabs: Array<{
    id: string;
    name: string;
    language: string;
    content: string;
  }>;
  ui_state?: {
    active_panel: string;
    bottom_panel_open: boolean;
    bottom_panel_height: number;
  };
}

interface Props {
  onClose: () => void;
}

type Status = "idle" | "success" | "error";

export function ProjectFileManager({ onClose }: Props) {
  const {
    currentProject,
    currentWorkspace,
    editorTabs,
    activePanel,
    bottomPanelOpen,
    bottomPanelHeight,
    openEditorTab,
    setCurrentProject,
    setCurrentWorkspace,
    setShowWorkspaceScreen,
  } = useAppStore();

  const [exportStatus, setExportStatus] = useState<Status>("idle");
  const [importStatus, setImportStatus] = useState<Status>("idle");
  const [exportMsg, setExportMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importContent, setImportContent] = useState("");

  // ── Export ──────────────────────────────────────────────────────────────────

  async function exportProject() {
    const data: NullForgeFile = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      project: currentProject ?? undefined,
      workspace: currentWorkspace ?? undefined,
      editor_tabs: editorTabs.map((t) => ({
        id: t.id,
        name: t.name,
        language: t.language,
        content: t.content,
      })),
      ui_state: {
        active_panel: activePanel,
        bottom_panel_open: bottomPanelOpen,
        bottom_panel_height: bottomPanelHeight,
      },
    };

    const json = JSON.stringify(data, null, 2);
    const defaultName = `${currentProject?.name ?? "project"}.nullforge`;

    try {
      const path = await invoke<string | null>("show_save_dialog", { defaultName });
      if (!path) return;

      const savePath = path.endsWith(".nullforge") ? path : path + ".nullforge";
      await invoke("save_text_file", { path: savePath, content: json });
      setExportMsg(`Saved to ${savePath}`);
      setExportStatus("success");
    } catch (e) {
      setExportMsg(String(e));
      setExportStatus("error");
    }

    setTimeout(() => setExportStatus("idle"), 3000);
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function importProject() {
    const content = importContent.trim();
    if (!content) {
      setImportMsg("Paste .nullforge JSON content above");
      setImportStatus("error");
      return;
    }

    try {
      const data: NullForgeFile = JSON.parse(content);
      if (data.version !== "1.0") {
        throw new Error(`Unknown version: ${data.version}`);
      }

      if (data.project) {
        setCurrentProject(data.project);
        setShowWorkspaceScreen(false);
      }
      if (data.workspace) {
        setCurrentWorkspace(data.workspace);
      }
      for (const tab of data.editor_tabs ?? []) {
        openEditorTab({ ...tab, dirty: false });
      }

      setImportMsg(`Imported: ${data.project?.name ?? "unknown"} (${data.editor_tabs.length} tabs)`);
      setImportStatus("success");
      setTimeout(onClose, 1500);
    } catch (e) {
      setImportMsg(`Parse error: ${e}`);
      setImportStatus("error");
    }
  }

  // ── Import from file path ───────────────────────────────────────────────────

  async function loadFromPath(path: string) {
    try {
      const content = await invoke<string>("read_text_file", { path });
      setImportContent(content);
      setImportMsg("Loaded — click Import to apply");
      setImportStatus("success");
    } catch (e) {
      setImportMsg(String(e));
      setImportStatus("error");
    }
  }

  const statusIcon = (s: Status, msg: string) => {
    if (s === "success") return <span className="flex items-center gap-1 text-accent-green text-[10px]"><CheckCircle size={11} /> {msg}</span>;
    if (s === "error")   return <span className="flex items-center gap-1 text-red-400 text-[10px]"><AlertCircle size={11} /> {msg}</span>;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Project File (.nullforge)</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Export */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Download size={12} className="text-accent-red" /> Export Project
            </h3>
            <p className="text-xs text-text-muted">
              Save the current workspace, project, and all open editor tabs to a <code className="bg-elevated px-1 rounded">.nullforge</code> file.
            </p>
            {currentProject ? (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-surface rounded border border-border text-xs text-text-muted">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                {currentProject.name} ({editorTabs.length} open tabs)
              </div>
            ) : (
              <div className="text-xs text-text-dim italic">No project open</div>
            )}
            <button
              onClick={exportProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-red hover:bg-accent-red/80 text-white text-xs font-medium transition-colors"
            >
              <Download size={11} /> Export as .nullforge
            </button>
            {statusIcon(exportStatus, exportMsg)}
          </div>

          <div className="border-t border-border" />

          {/* Import */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Upload size={12} className="text-accent-red" /> Import Project
            </h3>
            <p className="text-xs text-text-muted">
              Paste a .nullforge file path or JSON content to restore a project.
            </p>

            {/* Path input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/path/to/project.nullforge"
                className="flex-1 bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadFromPath((e.target as HTMLInputElement).value.trim());
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  loadFromPath(input.value.trim());
                }}
                className="px-3 py-1.5 rounded bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-red text-xs transition-colors flex-shrink-0"
              >
                Load
              </button>
            </div>

            <textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder="Or paste .nullforge JSON here…"
              rows={5}
              className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={importProject}
                disabled={!importContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-red hover:bg-accent-red/80 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Upload size={11} /> Import Project
              </button>
              {statusIcon(importStatus, importMsg)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
