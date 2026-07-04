# Approved Expanded Desktop Action Manual QA

Use this checklist for
`v0.27.0-approved-expanded-desktop-action-execution-rc.1`.

## A. Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## B. Start

- Run `pnpm app:dev`.
- Confirm the App Shell opens without enabling broad native bridge actions.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p1e.csv`
- Click Convert.
- Verify the CSV exists and the result panel still shows Event log events.

## D. Desktop Observer Metadata Smoke

- Run the Desktop Observer metadata-only flow.
- Confirm the observer surface shows foreground/window/app/display summaries.
- Confirm no raw screenshot, OCR text, or hidden capture is displayed.
- Confirm no native bridge action is performed by the observer.

## E. Safe Click Proposal

- Preview a safe expanded desktop action proposal for a single observed target
  click.
- Confirm the proposal is summary-only and includes observer evidence,
  freshness, target, risk, and simulation summaries.
- Confirm the action remains unavailable until an approval receipt is built.

## F. Safe Type Proposal

- Preview a safe expanded desktop action proposal for a single observed text
  field type action.
- Confirm the typed value is not displayed as raw target text.
- Confirm the action remains unavailable until an approval receipt is built.

## G. Approval Receipt Typed Confirmation

- Build an Approved Expanded Desktop Action Receipt.
- Confirm the receipt requires exact typed confirmation.
- Confirm stale, mismatched, sensitive, or destructive target summaries block
  the receipt before execution.

## H. Fixed Action Execution

- For supported platforms, execute one approved safe click or one approved safe
  type through the fixed command path only.
- For unsupported platforms, confirm the result is a safe unsupported platform
  summary.
- Confirm no arbitrary desktop action control is enabled.

## I. Event Log / Replay Summary

- Refresh events.
- Confirm approved expanded desktop action events are summary-only.
- Confirm replay shows counts, refs, hashes, and safe labels only.
- Confirm replay does not execute desktop actions.

## J. Privacy Audit

- Run the privacy/redaction audit path.
- Confirm raw screenshot, OCR, raw text, raw target text, raw diff, raw prompt,
  raw response, and API key values are blocked or absent.

## K. Stale / Mismatch Block

- Use stale target metadata.
- Use screen/display mismatch metadata.
- Confirm both are blocked before any action.

## L. Sensitive / Destructive Target Block

- Use password, credential, payment, destructive, system, security, upload,
  send, or delete target summaries.
- Confirm the App blocks or marks the target as unsafe before execution.

## M. Disabled Expansion Controls

- Confirm no clipboard write control is enabled.
- Confirm no file dialog automation control is enabled.
- Confirm no drag/drop control is enabled.
- Confirm no multi-step automation control is enabled.
- Confirm no hidden/background action is enabled.

## N. Duplicate Filename

- Convert the same filename again.
- Confirm the App returns a safe `FILE_EXISTS` error.

## O. Safety

- No raw CSV.
- No raw DOM.
- No raw source.
- No raw prompt.
- No raw response.
- No raw screenshot.
- No raw OCR.
- No raw text.
- No raw diff.
- No API key.
- No clipboard content.
- No file dialog raw path.
- No `PASSWORD_VALUE_MARKER` false positive.

## P. Current Limitations

- No arbitrary click/type.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No screen recording.
- No hidden capture.
- No broad native bridge.
- No remote control.
- No autonomous desktop agent.
- No replay re-execution.
