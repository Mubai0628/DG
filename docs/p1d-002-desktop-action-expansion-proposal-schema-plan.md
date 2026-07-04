# P1D-002 Desktop Action Expansion Proposal Schema Plan

## Scope

P1D-002 implements the runtime schema for expanded desktop action proposals.
It does not execute any desktop action.

## Non-goals

- No real click.
- No real type.
- No real select.
- No clipboard write.
- No file dialog automation.
- No drag/drop execution.
- No App-side execution.
- No Tauri command.
- No EventStore write.
- No native bridge.
- No dynamic agent desktop control.

## Schema Direction

Add `runtime/src/desktop/action-expansion-proposal.ts` or the equivalent
consistent desktop module path.

The schema must support proposal-only action kinds:

- `click_target`
- `type_text`
- `select_option`
- `keyboard_shortcut`
- `clipboard_write`
- `file_dialog_select`
- `drag_drop`
- `scroll`
- `wait_for_state`

Each proposal must require observer evidence, target summary, expected visible
effect, risk notes, stale evidence guard, and created timestamp.

## Forbidden Fields

Block raw screenshot, screenshot bytes, raw OCR text, raw prompt, raw response,
raw source, raw diff, API key, Authorization, bearer token, password, secret,
clipboard content, file content, desktop command, native bridge, click/type now
fields, execute now fields, EventStore write, shell command, and Git command.

## Validation Expectations

- Missing observer evidence blocks.
- Missing target blocks.
- Missing expected effect blocks.
- Unknown action kind blocks.
- Raw screenshot/OCR blocks.
- API key or secret marker blocks.
- Execution fields block.
- Clipboard content blocks.
- Absolute path in file dialog proposal blocks.
- Stale evidence blocks or warns according to policy.
- Any executable readiness claim blocks.
- Unsupported target kind blocks.

## Tests

Use explicit Vitest file paths:

```powershell
pnpm exec vitest run runtime/test/desktop-action-expansion-proposal.test.ts
```

Tests must cover safe proposal kinds, forbidden raw fields, secret markers,
stale evidence policy, all execution readiness flags false, and summary-only
output.

## Completion Report

Report changed files, focused runtime tests, App/docs tests, security checks,
local commit hash, and the next task: `DW-P1D-003 Clipboard Proposal Schema, no
write`.
