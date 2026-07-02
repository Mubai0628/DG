# Runtime Skill Manifest Schema v0.20

The runtime skill manifest schema parses, validates, normalizes, and summarizes skill manifest metadata.

This is schema only:

- no skill runtime execution
- no arbitrary MCP tool invocation
- no plugin execution request
- no shell command
- no Git command
- no direct filesystem write
- no network credentials
- no API key, token, Authorization, or bearer persistence
- no native bridge
- no desktop action
- no lifecycle script execution
- no EventStore write
- no PermissionLease issuance

Allowed manifest fields:

- `schemaVersion`
- `skillId`
- `name`
- `description`
- `version`
- `author`
- `inputSchemaSummary`
- `outputSchemaSummary`
- `steps` metadata only
- `requiredCapabilities`
- `riskNotes`
- `simulationExamples` summary-only
- `tags`

The validator fails closed for:

- missing `skillId`, `name`, or `version`
- unsafe IDs
- steps that claim arbitrary execution
- steps that claim mutation without disabled metadata mode
- required high-risk capabilities without `manual_only_preview`
- raw prompt, source, diff, code, or tool argument fields
- secret markers
- duplicate steps or required capabilities
- readiness flags that imply execution
- arbitrary MCP tool invocation or plugin execution request fields

Output is summary-only:

- `status`
- `skillId`
- step count
- required capability count
- risk level
- `summaryHash`
- readiness flags with all execution paths false
- source: `runtime_skill_manifest_schema`

Relation to P0Y:

- P0Y-001 defined the design gate.
- P0Y-002 added plugin manifest metadata validation.
- P0Y-003 adds this skill manifest metadata validation.
- Later P0Y tasks may scan package metadata and build disabled / metadata-only / built-in safe simulated descriptors, but P0Y does not run arbitrary skill runtimes.
