import { useState } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAppStore } from "../../store";
import { saveClaudeKey, getClaudeKey, CLAUDE_KEY_STORAGE } from "../../ai/providers/claude";
import { saveOpenAIKey, getOpenAIKey } from "../../ai/providers/openai";
import { saveOllamaEndpoint, getOllamaEndpoint } from "../../ai/providers/ollama";
import { DEFAULT_SYSTEM_PROMPT } from "../../ai/types";

type TestStatus = "idle" | "testing" | "ok" | "fail";

function MaskedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red pr-8"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "testing") return <Loader2 size={14} className="animate-spin text-text-muted" />;
  if (status === "ok") return <CheckCircle size={14} className="text-accent-green" />;
  if (status === "fail") return <XCircle size={14} className="text-accent-red" />;
  return null;
}

function ProviderCard({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border rounded-lg p-4 mb-4 transition-colors ${
        enabled ? "border-accent-red/40 bg-elevated" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${enabled ? "bg-accent-green" : "bg-text-muted"}`}
          />
          <span className="text-sm font-semibold text-text-primary">{title}</span>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            enabled ? "bg-accent-red" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {enabled && <div className="space-y-3">{children}</div>}
    </div>
  );
}

export function ProvidersSettings() {
  const { aiConfig, setAiConfig } = useAppStore();

  // Claude state
  const [claudeEnabled, setClaudeEnabled] = useState(aiConfig.provider === "claude");
  const [claudeKey, setClaudeKey] = useState(getClaudeKey);
  const [claudeModel, setClaudeModel] = useState(aiConfig.model ?? "claude-sonnet-4-6");
  const [claudeMaxTokens, setClaudeMaxTokens] = useState(String(aiConfig.maxTokens ?? 8192));
  const [claudeSystemPrompt, setClaudeSystemPrompt] = useState(
    aiConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  );
  const [claudeStatus, setClaudeStatus] = useState<TestStatus>("idle");

  // OpenAI state
  const [openaiEnabled, setOpenaiEnabled] = useState(aiConfig.provider === "openai");
  const [openaiKey, setOpenaiKey] = useState(getOpenAIKey);
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [openaiStatus, setOpenaiStatus] = useState<TestStatus>("idle");

  // Ollama state
  const [ollamaEnabled, setOllamaEnabled] = useState(aiConfig.provider === "ollama");
  const [ollamaEndpoint, setOllamaEndpoint] = useState(getOllamaEndpoint);
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [ollamaAutoDetect, setOllamaAutoDetect] = useState(true);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<TestStatus>("idle");

  function saveClaudeSettings() {
    saveClaudeKey(claudeKey);
    setAiConfig({
      provider: "claude",
      model: claudeModel,
      apiKey: claudeKey,
      systemPrompt: claudeSystemPrompt,
      maxTokens: parseInt(claudeMaxTokens, 10) || 8192,
    });
  }

  async function testClaude() {
    setClaudeStatus("testing");
    try {
      const resp = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
      });
      setClaudeStatus(resp.ok ? "ok" : "fail");
    } catch {
      setClaudeStatus("fail");
    }
  }

  function saveOpenAISettings() {
    saveOpenAIKey(openaiKey);
    setAiConfig({ provider: "openai", model: openaiModel, apiKey: openaiKey });
  }

  async function testOpenAI() {
    setOpenaiStatus("testing");
    try {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      setOpenaiStatus(resp.ok ? "ok" : "fail");
    } catch {
      setOpenaiStatus("fail");
    }
  }

  function saveOllamaSettings() {
    saveOllamaEndpoint(ollamaEndpoint);
    setAiConfig({ provider: "ollama", model: ollamaModel, endpoint: ollamaEndpoint });
  }

  async function testOllama() {
    setOllamaStatus("testing");
    try {
      const resp = await fetch(`${ollamaEndpoint}/api/tags`);
      if (resp.ok) {
        const data = await resp.json();
        const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
        if (ollamaAutoDetect && models.length > 0) {
          setOllamaModels(models);
          setOllamaModel(models[0]);
        }
        setOllamaStatus("ok");
      } else {
        setOllamaStatus("fail");
      }
    } catch {
      setOllamaStatus("fail");
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted mb-4">
        Configure AI providers. Only the active provider is used for chat and inline AI.
      </p>

      {/* Claude */}
      <ProviderCard
        title="Claude (Anthropic)"
        enabled={claudeEnabled}
        onToggle={() => {
          setClaudeEnabled((v) => !v);
          if (!claudeEnabled) saveClaudeSettings();
        }}
      >
        <div>
          <label className="block text-xs text-text-muted mb-1">API Key</label>
          <MaskedInput value={claudeKey} onChange={setClaudeKey} placeholder="sk-ant-..." />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Model</label>
          <select
            value={claudeModel}
            onChange={(e) => setClaudeModel(e.target.value)}
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
          >
            <option value="claude-opus-4-7">claude-opus-4-7</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Max Tokens</label>
          <input
            type="number"
            value={claudeMaxTokens}
            onChange={(e) => setClaudeMaxTokens(e.target.value)}
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">System Prompt</label>
          <textarea
            value={claudeSystemPrompt}
            onChange={(e) => setClaudeSystemPrompt(e.target.value)}
            rows={4}
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red resize-none font-mono"
          />
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { saveClaudeSettings(); testClaude(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors"
          >
            Test Connection
          </button>
          <StatusIcon status={claudeStatus} />
          {claudeStatus === "ok" && <span className="text-xs text-accent-green">Connected</span>}
          {claudeStatus === "fail" && <span className="text-xs text-accent-red">Failed</span>}
        </div>
      </ProviderCard>

      {/* OpenAI */}
      <ProviderCard
        title="OpenAI"
        enabled={openaiEnabled}
        onToggle={() => {
          setOpenaiEnabled((v) => !v);
          if (!openaiEnabled) saveOpenAISettings();
        }}
      >
        <div>
          <label className="block text-xs text-text-muted mb-1">API Key</label>
          <MaskedInput value={openaiKey} onChange={setOpenaiKey} placeholder="sk-..." />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Model</label>
          <select
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
          >
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { saveOpenAISettings(); testOpenAI(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors"
          >
            Test Connection
          </button>
          <StatusIcon status={openaiStatus} />
          {openaiStatus === "ok" && <span className="text-xs text-accent-green">Connected</span>}
          {openaiStatus === "fail" && <span className="text-xs text-accent-red">Failed</span>}
        </div>
      </ProviderCard>

      {/* Ollama */}
      <ProviderCard
        title="Ollama (Local)"
        enabled={ollamaEnabled}
        onToggle={() => {
          setOllamaEnabled((v) => !v);
          if (!ollamaEnabled) saveOllamaSettings();
        }}
      >
        <div>
          <label className="block text-xs text-text-muted mb-1">Endpoint</label>
          <input
            type="text"
            value={ollamaEndpoint}
            onChange={(e) => setOllamaEndpoint(e.target.value)}
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ollama-autodetect"
            checked={ollamaAutoDetect}
            onChange={(e) => setOllamaAutoDetect(e.target.checked)}
            className="accent-accent-red"
          />
          <label htmlFor="ollama-autodetect" className="text-xs text-text-muted">
            Auto-detect models on test
          </label>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Model</label>
          {ollamaModels.length > 0 ? (
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
            >
              {ollamaModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="e.g. llama3.2"
              className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
            />
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { saveOllamaSettings(); testOllama(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors"
          >
            Test Connection
          </button>
          <StatusIcon status={ollamaStatus} />
          {ollamaStatus === "ok" && <span className="text-xs text-accent-green">Connected</span>}
          {ollamaStatus === "fail" && <span className="text-xs text-accent-red">Offline</span>}
        </div>
      </ProviderCard>
    </div>
  );
}
