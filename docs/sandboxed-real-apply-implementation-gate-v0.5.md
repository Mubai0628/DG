# Sandboxed Real Apply Implementation Gate v0.5

Status: P0J gate checklist. Do not implement real sandbox apply until all
P0J-001 and P0J-002 gates are satisfied by tests. No item in this document may
rely only on prose.

This document does not implement apply, rollback, filesystem reads,
filesystem writes, Git execution, shell execution, DeepSeek calls,
PermissionLease issuing, EventStore writers, native bridge, or desktop action.

## Gate Rule

Do not implement until all P0J-001/P0J-002 gates are satisfied.

Every gate item below must have:

- a named test or QA check
- deterministic expected result
- failure behavior
- boundary grep or secret check coverage when applicable

## Path Safety

- Test relative safe paths are accepted only inside `disposableRoot`.
- Test absolute paths are rejected.
- Test Windows drive-letter paths are rejected.
- Test UNC paths are rejected.
- Test parent traversal is rejected.
- Test mixed slash and backslash traversal is rejected.
- Test shell metacharacters are rejected.
- Test URL-like and query-like paths are rejected.
- Test `.git`, `.env`, private key, credential, secret, dependency, build,
  target, temporary, generated output, and report paths are rejected.
- Test `allowedRelativePaths` and `deniedRelativePaths` are enforced.
- Test `maxFiles`, `maxBytes`, and path length caps.

## Content Safety

- Test raw source fields are rejected.
- Test raw diff and raw patch fields are rejected.
- Test raw prompt, raw DOM, raw CSV, raw screenshot, clipboard, stdout, stderr,
  and full memory content markers are rejected.
- Test API key, Bearer token, Authorization header, private key, and
  environment value markers are rejected.
- Test binary and large file policy before any future content mutation.
- Test CRLF handling is deterministic.

## Snapshot Safety

- Test disposable snapshot id and snapshot hash are required.
- Test `sourceWorkspaceFingerprint` is summary-only.
- Test expected input hash must match immediately before future apply.
- Test snapshot drift blocks future apply.
- Test no user workspace path is accepted as a mutation target.
- Test symlink, junction, hard link, and reparse point policy.
- Test generated artifact exclusion is enforced in snapshots.

## Rollback Safety

- Test rollback checkpoint summary is required before future apply.
- Test rollback checkpoint hash is required.
- Test restore scope includes files to restore, files to remove if created, and
  files to recreate if deleted.
- Test metadata plus content hash preimage is required before future real
  rollback.
- Test rollback target is the disposable workspace only.
- Test rollback does not rely on Git only.
- Test interrupted apply and interrupted rollback states.

## Event / Replay Safety

- Test future apply events are summary-only.
- Test future rollback events are summary-only.
- Test events reject raw payload, raw CSV, raw source, raw prompt, raw diff, API
  key, Authorization header, environment value, stdout, stderr, screenshot,
  clipboard, and full memory content.
- Test replay reconstructs proposed, validated, approved, executed, blocked,
  checkpoint, rollback proposed, rollback executed, and result states.
- Test replay never implies user workspace mutation.
- Test tampered or missing event chains are blocked or downgraded.

## Approval Safety

- Test explicit user confirmation is required.
- Test approval binds proposal id, validation id, audit id, snapshot hash,
  rollback checkpoint id, and disposable target id.
- Test stale approval blocks future apply.
- Test approval for one target cannot apply to another target.
- Test approval and rejection execution remain disabled until the gated
  prototype task.

## UI Safety

- Test UI copy says sandbox-only and no user workspace mutation.
- Test disabled-by-default apply controls until a future gated implementation.
- Test no enabled Apply, Rollback, Commit, Approve, Reject, Execute, Run, or
  Shell controls appear before the accepted implementation task.
- Test UI displays target as disposable workspace root.
- Test UI displays rollback checkpoint precondition.
- Test UI never displays raw source, raw diff, raw prompt, raw DOM, raw CSV, API
  key, Authorization header, environment value, stdout, stderr, screenshot, or
  clipboard content.

## CI / Boundary Safety

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm app:test`
- `pnpm app:qa:check`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`
- Boundary grep classification has no `SUSPICIOUS_SOURCE_CODE`.
- API key grep classification has no `BLOCKING_SECRET_RISK`.

## Exit Criteria For P0J-003 Start

P0J-003 may start only after P0J-001 and P0J-002 have documented contracts and
tests for the gates above. Even then, P0J-003 may target only a disposable
workspace and must remain disabled by default.
