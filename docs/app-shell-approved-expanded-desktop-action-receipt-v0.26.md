# App Shell Approved Expanded Desktop Action Receipt v0.26

## Scope

The App Shell P1E-002 surface previews an approval receipt for future approved
expanded click/type lanes. It consumes the existing Expanded Desktop Action
Proposal summary and builds a receipt preview in React state only.

The panel title is `Approved Expanded Desktop Action Receipt` and the badge is
`Receipt preview / no desktop action`.

## App Behavior

- The user previews an expanded desktop action proposal first.
- Only `click_target` and `type_text` proposals can map into receipt preview.
- The user may type an exact confirmation:
  - `CLICK OBSERVED TARGET`
  - `TYPE INTO OBSERVED FIELD`
- `Build Expanded Action Receipt` updates React state only.
- `Clear Expanded Action Receipt` clears React state only.
- `Execute Approved Click (disabled)` remains disabled.
- `Execute Approved Type (disabled)` remains disabled.

The panel displays status, receipt id, proposal id, action kind, target refs,
risk/simulation refs, blocker/warning counts, hash prefixes, readiness flags,
safe finding codes, and next action.

## Boundaries

- No Tauri invoke.
- No desktop action execution.
- No click or type execution.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No EventStore write.
- No broad native bridge.
- No raw screenshot, raw OCR, raw target text, raw prompt, raw response, raw
  source, raw diff, or API key display.
- No Git or shell execution.

Receipt preview readiness does not enable App execution. It only indicates that
summary-only metadata may enter a later safe click/type contract task.

## Relation To P1E

This App surface pairs with
`runtime-approved-expanded-desktop-action-receipt-v0.26.md`. Later P1E tasks may
introduce the safe click/type execution contract and fixed command boundaries,
but this task deliberately does not.

## Non-goals

- no App execution
- no Tauri command implementation
- no real click
- no real type
- no select action
- no clipboard write
- no file dialog automation
- no drag/drop
- no native bridge expansion
- no EventStore write
- no PermissionLease issuance
