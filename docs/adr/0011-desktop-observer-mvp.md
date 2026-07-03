# ADR 0011: Desktop Observer MVP

## Status

Proposed / Accepted for P1A design gate.

## Context

P0Z completed fixed multi-agent execution with fixed roles, summary-only
handoff dossiers, gated capability planning, and no desktop action. The next
stage is a Desktop Observer MVP, no action. It should make explicit,
user-triggered desktop observation possible without becoming a desktop
controller.

Desktop state can contain private window titles, app names, display metadata,
visible secrets, browser tab text, and prompt-injection text. Observation must
therefore start with a narrow metadata contract, redaction gate, and App
read-only projection before any platform command ships.

## Decision

Desktop Observer is observation-only. It must never click, type, select, move
windows, automate file dialogs, write the clipboard, remote-control windows,
record the screen, or run hidden background capture.

Observation must be explicit user-triggered only. No agent, model, replay, or
background timer may trigger observation without a future broker/approval gate.

The default output is summary-only foreground/window/app/display metadata:
window title summaries, app/process summaries, display size summaries, hashes,
counts, redaction codes, warning codes, and readiness flags. Raw screenshots,
raw OCR text, raw clipboard data, raw prompts, raw source, raw diffs, raw model
responses, API keys, Authorization headers, bearer tokens, and secret markers
must not enter observation output.

Screenshot support, if implemented later in P1A, must go through a
metadata/redaction boundary first. It may expose hash, size, dimensions, byte
estimate, redaction state, and warning codes, but raw screenshot persistence is
disabled by default. Raw OCR text persistence is disabled by default.

Observation evidence may enter Context Assembly, Agent Dossiers, audit, and
replay only as summary refs. Desktop observation must not be sent to a model
automatically.

The App surface remains read-only. It may request the fixed observer command in
a later task, display summaries, and show disabled action placeholders, but it
cannot perform desktop action, apply, rollback, approve, reject, write events,
issue PermissionLeases, or expand native bridge authority.

## Non-goals

- No Tauri command in P1A-001.
- No desktop observation code in P1A-001.
- No screenshot capture in P1A-001.
- No App UI in P1A-001.
- No desktop action.
- No click/type/select.
- No clipboard write.
- No default clipboard read.
- No file dialog automation.
- No remote control.
- No hidden background capture.
- No screen recording.
- No raw screenshot persistence by default.
- No raw OCR text persistence by default.
- No model auto-send.
- No broad native bridge.
- No dynamic agent desktop control.
- No arbitrary Git/shell.

## Required Gates Before Implementation

- Profile safety tests prove unsafe capture and action settings are blocked.
- User-trigger safety tests prove observation cannot run from hidden background
  flows or agent/model output.
- Tauri command allowlist tests prove only a future fixed observation command is
  callable.
- Window metadata tests prove titles, app names, process ids, and display ids
  are summarized, redacted, and bounded.
- Screenshot/redaction tests prove raw screenshots and raw OCR are not persisted
  by default.
- Event/replay tests prove observation refs stay summary-only if event support
  is added later.
- App UI tests prove observer surfaces remain read-only and action controls are
  disabled.
- Context/agent evidence tests prove observation refs are refs only and cannot
  carry raw screenshots, OCR text, prompts, source, diffs, or secrets.
- Boundary checks prove no desktop action, click/type/select, clipboard write,
  file dialog automation, hidden capture, native bridge broad action, Git/shell,
  or automatic model send is added.

## Consequences

This design delays richer desktop automation, OCR, and screenshots until the
privacy boundary is testable. The first observer path is less powerful, but it
keeps desktop context auditable, explicit, redacted, and compatible with the
existing summary-only context and agent evidence chains.
