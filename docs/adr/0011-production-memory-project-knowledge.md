# ADR 0011: Production Memory / Project Knowledge

## Status

Proposed / Accepted for P0T design gate.

## Context

v0.15 shipped MVP hardening, recovery, replay, and regression coverage for the
end-to-end DeepSeek coding task flow.

The project has an older Memory Core preview, but it is not yet a production
project knowledge persistence path. The next phase should make project memory
auditable and useful for later coding tasks without allowing the model, tools,
or the App to auto-write long-term memory or expand execution authority.

## Decision

Project knowledge is workspace-local and persistent.

Memory entries are summary-only and use exactly these types:

- `policy`
- `project_fact`
- `pitfall`

Memory lifecycle is:

```text
candidate
-> reviewed
-> committed
-> recalled
-> revoked
-> expired
```

Policy memory requires a human trusted source. Project facts require evidence
refs. Pitfalls require trigger and mitigation summaries.

Raw prompt, raw source, raw diff, raw CSV, raw DOM, raw screenshot, raw
response, reasoning_content, API key, Authorization, Bearer, private key,
preimage, backup content, stdout, and stderr must not enter memory entries,
memory events, recall summaries, logs, or UI summaries.

Model output may propose memory candidates, but it cannot commit memory. Tool
output may propose memory candidates, but it cannot commit policy memory.
External sources may only become memory through human review and trusted-source
classification.

App commit and revoke actions must be explicit. Policy commit requires a
policy-specific confirmation. Project facts and pitfalls require project
knowledge confirmation. Revoke requires typed confirmation.

Recall is summary-only. Recall may inform later coding-task context, but it
must not change frozen immutable rules unless a future explicit gate promotes a
human-reviewed policy summary. Memory recall must be visible in the context
ledger and audit surface.

## Non-Goals

- No automatic memory commit.
- No model-direct policy write.
- No tool-direct policy write.
- No external-source direct policy write.
- No raw prompt/source/diff/API key memory.
- No memory-triggered apply.
- No memory-triggered rollback.
- No arbitrary Git command execution.
- No arbitrary shell command execution.
- No broad PermissionLease issuance.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.
- No autonomous coding loop.

## Required Gates Before Implementation

- Schema safety tests exist.
- Storage safety tests exist.
- Candidate safety tests exist.
- Commit safety tests exist.
- Policy source safety tests exist.
- Evidence and provenance safety tests exist.
- Revoke and expire safety tests exist.
- Recall safety tests exist.
- Context integration safety tests exist.
- Event and replay safety tests exist.
- App UI safety tests exist.
- CI and boundary checks prove no raw memory, no model-direct commit, no
  memory-triggered execution, no arbitrary Git/shell, no native bridge, and no
  desktop action.

## Consequences

- P0T gives later coding tasks a durable project knowledge substrate.
- Memory updates remain slower because they require human review and typed
  confirmations.
- The store becomes replayable and auditable instead of an opaque preference
  bucket.
- Future execution features must treat memory recall as context, not as
  authority to apply, rollback, invoke Git/shell, or issue permissions.
