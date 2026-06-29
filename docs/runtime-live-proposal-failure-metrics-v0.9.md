# Runtime Live Proposal Failure Metrics v0.9

Status: P0N-005 runtime metrics aggregator.

## Scope

The failure metrics helper consumes summary-only reports from:

- P0N-003 offline evaluation runner
- P0N-004 live evaluation runner
- P0N golden case schema validation

It is a metrics aggregator only. It does not run offline evaluation, does not
run live evaluation, does not call the live adapter, does not call DeepSeek, does
not resolve API keys, and does not create a transport.

## Safety Boundary

The helper rejects raw or execution-shaped inputs:

- no live call
- no API key read
- no fetch/network
- no raw prompt
- no raw response
- no raw source or raw diff
- no reasoning_content persistence
- no EventStore write
- no file write
- no apply/rollback
- no App execution

Metrics pass does not mean a proposal can be applied, approved, replayed, or
executed.

## Failure Taxonomy

The helper reuses the P0N taxonomy exactly:

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

Unknown taxonomy values block the metrics report.

## Repair Metrics

Repair metrics include:

- repair attempt count
- repair success count
- repair failure count
- repair success rate

Low repair success rate is a warning. It does not enable model retry, file
write, apply, rollback, or App execution.

## Schema And Expectation Metrics

Schema metrics include evaluated case count, schema passed count, schema blocked
count, schema warning count, and schema pass rate.

Expectation metrics include passed, warning, blocked, failed expectation, and
matched expectation counts.

## Usage Summary

Usage metrics are numeric summary only:

- request count
- response count
- total prompt tokens
- total completion tokens
- total tokens

Raw prompt, raw response, reasoning_content, API key, Authorization, token,
stdout, and stderr are not accepted.

## Relationship To P0N

P0N-003 produces offline evaluation reports. P0N-004 produces runtime-only live
evaluation reports. P0N-005 aggregates those summary reports into taxonomy,
repair, schema, expectation, and usage metrics.

Future P0N-006 may add an App Evaluation Summary Surface. That surface must stay
read-only and must not trigger live calls, apply, rollback, EventStore writes,
Git, shell, native bridge, or desktop action.

## Non-goals

- No live DeepSeek call.
- No offline or live runner invocation.
- No API key read.
- No fetch/network.
- No raw prompt or raw response persistence.
- No reasoning_content persistence.
- No file write.
- No EventStore write.
- No apply/rollback.
- No App execution.
- No Git/shell execution.
- No native bridge.
- No desktop action.
