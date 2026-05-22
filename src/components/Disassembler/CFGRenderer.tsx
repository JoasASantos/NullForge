import { useEffect, useMemo, useRef, useState } from "react";
import type { DisasmInstruction } from "./DisasmView";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BasicBlock {
  id: string;
  startAddr: number;
  endAddr: number;
  instructions: DisasmInstruction[];
  succs: Array<{ targetId: string; kind: "fallthrough" | "jump" | "call" | "ret" }>;
}

interface BlockLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── CFG Builder ─────────────────────────────────────────────────────────────

function buildCFG(instructions: DisasmInstruction[]): BasicBlock[] {
  if (instructions.length === 0) return [];

  // Find all block-start addresses
  const leaders = new Set<number>();
  leaders.add(instructions[0].addr);
  for (let i = 0; i < instructions.length; i++) {
    const ins = instructions[i];
    if (ins.is_call || ins.is_jump || ins.is_ret) {
      if (i + 1 < instructions.length) leaders.add(instructions[i + 1].addr);
      // Try to parse target
      const m = ins.op_str.match(/0x([0-9a-fA-F]+)/);
      if (m) leaders.add(parseInt(m[1], 16));
    }
  }

  // Build blocks
  const addrToBlock = new Map<number, BasicBlock>();
  let current: BasicBlock | null = null;
  for (const ins of instructions) {
    if (leaders.has(ins.addr)) {
      if (current) {
        addrToBlock.set(current.startAddr, current);
      }
      current = {
        id: `block_${ins.addr.toString(16)}`,
        startAddr: ins.addr,
        endAddr: ins.addr,
        instructions: [],
        succs: [],
      };
    }
    if (current) {
      current.instructions.push(ins);
      current.endAddr = ins.addr;
    }
  }
  if (current) addrToBlock.set(current.startAddr, current);

  // Wire up successors
  const blocks = Array.from(addrToBlock.values());
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const last = block.instructions[block.instructions.length - 1];
    if (!last) continue;

    if (last.is_ret) {
      // terminal — no successors
      continue;
    }

    if (last.is_call) {
      // Calls: fallthrough to next block
      if (bi + 1 < blocks.length) {
        block.succs.push({ targetId: blocks[bi + 1].id, kind: "fallthrough" });
      }
      const m = last.op_str.match(/0x([0-9a-fA-F]+)/);
      if (m) {
        const target = parseInt(m[1], 16);
        const tb = addrToBlock.get(target);
        if (tb) block.succs.push({ targetId: tb.id, kind: "call" });
      }
      continue;
    }

    if (last.is_jump) {
      // Unconditional / conditional jump
      const m = last.op_str.match(/0x([0-9a-fA-F]+)/);
      if (m) {
        const target = parseInt(m[1], 16);
        const tb = addrToBlock.get(target);
        if (tb) block.succs.push({ targetId: tb.id, kind: "jump" });
      }
      // Conditional: also fallthrough
      const isConditional = /^j[^m]/i.test(last.mnemonic) && last.mnemonic.toLowerCase() !== "jmp";
      if (isConditional && bi + 1 < blocks.length) {
        block.succs.push({ targetId: blocks[bi + 1].id, kind: "fallthrough" });
      }
      continue;
    }

    // Normal instruction — fallthrough
    if (bi + 1 < blocks.length) {
      block.succs.push({ targetId: blocks[bi + 1].id, kind: "fallthrough" });
    }
  }

  return blocks;
}

// ─── Simple left-to-right layered layout ──────────────────────────────────────

const BLOCK_W = 280;
const BLOCK_PADDING = 12;
const LINE_H = 16;
const BLOCK_H_MIN = 40;
const HGAP = 60;
const VGAP = 40;

function layoutBlocks(blocks: BasicBlock[]): Map<string, BlockLayout> {
  const idToBlock = new Map(blocks.map((b) => [b.id, b]));
  const layout = new Map<string, BlockLayout>();

  // Assign layers via BFS
  const layer = new Map<string, number>();
  if (blocks.length === 0) return layout;
  layer.set(blocks[0].id, 0);
  const queue: string[] = [blocks[0].id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const block = idToBlock.get(id);
    if (!block) continue;
    const l = layer.get(id) ?? 0;
    for (const succ of block.succs) {
      if (!layer.has(succ.targetId)) {
        layer.set(succ.targetId, l + 1);
        queue.push(succ.targetId);
      }
    }
  }

  // Group by layer
  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }
  // Also add any blocks not reached by BFS into layer 0
  for (const b of blocks) {
    if (!layer.has(b.id)) {
      layer.set(b.id, 0);
      if (!byLayer.has(0)) byLayer.set(0, []);
      byLayer.get(0)!.push(b.id);
    }
  }

  const maxLayer = Math.max(...Array.from(layer.values()));
  let x = 20;
  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    let y = 20;
    let maxW = 0;
    for (const id of ids) {
      const block = idToBlock.get(id);
      if (!block) continue;
      const insCount = block.instructions.length;
      const h = Math.max(BLOCK_H_MIN, BLOCK_PADDING * 2 + insCount * LINE_H);
      layout.set(id, { id, x, y, width: BLOCK_W, height: h });
      y += h + VGAP;
      maxW = Math.max(maxW, BLOCK_W);
    }
    x += maxW + HGAP;
  }

  return layout;
}

// ─── Mnemonic colour (SVG fill) ───────────────────────────────────────────────

function mnemonicColor(ins: DisasmInstruction): string {
  if (ins.is_call) return "#e63946";
  if (ins.is_jump) return "#fbbf24";
  if (ins.is_ret) return "#c084fc";
  const m = ins.mnemonic.toLowerCase();
  if (m === "mov" || m === "movq" || m === "movl" || m === "lea") return "#60a5fa";
  return "#e2e8f0";
}

function edgeColor(kind: string): string {
  if (kind === "call") return "#e63946";
  if (kind === "jump") return "#fbbf24";
  if (kind === "ret") return "#c084fc";
  return "#4ade80"; // fallthrough
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CFGRendererProps {
  instructions: DisasmInstruction[];
  funcName: string;
}

export function CFGRenderer({ instructions, funcName }: CFGRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const blocks = useMemo(() => buildCFG(instructions), [instructions]);
  const layoutMap = useMemo(() => layoutBlocks(blocks), [blocks]);

  // Compute total SVG canvas size
  const { canvasW, canvasH } = useMemo(() => {
    let maxX = 0,
      maxY = 0;
    for (const l of layoutMap.values()) {
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    }
    return { canvasW: maxX + 40, canvasH: maxY + 40 };
  }, [layoutMap]);

  const fitToView = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  // Mouse pan
  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.2, s - e.deltaY * 0.001)));
  };

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-text-muted">
        No instructions to render
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border flex-shrink-0">
        <span className="font-mono text-xs text-accent-red">{funcName}</span>
        <span className="text-xs text-text-muted">— {blocks.length} blocks</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={fitToView}
            className="px-2 py-0.5 text-xs bg-elevated border border-border rounded hover:border-accent-red text-text-muted hover:text-text-primary transition-colors"
          >
            Fit
          </button>
          <span className="text-xs text-text-muted">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* SVG */}
      <div className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ userSelect: "none" }}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            {/* Edges */}
            {blocks.map((block) => {
              const from = layoutMap.get(block.id);
              if (!from) return null;
              return block.succs.map((succ) => {
                const to = layoutMap.get(succ.targetId);
                if (!to) return null;
                const x1 = from.x + from.width / 2;
                const y1 = from.y + from.height;
                const x2 = to.x + to.width / 2;
                const y2 = to.y;
                const midY = (y1 + y2) / 2;
                const color = edgeColor(succ.kind);
                const key = `${block.id}-${succ.targetId}-${succ.kind}`;
                return (
                  <g key={key}>
                    <defs>
                      <marker
                        id={`arrow-${succ.kind}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="3"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L0,6 L6,3 z" fill={color} />
                      </marker>
                    </defs>
                    <path
                      d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      strokeOpacity="0.7"
                      markerEnd={`url(#arrow-${succ.kind})`}
                    />
                  </g>
                );
              });
            })}

            {/* Blocks */}
            {blocks.map((block) => {
              const l = layoutMap.get(block.id);
              if (!l) return null;
              const isSelected = selectedBlock === block.id;
              return (
                <g
                  key={block.id}
                  onClick={() => setSelectedBlock(isSelected ? null : block.id)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    rx={4}
                    ry={4}
                    fill="#141720"
                    stroke={isSelected ? "#e63946" : "#1e2330"}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  {/* Block header */}
                  <text
                    x={l.x + BLOCK_PADDING}
                    y={l.y + BLOCK_PADDING + 4}
                    fontSize={9}
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {`0x${block.startAddr.toString(16)}`}
                  </text>
                  {/* Instructions */}
                  {block.instructions.map((ins, ii) => {
                    const iy = l.y + BLOCK_PADDING + 14 + ii * LINE_H;
                    return (
                      <g key={ins.addr}>
                        <text
                          x={l.x + BLOCK_PADDING}
                          y={iy + 4}
                          fontSize={9}
                          fill={mnemonicColor(ins)}
                          fontFamily="monospace"
                        >
                          {ins.mnemonic}
                        </text>
                        <text
                          x={l.x + BLOCK_PADDING + 52}
                          y={iy + 4}
                          fontSize={9}
                          fill="#94a3b8"
                          fontFamily="monospace"
                        >
                          {ins.op_str.length > 26 ? ins.op_str.slice(0, 26) + "…" : ins.op_str}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
