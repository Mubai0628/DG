# v0.33.0-v1-candidate-polish-rc.1

v1 candidate polish, security audit, and release readiness.

Recommended tag: `v0.33.0-v1-candidate-polish-rc.1`.

## Scope

This RC closes the P1K v1 candidate polish stage. It adds release-readiness
artifacts and documentation gates without broadening execution capability:

- v1 candidate readiness artifacts.
- security audit matrix.
- capability boundary matrix.
- golden regression dashboard.
- package artifact hygiene.
- migration dry-run review.
- onboarding / quickstart / limitations / rollback guide.
- North Star manual QA matrix.

## Current Working Flow

- web_table_to_csv Convert baseline remains the real local conversion flow.
- DeepSeek live proposal support remains runtime explicit opt-in; the App Shell
  does not call DeepSeek, read API keys, fetch network, or send live requests.
- approved apply / rollback remains receipt-gated with exact typed confirmation.
- Git/shell safe lanes remain fixed read-only or verification templates.
- Project Knowledge remains human-reviewed and summary-only.
- MCP read-only connection/tool paths remain allowlisted and bounded.
- Plugin/Skill metadata governance remains read-only or fixed simulation.
- Fixed multi-agent workflow remains fixed-route and summary-only.
- Desktop Observer remains user-triggered and summary-only.
- Approved Desktop Actions remain narrow, receipt-gated lanes.
- Cross-surface workflow remains summary refs, approval-gated mutation, and
  replay/audit summaries.
- Replay/audit remains deterministic and non-mutating.

## Explicit Non-goals

- No broad native bridge.
- No arbitrary desktop automation.
- No mutating MCP tools.
- No arbitrary plugin/skill execution.
- No arbitrary Git/shell.
- No cloud sync.
- No telemetry upload.
- No destructive migration.
- No auto-update without confirmation.

## Safety

- No raw prompt, source, diff, model response, reasoning content, DOM, CSV,
  screenshot payload, clipboard content, file dialog content, API key,
  Authorization value, token, or secret in release artifacts.
- Package artifact checking is read-only and writes only to stdout.
- Migration review is dry-run only.
- Manual QA evidence is summary-only.
- Generated artifacts remain ignored unless explicitly reviewed and attached by
  release checklist.

## Docs

- Manual GUI QA should follow [`docs/v1-candidate-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/v1-candidate-manual-qa.md).
- RC checklist should follow [`docs/v1-candidate-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/v1-candidate-rc-checklist.md).
- Quickstart: [`docs/quickstart-v1-candidate.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/quickstart-v1-candidate.md).
- Known limitations: [`docs/known-limitations-v1-candidate.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/known-limitations-v1-candidate.md).
- Security audit matrix: [`docs/security-audit-matrix-v0.33.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/security-audit-matrix-v0.33.md).
- Capability boundary matrix: [`docs/capability-boundary-matrix-v0.33.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/capability-boundary-matrix-v0.33.md).
- Golden regression dashboard: [`docs/golden-regression-dashboard-v0.33.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/golden-regression-dashboard-v0.33.md).
- North Star manual QA matrix: [`docs/north-star-manual-qa-matrix-v0.33.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/north-star-manual-qa-matrix-v0.33.md).

## Checks

Scoped checks:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Full gates:

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm --filter @deepseek-workbench/browser-extension build
pnpm --filter @deepseek-workbench/browser-extension test
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```
