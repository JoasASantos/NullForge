/**
 * Metasploit Connector — NullForge Plugin Stub
 * id: nullforge.metasploit-connector
 *
 * Provides msfrpc connectivity, module execution, and session management.
 * Full implementation requires a running Metasploit Framework installation
 * with the msfrpc daemon active.
 */

export interface MsfSession {
  id: number;
  type: "shell" | "meterpreter";
  remoteHost: string;
  remotePort: number;
  info: string;
}

export interface MsfModule {
  fullname: string;
  type: "exploit" | "auxiliary" | "post" | "payload";
  name: string;
  description: string;
  rank: string;
}

export interface MsfConnectOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * Activate the plugin and register its commands.
 * Called by NullForge plugin loader on activation event.
 */
export async function activate(_context: unknown): Promise<void> {
  console.log("[nullforge.metasploit-connector] activated (stub)");
}

/**
 * Deactivate and clean up resources.
 */
export async function deactivate(): Promise<void> {
  console.log("[nullforge.metasploit-connector] deactivated");
}
