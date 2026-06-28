# Runtime Live Proposal Request Builder v0.8

Status: implemented as a summary-only request envelope builder for P0M-003.

The runtime live proposal request builder prepares a future DeepSeek proposal
request boundary from policy metadata, objective summaries, context refs,
workspace refs, allowed path refs, and forbidden path policy summaries. It does
not send the request.

## Boundary

- Request builder only.
- No API key read.
- No environment value read.
- No vault read.
- No fetch/network.
- No live DeepSeek call.
- No live adapter.
- No App execution.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.

## Request Envelope

The request envelope is summary-only and includes:

- `responseFormat: "model_patch_proposal"`
- `summaryOnly: true`
- `noExecution: true`
- `noFileWrite: true`
- `noApply: true`
- `noRollback: true`
- `noEventStoreWrite: true`
- `noGitShell: true`
- `noTools: true`
- `toolChoiceOmitted: true`

The request includes an `apiKeyPolicyRef` with the policy id, key source type,
and ref hash only. It never includes a raw key, environment value, vault value,
Authorization header, raw prompt, raw source, or raw diff.

## Prompt Boundary

The builder records:

- frozen prefix refs
- volatile tail refs
- no-compress refs

These are refs only. They are not raw prompt dumps. If future thinking mode is
represented as summary-only, later adapters must drop `reasoning_content` and
must continue to omit `tool_choice`.

## Validation

Validation blocks:

- missing or blocked API key policy
- policy readiness attempting key read, live model call, or network fetch
- missing objective summary or model profile id
- non-summary prompt mode
- missing forbidden path policy
- unsafe allowed path refs
- forbidden raw fields and secret markers
- tools or tool_choice fields
- apply, rollback, EventStore, Git, shell, PermissionLease, native bridge, or
  desktop action attempts

Warnings cover missing summary refs, missing no-compress refs, summary-only
thinking mode, policy metadata-only status, and the fact that live calls remain
deferred.

## Relation to P0M

This builder consumes the
[Runtime Live Proposal API Key Policy v0.8](runtime-live-proposal-api-key-policy-v0.8.md)
metadata contract from P0M-002. Future `DW-P0M-004 Live DeepSeek Proposal
Adapter` may consume this envelope only under its own explicit opt-in gate.

## Non-goals

- No live adapter.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No App execution.
- No Git/shell.
- No native bridge.
- No desktop action.
