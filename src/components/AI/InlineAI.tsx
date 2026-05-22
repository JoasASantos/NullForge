/**
 * InlineAI — Cmd+K floating modal for quick AI prompts with editor context.
 *
 * Triggered by: window event "nullforge:inline-ai"
 * Payload: { selectedCode?: string, language?: string, fileName?: string }
 *
 * Result events:
 *   "nullforge:insert-code"  — { code: string } — insert at cursor
 *   "nullforge:replace-code" — { code: string } — replace selection
 */

import { Check, Code, CornerDownLeft, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../../ai/router";
import { DEFAULT_SYSTEM_PROMPT, type AIMessage } from "../../ai/types";
import { useAppStore } from "../../store";

interface InlineAIPayload {
  selectedCode?: string;
  language?: string;
  fileName?: string;
}

interface ResultBlock {
  language: string;
  content: string;
}

function parseFirstCodeBlock(text: string): ResultBlock | null {
  const match = /```(\w*)\n([\s\S]*?)```/.exec(text);
  if (match) {
    return { language: match[1] || "text", content: match[2] };
  }
  return null;
}

export function InlineAI() {
  const { aiConfig } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<InlineAIPayload>({});
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const streamTextRef = useRef<string>("");

  // Listen for open event
  useEffect(() => {
    function handleOpen(e: CustomEvent<InlineAIPayload>) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setPayload(e.detail ?? {});
      setPrompt("");
      setResponse("");
      setDone(false);
      setIsStreaming(false);
      setVisible(true);
    }

    window.addEventListener("nullforge:inline-ai", handleOpen as EventListener);
    return () => window.removeEventListener("nullforge:inline-ai", handleOpen as EventListener);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  // Keyboard: Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!visible) return;
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  function handleClose() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setVisible(false);
  }

  async function handleSubmit() {
    if (!prompt.trim() || isStreaming) return;

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (payload.selectedCode) {
      systemPrompt += `\n\n## Context — Selected Code (${payload.language ?? "unknown"}${payload.fileName ? ` in ${payload.fileName}` : ""})\n\`\`\`${payload.language ?? ""}\n${payload.selectedCode}\n\`\`\`\n\nThe user will ask you to modify, explain, or work with this code. Respond with only the relevant code or explanation.`;
    }

    const messages: AIMessage[] = [{ role: "user", content: prompt }];
    setResponse("");
    setIsStreaming(true);
    setDone(false);
    streamTextRef.current = "";

    const sessionId = `inline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const cleanup = await streamChat(
        sessionId,
        { ...aiConfig, systemPrompt },
        messages,
        {
          onChunk: (text) => {
            streamTextRef.current += text;
            setResponse(streamTextRef.current);
          },
          onDone: (fullText) => {
            streamTextRef.current = "";
            setResponse(fullText);
            setIsStreaming(false);
            setDone(true);
            cleanupRef.current = null;
          },
          onError: (err) => {
            streamTextRef.current = "";
            setResponse(`Error: ${err}`);
            setIsStreaming(false);
            setDone(true);
            cleanupRef.current = null;
          },
        }
      );
      cleanupRef.current = cleanup;
    } catch (err) {
      setResponse(`Error: ${String(err)}`);
      setIsStreaming(false);
      setDone(true);
    }
  }

  function handleInsert() {
    const block = parseFirstCodeBlock(response);
    window.dispatchEvent(
      new CustomEvent("nullforge:insert-code", {
        detail: { code: block ? block.content : response },
      })
    );
    handleClose();
  }

  function handleReplace() {
    const block = parseFirstCodeBlock(response);
    window.dispatchEvent(
      new CustomEvent("nullforge:replace-code", {
        detail: { code: block ? block.content : response },
      })
    );
    handleClose();
  }

  if (!visible) return null;

  const codeBlock = done ? parseFirstCodeBlock(response) : null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal */}
      <div className="bg-elevated border border-border rounded-lg shadow-2xl w-[540px] max-w-[90vw] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Code size={14} className="text-accent-red flex-shrink-0" />
          <span className="text-xs font-semibold text-text-primary">NullForge AI</span>
          {payload.fileName && (
            <span className="text-xs text-text-muted truncate">— {payload.fileName}</span>
          )}
          <button
            onClick={handleClose}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Selected code preview */}
        {payload.selectedCode && (
          <div className="border-b border-border">
            <div className="px-3 py-1 text-xs text-text-muted bg-[#0d0f14]">
              Selected code ({payload.language ?? "unknown"})
            </div>
            <pre className="px-3 py-2 text-xs font-mono text-text-muted bg-[#0a0c10] overflow-x-auto max-h-24 selectable">
              {payload.selectedCode.slice(0, 400)}
              {payload.selectedCode.length > 400 ? "\n..." : ""}
            </pre>
          </div>
        )}

        {/* Prompt input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              payload.selectedCode
                ? "What do you want to do with this code?"
                : "Ask NullForge AI anything..."
            }
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-50 selectable"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isStreaming}
            className="flex items-center gap-1 text-xs bg-accent-red text-white px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <CornerDownLeft size={11} />
            )}
          </button>
        </div>

        {/* Response area */}
        {(response || isStreaming) && (
          <div className="max-h-64 overflow-y-auto">
            {codeBlock ? (
              <div>
                <div className="flex items-center justify-between bg-[#0d0f14] px-3 py-1 border-b border-border">
                  <span className="text-xs text-text-muted font-mono">{codeBlock.language}</span>
                </div>
                <pre className="px-3 py-2 text-xs font-mono text-text-primary bg-[#0a0c10] overflow-x-auto selectable whitespace-pre">
                  {codeBlock.content}
                </pre>
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-text-primary whitespace-pre-wrap selectable">
                {response}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3 bg-accent-red ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons (shown when done) */}
        {done && response && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
            {payload.selectedCode ? (
              <>
                <button
                  onClick={handleReplace}
                  className="flex items-center gap-1.5 text-xs bg-accent-red text-white px-2.5 py-1 rounded hover:bg-red-600 transition-colors"
                >
                  <Check size={11} />
                  Replace Selection
                </button>
                <button
                  onClick={handleInsert}
                  className="flex items-center gap-1.5 text-xs border border-border text-text-primary px-2.5 py-1 rounded hover:border-accent-red transition-colors"
                >
                  <Code size={11} />
                  Insert Below
                </button>
              </>
            ) : (
              <button
                onClick={handleInsert}
                className="flex items-center gap-1.5 text-xs bg-accent-red text-white px-2.5 py-1 rounded hover:bg-red-600 transition-colors"
              >
                <Code size={11} />
                Insert into Editor
              </button>
            )}
            <button
              onClick={handleClose}
              className="ml-auto text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
