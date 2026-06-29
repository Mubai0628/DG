# App Approved Execution Implementation Gate v0.10

Status: P0O gate artifact. Do not implement App-side apply or rollback until
the relevant checklist items are covered by code, tests, and boundary checks.

Every item below must be testable. No item may rely only on prose.

## Path Safety

- Test rejects absolute paths.
- Test rejects Windows drive-letter paths.
- Test rejects UNC paths.
- Test rejects parent traversal.
- Test rejects nulls, newlines, shell metacharacters, URL-like paths, and
  query-like paths.
- Test rejects `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`,
  generated artifacts, and secret-like paths.
- Test rejects directory delete and recursive delete.
- Test rejects symlink, junction, and reparse point traversal when testable.
- Test verifies canonical targets remain under the approved workspace root.

## Content Safety

- Test rejects fake API key markers.
- Test rejects Bearer token and Authorization markers.
- Test rejects private key markers.
- Test rejects rawPrompt, rawDom, rawCsv, rawScreenshot, rawDiff, clipboard,
  and raw source markers.
- Test rejects binary-looking content unless a future explicit binary gate
  exists.
- Test enforces max file count.
- Test enforces max byte count.

## Approval Safety

- Test requires explicit approval receipt.
- Test requires receipt kind `apply` for apply.
- Test requires receipt kind `rollback` for rollback.
- Test requires exact typed confirmation.
- Test rejects expired receipts.
- Test rejects mismatched proposal, validation, audit, approval draft,
  checkpoint, workspace root ref, or allowed path fields.
- Test proves receipt is not a broad production PermissionLease.

## Checkpoint Safety

- Test creates checkpoint before update/delete.
- Test stores checkpoint only under the private workbench checkpoint area.
- Test includes checkpoint id, path, existedBefore, preimage hash, preimage
  bytes, change kind, and content needed for rollback.
- Test proves checkpoint raw preimage does not appear in UI summaries.
- Test proves checkpoint raw preimage does not appear in EventStore payloads.
- Test proves checkpoint raw preimage does not appear in release docs or test
  snapshots.

## Rollback Safety

- Test rollback create removes only the created file.
- Test rollback update restores the preimage.
- Test rollback delete recreates the file from preimage.
- Test rejects wrong checkpoint.
- Test rejects wrong, expired, or mismatched rollback receipt.
- Test rejects path escape during rollback.
- Test rejects symlink, junction, or reparse traversal when testable.
- Test proves no recursive delete or directory delete is possible.

## EventStore Safety

- Test apply event payload is summary-only.
- Test rollback event payload is summary-only.
- Test event payload contains ids, path summaries, counts, hashes, and warning
  codes only.
- Test event payload contains no raw source, raw diff, raw preimage, API key,
  raw prompt, raw response, reasoning_content, stdout, or stderr.
- Test event type allowlist only accepts approved apply/rollback event types.

## Replay Safety

- Test Event Log / Replay shows apply executed summaries.
- Test Event Log / Replay shows rollback executed summaries.
- Test replay links apply id and checkpoint id.
- Test replay reconstructs counts, hashes, and warning codes without raw
  content.
- Test replay warns on missing, partial, or mismatched chain data.

## UI Safety

- Test Apply button is disabled without a valid receipt.
- Test Apply button is disabled with wrong typed confirmation.
- Test Apply button is enabled only when all gates are satisfied.
- Test Rollback button is disabled without apply result, checkpoint, and
  rollback receipt.
- Test no generic command runner UI exists.
- Test no Git, shell, DeepSeek live execution, API key read, native bridge, or
  desktop action UI is introduced.

## CI / Boundary Safety

- `pnpm app:typecheck` must pass.
- `pnpm app:test` must pass.
- `cargo check --manifest-path app/src-tauri/Cargo.toml` must pass.
- `pnpm check:boundaries` must pass.
- `pnpm check:secrets` must pass.
- `git diff --check` must pass.
- `git diff --cached --check` must pass before each commit.

## Implementation Hold

Do not wire enabled App-side apply until P0O-003 and P0O-004 gates are covered.
Do not wire enabled App-side rollback until P0O-003, P0O-004, and P0O-005 gates
are covered. Do not release v0.11 until P0O-006 and P0O-007 prove the
end-to-end apply, event, refresh, rollback, and replay chain.
