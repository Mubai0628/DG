# North Star Demo Hardening Implementation Gate v0.28

Every gate item must be backed by source, test, or documented release evidence.
No item may rely only on prose.

## Failure Recovery

- Runtime helper emits explicit failure kinds.
- Recovery actions are advisory-only.
- Tests prove rollback, retry, Git/shell, desktop action, and EventStore writes
  are not executed by the helper.

## Approval Consistency

- Runtime helper compares task, proposal, workspace, target, lease, receipt,
  typed confirmation, and expiration summaries.
- Tests block expired, broad, mismatched, or cross-lane receipts.

## Capability Policy Enforcement

- Runtime helper classifies capability categories and risk.
- Tests block disabled, mutating, broad, unsupported, or App-execution claims.

## Replay Completeness

- Runtime helper checks required summary refs, ordering, duplicate conflicts,
  and raw artifact blockers.
- Tests cover apply without approval, rollback without checkpoint, desktop
  action without observer evidence, and MCP result without approval.

## Evidence Freshness

- Runtime helper checks timestamps, hash refs, source kinds, and drift.
- Tests cover stale workspace, MCP, plugin/skill, desktop, Git, shell, and agent
  evidence.

## Agent Handoff Safety

- Runtime helper checks fixed role order, missing role outputs, stale dossier
  hashes, missing proposal or verification summaries, and interrupted workflow
  next actions.
- Tests prove no dynamic bidding and no agent rerun.

## Long-running State Review

- Stale long-running stages produce explicit warnings or blockers.
- Recovery suggestions remain summary-only.

## App UI Readiness Wording

- App panels are read-only or advisory.
- App panels do not add approve/reject/apply/rollback/run buttons.
- Tests lock disabled wording and source boundaries.

## Boundary / Secrets

- `pnpm check:boundaries` passes.
- `pnpm check:secrets` passes.
- Tests prove raw prompt/source/diff/response/reasoning/API key markers block.

## CI / Release Smoke

- Scoped checks pass for ordinary tasks.
- Full gates pass only during RC release.
- GitHub Actions main and tag runs are green before GitHub prerelease.
