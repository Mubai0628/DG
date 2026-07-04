# Desktop Action Expansion Threat Model v0.25

## Assets

- User desktop focus and foreground window state.
- Observed window/app/display metadata.
- Desktop action proposal summaries.
- Approval draft and risk summaries.
- Clipboard and file dialog proposal metadata.
- Event, replay, audit, and App read-only surfaces.

## Trust Boundaries

- Desktop Observer metadata boundary.
- Proposal parser and validator boundary.
- Target freshness and mismatch checker boundary.
- Risk classifier boundary.
- Sequence simulation boundary.
- App read-only display boundary.
- Redaction/privacy audit boundary.

## Attacker-controlled Inputs

- User-pasted proposal JSON.
- App/window/title/label summaries.
- Observer evidence refs.
- Target labels and expected visible effect summaries.
- Clipboard/file-dialog metadata refs.
- Sequence step summaries.

## Risks

- Clickjacking through spoofed labels or overlapping UI.
- UI spoofing by a malicious app/window title.
- Stale screenshot/window metadata.
- Wrong display/window/app target.
- Destructive UI action such as delete, reset, wipe, submit, send, upload, or
  purchase.
- Credential/password fields.
- Payment/financial UI.
- System settings or security prompts.
- Clipboard leakage through raw clipboard text or copied secrets.
- File dialog unsafe path, absolute path, drive path, UNC path, traversal, or
  secret path.
- Hidden background action.
- Remote control.
- Screen recording.
- Native bridge expansion.
- Dynamic agent desktop control.
- Privacy leakage from raw screenshot/OCR.
- Action sequence ambiguity.

## Mitigations

- Proposal-only schemas with all execution readiness flags false.
- Required observer evidence refs and target metadata.
- Stale evidence and screen mismatch checks.
- Sensitive/destructive UI risk classifier.
- Clipboard proposal summaries without raw clipboard content.
- File dialog proposal summaries without unsafe raw paths.
- Sequence simulation that stops at sensitive, destructive, stale, or blocked
  steps.
- App read-only surface with disabled click/type/clipboard/file-dialog controls.
- Redaction audit for raw screenshot, OCR, clipboard, path, API key, secret,
  prompt, source, diff, native bridge, and execution fields.
- Boundary checks that keep broad native bridge and arbitrary desktop action
  blocked.

## Out of Scope

- Executing click/type/select.
- Writing clipboard.
- Opening or controlling file dialogs.
- Drag/drop execution.
- Screen recording or hidden background capture.
- Remote-control desktop action.
- Broad native bridge.
- Dynamic agent desktop control.
- Autonomous desktop agent.
