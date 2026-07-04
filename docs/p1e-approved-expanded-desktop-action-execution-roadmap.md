# P1E Approved Expanded Desktop Action Execution Roadmap

P1E goal:

```text
Open only narrow approved expanded desktop actions: single safe click and single
safe type into observed target.
```

## Narrow Execution Scope

P1E may implement only these expanded desktop action kinds:

- `click_observed_safe_target`
- `type_into_observed_text_field`

Both require:

- Desktop Observer metadata evidence.
- Expanded desktop action proposal summary.
- Target metadata validation.
- Sensitive/destructive risk classification.
- Sequence simulation result.
- Approval receipt.
- Exact typed confirmation.
- Freshness and screen mismatch check.
- Fixed Tauri command.
- Summary-only execution result and event.

## Deferred Capabilities

- Clipboard write.
- File dialog automation.
- Drag/drop.
- Multi-step automation.
- Background/hidden action.
- Screen recording.
- Remote control.
- Broad native bridge.
- Dynamic agent desktop control.
- Autonomous desktop agent.
- Arbitrary click/type.
- App-side broad desktop execution.

## Recommended Tasks

1. `DW-P1E-001` - Approved Expanded Desktop Action Execution ADR / threat model / gate.
2. `DW-P1E-002` - Expanded Desktop Action Approval Receipt / Typed Confirmation.
3. `DW-P1E-003` - Safe Click Execution Contract, observed target only.
4. `DW-P1E-004` - Safe Type Execution Contract, observed text field only.
5. `DW-P1E-005` - Tauri Fixed Expanded Desktop Action Command, click/type only.
6. `DW-P1E-006` - App Approved Expanded Desktop Action Surface, explicit approval.
7. `DW-P1E-007` - Expanded Desktop Action Events / Replay / Privacy Audit.
8. `DW-P1E-008` - Approved Expanded Desktop Action Smoke / Hardening.
9. `DW-P1E-009` - v0.27 RC polish + full gates + push/tag/release.

## Safety Invariants

- No arbitrary desktop action.
- No arbitrary click/type.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No hidden/background action.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No screen recording.
- No raw screenshot or raw OCR persistence.
- Replay must not re-execute desktop actions.
- Events remain summary-only.

## Next Task

`DW-P1E-001` documents the ADR, threat model, and testable implementation gate
before runtime approval receipt or execution contracts are implemented.
