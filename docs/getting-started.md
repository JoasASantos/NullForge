# Getting Started

## First Launch

When you open NullForge for the first time, the **Onboarding Wizard** appears with two steps:

1. **Welcome** — Overview of core features
2. **AI Configuration** — Connect Claude, OpenAI or Ollama (can be skipped)

After onboarding, the **Welcome Screen** lets you:
- Create or select a **Workspace**
- Create a new **Project** or open a recent one
- Continue without a project (direct IDE access)

## Creating a Workspace

Workspaces are top-level containers that group related projects. Think of them as research campaigns or engagement folders.

1. On the Welcome Screen, type a name under **Workspace** and pick a color
2. Click **Create Workspace**
3. The workspace is saved and selected automatically

> You can manage workspaces at any time via **View → Workspace Manager** or `Cmd+Shift+W`.

## Creating a Project

Projects live inside workspaces and hold your files, notes, and configuration.

1. Fill in **Project Name**, optional **Description**, **Target OS** and **Architecture**
2. Click **Create Project**
3. The IDE opens with the project active

## Opening the Disassembler / Debugger

Use the toolbar shortcuts or keyboard:

| Action | Shortcut |
|--------|----------|
| Open Disassembler | `Cmd+Shift+D` |
| Open Debugger | `Cmd+Shift+G` |
| Open Network Monitor | `Cmd+Shift+N` |
| Open Shellcode Panel | `Cmd+Shift+K` |

Then load a binary using the **Browse** button or paste a path directly.

## Quick Workflow Example

```
1. Create workspace "CVE-2025-XXXX"
2. Create project "heap_overflow" (Linux / x64)
3. Open editor → New File → exploit.c
4. Write exploit code
5. Build with Cmd+B (single file mode)
6. Open Debugger → load compiled binary
7. Set breakpoints → F9
8. Run → F5
9. Inspect registers and memory
10. Open Disassembler → analyze crash site
11. Build ROP chain with Cmd+Shift+R
```
