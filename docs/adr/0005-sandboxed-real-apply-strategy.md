# ADR 0005: Sandboxed Real Apply Strategy

Status: Proposed / Accepted for P0J design gate.

## Context

P0I completed the validation, approval, virtual apply, rollback checkpoint, and
replay preview chain. Those surfaces let the workbench inspect controlled
creation state without applying a patch, writing files, rolling back files,
executing Git, executing shell commands, invoking capabilities, issuing
PermissionLease records, or calling DeepSeek.

The next phase is a sandboxed real apply strategy. The goal is to define how a
future implementation can try real patch application in an isolated disposable
workspace while keeping real user workspace mutation deferred.

The v0.1 `web_table_to_csv` Convert path remains the only real user-facing
conversion flow. Record Draft Event remains the only local summary-event write
path in the App Shell.

## Decision

P0J allows design work for a future disposable workspace or sandbox workspace
apply path. It does not allow implementation of real apply in P0J-001.

The first future real apply target must be a disposable workspace root. Direct
mutation of the user's source workspace is not allowed. The design goal is no
direct user workspace mutation. Future rollback targets must also be limited to
the disposable workspace.

Any future sandbox apply path must be disabled by default until an explicit
gated milestone accepts the implementation, test evidence, UI gates, event
contract, rollback contract, and manual QA evidence.

The future apply target contract must identify:

- `disposableRoot`
- `sourceWorkspaceFingerprint`
- `allowedRelativePaths`
- `deniedRelativePaths`
- `snapshotHash`
- `expectedInputHash`
- `maxFiles`
- `maxBytes`
- no symlink following
- no `.git` mutation
- no `node_modules`, `dist`, or `target` mutation
- no `.env` or secret path mutation

## Non-Goals

- No user workspace apply.
- No Git commit or push.
- No shell execution.
- No DeepSeek chat execution.
- No real ControlPlaneRun execution.
- No broad capability invocation.
- No PermissionLease issuing.
- No memory persistence or memory commit UI.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.

## Required Gates Before Any Future Implementation

No real sandbox apply implementation may begin until every gate below has a
testable contract and a test plan:

- path guard
- symlink, junction, and reparse point policy
- deny globs
- secret scan
- generated artifact exclusion
- patch proposal validation
- diff audit preview
- approval draft
- virtual apply preview
- rollback checkpoint preview
- replay projection
- explicit user confirmation

The gates must prove that summary-only inputs cannot escalate into user
workspace mutation. They must also prove that no raw source, raw diff, raw
prompt, raw DOM, raw CSV, API key, Authorization header, environment value,
stdout, stderr, screenshot, clipboard, or full memory content is written to
events.

## Apply Target Contract

A future sandbox apply request must include a target contract with:

- `disposableRoot`: a normalized sandbox root controlled by the workbench.
- `sourceWorkspaceFingerprint`: a summary-only fingerprint of the source
  workspace that created the proposal.
- `allowedRelativePaths`: normalized relative paths allowed for this apply.
- `deniedRelativePaths`: normalized relative paths and globs that must never be
  changed.
- `snapshotHash`: hash of the input disposable workspace snapshot summary.
- `expectedInputHash`: hash that must match immediately before the apply.
- `maxFiles`: maximum changed file count.
- `maxBytes`: maximum affected byte count.

The target contract must require:

- relative paths only
- no absolute paths
- no Windows drive-letter paths
- no UNC paths
- no parent traversal
- no shell metacharacters
- no query-like or URL-like paths
- no symlink following
- no junction or reparse point traversal
- no `.git` mutation
- no `node_modules`, `dist`, `target`, `.tmp`, generated output, or dependency
  directory mutation
- no `.env`, private key, credential, or secret path mutation

The disposable workspace is the only allowed apply target for the first real
apply prototype. A user workspace path may appear only as a summary reference
or fingerprint, not as a mutation target.

## Rollback Contract

Future rollback must be designed before sandbox apply can open.

Rollback must include metadata plus a content hash preimage requirement for
future real rollback. A checkpoint must be able to prove that each affected
file can be restored or removed within the disposable workspace without relying
only on Git.

Rollback must be testable before the apply gate opens. Tests must cover created
files, updated files, deleted files, interrupted apply, missing checkpoint
metadata, hash mismatch, and denied path rollback attempts.

Rollback cannot rely on Git only. Git state may be future evidence, but the
rollback contract must include workbench-owned checkpoint identity, restore
scope, affected files, before hashes, after hashes, and summary-only replay
state.

## Event / Replay Contract

Future disposable apply events must be summary-only and must include proposed,
validated, approved, executed, and result summary events.

Future rollback events must be summary-only and must include checkpoint,
rollback proposed, rollback executed, and rollback result summary events.

Event payloads must not include raw payload, raw CSV, raw source, raw prompt,
raw diff, raw DOM, raw screenshot, clipboard content, API key, Authorization
header, environment value, stdout, stderr, or full memory content.

Replay must reconstruct apply and rollback state from event summaries. Replay
must distinguish preview-only state, proposed state, validated state, approved
state, executed disposable apply state, blocked state, checkpoint state, and
executed disposable rollback state. Replay must never imply user workspace
mutation.

## Security Notes

Windows path handling is part of the design boundary. Future implementation
must explicitly reject or normalize drive letters, UNC paths, alternate
separators, reserved device names, reparse points, symlinks, junctions, and
case-insensitive path aliases.

CRLF handling must be deterministic. The apply strategy must not turn line
ending normalization into hidden content mutation.

Binary files and large files must be blocked or handled by an explicit binary
policy. Generated artifacts, dependency directories, build outputs, target
directories, temporary directories, `.git`, `.env`, and secret files must remain
denied.

Malicious paths, path races, snapshot drift, stale approvals, interrupted
apply, partial rollback, event replay tampering, and approval bypass are in
scope for the sandbox design.

## Consequences

This decision makes the path to real editing slower. It requires a disposable
workspace contract, rollback design, event design, replay design, approval
gates, and UI copy before real apply code can be accepted.

The benefit is a smaller blast radius and a clearer audit trail. P0J can move
toward real patch application without directly mutating user source workspaces.
The strategy is compatible with later P0J tasks for snapshot contracts,
disposable apply prototypes, rollback prototypes, apply/rollback replay
projection, and approval-gated apply paths.
