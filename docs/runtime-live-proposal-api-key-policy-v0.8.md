# Runtime Live Proposal API Key Policy v0.8

Status: implemented as policy metadata only for P0M-002.

The runtime live proposal API key policy models future API key source refs and
an explicit opt-in gate for live DeepSeek proposal generation. It does not read
API keys and does not call DeepSeek.

## Boundary

- Policy only.
- No API key read.
- No environment value read.
- No vault read.
- No fetch/network.
- No live DeepSeek call.
- No request builder.
- No live adapter.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No native bridge.
- No desktop action.

## Key Source Refs

The helper accepts only metadata refs:

- `disabled`
- `env_var_ref`
- `vault_ref`
- `test_fixture_ref`

`refName` is a reference name only. It must not contain a raw key, bearer
token, Authorization header, private key marker, raw environment value, or
vault secret value. The helper hashes the ref name for output and never returns
the raw ref as a key value.

## Opt-in Gate

The opt-in gate is scoped to `proposal_generation_only`.

Allowed modes:

- `disabled`
- `dry_config_check`
- `explicit_live_proposal_opt_in`

The opt-in gate cannot authorize apply, rollback, EventStore write, Git,
shell, App execution, or PermissionLease issuing. Passing policy readiness only
means metadata is ready for a future request builder. It does not mean a live
call is enabled.

## Readiness

All execution flags remain false:

- `canReadApiKey: false`
- `canCallLiveModel: false`
- `canFetchNetwork: false`
- `canWriteEventStore: false`
- `canApplyPatch: false`
- `canRollback: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `canIssuePermissionLease: false`
- `appCanExecute: false`

`canProceedToLiveRequestBuilder` may become true only for explicit opt-in
metadata with an allowed non-disabled key source ref and no blockers. It still
does not enable API key reads, network, or model calls.

## Relation to P0M

This policy implements the metadata contract required by
[ADR 0008](adr/0008-live-deepseek-proposal-adapter.md). Future
`DW-P0M-003 Live Proposal Request Builder` may consume the policy summary, but
must remain summary-only and no-network until its own gate.

## Non-goals

- No live adapter.
- No API key read.
- No environment value read.
- No vault read.
- No fetch/network.
- No App execution.
- No Git/shell.
- No native bridge.
- No desktop action.
