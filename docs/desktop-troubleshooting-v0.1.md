# Desktop Troubleshooting v0.1

This guide covers the local desktop shell for the web-table-to-CSV workflow.
The shell uses a fixed local runner and does not call DeepSeek.

## App Window Does Not Start

Run:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm app:preflight
pnpm app:dev
```

If the Tauri window still does not open, keep the terminal output and any
DevTools red error. Do not paste private payloads or secrets into an issue.

## Port 5179 Already In Use

The frontend dev server uses a strict local port:

```text
http://localhost:5179
```

Close the process using that port, then rerun:

```powershell
pnpm app:dev
```

Do not switch to a random port for v0.1 manual QA.

## Convert Shows FILE_EXISTS

The draft writer does not overwrite by default. Choose a new filename such as:

```text
web-table-export-2.csv
```

or remove the existing draft from:

```text
<workspace>\drafts\
```

## Workspace Invalid

The workspace root must be an existing local directory. Create it first, then
retry Convert.

## Payload Too Large

Pasted or selected payload JSON is limited to 2 MB. Capture a smaller sanitized
table payload or trim the fixture used for testing.

## Invalid Payload JSON

Use a sanitized `BrowserDomPayload` JSON file. The bundled safe fixture is:

```text
runtime/test/fixtures/web-table-sample-payload.json
```

## Event Log Missing

Before the first successful Convert, the event log may not exist:

```text
<workspace>\.deepseek-workbench\events.jsonl
```

Click Convert first, then click **Refresh events**. A missing log should show a
safe empty state, not a blank screen.

## Packaged Mode Says Source Tree Required

v0.1 does not claim fully standalone packaged conversion. Use:

```powershell
pnpm app:dev
```

from the source tree, or keep the source-tree runner available until a future
standalone runner strategy is implemented.

## ErrorBoundary Appears

The UI fallback text is:

```text
Desktop shell recovered from a UI error.
```

Collect safe diagnostics:

```powershell
pnpm app:test
pnpm app:smoke
pnpm app:preflight
Get-ChildItem D:\workspaces\demo\drafts
Get-Content D:\workspaces\demo\.deepseek-workbench\events.jsonl -TotalCount 5
```

Also capture the DevTools console red error if one is visible.

## What Not To Paste Publicly

Do not paste:

- payloads containing private data
- raw CSV with private data
- API keys
- authorization headers
- environment variables
- private local file paths unless they are test-only paths
