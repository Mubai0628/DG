# Sandboxed Real Apply Threat Model v0.5

Status: P0J design input. This document is a threat model only. It does not
implement sandbox apply, rollback, filesystem reads, filesystem writes, Git
execution, shell execution, DeepSeek calls, native bridge, desktop action, or
capability invocation.

## Assets

- User source workspace.
- Disposable workspace root.
- Patch proposal summaries.
- Validation, diff audit, approval draft, virtual apply, rollback checkpoint,
  and replay projection summaries.
- Event log integrity.
- Workspace fingerprints, snapshot hashes, and path summaries.
- Secrets and private project files.
- v0.1 `web_table_to_csv` drafts and summary events.

## Trust Boundaries

- User workspace to disposable workspace.
- App Shell UI to runtime helpers.
- Summary-only proposal data to future real apply implementation.
- Event writer to replay projection.
- Approval draft to future approval-gated apply path.
- Disposable workspace root to host filesystem.

The disposable workspace boundary is the only future mutation boundary accepted
for P0J. User workspace mutation remains out of bounds.

## Attacker-Controlled Inputs

- Pasted or imported workspace index summaries.
- Patch proposal title and change summary.
- Safe path refs that may still contain malicious paths.
- Validation, audit, approval, virtual apply, rollback, and replay summary
  fixtures.
- Event summaries loaded for replay.
- File names, extensions, line estimates, risk hints, hashes, and warning
  codes.

## Path Traversal Risks

Attackers may try absolute paths, drive-letter paths, UNC paths, parent
traversal, mixed slash forms, encoded traversal, shell metacharacters,
URL-like paths, query strings, reserved device names, or case variants.

Mitigations:

- normalize and validate every relative path before use
- reject absolute, drive-letter, UNC, parent traversal, URL-like, and
  query-like paths
- reject shell metacharacters
- enforce `allowedRelativePaths` and `deniedRelativePaths`
- test Windows path variants explicitly

## Symlink, Junction, And Reparse Point Risks

Windows symlinks, junctions, hard links, and reparse points can redirect a
sandbox path to the user workspace or another sensitive location.

Mitigations:

- no symlink following by default
- reject junctions and reparse points before future apply
- resolve final target identity inside the disposable root before mutation
- deny hard link based mutation unless a later ADR accepts it
- test reparse point and junction handling before any implementation gate opens

## Secret Leakage Risks

Patch summaries, events, UI previews, and replay projections could accidentally
carry raw source, raw prompt, raw diff, raw DOM, raw CSV, API keys,
Authorization headers, environment values, private keys, screenshots,
clipboard content, stdout, stderr, or full memory content.

Mitigations:

- secret scan before future apply
- raw marker rejection
- summary-only event payloads
- redaction tests
- deny `.env`, private key, credential, and secret paths
- keep replay state summary-only

## Generated Artifact And Dependency Directory Risks

Generated outputs and dependency directories can be huge, unstable, executable,
or outside review intent.

Mitigations:

- deny `node_modules`, `dist`, `target`, `.tmp`, generated reports, package
  output, and dependency caches
- require generated artifact exclusion tests
- keep max file and max byte limits
- block mutation of `.git`

## Rollback Mismatch Risks

Rollback can fail if the checkpoint is stale, incomplete, content hashes do not
match, output snapshot drifted, delete/create operations are confused, or apply
is interrupted.

Mitigations:

- require metadata plus content hash preimage for future real rollback
- test rollback before apply gate opens
- record restore scope, files to restore, files to remove if created, and
  files to recreate if deleted
- block rollback when snapshot hashes mismatch
- replay interrupted apply states separately

## Event / Replay Tampering Risks

Events can overclaim execution state or hide failed apply/rollback attempts.

Mitigations:

- summary-only event schema
- hash each event input and result summary
- replay must distinguish preview, proposed, validated, approved, executed,
  blocked, checkpoint, rollback proposed, rollback executed, and result states
- replay must never imply user workspace mutation
- tests must cover tampered or missing event chains

## Approval Bypass Risks

Future apply could run with stale approval, wrong proposal id, mismatched
snapshot hash, missing rollback checkpoint, or UI wording that hides the target.

Mitigations:

- explicit approval precondition
- approval id must bind proposal, validation, audit, snapshot, and rollback
  checkpoint summaries
- stale approval detection
- visible sandbox-only target in UI
- disabled-by-default apply controls until the gated prototype task

## Race And Interruption Risks

Sandbox snapshots may change between validation and apply. Apply may be
interrupted after some operations. Rollback may be interrupted.

Mitigations:

- expected input hash check immediately before future apply
- operation-level result summaries
- interrupted state events
- rollback checkpoint test before apply
- idempotent replay projection for partial and blocked states

## Windows-Specific Risks

- Drive letters and UNC roots.
- Reparse points, junctions, and symlinks.
- Case-insensitive path aliases.
- Reserved device names.
- Mixed slash and backslash forms.
- CRLF normalization drift.
- Long path handling.

Mitigations:

- Windows-specific path guard tests
- explicit reparse policy
- CRLF policy tests
- path length limits
- no user workspace apply

## Out-Of-Scope Risks

- Production user workspace mutation.
- Git commit, push, merge, rebase, or checkout automation.
- Real shell execution.
- Real DeepSeek chat execution.
- Real ControlPlaneRun execution.
- Broad capability invocation.
- PermissionLease issuing for production mutation.
- MCP, plugin, or skills runtime.
- Native bridge or desktop action.
- Memory persistence and memory commit UI.
