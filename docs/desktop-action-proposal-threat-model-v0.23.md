# Desktop Action Proposal Threat Model v0.23

## Assets

- User desktop state, active window, app identity, display metadata, and target
  bounds.
- Desktop Observer evidence refs.
- Proposed action summaries and target refs.
- Approval draft, risk summary, simulation summary, and audit output.
- Clipboard contents, file paths, passwords, API keys, private tokens, and
  sensitive UI fields that must never be captured raw.
- Event/replay integrity and App read-only boundaries.

## Trust Boundaries

- User input and pasted proposal JSON are untrusted.
- Desktop Observer evidence refs are summary-only and may become stale.
- App Shell display is read-only and must not execute proposals.
- Runtime validators may classify and simulate proposals but must not invoke OS
  actions.
- Capability Broker may plan descriptors but must not issue leases or execute
  desktop action tools.

## Attacker-controlled Inputs

- Malicious proposal JSON with execution-now fields.
- Spoofed target summaries or stale observer evidence refs.
- Window titles, app names, labels, menu text, and role summaries controlled by
  local apps or web pages.
- Prompt-injection text in visible UI.
- Secret-like strings embedded in target labels, clipboard summaries, or file
  dialog summaries.

## Risks

- Wrong window target from stale window/app/screen metadata.
- UI spoofing where a malicious app mimics a trusted target.
- Focus hijack between observation and proposed action.
- Clickjacking or overlay attacks that change the effective target.
- Destructive click, menu selection, drag/drop, or hotkey proposal.
- Typing into the wrong field or a password/API key field.
- Clipboard leakage through copy/paste proposals.
- File dialog risks, including absolute path leakage or unintended file choice.
- Password/API key target risks.
- Raw screenshot leakage, raw OCR leakage, or raw UI text leakage.
- Hidden background observation being confused with user-triggered observation.
- Remote-control confusion where a proposal is treated as executed.
- Agent autonomy escalation through dynamic desktop control.
- Native bridge abuse by introducing a broad desktop command.
- Event/replay mismatch where summaries imply execution happened.
- Approval bypass by setting readiness or execution flags true.

## Mitigations

- Proposal-first schema with no execution side effects.
- Observer evidence refs are summary-only and checked for freshness.
- Target metadata validation blocks stale, missing, mismatched, impossible, or
  sensitive targets.
- Action kind allowlist is proposal-only; execution-now fields are forbidden.
- Risk classifier escalates text input, clipboard, file dialog, drag/drop,
  cross-app, hidden/background, and sensitive-target proposals.
- Approval draft remains a draft and cannot issue PermissionLease.
- Dry-run simulation predicts outcomes without OS calls.
- Privacy audit blocks raw screenshot, OCR text, UI text, clipboard content,
  file content, raw prompt/source/diff/response, API keys, and secret markers.
- App UI shows disabled controls only and no Tauri action command.
- Boundary checker keeps blocking broad native bridge, Git/shell expansion,
  mutating MCP tools, and EventStore raw action writes.

## Out of Scope

- Real desktop action execution.
- Click/type/select/drag/drop/hotkey execution.
- Clipboard write.
- File dialog automation.
- Remote control or autonomous desktop agent.
- Native bridge broad action.
- Screen recording or hidden background capture.
- Production PermissionLease for desktop action.
