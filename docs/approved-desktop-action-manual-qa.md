# Approved Desktop Action Manual QA

Use this checklist after the local full gates pass and before publishing
`v0.25.0-approved-desktop-action-execution-mvp-rc.1`.

## A. Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## B. Start

- Run `pnpm app:dev`.
- Confirm the App Shell opens from the source tree.
- Keep the Runner preflight wording on source-tree mode and no native bridge.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Output filename: `web-table-export-p1c.csv`
- Click Convert.
- Verify the CSV exists.
- Run the same filename again and verify the `FILE_EXISTS` safe error.

## D. Event / Projection

- Open Event Log / Replay.
- Verify events, drafts, and timeline summaries still render.
- Verify the Result section still says `Event log events`.

## E. Desktop Observer Metadata Smoke

- Open Desktop Observer.
- Confirm the badge remains read-only / no desktop action.
- Preview or observe metadata only.
- Verify no click, type, select, clipboard, file dialog, raw screenshot, OCR,
  model-send, hidden capture, or native bridge controls are enabled.

## F. Desktop Action Proposal Focus Window

- Paste or load the safe focus-window proposal fixture.
- Verify target validation, risk classifier, simulation, and capability planning
  summaries render.
- Confirm it remains proposal-first and summary-only.
- Confirm no click/type/select, clipboard write, file dialog automation, hidden
  capture, remote control, or broad native bridge appears enabled.

## G. Receipt Typed Confirmation

- Open Approved Desktop Action.
- Confirm the badge says `Human approved / narrow desktop action`.
- Enter the exact typed confirmation for the focus action.
- Confirm the receipt becomes ready only after the exact confirmation.
- Confirm the command request is limited to focus, raise, or activate observed
  windows.

## H. Approved Action Execution

- Trigger the approved desktop action command only after the receipt is ready.
- On supported platforms, verify a summary-only `executed` result.
- If the platform is unsupported, verify `unsupported_platform` is a safe
  summary-only result.
- Confirm no EventStore write happens from this command.

## I. Event Log / Replay Summary

- Verify the Desktop Action Replay surface shows action status, action kind,
  target refs, timestamp, warning codes, event hash, and replay hash.
- Verify replay does not re-execute a desktop action.
- Verify the replay surface cannot write events.

## J. Privacy Audit

- Verify no raw screenshot is displayed.
- Verify no OCR text is displayed.
- Verify no window content, clipboard content, raw prompt, raw source, raw diff,
  API key, or secret marker is displayed.
- Verify the approved desktop action smoke doc and fixture remain summary-only.

## K. Current Limitations

- no arbitrary desktop action
- no click/type/select
- no drag/drop
- no clipboard write
- no file dialog automation
- no screen recording
- no hidden capture
- no remote control
- no dynamic agent desktop control
- no native bridge broad action
- no autonomous desktop agent
- no replay re-execution
