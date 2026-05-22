# Workspaces & Projects

## Workspaces

Workspaces are the top-level organisational unit in NullForge. Use them to group related research — for example: one workspace per engagement, CVE, or CTF competition.

### Creating a Workspace

1. Open the **Welcome Screen** (`Cmd+Shift+W` → Workspace Manager → New, or on first launch)
2. Enter a name
3. Choose a colour label
4. Click **Create Workspace**

### Switching Workspaces

- Click a workspace chip on the Welcome Screen
- Or open **Workspace Manager** via **View → Workspace Manager**

> **Note**: Switching workspaces resets the current project and closes all open editor tabs. Your files are not deleted — they are part of the project you can reopen.

### Workspace Manager

Accessible via `Cmd+Shift+W` or the menu. Shows:
- All workspaces with project counts
- Created date
- Colour picker to change label colour
- Delete workspace (cannot be undone)

---

## Projects

Projects live inside a workspace and represent a specific target, binary, or research task.

### Creating a Project

From the **Welcome Screen** (after selecting a workspace):
1. Enter a **Project Name** (e.g. `heap_overflow_cve_2025`)
2. Optional: add a description
3. Select **Target OS** (Linux, macOS, Windows, Android, FreeBSD, Solaris)
4. Select **Architecture** (x64, x86, ARM64, ARM, MIPS)
5. Click **Create Project**

The project is saved to the SQLite database with metadata. The IDE opens with the project active.

### Opening a Recent Project

The Welcome Screen shows recent projects. Click any to reopen it.

### Project Metadata

| Field | Description |
|-------|-------------|
| Name | Human-readable project name |
| Description | Optional notes |
| Target OS | Operating system of the target binary |
| Architecture | CPU architecture |
| Created at | Timestamp |

### Project File Manager

Import/export project configuration files (`.nullforge` format) via **File → Project File Manager**.

---

## Data Storage

| Data | Location |
|------|----------|
| Workspaces / Projects | `~/Library/Application Support/com.nullforge.ide/nullforge.db` (macOS) |
| Recent files | `localStorage` (browser storage within the app) |
| AI conversations | SQLite database |
| Settings / AI keys | `localStorage` |
| Plugins | `{app_data}/plugins/` |
