# Desktop Operator Recovery Hardening Manual QA

Use this checklist for manual GUI QA before publishing
`v0.31.0-desktop-operator-recovery-hardening-rc.1`.

## A. Pre-check

- Run `git status --short` and confirm only intended release files are present.
- Run `git log --oneline origin/main..HEAD` and confirm the P1I commits are in
  order.
- Run `pnpm verify:ci`.
- Run `pnpm release:smoke`.
- Run `pnpm app:qa:check`.

## B. Start

- Start the App Shell with `pnpm app:dev`.
- Keep ports `5173` and `5174` reserved for other projects; use another port if
  the dev server needs one.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`.
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`.
- Filename: `web-table-export-p1i.csv`.
- Click Convert.
- Verify the CSV exists.
- Run Convert again with the same filename and confirm the safe `FILE_EXISTS`
  style error.

## D. Event / Projection

- Open Event Log / Replay.
- Confirm events, drafts, replay summaries, and timeline projections remain
  visible.
- Confirm Refresh events does not break surfaces.

## E. Desktop Observer Panel

- Open Desktop Observer.
- Confirm the panel remains metadata-only.
- Confirm no raw screenshot, raw OCR, or raw target text appears.
- Confirm no screen recording, hidden background control, or remote control is
  enabled.

## F. Desktop Action Proposal Panel

- Open Desktop Action Proposal.
- Confirm the panel remains proposal-first.
- Confirm action proposals depend on Desktop Observer evidence refs.
- Confirm there is no arbitrary click/type execution.

## G. Approved Desktop Action Surface

- Open Approved Desktop Action.
- Confirm approved desktop actions remain bounded and human-approved.
- Confirm typed confirmation is required for supported lanes.
- Confirm clipboard write by default, file dialog automation, broad native
  bridge, remote control, and hidden background action are not enabled.

## H. Expanded Action Proposal Surface

- Open Expanded Desktop Action Proposal and Approved Expanded Desktop Action.
- Confirm focus/click/type summaries stay bounded by target refs, hashes, and
  typed approvals.
- Confirm no arbitrary drag/drop, file dialog, clipboard, or native bridge broad
  action is available.

## I. Recovery Surface

- Open Desktop Operator Recovery.
- Paste or load `app/test/fixtures/desktop-operator-recovery-smoke.json`.
- Confirm mismatch, stale target, interruption, and compensation summaries
  render.
- Confirm Retry Desktop Action is disabled.
- Confirm Run Undo Action is disabled.
- Confirm no retry, undo, click, type, clipboard, file dialog, replay execution,
  EventStore write, Tauri call, or native bridge action is enabled.

## J. Replay Privacy Audit

- Open Desktop Action Replay Privacy Audit.
- Paste or load the replay privacy audit summary from the recovery smoke
  fixture.
- Confirm replay completeness and privacy counts render.
- Confirm Replay Execution is disabled.
- Confirm Re-run Desktop Action is disabled.
- Confirm replay does not re-execute any desktop action.

## K. Safety

Confirm no surface displays or persists:

- no raw screenshot
- no raw OCR
- no raw target text
- no raw clipboard
- no raw CSV
- no raw DOM
- no raw prompt
- no raw response
- no raw source
- no raw diff
- no API key
- no `PASSWORD_VALUE_MARKER` false positive in safe summaries

## L. Current Limitations

- No broad desktop automation.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation.
- No screen recording.
- No hidden background control.
- No remote control.
- No native bridge broad action.
- No replay re-execution.
- No autonomous desktop agent.
- No arbitrary Git/shell execution.
- No broad PermissionLease.
