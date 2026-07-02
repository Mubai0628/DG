# Runtime Package Metadata Scanner v0.20

The runtime package metadata scanner inspects summary-only package metadata for plugin and skill packages before they can become descriptor previews.

This is package metadata scanning only:

- no package install
- no code execution
- no lifecycle script execution
- no native module loading
- no shell command
- no Git command
- no filesystem write
- no EventStore write
- no PermissionLease issuance
- no native bridge
- no desktop action

Allowed input is metadata only:

- package name and version
- plugin or skill manifest JSON
- file list summaries with paths and hash prefixes
- package size
- declared scripts summary
- dependency names only
- license summary

The scanner must not receive raw package contents, raw source, raw bundle content, raw file contents, raw script bodies, API keys, Authorization headers, bearer tokens, or secret values.

The scanner fails closed for:

- blocked plugin or skill manifests
- package lifecycle scripts such as `preinstall`, `install`, `postinstall`, `prepack`, or `prepare`
- shell or install script summaries
- native and binary markers such as `binding.gyp`, `.node`, `node-gyp`, prebuilds, or native modules
- unsafe package paths including absolute paths, parent traversal, `.git`, `.env`, `node_modules`, `dist`, `target`, and `.tmp`
- raw code or package content fields
- secret markers
- oversized package metadata summaries
- readiness flags that claim execution, install, network, EventStore writes, filesystem writes, or PermissionLease issuance

Output is summary-only:

- `status: scanned | warning | blocked`
- package name and version
- package kind
- file, dependency, and declared script counts
- risk level
- manifest refs with hashes only
- finding counts and safe finding codes
- `packageHash`
- readiness flags with all execution paths false
- source: `runtime_package_metadata_scanner`

Readiness means metadata may enter descriptor preview only. It does not enable package installation, plugin execution, skill execution, code loading, filesystem writes, network calls, EventStore writes, PermissionLease issuance, shell execution, native bridge usage, or desktop actions.

Relation to P0Y:

- P0Y-002 added plugin manifest metadata validation.
- P0Y-003 added skill manifest metadata validation.
- P0Y-004 adds this package metadata scanner.
- Later P0Y tasks may convert accepted package metadata into disabled, metadata-only, or built-in safe simulated descriptors, but P0Y does not install packages or execute arbitrary plugin or skill code.
