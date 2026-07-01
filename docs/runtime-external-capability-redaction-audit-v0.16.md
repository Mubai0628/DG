# Runtime External Capability Redaction Audit v0.16

The runtime external capability redaction audit is a pure summary helper for
Capability Host metadata. It consumes manifest validation results, MCP
read-only discovery summaries, plugin/skill metadata scan summaries, broker
integration previews, and App surface summaries.

## Scope

- Count metadata sources and descriptor previews.
- Aggregate risk summaries.
- Report redacted field counts and raw leak booleans.
- Fail closed on raw secrets, authorization markers, raw args, raw
  prompt/source/diff/response fields, command fields, install scripts,
  eval/code fields, secret query URLs, execution readiness, and issued leases.
- Warn on high-risk external sources, network/filesystem/desktop capability
  declarations, missing publisher/version metadata, and broad dependency
  ranges.

## Boundary

- No MCP server connection.
- No plugin install.
- No skill runtime.
- No capability invocation.
- No PermissionLease issuance.
- No fetch/network.
- No EventStore write.
- No filesystem write.
- No Git/shell execution.
- No native bridge.
- No desktop action.

The helper does not persist raw args, raw prompt, raw source, raw diff, raw
response, secrets, tokens, authorization headers, or external tool output. The
output is summary-only.

The blocked raw metadata class includes raw prompt/source/diff/response.

## Relation To P0U

This audit closes the descriptor-first Capability Host MVP safety loop:

- P0U-002 validates external capability manifests.
- P0U-003 lists MCP metadata read-only.
- P0U-004 scans plugin and skill metadata without loading code.
- P0U-005 maps external descriptors into broker previews.
- P0U-006 shows the App read-only surface.
- P0U-007 audits redaction and boundary safety across those summaries.

## Non-goals

- No external capability execution.
- No MCP connect.
- No plugin install.
- No skill execution.
- No App execution.
- No Git/shell.
- No native bridge.
- No desktop action.
