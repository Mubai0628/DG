# P1D-001 Desktop Action Expansion Proposal Gate Plan

## Scope

P1D-001 is docs/tests only. It creates the ADR, threat model, and implementation
gate for v0.26 desktop action expansion proposals.

## Non-goals

- No runtime schema implementation in P1D-001.
- No App UI implementation in P1D-001.
- No real click.
- No real type.
- No real select.
- No clipboard write.
- No file dialog automation.
- No drag/drop execution.
- No screen recording or hidden capture.
- No broad native bridge.
- No remote control.
- No dynamic agent desktop control.
- No autonomous desktop agent.

## Required Decisions

- v0.26 expands desktop action proposals, not execution.
- Desktop actions remain proposal-first.
- Expanded action proposals must include observer evidence, target metadata,
  action kind, risk summary, expected visible effect summary, stale evidence
  guard, and no raw screenshot/OCR by default.
- App Shell remains read-only for expanded action proposals.
- The v0.25 focus/raise/activate lane remains the only approved desktop action
  execution lane.

## Threat Model Coverage

- Clickjacking.
- UI spoofing.
- Stale screenshot/window metadata.
- Wrong display/window/app target.
- Destructive UI action.
- Credential/password fields.
- Payment/financial UI.
- System settings and security prompts.
- Clipboard leakage.
- File dialog unsafe path.
- Hidden background action.
- Remote control.
- Screen recording.
- Native bridge expansion.
- Dynamic agent desktop control.
- Privacy leakage from raw screenshot/OCR.
- Action sequence ambiguity.

## Implementation Gate

Before later P1D implementation work can land, tests must prove:

- Expanded proposal schemas are summary-only and execution-disabled.
- Target metadata and freshness checks fail closed for stale or mismatched
  targets.
- Sensitive/destructive UI risk classification escalates or blocks risky
  proposals.
- Clipboard and file dialog proposals do not store raw content or paths.
- Sequence simulation never executes desktop actions.
- App UI remains read-only and disabled for expanded actions.
- Redaction/privacy audit blocks raw screenshot, OCR, clipboard content, API
  keys, secrets, and execution fields.
- CI and boundary checks keep fetch, native bridge broad action, clipboard
  write, file dialog automation, and arbitrary desktop action blocked.

## Scoped Command Policy

P1D-001 runs docs/app focused checks:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Local Commit Workflow

Create a local commit only:

```text
docs: add desktop action expansion proposal adr
```

Do not push, tag, or create a GitHub Release in P1D-001.

## Completion Report

Report changed files, scoped checks, docs-only invariants, local commit hash,
and the next task: `DW-P1D-002 Desktop Action Expansion Proposal Schema`.
