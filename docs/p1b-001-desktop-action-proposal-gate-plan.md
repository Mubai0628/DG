# P1B-001 Desktop Action Proposal Gate Plan

## Scope

P1B-001 is design-only. It creates the ADR, threat model, implementation gate,
and next-step schema plan for Desktop Action Proposal MVP.

## Non-goals

- No runtime feature.
- No App feature.
- No Tauri command.
- No desktop action execution.
- No click/type/select execution.
- No clipboard write.
- No file dialog automation.
- No hidden background capture.
- No native bridge broad action.
- No remote control.
- No dynamic agent desktop control.

## Required Decisions

- Desktop actions are proposal-first.
- Desktop Action Proposals may reference Desktop Observer evidence refs.
- P1B cannot execute real desktop actions.
- P1B cannot click, type, select, use clipboard, or automate file dialogs.
- Proposal outputs must pass target metadata validation, risk classification,
  approval draft generation, dry-run simulation, and privacy/redaction audit.
- The App Shell remains read-only and proposal-only.
- Capability Broker may plan descriptor refs but must not issue leases or
  execute actions.
- Future execution requires a separate approved desktop action phase.

## Testable Gate Items

- Target metadata validation exists and blocks stale/mismatched evidence.
- Action kind allowlist exists for proposal values only.
- Forbidden execution fields are blocked.
- Sensitive target detection exists.
- Risk classification exists and maps high-risk actions.
- Approval draft remains summary-only.
- Dry-run simulation does not execute.
- Privacy/redaction audit blocks raw screenshots, OCR text, clipboard content,
  raw prompt/source/diff/response, API keys, and secret markers.
- App UI exposes disabled action placeholders only.
- Boundary checker keeps blocking native bridge, desktop action execution, Git,
  shell, EventStore raw action writes, and broad PermissionLease.

## Scoped Command Policy

P1B-001 runs docs/app focused checks only:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Full gates, push, tag, and GitHub Release are deferred to P1B-009.

## Completion Report Format

The P1B-001 completion report should include files changed, commands run,
docs-lock test coverage, invariant checks, local commit hash, and any blockers.
