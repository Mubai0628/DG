# Desktop Manual QA v0.1

This checklist verifies the local desktop web-table-to-CSV workflow before a
desktop release candidate. It uses the bundled sanitized fixture and does not
call DeepSeek.

## A. Before Launch

Run the offline gates:

```powershell
pnpm verify:ci
pnpm release:smoke
pnpm app:preflight
git status --short
```

Confirm generated directories are ignored and not staged.

## B. Clean The Demo Workspace

Use the demo workspace or another local test folder:

```powershell
Remove-Item D:\workspaces\demo\drafts\*.csv -ErrorAction SilentlyContinue
Remove-Item D:\workspaces\demo\.deepseek-workbench\events.jsonl -ErrorAction SilentlyContinue
```

## C. Start The Desktop Shell

```powershell
pnpm app:dev
```

## D. First Success Path

In the desktop window:

- Workspace root: `D:\workspaces\demo`
- Payload JSON file: `runtime/test/fixtures/web-table-sample-payload.json`
- Draft filename: `web-table-export.csv`

Click **Convert**.

Expected:

- `D:\workspaces\demo\drafts\web-table-export.csv` exists.
- The Result panel shows the draft path, row count, column count, warning
  count, formula escaped count, Event log events, and replay draft count.
- Event Log / Replay shows event count, draft count, completed task count, and
  a timeline.
- The UI does not show `Desktop shell recovered from a UI error.`

## E. Refresh Path

Click **Refresh events**.

Expected:

- The window does not go blank.
- Workspace, payload, filename, result, and event timeline remain visible.
- Event Log / Replay either refreshes or keeps the same safe summary.

## F. Docs Path

Click **Event log smoke**.

Expected:

- The UI shows `Local docs path: docs/desktop-event-log-smoke-v0.1.md`.
- The WebView does not navigate away.
- Workspace, payload, filename, result, and event timeline remain visible.

## G. Duplicate Filename

Click **Convert** again with `web-table-export.csv`.

Expected:

- The UI shows a safe `FILE_EXISTS` style error.
- The message tells the user to choose a new draft filename or remove the
  existing file.
- It does not show a raw stack, raw payload, raw CSV, or API key.

## H. Second Success

Change the filename to:

```text
web-table-export-2.csv
```

Click **Convert**.

Expected:

- `D:\workspaces\demo\drafts\web-table-export-2.csv` exists.
- Event Log / Replay refreshes.
- Replay draft count is at least `2` if the previous event log was preserved.

## I. Safety Checks

Confirm the UI does not display:

- raw CSV content
- raw browser DOM
- full URL query strings
- API keys or authorization headers
- `PASSWORD_VALUE_MARKER` when the event payload only includes
  `passwordValuesDropped: true`

## J. Current Limitations

v0.1 intentionally does not include:

- `nativeMessaging`
- an automatic extension-to-app bridge
- desktop action or desktop control
- MCP, shell, or UI automation
- a memory system
- real DeepSeek calls in this local desktop flow
- a fully bundled standalone packaged runner
