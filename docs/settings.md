# Settings

Open Settings with `Cmd+,` or **File → Settings**.

## Tabs

### Providers

Configure your AI provider:

| Field | Description |
|-------|-------------|
| Provider | Claude (Anthropic) / OpenAI / Ollama |
| API Key | Your Anthropic or OpenAI API key |
| Model | Model to use (e.g. `claude-sonnet-4-6`, `gpt-4o`) |
| Ollama Endpoint | URL for local Ollama server (default: `http://localhost:11434`) |

Keys are stored in `localStorage` within the app — they never leave your machine except as part of API requests to the respective provider.

### Appearance

| Setting | Options |
|---------|---------|
| Theme | Dark (default) / Light |
| Editor font size | 10–24px |
| Editor font family | JetBrains Mono, Fira Code, Cascadia Code, Menlo, etc. |
| Tab size | 2 / 4 spaces |

### Keybindings

Displays the full keyboard shortcut reference. See [Keyboard Shortcuts](shortcuts.md) for the complete list.

### About

Shows:
- NullForge version
- Creator: **Joas A Santos** — Null Forge
- Technology stack
- License (MIT)

## Import / Export Settings

Use the **Export Settings** / **Import Settings** buttons in the Settings modal to back up and restore your configuration as a JSON file.

## Reset

Clear all settings and return to defaults via the reset button at the bottom of the Settings modal.
