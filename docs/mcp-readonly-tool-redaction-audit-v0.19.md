# MCP Read-only Tool Redaction Audit v0.19

This document locks the redaction audit boundary for MCP read-only tool output.
The audit is a deterministic runtime check over summary artifacts only. It does
not call an MCP server, does not invoke a tool, and does not write events.

## Scope

- Audit the summary result from the fixed MCP read-only tool call wrapper.
- Audit MCP read-only tool summary event payloads.
- Audit MCP read-only replay summaries.
- Confirm raw output, raw args, raw prompt, raw source, raw diff, API key,
  Authorization, Bearer, token, and secret-like markers are absent.
- Confirm output byte limits and redaction counts are present.

## Runtime Helper

The runtime helper is
`runtime/src/capabilities/mcp-readonly-tool-redaction-audit.ts`.

It accepts only already-created summary records:

- `callResult`
- `eventPayloads`
- `replaySummary`

It emits a summary-only audit with:

- `rawOutputDetected`
- `rawArgsDetected`
- `rawPromptSourceDiffDetected`
- `secretDetected`
- `oversizedOutputDetected`
- `eventPayloadSummaryOnly`
- `replaySummaryOnly`
- redaction counts
- blocker and warning counts
- execution readiness flags fixed to `false`

## Fail-closed Rules

The audit blocks when it detects:

- raw output or raw args fields
- raw prompt, raw source, or raw diff fields
- API key, Authorization, Bearer, token, or secret-like markers
- oversized output summaries
- event payloads that are not summary-only
- replay summaries that claim raw args or raw output are included
- execution fields such as command, shell command, git command, EventStore
  write, apply now, rollback now, or PermissionLease

Findings use safe codes and safe messages. They do not copy raw output, raw
arguments, API keys, or secret-like content.

## Non-goals

- No real external MCP call.
- No mutating MCP tool invocation.
- No arbitrary MCP tool call.
- No raw tool output persistence.
- No EventStore write from the App Shell.
- No Git/shell execution.
- No broad PermissionLease.
- No plugin or skill runtime execution.
- No native bridge.
- No desktop action.

## Invariants

- All output is summary-only.
- Raw output is never returned by the audit.
- Raw args are never returned by the audit.
- Event payloads must have `summaryOnly: true`.
- Event payloads must have `rawArgsIncluded: false`.
- Event payloads must have `rawOutputIncluded: false`.
- Replay summaries must keep raw args and raw output excluded.
- All execution readiness flags remain false.
