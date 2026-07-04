# Expanded Desktop Action Privacy Audit v0.26

P1E-007 extends the desktop action privacy audit so approved expanded action
events and replay projections remain summary-only.

## What It Blocks

The audit blocks raw or unsafe fields before an expanded desktop action summary
event can enter replay projection:

- raw screenshot fields or markers
- raw OCR fields or markers
- raw target text fields or markers
- clipboard content
- raw window content
- raw prompt/source/diff material
- API key or authorization markers
- execution flags attempting to enable replay, desktop execution, native bridge,
  or App execution

## What It Allows

Only safe summaries are allowed:

- refs such as target, window, app, display, receipt, and contract ids
- warning codes
- status
- hashes and hash prefixes
- booleans proving raw material is absent

## Non-Goals

- no desktop action execution
- no replay execution
- no EventStore write
- no Tauri command
- no native bridge
- no Git or shell execution
- no raw screenshot/OCR/text persistence
- no API key persistence

The audit is shared by approved desktop action replay and approved expanded
desktop action replay. It is a blocking privacy gate, not an execution helper.
