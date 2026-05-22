/**
 * CyberChef Operations — NullForge Plugin Stub
 * id: nullforge.cyberchef
 *
 * Data transformation operations panel. Provides encode/decode, hashing,
 * encryption helpers, format conversion, and recipe chain execution.
 */

export type OperationId =
  | "base64-encode"
  | "base64-decode"
  | "hex-encode"
  | "hex-decode"
  | "url-encode"
  | "url-decode"
  | "md5"
  | "sha1"
  | "sha256"
  | "sha512"
  | "hex-dump"
  | "to-binary"
  | "from-binary"
  | "xor"
  | "rot13"
  | "gzip"
  | "gunzip";

export interface Operation {
  id: OperationId;
  label: string;
  category: "encode" | "hash" | "compress" | "misc";
  args?: Record<string, unknown>;
}

export interface Recipe {
  name: string;
  operations: Operation[];
}

/**
 * All available operations catalogue (stub — actual transforms run in WebView).
 */
export const OPERATIONS: Operation[] = [
  { id: "base64-encode", label: "Base64 Encode",  category: "encode" },
  { id: "base64-decode", label: "Base64 Decode",  category: "encode" },
  { id: "hex-encode",    label: "To Hex",         category: "encode" },
  { id: "hex-decode",    label: "From Hex",       category: "encode" },
  { id: "url-encode",    label: "URL Encode",     category: "encode" },
  { id: "url-decode",    label: "URL Decode",     category: "encode" },
  { id: "md5",           label: "MD5",            category: "hash"   },
  { id: "sha1",          label: "SHA-1",          category: "hash"   },
  { id: "sha256",        label: "SHA-256",        category: "hash"   },
  { id: "sha512",        label: "SHA-512",        category: "hash"   },
  { id: "hex-dump",      label: "Hex Dump",       category: "misc"   },
  { id: "rot13",         label: "ROT13",          category: "misc"   },
  { id: "xor",           label: "XOR",            category: "misc", args: { key: 0 } },
  { id: "gzip",          label: "Gzip",           category: "compress" },
  { id: "gunzip",        label: "Gunzip",         category: "compress" },
];

export async function activate(_context: unknown): Promise<void> {
  console.log("[nullforge.cyberchef] activated (stub)");
}

export async function deactivate(): Promise<void> {
  console.log("[nullforge.cyberchef] deactivated");
}
