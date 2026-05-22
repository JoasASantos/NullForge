/**
 * pwntools Helper — NullForge Plugin Stub
 * id: nullforge.pwntools-helper
 *
 * Integrates pwntools utilities into the NullForge editor workflow.
 * Requires pwntools installed in the active Python environment.
 */

export interface PwnContext {
  arch: "amd64" | "i386" | "arm" | "aarch64" | "mips";
  os: "linux" | "windows" | "macos";
  binary?: string;
  terminal?: string;
}

export interface CyclicOptions {
  length: number;
  alphabet?: string;
  n?: number;
}

/**
 * Generate a pwntools context header snippet for insertion into the editor.
 */
export function generateContextSnippet(ctx: PwnContext): string {
  const lines: string[] = [
    "#!/usr/bin/env python3",
    "from pwn import *",
    "",
    `context.arch = '${ctx.arch}'`,
    `context.os   = '${ctx.os}'`,
    "context.log_level = 'debug'",
  ];
  if (ctx.binary) {
    lines.push("", `binary = ELF('${ctx.binary}')`, "rop    = ROP(binary)");
  }
  return lines.join("\n");
}

/**
 * Generate a cyclic pattern of the requested length.
 * Stub — delegates to shell invocation of `python3 -c "from pwn import *; print(cyclic(n))"`.
 */
export async function generateCyclic(_opts: CyclicOptions): Promise<string> {
  return "(stub) cyclic pattern generation requires pwntools installed";
}

export async function activate(_context: unknown): Promise<void> {
  console.log("[nullforge.pwntools-helper] activated (stub)");
}

export async function deactivate(): Promise<void> {
  console.log("[nullforge.pwntools-helper] deactivated");
}
