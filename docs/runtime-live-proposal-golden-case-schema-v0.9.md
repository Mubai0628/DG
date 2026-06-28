# Runtime Live Proposal Golden Case Schema v0.9

Status: P0N-002 runtime schema / fixture contract.

## Scope

The live proposal golden case schema defines summary-only fixture data for
future live proposal evaluation. It is a data contract only.

The runtime helper can parse, validate, normalize, and summarize golden case
fixtures. It does not run an evaluator, call DeepSeek, read API keys, fetch
network, write files, apply patches, rollback, write EventStore events, or
enable App execution.

## Fixture Boundary

Golden cases may contain:

- objective summaries
- intent summaries
- workspace summary refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- forbidden path policy summaries
- evidence refs
- expected proposal summaries
- expected failure taxonomy categories
- expected warning codes
- expected numeric or boolean metrics
- hash prefixes

Golden cases must not contain:

- raw prompt
- raw response
- raw source
- raw diff
- raw patch
- raw DOM
- raw CSV
- raw screenshot
- reasoning_content
- API key
- Authorization value
- bearer token
- file contents
- stdout or stderr
- command, shell, Git, Tauri, EventStore, apply, rollback, PermissionLease,
  native bridge, or desktop action fields

## Validation

The schema validator blocks:

- missing required fields
- unsupported schema versions
- unknown difficulty, mode, expected status, or failure category
- duplicate refs
- empty ref summaries
- unsafe allowed path refs
- absolute, drive, UNC, traversal, `.git`, `.env`, dependency, generated,
  temporary, and secret-like paths
- forbidden raw fields
- fake API key, Bearer, Authorization, private-key, raw prompt, raw response,
  raw source, raw diff, and reasoning markers
- `expectedSummaryOnly` values other than `true`
- execution readiness attempts

The validator warns for:

- generated missing case ids
- missing context refs
- missing expected metrics
- missing tags
- adversarial cases expected to pass
- blocked cases without expected failure categories
- expected changed paths outside allowed path refs
- code-change cases without test summary evidence
- repair expectations without malformed-json or repair-failed categories
- future-live-opt-in cases, because this task remains non-live

## Failure Taxonomy

The fixture schema supports these stable categories:

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

## Output

Validation results are summary-only. The normalized golden case includes counts,
safe refs, expected status, expected failure categories, metric ids, and hashes.
It never includes raw prompt, raw response, raw source, raw diff,
reasoning_content, API key, Authorization value, or file content.

Readiness flags keep execution disabled:

- `canEnterLiveEvaluation: false`
- `canCallLiveModel: false`
- `canReadApiKey: false`
- `canFetchNetwork: false`
- `canApplyPatch: false`
- `canRollback: false`
- `canWriteEventStore: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `appCanExecute: false`

`canEnterOfflineEvaluation` can be true only for non-blocked fixtures and only
means a future offline evaluator may consume the summary-only fixture.

## Fixtures

Fixtures live under:

- `runtime/test/fixtures/live-proposal-golden-cases/`

Current examples cover:

- safe documentation smoke case
- safe code standard case
- warning missing test evidence
- blocked unsafe path
- blocked secret marker
- blocked raw prompt
- blocked reasoning_content
- adversarial forbidden execution field

The fixtures use synthetic summaries and obvious fake markers only. They do not
contain real secrets.

## Relationship To P0N

P0N-001 defined the golden case design, threat model, and fixture-schema plan.
P0N-002 turns that plan into a runtime fixture schema.

Future P0N-003 may add an offline evaluation runner that consumes these fixtures
with fake or dry proposal artifacts only. Live evaluation remains deferred to a
later explicit opt-in task.

## Non-goals

- No evaluator runner.
- No live DeepSeek call.
- No API key read.
- No env value read.
- No vault read.
- No fetch/network.
- No raw prompt or raw response persistence.
- No reasoning_content persistence.
- No file write beyond checked-in test fixtures.
- No apply/rollback.
- No EventStore write.
- No App execution.
- No Git/shell execution.
- No native bridge.
- No desktop action.
