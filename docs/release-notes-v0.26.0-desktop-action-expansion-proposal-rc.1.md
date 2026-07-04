# v0.26.0-desktop-action-expansion-proposal-rc.1

Desktop action expansion proposals, no click/type execution.

## Scope

This RC closes the v0.26 Desktop Action Expansion Proposal stage on top of the
v0.25 narrow approved desktop action lane.

It includes:

- Desktop Action Expansion Proposal ADR, roadmap, threat model, and
  implementation gate.
- Runtime expanded action proposal schema for click, type, select, clipboard,
  file dialog, drag/drop, scroll, and wait proposals.
- Runtime clipboard and file-dialog proposal contracts.
- Runtime target freshness checks.
- Runtime desktop action sequence simulation.
- Runtime expanded desktop action risk classifier.
- App Shell read-only Expanded Desktop Action Proposal surface.
- Runtime desktop action expansion redaction/privacy audit.
- Summary-only smoke fixture for desktop action expansion proposals.

## Current Working Flow

Desktop Observer remains metadata-only.

Approved desktop action execution remains limited to the narrow v0.25
focus/raise/activate observed-window lane.

Expanded desktop action types are proposal-only.

Click/type/select/clipboard/file dialog/drag-drop are not executed.

Risk classification, freshness checks, sequence simulation, and redaction audit are summary-only.

The App Shell can preview pasted expanded desktop action proposal JSON and show
safe summaries for target freshness, risk, simulation, and no_compress_zone
refs. The App Shell cannot execute those actions.

## Explicit Non-goals

- no real click
- no real type
- no real select
- no clipboard write
- no file dialog automation
- no drag/drop execution
- no screen recording
- no hidden capture
- no remote control
- no broad native bridge
- no autonomous desktop agent
- no App-side expansion action execution
- no EventStore write from expanded proposals
- no replay re-execution
- no Git/shell execution

## Safety

- proposal-first
- target freshness
- screen mismatch checks
- risk classification
- simulation only
- redaction/privacy audit
- App read-only
- summary-only context/audit refs
- no raw screenshot/OCR display
- no clipboard content display
- no file dialog raw path display
- no native bridge action
- v0.25 narrow approved desktop action lane preserved
- v0.1 web_table_to_csv flow preserved

## Checks

The stage-end RC gate includes:

- scoped P1D runtime and App checks
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`
- manual GUI QA

## Release Docs

- Manual QA:
  https://github.com/Mubai0628/DG/blob/v0.26.0-desktop-action-expansion-proposal-rc.1/docs/desktop-action-expansion-proposal-manual-qa.md
- RC checklist:
  https://github.com/Mubai0628/DG/blob/v0.26.0-desktop-action-expansion-proposal-rc.1/docs/desktop-action-expansion-proposal-rc-checklist.md
- Runtime redaction audit:
  https://github.com/Mubai0628/DG/blob/v0.26.0-desktop-action-expansion-proposal-rc.1/docs/runtime-desktop-action-expansion-redaction-audit-v0.25.md
- App expanded proposal surface:
  https://github.com/Mubai0628/DG/blob/v0.26.0-desktop-action-expansion-proposal-rc.1/docs/app-shell-expanded-desktop-action-proposal-v0.25.md
