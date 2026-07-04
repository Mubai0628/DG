# Runtime Safe Type Contract v0.26

## Scope

`runtime/src/desktop-action/safe-type-contract.ts` adds the P1E-004 runtime
contract for typing short text into an observed safe text field. It consumes
summary-only inputs from:

- approved expanded desktop action receipt
- observation summary
- target summary
- text summary
- proposal summary
- risk classification
- sequence simulation
- freshness policy

The helper produces a summary-only contract for a future fixed Tauri command
boundary. It does not call Tauri and does not type text.

## Required Action

The only supported action kind is:

- `type_into_observed_text_field`

The receipt must be ready, must have accepted typed confirmation, and must expose
`canEnterSafeTypeContract`.

## Text Policy

The contract uses text hash and length summaries. Raw text is not included in
the output.

The validator blocks:

- missing text hash
- empty text
- text length above `maxTextLength`
- multiline text unless explicitly allowed
- control characters
- API key, bearer, authorization, token, private key, or password markers
- password-like text
- shell-command-looking text when the target is risky

## Target Policy

The target must be an observed safe text field. The validator blocks:

- password field
- API key field
- payment field
- hidden field
- destructive confirmation field
- system security prompt
- stale observation
- target not present in the observation summary
- target/proposal/receipt/risk/simulation mismatch

## Output

The output includes:

- `contractId`
- `actionKind`
- `targetRef`
- `windowRef`
- `appRef`
- `displayRef`
- `textHash`
- `textLength`
- `freshnessStatus`
- `riskStatus`
- `simulationStatus`
- `readiness.canExecuteViaFixedTauriCommand`

All broad execution readiness flags remain false:

- `canCallTauriCommand`
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

This contract follows the P1E-002 approved expanded action receipt and pairs
with the P1E-003 safe click contract. Later P1E tasks may add fixed Tauri
command boundaries, App surfaces, summary events, replay surfaces, smoke tests,
and RC polish.

## Non-goals

- no Tauri command
- no real type
- no raw text output
- no real click
- no select/drag/drop
- no clipboard write
- no file dialog automation
- no EventStore write
- no raw screenshot or OCR persistence
- no broad native bridge
- no dynamic agent desktop control
- no Git or shell execution
