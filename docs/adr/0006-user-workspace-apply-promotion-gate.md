# ADR 0006: User Workspace Apply Promotion Gate

Status: Proposed / Accepted for P0K design gate.

## Context

P0J completed the disposable workspace apply and rollback prototype line. The
runtime can apply and rollback inside an explicit disposable root, can build
summary-only apply / rollback event projections, and can wrap disposable apply
behind an approval-gated helper. The App Shell remains disabled-only for apply
and rollback.

The next phase is a user workspace apply promotion gate. P0K must not directly
promote the disposable apply helper into user workspace mutation. User
workspace mutation has a larger blast radius than disposable workspace mutation
and needs a separate snapshot, backup, approval, rollback, and replay design.

The v0.1 `web_table_to_csv` Convert path remains the real conversion flow.
Record Draft Event remains the App/Tauri local summary-event write path.

## Decision

P0K first defines a promotion gate from a disposable apply result to possible
future user workspace mutation. User workspace apply is disabled by default.
The App Shell must not provide enabled apply controls.

Future promotion must use a disposable apply result as input. A promotion is
not direct apply. It must pass every gate below before any later prototype can
consider writing to a user workspace:

- user workspace snapshot contract
- backup and preimage contract
- path guard
- symlink, junction, and reparse point guard
- secret guard
- generated and dependency path guard
- patch proposal validation
- diff audit
- approval draft or approval receipt
- rollback checkpoint
- EventStore summary event plan
- replay projection that reconstructs promotion state
- explicit user confirmation

The rollback gate must prove restore coverage before promotion can execute in a
future implementation.

P0K-001 is design-only. It does not add runtime code, App UI capability, Tauri
commands, EventStore writers, user workspace reads, or user workspace writes.

## Non-goals

- No user workspace apply implementation.
- No real rollback implementation.
- No Git commit or push.
- No shell execution.
- No DeepSeek chat execution.
- No real ControlPlaneRun execution.
- No capability invocation.
- No production PermissionLease issuing.
- No MCP, plugin, or skills runtime execution.
- No native bridge.
- No desktop action.

## Required Gates Before Future Implementation

No future user workspace apply prototype may begin until every item below has a
testable contract, focused tests, and boundary checks:

- Disposable apply result exists.
- Disposable rollback result exists or rollback proof exists.
- User workspace snapshot contract exists.
- Backup and preimage contract exists.
- Path guard passes.
- Symlink, junction, and reparse point guard passes.
- Secret guard passes.
- Generated and dependency path guard passes.
- Patch proposal validation passes.
- Diff audit passes.
- Approval draft or approval receipt exists.
- Rollback checkpoint exists.
- EventStore summary event plan exists.
- Replay projection can reconstruct state.
- Explicit user confirmation exists.

Each gate must fail closed. A missing, stale, mismatched, or unsafe artifact
must block promotion.

## Promotion Target Contract

A future promotion request must include a target contract with:

- `userWorkspaceRootRef`: an opaque user workspace reference, not a raw path in
  event payloads.
- `sourceWorkspaceFingerprint`: summary-only fingerprint for the workspace that
  produced the proposal.
- `disposableApplyResultRef`: reference to the disposable apply result.
- `allowedRelativePaths`: normalized safe relative paths allowed for promotion.
- `deniedRelativePaths`: denied relative paths and globs.
- `expectedUserSnapshotHash`: hash expected immediately before promotion.
- `expectedDisposableOutputHash`: hash of the disposable output summary.
- `maxFiles`: maximum affected file count.
- `maxBytes`: maximum affected byte count.

The contract must require:

- no direct user workspace apply
- no symlink following
- no `.git` mutation
- no dependency directory mutation
- no generated artifact mutation unless a later explicit gate allows it
- no `.env`, private key, credential, or secret path mutation
- relative paths only
- no absolute paths, Windows drive-letter paths, UNC paths, parent traversal,
  shell metacharacters, URL-like paths, or query-like paths

## Backup / Rollback Contract

Future promotion requires a backup and rollback contract before mutation can
open. The first step must be metadata-only preview. A later implementation must
capture preimage hashes and content before any future mutation and must prove
that rollback can restore or remove every affected path.

Rollback cannot rely on Git only. Git state may be supplementary evidence in a
future phase, but the workbench must own a rollback checkpoint identity,
affected path list, before hashes, after hashes, restore scope, and
summary-only replay state.

Promotion must stay blocked if rollback proof is absent, stale, mismatched, or
unable to cover created, updated, and deleted paths.

## Event / Replay Contract

Future promotion must emit summary-only events for:

- promotion proposed
- promotion validated
- promotion approved
- promotion executed
- promotion result

Future rollback must emit summary-only events for:

- checkpoint
- rollback proposed
- rollback executed
- rollback result

Event payloads must be summary-only. They must not include raw payload, raw
CSV, raw source, raw prompt, raw diff, raw DOM, raw screenshot, clipboard
content, API key, Authorization header, environment value, stdout, stderr,
preimage content, or full memory content.

Replay must reconstruct apply and rollback state, readiness, blockers,
warnings, event order, and rollback coverage from summary-only payloads.

## Security Notes

Windows path handling is in scope. Future implementation must explicitly handle
or reject drive letters, UNC paths, alternate separators, reserved device names,
case-insensitive aliases, reparse points, symlinks, and junctions.

CRLF handling must be deterministic and visible in summary metadata. Line
ending normalization must not become hidden content mutation.

Binary files, large files, generated artifacts, dependency directories, build
outputs, `.git`, `.env`, private keys, and secret-like paths must be blocked or
covered by explicit later gates.

Malicious paths, stale snapshots, external file modifications between snapshot
and apply, interrupted apply, partial rollback, event/replay tampering, approval
bypass, and race conditions remain first-class risks.

## Consequences

This decision slows the path to real user workspace editing. It requires a
snapshot contract, backup contract, rollback proof, event/replay design,
approval gate, UI disabled-only copy, and boundary tests before implementation.

The benefit is stronger auditability and rollback readiness. The strategy is
compatible with a future production PermissionLease design while keeping the App
disabled until an explicit release gate opens user workspace apply.
