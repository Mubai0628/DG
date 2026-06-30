# ADR 0011: End-to-End Coding Task MVP

## Status

Proposed / Accepted for P0R design gate.

## Context

The project now has the pieces required for a safe coding task loop:

- v0.11 App-approved apply and rollback with human approval, exact typed
  confirmation, checkpoint metadata, summary-only events, and replay.
- v0.12 fixed Git and shell verification safe lanes.
- v0.13 explicit App live DeepSeek proposal generation that imports generated
  proposals into repair, schema validation, model import, and chain previews
  without auto-apply.

P0R connects those pieces into one end-to-end coding task MVP. It does not
increase execution authority. The model may propose; the local rules and the
human approval gates decide whether anything can mutate the user workspace.

## Decision

The End-to-End Coding Task MVP flow is:

```text
objective
-> live proposal generation
-> repair/schema validation
-> import
-> chain integration
-> validation/diff/audit/approval
-> typed confirmation
-> approved apply
-> Git/shell verification
-> summary events/replay
-> rollback if verification fails or user requests
```

The MVP must be stateful, replayable, and rollback-capable. Every stage must
emit or consume summary-only evidence. No stage may store raw prompt, raw
response, reasoning_content, API key material, raw source, raw diff, or
checkpoint preimage in event payloads.

## Required Gates

- Live proposal session receipt.
- Model proposal schema validation.
- Repair fail-closed.
- Diff/audit pass.
- Approval receipt.
- Exact typed confirmation.
- Snapshot/checkpoint.
- Apply summary event.
- Verification summary event.
- Rollback summary event.
- Replay projection.

## Non-Goals

- No auto-apply.
- No autonomous coding loop.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key persisted.
- No raw source/diff/preimage in events.
- No recursive delete.
- No directory delete.
- No symlink, junction, or reparse traversal.

## Consequences

- The flow is slower than autonomous coding, but each mutation remains
  auditable and human-approved.
- Model output remains a proposal, not an execution command.
- Verification is attached through fixed safe lanes, not arbitrary commands.
- Rollback is treated as a first-class stage and requires checkpoint evidence.
- Replay becomes the source of truth for summary-only task history.

## Boundary Summary

P0R is allowed to make the existing flow easier to follow. It is not allowed to
turn live proposal generation into automatic workspace mutation, command
execution, or raw payload persistence.
