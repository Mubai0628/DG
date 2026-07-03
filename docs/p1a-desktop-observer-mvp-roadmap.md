# P1A Desktop Observer MVP Roadmap

## Goal

P1A moves the workbench from fixed multi-agent planning into a narrow Desktop
Observer MVP, no action. The goal is to let a user explicitly request a desktop
observation and receive summary-only foreground/window/app/display metadata that
can be audited and reused as context evidence.

The observer is not a desktop controller. It must not click, type, select,
write the clipboard, automate file dialogs, remote-control windows, record the
screen, run hidden background capture, or send desktop observations to a model
automatically.

## MVP Flow

```text
User explicitly requests desktop observation
-> fixed Tauri observer command runs
-> returns foreground/window/app/display metadata summary
-> optional screenshot metadata/redaction boundary is represented
-> no raw screenshot is persisted by default
-> App read-only Desktop Observer surface displays summary
-> observation summary becomes evidence refs for Context / Agent Dossier
-> privacy/redaction audit validates no raw screenshot/secret/clipboard/prompt leakage
-> replay/audit summary can show observation refs
```

## Required Boundaries

- user-triggered observation only
- summary-only window/app/display metadata
- optional screenshot metadata/redaction boundary
- no desktop action
- no click/type/select
- no clipboard write
- no file dialog automation
- no hidden background capture
- no screen recording
- no raw screenshot persistence by default
- no raw OCR text persistence by default
- no native bridge broad action
- no dynamic agent desktop control
- no raw prompt/source/diff/response/API key in observation events

## P1A Tasks

1. P1A-001 Desktop Observer ADR / threat model / implementation gate
   - design only
   - no Tauri command
   - no screenshot capture
2. P1A-002 Desktop Observation Profile Schema
   - runtime profile validator
   - no observation
   - no desktop action
3. P1A-003 Runtime Desktop Observation Metadata Model
   - metadata summaries from test/manual objects
   - no OS calls
   - no Tauri
4. P1A-004 Tauri Fixed Desktop Observation Command
   - fixed command only
   - metadata-only safe fallback
   - no EventStore write
5. P1A-005 Screenshot Metadata / Redaction Boundary
   - metadata/hash/size/redaction only
   - no raw screenshot persistence by default
6. P1A-006 App Desktop Observer Surface
   - read-only App panel
   - fixed observer command wrapper only
   - disabled action placeholders
7. P1A-007 Observer Evidence Refs into Context / Agent Dossiers
   - summary refs only
   - volatile_tail and no_compress_zone placement
   - no raw screenshot/OCR
8. P1A-008 Desktop Observer Privacy / Redaction Audit + Smoke
   - raw screenshot/OCR/secret/clipboard/send-to-model blockers
   - summary-only smoke fixture
9. P1A-009 v0.23 RC polish + full gates + release
   - release notes
   - manual QA
   - RC checklist
   - full gates and prerelease flow

## Deferred

- desktop action
- click/type/select
- clipboard write or default clipboard read
- file dialog automation
- remote control
- screen recording
- hidden background capture
- raw screenshot persistence by default
- raw OCR text persistence by default
- broad native bridge
- autonomous desktop agent
- dynamic agent desktop control
- model-driven desktop observation
- arbitrary Git/shell
- mutating MCP tools
- arbitrary plugin/skill runtime
- broad PermissionLease

## Next Task

DW-P1A-001 Desktop Observer ADR / Threat Model / Implementation Gate.
