# P1D Desktop Action Expansion Proposal Roadmap

P1D goal:

```text
Expand desktop action proposal types without execution.
Keep proposal-first validation, simulation, risk, approval draft, and audit.
Do not enable click/type/select/clipboard/file-dialog execution.
```

## Proposal-first Scope

P1D models future desktop actions as structured, summary-only proposals:

- `click_target`
- `type_text`
- `select_option`
- `keyboard_shortcut`
- `clipboard_write`
- `file_dialog_select`
- `drag_drop`
- `scroll`
- `wait_for_state`

The v0.25 narrow approved actions remain the only execution reference:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

P1D does not expand real execution beyond that v0.25 lane.

## Planned Gates

- Target freshness and screen mismatch validation.
- Sensitive/destructive UI risk classifier.
- Action sequence simulation.
- App read-only expanded proposal surface.
- Privacy/redaction audit.
- Summary-only context, audit, and planning refs.

## Deferred Capabilities

- Real click.
- Real type.
- Real select.
- Clipboard write.
- File dialog automation.
- Drag/drop execution.
- Screen recording.
- Hidden capture.
- Remote control.
- Broad native bridge.
- Dynamic agent desktop control.
- Autonomous desktop agent.
- App-side arbitrary desktop action.

## Recommended Tasks

1. `DW-P1D-001` - Desktop Action Expansion ADR / threat model / implementation gate.
2. `DW-P1D-002` - Desktop Action Expansion Proposal Schema.
3. `DW-P1D-003` - Clipboard Proposal Schema, no write.
4. `DW-P1D-004` - File Dialog Proposal Schema, no execution.
5. `DW-P1D-005` - Target Freshness / Screen Mismatch Checks.
6. `DW-P1D-006` - Desktop Action Sequence Simulation Model.
7. `DW-P1D-007` - Sensitive / Destructive UI Risk Classifier.
8. `DW-P1D-008` - App Expanded Desktop Action Proposal Surface, read-only.
9. `DW-P1D-009` - Desktop Action Expansion Privacy / Redaction Audit + Smoke.
10. `DW-P1D-010` - v0.26 RC polish + full gates + push/tag/release.

## Safety Invariants

- Desktop actions remain proposal-first.
- Expanded proposal readiness does not mean execution is enabled.
- App surfaces remain read-only for expanded actions.
- No raw screenshot or raw OCR is persisted by default.
- Clipboard and file dialog proposal outputs must be summary-only.
- No broad native bridge, remote control, or dynamic agent desktop control is
  introduced.

## Next Task

`DW-P1D-001` documents the ADR, threat model, and testable implementation gate
before schema implementation begins.
