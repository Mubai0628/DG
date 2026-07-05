# v1 Candidate Manual QA

Use this guide for final GUI and release-readiness review before publishing the
v0.33 RC.

## Pre-check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
```

## Start

```powershell
pnpm app:dev
```

## Convert Baseline

1. Choose workspace `D:\workspaces\demo`.
2. Load `runtime/test/fixtures/web-table-sample-payload.json`.
3. Use filename `web-table-export-v1-candidate.csv`.
4. Run Convert.
5. Verify the CSV draft exists under `workspace/drafts/`.
6. Verify the result shows summary counts only.

## Event Log / Replay

- Refresh events.
- Verify Event Log / Replay shows summary-only events.
- Verify replay does not execute or mutate state.

## Approved Apply / Rollback

- Verify apply requires approval receipt and exact typed confirmation.
- Verify rollback requires receipt, checkpoint, and exact typed confirmation.
- Verify auto-apply and model-direct apply are unavailable.

## Git/shell Safe Lanes

- Verify Git lane shows fixed read-only summaries only.
- Verify shell lane shows fixed verification-template summaries only.
- Verify arbitrary Git/shell, Git writes, install, network, and destructive
  commands are unavailable.

## Project Knowledge

- Verify commit/revoke/recall flows are summary-only.
- Verify raw memory body and secret values are not displayed.

## MCP / Plugin / Skill

- Verify MCP discovery is typed-confirmation and summary-only.
- Verify MCP read-only tool execution is allowlisted and summary-only.
- Verify mutating MCP tools remain blocked.
- Verify plugin execution and arbitrary skill runtime remain disabled.
- Verify plugin/skill metadata surfaces are read-only.

## Desktop

- Verify Desktop Observer is user-triggered and summary-only.
- Verify Desktop Action Proposal is proposal-only.
- Verify Approved Desktop Actions require receipt and typed confirmation.
- Verify arbitrary desktop automation, broad native bridge, clipboard write,
  file dialog automation, and drag/drop remain disabled.

## Cross-surface Workflow

- Verify proposal, agent, MCP, desktop, approved execution, verification, and
  replay surfaces connect through summary refs only.
- Verify hidden execution and raw cross-surface payload sharing do not occur.

## Packaging / Migration

- Run `pnpm check:artifacts`.
- Verify artifact output is summary-only.
- Review migration dry-run docs.
- Verify no destructive migration, silent deletion, cloud sync, telemetry upload,
  or auto-update without confirmation.

## Safety Sweep

- No raw prompt.
- No raw source.
- No raw diff.
- No raw model response.
- No reasoning content.
- No raw DOM.
- No raw CSV.
- No raw screenshot payload.
- No clipboard or file dialog content.
- No API key, Authorization value, token, or secret.

## References

- [North Star Manual QA Matrix v0.33](north-star-manual-qa-matrix-v0.33.md)
- [North Star Release Readiness Checklist v0.33](north-star-release-readiness-checklist-v0.33.md)
- [Known Limitations v1 Candidate](known-limitations-v1-candidate.md)
