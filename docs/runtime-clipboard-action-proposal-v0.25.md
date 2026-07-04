# Runtime Clipboard Action Proposal v0.25

`runtime/src/desktop/clipboard-action-proposal.ts` defines clipboard action
proposal metadata without clipboard write, paste, clear, or read execution.

## Supported Proposal Kinds

- `clipboard_write`
- `clipboard_clear`
- `clipboard_paste_request`

All kinds are proposal-only.

## Allowed Summary Fields

- content length estimate
- content hash prefix
- content category
- redaction status
- user-visible summary

Raw clipboard values are never accepted or returned.

## Blocked Inputs

Validation blocks:

- raw clipboard text
- clipboard content values
- password markers
- token markers
- API key markers
- copied secret markers
- file content
- command content
- `pasteNow`
- `writeNow`
- `clearNow`
- any readiness flag that claims clipboard execution

## Readiness

All execution readiness flags are always false:

- `canWriteClipboard`
- `canPasteClipboard`
- `canClearClipboard`
- `canReadClipboard`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-goals

- no clipboard write
- no clipboard paste
- no clipboard clear
- no clipboard read
- no App execution
- no Tauri command
- no EventStore write
- no native bridge

## Verification

Focused tests live in:

```text
runtime/test/clipboard-action-proposal.test.ts
```

Use explicit Vitest file paths:

```powershell
pnpm exec vitest run runtime/test/clipboard-action-proposal.test.ts runtime/test/desktop-action-expansion-proposal.test.ts
```
