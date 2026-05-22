# Interface & Layout

## Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar                                              [─][□][×]│
├───┬──────────────────────────────────────────┬─────────────┤
│   │  Tab Bar                [+]              │             │
│ A │─────────────────────────────────────────│  AI Panel   │
│ c │                                          │  (Right)    │
│ t │          Main Editor / Tool Panel        │             │
│ i │                                          │             │
│ v │                                          │             │
│ i │                                          │             │
│ t ├──────────────────────────────────────────┤             │
│ y │  Bottom Panel: Shell | Output | Problems │             │
├───┴──────────────────────────────────────────┴─────────────┤
│  Status Bar                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Panels

### Activity Bar (left strip)
Icons for switching the sidebar content:
- **Explorer** — project file tree
- **Search** — full-text search
- **Payloads** — payload library
- **ExploitDB** — exploit templates
- **Sysapi** — syscall reference

### Sidebar
Expands from the Activity Bar. Toggle with `Cmd+B`.

### Main Area
The central workspace. Shows the code editor when files are open, or tool panels (Disassembler, Debugger, etc.) when opened via shortcuts or toolbar.

### Right Panel (AI)
The AI assistant panel. Toggle with `Cmd+Shift+B`.

### Bottom Panel
Three tabs: **Shell** (interactive terminal), **Output** (build/run output), **Problems** (compiler errors).  
Toggle with `Cmd+J`. Open shell directly with `Cmd+\``.

### Status Bar
Shows current project, workspace, cursor position, file language, and quick-action buttons.

## Layout Presets

Press `Cmd+Shift+L` to open the **Layout Preset Picker**:

| Preset | Description |
|--------|-------------|
| Default | Balanced layout for general use |
| Exploit Dev | Wide editor + large shell, compact AI sidebar |
| Reversing | Disassembler + Debugger central, AI on the right |
| ROP Hunting | Three-column: payloads + editor + AI |
| Fuzzing | No sidebar, wide output panel, build panel open |

## Editor Maximize

Press `Cmd+Shift+M` to toggle a full-screen editor mode — hides all panels for maximum focus.

## Tab Bar

- **Click** to switch tabs
- **Middle-click** or `Cmd+W` to close active tab
- **Drag** tabs to reorder
- `Cmd+1` through `Cmd+9` to jump to tab by position
- `Cmd+Option+→` / `Cmd+Option+←` to cycle tabs
