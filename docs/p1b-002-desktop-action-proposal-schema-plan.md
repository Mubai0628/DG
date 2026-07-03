# P1B-002 Desktop Action Proposal Schema Plan

## Scope

Implement a pure runtime schema, validator, normalizer, and summarizer for
Desktop Action Proposals. The schema models future actions only; it does not
execute them.

## Non-goals

- No desktop action execution.
- No click/type/select execution.
- No clipboard write.
- No file dialog automation.
- No Tauri action command.
- No EventStore write.
- No native bridge broad action.
- No shell/Git expansion.
- No App UI.

## Planned Runtime Module

- `runtime/src/desktop-action/action-proposal-schema.ts`
- `runtime/src/desktop-action/index.ts`

The module will define proposal, operation, target ref, observer evidence ref,
finding, validation result, readiness, parse, validate, normalize, and summarize
types/functions.

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

These values are schema values only. They must not invoke OS actions.

## Required Guards

- Block missing title, objective summary, observer evidence refs, operations, or
  target evidence refs.
- Block duplicate operation ids.
- Block unknown action kinds.
- Block raw screenshot, screenshot bytes, image data, raw OCR, raw DOM, raw
  prompt, raw response, reasoning content, API key, Authorization, bearer token,
  password, secret, clipboard content, file content, raw source, raw diff,
  command fields, native bridge fields, and execution-now fields.
- Block absolute file paths in file dialog proposals.
- Block password/API key target with type or paste action.
- Keep all execution readiness flags false.

## Expected Tests

- Safe proposal parses.
- JSON string parses.
- Missing ids are generated deterministically.
- Raw screenshot is blocked.
- Secret marker is blocked.
- `executeNow`, `clickNow`, and `typeNow` are blocked.
- Missing observer evidence is blocked.
- Sensitive target type warning/block behavior is covered.
- Text input and file dialog warnings are covered.
- Output remains summary-only.

## Completion

P1B-002 is complete only after focused runtime tests, App docs-lock tests,
boundary checks, secret checks, and whitespace checks pass with a local commit.
