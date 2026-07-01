# Production Memory / Project Knowledge Implementation Gate v0.15

Every P0T implementation task must satisfy the relevant testable gate before
the v0.16 RC.

## Schema Safety

- Only `policy`, `project_fact`, and `pitfall` entry types are accepted.
- Missing summaries are blocked.
- Oversized summaries are blocked.
- Invalid namespaces are blocked.
- Forbidden raw fields are blocked at any depth.
- Secret markers are blocked at any depth.
- Execution readiness fields claiming apply, rollback, Git, shell, native
  bridge, desktop action, or PermissionLease are blocked.

## Storage Safety

- Store paths stay under `.deepseek-workbench/project-knowledge`.
- Store records are summary-only.
- Store events are append-only.
- Corrupt lines produce warnings instead of raw content.
- Missing store returns an empty snapshot.
- Backup/export remains deferred.

## Candidate Safety

- Model output can propose candidates only.
- Tool output can propose candidates only.
- External sources can propose candidates only.
- Candidate summaries pass redaction before review.
- Candidate preview does not commit memory.

## Commit Safety

- Commit requires explicit App action.
- Policy commit requires `COMMIT PROJECT POLICY`.
- Project fact and pitfall commit require `COMMIT PROJECT KNOWLEDGE`.
- Commit rejects raw prompt/source/diff/response/reasoning/API key markers.
- Commit does not apply patches, roll back files, write EventStore execution
  events, or trigger Git/shell.

## Policy Source Safety

- Policy entries require human-reviewed trusted source.
- Model-direct policy write is blocked.
- Tool-direct policy write is blocked.
- External-source direct policy write is blocked.

## Evidence / Provenance Safety

- Project facts require evidence refs.
- Evidence refs require summary and hash or stable ref.
- Provenance records source kind, review state, and trust summary.
- Evidence refs remain summary-only.

## Revoke / Expire Safety

- Revoke requires `REVOKE PROJECT KNOWLEDGE`.
- Revoke appends an event and does not delete history.
- Expire appends an event with reason summary.
- Revoked and expired entries are not recalled as active entries.
- Pinned expiration exceptions are explicit and test-covered.

## Recall Safety

- Recall is summary-only.
- Project facts and pitfalls recall into `volatile_tail`.
- Policy recall can enter `workspace_rules_summary` only when human-reviewed
  and explicitly enabled.
- Recall never changes immutable rules.
- Recall includes match reasons.
- Recall enforces max entries and trust threshold.

## Context Integration Safety

- Context ledger shows recall summaries.
- No raw prompt/source/diff/API key enters context from memory.
- Include/exclude is App state only and does not commit memory.
- Memory recall cannot trigger apply, rollback, Git, shell, or PermissionLease.

## Event / Replay Safety

- Memory events cover commit, revoke, expire, recall used, and audit warning.
- Events are summary-only.
- Replay reconstructs active, revoked, and expired state.
- Missing, duplicate, or corrupt events warn instead of crashing.
- Redaction audit catches raw or secret markers.

## App UI Safety

- Project Knowledge panel shows human-reviewed, summary-only state.
- No raw prompt/source/diff/API key input is exposed.
- No localStorage or sessionStorage is used for memory state.
- Commit, revoke, expire, and refresh use fixed wrappers only.
- No generic Tauri invoke is added.
- Convert remains available.

## CI / Boundary Safety

- Runtime focused tests pass for schema, store, recall, replay, and audit.
- App tests pass for review, commit, revoke, recall, and replay surfaces.
- Rust/Tauri tests pass for fixed persistence commands.
- Boundary checker blocks generic write paths, generic invoke, raw memory, model
  direct policy write, App execution expansion, Git/shell expansion, native
  bridge, and desktop action.
- Secret checker passes.

## Release Gate

Before v0.16 release:

- Scoped P0T tests pass.
- Full stage-end gates pass.
- GitHub Actions main and tag runs are green.
- Manual QA checklist exists.
- RC checklist exists.
- Generated artifacts remain ignored.
