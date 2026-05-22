import { Trash2 } from "lucide-react";
import { useState } from "react";

export interface Breakpoint {
  id: string;
  addr: string;
  file?: string;
  line?: number;
  enabled: boolean;
  hitCount: number;
}

interface BreakpointManagerProps {
  breakpoints: Breakpoint[];
  sessionId: string | null;
  onCommand: (cmd: string) => void;
  onBreakpointsChange: (bps: Breakpoint[]) => void;
}

export function BreakpointManager({
  breakpoints,
  sessionId,
  onCommand,
  onBreakpointsChange,
}: BreakpointManagerProps) {
  const [newLocation, setNewLocation] = useState("");
  const [adding, setAdding] = useState(false);

  const sendCmd = (cmd: string) => {
    if (sessionId) onCommand(cmd);
  };

  const handleToggle = (bp: Breakpoint) => {
    if (bp.enabled) {
      sendCmd(`-break-disable ${bp.id}`);
    } else {
      sendCmd(`-break-enable ${bp.id}`);
    }
    onBreakpointsChange(
      breakpoints.map((b) =>
        b.id === bp.id ? { ...b, enabled: !b.enabled } : b
      )
    );
  };

  const handleDelete = (bp: Breakpoint) => {
    sendCmd(`-break-delete ${bp.id}`);
    onBreakpointsChange(breakpoints.filter((b) => b.id !== bp.id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const loc = newLocation.trim();
    if (!loc) return;
    sendCmd(`-break-insert ${loc}`);
    setNewLocation("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border bg-surface flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
          Breakpoints
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs font-mono text-text-dim hover:text-accent-green transition-colors px-1"
          title="Add breakpoint"
        >
          + Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form
          onSubmit={handleAdd}
          className="flex gap-1 px-2 py-1 border-b border-border flex-shrink-0"
        >
          <input
            autoFocus
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="addr or file:line or func"
            className="flex-1 bg-bg-elevated border border-border rounded px-2 py-0.5 text-xs font-mono text-text-primary placeholder-text-dim focus:outline-none focus:border-accent-green"
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-accent-green text-bg-base rounded text-xs font-mono hover:opacity-80"
          >
            Set
          </button>
        </form>
      )}

      {/* List */}
      {breakpoints.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-xs text-text-dim font-mono">
          No breakpoints
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {breakpoints.map((bp) => {
            const location =
              bp.file && bp.line != null
                ? `${bp.file}:${bp.line}`
                : bp.addr;
            return (
              <div
                key={bp.id}
                className="flex items-center gap-1.5 px-2 py-1 border-b border-border/50 hover:bg-bg-elevated transition-colors"
              >
                {/* Enable checkbox */}
                <input
                  type="checkbox"
                  checked={bp.enabled}
                  onChange={() => handleToggle(bp)}
                  className="accent-accent-red flex-shrink-0 cursor-pointer"
                />

                {/* Location */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-xs font-mono truncate block ${
                      bp.enabled ? "text-accent-red" : "text-text-dim"
                    }`}
                  >
                    {location}
                  </span>
                </div>

                {/* Hit count */}
                <span className="text-xs font-mono text-text-dim flex-shrink-0">
                  {bp.hitCount > 0 ? `×${bp.hitCount}` : ""}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(bp)}
                  className="text-text-dim hover:text-accent-red transition-colors flex-shrink-0"
                  title="Remove breakpoint"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
