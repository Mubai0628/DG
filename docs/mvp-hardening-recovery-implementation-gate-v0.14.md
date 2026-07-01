# MVP Hardening / Recovery Implementation Gate v0.14

Every P0S implementation task must satisfy the relevant testable gate before
the v0.15 RC.

Test anchors:

- Golden regression tests
- Conflict detection tests
- Checkpoint verification tests
- Rollback verification tests
- Summary-only event tests
- Replay projection tests
- Raw output leakage tests

## Golden Regression

- A deterministic E2E golden regression suite exists.
- It covers successful docs-only apply.
- It covers apply, verification, and rollback.
- It covers stale conflict.
- It covers unsafe path blocking.
- It covers raw content marker blocking.

## Conflict Detection

- Approved apply blocks expected before hash mismatch.
- Approved apply blocks create target already exists.
- Approved apply blocks update/delete target disappeared.
- Approved apply blocks changed allowed path set.
- Approved apply blocks expired or mismatched receipt.
- Approved apply blocks mismatched proposal, validation, audit, or receipt ids.

## Checkpoint Verification

- Checkpoint creation failure is surfaced safely.
- Checkpoint id and hash mismatch block rollback.
- Checkpoint path scope mismatch blocks rollback.
- Checkpoint metadata is summary-only.

## Rollback Verification

- Rollback blocks missing checkpoint.
- Rollback blocks current file hash mismatch.
- Rollback blocks rollback target symlink, junction, reparse point, directory
  delete, or workspace escape.
- Rollback result stays summary-only.

## Summary-Only Events

- Apply events contain ids, counts, hashes, path summaries, and warning codes.
- Rollback events contain ids, counts, hashes, path summaries, and warning
  codes.
- Verification events contain status, counts, hashes, and warning codes.
- Events never include raw source, raw diff, raw preimage, raw prompt, raw
  response, reasoning_content, API key, stdout, or stderr.

## Replay Projection

- Replay reconstructs proposal imported/generated, validation result, diff
  audit, approval receipt, apply attempted, apply succeeded/failed, checkpoint
  created, verification run, verification passed/failed, rollback attempted,
  rollback succeeded/failed, and final task status.
- Missing events warn instead of crashing.
- Duplicate events are handled deterministically.
- Timeline hash is deterministic.

## Raw Output Leakage

- Tests include raw prompt marker rejection.
- Tests include raw response marker rejection.
- Tests include reasoning_content marker rejection.
- Tests include API key marker rejection.
- Tests include raw source/diff/preimage marker rejection.
- Tests include stdout/stderr raw output blocking for verification lanes.

## Boundary Checks

- Approved apply and rollback commands remain the only App-side write paths.
- Git and shell safe lanes remain fixed and allowlisted.
- Live proposal App path cannot auto-apply.
- Raw content is blocked from events.
- Native bridge remains disabled.
- Desktop action remains disabled.
- No model execution path is introduced.

## Release Gate

Before v0.15 release:

- Scoped P0S tests pass.
- Full stage-end gates pass.
- GitHub Actions main and tag runs are green.
- Manual QA checklist exists.
- RC checklist exists.
- Known build/package warnings are either fixed or documented as non-blocking.
