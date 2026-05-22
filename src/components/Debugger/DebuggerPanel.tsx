import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BreakpointManager, type Breakpoint } from "./BreakpointManager";
import { CallStack, type StackFrame } from "./CallStack";
import { DebuggerControls } from "./DebuggerControls";
import { HeapVisualizer } from "./HeapVisualizer";
import { MemoryMap } from "./MemoryMap";
import { MemoryViewer } from "./MemoryViewer";
import { RegistersPanel } from "./RegistersPanel";
import { StackVisualizer } from "./StackVisualizer";
import { WatchExpressions, type WatchExpression } from "./WatchExpressions";

type DebugStatus = "idle" | "running" | "stopped" | "error";

// ── MI output parsers ────────────────────────────────────────────────────────

/**
 * Parse a flat key=value GDB MI result string into a Record.
 * Does NOT handle nested tuples fully – just extracts top-level string values.
 */
function parseMIValues(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match: key="value"
  const re = /(\w[\w-]*)="([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    result[m[1]] = m[2];
  }
  return result;
}

/**
 * Parse register-names list: [name, name, ...]
 */
function parseRegisterNames(line: string): string[] {
  const m = line.match(/register-names=\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(",").map((s) => s.replace(/"/g, "").trim());
}

/**
 * Parse register-values list: [{number="N",value="V"}, ...]
 */
function parseRegisterValues(
  line: string,
  names: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /\{number="(\d+)",value="([^"]*)"\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const idx = parseInt(m[1], 10);
    if (idx < names.length && names[idx]) {
      result[names[idx]] = m[2];
    }
  }
  return result;
}

/**
 * Parse stack frames list: [{level="N",addr="X",func="f",file="f",line="L"}, ...]
 */
function parseStackFrames(line: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const re =
    /\{level="(\d+)",addr="([^"]*)"(?:,func="([^"]*)")?(?:.*?file="([^"]*)")?(?:.*?line="(\d+)")?\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    frames.push({
      level: parseInt(m[1], 10),
      addr: m[2],
      func: m[3] || "??",
      file: m[4],
      line: m[5] ? parseInt(m[5], 10) : undefined,
    });
  }
  return frames;
}

/**
 * Parse breakpoint from =breakpoint-created or ^done,bkpt={...}
 */
function parseBreakpoint(line: string): Breakpoint | null {
  const m = line.match(
    /bkpt=\{number="(\d+)"[^}]*addr="([^"]*)"(?:.*?file="([^"]*)")?(?:.*?line="(\d+)")?(?:.*?enabled="([^"]*)")?(?:.*?times="(\d+)")?/
  );
  if (!m) return null;
  return {
    id: m[1],
    addr: m[2],
    file: m[3],
    line: m[4] ? parseInt(m[4], 10) : undefined,
    enabled: m[5] !== "n",
    hitCount: m[6] ? parseInt(m[6], 10) : 0,
  };
}

/**
 * Parse memory bytes from ^done,memory=[{...}]
 */
function parseMemoryBytes(line: string): { addr: string; bytes: Uint8Array } | null {
  const addrM = line.match(/begin="([^"]+)"/);
  const contentsM = line.match(/contents="([0-9a-fA-F]*)"/);
  if (!addrM || !contentsM) return null;
  const hex = contentsM[1];
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { addr: addrM[1], bytes: arr };
}

// ── Single session component ──────────────────────────────────────────────────

type DebugView = "registers" | "heap" | "stack" | "memmap";

let sessionSeq = 0;

function SingleDebugSession() {
  const [debugView, setDebugView] = useState<DebugView>("registers");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<DebugStatus>("idle");
  const [binaryPath, setBinaryPath] = useState("");
  const [output, setOutput] = useState<string[]>([]);

  // Registers
  const [registers, setRegisters] = useState<Record<string, string>>({});
  const [prevRegisters, setPrevRegisters] = useState<Record<string, string>>({});
  const [changedRegs, setChangedRegs] = useState<Set<string>>(new Set());
  const regNamesRef = useRef<string[]>([]);

  // Stack
  const [frames, setFrames] = useState<StackFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);

  // Breakpoints
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);

  // Memory
  const [memBytes, setMemBytes] = useState<Uint8Array | null>(null);
  const [memAddr, setMemAddr] = useState("0x0");

  // Watch
  const [watches, setWatches] = useState<WatchExpression[]>([]);

  const unlistenRef = useRef<UnlistenFn | null>(null);

  // ── MI line handler ──────────────────────────────────────────────────────
  const handleMILine = useCallback(
    (line: string) => {
      setOutput((prev) => [...prev.slice(-500), line]);

      // Running
      if (line.startsWith("*running")) {
        setStatus("running");
        return;
      }

      // Stopped
      if (line.startsWith("*stopped")) {
        setStatus("stopped");
        const vals = parseMIValues(line);
        // Request register values, stack frames, watch updates
        if (sessionId) {
          // Request all registers
          invoke("debugger_send_command", {
            sessionId,
            command: "-data-list-register-names",
          }).catch(() => {});
          invoke("debugger_send_command", {
            sessionId,
            command: "-data-list-register-values x",
          }).catch(() => {});
          invoke("debugger_send_command", {
            sessionId,
            command: "-stack-list-frames",
          }).catch(() => {});
        }
        // Suppress unused warning
        void vals;
        return;
      }

      // Terminated
      if (line.includes("*terminated") || line.includes("^exit")) {
        setStatus("idle");
        return;
      }

      // Register names response
      if (line.includes("register-names=")) {
        const names = parseRegisterNames(line);
        if (names.length > 0) regNamesRef.current = names;
        return;
      }

      // Register values response
      if (line.includes("register-values=") && regNamesRef.current.length > 0) {
        const vals = parseRegisterValues(line, regNamesRef.current);
        if (Object.keys(vals).length > 0) {
          setPrevRegisters(registers);
          const changed = new Set<string>();
          for (const [k, v] of Object.entries(vals)) {
            if (registers[k] !== undefined && registers[k] !== v) {
              changed.add(k);
            }
          }
          setChangedRegs(changed);
          setRegisters(vals);
        }
        return;
      }

      // Stack frames response
      if (line.includes("stack=[") || line.includes("frames=[")) {
        const parsed = parseStackFrames(line);
        if (parsed.length > 0) {
          setFrames(parsed);
          setSelectedFrame(0);
        }
        return;
      }

      // Breakpoint created/modified
      if (
        line.includes("=breakpoint-created") ||
        line.includes("=breakpoint-modified") ||
        (line.startsWith("^done") && line.includes("bkpt="))
      ) {
        const bp = parseBreakpoint(line);
        if (bp) {
          setBreakpoints((prev) => {
            const existing = prev.findIndex((b) => b.id === bp.id);
            if (existing >= 0) {
              const next = [...prev];
              next[existing] = bp;
              return next;
            }
            return [...prev, bp];
          });
        }
        return;
      }

      // Breakpoint deleted
      if (line.includes("=breakpoint-deleted")) {
        const m = line.match(/id="(\d+)"/);
        if (m) setBreakpoints((prev) => prev.filter((b) => b.id !== m[1]));
        return;
      }

      // Memory bytes
      if (line.startsWith("^done") && line.includes("memory=[")) {
        const mem = parseMemoryBytes(line);
        if (mem) {
          setMemAddr(mem.addr);
          setMemBytes(mem.bytes);
        }
        return;
      }

      // Watch variable update
      if (line.startsWith("^done") && line.includes("value=")) {
        const vals = parseMIValues(line);
        if (vals.value) {
          // Try to match to a watch by name in the line
          const nameM = line.match(/name="([^"]+)"/);
          if (nameM) {
            const wname = nameM[1];
            setWatches((prev) =>
              prev.map((w) =>
                w.id === wname ? { ...w, value: vals.value } : w
              )
            );
          }
        }
        return;
      }
    },
    [sessionId, registers]
  );

  // ── Event listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    listen<string>(`debugger-output-${sessionId}`, (ev) => {
      if (!cancelled) handleMILine(ev.payload);
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenRef.current = unlisten;
      }
    });

    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [sessionId, handleMILine]);

  // ── Cross-tool prompt ─────────────────────────────────────────────────────
  const [crossOpen, setCrossOpen] = useState<{ path: string } | null>(null);

  // Listen for "open in debugger" events dispatched by Disassembler
  useEffect(() => {
    const handler = (e: Event) => {
      const { binaryPath } = (e as CustomEvent<{ binaryPath: string }>).detail ?? {};
      if (binaryPath) handleLoadBinary(binaryPath);
    };
    window.addEventListener("nullforge:open-in-debugger", handler);
    return () => window.removeEventListener("nullforge:open-in-debugger", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLoadBinary = async (path: string) => {
    // Stop previous session if any
    if (sessionId) {
      await invoke("debugger_stop", { sessionId }).catch(() => {});
    }
    sessionSeq += 1;
    const newId = `dbg-${Date.now()}-${sessionSeq}`;
    setBinaryPath(path);
    setStatus("idle");
    setRegisters({});
    setChangedRegs(new Set());
    setFrames([]);
    setBreakpoints([]);
    setMemBytes(null);
    setOutput([]);
    regNamesRef.current = [];
    setCrossOpen(null);

    try {
      await invoke("debugger_start", {
        sessionId: newId,
        binaryPath: path,
        args: [],
      });
      setSessionId(newId);
      setStatus("stopped"); // GDB loaded but not yet running
      setCrossOpen({ path }); // offer to also open in disassembler
    } catch (err) {
      setStatus("error");
      setOutput([`[Error] ${err}`]);
    }
  };

  const handleCommand = useCallback(
    (cmd: string) => {
      if (!sessionId) return;
      invoke("debugger_send_command", { sessionId, command: cmd }).catch(() => {});
    },
    [sessionId]
  );

  const handleStop = useCallback(async () => {
    if (!sessionId) return;
    await invoke("debugger_stop", { sessionId }).catch(() => {});
    setSessionId(null);
    setStatus("idle");
    setRegisters({});
    setFrames([]);
    setBreakpoints([]);
    setMemBytes(null);
    setOutput([]);
  }, [sessionId]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      {/* Controls row */}
      <DebuggerControls
        status={status}
        binaryPath={binaryPath}
        onLoadBinary={handleLoadBinary}
        onCommand={handleCommand}
        onStop={handleStop}
      />

      {/* Cross-open prompt */}
      {crossOpen && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 border-b border-accent-blue/30 flex-shrink-0 text-xs">
          <span className="text-text-muted flex-1">Also open in Disassembler?</span>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("nullforge:open-in-disassembler", { detail: { binaryPath: crossOpen.path } }));
              setCrossOpen(null);
            }}
            className="px-2 py-0.5 rounded bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => setCrossOpen(null)}
            className="text-text-dim hover:text-text-muted transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View selector tabs */}
      <div className="flex items-center bg-surface border-b border-border flex-shrink-0">
        {(["registers", "heap", "stack", "memmap"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setDebugView(v)}
            className={`px-3 py-1.5 text-xs border-r border-border transition-colors ${
              debugView === v
                ? "text-text-primary bg-bg-base border-t-2 border-t-accent-red"
                : "text-text-muted hover:text-text-primary hover:bg-elevated"
            }`}
          >
            {v === "registers" ? "Registers" : v === "heap" ? "Heap" : v === "stack" ? "Stack" : "Memory Map"}
          </button>
        ))}
      </div>

      {/* Registers view */}
      {debugView === "registers" && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex flex-col overflow-hidden" style={{ flex: "0 0 40%" }}>
            <RegistersPanel registers={registers} changedRegs={changedRegs} />
          </div>
          <div className="flex flex-col overflow-hidden" style={{ flex: "0 0 30%" }}>
            <CallStack frames={frames} selectedLevel={selectedFrame} sessionId={sessionId} onSelectFrame={setSelectedFrame} />
          </div>
          <div className="flex flex-col overflow-hidden" style={{ flex: "0 0 30%" }}>
            <BreakpointManager breakpoints={breakpoints} sessionId={sessionId} onCommand={handleCommand} onBreakpointsChange={setBreakpoints} />
          </div>
        </div>
      )}

      {debugView === "heap" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <HeapVisualizer />
        </div>
      )}

      {debugView === "stack" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <StackVisualizer />
        </div>
      )}

      {debugView === "memmap" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <MemoryMap />
        </div>
      )}

      {/* Memory viewer + watch (shown only in registers view) */}
      {debugView === "registers" && (
        <>
          <MemoryViewer sessionId={sessionId} bytes={memBytes} baseAddress={memAddr} onAddressChange={setMemAddr} />
          <div className="flex-shrink-0" style={{ height: 100 }}>
            <WatchExpressions watches={watches} sessionId={sessionId} onCommand={handleCommand} onWatchesChange={setWatches} />
          </div>
        </>
      )}

      {/* Raw MI output console (collapsible debug view) */}
      <MIConsole output={output} />
    </div>
  );
}

// Lightweight scrolling MI output console
function MIConsole({ output }: { output: string[] }) {
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, open]);

  return (
    <div className="flex flex-col flex-shrink-0 border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-0.5 bg-surface text-xs font-mono text-text-dim hover:text-text-muted text-left"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>MI Output ({output.length} lines)</span>
      </button>
      {open && (
        <div className="h-24 overflow-y-auto bg-bg-base p-1">
          {output.map((line, i) => (
            <div
              key={i}
              className={`text-xs font-mono ${
                line.startsWith("*") || line.startsWith("^")
                  ? "text-accent-green"
                  : line.startsWith("&") || line.startsWith("~")
                  ? "text-text-dim"
                  : "text-text-muted"
              }`}
            >
              {line}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

// ── Multi-session DebuggerPanel ───────────────────────────────────────────────

interface Session {
  id: string;
  label: string;
}

let tabSeq = 0;

function makeSession(): Session {
  tabSeq += 1;
  return { id: `tab-${Date.now()}-${tabSeq}`, label: `Session ${tabSeq}` };
}

export function DebuggerPanel() {
  const [sessions, setSessions] = useState<Session[]>(() => [makeSession()]);
  const [activeId, setActiveId] = useState<string>(() => sessions[0].id);

  function addSession() {
    const s = makeSession();
    setSessions((prev) => [...prev, s]);
    setActiveId(s.id);
  }

  function removeSession(id: string) {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const s = makeSession();
        setActiveId(s.id);
        return [s];
      }
      if (activeId === id) {
        setActiveId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      {/* Session tabs */}
      <div className="flex items-center bg-surface border-b border-border flex-shrink-0 h-7">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group flex items-center gap-1 px-3 h-7 text-xs border-r border-border cursor-pointer flex-shrink-0 transition-colors ${
              activeId === s.id
                ? "bg-bg-base text-text-primary border-t-2 border-t-accent-red"
                : "text-text-muted hover:text-text-primary hover:bg-elevated"
            }`}
            onClick={() => setActiveId(s.id)}
          >
            <span>{s.label}</span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                className="text-text-dim hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addSession}
          title="New debugger session"
          className="px-2 h-7 text-text-dim hover:text-text-primary flex items-center flex-shrink-0 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Render each session, show only the active one */}
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex-1 overflow-hidden min-h-0"
          style={{ display: s.id === activeId ? "flex" : "none", flexDirection: "column" }}
        >
          <SingleDebugSession />
        </div>
      ))}
    </div>
  );
}
