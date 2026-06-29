# App Shell Live Proposal Evaluation Summary v0.9

Status: P0N-006 App read-only summary surface.

## Scope

The App Shell evaluation summary surface displays summary-only metrics from the
P0N live proposal evaluation line:

- P0N-003 offline evaluation runner summaries
- P0N-004 runtime-only live evaluation summaries
- P0N-005 failure taxonomy and repair metrics summaries

The surface accepts pasted summary JSON for preview. It does not run an
evaluation runner, does not call DeepSeek, does not read API keys, and does not
send network requests.

## Read-only Boundary

This App surface is display-only:

- no evaluator execution
- no live call
- no API key read
- no fetch/network
- no request send
- no raw prompt persistence
- no raw response persistence
- no reasoning_content persistence
- no EventStore write
- no file write
- no apply/rollback
- no App execution

The App validates the pasted summary shape before displaying it. If the summary
contains raw prompt, raw response, raw source, raw diff, reasoning_content,
API-key markers, Authorization markers, command fields, tools/tool_choice, or
execution readiness flags, the surface blocks the summary.

## Displayed Metrics

The panel displays only summary-safe fields:

- report count
- case count
- offline/live case counts
- pass/warn/block counts
- failed expectation count
- schema pass rate
- repair success rate
- failure taxonomy counts
- usage token numbers
- hash prefix
- warning and blocker codes

Usage metrics are numeric only. Raw prompt text, raw response text, model
reasoning text, API keys, and file contents are never accepted or shown.

## Failure Taxonomy

The surface recognizes the P0N taxonomy:

- `schema_failure`
- `malformed_json`
- `repair_failed`
- `unsafe_path`
- `forbidden_field`
- `secret_marker`
- `missing_evidence`
- `missing_test_plan`
- `high_risk_operation`
- `hallucinated_path`
- `poor_objective_fit`
- `raw_content_leak`
- `reasoning_content_leak`
- `usage_summary_missing`
- `no_failure_expected`

Unknown taxonomy categories block the summary instead of being displayed.

## Relationship To P0N

P0N-003 and P0N-004 produce evaluation reports. P0N-005 aggregates them into
failure taxonomy, schema, repair, expectation, and usage metrics. P0N-006 shows
those metrics in the App Shell as read-only status. Future P0N-007 may add a
separate evaluation telemetry/redaction audit, still without raw output.

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
