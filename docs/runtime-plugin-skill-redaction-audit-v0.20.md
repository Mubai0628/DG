# Runtime Plugin / Skill Redaction Audit v0.20

The runtime plugin / skill redaction audit checks P0Y summary artifacts for raw
metadata and execution boundary violations.

It can consume summary artifacts from:

- plugin manifest validation
- skill manifest validation
- package metadata scan
- plugin / skill sandbox contract
- plugin / skill broker descriptor integration
- App Plugin / Skill Host summary

The audit is summary-only:

- counts
- risk categories
- redaction flags
- leak booleans
- hash prefixes
- safe finding codes
- readiness flags with execution disabled

The audit blocks:

- raw metadata
- raw package content
- raw source
- raw diff
- raw prompt
- raw args
- raw output
- API key, Authorization, bearer, token, and secret markers
- install scripts
- shell commands
- Git commands
- native bridge
- desktop action
- EventStore write requests
- apply or rollback requests
- PermissionLease requests
- readiness flags claiming plugin execution, skill runtime, invocation,
  filesystem write, network, shell, Git, native bridge, desktop action, or App
  execution

The audit does not:

- no plugin execution
- execute plugin code
- no arbitrary skill runtime
- install packages
- invoke capabilities
- issue PermissionLease
- call fetch or network
- write filesystem
- no EventStore write
- execute Git or shell
- no native bridge
- no desktop action

Output source:

- `runtime_plugin_skill_redaction_audit`

Readiness only means the summary-only audit result can be previewed. It does
not enable plugin install, skill runtime, broker invocation, EventStore writes,
filesystem writes, network, shell, Git, native bridge, desktop action, or App
execution.

Relation to P0Y:

- P0Y-002 validates plugin manifests.
- P0Y-003 validates skill manifests.
- P0Y-004 scans package metadata.
- P0Y-005 defines sandbox and built-in safe simulation boundaries.
- P0Y-006 builds broker descriptor previews.
- P0Y-008 audits the combined summaries before RC polish.
