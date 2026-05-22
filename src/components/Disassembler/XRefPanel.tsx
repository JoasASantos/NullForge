import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import type { DisasmInstruction } from "./DisasmView";
import type { BinaryFunction } from "./FunctionNav";

interface XRefPanelProps {
  address: number | null;
  instructions: DisasmInstruction[];
  functions: BinaryFunction[];
}

interface XRef {
  sourceAddr: number;
  targetAddr: number;
  kind: "call" | "jump";
  sourceFnName: string;
}

function findFunctionForAddr(addr: number, functions: BinaryFunction[]): string {
  // Walk backwards through sorted functions to find the containing one
  const sorted = [...functions].sort((a, b) => a.addr - b.addr);
  let result = "<unknown>";
  for (const fn of sorted) {
    if (fn.addr <= addr) {
      result = fn.name;
    } else {
      break;
    }
  }
  return result;
}

/** Parse an operand string to extract a potential target address (hex immediate). */
function parseTargetAddr(op_str: string): number | null {
  // Capstone operands look like "0x400a20" or "400a20" for direct targets
  const m = op_str.match(/0x([0-9a-fA-F]+)/);
  if (m) return parseInt(m[1], 16);
  // bare hex without prefix (rare)
  const m2 = op_str.match(/^([0-9a-fA-F]{4,})$/);
  if (m2) return parseInt(m2[1], 16);
  return null;
}

export function XRefPanel({ address, instructions, functions }: XRefPanelProps) {
  const xrefs = useMemo<XRef[]>(() => {
    if (address === null) return [];
    return instructions
      .filter((i) => (i.is_call || i.is_jump) && parseTargetAddr(i.op_str) === address)
      .map((i) => ({
        sourceAddr: i.addr,
        targetAddr: address,
        kind: i.is_call ? "call" : "jump",
        sourceFnName: findFunctionForAddr(i.addr, functions),
      }));
  }, [address, instructions, functions]);

  if (address === null) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-text-muted">
        Click an instruction to see cross-references
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border flex-shrink-0">
        <span className="text-xs text-text-muted">
          XRefs to{" "}
          <span className="font-mono text-text-primary">
            0x{address.toString(16).padStart(8, "0")}
          </span>
          <span className="ml-2 text-text-muted">({xrefs.length} reference{xrefs.length !== 1 ? "s" : ""})</span>
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {xrefs.length === 0 ? (
          <div className="px-3 py-6 text-xs text-text-muted text-center">
            No cross-references found
          </div>
        ) : (
          xrefs.map((ref) => (
            <div
              key={ref.sourceAddr}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-elevated transition-colors"
            >
              <span
                className={`text-xs flex-shrink-0 font-semibold ${
                  ref.kind === "call" ? "text-accent-red" : "text-amber-400"
                }`}
              >
                {ref.kind}
              </span>
              <span className="font-mono text-xs text-text-muted flex-shrink-0">
                0x{ref.sourceAddr.toString(16).padStart(8, "0")}
              </span>
              <ArrowRight size={10} className="text-text-muted flex-shrink-0" />
              <span className="font-mono text-xs text-text-primary flex-shrink-0">
                0x{ref.targetAddr.toString(16).padStart(8, "0")}
              </span>
              <span className="text-xs text-text-muted truncate ml-auto">
                {ref.sourceFnName}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
