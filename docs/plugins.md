# Plugin System

NullForge supports a YAML-based plugin system for extending functionality with custom tools and scripts.

## Plugin Directory

Plugins are stored in the app data directory:

```
~/Library/Application Support/com.nullforge.ide/plugins/   (macOS)
~/.local/share/com.nullforge.ide/plugins/                   (Linux)
%APPDATA%\com.nullforge.ide\plugins\                        (Windows)
```

Each plugin is a directory containing a `manifest.yaml` file.

## Plugin Manifest

```yaml
id: my-plugin
name: My Custom Plugin
version: 1.0.0
description: What this plugin does
author: Your Name
entry: script.py        # or script.sh, binary, etc.
type: tool              # tool | analyzer | generator
enabled: true
tags:
  - reversing
  - automation
```

## Plugin Types

| Type | Description |
|------|-------------|
| `tool` | Standalone tool with custom UI panel |
| `analyzer` | Binary analysis plugin (receives binary path) |
| `generator` | Payload/shellcode generator |

## Managing Plugins

Open the **Plugin Manager** via **View → Plugins**:
- Lists all installed plugins with enable/disable toggle
- Shows plugin details, version, and description
- Click a plugin to open its detail view

## Installing a Plugin

1. Create a directory under the plugins folder with your plugin ID
2. Add a `manifest.yaml`
3. Add your script/binary
4. Restart NullForge or use **Plugins → Reload**

## Example Plugin

```
plugins/
└── my-checksec/
    ├── manifest.yaml
    └── checksec.sh
```

`manifest.yaml`:
```yaml
id: my-checksec
name: Checksec
version: 1.0.0
description: Check binary security protections
author: Joas A Santos
entry: checksec.sh
type: analyzer
enabled: true
```

`checksec.sh`:
```bash
#!/bin/bash
checksec --file="$1"
```

The plugin receives the binary path as `$1` when triggered from the UI.

## Future Plugin APIs

The plugin API is being expanded to support:
- Custom sidebar panels
- Editor context menu items
- AI prompt templates
- Disassembler annotations
