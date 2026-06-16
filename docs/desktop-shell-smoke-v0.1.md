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

`pnpm app:dev` starts the Tauri desktop shell. The shell starts the frontend dev
server on `http://localhost:5179` with a strict port. If the port is already in
use, close the existing process before retrying.

For frontend-only debugging, run:

```bash
pnpm --filter @deepseek-workbench/app dev
```

This starts only the Vite dev server on port `5179`; it does not open the Tauri
desktop shell.

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

For the manual-smoke preflight gate, run:

```bash
pnpm app:preflight
pnpm app:manual-smoke:check
```

`pnpm app:preflight` checks the fixed runner, Node runtime, fixture conversion,
and safe invalid-payload failure path. `pnpm app:manual-smoke:check` checks that
the bundled payload fixture and desktop smoke docs exist, then runs the fixed
local runner against a temporary workspace. Neither command opens the GUI or
calls DeepSeek.

## Runner Safety

The desktop shell invokes only the repository-controlled runner at
`app/scripts/run-flow.mjs`. It passes arguments as an array, strips secret-like
environment variables before launching the child process, enforces a runner
timeout, and accepts only the redacted JSON summary contract returned by the
runner. Errors shown in the UI are safe summaries and do not include the raw
payload or CSV content.

Payload JSON is limited to 2 MB for pasted text and selected JSON files. CSV
draft filenames are still validated by the runtime workspace draft writer, which
keeps output under `<workspace>/drafts/`.

To see a safe invalid-payload error, paste malformed JSON and click **Convert**.
To see the size-limit path, select or paste a payload larger than 2 MB. Timeout
handling is covered by the automated app tests rather than a manual GUI step.

For packaged/release build readiness and current standalone limitations, see
`docs/desktop-packaging-v0.1.md` and
`docs/desktop-packaging-strategy-v0.1.md`.

For the Event Log / Replay panel smoke, see
`docs/desktop-event-log-smoke-v0.1.md`.

## Current Limitations

- No native browser bridge.
- No automatic extension integration.
- No desktop control.
- No DeepSeek Agent planning.
- No MCP, arbitrary shell, or memory system.
- No automatic file read beyond a user-provided payload file in the desktop UI.
