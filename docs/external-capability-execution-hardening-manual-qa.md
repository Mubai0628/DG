# External Capability Execution Hardening Manual QA

Use this checklist for manual GUI QA before publishing
`v0.30.0-external-capability-execution-hardening-rc.1`.

## A. Pre-check

- Run `git status --short` and confirm only intended release files are present.
- Run `git log --oneline origin/main..HEAD` and confirm the P1H commits are in
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
- Filename: `web-table-export-p1h.csv`.
- Click Convert.
- Verify the CSV exists.

## D. Event / Projection

- Open Event Log / Replay.
- Confirm events, drafts, replay summaries, and timeline projections remain
  visible.
- Confirm Refresh events does not break surfaces.

## E. External Capability Audit Panel

- Open External Capability Audit.
- Confirm the panel says `Read-only / no external execution`.
- Click `Preview External Capability Audit`.
- Confirm summary counts render without raw output.
- Confirm `Invoke External Capability (disabled)` is disabled.
- Confirm `Run Plugin (disabled)` is disabled.
- Confirm `Run Skill (disabled)` is disabled.
- Confirm `Execute Mutating MCP Tool (disabled)` is disabled.

## F. MCP Read-only Consistency Summary

- Paste a summary-only MCP read-only consistency report.
- Confirm MCP read-only consistency is displayed as summary-only.
- Confirm mutating MCP tool signals are blocked or reported as blockers.
- Confirm no mutating MCP tool can be invoked from the App Shell.

## G. Plugin / Skill Blocked Signals

- Paste a summary-only plugin/skill sandbox report with blocked signals.
- Confirm postinstall, skill runtime, plugin runtime, native bridge, desktop
  action, shell, and network signals remain blocked.
- Confirm plugin/skill code is not executed.

## H. Redaction Audit

- Paste a summary with raw output, stdout/stderr, raw package content, source,
  diff, prompt, response, token, Authorization, or API key markers.
- Confirm raw output is blocked.
- Confirm no raw output, raw package metadata, raw prompt, raw response, raw
  source, raw diff, stdout/stderr, token, Authorization, or API key appears in
  the rendered surface.

## I. Existing Approved Apply / Rollback

- Confirm approved apply / rollback surfaces still require the existing human
  approval and typed confirmation path.
- Confirm App broad apply / rollback controls are not enabled by the external
  capability audit.
- Confirm rollback remains bounded and replayable.

## J. Git / Shell Safe Lanes

- Confirm Git / shell verification surfaces still expose only fixed safe lanes.
- Confirm no arbitrary Git command input is enabled.
- Confirm no arbitrary shell command input is enabled.
- Confirm no external capability audit result can execute Git or shell.

## K. Duplicate Filename

- Run Convert again with the same filename.
- Confirm the App returns a safe `FILE_EXISTS` style error.

## L. Safety

- Confirm no raw CSV is displayed.
- Confirm no raw DOM is displayed.
- Confirm no raw source is displayed.
- Confirm no raw prompt is displayed.
- Confirm no raw response is displayed.
- Confirm no raw diff is displayed.
- Confirm no raw tool output is displayed.
- Confirm no raw package metadata is displayed.
- Confirm no stdout/stderr is persisted as raw content.
- Confirm no API key is displayed.
- Confirm no `PASSWORD_VALUE_MARKER` false positive appears in safe summaries.

## M. Current Limitations

- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No native bridge.
- No desktop broad action.
- No arbitrary Git/shell execution.
- No broad PermissionLease.
- No autonomous arbitrary tool execution.
