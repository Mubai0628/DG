# Runtime Safe Click Contract v0.26

## Scope

`runtime/src/desktop-action/safe-click-contract.ts` adds the P1E-003 runtime
contract for a single safe click on an observed target. It consumes summary-only
inputs from:

- approved expanded desktop action receipt
- observation summary
- target summary
- proposal summary
- risk classification
- sequence simulation
- freshness policy

The helper produces a summary-only contract for a future fixed Tauri command
boundary. It does not call Tauri and does not execute a click.

## Required Action

The only supported action kind is:

- `click_observed_safe_target`

The receipt must be ready, must have accepted typed confirmation, and must expose
`canEnterSafeClickContract`.

## Validation

The contract blocks:

- missing or non-ready receipt
- wrong action kind
- target not present in the observation summary
- window, app, display, target, proposal, risk, simulation, or target-hash
  mismatch
- stale observation
- missing bounds hash
- target not marked safe
- password, API-key, payment, delete, submit, security prompt, sensitive, or
  destructive targets
- high or destructive risk classification
- blocked or unsafe simulation
- more than one step
- click count other than one
- double click
- click point outside the target bounds
- raw screenshot, OCR, target text, prompt, response, source, diff, DOM, CSV, or
  clipboard markers
- raw coordinate fields
- API key, bearer, authorization, private key, or password markers
- command, Git, shell, native bridge, EventStore, clipboard, file dialog,
  drag/drop, or broad execution fields

## Output

The output includes:

- `contractId`
- `actionKind`
- `targetRef`
- `windowRef`
- `appRef`
- `displayRef`
- `boundsHash`
- `freshnessStatus`
- `riskStatus`
- `simulationStatus`
- `readiness.canExecuteViaFixedTauriCommand`

All broad execution readiness flags remain false:

- `canCallTauriCommand`
- `canExecuteDesktopAction`
- `canClick`
- `canDoubleClick`
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

This contract follows the P1E-002 approved expanded action receipt. Later P1E
tasks may add safe type contracts, fixed Tauri command boundaries, App surfaces,
summary events, replay surfaces, smoke tests, and RC polish.

## Non-goals

- no Tauri command
- no real click
- no double click
- no type/select/drag/drop
- no clipboard write
- no file dialog automation
- no EventStore write
- no raw screenshot or OCR persistence
- no broad native bridge
- no dynamic agent desktop control
- no Git or shell execution
