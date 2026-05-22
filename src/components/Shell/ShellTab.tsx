import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

interface ShellTabProps {
  sessionId: string;
  active: boolean;
}

const XTERM_THEME = {
  background: "#0d0f14",
  foreground: "#e2e8f0",
  cursor: "#e63946",
  cursorAccent: "#0d0f14",
  black: "#1e2330",
  red: "#e63946",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#38bdf8",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e2e8f0",
  brightBlack: "#475569",
  brightRed: "#ff6b7a",
  brightGreen: "#86efac",
  brightYellow: "#fde68a",
  brightBlue: "#7dd3fc",
  brightMagenta: "#e879f9",
  brightCyan: "#67e8f9",
  brightWhite: "#f8fafc",
};

export function ShellTab({ sessionId, active }: ShellTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const unlistenExitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "block",
      allowTransparency: true,
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // Spawn the shell
    invoke("spawn_shell", { sessionId, shell: null }).catch((err) => {
      term.writeln(`\x1b[31m[NullForge] Failed to spawn shell: ${err}\x1b[0m`);
    });

    // Listen for output
    listen<string>(`shell-output-${sessionId}`, (ev) => {
      term.write(ev.payload);
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    // Listen for exit
    listen<number>(`shell-exit-${sessionId}`, (ev) => {
      term.writeln(`\r\n\x1b[33m[NullForge] Shell exited (code ${ev.payload})\x1b[0m`);
    }).then((unlisten) => {
      unlistenExitRef.current = unlisten;
    });

    // Forward keyboard input to shell
    term.onData((data) => {
      invoke("write_to_shell", { sessionId, data }).catch(() => {});
    });

    // Forward terminal resize to PTY
    term.onResize(({ cols, rows }) => {
      invoke("resize_shell", { sessionId, cols, rows }).catch(() => {});
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      fitAddon.fit();
    });
    ro.observe(containerRef.current);

    return () => {
      unlistenRef.current?.();
      unlistenExitRef.current?.();
      invoke("kill_shell", { sessionId }).catch(() => {});
      term.dispose();
      ro.disconnect();
    };
  }, [sessionId]);

  // Re-fit when panel becomes active
  useEffect(() => {
    if (active && fitRef.current) {
      setTimeout(() => fitRef.current?.fit(), 50);
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ display: active ? "block" : "none" }}
    />
  );
}
