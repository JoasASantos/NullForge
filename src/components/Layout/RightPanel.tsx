import {
  Bot,
  ChevronDown,
  Code,
  Loader2,
  Plus,
  Save,
  Send,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { getClaudeKey, saveClaudeKey } from "../../ai/providers/claude";
import { getOpenAIKey, saveOpenAIKey } from "../../ai/providers/openai";
import { getOllamaEndpoint, saveOllamaEndpoint } from "../../ai/providers/ollama";
import { streamChat } from "../../ai/router";
import { DEFAULT_SYSTEM_PROMPT, PROVIDERS, type AIMessage } from "../../ai/types";
import { useAppStore } from "../../store";

// ── Code block parser ──────────────────────────────────────────────────────────

interface ParsedSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseCodeBlocks(text: string): ParsedSegment[] {
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", language: match[1] || "text", content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CodeBlock({
  language,
  content,
  onInsert,
}: {
  language: string;
  content: string;
  onInsert: (code: string) => void;
}) {
  return (
    <div className="my-1 rounded border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-[#0d0f14] px-2 py-1">
        <span className="text-xs text-text-muted font-mono">{language || "code"}</span>
        <button
          onClick={() => onInsert(content)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-red transition-colors"
        >
          <Code size={10} />
          Insert
        </button>
      </div>
      <pre className="bg-[#0a0c10] px-3 py-2 text-xs font-mono text-text-primary overflow-x-auto selectable whitespace-pre">
        {content}
      </pre>
    </div>
  );
}

function MessageBubble({
  message,
  providerName,
  onInsert,
}: {
  message: AIMessage;
  providerName: string;
  onInsert: (code: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] bg-elevated border border-border rounded-lg px-2.5 py-2 text-xs text-text-primary selectable whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  const segments = parseCodeBlocks(message.content);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs text-accent-red font-medium">
        <Bot size={12} />
        {providerName}
      </div>
      <div className="bg-elevated border border-border rounded-lg px-2.5 py-2 text-xs text-text-primary selectable break-words">
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock
              key={i}
              language={seg.language ?? ""}
              content={seg.content}
              onInsert={onInsert}
            />
          ) : (
            <span key={i} className="whitespace-pre-wrap">
              {seg.content}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function ContextChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
        active
          ? "bg-accent-red border-accent-red text-white"
          : "border-border text-text-muted hover:border-accent-red hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { aiConfig, setAiConfig } = useAppStore();
  const [claudeKey, setClaudeKey] = useState(getClaudeKey());
  const [openaiKey, setOpenaiKey] = useState(getOpenAIKey());
  const [ollamaEp, setOllamaEp] = useState(getOllamaEndpoint());

  function handleSave() {
    saveClaudeKey(claudeKey);
    saveOpenAIKey(openaiKey);
    saveOllamaEndpoint(ollamaEp);
    setAiConfig({
      apiKey:
        aiConfig.provider === "claude"
          ? claudeKey
          : aiConfig.provider === "openai"
          ? openaiKey
          : undefined,
      endpoint: ollamaEp,
    });
    onClose();
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text-primary">AI Settings</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-text-muted">Anthropic API Key</label>
        <input
          type="password"
          value={claudeKey}
          onChange={(e) => setClaudeKey(e.target.value)}
          placeholder="sk-ant-..."
          className="bg-elevated border border-border rounded px-2 py-1 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-text-muted">OpenAI API Key</label>
        <input
          type="password"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          className="bg-elevated border border-border rounded px-2 py-1 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-text-muted">Ollama Endpoint</label>
        <input
          type="text"
          value={ollamaEp}
          onChange={(e) => setOllamaEp(e.target.value)}
          placeholder="http://localhost:11434"
          className="bg-elevated border border-border rounded px-2 py-1 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
        />
      </div>

      <button
        onClick={handleSave}
        className="flex items-center justify-center gap-1.5 bg-accent-red text-white rounded px-3 py-1.5 hover:bg-red-600 transition-colors"
      >
        <Save size={12} />
        Save Keys
      </button>
    </div>
  );
}

// ── Provider / Model dropdown ──────────────────────────────────────────────────

function ProviderSelector() {
  const { aiConfig, setAiConfig } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentProvider = PROVIDERS.find((p) => p.id === aiConfig.provider) ?? PROVIDERS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-text-primary bg-elevated border border-border rounded px-2 py-0.5 hover:border-accent-red transition-colors"
      >
        {currentProvider.name}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-elevated border border-border rounded shadow-lg min-w-[200px]">
          {PROVIDERS.map((prov) => (
            <div key={prov.id}>
              <div className="px-2 py-1 text-xs font-semibold text-text-muted border-b border-border">
                {prov.name}
              </div>
              {prov.models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    const key =
                      prov.id === "claude"
                        ? getClaudeKey()
                        : prov.id === "openai"
                        ? getOpenAIKey()
                        : undefined;
                    setAiConfig({
                      provider: prov.id,
                      model: m,
                      apiKey: key,
                      endpoint: prov.id === "ollama" ? getOllamaEndpoint() : undefined,
                    });
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1 text-xs hover:bg-[#1e2330] transition-colors ${
                    aiConfig.provider === prov.id && aiConfig.model === m
                      ? "text-accent-red"
                      : "text-text-primary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main RightPanel ────────────────────────────────────────────────────────────

export function RightPanel() {
  const {
    aiPanelOpen,
    toggleAiPanel,
    rightPanelWidth,
    setRightPanelWidth,
    aiConfig,
    currentMessages,
    appendCurrentMessage,
    setCurrentMessages,
    updateLastAssistantMessage,
    isStreaming,
    setIsStreaming,
    setStreamingSessionId,
    editorTabs,
    activeEditorId,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [contextFile, setContextFile] = useState(false);
  const [contextSelection, setContextSelection] = useState(false);
  const [contextDebug, setContextDebug] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  // Accumulate streaming text in a ref so onChunk callbacks don't close over stale state
  const streamingTextRef = useRef<string>("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Listen for selected code from editor
  useEffect(() => {
    function handleSelection(e: CustomEvent<{ code: string }>) {
      setSelectedCode(e.detail.code);
      setContextSelection(true);
    }
    window.addEventListener("nullforge:editor-selection", handleSelection as EventListener);
    return () => window.removeEventListener("nullforge:editor-selection", handleSelection as EventListener);
  }, []);

  // Cleanup stream listeners on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const currentProvider = PROVIDERS.find((p) => p.id === aiConfig.provider) ?? PROVIDERS[0];
  const activeTab = editorTabs.find((t) => t.id === activeEditorId);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    // Build context prefix
    let systemPrompt = aiConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

    if (contextFile && activeTab) {
      systemPrompt += `\n\n## Current File: ${activeTab.name}\n\`\`\`${activeTab.language}\n${activeTab.content}\n\`\`\``;
    }

    if (contextSelection && selectedCode) {
      systemPrompt += `\n\n## Selected Code\n\`\`\`\n${selectedCode}\n\`\`\``;
    }

    const userMsg: AIMessage = { role: "user", content: input.trim() };
    appendCurrentMessage(userMsg);
    setInput("");

    // Placeholder for streaming assistant reply
    const placeholderMsg: AIMessage = { role: "assistant", content: "" };
    appendCurrentMessage(placeholderMsg);
    streamingTextRef.current = "";

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setStreamingSessionId(sessionId);
    setIsStreaming(true);

    // Build messages array (exclude the empty placeholder)
    const historyMessages = currentMessages.filter((m) => m.content !== "");
    const messagesForApi = [...historyMessages, userMsg];

    const configWithKey = {
      ...aiConfig,
      systemPrompt,
    };

    try {
      const cleanup = await streamChat(sessionId, configWithKey, messagesForApi, {
        onChunk: (text) => {
          streamingTextRef.current += text;
          updateLastAssistantMessage(streamingTextRef.current);
        },
        onDone: (fullText) => {
          streamingTextRef.current = "";
          updateLastAssistantMessage(fullText);
          setIsStreaming(false);
          setStreamingSessionId(null);
          cleanupRef.current = null;
        },
        onError: (err) => {
          streamingTextRef.current = "";
          updateLastAssistantMessage(`Error: ${err}`);
          setIsStreaming(false);
          setStreamingSessionId(null);
          cleanupRef.current = null;
        },
      });
      cleanupRef.current = cleanup;
    } catch (err) {
      updateLastAssistantMessage(`Error: ${String(err)}`);
      setIsStreaming(false);
      setStreamingSessionId(null);
    }
  }

  function handleInsertCode(code: string) {
    window.dispatchEvent(new CustomEvent("nullforge:insert-code", { detail: { code } }));
  }

  function handleNewConversation() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsStreaming(false);
    setStreamingSessionId(null);
    setCurrentMessages([]);
    setInput("");
  }

  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startX: e.clientX, startW: rightPanelWidth };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startX - ev.clientX;
        const newW  = Math.max(240, Math.min(600, dragRef.current.startW + delta));
        setRightPanelWidth(newW);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [rightPanelWidth, setRightPanelWidth]
  );

  if (!aiPanelOpen) return null;

  return (
    <div
      className="h-full flex flex-col bg-surface border-l border-border flex-shrink-0 relative"
      style={{ width: rightPanelWidth }}
    >
      {/* Resize handle on left edge */}
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-red/50 transition-colors z-10"
      />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-accent-red" />
          <span className="text-xs font-semibold text-text-primary">NullForge AI</span>
          {isStreaming && <Loader2 size={12} className="text-accent-red animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New conversation"
            onClick={handleNewConversation}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-elevated"
          >
            <Plus size={13} />
          </button>
          <button
            title="Provider Settings"
            onClick={() => setShowSettings((v) => !v)}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-elevated transition-colors ${
              showSettings ? "text-accent-red" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Settings size={13} />
          </button>
          <button
            onClick={toggleAiPanel}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-elevated"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="border-b border-border flex-shrink-0">
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* Provider / model selector */}
      {!showSettings && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
          <span className="text-xs text-text-muted">Model:</span>
          <ProviderSelector />
          <span className="text-xs text-text-muted ml-auto truncate max-w-[80px]" title={aiConfig.model}>
            {aiConfig.model}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
            <Bot size={32} className="text-text-muted opacity-40" />
            <p className="text-xs text-text-muted">
              Ask NullForge AI about exploits, shellcode, vulnerabilities, ROP chains, or anything security-related.
            </p>
            <p className="text-xs text-text-muted opacity-60">
              Use the context chips below to include your current file or selection.
            </p>
          </div>
        ) : (
          <>
            {currentMessages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                providerName={currentProvider.name.split(" ")[0]}
                onInsert={handleInsertCode}
              />
            ))}
            {isStreaming && currentMessages[currentMessages.length - 1]?.content === "" && (
              <div className="flex items-center gap-1 text-xs text-text-muted px-1">
                <Loader2 size={11} className="animate-spin" />
                Generating...
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context toggles */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border flex-shrink-0 flex-wrap">
        <ContextChip
          label="file"
          active={contextFile}
          onToggle={() => setContextFile((v) => !v)}
        />
        <ContextChip
          label="selection"
          active={contextSelection}
          onToggle={() => setContextSelection((v) => !v)}
        />
        <ContextChip
          label="debug"
          active={contextDebug}
          onToggle={() => setContextDebug((v) => !v)}
        />
        {contextFile && activeTab && (
          <span className="text-xs text-text-muted truncate max-w-[100px]" title={activeTab.name}>
            {activeTab.name}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="flex flex-col gap-1.5 bg-elevated border border-border rounded focus-within:border-accent-red transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              isStreaming
                ? "Streaming response..."
                : contextFile && activeTab
                ? `Ask about ${activeTab.name}...`
                : "Ask about exploits, shellcode, vulnerabilities..."
            }
            disabled={isStreaming}
            className="w-full bg-transparent px-2 pt-2 text-xs text-text-primary placeholder-text-muted resize-none focus:outline-none min-h-[56px] max-h-32 selectable disabled:opacity-50"
            rows={2}
          />
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-xs text-text-muted opacity-50">⏎ send · ⇧⏎ newline</span>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="flex items-center gap-1 text-xs bg-accent-red text-white px-2.5 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
            >
              {isStreaming ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {isStreaming ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
