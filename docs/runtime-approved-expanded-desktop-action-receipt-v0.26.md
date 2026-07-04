# Runtime Approved Expanded Desktop Action Receipt v0.26

## Scope

`runtime/src/desktop-action/approved-expanded-action-receipt.ts` adds the
P1E-002 receipt contract for approved expanded desktop action execution. It is a
deterministic runtime validator and summarizer only.

Allowed action kinds are intentionally narrow:

- `click_observed_safe_target`
- `type_into_observed_text_field`

The helper does not execute desktop actions, invoke Tauri, write clipboard,
automate file dialogs, drag/drop, write EventStore, or open a native bridge.

## Required Scope

A receipt requires summary-only refs:

- `receiptId`
- `actionKind`
- `observationId`
- `targetId`
- `proposalId`
- `riskClassificationId`
- `simulationId`
- `windowRef`
- `appRef`
- `displayRef`
- `targetHash`
- `allowedActionKinds`
- `expiresAt`
- `typedConfirmation`
- `maxClicks`

Type receipts may include `maxTextLength` and a numeric `textLength` summary.
They must not include raw typed text.

## Typed Confirmation

Typed confirmation must match exactly:

- `CLICK OBSERVED TARGET`
- `TYPE INTO OBSERVED FIELD`

The receipt blocks shortened, wrong-case, unrelated, or stale confirmations.

## Fail-Closed Rules

The validator blocks:

- missing receipt scope
- unsupported action kind
- action kind not present in `allowedActionKinds`
- expired receipt
- wrong typed confirmation
- stale observation evidence
- target, window, app, display, or target-hash mismatch
- `maxClicks` other than `1`
- type text length above `maxTextLength`
- sensitive, destructive, password-like, API-key-like, payment, or security
  prompt targets
- clipboard, file dialog, drag/drop, arbitrary coordinate, command, Git, shell,
  native bridge, EventStore, or broad execution fields
- raw screenshot, OCR, target text, prompt, response, source, diff, DOM, CSV, or
  clipboard markers
- API key, bearer, authorization, private key, or password markers

Unsafe input is never repaired into a usable receipt.

## Readiness

`canEnterSafeClickContract` or `canEnterSafeTypeContract` may be true only for a
valid receipt. Those flags mean the summary can feed a future narrow safe
click/type contract.

All execution readiness flags remain false:

- `canEnterFixedTauriCommand`
- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canSelect`
- `canDragDrop`
- `canWriteClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `canExecuteGit`
- `canExecuteShell`
- `appCanExecute`

## Relation To P1E

This document implements P1E-002 after the P1E-001 ADR and implementation gate.
Later P1E tasks may add a safe click/type contract, fixed Tauri command
boundary, App surface, summary events, replay surface, smoke tests, and RC
polish.

## Non-goals

- no desktop action execution
- no App execution
- no arbitrary click/type/select
- no clipboard write
- no file dialog automation
- no drag/drop
- no hidden/background action
- no raw screenshot or OCR persistence
- no broad native bridge
- no dynamic agent desktop control
- no Git or shell execution
- no EventStore write
