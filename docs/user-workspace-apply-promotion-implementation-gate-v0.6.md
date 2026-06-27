# User Workspace Apply Promotion Implementation Gate v0.6

Status: P0K design gate. Do not implement until P0K-001, P0K-002, and P0K-003
gates are satisfied.

This checklist must be complete before P0K-004 User Workspace Apply Prototype
can begin. Every item must be testable. No item may rely only on prose.

## Path Safety

- Test rejects absolute paths.
- Test rejects Windows drive-letter paths.
- Test rejects UNC paths.
- Test rejects parent traversal.
- Test rejects null bytes and newlines.
- Test rejects shell metacharacters.
- Test rejects URL-like and query-like paths.
- Test rejects `.git`, `.env`, secret-like paths, `node_modules`, `dist`,
  `target`, `.tmp`, generated artifacts, and dependency directories.
- Test verifies allowed relative paths are enforced.
- Test verifies denied relative paths override allowed paths.

## Content Safety

- Test rejects raw source in event payloads.
- Test rejects raw diff in event payloads.
- Test rejects raw prompt, raw DOM, raw CSV, screenshot, clipboard, stdout,
  stderr, API key, Authorization header, and environment values.
- Test verifies preimage content is never returned to App UI or event payloads.
- Test verifies binary policy blocks or explicitly classifies binary files.
- Test verifies large file policy blocks over-limit content.

## Snapshot Safety

- Test requires user workspace snapshot contract.
- Test requires source workspace fingerprint.
- Test requires expected user snapshot hash.
- Test blocks stale snapshot hash.
- Test blocks external modification between snapshot and future apply.
- Test verifies disposable output hash matches promotion input.
- Test verifies metadata-only snapshot preview is available before any future
  write path.

## Backup Safety

- Test requires backup/preimage contract.
- Test requires preimage hash for every updated or deleted file.
- Test requires created-file rollback plan.
- Test blocks missing preimage metadata.
- Test blocks preimage hash mismatch.
- Test verifies preimage data is not written to summary events.

## Rollback Safety

- Test requires rollback checkpoint before promotion.
- Test requires rollback proof for created, updated, and deleted operations.
- Test verifies rollback cannot rely only on Git.
- Test blocks promotion if rollback coverage is incomplete.
- Test covers interrupted apply and partial rollback replay.
- Test verifies rollback state can be reconstructed from summary-only events.

## Event / Replay Safety

- Test requires summary-only promotion proposed event plan.
- Test requires summary-only promotion validated event plan.
- Test requires summary-only promotion approved event plan.
- Test requires summary-only promotion executed event plan.
- Test requires summary-only promotion result event plan.
- Test requires summary-only checkpoint and rollback event plan.
- Test verifies replay reconstructs readiness, blockers, warnings, apply state,
  rollback state, and interrupted state.
- Test verifies no event payload includes raw content.

## Approval Safety

- Test requires approval draft or approval receipt.
- Test blocks expired approval.
- Test blocks approval scope mismatch.
- Test blocks approval path widening.
- Test blocks approval file count or byte count violations.
- Test verifies P0K design does not issue production PermissionLease records.

## UI Safety

- Test verifies App Shell has no enabled Apply button.
- Test verifies App Shell has no enabled Rollback button.
- Test verifies App Shell has no enabled Write Events button.
- Test verifies App Shell has no approval execution control.
- Test verifies App Shell copy says disabled by default.
- Test verifies no Tauri command is added for promotion.
- Test verifies no native bridge or desktop action is enabled.

## CI / Boundary Safety

- Test verifies boundary checker blocks user workspace apply outside the future
  explicit module.
- Test verifies no Git execution path is introduced.
- Test verifies no shell execution path is introduced.
- Test verifies no DeepSeek call is introduced.
- Test verifies no MCP/plugin/skills runtime execution is introduced.
- Test verifies no new dependency is required for the design gate.

## Hard Stop

Do not implement P0K-004 until all P0K-001, P0K-002, and P0K-003 gates are
satisfied with tests. A passing prose checklist is not sufficient.
