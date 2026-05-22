import { useState } from "react";
import { ArrowRight, Code2, Bot, Bug, Database, ChevronRight } from "lucide-react";
import { saveClaudeKey } from "../../ai/providers/claude";
import { saveOpenAIKey } from "../../ai/providers/openai";
import { saveOllamaEndpoint } from "../../ai/providers/ollama";
import { useAppStore } from "../../store";

type Provider = "claude" | "openai" | "ollama";

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mt-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-5 h-2 bg-accent-red"
              : i < current
              ? "w-2 h-2 bg-accent-red/60"
              : "w-2 h-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// Step 1 — Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: <Code2 size={16} />, label: "Monaco Editor", desc: "Pro code editor with ASM support" },
    { icon: <Bot size={16} />, label: "AI Assistant", desc: "Claude / OpenAI / Ollama integration" },
    { icon: <Bug size={16} />, label: "Debugger", desc: "LLDB-backed debug sessions" },
    { icon: <Database size={16} />, label: "Payload Library", desc: "Curated exploit & shellcode DB" },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center mb-6">
        <span className="text-4xl font-black text-accent-red select-none">NF</span>
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to NullForge</h1>
      <p className="text-sm text-text-muted max-w-sm mb-8">
        AI-native exploit development platform for security researchers. Let&apos;s get you set up in
        under 2 minutes.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full mb-8">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-2.5 bg-elevated border border-border rounded-lg p-3 text-left"
          >
            <div className="text-accent-red mt-0.5 flex-shrink-0">{f.icon}</div>
            <div>
              <div className="text-xs font-semibold text-text-primary">{f.label}</div>
              <div className="text-xs text-text-muted">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="flex items-center gap-2 px-6 py-2.5 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Get Started <ArrowRight size={16} />
      </button>
    </div>
  );
}

// Step 2 — Configure AI
function AiStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { setAiConfig } = useAppStore();
  const [provider, setProvider] = useState<Provider>("claude");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("http://localhost:11434");

  function handleContinue() {
    if (provider === "claude" && apiKey) {
      saveClaudeKey(apiKey);
      setAiConfig({ provider: "claude", model: "claude-sonnet-4-6", apiKey });
    } else if (provider === "openai" && apiKey) {
      saveOpenAIKey(apiKey);
      setAiConfig({ provider: "openai", model: "gpt-4o", apiKey });
    } else if (provider === "ollama") {
      saveOllamaEndpoint(endpoint);
      setAiConfig({ provider: "ollama", model: "llama3.2", endpoint });
    }
    onNext();
  }

  const providerOptions: { id: Provider; label: string; recommended?: boolean }[] = [
    { id: "claude", label: "Claude", recommended: true },
    { id: "openai", label: "OpenAI" },
    { id: "ollama", label: "Ollama (local)" },
  ];

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-text-primary mb-1">Connect your AI provider</h2>
      <p className="text-sm text-text-muted mb-6">
        NullForge uses AI for code generation, vulnerability analysis, and inline suggestions.
      </p>

      {/* Provider selection */}
      <div className="flex gap-2 mb-5">
        {providerOptions.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors relative ${
              provider === p.id
                ? "bg-accent-red/10 border-accent-red/50 text-accent-red"
                : "bg-bg-base border-border text-text-muted hover:border-text-muted"
            }`}
          >
            {p.label}
            {p.recommended && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-accent-green text-black font-bold px-1.5 rounded-full">
                recommended
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Input */}
      {provider !== "ollama" ? (
        <div className="mb-6">
          <label className="block text-xs text-text-muted mb-1">
            {provider === "claude" ? "Anthropic API Key" : "OpenAI API Key"}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "claude" ? "sk-ant-..." : "sk-..."}
            className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Your API key is stored locally and never transmitted to NullForge servers.
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-xs text-text-muted mb-1">Ollama Endpoint</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-red"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Ensure Ollama is running locally with at least one model pulled.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onSkip} className="text-xs text-text-muted hover:text-text-primary transition-colors">
          Skip for now
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-5 py-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Continue <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const alreadyOnboarded =
    typeof window !== "undefined" && localStorage.getItem("nullforge_onboarded") === "true";

  const [visible, setVisible] = useState(!alreadyOnboarded);
  const [step, setStep] = useState(0);

  if (!visible) return null;

  function next() {
    setStep((s) => Math.min(s + 1, 1));
  }

  function complete() {
    localStorage.setItem("nullforge_onboarded", "true");
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", animation: "fadeIn 0.2s ease-out" }}
    >
      <div
        className="w-[600px] bg-bg-base border border-border rounded-2xl shadow-2xl p-8 flex flex-col"
        style={{ animation: "fadeInScale 0.2s ease-out" }}
      >
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <AiStep onNext={complete} onSkip={complete} />}
        <StepDots current={step} total={2} />
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
