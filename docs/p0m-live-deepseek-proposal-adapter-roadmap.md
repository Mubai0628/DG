# P0M Live DeepSeek Proposal Adapter Roadmap

Status: planned after `v0.8.0-deepseek-proposal-preview-rc.1`.

## Goal

P0M moves from offline/dry DeepSeek proposal preview to an explicit opt-in live
DeepSeek proposal adapter.

Live DeepSeek may generate structured patch proposals only. Live DeepSeek must
not write files. Live DeepSeek must not call apply or rollback. Live DeepSeek
must not write EventStore. Live DeepSeek must not issue PermissionLease.

Live outputs must pass schema validation, repair, path guard, secret guard,
validation preview, diff audit, approval draft, virtual apply, rollback
checkpoint, and replay projection.

App execution remains disabled by default. API key access must be explicit and
gated.

## Recommended Tasks

### P0M-001 Live DeepSeek Proposal Adapter ADR + Threat Model

- Design only.
- No implementation.
- No live call.
- Define live-call risks, API key boundaries, and opt-in gates.

### P0M-002 API Key Access Policy / Opt-in Gate

- Define environment or vault source policy.
- Require explicit opt-in.
- No live call.

### P0M-003 Live Proposal Request Builder

- Build summary-only prompt request contracts.
- Preserve no-compress refs and prompt boundaries.
- No network.

### P0M-004 Live DeepSeek Proposal Adapter, Opt-in Dry-run Boundary

- Require explicit environment gate.
- Generate proposal drafts only.
- No apply.
- No App execution.

### P0M-005 Live Proposal Repair and Validation Integration

- Route live output through schema, repair, path guard, and secret guard.
- Block unsafe outputs.
- No file write.

### P0M-006 App Live Proposal Preview Gate

- App surface remains disabled by default.
- Show opt-in status only.
- No App execution.

### P0M-007 Live Proposal Telemetry / Redaction Audit

- No raw prompt by default.
- Usage summary only.
- No raw source, raw diff, raw prompt, or API key persistence.

### P0M-008 Live Proposal RC Polish + Release Notes

- Polish docs, copy, and release notes.
- Run stage-end gates only at RC boundary.

### P0M-009 Post-Release Review

- Review the P0M release candidate.
- Lock the next roadmap.

## Deferred

P0M explicitly defers:

- App-side apply.
- App-side rollback.
- Production PermissionLease issuing.
- Git commit or push.
- Shell execution.
- Autonomous DeepSeek coding loop.
- Broad capability invocation.
- MCP/plugin/skills execution.
- Native bridge.
- Desktop action.

## Next Task

Start with `DW-P0M-001 Live DeepSeek Proposal Adapter ADR, no implementation`.
