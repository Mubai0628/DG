# ADR 0011: App Live Proposal Generation Gate

Status: Proposed / Accepted for P0Q design gate.

## Context

v0.12 closed the Git / Shell Safe Lanes MVP. The App can now perform
human-approved apply / rollback, record summary-only execution events, run fixed
Git read lanes, run fixed shell verification lanes, and replay the evidence
chain. Runtime already has an explicit opt-in live DeepSeek proposal adapter,
but it remains runtime-only and requires injected API key resolver and transport.

The next step is not autonomous coding. The next step is an App-triggered live
proposal generation MVP that can request one structured DeepSeek patch proposal
only after explicit user confirmation and opt-in boundaries are satisfied.

## Decision

App live proposal generation must be explicit opt-in.

Before the App can call a live proposal command, it must have a session receipt.
The session receipt is a narrow confirmation artifact for one proposal
generation session. It is not a PermissionLease and does not authorize apply,
rollback, Git, shell, EventStore writes, native bridge, desktop action, or broad
capability execution.

The App live proposal command may generate `model_patch_proposal` only. The
command must not apply patches, must not rollback patches, must not write
EventStore, must not execute Git, must not execute shell, must not issue
PermissionLease, and must not perform desktop action.
Boundary summary: command must not write EventStore.

The command must not return raw prompt, raw response, API key, Authorization
value, token, secret, raw source, raw diff, preimage, raw stdout/stderr, or
reasoning_content to the UI or events. App-visible output must be summary-only:
ids, statuses, counts, warning codes, hash prefixes, proposal summaries, repair
summaries, validation summaries, redaction summaries, and next actions.

Every live proposal result must enter the existing chain before any user
workspace mutation is possible:

1. schema validation
2. repair loop
3. patch proposal import
4. chain integration
5. validation preview
6. diff audit
7. approval draft
8. approved apply / rollback chain
9. Git / shell verification safe lanes
10. replay projection

App approval execution and apply/rollback remain controlled by the v0.11 gates:
human approval, exact typed confirmation, path/content safety, private
checkpoint metadata, summary-only events, and replay visibility.

## Non-Goals

- No live call in P0Q-001.
- No API key read in P0Q-001.
- No fetch/network in P0Q-001.
- No Tauri command in P0Q-001.
- No App execution expansion.
- No auto-apply.
- No model-driven file write.
- No model-driven rollback.
- No EventStore write from live proposal generation.
- No Git execution.
- No shell execution.
- No broad PermissionLease.
- No native bridge.
- No desktop action.

## Required Gates Before Implementation

Implementation must not proceed unless each gate is represented by code,
focused tests, or boundary checks:

- API key boundary
- session receipt boundary
- request boundary
- response schema boundary
- repair fail-closed boundary
- redaction boundary
- App UI boundary
- no auto-apply boundary
- no Git/shell boundary
- CI / boundary checker gate

## Consequences

The live proposal path remains slower than an autonomous coding loop. That is
intentional. It keeps the model in a proposal-only role and preserves the local
rules engine as the authority for validation, audit, approval, apply, rollback,
verification, and replay.

Future work may make the App capable of requesting a live proposal, but a ready
proposal still does not mean apply is enabled.
