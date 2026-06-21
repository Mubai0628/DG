# App Shell Workspace Index Bridge v0.3

The Workspace Index bridge is a read-only App Shell surface for loading a
summary-only `WorkspaceIndex` JSON export into local React state. It is a bridge
from the runtime Workspace Read / Index model to the desktop preview surfaces,
not a workspace scanner.

## Scope

- Accept pasted or selected `WorkspaceIndex` summary JSON.
- Show file, indexed, skipped, language, directory, symbol, byte, line, warning,
  and hash-prefix summaries.
- Share only summary refs and counts with Run Canvas, Context Cart, Agent Route
  Preview, and Capability Plan Preview.
- Keep all state local to the App Shell.

## Safety Rules

The bridge rejects summaries that contain raw file content fields such as
`content`, `beforeContent`, `afterContent`, `rawSource`, raw diff fields, raw
prompt markers, raw DOM markers, raw CSV markers, screenshots, clipboard data,
API-key-like strings, bearer tokens, authorization headers, or private key
markers.

The bridge also rejects unsafe paths, including absolute paths, Windows drive
paths, UNC paths, parent traversal, `.git`, `.env`, `.env.*`, `node_modules`,
`dist`, `target`, `.tmp`, URL/query-like paths, shell metacharacters, and
private-key-looking paths.

Only safe paths, counts, warning codes, hash prefixes, and summary ids are
displayed. Raw source content is not accepted or displayed.

## Integration

- Run Canvas may show whether a workspace index summary is loaded and how many
  files were indexed.
- Context Cart may mention that a workspace index summary is available for a
  future volatile-tail or task-contract preview.
- Agent Route Preview may reference the workspace index as a display-only
  evidence/context ref.
- Capability Plan Preview may show `native.workspace.index` as a planning-only
  descriptor backed by the loaded summary.

None of these integrations assemble context, create a run, invoke a capability,
write events, or read the workspace filesystem.

## Non-Goals

- No real workspace scanner in the App Shell.
- No filesystem crawling.
- No `.env` or secret file reads.
- No EventStore write.
- No Tauri command.
- No patch apply.
- No Git execution.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.
