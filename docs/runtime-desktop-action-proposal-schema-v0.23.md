# Runtime Desktop Action Proposal Schema v0.23

P1B-002 adds a pure runtime schema, validator, normalizer, and summarizer for
Desktop Action Proposals. It models future desktop actions only. It does not
click, type, select, drag, drop, use clipboard, open file dialogs, call a native
bridge, write EventStore, or execute any desktop action.

## Proposal-only Action Kinds

- `focus_window`
- `click_target`
- `type_text`
- `press_key`
- `select_menu`
- `copy_selection`
- `paste_text`
- `open_file_dialog`
- `choose_file`
- `drag_drop`
- `scroll`

These values are schema values only. Later stages classify and simulate them,
but this module never executes them.

## Validation

The validator blocks missing title/objective/operations, missing observer
evidence refs, unknown action kinds, duplicate operation ids, missing target
evidence refs, raw screenshots, screenshot bytes, image data, raw OCR, raw DOM,
raw prompt, raw response, reasoning content, API key markers, Authorization,
bearer token markers, password/secret markers, clipboard content, file content,
raw source, raw diff, command fields, native bridge fields, and execution-now
fields such as `desktopActionExecute`, `clickNow`, `typeNow`, and `executeNow`.

It also blocks absolute or unsafe file paths in file-dialog proposals and blocks
type/paste actions against password/API key targets.

## Warnings

Warnings cover stale evidence, high-risk action kinds, text input proposals,
file dialog proposals, clipboard proposals, cross-app target warning codes,
sensitive targets, missing expected visible state changes, missing risk notes,
and many-operation proposals.

## Readiness

`canEnterRiskClassification` can become true only when the proposal is not
blocked. All execution readiness flags remain false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Fixtures

Focused tests use summary-only fixtures under
`runtime/test/fixtures/desktop-action-proposals/`. Fake secret fixtures use
obvious fake values only.

## Non-goals

- No desktop action execution.
- No click/type/select execution.
- No clipboard write.
- No file dialog automation.
- No App execution.
- No Tauri command.
- No EventStore write.
- No Git/shell execution.
- No native bridge.
