# ADR 0011: Approved Expanded Desktop Action Execution

## Status

Proposed / Accepted for P1E design gate.

## Context

P1A added Desktop Observer metadata-only evidence. P1B added desktop action
proposals without execution. P1C added a narrow approved observed-window
execution lane for focus, raise, and activate. P1D expanded future desktop
action proposals, freshness checks, sequence simulation, risk classification,
App read-only display, and privacy audit without enabling click/type execution.

P1E is the first stage that may open a tiny part of those expanded proposals to
controlled execution. The risk is much higher than focus/raise/activate: a
click can press the wrong button, and type can place text into the wrong field.
The lane therefore has to be fixed, approval-gated, target-bound, fresh, and
summary-only.

## Decision

Only two expanded action kinds may be implemented in v0.27:

- `click_observed_safe_target`
- `type_into_observed_text_field`

Both require:

- Desktop Observer evidence.
- Expanded action proposal.
- Target validation.
- Risk classification.
- Sequence simulation result.
- Approval receipt.
- Exact typed confirmation.
- Freshness check.
- Screen mismatch check.
- Fixed Tauri command.
- Summary-only event.

No clipboard write, file dialog automation, drag/drop, multi-step automation,
arbitrary coordinates, hidden/background action, remote control, broad native
bridge, dynamic agent desktop control, autonomous desktop agent, screen
recording, raw screenshot persistence, or raw OCR persistence is enabled.

Replay may reconstruct the action summary but must not execute or re-execute any
desktop action.

## Non-goals

- No arbitrary click/type.
- No select execution.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No multi-step automation.
- No hidden/background action.
- No screen recording.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No replay re-execution.
- No raw screenshot/OCR/target text persistence.

## Required Gates

Before implementation can land, tests must prove:

- Target metadata validation blocks missing or mismatched target refs.
- Freshness and screen mismatch checks fail closed.
- Sensitive UI and destructive UI targets are blocked.
- Password, API key, payment, submit, delete, and security prompt targets are
  blocked.
- Typed confirmation is exact and action-kind-specific.
- Fixed Tauri command is the only execution path.
- Output and events are summary-only.
- Replay does not re-execute.
- App source-boundary tests block broad native bridge expansion.

## Consequences

P1E intentionally keeps the click/type lane narrow. This slows desktop
automation, but it lets the project validate target-bound execution,
approval receipts, typed confirmations, fixed commands, and replay privacy
before any wider desktop action model exists.
