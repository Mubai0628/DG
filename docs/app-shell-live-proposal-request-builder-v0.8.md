# App Shell Live Proposal Request Builder v0.8

Status: disabled-only App preview for P0M-003.

The App Shell Live Proposal Request Builder previews a future live DeepSeek
proposal request envelope. It does not read API keys, call DeepSeek, fetch
network, apply patches, rollback, or write events.

## App Surface

The App panel shows:

- objective summary
- intent
- model profile id
- allowed path refs
- request status
- request id
- summary-only and no-execution flags
- tool choice omitted status
- key source ref hash
- blocker / warning counts
- request hash prefix
- readiness flags
- next action

The panel consumes safe refs from the Live Proposal Opt-in Gate. It has no API
key value input, no password input, and no Authorization input.

## Disabled Controls

The panel includes `Send Live Proposal Request (disabled)` as a disabled
placeholder only. There is no enabled live request button.

The App Shell does not provide enabled:

- live DeepSeek call
- fetch/network
- API key read
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

- No API key read.
- No environment value read.
- No vault read.
- No fetch/network.
- No Tauri invoke.
- No EventStore write.
- No file write.
- No apply / rollback.
- No tools/tool_choice.

The App calls the runtime request builder only with summary refs and user-entered
summary text. Runtime output stays summary-only and keeps all execution
readiness flags false.

## Relation to P0M

This surface follows
[Runtime Live Proposal Request Builder v0.8](runtime-live-proposal-request-builder-v0.8.md)
and consumes the P0M-002 opt-in policy metadata. Future P0M-004 remains the
first possible live adapter task and must still be explicit opt-in and no-apply.

## Non-goals

- No live adapter.
- No live DeepSeek call.
- No API key read.
- No Git/shell.
- No native bridge.
- No desktop action.
