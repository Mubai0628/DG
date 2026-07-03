# App Shell Desktop Action Replay v0.24

P1C-006 adds an App Shell replay surface for approved desktop action summary
events.

## Scope

The App surface reads the fixed approved desktop action command result held in
React state and projects it through the runtime summary event and replay helper.
It does not write events and does not re-execute any desktop action.

The panel shows:

- action status
- action kind
- target refs
- timestamp
- warning codes
- privacy audit status
- replay hash prefix

## Boundaries

- No replay re-execution.
- No EventStore write.
- No generic Tauri invoke.
- No native bridge.
- No click, type, select, drag, drop, clipboard, or file dialog action.
- No raw screenshot display.
- No OCR text display.
- No raw window content.
- No API key.
- No raw prompt, raw source, or raw diff.

## Relation To P1C

- P1C-004 adds the fixed Tauri command.
- P1C-005 adds the App approved action surface.
- P1C-006 adds summary-only events, replay projection, and privacy audit.

## Non-goals

- No App execution expansion.
- No broad desktop automation.
- No EventStore writer.
- No desktop replay engine.
- No native bridge expansion.
