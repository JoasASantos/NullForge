import { AlertTriangle, ArrowDown } from "lucide-react";

export interface StackFrame {
  level: number;
  addr: number;
  func: string;
  file?: string;
  line?: number;
  ret_addr: number;
  canary?: number;
  canary_intact?: boolean;
  locals?: { name: string; value: string; type: string }[];
}

export interface StackVisualizerProps {
  frames?: StackFrame[];
  sp?: number;
  rsp_value?: number;
}

function addr(n: number) {
  return `0x${n.toString(16).padStart(16, "0")}`;
}

const DEMO_FRAMES: StackFrame[] = [
  {
    level: 0,
    addr: 0x7fff_e800_3f10,
    func: "vulnerable_read",
    file: "vuln.c",
    line: 42,
    ret_addr: 0x401234,
    canary: 0x3e1a9f2c8b4d0e7a,
    canary_intact: true,
    locals: [
      { name: "buf", value: "0x7fffe8003f10", type: "char[64]" },
      { name: "size", value: "256", type: "int" },
    ],
  },
  {
    level: 1,
    addr: 0x7fff_e800_3f60,
    func: "process_input",
    file: "vuln.c",
    line: 78,
    ret_addr: 0x401890,
    canary: 0x3e1a9f2c8b4d0e7a,
    canary_intact: false,
    locals: [
      { name: "conn", value: "0x5555552030a0", type: "Connection*" },
    ],
  },
  {
    level: 2,
    addr: 0x7fff_e800_3fb0,
    func: "handle_client",
    file: "server.c",
    line: 23,
    ret_addr: 0x402100,
    canary: 0x3e1a9f2c8b4d0e7a,
    canary_intact: true,
  },
  {
    level: 3,
    addr: 0x7fff_e800_4020,
    func: "main",
    file: "server.c",
    line: 10,
    ret_addr: 0x7fff_f7a32080,
    canary: undefined,
    canary_intact: true,
  },
];

export function StackVisualizer({ frames = DEMO_FRAMES, sp }: StackVisualizerProps) {
  const hasCorruptedCanary = frames.some((f) => f.canary !== undefined && f.canary_intact === false);

  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs">
      {/* Header */}
      {hasCorruptedCanary && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-red/10 border-b border-accent-red/30 flex-shrink-0">
          <AlertTriangle size={12} className="text-accent-red" />
          <span className="text-accent-red font-semibold">Stack canary corrupted — likely stack overflow</span>
        </div>
      )}

      {sp && (
        <div className="px-3 py-1 border-b border-border bg-surface flex items-center gap-2 flex-shrink-0">
          <span className="text-text-dim">RSP</span>
          <span className="font-mono text-accent-green">{addr(sp)}</span>
        </div>
      )}

      {/* Stack frames */}
      <div className="flex-1 p-2 space-y-1">
        {frames.map((frame, i) => (
          <div key={frame.level} className="group">
            <div className={`rounded border px-2 py-1.5 ${
              frame.canary_intact === false
                ? "border-accent-red/50 bg-accent-red/5"
                : "border-border bg-surface"
            }`}>
              {/* Frame header */}
              <div className="flex items-center gap-2">
                <span className="text-text-dim w-5 flex-shrink-0">#{frame.level}</span>
                <span className="font-mono text-text-muted flex-shrink-0 w-36 truncate">{addr(frame.addr)}</span>
                <span className="font-mono text-accent-red flex-1 truncate">{frame.func}</span>
                {frame.file && (
                  <span className="text-text-dim truncate max-w-[120px]">
                    {frame.file}:{frame.line}
                  </span>
                )}
              </div>

              {/* Ret address */}
              <div className="flex items-center gap-2 mt-0.5 pl-5">
                <span className="text-text-dim">ret →</span>
                <span className="font-mono text-blue-400">{addr(frame.ret_addr)}</span>
              </div>

              {/* Canary */}
              {frame.canary !== undefined && (
                <div className="flex items-center gap-2 mt-0.5 pl-5">
                  <span className={frame.canary_intact ? "text-accent-green" : "text-accent-red"}>
                    canary
                  </span>
                  <span className="font-mono text-text-muted">
                    0x{frame.canary.toString(16).padStart(16, "0")}
                  </span>
                  {!frame.canary_intact && (
                    <span className="text-accent-red font-semibold">CORRUPTED</span>
                  )}
                </div>
              )}

              {/* Locals */}
              {frame.locals && frame.locals.length > 0 && (
                <div className="mt-1 pl-5 space-y-px">
                  {frame.locals.map((loc) => (
                    <div key={loc.name} className="flex items-center gap-2 text-[10px]">
                      <span className="text-text-dim">{loc.type}</span>
                      <span className="text-blue-300">{loc.name}</span>
                      <span className="text-text-dim">=</span>
                      <span className="font-mono text-text-muted">{loc.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Arrow between frames */}
            {i < frames.length - 1 && (
              <div className="flex items-center justify-center py-px text-text-dim">
                <ArrowDown size={10} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
