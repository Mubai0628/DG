# Runtime Desktop Action Replay Privacy Audit v0.31

This document locks the P1I-007 runtime helper for desktop action replay
completeness and privacy redaction hardening. The helper audits summary-only
desktop observer, action proposal, approval, execution, and recovery event
summaries. It does not replay or re-execute desktop actions.

## Completeness Checks

The audit checks that:

- observer event summaries include an evidence ref
- action proposal event summaries include a proposal id
- approval receipt summaries exist
- execution result summaries exist
- recovery summaries exist when mismatch or interruption recovery occurred

## Privacy Checks

The audit blocks:

- raw screenshot
- raw OCR
- raw target text
- raw clipboard
- API key markers
- secret markers
- raw prompt, raw response, raw source, raw diff, and raw DOM fields
- replay execution fields
- desktop action execution readiness fields

## Output

The report contains replay completeness status, missing event refs, privacy leak
counts, redaction summary, blocker and warning counts, and readiness flags. All
desktop action execution, replay execution, clipboard, file dialog, EventStore,
native bridge, and App execution readiness flags remain false.

## Non-Goals

- No replay re-execution.
- No desktop action execution.
- No automatic retry.
- No undo execution.
- No clipboard write.
- No file dialog automation.
- No Tauri command.
- No EventStore write.
- No native bridge.
- No Git or shell execution.
