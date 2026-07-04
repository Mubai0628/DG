# P1F-001 Cross-surface Agent Workflow Plan

Task:

```text
DW-P1F-001 - Cross-surface Agent Workflow ADR / Threat Model / Implementation Gate
```

## Scope

Docs and design only.

P1F-001 creates the architectural decision record, threat model, implementation
gate, and P1F-002 scenario schema plan for the cross-surface workflow RC.

## Non-goals

- No runtime scenario schema implementation.
- No workflow planner implementation.
- No App composer.
- No live DeepSeek call.
- No agent execution.
- No MCP tool invocation.
- No plugin or skill runtime execution.
- No desktop observer command.
- No desktop action execution.
- No workspace apply or rollback.
- No Git/shell execution.
- No EventStore write.
- No Tauri command.
- No broad native bridge.

## Required Design Outputs

- ADR: fixed route, summary refs, no dynamic bidding, no direct model/tool
  execution, approved lanes only, replay/audit required.
- Threat model: cross-surface prompt injection, stale evidence, handoff
  mismatch, capability escalation, tool spoofing, desktop mismatch, approval
  bypass, replay tampering, raw data leakage, API key leakage,
  reasoning_content leakage, event chain inconsistency, rollback failure.
- Implementation gate: testable checklist for scenario schema, evidence
  summaries, agent route, model proposal, capability broker, desktop
  observer/action, apply/rollback, verification lanes, replay/audit, App UI, and
  CI/boundary checks.
- P1F-002 plan: scenario schema and golden demo contract only.

## Acceptance Criteria

- All new docs are linked from `docs/README.md`.
- App docs-lock tests assert the ADR, threat model, implementation gate, and
  P1F-002 plan exist and preserve the non-expansion boundary.
- The task remains docs-only and does not add runtime or App execution paths.

## Scoped Commands

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Git Workflow

```powershell
git status --short
git status -sb
git log --oneline origin/main..HEAD
```

Commit message:

```text
docs: add cross-surface agent workflow adr
```

No push, no tag, and no GitHub Release for P1F-001.
