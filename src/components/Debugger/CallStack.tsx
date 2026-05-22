import { invoke } from "@tauri-apps/api/core";

export interface StackFrame {
  level: number;
  func: string;
  file?: string;
  line?: number;
  addr: string;
}

interface CallStackProps {
  frames: StackFrame[];
  selectedLevel: number;
  sessionId: string | null;
  onSelectFrame: (level: number) => void;
}

export function CallStack({
  frames,
  selectedLevel,
  sessionId,
  onSelectFrame,
}: CallStackProps) {
  const handleSelectFrame = (level: number) => {
    onSelectFrame(level);
    if (sessionId) {
      invoke("debugger_send_command", {
        sessionId,
        command: `-stack-select-frame ${level}`,
      }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base border-r border-border">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border bg-surface flex-shrink-0">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
          Call Stack
        </span>
      </div>

      {frames.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-xs text-text-dim font-mono">
          No frames
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {frames.map((frame) => {
            const isSelected = frame.level === selectedLevel;
            const location =
              frame.file && frame.line != null
                ? `${frame.file}:${frame.line}`
                : frame.addr;
            return (
              <button
                key={frame.level}
                onClick={() => handleSelectFrame(frame.level)}
                className={`w-full text-left px-2 py-1 hover:bg-bg-elevated transition-colors border-b border-border/50 ${
                  isSelected ? "bg-bg-elevated border-l-2 border-l-accent-green" : ""
                }`}
              >
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xs font-mono flex-shrink-0 ${
                      isSelected ? "text-accent-green" : "text-text-dim"
                    }`}
                  >
                    #{frame.level}
                  </span>
                  <span
                    className={`text-xs font-mono truncate ${
                      isSelected ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {frame.func}()
                  </span>
                </div>
                <div className="text-xs font-mono text-text-dim truncate pl-5">
                  {location}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
