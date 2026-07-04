# Approved Expanded Desktop Action Threat Model v0.26

## Assets

- User desktop focus and foreground window state.
- Observed window/app/display metadata.
- Observed safe target metadata.
- Approved expanded desktop action proposal summaries.
- Approval receipts and typed confirmations.
- Freshness, mismatch, risk, and simulation summaries.
- Summary-only action results, events, replay, and privacy audits.

## Trust Boundaries

- Desktop Observer metadata boundary.
- Expanded action proposal validation boundary.
- Target metadata validation boundary.
- Freshness and screen mismatch boundary.
- Risk classifier boundary.
- Sequence simulation boundary.
- Approval receipt boundary.
- Fixed Tauri command boundary.
- Summary-only event/replay boundary.
- App source-boundary tests.

## Attacker-controlled Inputs

- User-pasted or model-produced proposal summaries.
- Window/app/title/label summaries.
- Target labels, roles, and bounds summaries.
- Typed confirmation text.
- Text payload summaries for type actions.
- Stale or spoofed observer evidence refs.

## Risks

- Stale screen evidence.
- Target moved after observation.
- Wrong window focus.
- Wrong display or app target.
- Sensitive target.
- Destructive UI.
- Password/API key fields.
- Payment, submit, delete, send, upload, or irreversible buttons.
- System security prompt or permission dialog.
- Clipboard leakage.
- Raw screenshot or raw OCR leakage.
- Malicious proposal content.
- Approval bypass.
- Accidental double action.
- Replay re-execution risk.
- Platform mismatch.
- Accessibility permission issues.
- Broad native bridge expansion.
- Dynamic agent desktop control.

## Mitigations

- Allow only `click_observed_safe_target` and
  `type_into_observed_text_field`.
- Require observer evidence, proposal summary, target metadata, freshness
  status, risk classification, simulation summary, receipt, and typed
  confirmation.
- Block stale observations, screen mismatch, app/window/display mismatch, and
  target hash mismatch.
- Block sensitive, destructive, password/API key, payment, submit, delete, and
  system security targets.
- Enforce single click only and bounded type payload summaries.
- Use a fixed Tauri command instead of a generic native bridge.
- Return unsupported platform or permission required as summary-only safe
  results.
- Persist only summary events and hashes.
- Replay displays summaries and never re-executes desktop actions.
- Boundary checks keep clipboard write, file dialog automation, drag/drop,
  broad native bridge, remote control, and dynamic agent desktop control
  blocked.

## Out of Scope

- Arbitrary click/type.
- Clipboard write.
- File dialog automation.
- Drag/drop.
- Multi-step automation.
- Hidden/background action.
- Screen recording.
- Remote control.
- Broad native bridge.
- Dynamic agent desktop control.
- Autonomous desktop agent.
