# Project Knowledge Events / Replay / Redaction Audit v0.15

P0T-006 makes project knowledge lifecycle state replayable and auditable without
expanding App execution. The replay path is summary-only: it projects commit,
revoke, expire, recall, and audit-warning events into safe counts and timeline
labels.

## Runtime Helper

`runtime_project_knowledge_events_replay_audit` provides deterministic helpers
for:

- building summary-only project knowledge events
- replaying project knowledge events into entry state
- auditing project knowledge summaries for redaction issues

Supported event types:

- `project_knowledge.candidate_committed`
- `project_knowledge.entry_revoked`
- `project_knowledge.entry_expired`
- `project_knowledge.recall_used`
- `project_knowledge.audit_warning`

The App/Tauri store also has existing `project_knowledge.entry_committed`
events. Replay treats those as the same summary-only commit lifecycle so older
workspace-local event logs remain readable.

## Replay Output

Replay output includes only safe summary fields:

- event count
- project knowledge entry count
- committed, revoked, expired, recall, and audit-warning counts
- latest project knowledge summary
- latest recall summary
- redaction audit status
- warning and blocker codes
- replay hash

Raw content is not returned. Raw prompts, raw responses, raw source, raw diff,
API keys, Authorization headers, command fields, shell/Git/Tauri fields, apply
or rollback requests, and permission-lease fields block replay.

## App Event Log / Replay

The App Event Log / Replay surface now includes project knowledge lifecycle
summaries alongside the existing event timeline:

- project knowledge events
- project knowledge entries
- latest project knowledge summary
- latest project knowledge recall
- knowledge redaction audit status

The App reads these as summary-only replay data. It does not write project
knowledge events from this surface, does not mutate memory, does not write the
EventStore, and does not execute apply or rollback.
There is no raw content in the App replay projection.
There is no App execution and no Git or shell execution in this replay path.

## Redaction Audit

The redaction audit checks project knowledge summaries and event projections
for raw or secret-like markers. It blocks on:

- raw prompt, response, source, diff, DOM, CSV, screenshot, or patch fields
- `reasoning_content`
- API key, token, Authorization, Bearer, private-key, or secret markers
- command, shell, Git, Tauri, EventStore, apply, rollback, native bridge, or
  desktop action fields

The audit output is itself summary-only and contains counts, booleans, finding
codes, and hashes only.

## Non-Goals

- No App execution
- No App apply or rollback
- No EventStore write
- No filesystem write from replay
- No Git or shell execution
- No native bridge
- No desktop action
- No raw content persistence
