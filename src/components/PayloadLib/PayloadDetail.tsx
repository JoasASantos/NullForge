import { useState } from "react";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import type { Payload } from "./PayloadBrowser";

type Encoding = "raw" | "base64" | "hex" | "url" | "xor";

const ENCODINGS: { value: Encoding; label: string }[] = [
  { value: "raw",    label: "raw"    },
  { value: "base64", label: "base64" },
  { value: "hex",    label: "hex"    },
  { value: "url",    label: "url"    },
  { value: "xor",    label: "xor"   },
];

function applyEncoding(content: string, enc: Encoding): string {
  switch (enc) {
    case "raw":
      return content;
    case "base64":
      try {
        return btoa(content);
      } catch {
        return btoa(unescape(encodeURIComponent(content)));
      }
    case "hex":
      return Array.from(new TextEncoder().encode(content))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    case "url":
      return encodeURIComponent(content);
    case "xor": {
      const key = 0x41;
      return Array.from(new TextEncoder().encode(content))
        .map((b) => (b ^ key).toString(16).padStart(2, "0"))
        .join(" ");
    }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  shellcode:   "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  web:         "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  bypass:      "bg-red-500/20 text-red-400 border border-red-500/30",
  persistence: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  kernel:      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  other:       "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

interface Props {
  payload: Payload;
  onClose: () => void;
}

export function PayloadDetail({ payload, onClose }: Props) {
  const [encoding, setEncoding] = useState<Encoding>("raw");
  const [copied, setCopied]     = useState(false);

  const encoded = applyEncoding(payload.content, encoding);

  const handleCopy = () => {
    navigator.clipboard.writeText(encoded).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenInEditor = () => {
    const lang = payload.platform === "windows" ? "powershell"
      : payload.category === "shellcode" ? "asm"
      : "bash";
    window.dispatchEvent(new CustomEvent("nullforge:open-file", {
      detail: { name: payload.name + ".txt", language: lang, content: encoded },
    }));
  };

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border flex-shrink-0">
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          title="Back"
        >
          <ArrowLeft size={13} />
        </button>
        <span className="text-text-primary font-medium truncate flex-1 leading-tight">
          {payload.name}
        </span>
        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[payload.category] ?? CATEGORY_COLORS.other}`}>
          {payload.category}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Meta */}
        <div className="px-2 py-2 border-b border-border">
          <p className="text-text-muted leading-snug mb-2">{payload.description}</p>
          <div className="flex flex-wrap gap-1.5">
            <MetaBadge label="platform" value={payload.platform} />
            <MetaBadge label="arch" value={payload.arch} />
            <MetaBadge label="encoding" value={payload.encoding} />
          </div>
        </div>

        {/* Encoding pipeline */}
        <div className="px-2 py-2 border-b border-border flex-shrink-0">
          <div className="text-text-dim uppercase tracking-wider text-[10px] mb-1.5">Encoding</div>
          <div className="flex gap-1 flex-wrap">
            {ENCODINGS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEncoding(e.value)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  encoding === e.value
                    ? "bg-accent-red text-white"
                    : "bg-elevated text-text-muted hover:text-text-primary hover:bg-border border border-border"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          {encoding === "xor" && (
            <div className="mt-1 text-text-dim text-[10px]">XOR key: 0x41 ('A')</div>
          )}
        </div>

        {/* Content block */}
        <div className="px-2 py-2">
          <pre
            className="bg-bg-base border border-border rounded p-2 text-[10px] font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto"
          >
            {encoded}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-2 py-2 border-t border-border flex-shrink-0">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 flex-1 justify-center px-2 py-1.5 rounded text-xs transition-colors ${
            copied
              ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
              : "bg-elevated text-text-muted hover:text-text-primary border border-border hover:border-accent-red"
          }`}
        >
          <Copy size={11} />
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={handleOpenInEditor}
          className="flex items-center gap-1.5 flex-1 justify-center px-2 py-1.5 rounded text-xs bg-elevated text-text-muted hover:text-text-primary border border-border hover:border-accent-red transition-colors"
        >
          <ExternalLink size={11} />
          Editor
        </button>
      </div>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex gap-1 text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border">
      <span className="text-text-dim">{label}:</span>
      <span className="text-text-muted">{value}</span>
    </span>
  );
}
