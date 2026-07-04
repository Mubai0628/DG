# App Shell Expanded Desktop Action Proposal v0.25

This document locks the P1D-008 App Shell expanded desktop action proposal surface.

The surface is read-only. It models future click, type, select, clipboard, and file-dialog actions as proposal summaries. The App Shell cannot execute these actions.

## App Files

- `app/src/expanded-desktop-action-proposal-view.ts`
- `app/src/App.tsx`

## UI Contract

Panel title:

- `Expanded Desktop Action Proposal`

Badge:

- `Proposal only / no desktop action`

Required copy:

- `Models future click, type, select, clipboard, and file-dialog actions as read-only proposals. The App Shell cannot execute these actions.`

Disabled controls:

- `Execute Click (disabled)`
- `Type Text (disabled)`
- `Write Clipboard (disabled)`
- `Open File Dialog (disabled)`

The Preview button only updates React state. The Clear button only clears React state.

## Summary-Only Preview

The view shows:

- action kind
- target summary
- freshness summary
- risk summary
- simulation summary
- warning and blocker counts
- hash prefix
- `no_compress_zone` proposal ref
- finding codes

It does not show raw screenshot, raw OCR, raw prompt, raw response, raw source, raw diff, clipboard content, raw file paths, API key values, or command text.

## Integrations

The App view summarizes the existing runtime proposal/freshness/risk/simulation chain:

- `validateDesktopActionExpansionProposal`
- `validateDesktopTargetFreshness`
- `classifyDesktopActionExpansionRisk`
- `simulateDesktopActionSequence`

It may show a summary-only context assembly ref in `no_compress_zone` and audit finding counts. It does not write events.

## Non-Goals

- No desktop action execution
- No click/type/select execution
- No clipboard write
- No file dialog automation
- No Tauri command
- No EventStore write
- No PermissionLease issuance
- No native bridge
- No Git or shell execution
