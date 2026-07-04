# Runtime External Capability Redaction Audit v0.30

`runtime/src/capabilities/external-capability-redaction-audit.ts` now audits
the P1H external capability hardening summaries in addition to the earlier
manifest, MCP discovery, plugin/skill scan, broker integration, and App surface
summaries.

## Scope

- Runtime helper only.
- Aggregate redaction and boundary audit only.
- No external capability execution.
- No MCP invocation.
- No plugin install.
- No skill runtime.
- No native bridge.
- No desktop action.
- No EventStore write.
- No filesystem write.
- No network/fetch.
- No Git/shell execution.

## P1H Inputs

The audit can consume summary artifacts from:

- external execution policy hardening
- MCP read-only tool consistency
- plugin/skill sandbox escape checks
- external capability replay completeness
- external result summaries
- existing manifest/discovery/plugin/broker/App summaries

All inputs must be summary-only. Raw tool args, raw tool output, raw
stdout/stderr, raw package content, raw source, raw prompt, raw response, API
keys, Authorization headers, Bearer tokens, shell/native/desktop commands, and
execution readiness claims are blocked.

## Output

The output is summary-only:

- source and summary artifact counts
- descriptor counts
- redacted field count
- raw field detected count
- raw leak booleans
- risk summary
- safe finding codes
- deterministic audit hash
- readiness flags with execution disabled

The helper never returns raw tool args, raw tool output, raw stdout/stderr, raw
package content, raw source, raw prompt, raw response, API keys, Authorization
headers, Bearer tokens, commands, or secret values.

## Relation to P1H

This is the runtime implementation for `DW-P1H-006`. It consumes the summaries
from `DW-P1H-002` through `DW-P1H-005` and feeds the App read-only external
capability audit surface without enabling App execution, mutating MCP tools,
plugin runtime, skill runtime, native bridge, or desktop action execution.
