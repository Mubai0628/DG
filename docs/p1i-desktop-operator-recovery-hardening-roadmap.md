# P1I Desktop Operator Recovery / Action Hardening Roadmap

## Goal

P1I goal: harden desktop operator recovery, mismatch handling, undo /
compensating action summaries, privacy audit, and replay completeness without
expanding desktop action capability.

This phase builds on Desktop Observer, Desktop Action Proposal, Approved
Desktop Action Execution, Approved Expanded Desktop Action Execution, and
External Capability Execution Hardening. It does not create broad desktop
automation.

## Principles

- No broad desktop automation.
- No remote control.
- No hidden background desktop actions.
- No screen recording.
- No clipboard write by default.
- No file dialog automation by default.
- No dynamic agent desktop control.
- No arbitrary native bridge.
- No autonomous desktop agent.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No replay re-execution.
- No raw screenshot, OCR, target text, prompt, response, source, diff, or API
  key persistence.

## Hardening Focus

- Desktop action mismatch recovery contracts.
- Stale screen and stale target blockers.
- Interrupted action and focus loss handling.
- Undo / compensating action summary model.
- App read-only Desktop Operator Recovery surface.
- Desktop action replay completeness and privacy redaction hardening.
- Golden smoke and manual QA hardening.

## Tasks

1. `DW-P1I-001` - Desktop Operator Recovery ADR / threat model.
2. `DW-P1I-002` - Desktop action mismatch recovery contract.
3. `DW-P1I-003` - Stale screen / stale target recovery model.
4. `DW-P1I-004` - Interrupted action / focus loss handling.
5. `DW-P1I-005` - Undo / compensating action summary model.
6. `DW-P1I-006` - App desktop recovery surface.
7. `DW-P1I-007` - Replay completeness / privacy audit.
8. `DW-P1I-008` - Golden smoke / manual QA hardening.
9. `DW-P1I-009` - v0.31 RC polish + full gates + push/tag/release.

## Deferred

- Broad desktop automation.
- Arbitrary click/type.
- Clipboard write by default.
- File dialog automation by default.
- Drag/drop broad automation.
- Remote control.
- Hidden background control.
- Screen recording.
- Autonomous desktop agent.
- Dynamic agent desktop control.
- Arbitrary native bridge.
- Arbitrary Git/shell.
- Broad PermissionLease.
- Desktop action replay re-execution.

## Acceptance

P1I is complete when desktop action recovery summaries can prove mismatch,
freshness, interruption, compensation, replay, and privacy boundaries through
runtime reports, App read-only surfaces, golden smoke, and release
documentation without adding a new desktop execution path.
