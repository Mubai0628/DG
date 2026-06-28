# Runtime Live Proposal Telemetry / Redaction Audit v0.8

Status: P0M-007 runtime audit helper.

## Scope

Audit only. The runtime live proposal telemetry redaction audit consumes
existing summary artifacts from P0M-002 through P0M-006 and produces a
summary-only audit report. It does not call DeepSeek, does not read API keys, does not
fetch network, does not write files, does not write EventStore events, and does
not execute apply or rollback.

The helper accepts summary artifacts from:

- P0M-002 Live Proposal API Key Policy
- P0M-003 Live Proposal Request Builder
- P0M-004 runtime Live DeepSeek Proposal Adapter result summaries
- P0M-005 Live Proposal Validation Integration
- P0M-006 App Live Proposal Preview Gate

## Redaction Boundary

The audit is designed to prove that live proposal telemetry stays summary-only.
Output may include usage numbers, token counts, record counts, hashes, status
codes, warning codes, and redaction booleans.

Output must not include:

- raw prompt text
- raw request text
- raw model response text
- raw reasoning_content text
- raw source
- raw diff
- raw API keys, Authorization headers, bearer tokens, or secret values
- stdout or stderr
- command, Git, shell, Tauri, native bridge, desktop action, apply, rollback,
  EventStore write, or PermissionLease action fields

Forbidden raw fields or secret-like markers block the audit. Unsafe fields are
not repaired, removed, or rewritten into a passing result.

## Telemetry Records

The report contains summary records only:

- `api_key_policy_summary`
- `request_boundary_summary`
- `live_adapter_summary`
- `validation_integration_summary`
- `usage_summary`
- `reasoning_content_drop_summary`
- `redaction_summary`
- `app_gate_summary`

Usage summary only. Usage telemetry is numeric only. Raw text in usage
telemetry is blocked.

## Readiness

All execution readiness flags remain false:

- no telemetry event write
- no raw prompt persistence
- no raw response persistence
- no reasoning_content persistence
- no API key read
- no live model call
- no fetch/network
- no EventStore write
- no apply or rollback
- no Git/shell
- no App execution

An `audit_ready` result means the supplied summaries pass the redaction audit.
It does not enable telemetry writes or live proposal execution.

## Relation To P0M

This helper sits after the P0M-002 policy, P0M-003 request builder, P0M-004
runtime live adapter, P0M-005 validation integration, and P0M-006 App gate. It
does not call any resolver, transport, live adapter, or App command.

Future P0M-008 RC polish can reference this audit as evidence that live
proposal telemetry remains summary-only.

## Non-goals

- No live DeepSeek call
- No API key read
- No fetch/network
- No raw prompt persistence
- No raw response persistence
- No reasoning_content persistence
- No EventStore write
- No Tauri command
- No file write
- No apply or rollback
- No App execution
- No Git/shell
- No native bridge
- No desktop action
