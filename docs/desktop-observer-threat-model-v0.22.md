# Desktop Observer Threat Model v0.22

## Scope

This threat model covers the P1A Desktop Observer MVP design gate. P1A-001 is
design-only and does not implement a Tauri command, desktop observation code,
screenshot capture, App UI, EventStore writer, native bridge broad action, or
desktop action.

## Assets

- Foreground window metadata and window title summaries.
- App/process name summaries and process id hashes.
- Display metadata, monitor arrangement summaries, dimensions, and scale.
- Optional screenshot metadata such as hash, dimensions, size, and redaction
  state.
- Optional OCR summaries if later introduced, with raw OCR persistence disabled
  by default.
- Context evidence refs, Agent Dossier refs, audit summaries, and replay
  summaries.
- User secrets visible on screen, API keys, Authorization headers, bearer
  tokens, clipboard data, raw prompts, raw source, raw diffs, and raw model
  responses.

## Trust Boundaries

- The user explicit-trigger boundary between App Shell and the observer command.
- The Tauri command boundary between App UI and platform metadata collection.
- The runtime profile and observation-summary validators.
- The screenshot metadata/redaction boundary.
- The privacy/redaction audit boundary.
- Context Assembly and Agent Dossier evidence-ref boundaries.
- Event/replay summary boundaries if observation refs are later recorded.
- Model request boundaries, which must not receive desktop observation
  automatically.

## Attacker-controlled Inputs

- Window titles, browser tab titles, document titles, file names, and app names.
- Visible webpage or terminal text that can include prompt injection.
- Process names and display labels from untrusted software.
- User-supplied observation profile fields.
- Synthetic screenshot metadata or OCR summaries in tests.
- Agent/model outputs that try to request observation or desktop action.
- Event/replay payloads that try to smuggle raw desktop content.

## Risks and Mitigations

### Private Window Titles

Risk: window titles expose names, emails, issue ids, account names, or document
paths.

Mitigations: bounded title summaries, redaction codes, hash prefixes, optional
title omission, and tests for secret-like title markers.

### Browser Tabs

Risk: browser titles reveal active sites, private tabs, account names, or
prompt-injection text.

Mitigations: user-triggered observation only, summary-only titles, prompt
injection treated as untrusted visible text, and no model auto-send.

### Usernames and Emails in Window Title

Risk: desktop metadata leaks personal identifiers.

Mitigations: redaction policies for email-like values, safe display summaries,
and audit findings that count redactions without returning raw values.

### Visible Secrets

Risk: secrets appear in window titles, app names, screenshots, or OCR.

Mitigations: secret marker guards, API-key marker blockers, no raw screenshot
or raw OCR persistence by default, and fail-closed audit.

### Screen Capture Leakage

Risk: screenshots contain private data beyond metadata.

Mitigations: screenshot support is limited to metadata/hash/size/redaction
summaries until a tested redaction boundary exists; raw screenshot persistence
is disabled by default.

### Clipboard Leakage

Risk: the observer reads or writes clipboard content.

Mitigations: no clipboard write, no default clipboard read, no clipboard data in
observation schemas, and boundary tests for clipboard fields.

### OCR Leakage

Risk: OCR extracts raw visible text into events or context.

Mitigations: raw OCR text persistence is disabled by default; OCR summaries, if
later allowed, must pass a redaction boundary and be summary-only.

### Background Capture

Risk: observation runs when the user did not explicitly request it.

Mitigations: user-triggered flags, no timers, no hidden capture, no agent/model
direct invocation, and implementation-gate tests.

### Focus Spoofing and Window Handle Mismatch

Risk: the command summarizes a window different from the user's intended
foreground window.

Mitigations: include focus state summaries, timestamps, display hashes, warning
codes for unavailable or ambiguous focus, and no execution based on observation.

### Multi-monitor Privacy

Risk: metadata reveals private displays or dimensions from other monitors.

Mitigations: bounded display counts, primary-display summaries, redaction codes,
and profile flags controlling display metadata.

### Remote Desktop / VM / Browser Profile Leakage

Risk: observation captures metadata from remote sessions, VM windows, or browser
profiles.

Mitigations: summary-only app/window metadata, profile warnings for sensitive
app names, and no raw screenshot/OCR persistence.

### Event/Replay Raw Screenshot Leakage

Risk: raw screenshots or OCR text are stored as replayable events.

Mitigations: event payloads, if added later, must be summary-only refs; raw
image/OCR fields are blockers and replay tests must check hashes/counts only.

### Agent Misuse

Risk: an agent asks the observer to inspect private desktop state or uses
observation as an execution proxy.

Mitigations: no direct agent invocation, future broker/approval gate required,
summary-only evidence refs, and all execution readiness flags false.

### Prompt Injection from Visible Screen Text

Risk: visible text instructs an agent or model to ignore gates.

Mitigations: visible text is untrusted evidence, not instructions; no automatic
model send; context refs remain summaries with warning codes.

### Covert Data Exfiltration

Risk: repeated observation leaks desktop state through logs, events, or model
requests.

Mitigations: explicit user trigger, bounded metadata, no background capture,
redaction audit, no raw persistence, and no model auto-send.

## Out-of-scope Risks

- Desktop action automation.
- Screen recording products.
- Full OCR pipeline design.
- Remote-control systems.
- Native bridge broad action.
- Cross-device desktop monitoring.
