# Approved Desktop Action Execution Threat Model v0.24

## Assets

- User attention and active foreground window.
- Desktop Observer evidence refs and target metadata.
- Desktop Action Proposal summaries.
- Approval receipts and typed confirmations.
- Summary-only action events and replay projections.
- Sensitive local app/window titles, bounds, process refs, screenshots, OCR,
  prompts, source, diffs, API keys, and event payloads.

## Trust Boundaries

- User-provided approval text crosses into the App state.
- Desktop Observer evidence crosses into proposal and execution planning.
- App state crosses into a fixed Tauri command.
- Tauri returns summary-only execution results to the App.
- Summary events and replay projections cross into audit surfaces.

## Attacker-controlled Inputs

- Window titles and app names.
- Stale or spoofed observed window metadata.
- Proposal drafts or tampered proposal summaries.
- Typed confirmation attempts.
- Event payloads and replay inputs.
- Any raw screenshot/OCR/prompt/source/diff/API-key marker embedded in unsafe inputs.

## Risks

- Stale window metadata causing action on a no-longer-observed target.
- Wrong window target through focus changes or monitor confusion.
- App spoofing via process name, title, or icon mimicry.
- Window title injection hiding dangerous context in trusted-looking summaries.
- Focus stealing by another app immediately before action.
- Sensitive window/app target such as password, keychain, terminal, payment, or file dialog.
- Hidden/background capture or action against a non-visible target.
- Accidental action on wrong monitor.
- Desktop action approval bypass.
- Native bridge escalation from focus/raise/activate into arbitrary desktop automation.
- Clipboard leakage or clipboard write escalation.
- Raw screenshot / OCR leakage.
- Event/replay confusion where replay appears to execute or authorize action.
- Dynamic agent desktop control.
- Remote control risk.

## Mitigations

- Fixed allowlist: only `focus_observed_window`, `raise_observed_window`, and
  `activate_observed_window`.
- Target freshness validation before execution.
- Target metadata matching across observer evidence, proposal, receipt, and command input.
- Risk classifier must allow the action and block sensitive targets.
- Approval receipt must be scoped to action kind, proposal id, evidence id, and target refs.
- Typed confirmation must match exactly.
- Fixed Tauri command only; no generic native bridge.
- Unsupported platforms return `unsupported_platform` or fail closed.
- Events and replay are summary-only and cannot replay actions.
- Privacy/redaction audit blocks raw screenshot, OCR, prompt, source, diff,
  API key, clipboard, file content, command fields, and raw event payloads.
- Boundary checks keep blocking click/type/select, clipboard write, file dialog
  automation, screen recording, hidden capture, remote control, Git/shell
  expansion, mutating MCP tools, arbitrary plugin/skill runtime, and broad
  PermissionLease.

## Out of Scope

- General UI automation.
- Text entry, clicks, selection, drag/drop, hotkeys, or clipboard operations.
- File dialog automation.
- Screen recording or hidden background capture.
- Remote desktop control.
- Autonomous desktop agents.
- Broad native bridge execution.
