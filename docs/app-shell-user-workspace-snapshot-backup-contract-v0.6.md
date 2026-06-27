# App Shell User Workspace Snapshot / Backup Contract v0.6

The App Shell exposes a read-only User Workspace Snapshot / Backup Contract
preview for P0K. It helps inspect the metadata required by a future user
workspace promotion gate. The panel does not read files, write files, create a
backup, capture preimage content, apply a patch, execute rollback, call Tauri,
or write EventStore events.

## Panel

The panel title is:

`User Workspace Snapshot / Backup Contract`

The badge is:

`Metadata only / no user workspace apply`

The panel copy states that it builds a summary-only contract for a future user
workspace promotion gate and that no files are read or written and no backup is
created.

## Inputs

The App accepts only summary inputs:

- `userWorkspaceRootRef`, an opaque display reference rather than a real
  executable path
- `sourceWorkspaceFingerprint`
- file summary JSON, or a Workspace Index summary if one is available

The panel may also pass display refs from disposable snapshot/apply surfaces.
It does not accept raw source, raw diff, raw patch body, backup content,
preimage content, executable root paths, API keys, or secret values.

## Output

The App normalizes the runtime contract into a summary-only view model showing:

- status and contract id
- file and byte counts
- planned mutation count
- backup and preimage requirement counts
- generated, binary, and symlink-like counts
- blocker, warning, and finding counts
- readiness flags
- hash prefix and next action

All apply, rollback, filesystem, Git, shell, and EventStore readiness flags are
display-only and remain disabled.

## Integrations

- Context Assembly Preview places the user workspace contract ref in
  `no_compress_zone`.
- Audit Surface can display summary-only finding counts.
- Capability Plan Preview may use the contract ref as display-only evidence.
- Control Projection may show a summary only.

These integrations do not create a run, do not assemble a real prompt, do not
invoke a capability, do not issue a permission lease, and do not write events.

## Non-goals

- No user workspace read/write
- No backup file creation
- No preimage capture
- No user workspace apply
- No user workspace rollback
- No Git or shell execution
- No DeepSeek call
- No Tauri command
- No EventStore write
- No native bridge
- No desktop action

## Future Path

This panel feeds the future P0K-003 Promotion Readiness Checker. Real snapshot
capture, real backup creation, real user workspace apply, and real rollback
remain deferred behind later gates.
