# Runtime External Capability Manifest v0.16

## Summary

`runtime/src/capabilities/external-capability-manifest.ts` defines the P0U
descriptor manifest schema, validator, normalizer, and summarizer for external
capability metadata.

The manifest is metadata only. It can describe MCP servers, plugin packages,
skill bundles, and local built-in descriptors as summary contracts, but it does
not connect to MCP servers, load plugin code, run skills, execute commands,
issue leases, write events, or mutate files.

## Supported Source Types

- `mcp_server`
- `plugin_package`
- `skill_bundle`
- `local_builtin_descriptor`

## Validation Boundary

The validator blocks:

- missing or unknown source type.
- missing capabilities.
- duplicate or unsafe capability ids.
- external `AUTO` invocation policies.
- command, shell, git, native, desktop, script, code, eval, install, or stdio
  fields.
- secret markers, API key fields, Authorization fields, token fields, password
  fields, and env fields.
- raw args, raw prompt, raw source, raw diff, or raw response fields.
- URL query secrets.
- local path traversal and unsafe local path markers.
- broad wildcard scopes.
- risk downgrade attempts.

The validator warns for missing publisher/version/risk notes, unknown category,
unknown operation kind, unknown risk, network/filesystem/desktop metadata, and
high-risk external metadata that stays preview-only.

## Forced Policy Rules

- External MCP/plugin/skill descriptors cannot be `AUTO`.
- Mutating, network, filesystem, shell, or desktop capabilities must be
  `DISABLED` or `MANUAL_ONLY`.
- Unknown risk defaults to `A5`.
- Unknown operation kind defaults to `unknown`.
- Shell/git/native/desktop execution claims are metadata only and remain
  disabled/manual-only.

## Output

The validation result is summary-only:

- status.
- normalized manifest when safe.
- capability counts and ids.
- operation, risk, and invocation policy summaries.
- finding counts.
- warning codes.
- manifest hash.
- readiness flags.

All execution readiness flags remain false:

- `canInvokeCapability`
- `canIssueLease`
- `canExecuteShell`
- `canUseNetwork`
- `canUseDesktop`
- `appCanExecute`

`canRegisterDescriptor` only means the descriptor can enter future read-only
broker preview. It does not mean the capability can run.

## Non-goals

- No MCP tool invocation.
- No MCP stdio process launch.
- No MCP HTTP/SSE/WebSocket connection.
- No plugin code loading, import, eval, or execution.
- No skill runtime execution.
- No App execution.
- No network fetch.
- No Tauri command.
- No EventStore write.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.
- No production PermissionLease issuing.

## Relation to P0U

This is the P0U-002 schema foundation. Later P0U stages may use safe descriptor
summaries for read-only MCP discovery, package metadata scanning, broker preview,
App read-only display, and redaction audit. Those stages must preserve the same
no-execution boundary.
