# Live Proposal Golden Cases Design v0.9

Status: design-only for P0N-001.

## Purpose

Live proposal golden cases define how DeepSeek-generated proposal quality will
be evaluated before any execution capability expands. Golden cases are not
model calls, not live adapter invocations, and not apply/rollback instructions.

The design is intentionally summary-only. It evaluates proposal behavior
through schema, repair, validation, audit, approval, virtual apply, rollback,
replay, and redaction summaries.

## Evaluation Boundary

P0N-001 has:

- no live DeepSeek call in P0N-001
- no evaluator implementation in P0N-001
- no API key read in P0N-001
- no fetch/network in P0N-001
- no raw prompt persistence
- no raw response persistence
- no reasoning_content persistence
- no file write
- no apply
- no rollback
- no App execution
- no Git/shell
- no native bridge
- no desktop action

## Golden Case Input Shape

A future golden case should contain only safe references and summaries:

- case id
- title
- objective summary
- workspace index summary refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- forbidden path policy
- evidence refs
- model profile ref
- evaluation mode
- expected proposal summary
- expected failure categories
- expected warning categories
- expected usage summary shape
- expected redaction summary

Forbidden input includes raw prompt, raw response, raw source, raw diff, raw
patch, raw DOM, raw CSV, screenshots, clipboard data, API key, Authorization,
reasoning_content, stdout, stderr, command, shell, Git, Tauri, EventStore,
apply, rollback, PermissionLease, native bridge, and desktop action fields.

## Expected Proposal Summary

Golden cases may define expected proposal summaries with:

- title pattern or exact title
- intent summary
- operation count
- file count
- expected path summary set
- evidence ref count
- risk note count
- warning code set
- blocker code set
- normalized hash expectation when deterministic
- schema status
- repair status
- validation status
- audit readiness status

Expected summaries must not contain raw proposal content, raw diff, raw source,
raw prompt, raw response, reasoning_content, API key, or file contents.

## Evaluation Dimensions

Golden cases should score or classify:

- `schema_validity`
- `repair_success`
- `unsafe_path_blocked`
- `forbidden_field_blocked`
- `secret_marker_blocked`
- `evidence_coverage`
- `objective_fit`
- `operation_risk`
- `test_coverage_hint`
- `diff_audit_readiness`
- `approval_readiness`
- `user_workspace_readiness`

Evaluation scores are advisory quality signals. They do not enable App
execution, apply, rollback, approval execution, EventStore writes, Git, shell,
native bridge, or desktop action.

## Failure Taxonomy

Golden cases should encode failure categories with stable snake_case codes:

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

Each failure should include a safe summary, severity, and expected evaluation
result. Unsafe proposal false positives and unsafe proposal false negatives
should both be represented in future fixtures.

## Metrics

Future evaluation reports should include:

- case count
- pass/warn/block count
- schema pass rate
- repair success rate
- blocker category counts
- warning category counts
- redaction pass count
- usage summary availability
- usage token summary if live evaluation is added later
- report hash

Metrics must be summary-only and must not include raw artifacts.

## Redaction Requirements

Every evaluation report must prove:

- no raw prompt persisted
- no raw response persisted
- no reasoning_content persisted
- no API key persisted
- no Authorization value persisted
- no raw source persisted
- no raw diff persisted
- no raw CSV persisted
- no raw DOM persisted
- no stdout or stderr persisted

Any raw field, key-like marker, or reasoning_content leak must block the case
or report.

## Integration With Existing Chain

Golden cases evaluate whether model output can safely enter the existing chain:

1. Model patch proposal schema.
2. Proposal repair.
3. Path and forbidden-field guards.
4. Secret marker guard.
5. Patch validation preview.
6. Diff audit preview.
7. Approval draft.
8. Virtual apply preview.
9. Rollback checkpoint preview.
10. Controlled creation replay projection.
11. Telemetry / redaction audit.

This chain remains preview/evaluation-only in P0N. It does not execute.
