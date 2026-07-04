# ADR 0011: Desktop Action Expansion Proposal Gate

## Status

Proposed / Accepted for P1D design gate.

## Context

P1A added Desktop Observer metadata-only evidence. P1B added desktop action
proposals without execution. P1C added the first narrow approved desktop action
execution lane, limited to `focus_observed_window`, `raise_observed_window`,
and `activate_observed_window`.

The next step is to model richer desktop action categories such as click, type,
select, clipboard, file dialog, drag/drop, scroll, and wait-for-state. These
actions can be useful, but they can also click spoofed UI, type into the wrong
field, leak clipboard or file paths, operate on stale windows, or cross into a
broad native bridge. v0.26 therefore expands proposals only.

## Decision

v0.26 only expands desktop action proposals, not execution.

Desktop actions must remain proposal-first. The App remains read-only for
expanded desktop action proposals. v0.25 focus/raise/activate remains the only
narrow approved execution lane.

No click/type/select/clipboard/file dialog execution is enabled in this stage.

Every expanded action proposal must include:

- observer evidence ref
- target metadata
- action kind
- risk summary
- expected visible effect summary
- stale evidence guard
- no raw screenshot / no raw OCR by default

Supported proposal-only action kinds include:

- `click_target`
- `type_text`
- `select_option`
- `keyboard_shortcut`
- `clipboard_write`
- `file_dialog_select`
- `drag_drop`
- `scroll`
- `wait_for_state`

## Non-goals

- No real click.
- No real type.
- No real select.
- No clipboard write.
- No file dialog automation.
- No drag/drop execution.
- No screen recording.
- No hidden capture.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No App-side arbitrary desktop action.
- No replay re-execution.

## Required Gates

Before any future execution expansion, tests must prove:

- Proposal schema safety.
- Target metadata safety.
- Screen freshness safety.
- Sensitive UI risk safety.
- Clipboard safety.
- File dialog safety.
- Sequence simulation safety.
- App UI disabled/read-only safety.
- Redaction/privacy safety.
- CI/boundary safety.

## Consequences

P1D makes future desktop action expansion concrete and auditable without
changing the execution boundary. This slows the path to click/type automation,
but it preserves the v0.25 safety model while adding the validation and
simulation structures needed for future narrower MVPs.
