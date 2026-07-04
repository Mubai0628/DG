# External Capability Execution Hardening Threat Model v0.30

## Assets

- Capability descriptors, source type, provenance, and risk classifications.
- PermissionLease previews, approval receipts, typed confirmations, and policy
  summaries.
- MCP read-only tool contracts and result summaries.
- Plugin / Skill manifest and metadata summaries.
- Redaction audit summaries.
- Replay projections and summary events.
- App read-only audit surfaces.

## Trust Boundaries

- User-provided external capability metadata enters runtime validators.
- MCP server metadata and tool output are attacker-controlled until validated
  and redacted.
- Plugin and skill manifests are untrusted metadata and must not execute.
- App surfaces are presentation-only and must not invoke hidden execution.
- EventStore and replay projections can only contain allowlisted summary
  fields.

## Threats

- Malicious MCP server metadata advertises a mutating tool as read-only.
- Malicious MCP tool output includes raw secrets, stdout/stderr, commands, or
  payloads that look like safe summaries.
- Mutating tool descriptors drift after approval.
- Plugin manifest spoofing hides lifecycle scripts, native modules, binary
  payloads, dynamic import/eval, or process execution markers.
- Skill package metadata poisoning claims safe simulation while asking for
  filesystem/network/process access.
- Sandbox escape signals appear in metadata, examples, permissions, or package
  summaries.
- Raw tool output leakage reaches events, replay, telemetry, or App UI.
- API key, Authorization, Bearer, token, or secret markers are persisted.
- Approval bypass occurs through missing receipt, mismatched descriptor id,
  stale typed confirmation, or expired lease.
- Lease scope mismatch allows a broader capability than the approved
  descriptor.
- Replay incompleteness hides whether a result was redacted, approved, or
  associated with a descriptor.
- Descriptor drift and stale evidence make a previously safe capability unsafe.
- Boundary checker bypass hides fetch, Tauri, EventStore writes, process spawn,
  shell, or native bridge code.
- App hidden execution path makes a read-only surface trigger external work.

## Mitigations

- Descriptor and source type checks are required before policy readiness.
- Policy, lease, approval receipt, typed confirmation, scope, expiry, and
  descriptor ids must match.
- MCP read-only execution remains fixed-profile, allowlisted, bounded, and
  summary-only.
- Mutating MCP tools fail closed.
- Plugin / Skill remains metadata and safe simulation only.
- Sandbox escape signals block readiness.
- Redaction audit blocks raw args/output, raw stdout/stderr, raw package
  content, raw source, raw prompt, raw response, and credentials.
- Replay completeness requires descriptor, policy, approval, redaction, event,
  and replay summaries.
- App audit surfaces are read-only and include disabled placeholders only.
- CI boundary and secret checks remain mandatory.

## Out of Scope

- Enabling mutating MCP tools.
- Enabling arbitrary MCP invocation.
- Enabling arbitrary plugin code execution.
- Enabling arbitrary skill runtime execution.
- Enabling plugin installation with code execution.
- Enabling broad native bridge, broad desktop automation, arbitrary Git/shell,
  or broad PermissionLease.
