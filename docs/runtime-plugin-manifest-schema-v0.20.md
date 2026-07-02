# Runtime Plugin Manifest Schema v0.20

The runtime plugin manifest schema parses, validates, normalizes, and summarizes plugin manifest metadata.

This is schema only:

- no runtime plugin execution
- no package install
- no code load
- no lifecycle script execution
- no filesystem write
- no EventStore write
- no native bridge
- no desktop action
- no arbitrary shell/process spawn
- no PermissionLease issuance

Allowed manifest fields:

- `schemaVersion`
- `pluginId`
- `name`
- `description`
- `version`
- `publisher`
- `homepage`
- `license`
- `capabilities`
- `permissions`
- `entrypoints` metadata only
- `packageSummary`
- `riskNotes`
- `tags`

Each capability is metadata only and includes:

- `capabilityId`
- `kind`
- `summary`
- `riskLevel`
- `requiresApproval`
- `executionMode`

Allowed execution modes are `disabled`, `metadata_only`, and `simulated`. Write, network, and UI capability metadata must remain disabled in P0Y.

The validator fails closed for:

- missing `pluginId`, `name`, `version`, or capabilities
- duplicate capability IDs
- unsafe IDs
- unknown schema versions
- unsupported execution modes
- broad mutation claims
- unsafe entrypoint paths
- lifecycle script fields
- package URLs with query secrets
- secret markers
- raw code markers
- binary-looking manifest fields
- readiness flags that imply execution

Output is summary-only:

- `status: parsed | warning | blocked`
- `manifestId`
- `pluginId`
- capability and permission counts
- risk level
- capability summaries
- finding counts
- `manifestHash`
- readiness flags with all execution paths false
- source: `runtime_plugin_manifest_schema`

Relation to P0Y:

- P0Y-001 defined the design gate.
- P0Y-002 adds this plugin manifest contract.
- P0Y-003 will add the matching skill manifest contract.
- Later P0Y tasks may scan package metadata and map accepted manifests into disabled / metadata-only / simulated descriptors, but not execute plugin code.
