# P0N Live Proposal Evaluation Roadmap

Status: planned after `v0.9.0-live-deepseek-proposal-preview-rc.1`.

## Goal

P0N moves from live proposal adapter availability to live proposal evaluation
and golden cases.

P0N measures proposal quality before expanding execution. App execution remains
disabled. App-side apply and App-side rollback remain disabled. Live model
output must not directly write files.

Model outputs are evaluated through the existing schema, repair, validation,
audit, approval, virtual apply, rollback checkpoint, and replay chain.

P0N classifies failures into:

- Schema failure.
- Unsafe path.
- Forbidden field.
- Secret marker.
- Missing evidence.
- Missing tests.
- High-risk operation.
- Repair failed.
- Validation warning.
- Hallucinated path.
- Poor objective fit.

P0N tracks usage summary only. It must never persist raw prompt, raw response,
reasoning_content, or API key.

## Recommended Tasks

### P0N-001 Live Proposal Golden Cases Plan

- Design only.
- No live call.
- No implementation.
- Define golden case scope, scoring, failure taxonomy, and redaction
  requirements.

### P0N-002 Golden Case Fixture Schema

- Define objective summaries.
- Define workspace refs.
- Define expected proposal summaries.
- Define expected failure categories.
- No live call.

### P0N-003 Offline Evaluation Runner

- Use fake/dry adapter only.
- Score schema, repair, and validation behavior.
- No network.

### P0N-004 Live Evaluation Runner, Explicit Opt-in

- Optional live calls.
- No App execution.
- No apply or rollback.
- No raw prompt or raw response persistence.

### P0N-005 Failure Taxonomy and Repair Metrics

- Track repair success rate.
- Track blocker categories.
- Track warning categories.
- No execution.

### P0N-006 App Evaluation Summary Surface

- Read-only.
- No live call from App.
- No raw output.

### P0N-007 Evaluation Telemetry / Redaction Audit

- Usage summary only.
- No raw prompt or raw response.

### P0N-008 Live Proposal Evaluation RC Polish + Release Notes

- Polish docs, copy, and release notes.
- Run stage-end gates only at RC boundary.

### P0N-009 Post-Release Review

- Review the P0N release candidate.
- Lock the next roadmap.

## Deferred

P0N explicitly defers:

- App-side live call.
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

Start with `DW-P0N-001 Live Proposal Golden Cases Plan, no implementation`.
