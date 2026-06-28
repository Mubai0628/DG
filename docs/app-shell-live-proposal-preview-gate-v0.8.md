# App Shell Live Proposal Preview Gate v0.8

Status: disabled-only App gate for P0M-006.

The App Live Proposal Preview Gate summarizes the future live DeepSeek proposal
boundary from existing summary surfaces:

- Live Proposal Opt-in Gate
- Live Proposal Request Builder
- Live DeepSeek Proposal Adapter runtime-only boundary
- Live Proposal Validation Integration
- Model Patch Proposal Import
- Model Proposal Chain Integration

It is a visualization gate only. A ready gate means future runtime-only opt-in
metadata and summaries look consistent; it does not allow the App Shell to call
DeepSeek.

## Boundary

- App gate only.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No request send.
- No App execution.
- No apply or rollback.
- No EventStore write.
- No approval execution.
- No PermissionLease issuing.
- No Tauri command.
- No raw prompt, raw response, raw source, raw diff, or API key display.
- No Git/shell.
- No native bridge.
- No desktop action.

The panel has no key value field, no password field, no Authorization field, and
no raw response field. It only displays summary counts, stage status, safe
finding codes, readiness flags, and hash prefixes.

## Disabled Controls

The panel includes disabled placeholders:

- `Call DeepSeek (disabled)`
- `Send Live Proposal Request (disabled)`

The enabled `Preview Live Proposal Gate` button only updates React state with a
local summary view. It does not call the runtime live adapter, API key resolver,
transport, Tauri, EventStore, or network.

## Stage Summary

The gate summarizes:

- API key policy metadata only.
- Request builder summary only.
- Runtime adapter explicit opt-in only.
- Validation integration summary only.
- Model import preview only.
- Model proposal chain integration preview only.
- App live call disabled.
- App apply and rollback disabled.
- App event write disabled.
- App approval execution disabled.
- No key value field.
- No fetch/network.
- No Tauri command.
- No raw prompt or response.

Any input summary that claims App execution, key reads, fetch/network, request
send, apply, rollback, EventStore write, approval execution, PermissionLease
issuing, Git, or shell is blocked.

## Summary Integration

When the gate is previewed, Context Assembly Preview may place the gate ref in
`no_compress_zone` as a summary-only safety decision. No prompt is assembled and
no model request is sent.

## Relation to P0M

This surface sits after:

- [Runtime Live Proposal API Key Policy v0.8](runtime-live-proposal-api-key-policy-v0.8.md)
- [Runtime Live Proposal Request Builder v0.8](runtime-live-proposal-request-builder-v0.8.md)
- [Runtime Live DeepSeek Proposal Adapter v0.8](runtime-live-deepseek-proposal-adapter-v0.8.md)
- [Runtime Live Proposal Validation Integration v0.8](runtime-live-proposal-validation-integration-v0.8.md)
- [App Shell Model Patch Proposal Import v0.7](app-shell-model-patch-proposal-import-v0.7.md)
- [App Shell Model Proposal Chain Integration v0.7](app-shell-model-proposal-chain-integration-v0.7.md)

Future P0M-007 telemetry / redaction audit remains separate and must not
persist raw prompts, raw responses, API keys, or reasoning text.

## Non-goals

- No live adapter call from App.
- No App execution.
- No request send.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.
