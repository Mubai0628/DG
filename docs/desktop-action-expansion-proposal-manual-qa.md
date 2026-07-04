# Desktop Action Expansion Proposal Manual QA

Use this checklist for
`v0.26.0-desktop-action-expansion-proposal-rc.1`.

## A. Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## B. Start

- Run `pnpm app:dev`.
- Confirm the App Shell opens without enabling native bridge actions.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p1d.csv`
- Click Convert.
- Verify the CSV exists and the result panel still shows Event log events.

## D. Desktop Observer Metadata Summary

- Run the Desktop Observer metadata-only flow.
- Confirm the observer surface shows foreground/window/app/display summaries.
- Confirm no raw screenshot or OCR text is displayed.
- Confirm no native bridge action is performed.

## E. Expanded Desktop Action Proposal Surface

- Paste a safe `desktop_action_expansion_proposal` JSON draft.
- Click `Preview Proposal`.
- Confirm the App shows:
  - action kind
  - target summary
  - freshness summary
  - risk summary
  - simulation summary
  - warning/blocker counts
  - no_compress_zone ref
- Confirm the surface remains read-only.

## F. Stale Target Proposal

- Paste an expanded proposal with stale observer evidence.
- Confirm it is blocked before any action.
- Confirm no click/type/select/clipboard/file dialog action occurs.

## G. Sensitive UI Risk

- Paste a proposal targeting password, credential, payment, destructive,
  system, security, upload, send, or delete UI summaries.
- Confirm risk classification is high or blocked.
- Confirm no desktop action execution is enabled.

## H. Clipboard Proposal

- Paste a clipboard proposal summary.
- Confirm it is proposal-only or blocked by risk/simulation.
- Confirm clipboard content is not displayed.
- Confirm the system clipboard is not written.

## I. File Dialog Proposal

- Paste a file dialog proposal summary.
- Confirm it is proposal-only or blocked by risk/simulation.
- Confirm no file dialog opens.
- Confirm raw paths are not displayed.

## J. Disabled Controls

- Confirm `Execute Click (disabled)` is disabled.
- Confirm `Type Text (disabled)` is disabled.
- Confirm `Write Clipboard (disabled)` is disabled.
- Confirm `Open File Dialog (disabled)` is disabled.
- Confirm no enabled click/type/select/clipboard/file-dialog/drag-drop control
  exists.

## K. Event / Replay

- Refresh events.
- Confirm Event Log / Replay remains usable.
- Confirm expanded desktop action proposal preview does not write events.
- Confirm replay does not execute desktop actions.

## L. Duplicate Filename

- Convert the same filename again.
- Confirm the App returns a safe `FILE_EXISTS` error.

## M. Safety

- No raw CSV.
- No raw DOM.
- No raw source.
- No raw prompt.
- No raw response.
- No raw screenshot.
- No raw OCR.
- No raw diff.
- No API key.
- No clipboard content.
- No file dialog raw path.
- No `PASSWORD_VALUE_MARKER` false positive.

## N. Current Limitations

- No real click.
- No real type.
- No real select.
- No clipboard write.
- No file dialog automation.
- No drag/drop execution.
- No broad native bridge.
- No remote control.
- No autonomous desktop agent.
