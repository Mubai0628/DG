# P1G-002 Cross-surface Failure Recovery Contract Plan

## Scope

Add a pure runtime, summary-only failure recovery contract for the North Star
demo workflow.

## Non-goals

- No model retry.
- No automatic rollback.
- No automatic apply.
- No Git/shell execution.
- No desktop action execution.
- No EventStore write.
- No App execution.
- No raw prompt/source/diff/response/API key persistence.

## Failure Kinds

- proposal_generation_failed
- schema_repair_failed
- validation_blocked
- approval_missing
- apply_failed
- verification_failed
- rollback_required
- rollback_failed
- mcp_evidence_stale
- plugin_skill_metadata_stale
- desktop_observer_stale
- desktop_action_blocked
- agent_handoff_failed
- replay_incomplete
- policy_mismatch

## Advisory Recovery Actions

- retry_proposal_generation
- refresh_workspace_index
- refresh_project_knowledge
- refresh_mcp_metadata
- refresh_plugin_skill_metadata
- refresh_desktop_observation
- request_human_approval
- run_rollback
- rerun_verification
- inspect_replay_gap
- stop_and_report

These action names are recommendations only. They must not execute.

## Tests

Use an explicit Vitest path:

```powershell
pnpm exec vitest run runtime/test/cross-surface-failure-recovery.test.ts
```

Tests must prove failure kind mapping, fail-closed raw/secret/execution blockers,
advisory-only output, and execution readiness flags false.

## Completion Report

Report runtime helper, tests, docs, scoped checks, local commit hash, and the
next task `DW-P1G-003`.
