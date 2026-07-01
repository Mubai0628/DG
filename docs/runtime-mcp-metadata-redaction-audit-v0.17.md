# Runtime MCP Metadata Redaction Audit v0.17

## Scope

The runtime MCP metadata redaction audit is a pure summary-only helper for P0V.
It audits MCP connection profile summaries, read-only discovery summaries,
broker descriptor previews, and App surface summaries.

It does not connect to MCP servers, call tools, read resource content, execute
prompts, write EventStore events, write files, apply patches, rollback, run Git,
run shell commands, enable native bridge, or trigger desktop action.

## Inputs

Allowed inputs are summary artifacts only:

- connection profile summary;
- MCP read-only discovery result;
- broker descriptor previews;
- App surface summary.

The helper does not accept or need raw MCP metadata.

## Blockers

The audit blocks:

- raw prompt fields or markers;
- raw source fields;
- raw diff fields;
- raw metadata, raw stdout, or raw stderr;
- API key, Authorization, bearer token, private key, or secret markers;
- command injection markers;
- MCP tool invocation fields;
- MCP resource content fields;
- mutating or high-risk MCP tool metadata that is invokable;
- execution readiness flags;
- huge metadata summaries.

## Output

The output is summary-only:

- audit id;
- record counts;
- redaction counts;
- risk counts;
- blocked and warning finding codes;
- hash;
- readiness flags.

The output never includes raw metadata, raw prompt, raw response, raw source,
raw diff, raw stdout, raw stderr, resource content, tool arguments, API keys, or
Authorization values.

All execution readiness flags remain false.

## Relation to P0V

This audit depends on the P0V read-only MCP path:

- P0V-002 MCP Connection Profile Schema;
- P0V-003 Runtime MCP Read-only Discovery Client;
- P0V-004 Tauri Fixed MCP Read-only Discovery Command;
- P0V-005 Capability Broker Integration with MCP Read-only Metadata;
- P0V-006 App MCP Read-only Connection Surface.

It prepares P0V-008 hardening by making redaction and execution-boundary checks
explicit.

## Non-goals

- No MCP tool invocation.
- No MCP resource content read.
- No MCP prompt execution.
- No mutating MCP operation.
- No App execution.
- No EventStore write.
- No Git or shell.
- No native bridge.
- No desktop action.
