# P0T-001 Production Memory / Project Knowledge Plan

## Scope

P0T-001 is a docs/test design gate for the production project knowledge phase.
It creates the ADR, threat model, implementation gate, and P0T-002 plan before
any runtime or App behavior changes.

The target lifecycle is:

```text
E2E task evidence / verification / approved execution summary
-> memory candidate
-> human review
-> commit project_fact / pitfall / policy
-> persistent project knowledge store
-> recall summary in later coding task
-> revoke / expire / audit
-> replay reconstructable memory state
```

## Non-Goals

- No runtime feature implementation in P0T-001.
- No App UI implementation in P0T-001.
- No Tauri command in P0T-001.
- No EventStore writer in P0T-001.
- No memory store write in P0T-001.
- No live DeepSeek call in P0T-001.
- No API key read in P0T-001.
- No fetch/network in P0T-001.
- No apply.
- No rollback.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No broad PermissionLease issuance.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.

## Design Questions

- Which schema fields prove policy, project_fact, and pitfall entries are
  summary-only and reviewable?
- Which provenance and trust fields are sufficient to prevent model-direct
  policy persistence?
- Which evidence refs are required before a project_fact can be committed?
- How should revoke and expire events reconstruct memory state without deleting
  historical records?
- Which recall placements are safe for project facts, pitfalls, and policies?
- Which redaction gates prove raw prompt, source, diff, response,
  reasoning_content, and API keys never enter memory?

## Threat Model Requirements

The P0T-001 threat model must cover:

- Prompt injection creating fake memory.
- Model hallucination stored as fact.
- Stale project fact.
- Wrong policy persistence.
- Policy poisoning.
- Secret leakage.
- Raw source leakage.
- Raw diff leakage.
- Raw prompt leakage.
- API key leakage.
- Tool output poisoning.
- External source poisoning.
- Over-recall or irrelevant recall.
- Memory interfering with patch safety.
- Revoke or expire bypass.
- Replay mismatch.
- Filesystem corruption of the memory store.

## Implementation Gate Requirements

The implementation gate must be testable and must require:

- Schema safety tests.
- Storage safety tests.
- Candidate safety tests.
- Commit safety tests.
- Policy source safety tests.
- Evidence and provenance safety tests.
- Revoke and expire safety tests.
- Recall safety tests.
- Context integration safety tests.
- Event and replay safety tests.
- App UI safety tests.
- CI and boundary checks.

## P0T-002 Store Contract Plan Requirements

The P0T-002 plan must define:

- Store contract.
- Workspace-local file layout.
- JSONL or append-only format.
- Indexes and summaries.
- Redaction policy.
- Path guard.
- No raw content policy.
- Tests.
- Scoped commands.

## Scoped Command Policy

P0T-001 should run docs/app focused checks only:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0T RC polish task.

## Local Commit Workflow

1. Run `git status --short`, `git status -sb`, and
   `git log --oneline origin/main..HEAD`.
2. Stop if unrelated dirty changes exist.
3. Add only P0T-001 docs/test files.
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
- P0T-002 plan summary.
- Key invariants.
- Local commit hash and subject.
- Remaining blockers, if any.
