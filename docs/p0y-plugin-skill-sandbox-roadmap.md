# P0Y Plugin / Skill Sandbox Roadmap

P0Y goal:

Move from MCP read-only tool execution to Plugin / Skill Sandbox MVP.

The v0.21 line is Descriptor-first, manifest-first, and sandbox-contract-first:

- No arbitrary plugin code execution.
- No arbitrary skill runtime.
- No plugin installation with execution.
- No mutating plugin or skill tools.
- No native bridge.
- No desktop action.
- No arbitrary process spawn or shell.
- No broad PermissionLease.
- No autonomous agent tool execution.

Recommended tasks:

1. Plugin / Skill Sandbox ADR + Threat Model + Implementation Gate.
2. Plugin Manifest Schema.
3. Skill Manifest Schema.
4. Package Metadata Scanner.
5. Sandbox Contract + Built-in Safe Skill Simulation.
6. Capability Broker Integration.
7. App Plugin / Skill Host Surface.
8. Plugin / Skill Redaction / Boundary Audit + Smoke.
9. RC polish + release.

Explicitly deferred:

- Arbitrary plugin execution.
- Arbitrary skill runtime execution.
- Mutating plugin / skill tools.
- Desktop action.
- Native bridge.
- Broad PermissionLease.
- Autonomous agent tool execution.
- Arbitrary process spawn / shell.
- Plugin package lifecycle script execution.
- Skill package execution.

Safety posture:

- Plugin and skill metadata may be parsed and risk-classified.
- Package metadata scanning is summary-only and does not execute package code.
- Built-in safe skill simulation may be introduced only as hardcoded, non-mutating, summary-only behavior.
- All plugin and skill descriptors must remain disabled, metadata-only, or simulated until a later execution-specific ADR is accepted.

Next task:

- DW-P0Y-001 Plugin / Skill Sandbox ADR + Threat Model + Implementation Gate.
