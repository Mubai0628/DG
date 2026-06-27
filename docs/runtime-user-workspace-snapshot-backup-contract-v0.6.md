# Runtime User Workspace Snapshot / Backup Contract v0.6

The User Workspace Snapshot / Backup Contract is a metadata-only runtime helper
for the P0K user workspace promotion gate. It describes what a future user
workspace snapshot and backup would need before promotion can be considered.
It does not read user workspace files, write user workspace files, create
backup files, capture preimage content, apply patches, or run rollback.

## Scope

- Build a summary-only contract from caller-supplied metadata, path refs, and
  hash prefixes.
- Keep the contract at no user workspace read/write and no backup creation.
- Treat `userWorkspaceRootRef` as an opaque display reference, not a real
  executable path.
- Declare future backup and preimage hash requirements without storing file
  bodies.
- Return readiness for the next preview stage only:
  `canProceedToPromotionReadinessCheck`.
- Keep every execution readiness flag false.

## Inputs

The helper accepts safe summary fields such as:

- `userWorkspaceRootRef`
- `sourceWorkspaceFingerprint`
- disposable apply, rollback, and snapshot contract refs
- expected disposable output and user snapshot hashes
- file and directory summaries
- allowed and denied relative path summaries
- path, symlink, reparse point, generated artifact, secret path, line ending,
  binary, max file, and max byte policies

File summaries may include path, language, extension, size, line count, hash
prefix, existence, planned mutation, backup requirement flags, preimage hash
requirement flags, warning codes, binary/generated flags, symlink-like flags,
and line ending metadata.

## Rejected Inputs

The helper blocks raw or executable data, including:

- file content, backup content, preimage content, raw source, raw diff, raw
  patch, before/after content, raw prompt, raw DOM, raw CSV, screenshots,
  clipboard payloads, API keys, authorization headers, environment data,
  stdout, stderr, real absolute paths, and backup file paths.
- absolute paths, Windows drive-letter paths, UNC paths, parent traversal,
  URL/query-like paths, shell metacharacters, `.git`, `.env`, secret-like
  filenames, `node_modules`, `dist`, `target`, `.tmp`, and planned mutations in
  generated artifact paths.
- symlink, junction, or reparse point summaries when the policy is deny.
- planned mutations without `backupRequired`.
- update/delete mutations without `preimageHashRequired`.
- attempts to set filesystem, user apply, user rollback, Git, or shell
  readiness flags to true.

## Output

The contract output includes:

- status, contract id, refs, file and directory counts, total bytes, mutation
  counts, backup and preimage requirement counts
- generated, binary, and symlink-like counts
- metadata-only file and directory summaries
- backup requirements with `backupStorage: "deferred"`
- blocker, warning, and finding counts
- deterministic contract hash
- next action
- source: `runtime_user_workspace_snapshot_backup_contract`

The output never includes raw source, raw diff, raw patch, preimage content,
backup content, file content, executable paths, or API keys.

## Backup Requirements

Backup requirements are declarations for a future implementation. Each
requirement includes only metadata:

- requirement id
- relative path
- mutation kind
- whether a preimage hash is required
- whether preimage content will be required by a future apply implementation
- `backupStorage: "deferred"`
- warning codes
- requirement hash

No backup file is created, no backup path is accepted, and no preimage content
is captured in this task.

## Readiness

`contract_ready` means the metadata contract can feed the future P0K-003
Promotion Readiness Checker. It does not enable user workspace apply.

The readiness flags remain:

- `canReadFilesystem: false`
- `canWriteFilesystem: false`
- `canApplyToUserWorkspace: false`
- `canRollbackUserWorkspace: false`
- `canExecuteGit: false`
- `canExecuteShell: false`

## Relation To P0K

This helper implements the metadata-only contract described by ADR 0006. It is
the runtime input model for a future Promotion Readiness Checker. It depends on
safe summaries from the disposable workspace apply path, but it does not promote
anything into the user workspace.

Future work remains deferred:

- P0K-003 Promotion Readiness Checker
- real user workspace snapshot and backup capture
- real user workspace apply
- real user workspace rollback
- EventStore writing for real apply or rollback
- production PermissionLease issuance
