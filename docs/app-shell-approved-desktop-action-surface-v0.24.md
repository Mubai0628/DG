# App Shell Approved Desktop Action Surface v0.24

This document locks the P1C-005 App Shell surface for the v0.25 Approved
Desktop Action Execution MVP.

## Scope

The App Shell can display a human-approved desktop action panel for the narrow
P1C action lane:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

The surface consumes an existing Desktop Action Proposal preview, builds a
summary-only approval receipt, requires exact typed confirmation, and calls only
the fixed `executeApprovedDesktopAction` wrapper.

## App Behavior

- Panel title: `Approved Desktop Action`
- Badge: `Human approved / narrow desktop action`
- Copy: `Executes only fixed, approved, low-risk desktop actions such as focusing an observed window. No click, type, clipboard, file dialog, or broad native bridge is enabled.`
- The user can build an approval receipt from the current valid proposal.
- The user must type the exact confirmation for the mapped action kind.
- The execute button is enabled only when:
  - Desktop Action Proposal preview is valid and has no warnings.
  - The proposal maps to a P1C allowlisted observed-window action.
  - The approval receipt is ready.
  - The typed confirmation is exact.
  - The fixed command request is summary-only.
- The fixed command result is stored only in React state.

## Boundaries

- No generic Tauri invoke is exposed.
- No generic native bridge is enabled.
- No click, type, select, drag, drop, clipboard, or file dialog action is
  enabled.
- No raw screenshot, raw OCR, raw UI text, raw source, raw prompt, raw response,
  or API key is displayed.
- No EventStore write happens in P1C-005.
- No replay event is written in P1C-005.
- No Git or shell execution is enabled.
- Unsupported platform results remain summary-only and do not write events.

## Relation To Earlier P1C Tasks

- P1C-002 defines the approval receipt and typed confirmation contract.
- P1C-003 defines the runtime execution contract and summary-only event preview.
- P1C-004 exposes the fixed Tauri command boundary.
- P1C-005 adds the App Shell surface that calls the fixed wrapper only.
- P1C-006 will add summary event write and replay projection.

## Non-goals

- No broad desktop automation.
- No autonomous desktop agent.
- No App-side click/type/clipboard/file dialog capability.
- No generic command dispatch.
- No native bridge expansion.
- No EventStore write.
- No apply/rollback behavior.
