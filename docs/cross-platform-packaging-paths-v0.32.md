# Cross-platform Packaging Paths v0.32

This document locks safe path examples for packaging and migration QA. It is a
documentation-only boundary and does not enable filesystem mutation.

## Windows Path Examples

Windows path examples use safe escaping:

```text
D:\\workspaces\\demo
D:\\DeskTopGUI\\DeepSeekGUI
```

When PowerShell commands are needed in manual QA, prefer PowerShell
`-LiteralPath` and avoid string-built delete or move operations.

## Path Ref Rules

- Use summary-only path refs in App and runtime preview surfaces.
- Keep raw filesystem paths out of persisted events unless a future explicit
  schema permits a safe ref.
- Do not show raw source, raw diff, raw prompt, raw response, API keys, or
  installer payloads.
- Treat `.git`, `.env`, dependency directories, build output, Tauri target
  output, conformance results, `.tmp`, and generated artifacts as blocked for
  mutation-oriented paths.

## Cross-platform Boundaries

- no filesystem mutation
- no EventStore write
- no auto-update
- no migration execution
- no Git/shell execution
- no native bridge
- no desktop action

## Manual Review Notes

Packaging and migration QA should review path examples on Windows, macOS, and
Linux. Windows examples should remain escaped in docs so GitHub release bodies,
Markdown previews, and shell snippets do not reinterpret the path.
