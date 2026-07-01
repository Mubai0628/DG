# MVP Hardening / Recovery Threat Model v0.14

## Assets

- User workspace files.
- Approved execution receipts and typed confirmation summaries.
- Checkpoint metadata and hash summaries.
- Event log and replay projection.
- Git/shell verification summaries.
- Live proposal summaries.
- API key source references.

## Trust Boundaries

- User-provided objectives and pasted proposal summaries.
- Live proposal outputs after repair/schema validation.
- App UI state before approved execution.
- Tauri approved apply and rollback commands.
- Fixed Git/shell verification lanes.
- Event log summary writer.
- Replay and audit timeline projection.

## Attacker-Controlled Inputs

- Proposal paths and operation summaries.
- File names and relative paths.
- User workspace changes after approval.
- Event ordering and duplicate event candidates.
- Verification command outputs.
- Error messages returned by wrappers.
- Manual QA payloads and fixture summaries.

## Risks

Risk anchors:

- stale workspace snapshot
- Conflict after proposal approval
- Interrupted apply
- Interrupted rollback
- Checkpoint corruption
- Preimage mismatch
- Event mismatch
- Replay drift
- Duplicate apply
- Rollback after external modification
- Verification command failure
- Git/shell output leakage
- Raw checkpoint or preimage leakage
- Windows path edge cases
- UI accidentally enabling unsafe buttons

### Stale Workspace Snapshot

Risk anchor: stale workspace snapshot.

The workspace can change after proposal approval. Approved apply must compare
the current target state to the expected before hash and fail closed on mismatch.

### Conflict After Proposal Approval

Create targets can appear, update/delete targets can disappear, and allowed path
sets can drift. The App must show conflict detected and revalidate required
instead of auto-overwriting.

### Interrupted Apply

Apply may fail after a checkpoint is created or after a subset of operations.
Recovery must surface whether rollback is available, whether a checkpoint is
safe, and whether manual recovery is required.

### Interrupted Rollback

Rollback may fail or stop partway through. The result must remain summary-only
and must not attempt auto-rollback loops.

### Checkpoint Corruption

Checkpoint id, hash, path scope, operation count, and applied hash summaries can
be mismatched or missing. Rollback must fail closed when checkpoint verification
does not pass.

### Preimage Mismatch

Rollback must not write a raw preimage into UI or events, and it must block when
the current file hash no longer matches the applied hash.

### Event Mismatch

Apply, verification, rollback, and replay events can have mismatched proposal,
receipt, checkpoint, or request ids. Replay must warn or block deterministically
instead of joining unrelated chains.

### Replay Drift

Missing, duplicate, or reordered events can produce confusing timelines. Replay
must sort deterministically, warn on missing stages, and avoid raw payloads.

### Duplicate Apply

Repeated apply attempts can double-write or invalidate checkpoints. Approved
apply must remain receipt, confirmation, hash, and path gated.

### Rollback After External Modification

Rollback after external edits can destroy user changes. Rollback must verify the
current applied hash and block if the workspace has drifted.

### Verification Command Failure

Fixed Git/shell verification lanes can fail or emit sensitive output. Results
must be captured as safe status, counts, hashes, and warning codes only.

### Git/Shell Output Leakage

stdout and stderr must not appear raw in events or UI summaries. Safe excerpts
must be redacted and bounded.

### Raw Checkpoint / Preimage Leakage

Checkpoint preimages are sensitive file content. UI, events, replay, and tests
must only expose checkpoint ids, path counts, hashes, and safe status fields.

### Windows Path Edge Cases

Drive letters, UNC paths, verbatim paths, parent traversal, symlinks,
junctions, reparse points, `.git`, `.env`, `node_modules`, `dist`, `target`, and
`.tmp` must remain blocked from mutation paths.

### UI Accidentally Enabling Unsafe Buttons

Hardening panels must not enable auto-apply, arbitrary Git/shell, broad
PermissionLease, native bridge, desktop action, or model execution.

## Mitigations

- Expected before hash checks.
- Receipt and typed confirmation checks.
- Path guard and reparse/symlink checks.
- Checkpoint verification before rollback.
- Current applied hash verification before rollback.
- Summary-only EventStore writes.
- Replay timeline deterministic ordering.
- Raw marker redaction and boundary checks.
- Fixed Git/shell template checks.
- Docs-lock and source-boundary tests.

## Out of Scope

- Preventing all user-side external file modifications.
- Autonomous repair of partial apply failures.
- Arbitrary Git or shell execution.
- Native bridge or desktop action.
- Production multi-user authorization.
