# P1B Desktop Action Proposal MVP Roadmap

## Goal

Desktop Action Proposal MVP, no execution.

P1B models future desktop actions as proposals. It does not click, type,
select, drag, drop, use clipboard, open file dialogs, call a native bridge,
remote-control a desktop, or execute desktop actions from the App Shell.

## MVP Flow

```text
Desktop Observer metadata-only evidence
-> Desktop Action Proposal schema
-> target/window/app/screen metadata validation
-> desktop action risk classification
-> approval draft summary
-> dry-run / simulated result
-> Capability Broker planning refs
-> App read-only Desktop Action Proposal surface
-> privacy/redaction audit
-> no desktop action execution
```

## Required Boundaries

- proposal-first desktop action modeling
- summary-only Desktop Observer evidence refs
- no real desktop action
- no click/type/select execution
- no drag/drop or hotkey execution
- no clipboard write
- no file dialog automation
- no hidden background capture
- no screen recording persistence
- no raw screenshot persistence by default
- no raw OCR text persistence by default
- no native bridge broad action
- no remote control
- no autonomous desktop agent
- no dynamic agent desktop control
- no broad PermissionLease
- no raw action arguments in EventStore

## P1B Tasks

1. P1B-001 ADR / threat model / implementation gate.
2. P1B-002 Desktop Action Proposal schema.
3. P1B-003 Target/window/app/screen metadata validation.
4. P1B-004 Desktop Action risk classifier.
5. P1B-005 Dry-run / simulated result model.
6. P1B-006 Capability Broker planning integration.
7. P1B-007 App read-only Desktop Action Proposal surface.
8. P1B-008 Redaction / privacy audit and smoke fixture.
9. P1B-009 v0.24 RC release.

## Explicit Deferrals

- real desktop action
- click/type/select execution
- drag/drop or hotkey execution
- clipboard write
- file dialog automation
- hidden background capture
- screen recording
- native bridge broad action
- remote control
- dynamic agent desktop control
- autonomous desktop agent
- mutating MCP tools
- arbitrary plugin / skill runtime execution
- arbitrary shell or process spawn
- App-side execution of desktop action proposals

## Next Task

DW-P1B-001 Desktop Action Proposal ADR / Threat Model / Implementation Gate.
