# App Shell Disposable Workspace Snapshot Contract v0.5

The App Shell disposable workspace snapshot panel is a read-only preview for
P0J-002. It lets the user preview a summary-only contract for a future
disposable workspace apply target. It does not read files, write files, copy a
workspace, or apply a patch.

## UI Behavior

The panel is labeled `Disposable Workspace Snapshot Contract` with the badge
`Metadata only / no apply`.

Inputs:

- opaque `disposableRootRef`
- source workspace fingerprint
- optional file summary JSON

If file summary JSON is blank and a Workspace Index summary is loaded, the panel
uses the safe Workspace Index summary fields. It maps only path, language,
extension, size, line count, hash prefix, indexed/existence status, and warning
codes.

The `Preview Snapshot Contract` button only updates React state. It does not
call Tauri, does not write an EventStore event, does not read the filesystem,
does not write the filesystem, and does not create a disposable workspace.

## Displayed Summary

The panel displays:

- status
- contract id
- disposable root ref
- source workspace fingerprint
- file and directory counts
- total bytes
- generated, binary, and symlink-like counts
- planned mutation count
- blocker, warning, and finding counts
- hash prefix
- policy summary
- readiness flags
- safe file summary rows
- finding codes and safe summaries
- next action

The readiness flags for filesystem read/write, patch apply, real rollback, Git,
and shell remain false.

## Safety Boundary

The App Shell accepts only metadata summaries. It rejects or blocks raw content
fields, raw source, raw diff, raw patch body, raw prompt, raw DOM, raw CSV,
screenshots, clipboard markers, API key markers, Authorization markers, private
key markers, secret-like paths, generated artifact mutation, unsafe paths,
symlink-like summaries under deny policy, and attempts to enable execution
flags.

Raw file content is not accepted or displayed. Raw source and raw diff are not
displayed. Secret values are not displayed.

## Integrations

- Context Assembly Preview places the snapshot contract ref in
  `no_compress_zone`.
- Audit Surface receives summary-only finding and warning counts.
- Capability Plan Preview may treat the contract as display-only evidence in a
  later task, but this task does not invoke any capability.
- Control Plane Projection remains summary-only and no run is created.

## Relation To P0J

This panel implements the App Shell side of the P0J-002 metadata-only snapshot
contract. It follows the P0J-001 sandboxed real apply strategy and keeps the
future P0J-003 sandbox apply prototype deferred.

`disposableRootRef` is an opaque display reference, not a real path. The App
Shell still has no real disposable workspace scanner, no disposable workspace
creation, no workspace copy logic, and no user workspace mutation.

## Non-Goals

- No disposable workspace creation.
- No filesystem crawl.
- No filesystem read or write.
- No patch apply.
- No rollback.
- No Git or shell execution.
- No DeepSeek call.
- No EventStore write.
- No Tauri command.
- No native bridge.
- No desktop action.
