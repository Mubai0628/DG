# P1K-002 Security Audit Matrix Plan

## Scope

Create the v1 candidate security audit matrix, checklist, and known-risk
register. This remains docs and docs-lock testing only; it does not add runtime
or App execution capability.

## Required Files

- `docs/security-audit-matrix-v0.33.md`
- `docs/security-audit-matrix-checklist-v0.33.md`
- `docs/security-audit-known-risks-v0.33.md`

## Matrix Rows

- `web_table_to_csv` baseline.
- Event Log / Replay.
- App approved apply / rollback.
- Git safe lanes.
- Shell verification safe lanes.
- Project Knowledge and memory recall.
- MCP read-only connection.
- MCP read-only tool execution.
- Plugin manifest.
- Skill manifest.
- Capability Broker.
- Fixed Multi-Agent.
- Desktop Observer.
- Desktop Action Proposal.
- Approved Desktop Actions.
- Expanded Desktop Action Proposal.
- Approved Expanded Desktop Actions.
- Cross-surface Workflow.
- External Capability Hardening.
- Packaging / migration.

## Matrix Columns

- capability.
- current allowed behavior.
- forbidden behavior.
- primary risk.
- required approval / receipt.
- EventStore behavior.
- raw data policy.
- redaction audit.
- replay requirement.
- boundary checker coverage.
- test coverage.
- manual QA coverage.
- known gaps.

## Checklist Requirements

- No raw prompt / source / diff / response / reasoning / API key in persisted
  events.
- No broad native bridge.
- No arbitrary Git / shell.
- No mutating MCP tools.
- No arbitrary plugin code execution.
- No arbitrary skill runtime.
- No unapproved desktop action.
- No auto-apply.
- No destructive migration.
- No silent update.

## Tests

Add docs-lock assertions for the matrix, checklist, known risks, docs index, and
the no-new-execution invariants.

## Scoped Commands

```powershell
pnpm lint
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Commit

```text
docs: add v1 security audit matrix
```
