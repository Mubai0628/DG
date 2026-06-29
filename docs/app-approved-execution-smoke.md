# App Approved Execution Smoke

Status: DW-P0O-007 smoke and hardening artifact.

This document records the end-to-end approved execution smoke path for the
v0.11 App-side Approved Execution MVP. The automated smoke creates this same
relative path inside a temporary workspace:

```text
docs/app-approved-execution-smoke.md
```

## Smoke Flow

The smoke follows this sequence:

```text
proposal import
-> validation/audit
-> approval receipt
-> apply
-> summary event
-> refresh events
-> rollback receipt
-> rollback
-> summary event
-> replay projection
```

## Required Evidence

- The approved apply creates only the safe docs path in the temp workspace.
- The checkpoint is created under `.deepseek-workbench/checkpoints`.
- The apply event is written as `user_workspace.patch_apply.app_executed`.
- The event payload is summary-only and does not include raw content.
- Re-running the same create apply is blocked as a safe conflict.
- The approved rollback removes the created file from the checkpoint.
- The rollback event is written as `user_workspace.patch_rollback.app_executed`.
- Event Log / Replay reconstructs approved apply and rollback counts.

## Boundaries

- No DeepSeek call.
- No API key read.
- No Git or shell execution.
- No generic command UI.
- No production PermissionLease issuing.
- No native bridge or desktop action.
- No raw content, raw source, raw diff, raw prompt, raw response, API key, or
  checkpoint preimage in events.

## Fixtures

The App test fixtures are:

- `app/test/fixtures/approved-execution-smoke-proposal.json`
- `app/test/fixtures/approved-execution-temp-workspace.json`

They are summary-safe fixture contracts. They are not live model requests and
do not enable App-side broad execution.
