import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Hammer, Play, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { EditorTab } from "../../store";
import { useAppStore } from "../../store";

// ── Build config per language ─────────────────────────────────────────────────

type BuildMode = "file" | "makefile" | "folder";

interface LangConfig {
  canRun:     boolean;
  canCompile: boolean;
  canClean:   boolean;
  label:      string;
  exts:       string[];
  compileFile:  (src: string, out: string) => string;
  compileFolder:(dir: string, out: string) => string;
  runCmd:       (out: string) => string;
  cleanCmd?:    (out: string) => string;
}

const tmpDir = "/tmp/nullforge";

const LANG: Partial<Record<string, LangConfig>> = {
  python: {
    canRun: true, canCompile: false, canClean: false,
    label: "Python", exts: ["py"],
    compileFile:  (src) => `python3 -m py_compile "${src}" && echo "Syntax OK"`,
    compileFolder:(dir) => `find "${dir}" -name "*.py" -exec python3 -m py_compile {} \\; && echo "Syntax OK"`,
    runCmd:       (src) => `python3 "${src}"`,
  },
  c: {
    canRun: true, canCompile: true, canClean: true,
    label: "C", exts: ["c", "h"],
    compileFile:  (src, out) => `gcc -g -Wall "${src}" -o "${out}"`,
    compileFolder:(dir, out) => `gcc -g -Wall "${dir}"/*.c -o "${out}"`,
    runCmd:       (out) => `"${out}"`,
    cleanCmd:     (out) => `rm -f "${out}"`,
  },
  cpp: {
    canRun: true, canCompile: true, canClean: true,
    label: "C++", exts: ["cpp", "cc", "cxx", "hpp"],
    compileFile:  (src, out) => `g++ -g -Wall "${src}" -o "${out}"`,
    compileFolder:(dir, out) => `g++ -g -Wall "${dir}"/*.cpp "${dir}"/*.cc 2>/dev/null "${dir}"/*.cxx 2>/dev/null -o "${out}" 2>&1 | grep -v "No such file"`,
    runCmd:       (out) => `"${out}"`,
    cleanCmd:     (out) => `rm -f "${out}"`,
  },
  rust: {
    canRun: true, canCompile: true, canClean: true,
    label: "Rust", exts: ["rs"],
    compileFile:  (src, out) => `rustc "${src}" -o "${out}"`,
    compileFolder:(dir, out) => `cd "${dir}" && cargo build 2>&1 || rustc "${dir}"/main.rs -o "${out}"`,
    runCmd:       (out) => `"${out}"`,
    cleanCmd:     (out) => `rm -f "${out}"`,
  },
  asm: {
    canRun: true, canCompile: true, canClean: true,
    label: "ASM", exts: ["asm", "s"],
    compileFile:  (src, out) => {
      const obj = out + ".o";
      return `nasm -f elf64 "${src}" -o "${obj}" && ld "${obj}" -o "${out}"`;
    },
    compileFolder:(dir, out) => {
      const obj = out + ".o";
      return `nasm -f elf64 "${dir}"/*.asm -o "${obj}" && ld "${obj}" -o "${out}"`;
    },
    runCmd:       (out) => `"${out}"`,
    cleanCmd:     (out) => `rm -f "${out}" "${out}.o"`,
  },
  nasm: {
    canRun: true, canCompile: true, canClean: true,
    label: "NASM", exts: ["nasm"],
    compileFile:  (src, out) => {
      const obj = out + ".o";
      return `nasm -f elf64 "${src}" -o "${obj}" && ld "${obj}" -o "${out}"`;
    },
    compileFolder:(dir, out) => {
      const obj = out + ".o";
      return `nasm -f elf64 "${dir}"/*.nasm -o "${obj}" && ld "${obj}" -o "${out}"`;
    },
    runCmd:       (out) => `"${out}"`,
    cleanCmd:     (out) => `rm -f "${out}" "${out}.o"`,
  },
  bash: {
    canRun: true, canCompile: false, canClean: false,
    label: "Shell", exts: ["sh"],
    compileFile:  (src) => `bash -n "${src}" && echo "Syntax OK"`,
    compileFolder:(dir) => `for f in "${dir}"/*.sh; do bash -n "$f" && echo "OK: $f"; done`,
    runCmd:       (src) => `bash "${src}"`,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  window.dispatchEvent(new CustomEvent("nullforge:output-log", { detail: { text: msg } }));
}

function openOutput() {
  useAppStore.getState().setBottomPanelOpen(true);
  useAppStore.getState().setActiveBottomTab("output");
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  tab: EditorTab;
}

export function EditorToolbar({ tab }: EditorToolbarProps) {
  const [busy, setBusy] = useState<"run" | "compile" | "rebuild" | "clean" | null>(null);
  const [buildMode, setBuildMode] = useState<BuildMode>("file");
  const [customSrc, setCustomSrc] = useState<string>("");
  const [showSrcInput, setShowSrcInput] = useState(false);
  const srcInputRef = useRef<HTMLInputElement>(null);

  const cfg = LANG[tab.language];
  if (!cfg) return null;
  const langCfg = cfg;

  const base = tab.name.replace(/\.[^.]+$/, "");
  const outPath = `${tmpDir}/${base}`;

  async function ensureTmpDir() {
    await invoke("shell_run_command", { command: `mkdir -p ${tmpDir}` });
  }

  async function saveCurrentTab(): Promise<string> {
    await ensureTmpDir();
    const path = `${tmpDir}/${tab.name}`;
    await invoke("save_text_file", { path, content: tab.content });
    return path;
  }

  // Determine effective source path/dir based on build mode
  async function getSource(): Promise<string> {
    if (customSrc.trim()) return customSrc.trim();
    return saveCurrentTab();
  }

  async function execCmd(label: string, cmd: string) {
    openOutput();
    log(`[${label}] $ ${cmd}`);
    try {
      const out = await invoke<string>("shell_run_command", { command: cmd });
      if (out.trim()) log(out.trim());
      log(`[${label}] ✓ Done`);
    } catch (err) {
      log(`[${label}] ✗ ${err}`);
    }
  }

  function buildCompileCmd(src: string): string {
    if (buildMode === "makefile") {
      const dir = src.includes("/") ? src.split("/").slice(0, -1).join("/") : ".";
      return `make -C "${dir}"`;
    }
    if (buildMode === "folder") {
      const dir = src.includes("/") ? src.split("/").slice(0, -1).join("/") : ".";
      return langCfg.compileFolder(dir, outPath);
    }
    return langCfg.compileFile(src, outPath);
  }

  async function handleRun() {
    if (!langCfg.canRun) return;
    setBusy("run");
    try {
      await ensureTmpDir();
      if (buildMode === "file" && !customSrc.trim()) {
        const path = await saveCurrentTab();
        await execCmd("RUN", langCfg.runCmd(path));
      } else {
        await execCmd("RUN", langCfg.runCmd(outPath));
      }
    } finally { setBusy(null); }
  }

  async function handleCompile() {
    setBusy("compile");
    try {
      const src = await getSource();
      await execCmd("COMPILE", buildCompileCmd(src));
    } finally { setBusy(null); }
  }

  async function handleRebuild() {
    setBusy("rebuild");
    try {
      const src = await getSource();
      if (langCfg.cleanCmd) await execCmd("CLEAN", langCfg.cleanCmd(outPath));
      await execCmd("BUILD", buildCompileCmd(src));
    } finally { setBusy(null); }
  }

  async function handleClean() {
    if (!langCfg.cleanCmd) return;
    setBusy("clean");
    try {
      await execCmd("CLEAN", langCfg.cleanCmd(outPath));
    } finally { setBusy(null); }
  }

  async function handleBrowse() {
    const lastDir = localStorage.getItem("nullforge_last_dir_build") || undefined;
    const selected = await openDialog({
      multiple: false,
      defaultPath: lastDir,
    }).catch(() => null);
    if (typeof selected === "string" && selected) {
      const dir = selected.includes("/")
        ? selected.split("/").slice(0, -1).join("/")
        : ".";
      localStorage.setItem("nullforge_last_dir_build", dir);
      setCustomSrc(selected);
      // Auto-detect makefile
      if (selected.toLowerCase().endsWith("makefile") || selected.toLowerCase().endsWith("cmakelists.txt")) {
        setBuildMode("makefile");
      }
    }
  }

  const btnBase = "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const idle    = "border-border text-text-muted hover:border-accent-green hover:text-accent-green cursor-pointer";
  const running = "border-border text-text-dim animate-pulse cursor-wait";

  function Btn({
    label, icon, onClick, kind, show = true,
  }: {
    label: string; icon: React.ReactNode; onClick: () => void;
    kind: typeof busy; show?: boolean;
  }) {
    if (!show) return null;
    const active = busy === kind;
    return (
      <button
        onClick={onClick}
        disabled={!!busy}
        className={`${btnBase} ${active ? running : idle}`}
        title={label}
      >
        {icon}
        <span>{active ? "…" : label}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 h-7 bg-surface border-b border-border flex-shrink-0 overflow-x-auto">
      <span className="text-[10px] text-text-dim font-mono mr-1 flex-shrink-0">{langCfg.label}</span>

      {/* Build mode selector */}
      <select
        value={buildMode}
        onChange={(e) => setBuildMode(e.target.value as BuildMode)}
        disabled={!!busy}
        className="text-[10px] bg-elevated border border-border rounded px-1 py-0.5 text-text-muted focus:outline-none focus:border-accent-green cursor-pointer mr-1 flex-shrink-0"
        title="Build mode"
      >
        <option value="file">This File</option>
        <option value="folder">Folder (*.{langCfg.exts[0]})</option>
        <option value="makefile">Makefile</option>
      </select>

      {/* Source path display / browse */}
      {customSrc ? (
        <button
          onClick={() => setCustomSrc("")}
          className="text-[10px] text-accent-blue border border-accent-blue/40 rounded px-1.5 py-0.5 max-w-[120px] truncate hover:text-accent-red transition-colors flex-shrink-0"
          title={`Source: ${customSrc} — click to reset to current tab`}
        >
          {customSrc.split("/").pop()}
        </button>
      ) : (
        <span className="text-[10px] text-text-dim flex-shrink-0 max-w-[80px] truncate" title={tab.name}>
          {tab.name}
        </span>
      )}

      <button
        onClick={handleBrowse}
        disabled={!!busy}
        title="Browse source file / Makefile"
        className={`${btnBase} ${idle} flex-shrink-0`}
      >
        <FolderOpen size={10} />
      </button>

      <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />

      <Btn label="Run"     icon={<Play      size={10} />} onClick={handleRun}     kind="run"     show={langCfg.canRun} />
      <Btn label="Compile" icon={<Hammer    size={10} />} onClick={handleCompile} kind="compile" show={langCfg.canCompile} />
      <Btn label="Rebuild" icon={<RotateCcw size={10} />} onClick={handleRebuild} kind="rebuild" show={langCfg.canCompile} />
      <Btn label="Clean"   icon={<Trash2    size={10} />} onClick={handleClean}   kind="clean"   show={!!langCfg.cleanCmd} />
    </div>
  );
}
