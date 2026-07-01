# App Shell Capability Host Surface v0.16

The App Shell Capability Host surface is a read-only preview panel for external
capability metadata. It accepts pasted `external_capability_manifest.v1` JSON,
validates the manifest through the runtime descriptor schema, and projects safe
descriptor summaries through the runtime external capability broker integration.

## Scope

- Preview MCP, plugin, and skill capability descriptors.
- Show source type, descriptor counts, risk summary, invocation policies,
  warning counts, blocker counts, and broker preview summary.
- Feed summary-only warning codes into the Audit Surface.
- Place a summary-only Capability Host ref into Context Assembly
  `no_compress_zone`.

## Safety Boundary

- No MCP server connection.
- No plugin install.
- No skill execution.
- No capability invocation.
- No PermissionLease issuance.
- No Tauri command.
- No fetch/network.
- No EventStore write.
- No localStorage or sessionStorage.
- No external tool run.

Unsafe external metadata is blocked before display when it includes command
fields, install scripts, raw args, raw prompt/source/diff/response fields,
secret markers, API key markers, Git/shell/native/desktop fields, or execution
readiness claims.

## Runtime Relation

The App view model calls pure runtime helpers only:

- `validateExternalCapabilityManifest()`
- `buildExternalCapabilityBrokerIntegration()`

The App does not register descriptors for execution. Broker output is a preview
only; all lease information is a lease preview, not an issued lease.

## Non-goals

- No external capability execution.
- No MCP connect.
- No plugin install.
- No skill runtime.
- No Git/shell execution.
- No native bridge.
- No desktop action.
