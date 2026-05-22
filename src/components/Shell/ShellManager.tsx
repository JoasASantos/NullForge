import { Plus, X } from "lucide-react";
import { useCallback } from "react";
import { useAppStore } from "../../store";
import { ShellTab } from "./ShellTab";

let sessionCounter = 0;

export function ShellManager() {
  const { shellSessions, activeShellId, addShellSession, removeShellSession, setActiveShell } =
    useAppStore();

  const newSession = useCallback(() => {
    sessionCounter += 1;
    const id = `shell-${Date.now()}-${sessionCounter}`;
    addShellSession({ id, name: `bash`, type: "local", active: true });
  }, [addShellSession]);

  return (
    <div className="flex flex-col h-full">
      {/* Shell tab bar */}
      <div className="flex items-center bg-surface border-b border-border h-8 flex-shrink-0 overflow-x-auto">
        {shellSessions.map((sess) => (
          <div
            key={sess.id}
            onClick={() => setActiveShell(sess.id)}
            className={`
              flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-border text-xs flex-shrink-0
              transition-colors duration-100
              ${
                activeShellId === sess.id
                  ? "bg-bg-base text-accent-green"
                  : "text-text-muted hover:text-text-primary"
              }
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeShellId === sess.id ? "bg-accent-green" : "bg-text-muted"}`} />
            <span>{sess.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeShellSession(sess.id); }}
              className="ml-1 text-text-muted hover:text-text-primary rounded"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          onClick={newSession}
          title="New Shell Session"
          className="px-2 h-full flex items-center text-text-muted hover:text-text-primary transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Terminals */}
      <div className="flex-1 relative overflow-hidden bg-bg-base">
        {shellSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-xs text-text-muted">No shell sessions.</p>
            <button
              onClick={newSession}
              className="text-xs bg-elevated border border-border rounded px-3 py-1.5 text-text-primary hover:border-accent-green transition-colors"
            >
              + New Shell
            </button>
          </div>
        ) : (
          shellSessions.map((sess) => (
            <ShellTab
              key={sess.id}
              sessionId={sess.id}
              active={sess.id === activeShellId}
            />
          ))
        )}
      </div>
    </div>
  );
}
