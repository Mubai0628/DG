# Runtime Desktop Action Interruption Recovery v0.31

This document locks the P1I-004 runtime contract for interrupted desktop action
recovery and focus-loss blockers. The helper is runtime-only and summary-only.
It does not execute desktop actions, retry actions, replay actions, undo
actions, call Tauri, write EventStore entries, use a native bridge, or persist
raw desktop evidence.

## Interruption Kinds

The runtime helper recognizes:

- `focus_lost_before_action`
- `focus_lost_after_action`
- `user_interrupted`
- `window_closed`
- `app_crashed`
- `platform_result_unknown`
- `timeout`
- `permission_revoked`
- `target_became_sensitive`
- `privacy_boundary_triggered`

Any interruption kind blocks automatic recovery. A blocked report recommends
manual review, privacy review, or summary-only re-observation before any
follow-up.

## Output

The report contains:

- interruption status
- interruption kind list
- action uncertainty summary
- safe recovery recommendations
- `noAutomaticRetry: true`
- `noReplayReexecution: true`
- blocker and warning counts
- all desktop action execution readiness flags false

## Safety Boundary

The helper blocks raw screenshot, raw OCR, raw target text, raw prompt, raw
response, raw source, raw diff, raw DOM, clipboard content, API key markers,
secret markers, desktop command fields, native bridge fields, Git/shell fields,
EventStore write fields, retry fields, undo fields, and execution readiness
attempts.

The output is summary-only and never includes raw screenshot, raw OCR, raw target
text, raw prompt, raw response, raw source, raw diff, raw DOM, clipboard content,
API key values, or command payloads.

## Non-Goals

- No automatic retry.
- No replay re-execution.
- No desktop action execution.
- No undo execution.
- No Tauri command.
- No EventStore write.
- No Git or shell execution.
- No native bridge or desktop action expansion.

## Relation To P1I

P1I-002 introduced mismatch recovery. P1I-003 introduced stale target freshness
recovery. P1I-004 adds interruption and focus-loss recovery so that uncertain
desktop action outcomes fail closed. Later P1I tasks add compensation summaries,
App read-only aggregation, replay completeness hardening, and manual QA
coverage without expanding desktop execution.
