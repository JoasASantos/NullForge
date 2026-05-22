interface RegistersPanelProps {
  registers: Record<string, string>;
  changedRegs: Set<string>;
}

const GPR_NAMES = [
  "rax", "rbx", "rcx", "rdx",
  "rsi", "rdi", "rbp", "rsp",
  "r8",  "r9",  "r10", "r11",
  "r12", "r13", "r14", "r15",
  "rip",
];

const FLAG_BITS: Array<{ name: string; bit: number }> = [
  { name: "CF", bit: 0 },
  { name: "PF", bit: 2 },
  { name: "AF", bit: 4 },
  { name: "ZF", bit: 6 },
  { name: "SF", bit: 7 },
  { name: "TF", bit: 8 },
  { name: "IF", bit: 9 },
  { name: "DF", bit: 10 },
  { name: "OF", bit: 11 },
];

function parseHex(val: string): number {
  if (!val) return 0;
  try {
    return parseInt(val.replace(/^0x/i, ""), 16);
  } catch {
    return 0;
  }
}

function formatHex(val: string): string {
  if (!val) return "0x????????????????";
  if (val.startsWith("0x") || val.startsWith("0X")) return val.toLowerCase();
  return `0x${val.toLowerCase()}`;
}

interface RegRowProps {
  name: string;
  value: string;
  changed: boolean;
}

function RegRow({ name, value, changed }: RegRowProps) {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-bg-elevated rounded">
      <span className="w-6 text-xs font-mono text-text-muted uppercase flex-shrink-0">
        {name}
      </span>
      <span
        className={`text-xs font-mono flex-1 truncate ${
          changed ? "text-accent-red" : "text-accent-green"
        }`}
      >
        {formatHex(value)}
      </span>
    </div>
  );
}

export function RegistersPanel({ registers, changedRegs }: RegistersPanelProps) {
  const rflagsVal = parseHex(registers["eflags"] || registers["rflags"] || "0");

  const hasRegs = Object.keys(registers).length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base border-r border-border">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border bg-surface flex-shrink-0">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
          Registers
        </span>
      </div>

      {!hasRegs ? (
        <div className="flex items-center justify-center flex-1 text-xs text-text-dim font-mono">
          No registers — start a session
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-1">
          {/* GPRs */}
          <div className="mb-1">
            <div className="px-1 py-0.5 text-xs font-mono text-text-dim uppercase tracking-wider">
              GPR
            </div>
            <div className="grid grid-cols-2 gap-0">
              {GPR_NAMES.map((name) => (
                <RegRow
                  key={name}
                  name={name}
                  value={registers[name] || ""}
                  changed={changedRegs.has(name)}
                />
              ))}
            </div>
          </div>

          {/* FLAGS */}
          <div>
            <div className="px-1 py-0.5 text-xs font-mono text-text-dim uppercase tracking-wider">
              FLAGS — {formatHex(registers["eflags"] || registers["rflags"] || "0")}
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {FLAG_BITS.map(({ name, bit }) => {
                const set = Boolean(rflagsVal & (1 << bit));
                return (
                  <div
                    key={name}
                    className={`px-1 py-0.5 rounded text-xs font-mono border ${
                      set
                        ? "border-accent-red text-accent-red bg-accent-red/10"
                        : "border-border text-text-dim"
                    }`}
                  >
                    {name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
