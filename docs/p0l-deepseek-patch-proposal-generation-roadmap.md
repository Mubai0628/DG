# P0L DeepSeek Patch Proposal Generation Roadmap

Status: planned after `v0.7.0-user-workspace-apply-preview-rc.1`.

## Goal

P0L moves from runtime-controlled apply/rollback prototypes to
DeepSeek-assisted patch proposal generation. DeepSeek may generate structured
patch proposals only.

DeepSeek must not write files. DeepSeek must not call apply or rollback.
DeepSeek output must pass schema validation, secret scan, path guard,
validation preview, diff audit, approval draft, virtual apply, rollback, and
replay chain.

App execution remains disabled by default. User workspace apply remains runtime
explicit prototype only until a future release gate explicitly changes that
boundary.

## Recommended Tasks

### P0L-001 DeepSeek Patch Proposal Generation Plan / ADR

- Design only.
- No live model call.
- No implementation.
- Define the model I/O contract and safety gates.

### P0L-002 Patch Proposal Schema for Model Output

- Define structured schema and fixtures.
- Reject raw source, raw diff, raw prompt, and secret-bearing fields.
- No model call.

### P0L-003 Offline Fake Model Patch Proposal Harness

- Use fake DeepSeek client or fixtures.
- Exercise the proposal validation chain.
- No live call.

### P0L-004 DeepSeek Dry Proposal Generation Adapter

- Generate draft proposals only.
- Still no apply.
- Gated by conformance and explicit opt-in.

### P0L-005 Proposal Repair / Schema Repair Loop

- Repair invalid JSON, unsafe path refs, and forbidden content markers.
- No file write.
- No apply or rollback.

### P0L-006 App Patch Proposal Import from Model Draft

- App preview only.
- Import structured draft summaries into existing proposal preview surfaces.
- No apply.

### P0L-007 Model Proposal -> Existing P0I/P0K Chain Integration

- Route model-generated proposal drafts through validation, audit, approval,
  virtual apply, rollback, event preview, and replay.
- No App execution.

### P0L-008 DeepSeek Proposal RC Polish + Release Notes

- Polish docs, copy, and release notes.
- Run stage-end gates only at RC boundary.

### P0L-009 Post-Release Review

- Review the P0L release candidate.
- Lock the next roadmap.

## Deferred

P0L explicitly defers:

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

Start with `DW-P0L-001 DeepSeek Patch Proposal Generation Plan / ADR, no
implementation`.
