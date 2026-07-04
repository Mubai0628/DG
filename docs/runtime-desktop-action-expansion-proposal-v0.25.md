# Runtime Desktop Action Expansion Proposal v0.25

`runtime/src/desktop/action-expansion-proposal.ts` defines the v0.26 expanded
desktop action proposal schema.

This is schema only. It does not execute desktop actions.

## Supported Proposal Kinds

- `click_target`
- `type_text`
- `select_option`
- `keyboard_shortcut`
- `clipboard_write`
- `file_dialog_select`
- `drag_drop`
- `scroll`
- `wait_for_state`

All kinds are proposal-only. Readiness flags for click, type, select, keyboard
shortcut, clipboard write, file dialog, drag/drop, EventStore write, native
bridge, and App execution are always false.

## Required Summary Fields

- proposal id
- action kind
- objective summary
- observer evidence ref
- target summary
- expected visible effect summary
- risk notes
- created timestamp

## Fail-closed Rules

Validation blocks:

- missing observer evidence
- missing target
- missing expected effect
- unknown action kind
- raw screenshot / screenshot bytes
- raw OCR
- raw prompt / response / source / diff
- API key, Authorization, bearer token, password, or secret markers
- clipboard content
- file content
- desktop command / native bridge / execution fields
- absolute or unsafe file dialog paths
- stale evidence beyond the configured threshold
- unsupported target kinds
- any execution readiness claim

## Warnings

Validation warns for missing display/window/app hashes, low target confidence,
vague expected effects, embedded multi-step action text, sensitive app names,
password-like target labels, destructive target labels, and expanded action
kinds that require later risk classification.

## Non-goals

- no real click
- no real type
- no real select
- no clipboard write
- no file dialog automation
- no drag/drop execution
- no hidden capture
- no screen recording
- no broad native bridge
- no dynamic agent desktop control

## Verification

Focused tests live in:

```text
runtime/test/desktop-action-expansion-proposal.test.ts
```

Use an explicit Vitest file path:

```powershell
pnpm exec vitest run runtime/test/desktop-action-expansion-proposal.test.ts
```
