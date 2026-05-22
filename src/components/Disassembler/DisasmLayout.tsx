import { useEffect, useRef, useState } from "react";
import { DisasmSidePanel } from "./DisasmSidePanel";
import { DisasmView, type BinaryInfo, type DisasmInstruction } from "./DisasmView";

interface DisasmViewEvent {
  binaryInfo: BinaryInfo | null;
  instructions: DisasmInstruction[] | null;
  funcName: string | null;
}

export function DisasmLayout() {
  const [viewState, setViewState] = useState<DisasmViewEvent>({
    binaryInfo: null,
    instructions: null,
    funcName: null,
  });

  const [sideWidth, setSideWidth] = useState(260);
  const dragRef = useRef<{ start: number; base: number } | null>(null);

  // Listen for binary/shellcode loaded by the side panel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DisasmViewEvent>).detail;
      if (detail) setViewState(detail);
    };
    window.addEventListener("nullforge:open-disasm-view", handler);
    return () => window.removeEventListener("nullforge:open-disasm-view", handler);
  }, []);

  // Resize divider drag
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { start: e.clientX, base: sideWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.start;
      setSideWidth(Math.max(200, Math.min(420, dragRef.current.base + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Side panel */}
      <div className="flex flex-col overflow-hidden flex-shrink-0 bg-surface border-r border-border"
           style={{ width: sideWidth }}>
        <DisasmSidePanel />
      </div>

      {/* Resize handle */}
      <div
        className="w-1 flex-shrink-0 cursor-col-resize hover:bg-accent-red/40 transition-colors"
        onMouseDown={startDrag}
      />

      {/* Main disasm view */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <DisasmView
          instructions={viewState.instructions ?? []}
          binaryInfo={viewState.binaryInfo ?? undefined}
          funcName={viewState.funcName ?? undefined}
        />
      </div>
    </div>
  );
}
