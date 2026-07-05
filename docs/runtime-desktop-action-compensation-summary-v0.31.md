# Runtime Desktop Action Compensation Summary v0.31

This document locks the P1I-005 runtime contract for undo and compensating
action summaries. The helper describes possible recovery strategies as
summary-only recommendations. It does not execute undo, retry desktop actions,
replay desktop actions, apply workspace patches, rollback workspace patches,
call Tauri, write EventStore entries, use Git or shell, or call a native bridge.

## Compensation Kinds

The runtime helper recognizes:

- `no_safe_undo`
- `refocus_previous_window`
- `restore_previous_selection`
- `clear_pending_text_input`
- `manual_user_review_required`
- `rerun_observation_required`
- `rollback_workspace_action_if_linked`

High-risk compensation summaries require manual review. Linked workspace
rollback remains summary-only and must use the existing workspace rollback
preview chain; this helper does not trigger rollback.

## Output

The report contains:

- compensation status
- action and recovery summary refs
- compensation kind list
- summary-only compensation items
- risk levels and manual-review flags
- blocker and warning counts
- all undo, compensation, desktop action, apply, rollback, EventStore, native
  bridge, Git, and shell readiness flags false

## Safety Boundary

The helper blocks raw screenshot, raw OCR, raw target text, raw prompt, raw
response, raw source, raw diff, raw DOM, clipboard content, API key markers,
secret markers, desktop command fields, native bridge fields, Git/shell fields,
EventStore write fields, apply fields, rollback fields, retry fields, undo
fields, and execution readiness attempts.

The output is summary-only and never includes raw screenshot, raw OCR, raw target
text, raw prompt, raw response, raw source, raw diff, raw DOM, clipboard content,
API key values, command payloads, undo payloads, or rollback payloads.

## Non-Goals

- No undo execution.
- No compensating action execution.
- No automatic retry.
- No replay re-execution.
- No desktop action execution.
- No Tauri command.
- No EventStore write.
- No apply or rollback.
- No Git or shell execution.
- No native bridge or desktop action expansion.

## Relation To P1I

P1I-002 introduced mismatch recovery, P1I-003 introduced target freshness
recovery, and P1I-004 introduced interruption recovery. P1I-005 adds
summary-only compensation recommendations so later App surfaces can explain safe
next steps without gaining undo, apply, rollback, or desktop execution powers.
