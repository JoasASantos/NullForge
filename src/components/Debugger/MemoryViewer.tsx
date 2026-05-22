import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface MemoryViewerProps {
  sessionId: string | null;
  bytes: Uint8Array | null;
  baseAddress: string;
  onAddressChange: (addr: string) => void;
}

const BYTES_PER_ROW = 16;
const HALF = BYTES_PER_ROW / 2;

function byteClass(b: number): string {
  if (b === 0x00) return "text-text-dim";
  if (b === 0x90) return "text-accent-blue";
  if (
    (b >= 0x41 && b <= 0x5a) ||
    (b >= 0x61 && b <= 0x7a)
  )
    return "text-accent-green";
  return "text-text-muted";
}

function toAscii(b: number): string {
  return b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".";
}

function formatAddr(base: bigint, offset: number): string {
  return "0x" + (base + BigInt(offset)).toString(16).padStart(12, "0");
}

function parseAddress(addr: string): bigint {
  try {
    const clean = addr.replace(/^0x/i, "").trim();
    return BigInt("0x" + clean);
  } catch {
    return BigInt(0);
  }
}

export function MemoryViewer({
  sessionId,
  bytes,
  baseAddress,
  onAddressChange,
}: MemoryViewerProps) {
  const [addrInput, setAddrInput] = useState(baseAddress || "");
  const [collapsed, setCollapsed] = useState(false);

  const handleRead = () => {
    const addr = addrInput.trim();
    if (!addr || !sessionId) return;
    onAddressChange(addr);
    invoke("debugger_send_command", {
      sessionId,
      command: `-data-read-memory-bytes ${addr} 128`,
    }).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRead();
  };

  const baseVal = parseAddress(baseAddress);

  const rows: Array<{ offset: number; slice: Uint8Array }> = [];
  if (bytes) {
    for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
      rows.push({ offset: i, slice: bytes.slice(i, i + BYTES_PER_ROW) });
    }
  }

  return (
    <div
      className="flex flex-col bg-bg-base border-t border-border flex-shrink-0"
      style={{ height: collapsed ? "auto" : 180 }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-surface flex-shrink-0">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs font-mono text-text-dim hover:text-text-muted mr-1"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
          Memory
        </span>
        <div className="flex-1" />
        <input
          type="text"
          value={addrInput}
          onChange={(e) => setAddrInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0x7fff0000"
          className="w-36 bg-bg-elevated border border-border rounded px-2 py-0.5 text-xs font-mono text-text-primary placeholder-text-dim focus:outline-none focus:border-accent-green"
        />
        <button
          onClick={handleRead}
          disabled={!sessionId}
          className="px-2 py-0.5 border border-border rounded text-xs font-mono text-text-muted hover:border-accent-green hover:text-accent-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Read
        </button>
      </div>

      {/* Hex content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-1">
          {bytes === null ? (
            <div className="flex items-center justify-center h-full text-xs text-text-dim font-mono">
              No memory loaded — enter an address and click Read
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {rows.map(({ offset, slice }) => {
                  const addrStr = formatAddr(baseVal, offset);
                  return (
                    <tr key={offset} className="hover:bg-bg-elevated">
                      {/* Address gutter */}
                      <td className="pr-3 text-xs font-mono text-text-dim whitespace-nowrap">
                        {addrStr}
                      </td>

                      {/* First 8 bytes hex */}
                      <td className="pr-2">
                        <span className="flex gap-1">
                          {Array.from({ length: HALF }, (_, i) => {
                            const b = i < slice.length ? slice[i] : null;
                            return (
                              <span
                                key={i}
                                className={`text-xs font-mono w-5 ${
                                  b == null
                                    ? "text-text-dim"
                                    : byteClass(b)
                                }`}
                              >
                                {b == null ? "  " : b.toString(16).padStart(2, "0")}
                              </span>
                            );
                          })}
                        </span>
                      </td>

                      {/* Second 8 bytes hex */}
                      <td className="pr-3">
                        <span className="flex gap-1">
                          {Array.from({ length: HALF }, (_, i) => {
                            const idx = HALF + i;
                            const b = idx < slice.length ? slice[idx] : null;
                            return (
                              <span
                                key={i}
                                className={`text-xs font-mono w-5 ${
                                  b == null
                                    ? "text-text-dim"
                                    : byteClass(b)
                                }`}
                              >
                                {b == null ? "  " : b.toString(16).padStart(2, "0")}
                              </span>
                            );
                          })}
                        </span>
                      </td>

                      {/* ASCII */}
                      <td>
                        <span className="text-xs font-mono text-text-dim">
                          {Array.from(slice).map((b, i) => (
                            <span key={i} className={byteClass(b)}>
                              {toAscii(b)}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
