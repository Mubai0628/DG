# Runtime Live Proposal Evaluation Runner v0.9

Status: P0N-004 runtime live evaluation runner boundary.

## Scope

The live proposal evaluation runner evaluates golden cases against the live
proposal pipeline with three modes:

- `disabled`: default mode. No resolver, transport, model call, or network is
  used.
- `dry_run`: validates golden cases and request-boundary summaries only. No
  resolver, transport, model call, or network is used.
- `explicit_live_eval`: runtime-only live evaluation with explicit opt-in,
  injected API key resolver, injected transport, and allow flags.

The runner is not connected to the App Shell. The App cannot trigger live
evaluation, read API keys, send requests, fetch network, apply patches,
rollback, approve, issue leases, or write events.

## Explicit Opt-in Boundary

`explicit_live_eval` fails closed unless all of these are true:

- an API key policy summary is supplied and can proceed to request-builder
  metadata;
- `allowApiKeyResolution` is true;
- `allowLiveNetwork` is true;
- an API key resolver is injected;
- a transport is injected;
- each golden case validates through the P0N fixture schema;
- the request builder returns a summary-only request;
- the live adapter result passes validation integration and telemetry audit.

The runner never reads `process.env`, never reads vault values, never creates a
default transport, and never performs a default fetch/network call.

## Evaluation Chain

Each explicit case follows the existing chain:

1. P0N golden case schema validation.
2. P0M live proposal request builder.
3. P0M runtime live DeepSeek proposal adapter with injected resolver/transport.
4. P0M live proposal validation integration.
5. P0M telemetry/redaction audit.
6. P0N failure taxonomy and summary-only metrics.

Evaluation pass does not mean the proposal can be applied. Apply, rollback,
approval execution, EventStore write, Git, shell, native bridge, and desktop
action remain disabled.

## Report

The report includes:

- case count
- passed, warning, blocked, and failed-expectation counts
- live-call case count
- schema pass rate
- repair success rate
- failure taxonomy summary
- usage summary with numeric counts only
- telemetry audit summary
- report hash

The report must not include raw prompt, raw response, raw source, raw diff,
raw CSV, raw DOM, reasoning_content, API key, Authorization, token, stdout, or
stderr.

## Failure Taxonomy

The runner reuses the P0N taxonomy:

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

## Optional Live Test

No optional live `.live.test.ts` is added in P0N-004. Future live tests must be
skipped by default unless an explicit opt-in environment flag is set, must never
print an API key, and must never persist raw prompt, raw response, or
reasoning_content.

## Relationship To P0N

P0N-003 added fake/dry offline evaluation. P0N-004 adds a runtime-only explicit
live evaluation boundary. Future P0N-005 may expand failure taxonomy and repair
metrics without enabling App execution.

## Non-goals

- No App live call.
- No App API key read.
- No default API key read.
- No default fetch/network.
- No raw prompt or raw response persistence.
- No reasoning_content persistence.
- No EventStore write.
- No file write.
- No apply/rollback.
- No App execution.
- No Git/shell execution.
- No PermissionLease issuing.
- No native bridge.
- No desktop action.
