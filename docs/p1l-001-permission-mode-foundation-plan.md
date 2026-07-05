# P1L-001 Permission Mode Foundation Plan

## Scope

Create the Permission Mode / High-Privilege Automation ADR, threat model, and
implementation gate. This is a docs and docs-lock task only. It establishes the
policy vocabulary for later high-privilege automation while preserving all
current execution boundaries.

## Non-goals

- No runtime feature implementation.
- No App UI feature implementation.
- No new Tauri command.
- No EventStore writer.
- No arbitrary shell.
- No automatic command execution.
- No auto apply.
- No arbitrary file deletion.
- No recursive directory deletion.
- No Git commit or push.
- No autonomous loop.
- No raw transcript or raw output persistence.
- No broad native bridge.
- No arbitrary desktop automation.

## Required Documents

- `docs/adr/0011-permission-mode-high-privilege-automation.md`
- `docs/permission-mode-high-privilege-threat-model-v0.33.md`
- `docs/permission-mode-implementation-gate-v0.33.md`
- `docs/p1l-002-permission-mode-matrix-session-lease-plan.md`

## ADR Decisions To Lock

- High-privilege capabilities must be controlled by Permission Mode.
- Default mode is Approval Mode.
- Full Access is not default.
- Full Access must be session-scoped, time-limited, workspace-scoped, visible,
  and revocable.
- Every capability call must go through an Execution Policy Engine.
- High-risk capabilities require audit, replay, and transcript policy.
- v0.34 only builds the foundation and does not enable arbitrary shell,
  recursive delete, Git push, auto apply, autonomous loop, or raw output
  persistence.

## Threat Model Coverage

- User accidentally enables Full Access.
- Model attempts to induce permission escalation.
- Prompt injection asks for command execution.
- Destructive command or recursive delete is requested.
- Git push targets the wrong remote or branch.
- Raw output leaks secrets.
- Background process outlives the visible session.
- Autonomous loop runs away.
- Kill switch is hidden, stale, or ineffective.
- Session lease expires but is still trusted.
- Replay or audit summary is tampered with.
- Workspace escape or system path mutation is attempted.
- Desktop action escalation exceeds approved lanes.

## Implementation Gate Categories

- Mode schema safety.
- Session lease safety.
- Capability mapping safety.
- Risk budget safety.
- Kill switch safety.
- UI safety.
- Audit / replay safety.
- Boundary checker safety.

## Tests

Add lightweight docs-lock assertions in `app/test/desktop-shell.test.ts` for
the new ADR, threat model, implementation gate, and P1L roadmap links.

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
docs: add permission mode automation adr
```
