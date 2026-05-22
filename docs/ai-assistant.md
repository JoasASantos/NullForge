# AI Assistant

NullForge integrates AI assistance at two levels: a persistent **AI Panel** on the right side and an **Inline AI** triggered directly in the editor.

## Supported Providers

| Provider | Models | Notes |
|----------|--------|-------|
| Claude (Anthropic) | claude-sonnet-4-6 | Recommended — best for security tasks |
| OpenAI | gpt-4o | Requires API key |
| Ollama | llama3.2, codellama, etc. | Local / offline — no API key needed |

## Configuration

Go to **Settings → Providers** (`Cmd+,`) to configure your AI provider:

1. Select a provider (Claude / OpenAI / Ollama)
2. Enter your API key (or Ollama endpoint URL)
3. Keys are stored locally and never sent to NullForge servers

> For Ollama, ensure the server is running (`ollama serve`) and at least one model is pulled (`ollama pull llama3.2`).

## AI Panel (Right Panel)

Open with `Cmd+Shift+B` or `Cmd+5`.

The AI panel provides a full chat interface. You can:
- Ask about exploitation techniques
- Request code generation (shellcode, ROP chains, fuzzing harnesses)
- Explain disassembly output
- Analyse binary behaviour
- Get CVE details and PoC explanations

### Conversation History

Conversations are saved per-project and accessible via the conversation list at the top of the panel. Sessions persist between app restarts.

## Inline AI (`Cmd+K`)

Press `Cmd+K` anywhere in the editor to open the **Inline AI** popup:

1. Type a prompt (e.g. "generate a heap spray for this target")
2. Press Enter
3. The AI response is inserted at the cursor position or replaces the selected text

### Example Prompts

```
Generate a Python exploit for a buffer overflow with offset 72 and ret address 0xdeadbeef
```

```
Explain what this ARM64 function does:
stp x29, x30, [sp, #-0x30]!
mov x29, sp
```

```
Write a shellcode stager that reads a second stage from stdin and executes it
```

```
Find potential use-after-free vulnerabilities in this C code
```

## Tips

- **Context-aware**: The AI sees your current file content when you use Inline AI — no need to paste code
- **Security focus**: All providers are used without system-prompt restrictions in NullForge — you get direct, unfiltered security assistance
- **Offline option**: Use Ollama with `codellama:13b` or `deepseek-coder` for sensitive research without network calls
