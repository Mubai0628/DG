# v0.32.0-packaging-update-migration-qa-rc.1 — Packaging, update, migration, and QA matrix hardening

This release candidate completes the P1J Packaging / Update / Data Migration /
QA Matrix hardening phase.

## Current Working Flow

- web_table_to_csv Convert remains the real baseline conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- Project Knowledge remains human-reviewed and summary-only.
- MCP read-only connection/tool execution remains bounded.
- Plugin/skill metadata remains no arbitrary execution.
- Desktop action lanes remain approved/bounded.
- Packaging/update/migration models are dry-run / read-only.
- No auto-update, no destructive migration, no silent deletion.

## Scope

- App data inventory / schema registry.
- Migration dry-run plan.
- Backup / restore plan.
- Release channel / update policy.
- First-run upgrade state.
- Packaging artifact hygiene.
- Manual QA matrix.
- Release smoke matrix.

## Non-goals

- no auto-update without confirmation
- no destructive migration
- no silent data deletion
- no cloud sync
- no telemetry upload
- no new execution capability
- no native bridge expansion
- no broad desktop automation

## Safety

- metadata-only inventory
- summary-only migration plan
- backup/restore dry-run only
- release channel policy
- artifact hygiene checks
- manual QA matrix
- full gates
- ignored artifacts remain ignored

## Checks

Scoped checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

Manual QA:

- [`docs/packaging-update-migration-manual-qa.md`](packaging-update-migration-manual-qa.md)

RC checklist:

- [`docs/packaging-update-migration-rc-checklist.md`](packaging-update-migration-rc-checklist.md)

## Known Warnings

- Tauri bundle identifier warning may remain documented if it is not fixed in a
  low-risk scoped change.
- Vite chunk-size warning may remain documented if it is not bounded in a
  low-risk scoped change.

## Release Hygiene

- Generated artifacts remain ignored.
- No generated artifacts are committed.
- Release body should use full docs path links.
- Recommended tag: `v0.32.0-packaging-update-migration-qa-rc.1`
