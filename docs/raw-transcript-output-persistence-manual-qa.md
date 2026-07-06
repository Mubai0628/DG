# Raw Transcript / Output Persistence Manual QA

Manual QA for `v0.35.0-raw-transcript-output-persistence-rc.1`.

## A. Pre-check

- Run `git status --short`.
- Run `git log --oneline origin/main..HEAD`.
- Run `pnpm verify:ci`.
- Run `pnpm release:smoke`.
- Run `pnpm app:qa:check`.

## B. Start

- Run `pnpm app:dev`.
- Confirm the App Shell opens in source-tree mode.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`.
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`.
- Filename: `web-table-export-p1m.csv`.
- Run Convert.
- Verify the CSV exists under `workspace/drafts/`.

## D. Transcript Viewer Empty State

- Open Transcript Viewer before any transcript is selected.
- Confirm it shows a redacted summary surface.
- Confirm raw output is not displayed.

## E. Safe Transcript Summary

- Load or create a safe transcript summary using the existing transcript store
  commands.
- Confirm transcript id, source kind, chunk count, byte count, line count,
  warning codes, hash prefixes, and workspace ref are displayed.
- Confirm raw output text is not displayed.

## F. Redaction And Retention

- Confirm redaction count is shown.
- Confirm secret marker count is shown only as a count.
- Confirm retention summary shows retain days and summary export/delete flags.
- Confirm export summary returns summary-only metadata.
- Confirm delete single transcript uses the existing transcript command path and
  does not expose raw output.

## G. Event Log / Replay

- Refresh events.
- Confirm Event Log / Replay shows transcript event count and latest transcript
  summary.
- Confirm `transcript.record.created`, `transcript.record.deleted`, and
  `transcript.record.exported_summary` are summary-only.
- Confirm no command replay is offered from the replay projection.

## H. Raw / Secret Blocked Fixtures

- Use the transcript smoke fixture to verify raw prompt and secret-field records
  are blocked.
- Confirm blocked outputs do not echo raw prompt text, raw response text,
  reasoning_content, API keys, Authorization headers, stdout/stderr, or command
  text.

## I. Disabled Controls

- Confirm `Run Command (disabled)` remains disabled.
- Confirm `Replay Command (disabled)` remains disabled.
- Confirm Full Access remains metadata preview only and is not enabled.
- Confirm no arbitrary shell or command broker is enabled.

## J. Safety Sweep

- No raw CSV.
- No raw DOM.
- No raw source.
- No raw prompt.
- No raw response.
- No reasoning_content.
- No raw diff.
- No API key.
- No PASSWORD_VALUE_MARKER false positive.

## K. Current Limitations

- No arbitrary shell.
- No command broker.
- No auto apply.
- No recursive delete.
- No Git push.
- No autonomous loop.
- No Full Access execution.
- No cloud upload.
- No telemetry upload.
