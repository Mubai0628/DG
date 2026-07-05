# Runtime Desktop Action Mismatch Recovery v0.31

`runtime/src/desktop/desktop-action-mismatch-recovery.ts` builds a
summary-only recovery report when approved desktop action results do not match
the expected target summary.

## Scope

- Runtime pure helper only.
- No desktop action execution.
- No automatic retry.
- No undo execution.
- No replay re-execution.
- No Tauri command.
- No EventStore write.
- No native bridge.

## Inputs

The helper accepts only summary refs:

- observer evidence summary
- desktop action proposal summary
- approval receipt summary
- execution result summary
- expected target summary
- observed after-action target summary

It blocks raw screenshot, screenshot bytes, raw OCR, raw target text, raw
clipboard content, raw prompt, raw response, raw source, raw diff, API key,
Authorization, bearer token, password, secret, native bridge, desktop command,
shell command, Git command, EventStore write, retry execution, undo execution,
and desktop execution readiness flags.

## Mismatch Kinds

- `target_window_missing`
- `target_window_changed`
- `target_app_changed`
- `screen_topology_changed`
- `focus_lost`
- `bounds_changed`
- `action_result_unknown`
- `simulated_vs_observed_mismatch`
- `unsupported_platform`
- `privacy_boundary_blocked`

## Output

The report includes:

- `status`: `empty`, `recovery_ready`, `warning`, or `blocked`
- mismatch counts and kinds
- warning and blocker codes
- summary-only recommendations
- recommended next action
- all execution readiness flags false

The report does not include raw screenshot, OCR, target text, prompt, response,
source, diff, clipboard, or API key values.

## Relation to P1I

This is the first runtime recovery contract for P1I. Later tasks add stale
target recovery, interruption/focus-loss handling, compensation summaries,
App read-only aggregation, replay completeness, privacy audit, and golden
smoke.

## Non-goals

- No broad desktop automation.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation.
- No remote control.
- No native bridge.
- No desktop action replay re-execution.
