# P0S-001 MVP Hardening / Recovery Plan

## Scope

P0S-001 is a docs/test design gate for the MVP hardening phase. It creates the
ADR, threat model, implementation gate, and P0S-002 plan before any behavior
changes.

The phase hardens the existing v0.14 flow:

```text
explicit opt-in live proposal
-> repair/schema/import/chain preview
-> human approval receipt
-> exact typed confirmation
-> approved apply
-> fixed Git/shell verification safe lanes
-> checkpoint rollback if needed
-> summary-only events/replay
```

## Non-Goals

- No runtime feature implementation in P0S-001.
- No App UI implementation in P0S-001.
- No live DeepSeek call in P0S-001.
- No API key read in P0S-001.
- No fetch/network in P0S-001.
- No file write outside docs/test artifacts.
- No apply.
- No rollback.
- No EventStore writer.
- No App execution.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No broad PermissionLease issuance.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.

## Design Questions

- Which golden regression cases prove the v0.14 MVP flow remains stable?
- Which stale snapshot and conflict states must fail closed?
- Which interrupted apply or rollback states can offer rollback guidance, and
  which require manual recovery?
- Which event fields are sufficient for replay without raw source, raw diff,
  raw preimage, raw prompt, raw response, reasoning_content, or API key?
- Which packaging/build warnings are low-risk to fix, and which should remain
  documented non-blocking warnings?

## Threat Model Requirements

The P0S-001 threat model must cover:

- Stale workspace snapshot.
- Conflict after proposal approval.
- Interrupted apply.
- Interrupted rollback.
- Checkpoint corruption.
- Preimage mismatch.
- Event mismatch.
- Replay drift.
- Duplicate apply.
- Rollback after external modification.
- Verification command failure.
- Git/shell output leakage.
- Raw checkpoint or preimage leakage.
- Windows path edge cases.
- UI accidentally enabling unsafe buttons.

## Implementation Gate Requirements

The implementation gate must be testable and must require:

- Golden regression tests.
- Conflict detection tests.
- Checkpoint verification tests.
- Rollback verification tests.
- Summary-only event tests.
- Replay projection tests.
- Raw output leakage tests.
- Boundary checks for no arbitrary Git/shell.
- Boundary checks for no native bridge.
- Boundary checks for no auto-apply.
- Boundary checks for no model execution.

## Scoped Command Policy

P0S-001 should run docs/app focused checks only:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0S RC polish task.

## Local Commit Workflow

1. Run `git status --short`, `git status -sb`, and
   `git log --oneline origin/main..HEAD`.
2. Stop if unrelated dirty changes exist.
3. Add only P0S-001 docs/test files.
4. Run scoped checks.
5. Run `git diff --check` and `git diff --cached --check`.
6. Create a local commit.
7. Do not push, tag, or create a GitHub Release.

## Completion Report Format

- Status.
- Files changed.
- Scoped docs/app checks.
- ADR summary.
- Threat model summary.
- Implementation gate summary.
- Key invariants.
- Local commit hash and subject.
- Remaining blockers, if any.
