# Runtime Plugin / Skill Sandbox Contract v0.20

The runtime plugin / skill sandbox contract defines the only sandbox modes that P0Y accepts before plugin or skill metadata can move toward descriptor preview.

Allowed modes:

- `disabled`
- `metadata_only`
- `simulated_builtin_safe`

Denied modes:

- arbitrary code
- package runtime
- shell
- native
- desktop
- custom code
- external runtime

This is a contract helper only:

- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no package install
- no code load
- no external package import
- no network default
- no filesystem write
- no EventStore write
- no shell command
- no Git command
- no native bridge
- no desktop action
- no PermissionLease issuance

The contract requires:

- input summary policy: `summary_only`
- output summary policy: `summary_only`
- fixed future timeout and output budgets
- default deny for network, filesystem write, EventStore write, package install, custom code, shell, native, desktop action, and PermissionLease

The helper fails closed for:

- denied sandbox modes
- unknown modes
- custom code fields
- `eval` or function constructor fields
- external package import fields
- shell/process fields
- network or fetch fields
- filesystem write fields
- EventStore write fields
- raw source, raw prompt, raw response, or raw output fields
- API key, Authorization, bearer, token, or secret markers
- mutation requests
- readiness flags that claim execution
- oversized timeout/input/output budgets

Output is summary-only:

- `status: disabled | metadata_only | simulation_ready | warning | blocked`
- contract id
- mode
- input and output summary policies
- timeout and output budgets
- allowed built-in safe simulation kinds
- finding counts and safe codes
- `contractHash`
- readiness flags with all execution paths false
- source: `runtime_plugin_skill_sandbox_contract`

Readiness for built-in safe simulation only means the hardcoded simulator may produce a summary preview. It does not enable arbitrary plugin code execution, arbitrary skill runtime execution, package install, code load, network, filesystem write, EventStore write, shell, Git, native bridge, desktop action, or PermissionLease issuance.

Relation to P0Y:

- P0Y-002 added plugin manifest validation.
- P0Y-003 added skill manifest validation.
- P0Y-004 added package metadata scanning.
- P0Y-005 adds this sandbox contract and the matching built-in safe simulation helper.
- Later P0Y tasks may use this contract to build disabled / metadata-only / simulated descriptors, but not execute arbitrary plugin or skill code.
