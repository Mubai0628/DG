# App Shell Desktop Action Proposal Surface v0.23

P1B-007 adds a read-only App Shell surface for pasted
`desktop_action_proposal` JSON drafts. The App calls the runtime proposal
schema, target metadata validation, risk classifier, simulation, and capability
planning helpers to build a summary-only preview.

The App Shell does not execute desktop actions. It does not click, type, use
clipboard, open file dialogs, call a native bridge, write EventStore, issue a
PermissionLease, or persist raw desktop evidence.

## UI

The panel is titled `Desktop Action Proposal` with the badge
`Proposal only / no desktop action`.

Controls:

- textarea for summary-only proposal JSON
- `Preview Desktop Action Proposal`
- `Clear Desktop Action Proposal`
- disabled placeholders:
  - `Execute Desktop Action (disabled)`
  - `Click Target (disabled)`
  - `Type Text (disabled)`
  - `Use Clipboard (disabled)`

The Preview button only updates React state. It does not invoke Tauri, call a
desktop runner, write EventStore, or use a native bridge.

## Displayed Summary

The panel shows only:

- status
- proposal id
- action count
- target summary
- risk summary
- simulation summary
- capability planning summary
- blocker/warning counts
- readiness flags
- hash prefixes
- summary refs for context and agent dossier display
- finding codes
- next action

It does not display raw screenshot, raw OCR text, raw UI text, raw prompt, raw
source, raw diff, clipboard contents, file contents, API keys, or action args.

## Blocking

The surface blocks drafts containing:

- raw screenshot or OCR fields
- API key or secret markers
- raw prompt/source/diff
- `executeNow`, `clickNow`, `typeNow`
- clipboard contents
- raw text secrets
- execution readiness flags set to true

## Non-goals

- no desktop action
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no Tauri action command
- no native bridge
- no remote control
- no EventStore write
- no App approval execution
- no shell/Git execution
