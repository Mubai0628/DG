# Runtime Plugin / Skill Broker Integration v0.20

The runtime plugin / skill broker integration converts accepted plugin manifests, skill manifests, package metadata scans, and sandbox contracts into summary-only broker descriptor previews.

This is descriptor preview only:

- no real plugin execution
- no real skill runtime execution
- no package install
- no code load
- no invocation
- no PermissionLease issuance
- no EventStore write
- no filesystem write
- no network or fetch
- no shell command
- no Git command
- no native bridge
- no desktop action

Descriptor previews include:

- `capabilityId`
- source type: `plugin` or `skill`
- execution mode: `disabled`, `metadata_only`, or `simulated_builtin_safe`
- invoke policy: `disabled` or `manual_only_preview`
- risk level
- summary hash reference
- manifest ref
- optional package scan ref
- redaction summary proving raw metadata, raw args, and raw output are absent
- a broker `CapabilityDescriptor` that validates as disabled or manual-only simulate

The integration fails closed for:

- blocked plugin manifests
- blocked skill manifests
- blocked package metadata scans
- blocked sandbox contracts
- blocked built-in safe simulation results
- duplicate capability ids
- execution-ready modes
- raw metadata, raw manifest, raw package, raw args, raw prompt, raw source, raw diff, or raw output fields
- API key, Authorization, bearer, token, or secret markers
- command, shell, Git, EventStore, PermissionLease, native bridge, desktop action, apply, or rollback fields
- readiness flags that claim invocation, execution, install, code load, network, filesystem write, EventStore write, Git, shell, native bridge, desktop action, or App execution

Output is summary-only:

- `status: preview_ready | warning | blocked | empty`
- descriptor counts
- plugin and skill descriptor counts
- risk and policy mappings
- descriptor previews
- broker descriptors with `SIMULATE` execution mode
- finding counts and safe codes
- `descriptorHash`
- readiness flags with all execution paths false
- source: `runtime_external_plugin_skill_descriptors`

Readiness only means descriptor previews can be inspected or registered as preview metadata. It does not enable broker invocation, PermissionLease issuance, EventStore writes, plugin execution, skill runtime execution, package install, code load, network, filesystem writes, shell, Git, native bridge, desktop action, or App execution.

Relation to P0Y:

- P0Y-002 validates plugin manifests.
- P0Y-003 validates skill manifests.
- P0Y-004 scans package metadata.
- P0Y-005 defines sandbox contracts and built-in safe simulation.
- P0Y-006 maps those accepted summaries into existing broker descriptor previews without execution.
