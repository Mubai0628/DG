# Plugin / Skill Sandbox Threat Model v0.20

## Assets

- User workspace files and private drafts.
- EventStore summaries and replay projections.
- Approval receipts and PermissionLease boundaries.
- API keys, Authorization headers, bearer tokens, and local environment values.
- Plugin and skill manifest metadata.
- Capability Broker descriptors and risk decisions.
- App read-only surfaces.

## Trust Boundaries

- User-supplied plugin manifests.
- User-supplied skill manifests.
- Package metadata summaries.
- Registry URL and dependency metadata.
- Capability Broker descriptor mapping.
- App display surfaces.
- Event/replay summary boundaries.

## Attacker-Controlled Inputs

- Malicious manifest fields.
- Dependency names or registry URLs.
- Package file-list summaries.
- Skill step summaries.
- Capability IDs and descriptions.
- Metadata containing prompt injection, secret-like strings, unsafe paths, raw package content, or execution claims.

## Risks

Risk keywords: malicious manifest; dependency confusion; package lifecycle scripts; hidden executable payload; prompt injection; broad PermissionLease.

- Malicious manifest claims a safe capability while hiding mutation.
- Dependency confusion through similar package names or broad version ranges.
- Package lifecycle scripts such as `install`, `preinstall`, or `postinstall`.
- Hidden executable payload in binary/native modules.
- Prompt injection in plugin or skill descriptions.
- Secret leakage in metadata, URLs, or query strings.
- Oversized package metadata causing UI or event pressure.
- Unsafe capability claims that spoof MCP, native, desktop, or shell authority.
- Tool/capability spoofing through duplicate IDs or confusing names.
- Sandbox escape through path traversal, absolute paths, or `.git` / `.env` references.
- Registry URL / download risk.
- Event/replay poisoning with raw metadata or raw output.
- Approval bypass through misleading readiness flags.
- Broad PermissionLease bypass through wildcard capability scopes.

## Mitigations

- Manifest schema validation blocks forbidden fields and unsafe values at any depth.
- Package metadata scanner operates only on summary inputs and never executes package code.
- Lifecycle scripts, native/binary markers, shell commands, unsafe paths, and secret markers fail closed.
- Capability Broker integration maps plugin and skill descriptors to disabled, metadata-only, or built-in safe simulation modes.
- Redaction audit proves no raw package content, raw args, raw outputs, API keys, Authorization, bearer values, or secrets appear in outputs.
- App surfaces remain read-only and show disabled install/run/execute controls.
- EventStore writes for raw plugin/skill metadata are not introduced in P0Y.
- PermissionLease issuance remains disabled.

## Out of Scope

- Trusting arbitrary plugin package code.
- Running arbitrary skill runtime steps.
- Installing packages with lifecycle scripts.
- Native bridge or desktop action execution.
- Arbitrary shell/process spawn.
- Autonomous agent tool execution.
