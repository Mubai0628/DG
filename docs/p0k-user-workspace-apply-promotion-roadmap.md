# P0K User Workspace Apply Promotion Roadmap

Status: planned after `v0.6.0-sandbox-apply-preview-rc.1`.

## Goal

P0K moves from disposable workspace apply toward user workspace apply promotion
design. It does not directly enable user workspace apply.

There is no direct user workspace apply in P0K until a later explicit release
gate allows it.

The goal is to define a promotion gate from a validated disposable workspace
result to a possible future user workspace mutation. That gate must require
approval, rollback, event/replay coverage, path guard evidence, and snapshot
guard evidence. The App remains disabled by default until an explicit release
gate says otherwise.

## Recommended Tasks

### P0K-001 User Workspace Apply Promotion Gate ADR + Threat Model

- Design only.
- Define the promotion gate.
- Model user workspace mutation risks.
- No implementation.

### P0K-002 User Workspace Snapshot / Backup Contract

- Define metadata and preimage requirements.
- Define snapshot and backup hashes.
- No apply.

### P0K-003 Promotion Readiness Checker

- Compare disposable result summaries against user workspace snapshot summaries.
- Produce readiness findings.
- No write.

### P0K-004 User Workspace Apply Prototype, Disabled By Default

- Runtime-only.
- Explicit gated mode.
- No App enabled button.

### P0K-005 User Workspace Rollback Prototype, Disabled By Default

- Runtime-only.
- Explicit gated mode.
- Requires rollback evidence before any apply path can be considered safe.

### P0K-006 Real Apply / Rollback EventStore Writer

- Summary-only events.
- No App auto-write.
- Replay must reconstruct apply and rollback state.

### P0K-007 App Approval Execution Design, Still Disabled By Default

- Design App approval execution surfaces.
- Keep apply and rollback disabled by default.

### P0K-008 User Workspace Apply RC Polish + Release Notes

- Polish docs, copy, and release notes.
- Run stage-end gates only at RC boundary.

### P0K-009 Post-Release Review

- Review the P0K release candidate.
- Lock the next roadmap.

## Deferred

P0K explicitly defers:

- Git commit or push.
- Shell execution.
- DeepSeek autonomous coding loop.
- Broad capability invocation.
- Production PermissionLease issuing.
- MCP/plugin/skills execution.
- Native bridge.
- Desktop action.

## Next Task

Start with `DW-P0K-001 User Workspace Apply Promotion Gate ADR, no
implementation`.
