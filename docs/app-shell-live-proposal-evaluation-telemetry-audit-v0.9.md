# App Shell Live Proposal Evaluation Telemetry Audit v0.9

Status: P0N-007 App read-only audit surface.

## Scope

The App Shell evaluation telemetry audit surface previews summary-only
redaction audit results for live proposal evaluation telemetry. It can display a
summary-only audit report or generate a summary-only audit from pasted summary
artifacts.

The surface does not run evaluation, does not call DeepSeek, does not read API
keys, does not fetch network, and does not write events.

## Read-only Boundary

This surface is display-only:

- no evaluator execution
- no live call
- no API key read
- no fetch/network
- no raw prompt persistence
- no raw response persistence
- no reasoning_content persistence
- no EventStore write
- no file write
- no apply/rollback
- no App execution

The App rejects raw prompt, raw response, raw source, raw diff,
reasoning_content, API-key markers, Authorization markers, command fields,
tools/tool_choice, and execution readiness flags before display.

## Displayed Summary

The panel displays only safe summary values:

- record count
- offline/live report counts
- failure metrics report count
- App summary count
- raw/redacted field counts
- leak booleans
- numeric usage summary
- redaction summary
- readiness flags
- finding codes
- audit hash prefix

No raw model output, prompt body, response body, source text, diff text,
reasoning_content, key value, Authorization header, stdout, or stderr is shown.

## Relationship To P0N

P0N-003 and P0N-004 produce evaluation reports. P0N-005 aggregates failure
metrics. P0N-006 displays the evaluation summary. P0N-007 audits evaluation
telemetry and redaction before future P0N-008 RC polish.

## Non-goals

- No App-side live DeepSeek call.
- No evaluator runner execution from the App.
- No API key input or API key read.
- No fetch/network.
- No raw prompt or raw response persistence.
- No reasoning_content persistence.
- No file write.
- No EventStore write.
- No apply/rollback.
- No approval/rejection execution.
- No PermissionLease issuance.
- No Git/shell execution.
- No native bridge.
- No desktop action.
