# Desktop Observer Manual QA

Use this checklist for `v0.23.0-desktop-observer-mvp-rc.1`.

## A. Pre-Check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## B. Start

- Start the App Shell with `pnpm app:dev`.
- Confirm the App opens to the local desktop shell.

## C. Convert Smoke

- Use workspace `D:\workspaces\demo`.
- Use payload `runtime/test/fixtures/web-table-sample-payload.json`.
- Use filename `web-table-export-p1a.csv`.
- Run Convert.
- Verify the CSV draft exists under `workspace/drafts/`.

## D. Desktop Observer

- Confirm the Desktop Observer panel is visible.
- Click `Preview Desktop Observation Profile`.
- Click `Observe Desktop Metadata`.
- Verify foreground/window/app/display metadata appears as summary only.
- Verify no click/type/select controls are enabled.
- Verify raw screenshot capture is disabled.
- Verify send-to-model is disabled.
- Verify redaction warnings appear for titles/process metadata when present.
- Verify the redaction audit summary is visible.
- Verify evidence ref count is summary-only.

## E. Existing Surfaces

- Refresh events still works.
- Approved apply still requires human approval and typed confirmation.
- Approved rollback still requires the rollback receipt and confirmation.
- Event Log / Replay still shows summary events.
- Git/shell verification safe lanes remain fixed and summary-only.
- MCP read-only tool execution remains approved/read-only/bounded.
- Fixed multi-agent execution remains fixed-route and no dynamic bidding.

## F. Safety

- No desktop action.
- No click/type/select.
- No clipboard write.
- No file dialog automation.
- No hidden background capture.
- No screen recording.
- No raw screenshot persistence by default.
- No OCR persistence by default.
- No send-to-model behavior.
- No native bridge / desktop action.

## G. Duplicate Filename

- Convert the same filename again.
- Verify the App reports a safe `FILE_EXISTS` error.

## H. Current Limitations

- no remote control
- no autonomous desktop agent
- no native bridge broad action
- no default raw screenshot persistence
- no default OCR persistence
