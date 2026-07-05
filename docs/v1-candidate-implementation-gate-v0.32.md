# v1 Candidate Implementation Gate v0.32

This gate is intentionally testable. No item may rely only on prose; each item
must map to a command, docs-lock assertion, manual QA row, release metadata
check, or explicit artifact inspection.

## Release Artifact Gate

- `docs/release-notes-v0.33.0-v1-candidate-polish-rc.1.md` exists.
- Release notes include full docs path links for manual QA and RC checklist.
- Local tag matches release notes tag.
- Main CI and tag CI are green before creating the prerelease.
- `gh release view v0.33.0-v1-candidate-polish-rc.1` verifies prerelease
  metadata.

## Security Audit Gate

- `docs/security-audit-matrix-v0.33.md` exists.
- Matrix rows cover baseline Convert, Event Log / Replay, approved apply /
  rollback, Git / shell lanes, Project Knowledge, MCP, plugin / skill,
  Capability Broker, fixed multi-agent, desktop observer / actions,
  cross-surface workflow, external capability hardening, and packaging /
  migration.
- `pnpm check:boundaries` passes.
- `pnpm check:secrets` passes.

## Capability Boundary Gate

- `docs/capability-boundary-matrix-v0.33.md` exists.
- Every execution-like lane has current status, allowed caller, approval,
  typed confirmation, EventStore behavior, raw data policy, replay behavior,
  future stage, and blocking tests.
- App docs-lock tests assert no broad native bridge, arbitrary desktop
  automation, mutating MCP tools, arbitrary plugin / skill execution, arbitrary
  Git / shell, destructive migration, or auto-update without confirmation.

## Migration Dry-run Gate

- `docs/data-migration-final-dry-run-review-v0.33.md` exists.
- EventStore, Project Knowledge, checkpoints / preimages, replay summaries,
  workspace-local `.deepseek-workbench`, settings, release channel metadata,
  schema registry, and backup / restore dry-run plans are reviewed.
- Docs state no destructive migration, no silent data deletion, no cloud sync,
  no telemetry upload, and no auto-update without confirmation.

## QA Matrix Gate

- `docs/north-star-manual-qa-matrix-v0.33.md` exists.
- Each row includes setup, steps, expected result, must-not-happen checks,
  artifacts to inspect, and links to docs.
- `pnpm app:qa:check` passes in the final RC gate.

## Golden Regression Gate

- `docs/golden-regression-dashboard-v0.33.md` exists.
- `docs/golden-regression-summary-v0.33.json` is summary-only.
- No raw prompt, source, diff, response, reasoning, API key, DOM, CSV, or
  screenshot content appears in the dashboard fixture.

## Event / Replay Gate

- Approved apply / rollback, verification lanes, Project Knowledge, MCP,
  desktop action, cross-surface workflow, packaging, and migration surfaces have
  replay or summary evidence references.
- Replay remains summary-only and never re-executes.

## Redaction / Secrets Gate

- `pnpm check:secrets` passes.
- `pnpm check:boundaries` passes.
- Manual QA includes no raw prompt, raw source, raw diff, raw response,
  reasoning content, raw CSV, raw DOM, screenshot, API key, Authorization, or
  secret persistence checks.

## Installer / Package Hygiene Gate

- `docs/installer-package-artifact-hygiene-v0.33.md` exists.
- Artifact allowlist covers `app/dist`, `app/src-tauri/target`, `runtime/dist`,
  `browser-extension/dist`, `conformance/results`, `.tmp`, `node_modules`,
  release zips, logs, screenshots, and coverage.
- Artifact check script passes if added.

## Docs / Onboarding Gate

- `docs/quickstart-v1-candidate.md` exists.
- `docs/known-limitations-v1-candidate.md` exists.
- `docs/release-rollback-guide-v1-candidate.md` exists.
- Root README, App README, and docs index link the v1 candidate docs.

## Rollback Guidance Gate

- Rollback guide covers release tag rollback, workspace checkpoint rollback,
  EventStore summary replay, data backup guidance, and what not to delete.

## Blocking Rule

Do not release v0.33 until every gate above has direct evidence and all final
full gates pass.
