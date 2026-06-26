# Runtime Disposable Workspace Snapshot Contract v0.5

The runtime disposable workspace snapshot contract is a pure, metadata-only
helper for P0J. It describes whether a future disposable workspace apply target
has enough safe summary information to be considered by a later sandbox apply
prototype. It does not create a disposable workspace and it does not apply a
patch.

## Scope

- Build a `DisposableWorkspaceSnapshotContract` from summary-only metadata.
- Validate safe relative path summaries, policy flags, hash prefixes, and size
  counts.
- Produce finding codes, warning counts, blocker counts, readiness flags, and a
  deterministic contract hash.
- Keep every execution readiness flag false.

## Inputs

Allowed inputs are summary fields only:

- `sourceWorkspaceFingerprint`
- opaque `disposableRootRef`
- `workspaceIndexRef`
- `sourceSnapshotHash`
- `expectedInputHash`
- file summaries with path, language, extension, size, line count, hash prefix,
  existence, planned mutation marker, and symlink-like booleans
- directory summaries with path, file count, byte count, and warning codes
- policy summaries for path, symlink, reparse point, generated artifact, secret
  path, line ending, and binary-file handling

`disposableRootRef` is an opaque display reference. It is not a real filesystem
path, and this phase rejects absolute, drive-letter, and UNC root references.

## Validation

The helper blocks:

- absolute paths, Windows drive-letter paths, UNC paths, parent traversal, URL
  or query-like paths, and shell metacharacters
- `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated artifact
  paths, and secret-like paths
- planned mutation of generated artifacts
- raw content fields such as raw source, raw diff, before/after content, raw
  prompt, raw DOM, raw CSV, screenshots, stdout/stderr, env, API key, and
  Authorization fields
- fake API key markers, bearer tokens, private key markers, and unsafe raw data
  markers
- duplicate paths, negative sizes, negative line counts, too many files, and too
  many total bytes
- symlink, junction, or reparse point summaries when the policy is `deny`
- attempts to set filesystem read/write, patch apply, rollback, Git, or shell
  readiness flags to true

The helper warns on empty file sets, missing workspace index refs, missing input
hashes, binary files, mixed or unknown line endings, large files, planned
deletes, config/build mutations, source mutations without test summaries,
unknown languages, and root refs that look path-like.

## Output

The output includes:

- status: `empty`, `contract_ready`, `warning`, or `blocked`
- contract id, source fingerprint, disposable root ref, workspace/index hashes
- file, directory, byte, generated, binary, symlink-like, and planned mutation
  counts
- policy summary
- finding and warning codes
- readiness flags with `canProceedToSandboxApplyPrototype` true only when there
  are no blockers
- `canReadFilesystem`, `canWriteFilesystem`, `canApplyPatch`,
  `canRollbackReal`, `canExecuteGit`, and `canExecuteShell` fixed to false
- deterministic `contractHash`

No raw source, raw diff, raw patch body, raw prompt, raw payload, or secret value
is returned.

## Relation To P0J

This contract implements the P0J-002 metadata model required by
[ADR 0005](adr/0005-sandboxed-real-apply-strategy.md). It is a prerequisite for
the future P0J-003 sandbox apply prototype, but it does not implement that
prototype.

Future P0J-003 work must still provide a disposable workspace contract, real
path guard, no-symlink-following policy, secret guard, approval gate, audit
events, and rollback evidence before any sandbox apply can be enabled.

## Non-Goals

- No disposable workspace creation.
- No workspace copy logic.
- No filesystem read or write.
- No patch apply.
- No rollback.
- No Git or shell execution.
- No DeepSeek call.
- No EventStore write.
- No native bridge.
- No desktop action.
