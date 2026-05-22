/**
 * Frida Runner — NullForge Plugin Stub
 * id: nullforge.frida-runner
 *
 * Dynamic instrumentation via Frida. Attach to local or remote processes,
 * run JavaScript hooks, and stream results to the NullForge console.
 * Requires frida-tools installed: pip install frida-tools
 */

export interface FridaDevice {
  id: string;
  name: string;
  type: "local" | "remote" | "usb";
}

export interface FridaProcess {
  pid: number;
  name: string;
}

export interface AttachOptions {
  device?: string;
  target: number | string; // pid or process name
  scriptPath?: string;
}

export interface SpawnOptions {
  device?: string;
  program: string;
  argv?: string[];
  scriptPath?: string;
  resume?: boolean;
}

/**
 * Generate a Frida script template that hooks a function by address.
 */
export function generateHookTemplate(moduleName: string, exportName: string): string {
  return `// Frida hook: ${moduleName}!${exportName}
const fn = Module.getExportByName('${moduleName}', '${exportName}');

Interceptor.attach(fn, {
  onEnter(args) {
    console.log('[+] ${exportName} called');
    // inspect args[0], args[1], ...
  },
  onLeave(retval) {
    console.log('[+] ${exportName} returned:', retval);
  },
});`;
}

export async function activate(_context: unknown): Promise<void> {
  console.log("[nullforge.frida-runner] activated (stub)");
}

export async function deactivate(): Promise<void> {
  console.log("[nullforge.frida-runner] deactivated");
}
