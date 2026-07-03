# P1C Approved Desktop Action Execution MVP Roadmap

P1C goal:

```text
Open an extremely narrow, human-approved desktop action execution path.
Start with focus/raise/activate observed window only.
No click/type/select in v0.25.
No clipboard write.
No file dialog automation.
No native bridge broad action.
No hidden background action.
All action results must be summary-only and replayable.
```

## Allowed First Actions

The first approved desktop action lane is limited to observed-window focus actions:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

Every action must be tied to Desktop Observer evidence, a Desktop Action Proposal, target metadata validation, risk classification, an approval receipt, exact typed confirmation, non-stale target evidence, a fixed Tauri command, summary-only event recording, replay projection, and privacy/redaction audit.

## Deferred Capabilities

- Arbitrary desktop action.
- Click/type/select/drag/drop execution.
- Clipboard write.
- File dialog automation.
- Screen recording.
- Hidden background capture.
- Remote control.
- Broad native bridge.
- Dynamic agent desktop control.
- Autonomous desktop agent.
- Arbitrary Git/shell execution.
- Mutating MCP tools.
- Arbitrary plugin/skill runtime.
- Broad PermissionLease.
- Raw screenshot, raw OCR, raw prompt/source/diff/API key/event payload persistence.

## Recommended Tasks

1. Approved Desktop Action Execution ADR / threat model / implementation gate.
2. Desktop Action Approval Receipt.
3. Runtime approved desktop action execution contract.
4. Tauri fixed desktop action command.
5. App approved desktop action surface.
6. Desktop action events / replay / privacy audit.
7. Desktop action smoke / hardening.
8. v0.25 RC polish + release.

## Safety Invariants

- Approval is action-specific and target-specific.
- Typed confirmation must match exactly.
- Target evidence must not be stale.
- If a platform cannot safely focus/raise/activate an observed external window, the command fails closed or returns `unsupported_platform`.
- The App must not fall back to shell, generic native bridge, synthetic click/type/select, clipboard automation, or file dialog automation.
- All results remain summary-only and replayable.

## Next Task

`DW-P1C-001` documents the approved desktop action execution ADR, threat model, and testable implementation gate before any execution code is added.
