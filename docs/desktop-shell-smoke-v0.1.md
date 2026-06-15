# Desktop Shell Smoke v0.1

The desktop shell is a local Tauri wrapper around the existing
web-table-to-CSV flow. It does not connect to the browser extension
automatically and does not call DeepSeek.

## Prerequisites

- Node.js and pnpm matching the repository toolchain.
- Rust toolchain for `pnpm app:dev`.
- A sanitized `BrowserDomPayload` JSON file from the browser extension, or the
  bundled fixture at `runtime/test/fixtures/web-table-sample-payload.json`.
- An existing local workspace directory.

## Run The Shell

```bash
pnpm install
pnpm app:dev
```

In the desktop window:

1. Enter the workspace root path.
2. Paste the sanitized payload JSON, or select a local JSON file.
3. Enter a CSV filename such as `table.csv`.
4. Click **Convert**.

## Expected Output

The result panel should show:

- draft relative path under `drafts/`
- absolute draft path
- rows and columns
- warning count
- injection risk count
- formula escaped count
- event count
- replay draft count

The CSV is written under:

```text
<workspace>/drafts/
```

The event log is written under:

```text
<workspace>/.deepseek-workbench/events.jsonl
```

## Offline Smoke

```bash
pnpm app:smoke
```

This runs app typecheck, app tests, and a fixed local runner smoke using the
safe fixture. It does not open the GUI.

## Current Limitations

- No native browser bridge.
- No automatic extension integration.
- No desktop control.
- No DeepSeek Agent planning.
- No MCP, arbitrary shell, or memory system.
- No automatic file read beyond a user-provided payload file in the desktop UI.
