import { Trash2 } from "lucide-react";
import { useState } from "react";

export interface WatchExpression {
  id: string;
  expr: string;
  value: string;
}

interface WatchExpressionsProps {
  watches: WatchExpression[];
  sessionId: string | null;
  onCommand: (cmd: string) => void;
  onWatchesChange: (watches: WatchExpression[]) => void;
}

let watchCounter = 0;

export function WatchExpressions({
  watches,
  sessionId,
  onCommand,
  onWatchesChange,
}: WatchExpressionsProps) {
  const [input, setInput] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const expr = input.trim();
    if (!expr) return;
    watchCounter += 1;
    const id = `watch-${watchCounter}`;
    onWatchesChange([...watches, { id, expr, value: "..." }]);
    if (sessionId) {
      onCommand(`-var-create ${id} * ${expr}`);
    }
    setInput("");
  };

  const handleDelete = (w: WatchExpression) => {
    onWatchesChange(watches.filter((x) => x.id !== w.id));
    if (sessionId) {
      onCommand(`-var-delete ${w.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base border-t border-border">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border bg-surface flex-shrink-0">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
          Watch
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {watches.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-1.5 px-2 py-1 border-b border-border/50 hover:bg-bg-elevated"
          >
            <span className="text-xs font-mono text-text-muted flex-shrink-0 truncate max-w-[40%]">
              {w.expr}
            </span>
            <span className="text-xs text-text-dim">=</span>
            <span className="text-xs font-mono text-accent-green flex-1 truncate">
              {w.value}
            </span>
            <button
              onClick={() => handleDelete(w)}
              className="text-text-dim hover:text-accent-red transition-colors flex-shrink-0"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Add expression */}
      <form
        onSubmit={handleAdd}
        className="flex gap-1 px-2 py-1 border-t border-border flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="expression..."
          className="flex-1 bg-bg-elevated border border-border rounded px-2 py-0.5 text-xs font-mono text-text-primary placeholder-text-dim focus:outline-none focus:border-accent-green"
        />
        <button
          type="submit"
          className="px-2 py-0.5 border border-border rounded text-xs font-mono text-text-muted hover:border-accent-green hover:text-accent-green transition-colors"
        >
          +
        </button>
      </form>
    </div>
  );
}
