# ADR 0018: Desktop Operator Recovery / Action Hardening

## Status

Proposed / Accepted for P1I design gate.

## Context

P1A added Desktop Observer metadata-only evidence. P1B added desktop action
proposals without execution. P1C added narrow approved focus/raise/activate
execution. P1D and P1E expanded proposal and approved click/type lanes while
keeping them target-bound, human-approved, typed-confirmed, and summary-only.
P1H hardened external capability boundaries without adding broad execution.

P1I does not expand the desktop action set. Its purpose is to make the existing
desktop operator lanes safer when the observed screen, target, focus, window,
or platform result no longer matches the expected state.

## Decision

Desktop Operator Recovery hardening in v0.31 is limited to:

- Desktop action mismatch recovery summaries.
- Stale screen and stale target blockers.
- Interrupted action and focus loss summaries.
- Undo / compensating action summaries.
- Replay completeness and privacy redaction checks.
- App read-only recovery surfaces.

Desktop action execution still requires approval receipt and exact typed
confirmation in the existing approved lanes. Recovery output must be
summary-only and must not trigger retry, undo, replay re-execution, clipboard
write, file dialog automation, arbitrary click/type, native bridge, remote
control, hidden background control, or broad desktop automation.

Raw screenshot, OCR, and target text must not be persisted. Replay may
reconstruct summaries but must not execute or re-execute desktop actions.

## Non-goals

- No new desktop action kind.
- No automatic retry.
- No undo execution.
- No replay re-execution.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation by default.
- No drag/drop broad automation.
- No hidden/background desktop action.
- No screen recording.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No raw screenshot/OCR/target text persistence.

## Required Gates

Before implementation can land, tests must prove:

- Observation freshness checks block stale evidence.
- Target identity checks block window, app, title, bounds, display, and focus
  mismatches according to policy.
- Interruption checks block focus loss, user interruption, closed windows,
  timeouts, permission revocation, unknown platform results, and sensitive
  target transitions.
- Undo and compensation output remains summary-only and manual-review gated for
  high-risk recommendations.
- Replay completeness checks require observer, proposal, approval, execution,
  recovery, and redaction refs where applicable.
- Privacy audit blocks raw screenshot, OCR, target text, clipboard content, API
  key, prompt, source, diff, native bridge, and execution fields.
- App recovery surfaces are read-only and do not add Tauri commands,
  EventStore writes, retry buttons, undo execution, or native bridge paths.

## Consequences

P1I slows the path to broader desktop automation, but it makes the existing
lanes more trustworthy by treating mismatch, staleness, interruption, and
privacy leakage as first-class blockers before any future desktop operator
work can safely proceed.
