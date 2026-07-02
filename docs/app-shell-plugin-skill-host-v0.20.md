# App Shell Plugin / Skill Host v0.20

The App Shell Plugin / Skill Host is a read-only surface for previewing P0Y
plugin and skill metadata. It accepts pasted summary-only JSON and projects it
through the runtime manifest, package scanner, sandbox contract, and broker
descriptor helpers.

This surface is metadata preview only:

- no plugin execution
- no arbitrary skill runtime execution
- no package install
- no plugin capability execution
- no capability invocation
- no PermissionLease issuance
- no Tauri command
- no EventStore write
- no filesystem write
- no fetch or network
- no shell command
- no Git command
- no native bridge
- no desktop action

The App inputs are:

- plugin manifest JSON
- skill manifest JSON
- package metadata summary JSON

The App does not accept raw package content, raw args, raw output, raw prompt,
raw source, raw diff, API keys, Authorization headers, bearer tokens, command
fields, install scripts, or runtime execution requests. Unsafe metadata is
blocked by the runtime validators before descriptor preview.

The App displays summary-only fields:

- manifest status
- package scan status
- sandbox mode
- broker descriptor status
- plugin capability count
- skill step count
- package file count
- scanner finding count
- risk and policy summaries
- safe finding codes
- hash prefix
- readiness flags with execution disabled

The disabled controls are intentionally visible:

- `Install Plugin (disabled)`
- `Run Skill (disabled)`
- `Execute Plugin Capability (disabled)`

Clicking `Preview Plugin Manifest`, `Preview Skill Manifest`, or
`Preview Package Metadata` only updates React state. It does not invoke Tauri,
write events, read files, install packages, load code, fetch network, or run a
plugin/skill runtime.

Relation to P0Y:

- P0Y-002 validates plugin manifests.
- P0Y-003 validates skill manifests.
- P0Y-004 scans package metadata.
- P0Y-005 defines the sandbox contract and built-in safe simulation boundary.
- P0Y-006 builds plugin/skill broker descriptor previews.
- P0Y-007 exposes those summaries in the App Shell without execution.

Non-goals:

- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no plugin installation
- no mutating capability invocation
- no App execution
- no Git or shell execution
- no native bridge
- no desktop action
