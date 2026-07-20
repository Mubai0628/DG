# P1N Arbitrary Shell / Command Broker Roadmap

Status: planned after `v0.35.0-raw-transcript-output-persistence-rc.1`.

## Goal

P1N builds a permission-mode-gated command broker on top of the v0.35
transcript persistence foundation.

Fixed safe lanes remain unchanged. Arbitrary shell is allowed only inside
advanced workspace or full access scope, and only when policy, request, danger
classification, transcript capture, kill switch, and replay boundaries agree.

Command output must enter the transcript pipeline. Events and replay remain
summary-only.

P1N does not enable auto apply, recursive delete, Git commit or push,
autonomous loops, or full access by default.

## Recommended Tasks

### P1N-001 ADR / Threat Model / Gate

- Design the command broker boundary.
- No implementation.
- No command execution.
- Define explicit gates before runtime or App execution exists.

### P1N-002 Command Request / Policy Schema

- Add runtime request, policy, and readiness schema.
- No command execution.
- No Tauri execution.

### P1N-003 Dangerous Command Classifier

- Classify shell and command risks across platforms.
- Block recursive delete, Git push, destructive shell, secrets, and policy
  bypass patterns unless explicitly allowed by future gates.

### P1N-004 Runtime Command Broker, No Tauri Execution

- Add mode-gated runtime broker planning and simulated summaries.
- No Tauri command execution yet.
- Output goes through transcript summaries.

### P1N-005 Fixed Tauri Command Broker

- Add bounded fixed command broker command only.
- No arbitrary shell from App.
- Capture redacted transcript summaries.

### P1N-006 App Command Surface + Kill Switch

- Add an App command broker surface with disabled or gated controls.
- Expose kill switch status.
- No hidden command execution.

### P1N-007 Transcript Events / Replay / Redaction

- Connect command transcript summaries to events, replay, and redaction audit.
- Keep replay summary-only.

### P1N-008 Smoke / Hardening

- Cover safe lanes, denied dangerous commands, transcript capture, kill switch,
  and boundary checks.

### P1N-009 RC Release

- Polish docs and UI copy.
- Run full gates only at the RC boundary.
- Push, tag, and create prerelease only after gates pass.

## Deferred

P1N explicitly defers:

- No auto apply.
- No recursive delete.
- No Git commit or push.
- No autonomous loop execution.
- No full access by default.
- No broad native bridge expansion.
- No mutating MCP tool execution.
- No arbitrary plugin or skill runtime.
- No broad desktop action.

## Next Task

Start with `DW-P1N-001 Arbitrary Shell / Command Broker ADR + Threat Model + Implementation Gate`.
