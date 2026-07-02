# ADR 0011: Plugin / Skill Sandbox

Status: Proposed / Accepted for P0Y design gate.

## Context

v0.20 introduced controlled MCP read-only tool execution through fixed profiles, explicit approval receipts, bounded output, summary-only events, replay, and redaction audit. The next step is to bring plugin and skill packages into the same governance model without expanding execution authority.

Plugin and skill packages are high-risk because package metadata can spoof capabilities, installation can run lifecycle scripts, and skill descriptions can hide prompt injection or execution requests. P0Y therefore treats plugins and skills as metadata first.

## Decision

- Plugins and skills enter the system as manifests first.
- Manifest metadata may be parsed and risk-classified.
- No plugin code execution in P0Y.
- No arbitrary skill runtime in P0Y.
- Built-in safe skill simulation may be allowed only if no arbitrary code execution and summary-only output.
- All plugin / skill capabilities must pass Capability Broker risk classification.
- External package metadata must be redacted and summary-only.
- No raw package file contents in events.
- No plugin installation that executes lifecycle scripts.
- No native bridge.
- No desktop action.
- No arbitrary process spawn or shell.
- No broad PermissionLease.

## Required Model

Plugin and skill package handling is descriptor-first, manifest-first, and sandbox-contract-first:

1. Parse a summary-only plugin or skill manifest.
2. Validate fields, paths, capability claims, and execution modes.
3. Scan package metadata summaries without loading code.
4. Map accepted metadata to disabled, metadata-only, or built-in-safe simulated descriptors.
5. Redact and audit metadata before it appears in App surfaces or events.
6. Keep all invocation, installation, arbitrary runtime, native bridge, and desktop action paths disabled.

## Non-Goals

Boundary phrase: no broad PermissionLease.

- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation with executable lifecycle scripts.
- No mutating plugin or skill tools.
- No native bridge.
- No desktop action.
- No arbitrary process spawn or shell.
- No broad PermissionLease.
- No autonomous agent tool execution.

## Consequences

This slows the path to third-party plugin execution, but it gives the project a safer intermediate layer: package metadata can be reviewed, risk-classified, redacted, and surfaced in App read-only previews before any future execution-specific ADR is considered.

Do not implement arbitrary plugin code execution until P0Y gates are satisfied and a later execution-specific ADR is accepted.

Do not implement skill runtime execution in P0Y.
