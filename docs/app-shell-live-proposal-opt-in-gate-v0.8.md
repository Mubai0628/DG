# App Shell Live Proposal Opt-in Gate v0.8

Status: disabled-only App surface for P0M-002.

The App Shell Live Proposal Opt-in Gate previews future live DeepSeek proposal
policy metadata. It does not read API keys, call DeepSeek, fetch network,
apply patches, rollback, or write events.

## App Surface

The App panel shows:

- provider display: `deepseek`
- model profile id
- key source ref text input
- opt-in mode select
- policy status
- key source type and ref hash
- opt-in mode and scope
- blocker / warning counts
- readiness flags
- next action

The key source field is a ref-only field. It is not a password field and is not
an API key value input. The placeholder is `DEEPSEEK_API_KEY ref only, no
value`.

## Disabled Controls

The panel includes `Call DeepSeek (disabled)` as a disabled placeholder only.
There is no enabled live model button.

The App Shell does not provide enabled:

- live DeepSeek call
- apply
- rollback
- write events
- approve / reject
- PermissionLease issuing
- Git
- shell
- native bridge
- desktop action

## Safety Boundary

- No API key input.
- No password input.
- No Authorization input.
- No environment read.
- No vault read.
- No fetch/network.
- No Tauri invoke.
- No EventStore write.
- No file write.
- No apply / rollback.

The App calls the runtime policy helper only with safe display refs. Runtime
output remains summary-only and reports all execution readiness flags as false.

## Relation to P0M

This surface is the App preview for
[Runtime Live Proposal API Key Policy v0.8](runtime-live-proposal-api-key-policy-v0.8.md).
It supports the P0M-001 ADR boundary and prepares metadata for future
`DW-P0M-003 Live Proposal Request Builder, no network`.

## Non-goals

- No live adapter.
- No live DeepSeek call.
- No API key read.
- No Git/shell.
- No native bridge.
- No desktop action.
