# E2E Coding Task Hardening Smoke Plan

The v0.15 smoke plan adds a static smoke checker for the approved execution
hardening path. The checker validates required docs, fixtures, disabled App
controls, and docs-lock tests; it does not execute apply, does not execute
rollback, and does not mutate workspace files.

## Static Smoke Checker

- Command: `pnpm check:e2e-approved-execution-smoke`
- Script: `scripts/check-e2e-approved-execution-smoke.mjs`
- Mode: static smoke checker.
- Inputs: docs, fixture paths, App source copy, and App docs-lock tests.
- Output: summary-only PASS/FAIL text.

## Coverage

- Convert manual QA coverage.
- Live proposal generation remains proposal-only and App-disabled.
- Proposal chain import and projection remain preview-only.
- Approved apply uses the existing approved execution lane.
- Verification lane remains fixed-template only.
- Rollback uses approved checkpoint metadata and current hash checks.
- Replay timeline is summary-only.
- Stale conflict scenarios remain blocked.
- Failure recovery shows safe guidance without automatic action.
- Raw content absence is explicitly checked in manual QA.

## Non-Execution Boundary

The smoke checker:

- does not execute apply.
- does not execute rollback.
- does not write EventStore events.
- does not call DeepSeek.
- does not read API keys.
- does not fetch network.
- does not run Git or shell commands.
- does not invoke Tauri.
- does not mutate workspace.
- does not enable App execution.

## Redaction Boundary

The smoke plan requires summary-only evidence:

- no raw prompt.
- no raw response.
- no raw source.
- no raw diff.
- no raw CSV.
- no raw DOM.
- no reasoning_content.
- no API key.
- no Authorization header.
- no token or password value.

## Required Artifacts

- `docs/e2e-coding-task-hardening-manual-qa.md`
- `docs/e2e-coding-task-hardening-smoke-plan.md`
- P0S golden regression fixtures under
  `runtime/test/fixtures/e2e-coding-tasks/`
- P0R approved execution regression fixtures under
  `app/test/fixtures/e2e-coding-task-regression/`
- App disabled controls for recovery and replay timeline actions.
- App docs-lock tests for P0S-004, P0S-005, and P0S-006.

## Release Use

Run this smoke checker before v0.15 RC full gates. It is not a replacement for
`pnpm app:test`, `pnpm check:boundaries`, `pnpm check:secrets`, or manual GUI
QA. It is a focused guard that keeps the recovery/replay hardening checklist
present and non-executing.
