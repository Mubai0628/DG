# v0.14.0-end-to-end-coding-task-mvp-rc.1

v0.14.0-end-to-end-coding-task-mvp-rc.1 - End-to-end DeepSeek coding task MVP.

Recommended tag:
`v0.14.0-end-to-end-coding-task-mvp-rc.1`

## Scope

This release candidate keeps the v0.13 App Live Proposal Generation MVP intact
while adding the P0R end-to-end coding task MVP.

Included scope:

- v0.13 App live DeepSeek proposal generation with explicit opt-in.
- P0R End-to-End Coding Task roadmap, ADR, threat model, and implementation
  gate.
- Runtime E2E coding task fixture schema.
- Runtime E2E coding task orchestrator.
- App End-to-End Coding Task Wizard.
- App End-to-End Apply / Verify / Rollback Sequencer.
- App E2E Task Failure Recovery.
- E2E coding task regression suite and manual QA smoke.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App can request live DeepSeek proposal generation with explicit opt-in.
- Generated proposal enters repair/schema/import/chain preview.
- Human approval receipt and typed confirmation are required.
- Approved apply writes only safe paths.
- Git/shell verification lanes are fixed and bounded.
- Rollback is available from checkpoint.
- Summary-only events/replay reconstruct the flow.

## Explicit Non-goals

- No auto-apply.
- No autonomous coding loop.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key in events.
- No raw source/diff/preimage in event payloads.

## Safety

- Human approval.
- Typed confirmation.
- Path guard.
- Content/secret guard.
- Checkpoint.
- Rollback.
- Verification.
- Summary-only events.
- Replay.
- Failure recovery safe summaries.
- Convert FILE_EXISTS remains actionable and safe.

## Checks

Run the focused P0R scoped checks first, then the full stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`docs/e2e-coding-task-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.14.0-end-to-end-coding-task-mvp-rc.1/docs/e2e-coding-task-manual-qa.md).

RC checklist:
[`docs/e2e-coding-task-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.14.0-end-to-end-coding-task-mvp-rc.1/docs/e2e-coding-task-rc-checklist.md).
