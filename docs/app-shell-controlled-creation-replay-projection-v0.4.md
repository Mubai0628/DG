# App Shell Controlled Creation Replay Projection v0.4

The App Shell Controlled Creation Replay Projection is a local, read-only
preview surface. It consumes the runtime replay projection helper and shows a
summary-only timeline for the controlled-creation preview chain.

## What It Shows

- replay projection status
- projection id and chain id
- persisted event count
- local preview stage count
- missing stage count
- stage summaries
- hash-chain summary
- blocker, warning, and finding counts
- readiness flags that remain non-executing
- next action text

## App Shell Boundary

The panel is labeled `Replay preview / no execution`. The `Preview Replay
Projection` button only updates React state. It does not call Tauri, write
events, create or execute a run, read files, write files, apply patches, execute
rollback, run Git, run shell, invoke capabilities, issue a PermissionLease,
approve, reject, commit, or call DeepSeek.

The Diff, Approval, Audit, and Context Assembly surfaces receive only replay
summary refs. Replay projection refs are placed in `no_compress_zone` so future
prompt assembly can preserve the chain boundary. No prompt is assembled in this
phase.

## Summary Policy

The App Shell accepts only summary fields from the current controlled-creation
preview chain. Raw file content, raw source, raw diff, raw patch body,
beforeContent, afterContent, rawPrompt, rawDom, rawCsv, clipboard content,
Authorization values, API keys, stdout, stderr, and env values are rejected or
withheld.

The replay projection distinguishes:

- persisted summary stages, currently the local Run Draft Event
- local preview stages, including proposal, validation, audit, approval,
  virtual apply, and rollback checkpoint summaries
- missing stages, which keep the projection partial or blocked

## Relation To Other App Surfaces

- Run Draft Event provides a summary-only persisted starting point.
- Patch Proposal Creation Preview creates local proposal summaries.
- Patch Proposal Validation Preview validates local proposal summaries.
- Patch Diff Audit Preview audits local summary-only diff evidence.
- Patch Approval Draft shows read-only approval request summaries.
- Patch Virtual Apply Preview simulates metadata against an in-memory summary
  snapshot.
- Patch Rollback Checkpoint Preview creates metadata-only restore scope
  summaries.
- Controlled Creation Replay Projection links the chain for review without
  execution.

## Non-goals

- no real ControlPlaneRun creation or execution
- no EventStore write
- no patch apply
- no real rollback
- no checkpoint file write
- no filesystem read
- no filesystem write
- no raw source or raw diff display
- no Git or shell execution
- no DeepSeek call
- no capability invocation or PermissionLease issuing
- no native bridge or desktop action
