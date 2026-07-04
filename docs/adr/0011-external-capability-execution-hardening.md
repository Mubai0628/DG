# ADR 0011: External Capability Execution Hardening

## Status

Accepted for P1H design gate.

## Context

v0.29 hardened the North Star demo without expanding execution scope. The next
phase hardens external capability execution boundaries that already exist as
descriptor, metadata, safe simulation, fixed MCP read-only, approved desktop
action, and Git/shell safe-lane surfaces.

The problem is consistency, not new power: every external capability must have
the same descriptor, policy, approval, lease, redaction, summary-event, and
replay expectations before it can be treated as auditable.

## Decision

- Capability Broker is the single planning/risk/policy entrypoint for external
  capability descriptors.
- External capability execution requires a descriptor, policy, risk
  classification, approval / lease / receipt where applicable, output
  redaction, summary event, and replay projection.
- MCP read-only tool execution remains the only external tool execution lane.
- Mutating MCP tools remain disabled.
- Plugin/Skill remains metadata and safe simulation only.
- Arbitrary plugin code execution is not enabled.
- Arbitrary skill runtime execution is not enabled.
- Broad native bridge access is not enabled.
- Arbitrary Git/shell execution is not enabled.
- Raw args/output must not be written to events, replay, telemetry, or App
  surfaces.

## Non-goals

- No mutating MCP tools.
- No arbitrary MCP invocation.
- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation with code execution.
- No broad native bridge.
- No broad desktop automation.
- No autonomous arbitrary tool execution.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No raw tool args/output persistence.

## Required Gates

- Descriptor safety: every capability has a stable descriptor id, source type,
  provenance summary, risk level, and no raw package/tool payload.
- Policy / lease safety: policy, lease, approval receipt, typed confirmation,
  scope, expiry, and descriptor refs match.
- MCP read-only tool safety: allowlist, read-only contract, profile, bounded
  timeout, bounded output, redaction, event summary, and replay projection are
  consistent.
- Plugin / Skill sandbox safety: manifests and metadata are scanned for
  lifecycle scripts, process execution, native modules, network or filesystem
  write claims, dynamic import/eval markers, native bridge markers, desktop
  action markers, and secret access markers.
- Result redaction safety: raw args, raw output, stdout/stderr, package
  content, source, prompt, response, and credential markers fail closed.
- Replay completeness: every summary result can be replayed and audited without
  raw payloads.
- App UI safety: App surfaces are read-only and cannot invoke external
  capability execution.
- CI / boundary safety: boundary and secret checks continue to block broad
  execution paths.

## Explicit Boundary

Do not enable mutating MCP tools, arbitrary plugin code execution, or arbitrary
skill runtime in v0.30.

## Consequences

The phase slows expansion of external execution lanes, but it gives future
work a common contract for descriptors, policy, receipts, redaction, replay,
and audit evidence. The existing fixed read-only and approved lanes remain
usable while new broad execution remains deferred.
