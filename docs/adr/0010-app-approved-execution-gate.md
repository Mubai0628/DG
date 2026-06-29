# ADR 0010: App Approved Execution Gate

Status: Proposed / Accepted for P0O design gate.

## Context

P0N completed live proposal evaluation and golden cases without App execution.
The App Shell can show proposal, validation, audit, approval draft, virtual
apply, rollback checkpoint, replay, and evaluation summaries, but it still
cannot apply or rollback user workspace changes.

P0O opens the first narrow App-side approved execution MVP. The objective is
not auto-execution. The objective is a human-approved, typed-confirmation,
path-guarded, rollback-capable App-side apply and rollback lane.

The v0.1 `web_table_to_csv` Convert flow remains the real conversion flow.
Record Draft Event remains available. DeepSeek must not auto-apply.

## Decision

App execution requires an explicit approval receipt. The receipt is a narrow
execution receipt and is not a broad production PermissionLease.

An App apply command can only run after all of these are present and valid:

- patch proposal exists
- patch proposal validation passes
- diff/audit passes
- approval draft exists
- explicit apply approval receipt exists
- typed confirmation is exact
- snapshot or preimage requirement exists
- rollback checkpoint can be created
- allowed relative paths and byte/file limits match the receipt

An App rollback command can only run after all of these are present and valid:

- apply result exists
- rollback checkpoint exists
- checkpoint verifies
- explicit rollback approval receipt exists
- typed confirmation is exact
- rollback target paths match the receipt and checkpoint

The App must not auto-apply from model output. The App must not execute Git or
shell commands. Apply and rollback events must be summary-only.

Raw preimage may exist only in local checkpoint storage. Raw preimage must
never appear in EventStore payloads, release notes, App UI summaries, replay
summaries, or test snapshots.

## Non-Goals

- No auto-apply.
- No model auto-execution.
- No App-side live DeepSeek execution for file writes.
- No Git command execution.
- No shell command execution.
- No broad PermissionLease.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.
- No raw source, raw diff, raw preimage, raw prompt, raw response,
  reasoning_content, API key, Authorization value, or token in events.

## Required Gates Before Implementation

Each gate must be represented by testable code, focused tests, or boundary
checks before the corresponding implementation can be considered complete:

- proposal identity gate
- validation summary gate
- diff/audit summary gate
- approval draft gate
- approval receipt gate
- typed confirmation gate
- path safety gate
- content safety gate
- checkpoint creation gate
- rollback verification gate
- summary-only EventStore gate
- replay projection gate
- UI enablement gate
- CI and boundary checker gate

Every gate must fail closed. Missing, stale, mismatched, expired, or unsafe
artifacts must block execution.

## Consequences

This ADR makes P0O slower than simply wiring existing runtime prototypes into
the App, but it preserves auditability and rollback readiness. It turns App
execution into an explicit human-approved lane with narrow receipts, strict
path safety, local checkpointing, summary-only events, and replayable evidence.
