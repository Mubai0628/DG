# Runtime Desktop Action Capability Integration v0.23

P1B-006 integrates desktop action proposals into Capability Broker planning as
summary-only descriptors and refs. It does not execute desktop actions and does
not issue PermissionLease grants.

## Descriptors

The helper emits three fixed descriptor ids:

- `native.desktop.action.propose`
- `native.desktop.action.simulate`
- `native.desktop.action.execute`

`native.desktop.action.execute` is always:

- `mode: "DISABLED"`
- `executionPolicy: "MANUAL_ONLY"`
- `autoAllowed: false`
- `manualOnly: true`

The descriptor exists so planning and App surfaces can display the disabled
future execution lane without enabling it.

## Planning Refs

The planning result can include summary-only refs for:

- proposal
- target validation
- risk classification
- simulation
- approval draft

Refs contain ids, hashes, statuses, and `summaryOnly: true`. They do not contain
raw screenshots, raw OCR text, raw UI text, raw prompt, action args, clipboard
contents, file contents, secrets, or executable commands.

## Safety

The helper blocks:

- missing or blocked proposals
- blocked target validation
- blocked risk classification
- blocked simulation
- raw desktop/prompt/response fields
- secret-like markers
- PermissionLease issuance attempts
- EventStore/action/native bridge/command fields
- execution readiness flags set to true

All readiness flags that could execute, write, lease, or bridge remain false:

- `canIssuePermissionLease`
- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

`canEnterAppReadOnlySurface` can become true only when planning has no blockers.

## Non-goals

- no real desktop action
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no PermissionLease issuing
- no EventStore write
- no Tauri action command
- no native bridge
- no remote control
- no App execution
- no shell/Git execution
