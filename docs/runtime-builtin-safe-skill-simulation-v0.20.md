# Runtime Built-in Safe Skill Simulation v0.20

The runtime built-in safe skill simulation helper runs only hardcoded, non-mutating, summary-only simulations behind a `simulated_builtin_safe` sandbox contract.

Allowed simulations:

- summarize manifest risk
- classify capability risk
- validate required input summary
- generate documentation checklist

This is a simulation helper only:

- no dynamic code execution
- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no package install
- no code load
- no external package import
- no network or fetch
- no filesystem write
- no EventStore write
- no shell command
- no Git command
- no native bridge
- no desktop action
- no PermissionLease issuance

Inputs must be summary-only:

- sandbox contract summary
- manifest summary
- capability summary
- input summary
- documentation summary refs

The helper fails closed for:

- missing or blocked sandbox contract
- sandbox contract not in `simulated_builtin_safe` mode
- unknown simulation kind
- simulation kind not allowed by the contract
- missing required summary input
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

Output is summary-only:

- `status: simulated | warning | blocked`
- simulation id
- built-in simulation kind
- contract id
- risk level
- checklist item count
- summary hashes
- finding counts and safe warning codes
- `simulationHash`
- readiness flags with all execution paths false
- source: `runtime_builtin_safe_skill_simulation`

The helper may warn when high-risk metadata appears, but the output remains summary-only and non-mutating.

Relation to P0Y:

- P0Y-005 defines this hardcoded simulator as the only allowed skill simulation path.
- It reuses the P0Y sandbox contract.
- Later P0Y broker integration may expose simulated descriptors, but arbitrary skill runtime execution remains out of scope.
