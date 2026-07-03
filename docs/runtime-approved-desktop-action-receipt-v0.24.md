# Runtime Approved Desktop Action Receipt v0.24

## Scope

`runtime/src/desktop-action/approved-desktop-action-receipt.ts` adds the P1C
approval receipt contract for the v0.25 approved desktop action execution MVP.
It is a deterministic runtime validator and summarizer only. It does not execute
desktop actions.

The receipt is intentionally narrow. It can approve metadata for only these
observed-window actions:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

The receipt is not a broad `PermissionLease`, not a native bridge capability,
and not an App execution grant.

## Required Inputs

A valid receipt scope includes summary-only refs:

- `receiptId`
- `actionKind`
- `observerEvidenceId`
- `desktopActionProposalId`
- `targetWindowRef`
- `targetAppRef`
- `targetDisplayRef`
- `riskClassificationId`
- `allowedActionKinds`
- `expiresAt`
- `typedConfirmation`
- `receiptHash`

The receipt may also validate summary-only evidence freshness metadata such as
`observerEvidenceObservedAt`. It does not store screenshots, OCR text, desktop
capture bytes, raw prompts, raw source, raw diff, or API keys.

## Typed Confirmation

Typed confirmation must match exactly:

- `FOCUS OBSERVED WINDOW`
- `RAISE OBSERVED WINDOW`
- `ACTIVATE OBSERVED WINDOW`

Wrong casing, shortened confirmations, or unrelated action phrases fail closed.

## Fail-Closed Rules

The validator blocks:

- unsupported action kinds
- click, type, select, drag/drop, clipboard, and file-dialog action attempts
- missing observer evidence id
- missing desktop action proposal id
- missing target window or app ref
- missing risk classification id
- stale or invalid observer evidence timestamps
- expired receipts
- typed confirmation mismatch
- sensitive targets that were not explicitly blocked upstream
- raw screenshot, OCR, prompt, response, source, diff, CSV, DOM, or clipboard
  fields
- API key, bearer, authorization, private key, or password markers
- readiness flags that attempt broad desktop action, native bridge, Git, shell,
  EventStore, or App execution

## Readiness

`canEnterApprovedDesktopActionCommand` may be true only for a valid receipt. It
means the receipt metadata is suitable for a future fixed command boundary.

All execution flags remain false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canSelect`
- `canDragDrop`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `canExecuteGit`
- `canExecuteShell`
- `appCanExecute`

Receipt readiness does not mean the App can execute a desktop action.

## Relation To P1C

This document implements the P1C-002 receipt layer after the P1C-001 ADR and
implementation gate. Later P1C tasks may add a fixed command boundary, platform
adapter, summary event projection, replay surface, and smoke tests.

Those later tasks must continue to consume summary-only receipt metadata and
must keep arbitrary desktop action execution blocked.

## Non-Goals

- no desktop action command execution
- no App execution
- no arbitrary click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no raw screenshot or OCR persistence
- no broad native bridge
- no dynamic agent desktop control
- no Git or shell execution
- no EventStore write
- no desktop action telemetry write
