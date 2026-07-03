# P1A-001 Desktop Observer Gate Plan

## Scope

P1A-001 is the design gate for the Desktop Observer MVP, no action. It defines
the ADR, threat model, and implementation gate that must exist before any
runtime desktop observation profile, Tauri command, screenshot metadata
boundary, App surface, evidence refs, or privacy audit is implemented.

The design target is a fixed, user-triggered observer that can later return
summary-only foreground/window/app/display metadata and optional screenshot
metadata/redaction summaries. It is not a controller and does not grant desktop
action.

## Non-goals

- No Tauri command.
- No desktop observation code.
- No screenshot capture.
- No App UI.
- No EventStore writer.
- No desktop action.
- No click/type/select.
- No clipboard write.
- No default clipboard read.
- No file dialog automation.
- No hidden background capture.
- No screen recording.
- No raw screenshot persistence by default.
- No raw OCR text persistence by default.
- No native bridge broad action.
- No sending desktop observation to a model automatically.

## Required ADR Decisions

- Observation is explicit user-triggered only.
- The observer produces summary-only metadata by default.
- Screenshot handling is limited to a future metadata/redaction boundary.
- Raw screenshot persistence is disabled by default.
- Raw OCR text persistence is disabled by default.
- Desktop observation output may become evidence refs only after redaction.
- App surfaces remain read-only and cannot trigger desktop actions.
- Observation events, if added later, must be summary-only and privacy-audited.
- All execution and mutation capabilities remain outside the observer.

## Threat Model Topics

- Assets: visible desktop metadata, window titles, app names, display metadata,
  screenshot metadata, OCR summaries, context evidence refs, and replay records.
- Trust boundaries: App Shell, Tauri command boundary, runtime validators,
  redaction audit, context assembly, agent dossier projection, and replay.
- Attacker-controlled inputs: window titles, file names, browser titles,
  visible app text, clipboard contents, prompts, and model outputs.
- Risks: hidden capture, raw screenshot leakage, OCR leakage, secret leakage,
  prompt injection through visible text, stale foreground-window metadata,
  event/replay confusion, unauthorized model forwarding, and action bypass.
- Mitigations: explicit trigger, bounded metadata schema, redaction audit,
  summary-only refs, disabled action flags, no raw screenshot/OCR persistence
  by default, no clipboard write, no hidden background capture, and no
  automatic model send.

## Implementation Gate Categories

- User consent gate: every observation must be user-triggered and visible in
  the App flow.
- Metadata boundary gate: outputs must fit fixed summary schemas.
- Screenshot boundary gate: no raw screenshot persistence by default; only
  metadata/hash/size/redaction summaries may pass.
- OCR boundary gate: no raw OCR text persistence by default.
- Secret boundary gate: API keys, credentials, raw prompts, raw source, raw
  diffs, clipboard secrets, and private window content must fail closed.
- Action boundary gate: desktop action, click/type/select, file dialog
  automation, remote control, clipboard write, and screen recording stay
  disabled.
- App boundary gate: App UI remains read-only; no approve/apply/rollback/event
  write is introduced by observer work.
- Context boundary gate: observer evidence refs are summary-only and may be
  placed into context/agent dossiers only after redaction.
- CI boundary gate: tests must prove no Tauri action command, no hidden capture,
  no raw screenshot/OCR persistence, no native bridge broad action, and no
  model auto-send.

## Tests And Docs Lock

P1A-001 should add docs-lock coverage that asserts the ADR, threat model,
implementation gate, and P1A-002 plan exist and repeat the safety boundaries:
no Tauri command, no desktop observation code, no screenshot capture, no App
UI, no desktop action, no raw screenshot persistence, no raw OCR persistence,
no Git/shell execution, no native bridge, and no desktop action automation.

## Scoped Command Policy

Run only focused docs/app checks for P1A-001:

- `git status --short`
- `git status -sb`
- `git log --oneline origin/main..HEAD`
- `pnpm lint`
- `pnpm app:test`
- `git diff --check`
- `git diff --cached --check`

Do not run full gates until the P1A RC task.

## Local Commit Workflow

Each ordinary P1A task creates a local commit and does not push, tag, or create
a GitHub Release. If unrelated dirty changes are present at task start, stop
and report instead of mixing them into the observer work.

## Completion Report Format

Report the task id, changed files, scoped checks, skipped full gates, safety
invariants, local commit hash and subject, `git status --short`, and
`git log --oneline origin/main..HEAD`.

## Next Task

DW-P1A-001 Desktop Observer ADR / Threat Model / Implementation Gate.
