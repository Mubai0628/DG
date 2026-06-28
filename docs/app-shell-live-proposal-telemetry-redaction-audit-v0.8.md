# App Shell Live Proposal Telemetry / Redaction Audit v0.8

Status: P0M-007 App disabled-only audit surface.

## Scope

The App Shell Live Proposal Telemetry / Redaction Audit panel previews the
runtime telemetry redaction audit result using safe summary artifacts. It is a
read-only App surface and does not create telemetry, send requests, call
DeepSeek, read API keys, fetch network, invoke Tauri, write EventStore events,
write files, apply patches, or rollback.

The panel is placed near the App Live Proposal Preview Gate and summarizes:

- telemetry audit status
- record counts
- blocked and warning record counts
- redacted field counts
- raw leak booleans
- safe usage summary when available
- readiness flags
- next action

## App Boundary

The App passes only safe summaries to the runtime audit helper. It does not
pass raw prompt text, raw model responses, reasoning_content text, API key
values, raw source, or raw diff. It does not call the runtime live adapter,
API key resolver, or transport.

The UI includes:

- `Preview Telemetry Audit`
- `Write Telemetry (disabled)`

There is no enabled telemetry write button, no raw prompt field, no raw
response field, no API key value field, and no live model call control.

## Relation To P0M

The panel summarizes the boundaries established by:

- P0M-002 Live Proposal Opt-in Gate
- P0M-003 Live Proposal Request Builder
- P0M-004 runtime Live DeepSeek Proposal Adapter
- P0M-005 Live Proposal Validation Integration
- P0M-006 App Live Proposal Preview Gate

It prepares P0M-008 RC polish by documenting that telemetry remains
summary-only.

## Non-goals

- No live call
- No API key read
- No fetch/network
- No raw prompt persistence
- No raw response persistence
- No reasoning_content persistence
- No EventStore write
- No Tauri command
- No file write
- No apply or rollback
- No App execution
- No Git/shell
- No native bridge
- No desktop action
