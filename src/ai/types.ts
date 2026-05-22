export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIConfig {
  provider: "claude" | "openai" | "ollama";
  model: string;
  apiKey?: string;
  endpoint?: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIProvider {
  id: "claude" | "openai" | "ollama";
  name: string;
  models: string[];
  requiresKey: boolean;
}

export interface AIConversation {
  id: string;
  project_id?: string;
  provider: string;
  model: string;
  messages: AIMessage[];
  created_at: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export const PROVIDERS: AIProvider[] = [
  {
    id: "claude",
    name: "Claude (Anthropic)",
    models: [
      "claude-sonnet-4-5",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-haiku-20241022",
      "claude-opus-4-5",
    ],
    requiresKey: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "o1-preview",
      "o1-mini",
    ],
    requiresKey: true,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: [
      "llama3.2",
      "llama3.1",
      "codellama",
      "mistral",
      "deepseek-coder-v2",
      "qwen2.5-coder",
    ],
    requiresKey: false,
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are NullForge AI, an expert security researcher and exploit developer embedded in an AI-native IDE. You specialize in:
- Exploit development (buffer overflows, heap exploitation, ROP chains, kernel exploits)
- Reverse engineering (disassembly, decompilation, binary analysis)
- Vulnerability research (CVE analysis, fuzzing strategies, root cause analysis)
- Shellcode and payload crafting (x86/x64/ARM assembly, encoders, stagers)
- Network security (protocol analysis, traffic inspection, C2 frameworks)
- CTF challenges and security competitions

Provide precise, technical answers. When generating code or shellcode, use fenced code blocks with the appropriate language tag. Be concise but thorough. Assume the user is an experienced security professional.`;
