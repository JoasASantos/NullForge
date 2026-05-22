# Payload Library

The Payload Library provides a curated, searchable database of shellcodes, reverse shells, and exploit primitives — ready to copy or open directly in the editor.

## Accessing the Library

- Click the **Payloads** icon in the Activity Bar (left sidebar)
- Or via **View → Payload Library** in the menu bar

## Categories

| Category | Description |
|----------|-------------|
| Shellcode | Raw shellcode bytes (execve, bind/reverse shells, etc.) |
| Reverse Shell | One-liner reverse shells (bash, python, ruby, nc, etc.) |
| Stager | Shellcode stagers / downloaders |
| Persistence | Techniques for maintaining access |
| Privilege Escalation | Local privesc snippets |
| Evasion | AV/EDR bypass techniques |

## Filtering

Use the filter controls at the top of the library to narrow results by:
- **Category**
- **Platform** (Linux, Windows, macOS, Android)
- **Architecture** (x64, x86, ARM64, ARM)

## Payload Detail

Click any payload to open the detail view:
- Full description
- Raw content with copy button
- Architecture and platform tags
- **Open in Editor** button — creates a new editor tab with the payload content

## ExploitDB Browser

The **ExploitDB** sidebar tab provides a local database of exploit templates:
- Search by CVE ID, title, or category
- View reliability rating and CVSS score
- Open source code in the editor
- External references and affected versions

## Adding Custom Payloads

Currently payloads are stored in the SQLite database (`nullforge.db` in the app data directory). Custom payloads can be added by directly inserting into the database or via the planned UI (future release).

## Encoding

Some payloads support encoding options:
- `raw` — raw bytes (default)
- `hex` — hex-encoded string
- `base64` — base64-encoded

Use the Shellcode Generator panel to apply additional encodings and transformations.
