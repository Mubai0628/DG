# P1K-001 v1 Candidate Readiness Plan

## Scope

Create the v1 candidate readiness ADR, threat model, and implementation gate.
This is docs / test only. It should establish that v0.33 is a release
readiness and candidate polish phase, not a capability expansion phase.

## Non-goals

- No runtime feature implementation.
- No App UI feature implementation.
- No new Tauri command.
- No EventStore writer.
- No broad native bridge.
- No arbitrary desktop automation.
- No mutating MCP tools.
- No arbitrary plugin / skill execution.
- No arbitrary Git / shell execution.
- No destructive migration.
- No auto-update without confirmation.

## Required Documents

- `docs/adr/0011-v1-candidate-readiness.md`
- `docs/v1-candidate-readiness-threat-model-v0.32.md`
- `docs/v1-candidate-implementation-gate-v0.32.md`
- `docs/p1k-002-security-audit-matrix-plan.md`

## ADR Decisions

- v1 candidate readiness is based on evidence, not new capabilities.
- All existing execution lanes remain approved, bounded, replayable, and
  summary-only.
- Security audit, capability boundary, regression, migration, packaging,
  onboarding, rollback, and QA artifacts are blocking readiness evidence.
- Data migration paths require dry-run review before any destructive behavior is
  considered.

## Threat Model Coverage

- Release artifact mismatch.
- Installer / update failure.
- Data migration corruption.
- Backup / restore mismatch.
- Capability boundary regression.
- Event / replay incompleteness.
- Raw data leakage in docs, logs, events, or summaries.
- Cross-surface workflow drift.
- Desktop action recovery failure.
- MCP / plugin / skill boundary escape.
- PermissionLease / approval receipt scope drift.
- GitHub release / tag mismatch.
- Manual QA gaps.

## Gate Categories

- Release artifact gate.
- Security audit gate.
- Capability boundary gate.
- Migration dry-run gate.
- QA matrix gate.
- Golden regression gate.
- Event / replay gate.
- Redaction / secrets gate.
- Installer / package hygiene gate.
- Docs / onboarding gate.
- Rollback guidance gate.

## Tests

Add lightweight docs-lock assertions in `app/test/desktop-shell.test.ts` for
the new ADR, threat model, implementation gate, and P1K roadmap links.

## Scoped Commands

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Local Commit Only

Commit message:

```text
docs: add v1 candidate readiness adr
```
