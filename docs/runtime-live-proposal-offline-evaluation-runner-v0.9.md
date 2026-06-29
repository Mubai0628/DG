# Runtime Live Proposal Offline Evaluation Runner v0.9

Status: P0N-003 runtime offline evaluation helper.

## Scope

The live proposal offline evaluation runner consumes summary-only golden case
fixtures and fake or dry model proposal responses. It measures proposal quality
before any execution radius changes.

This runner is offline evaluation only. It does not call DeepSeek, does not use
the live DeepSeek proposal adapter, does not read API keys, does not fetch
network, does not write files, does not write EventStore events, does not apply
patches, and does not rollback.

## Modes

The runner supports two non-live modes:

- `offline_fake`: uses explicit fake responses supplied by tests or fixtures.
- `offline_dry`: uses an injected dry client and the existing patch proposal dry
  adapter boundary.

Both modes remain fake/dry only. Neither mode reads `process.env`, resolves API
keys, creates a transport, calls the live adapter, or sends a network request.

## Evaluation Chain

Each case is summary-only and passes through the existing proposal chain:

1. Live proposal golden case schema.
2. Fake model patch proposal harness or patch proposal dry adapter.
3. Proposal repair loop.
4. Model patch proposal schema validator.
5. Failure taxonomy mapping.
6. Summary-only evaluation report.

Evaluation pass does not mean a proposal can be applied. Apply, rollback,
approval execution, EventStore write, Git, shell, native bridge, and desktop
action remain disabled.

## Report

The report includes:

- case count
- passed, warning, blocked, and failed-expectation counts
- schema pass rate
- repair attempt count
- repair success rate
- unsafe path blocker count
- forbidden field blocker count
- secret marker blocker count
- raw leak blocker count
- evidence coverage warnings
- test plan warnings
- high-risk operation warnings
- usage summary case count
- failure taxonomy summary
- report hash

Usage is summary-only. The report may include token counts, request counts, and
response counts. It must not persist raw prompt, raw response,
reasoning_content, raw source, raw diff, raw CSV, raw DOM, API key,
Authorization, stdout, or stderr.

## Failure Taxonomy

The runner maps findings into the P0N taxonomy:

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

## Fixtures

Evaluation fixtures live under:

- `runtime/test/fixtures/live-proposal-evaluation/`

They may reference golden case fixtures and include safe fake proposal response
objects. They must not contain raw prompt, raw response, raw source, raw diff,
reasoning_content, API key, Authorization, or file contents.

## Readiness

Execution readiness remains false:

- `canEnterLiveEvaluation: false`
- `canCallLiveModel: false`
- `canReadApiKey: false`
- `canFetchNetwork: false`
- `canWriteEventStore: false`
- `canApplyPatch: false`
- `canRollback: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `appCanExecute: false`

## Relationship To P0N

P0N-002 defined the fixture schema. P0N-003 adds an offline runner that scores
fake/dry responses against those fixtures.

Future P0N-004 may add an explicit opt-in live evaluation runner. That future
task must keep raw prompt, raw response, reasoning_content, API key, and App
execution out of persisted outputs.

## Non-goals

- No live DeepSeek call.
- No live evaluation runner.
- No API key read.
- No env value read.
- No vault read.
- No fetch/network.
- No raw prompt or raw response persistence.
- No reasoning_content persistence.
- No file write beyond checked-in test fixtures and source/docs changes.
- No apply/rollback.
- No EventStore write.
- No App execution.
- No Git/shell execution.
- No native bridge.
- No desktop action.
