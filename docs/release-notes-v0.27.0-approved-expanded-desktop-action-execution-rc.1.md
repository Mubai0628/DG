# v0.27.0-approved-expanded-desktop-action-execution-rc.1

Approved expanded desktop actions, narrow click/type only.

## Scope

This RC closes the v0.27 Approved Expanded Desktop Action Execution stage on
top of the v0.26 desktop action expansion proposal pipeline.

It includes:

- P1E approved expanded desktop action roadmap and execution plan.
- Approved expanded desktop action ADR, threat model, and implementation gate.
- Runtime approved expanded action receipt with typed confirmation.
- Runtime safe click contract and safe type contract.
- Fixed Tauri command boundary for approved expanded desktop actions.
- App Shell Approved Expanded Desktop Action Receipt surface.
- App Shell Approved Expanded Desktop Action surface.
- Summary-only approved expanded action events and replay projection.
- Expanded desktop action privacy audit with raw text and raw target text
  blockers.
- Smoke and hardening coverage for safe click/type lanes.

## Current Working Flow

Desktop Observer remains metadata-only.

Desktop Action Proposal remains proposal-first.

Approved desktop action execution supports narrow focus/raise/activate from
v0.25.

Approved expanded desktop action execution supports only single safe click and
single safe type under explicit approval.

Clipboard write, file dialog automation, drag/drop, multi-step automation, and
hidden/background action remain disabled.

Events and replay are summary-only and do not re-execute actions.

The App Shell can preview approved expanded desktop action receipts and execute
only the fixed approved click/type command path after receipt, safe contract,
typed confirmation, freshness, target, and platform checks pass. Unsupported
platforms return safe summary results.

## Explicit Non-goals

- no arbitrary click/type
- no clipboard write
- no file dialog automation
- no drag/drop
- no screen recording
- no hidden capture
- no remote control
- no broad native bridge
- no autonomous desktop agent
- no dynamic agent desktop control
- no replay re-execution
- no Git/shell execution

## Safety

- observer evidence
- proposal-first
- target validation
- freshness / mismatch checks
- risk classification
- simulation
- approval receipt
- typed confirmation
- fixed Tauri command
- summary-only event
- privacy audit
- unsupported platform safe result
- no raw screenshot/OCR display
- no raw text or raw target text display
- no API key display
- v0.1 web_table_to_csv flow preserved

## Checks

The stage-end RC gate includes:

- scoped P1E App checks
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`
- manual GUI QA

## Release Docs

- Manual QA:
  https://github.com/Mubai0628/DG/blob/v0.27.0-approved-expanded-desktop-action-execution-rc.1/docs/approved-expanded-desktop-action-manual-qa.md
- RC checklist:
  https://github.com/Mubai0628/DG/blob/v0.27.0-approved-expanded-desktop-action-execution-rc.1/docs/approved-expanded-desktop-action-rc-checklist.md
- Smoke and hardening path:
  https://github.com/Mubai0628/DG/blob/v0.27.0-approved-expanded-desktop-action-execution-rc.1/docs/approved-expanded-desktop-action-smoke-v0.26.md
- Events and replay:
  https://github.com/Mubai0628/DG/blob/v0.27.0-approved-expanded-desktop-action-execution-rc.1/docs/expanded-desktop-action-events-replay-v0.26.md
