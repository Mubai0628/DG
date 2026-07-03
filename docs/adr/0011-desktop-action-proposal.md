# ADR 0011: Desktop Action Proposal MVP

## Status

Proposed / Accepted for P1B design gate.

## Context

P1A completed the Desktop Observer MVP: the App can surface user-triggered,
metadata-only foreground/window/app/display summaries and route observer
evidence refs into Context Assembly and Agent Dossiers. The next step is not
desktop automation. P1B only models possible future desktop actions as
proposals, risk summaries, approval drafts, dry-run simulations, and read-only
App surfaces.

Desktop actions are risky because a wrong target, stale observation, spoofed
window, focus hijack, clickjacking overlay, destructive click, or text entry in
the wrong field can mutate local state or leak secrets. The design must keep
all action intent below execution until a future approved desktop action phase.

## Decision

Desktop action must be proposal-first. A Desktop Action Proposal can reference
Desktop Observer evidence refs, but it cannot execute a desktop action.

No real desktop action is allowed in P1B. No click, type, select, drag, drop,
hotkey, clipboard write, file dialog automation, remote control, hidden
background capture, screen recording, broad native bridge, or dynamic agent
desktop control is introduced.

Every Desktop Action Proposal must pass the following summary-only gates before
it can be considered for any future phase:

- target metadata validation
- stale observer evidence detection
- action kind allowlist and forbidden action field guard
- sensitive target detection
- risk classification
- approval draft safety
- dry-run / simulation
- privacy and redaction audit

The App remains read-only and proposal-only. It may preview a proposal,
validation result, risk summary, simulation, audit, and disabled action
placeholders, but it cannot execute, approve, reject, issue a PermissionLease,
write EventStore entries, invoke a desktop action Tauri command, or call a
native bridge.

Capability Broker integration may plan descriptor refs such as proposal,
simulation, and a disabled future execute descriptor. It must not issue leases
or execute tools.

Future execution requires a separate approved desktop action phase.

## Non-goals

- No runtime execution in P1B-001.
- No App UI in P1B-001.
- No Tauri action command.
- No real desktop action.
- No click/type/select.
- No drag/drop or hotkey execution.
- No clipboard write.
- No file dialog automation.
- No hidden background capture.
- No screen recording persistence.
- No native bridge broad action.
- No remote control.
- No autonomous desktop agent.
- No dynamic agent desktop control.
- No shell / Git expansion.
- No raw screenshot, OCR text, clipboard content, raw prompt, raw source, raw
  diff, raw response, API key, or secret persistence.

## Required Gates Before Implementation

- Target metadata validation tests must block stale evidence, missing evidence,
  mismatched app/window/display refs, impossible bounds, and sensitive targets.
- Action kind allowlist tests must accept proposal-only values and block unknown
  or execution-now fields.
- Forbidden action kind tests must block direct execution attempts such as
  `clickNow`, `typeNow`, `executeNow`, native bridge fields, command fields, and
  raw clipboard/file content.
- Sensitive target tests must identify password/API key fields, file dialogs,
  hidden/background targets, cross-app targets, and high-risk UI roles.
- Risk classifier tests must map action kinds and target sensitivity to
  low/medium/high/critical/blocked categories.
- Approval draft tests must remain summary-only and disabled for execution.
- Dry-run simulation tests must prove no click, type, focus, clipboard, file
  dialog, EventStore write, or native bridge call occurs.
- Redaction audit tests must block raw screenshots, OCR text, raw UI text,
  clipboard content, secrets, API keys, raw prompt/source/diff/response, and
  raw action args.
- App UI tests must prove action controls are disabled and no Tauri invoke,
  EventStore write, or native bridge action was added.
- Boundary checker and CI tests must continue to block desktop action
  execution, broad native bridge, Git/shell expansion, mutating MCP tools, and
  broad PermissionLease.

## Consequences

P1B slows the path to desktop automation, but it creates an auditable and
testable bridge between observation and any future approved execution phase.
The workbench can reason about target quality, risk, approval needs, and
simulation outcomes without mutating the desktop.
