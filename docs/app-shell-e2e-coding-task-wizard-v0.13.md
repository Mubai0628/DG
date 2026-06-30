# App Shell E2E Coding Task Wizard v0.13

The End-to-End Coding Task Wizard is an App Shell preview surface for the
P0R guided flow:

1. objective summary
2. live proposal status
3. proposal import status
4. chain integration status
5. approval readiness
6. apply readiness
7. verification readiness
8. rollback readiness

It projects existing summary-only App and runtime views into one guided task
flow. The wizard does not create a new execution path.

## Scope

- Shows a guided view from objective to live proposal, model proposal import,
  and existing chain preview.
- Reuses the existing explicit live proposal generation command when the
  existing policy, request, receipt, typed confirmation, and allowed path gates
  already allow it.
- Reuses the existing model proposal import and chain integration summaries.
- Shows approval, apply, verification, and rollback readiness as summary-only
  stage status.
- Keeps apply and rollback outside this wizard.

## Non-Goals

- No auto-apply.
- No App-side unapproved apply.
- No App-side rollback.
- No EventStore write from the wizard.
- No new Tauri command.
- No raw prompt persistence.
- No raw response display.
- No reasoning_content persistence.
- No API key display.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No native bridge.
- No desktop action.

## Live Proposal Boundary

`Request Live Proposal` is only a shortcut to the existing v0.13 fixed live
proposal command. It remains disabled until the existing live proposal policy,
request builder, session receipt, typed confirmation, and allowed path checks
are ready.

The wizard does not read API keys, does not construct a new network transport,
and does not bypass the existing live proposal generation gate.

## Import And Chain Boundary

`Import Proposal to Chain` only updates React state by building the same
summary-only model proposal import and chain integration views used by the
standalone proposal surfaces.

Blocked proposal imports do not enter the chain preview. Warning proposals can
be shown with warning codes, but the wizard still does not enable apply.

## Summary-Only Output

The wizard displays:

- status
- wizard id
- orchestrator state
- completed and missing stage counts
- section counts
- blocker and warning counts
- hash prefixes
- section labels and warning/blocker codes
- next action

It does not display raw prompt, raw response, raw source, raw diff, checkpoint
preimage, raw event payload, reasoning_content, API key, Authorization header,
or token-like values.

## Relation To Runtime Orchestrator

The App wizard uses the P0R-003 runtime E2E coding task orchestrator as a pure
state projection. The orchestrator remains deterministic and summary-only. It
does not call DeepSeek, read API keys, fetch network, write files, apply
patches, rollback, write EventStore, execute Git, execute shell, or issue a
PermissionLease.

## Current Limitations

- The wizard is a preview surface, not a complete autonomous coding loop.
- Approval, approved apply, verification, rollback, summary events, and replay
  continue to live in their existing dedicated surfaces.
- Apply is not enabled by the wizard.
- Rollback is not enabled by the wizard.
- Future P0R tasks wire the remaining approved apply, verification, rollback,
  and replay UX around the existing gates.
