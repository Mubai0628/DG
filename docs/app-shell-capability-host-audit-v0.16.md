# App Shell Capability Host Audit v0.16

The App Shell Capability Host audit surface is read-only. It previews
summary-only redaction and boundary audit results for external capability
metadata.

## Scope

- Show audit status, source counts, descriptor counts, raw leak booleans,
  redacted field counts, risk summary, warning counts, and blocker counts.
- Audit the current App Capability Host surface summary when present.
- Optionally accept pasted summary JSON for local preview.

## App Boundary

- No Tauri invoke.
- No fetch/network.
- No EventStore write.
- No MCP connect.
- No plugin install.
- No skill execution.
- No capability invocation.
- No PermissionLease issuance.
- No external tool run.

The surface never displays or persists raw args, raw prompts, raw source, raw
diff, raw response, API keys, authorization values, tokens, or command output.

## Runtime Relation

The App view model calls `buildExternalCapabilityRedactionAudit()` with safe
summary artifacts only. It does not run an external audit process and does not
register descriptors for execution.

## Non-goals

- No external capability execution.
- No MCP connect.
- No plugin install.
- No skill runtime.
- No Git/shell execution.
- No native bridge.
- No desktop action.
