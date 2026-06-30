# P0R-001 End-to-End Coding Task MVP Plan

## Scope

P0R-001 is a docs/design gate for the End-to-End Coding Task MVP. It creates the
ADR, threat model, and implementation gate for connecting the existing v0.11,
v0.12, and v0.13 capabilities into one reliable coding task flow.

The planned flow is:

```text
User objective
-> live DeepSeek proposal generation
-> repair / schema validation
-> model proposal import
-> chain integration
-> diff / validation / approval
-> human typed confirmation
-> approved apply
-> Git / shell verification safe lanes
-> summary events / replay
-> rollback if needed
```

## Non-Goals

- No runtime feature implementation in P0R-001.
- No App UI implementation in P0R-001.
- No live DeepSeek call in P0R-001.
- No API key read in P0R-001.
- No fetch/network in P0R-001.
- No file write outside docs/test artifacts.
- No apply.
- No rollback.
- No EventStore writer.
- No App execution.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No native bridge.
- No desktop action.

## Design Questions

- Which state transitions prove the flow is complete without enabling
  autonomous execution?
- Which stage owns summary-only evidence for proposal, approval, apply,
  verification, rollback, and replay?
- Which stale snapshot, conflict, unsafe output, verification failure, and
  rollback failure states are blockers?
- Which warnings may allow the user to continue to the next preview stage?
- Which event payloads are required for replay without raw prompt, raw response,
  reasoning_content, API key, raw source, raw diff, raw CSV, or preimage?

## Threat Model Requirements

The P0R-001 threat model must cover:

- DeepSeek auto-apply attempts.
- Approval bypass.
- Typed confirmation replay or mismatch.
- Unsafe path generation.
- Raw prompt or raw response leakage.
- reasoning_content leakage.
- API key leakage.
- Raw source, raw diff, raw CSV, or checkpoint preimage leakage.
- Stale snapshot apply.
- Conflict after proposal generation.
- Verification lane misuse.
- Arbitrary Git/shell escalation.
- Rollback without checkpoint.
- Event/replay confusion.
- Native bridge or desktop action escalation.

## Implementation Gate Requirements

The implementation gate must be testable and must require:

- State machine tests for allowed and blocked transitions.
- Golden end-to-end task fixtures.
- Repair/schema/import/chain integration checks.
- Human approval receipt and typed confirmation checks.
- Approved apply/rollback request checks.
- Checkpoint and rollback reference checks.
- Fixed Git/shell verification lane checks.
- Summary-only event and replay checks.
- Redaction checks for raw prompt, raw response, reasoning_content, API key,
  raw source, raw diff, raw CSV, and checkpoint preimage.
- Boundary checks for no auto-apply, no broad PermissionLease, no arbitrary
  Git/shell, no native bridge, and no desktop action.

## Scoped Command Policy

P0R-001 should run docs/app focused checks only:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0R RC polish task.

## Local Commit Workflow

1. Run `git status --short`, `git status -sb`, and
   `git log --oneline origin/main..HEAD`.
2. Stop if unrelated dirty changes exist.
3. Add only P0R-001 docs/test files.
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
