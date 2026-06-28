# ADR 0009: Live Proposal Golden Cases

## Status

Proposed / Accepted for P0N design gate.

## Context

P0M completed the explicit opt-in runtime live DeepSeek proposal adapter. The
adapter is runtime-only, disabled unless explicitly opted in, and still keeps
App execution disabled.

The next step is not to expand App execution. The next step is to evaluate live
proposal quality before any execution radius changes are considered. P0N
therefore starts with golden cases, evaluation taxonomy, repair/schema metrics,
and redaction requirements.

P0N-001 is design-only. It has no live DeepSeek call, no evaluator
implementation, no API key read, no fetch/network, no file write, no apply, no
rollback, and no App execution.

## Decision

P0N first establishes golden cases and an evaluation taxonomy for live proposal
quality.

Evaluation output is summary-only. It may contain counts, hashes, statuses,
warning codes, blocker categories, and usage summaries. It must not persist raw
prompt, raw response, reasoning_content, raw source, raw diff, raw CSV, raw DOM,
or API key material.

Offline evaluation is the priority. Offline evaluation can use fixture,
fake-model, dry-adapter, schema, repair, validation, audit, and redaction
summaries without network.

Live evaluation must be explicit opt-in and belongs to a later task. It must
reuse the P0M runtime-only opt-in boundaries and must not be callable from App.

App remains disabled for live calls, apply, rollback, approval execution,
PermissionLease issuing, EventStore writes, Git, shell, native bridge, and
desktop action.

## Non-goals

- No live call in P0N-001.
- No evaluator implementation in P0N-001.
- No API key read.
- No fetch/network.
- No App execution.
- No file write.
- No apply/rollback.
- No Git/shell.
- No native bridge.
- No desktop action.

## Golden Case Principles

- Objective summary only.
- Workspace refs only.
- Context assembly refs only.
- Allowed path refs only.
- Expected proposal summary only.
- Expected failure category.
- Expected usage summary shape.
- Expected redaction summary.
- No raw prompt.
- No raw response.
- No raw source dump.
- No raw diff.
- No API key.
- No reasoning_content persistence.

## Evaluation Dimensions

P0N evaluation should measure:

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

These dimensions are evaluation signals only. They do not enable apply,
rollback, App execution, approval execution, Git, shell, or EventStore writes.

## Failure Taxonomy

P0N starts with these failure categories:

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

Each category must be representable in future fixtures and test assertions.

## Metrics

P0N metrics should include:

- case count
- pass/warn/block count
- schema pass rate
- repair success rate
- blocker category counts
- warning category counts
- usage token summary if live evaluation is added later
- no raw artifacts

Metrics must remain summary-only. They must not include raw prompt, raw
response, reasoning_content, API key, raw source, raw diff, raw patch, raw CSV,
raw DOM, stdout, or stderr.

## Safety

- Redaction audit is mandatory.
- Raw prompt and raw response are never persisted.
- reasoning_content is dropped or reduced to safe counts.
- API keys and authorization values are never persisted.
- Live output must enter schema, repair, validation, audit, approval draft,
  virtual apply preview, rollback checkpoint preview, replay projection, and
  redaction-audit chains before any later execution discussion.
- No execution is performed by evaluation.

## Consequences

P0N makes progress slower than immediately wiring live outputs into execution,
but it produces measurable safety and quality evidence first. The evaluation
path reuses the existing P0L/P0M proposal, repair, validation, audit, and
redaction boundaries instead of inventing a new execution lane.
