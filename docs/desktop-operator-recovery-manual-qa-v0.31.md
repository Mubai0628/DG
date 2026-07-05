# Desktop Operator Recovery Manual QA v0.31

Use this checklist after the scoped automated checks pass. It is a manual smoke
guide only; do not run broad desktop automation.

## Pre-check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
```

## Start App

```powershell
pnpm app:dev
```

Use a non-reserved port if the dev server asks for one.

## Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p1i.csv`
- Run Convert.
- Verify the CSV exists.
- Run the same filename again and verify the safe `FILE_EXISTS` error.

## Desktop Operator Recovery Smoke

- Open the Desktop Observer panel and confirm it remains metadata-only.
- Open Desktop Action Proposal and confirm proposal-first wording.
- Open the Approved Desktop Action and Expanded Desktop Action surfaces and
  confirm bounded human-approved summaries.
- Paste or load the recovery smoke fixture summary.
- Confirm Desktop Operator Recovery shows mismatch, stale target, interruption,
  and compensation summaries.
- Confirm Desktop Action Replay Privacy Audit shows replay completeness and
  privacy counts.
- Confirm Retry Desktop Action is disabled.
- Confirm Run Undo Action is disabled.
- Confirm Replay Execution is disabled.
- Confirm Re-run Desktop Action is disabled.

## Privacy Checks

Confirm no surface displays or persists:

- no raw screenshot
- no raw OCR
- no raw target text
- no raw clipboard
- no raw prompt
- no raw response
- no raw source
- no raw diff
- no API key

## Boundary Checks

Confirm the App Shell does not:

- retry or undo a desktop action
- replay desktop execution
- click, type, select, or use clipboard from recovery
- open file dialogs
- write EventStore recovery events
- use native bridge broad action
- enable remote control
- run hidden background desktop actions

## Refresh

- Run Refresh events.
- Confirm Event Log / Replay remains usable.
- Confirm recovery and replay audit surfaces remain read-only.

## Current Limitations

- No broad desktop automation.
- No replay re-execution.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation.
- No remote control.
- No autonomous desktop agent.
- No native bridge broad action.
