# Desktop Operator Recovery Threat Model v0.30

## Assets

- User desktop focus and foreground window state.
- Desktop Observer evidence summaries.
- Desktop action proposal summaries.
- Approval receipts and typed confirmation summaries.
- Approved desktop action result summaries.
- Recovery, compensation, replay, privacy, and App display summaries.

## Trust Boundaries

- Desktop Observer metadata boundary.
- Action proposal validation boundary.
- Approval receipt and typed confirmation boundary.
- Target freshness and identity boundary.
- Approved action result summary boundary.
- Recovery recommendation boundary.
- Replay projection boundary.
- Privacy/redaction audit boundary.
- App read-only display boundary.

## Attacker-controlled Inputs

- Pasted summary JSON.
- Window title, app title, target label, display, and bounds summaries.
- Observer evidence refs.
- Approval and execution result summaries.
- Recovery and compensation summary refs.
- Replay and privacy audit summaries.

## Risks

- Stale screen evidence causes recovery to reason about an old UI state.
- Stale window target points to a window that moved, closed, or changed title.
- Focus loss causes click/type to target the wrong app.
- Window moved, closed, minimized, hidden, or title changed after approval.
- Display topology changed between observation and action.
- Action interrupted by user input, timeout, platform error, or app crash.
- Partial success ambiguity makes a no-op look successful.
- Simulated success but real no-op hides a failed action.
- Wrong target activation triggers another app/window.
- Privacy leak through screen, window, OCR, or target metadata.
- Raw screenshot or OCR leaks in events, replay, telemetry, or App surfaces.
- Replay re-execution repeats an action from an old event.
- Undo mismatch suggests a compensation that affects the wrong target.
- Compensating action overreach causes broader automation than the original
  approved lane.
- Agent desktop control bypass attempts to convert recovery into autonomous
  action.
- Native bridge expansion risk turns summaries into broad desktop control.

## Mitigations

- Recovery contracts are summary-only.
- Stale evidence and target mismatch checks fail closed.
- Focus/window consistency is checked before recommendations are considered
  ready.
- Interrupted action summaries require manual review or re-observation.
- Compensation recommendations do not execute undo.
- Replay completeness audits prove refs without replay re-execution.
- Privacy/redaction audits block raw screenshot, OCR, target text, clipboard,
  prompt, source, diff, API key, native bridge, and execution fields.
- App surfaces display disabled retry/undo/action controls only.
- Boundary checks keep broad desktop automation, native bridge, arbitrary
  Git/shell, broad PermissionLease, mutating MCP tools, and plugin/skill
  runtime blocked.

## Out of Scope

- Enabling arbitrary click/type.
- Retrying desktop actions automatically.
- Executing undo or compensating actions.
- Re-executing replayed desktop actions.
- Clipboard write by default.
- File dialog automation by default.
- Hidden/background control.
- Screen recording.
- Remote control.
- Broad native bridge.
- Autonomous desktop agent.
