# P1M Raw Transcript / Output Persistence Roadmap

Status: planned after `v0.34.0-permission-mode-execution-policy-rc.1`.

## Goal

P1M builds the raw transcript and output persistence foundation for future
command broker, autonomous loop, and full access audit milestones.

The transcript layer must be redacted by default and raw opt-in only. Raw
output is opt-in only.
There is no new command execution.
P1M must not add new command execution, arbitrary shell, autonomous loop, or
full access execution.

Transcripts support future audit, replay, retention, export, delete, and
redaction review flows. A transcript record being stored does not authorize
execution.

## Recommended Tasks

### P1M-001 Raw Transcript ADR / Threat Model / Gate

- Design only.
- No transcript storage implementation.
- No command execution.
- Define raw opt-in, redaction, retention, deletion, export, and audit gates.

### P1M-002 Transcript Store Schema

- Define redacted-by-default transcript records.
- Define raw output opt-in metadata.
- Define summary-only output contracts.
- No command execution.

### P1M-003 Transcript Capture / Redaction Pipeline

- Build runtime capture, redaction, validation, and summarization helpers.
- No shell execution.
- No raw output persistence without explicit policy.

### P1M-004 Tauri Transcript Store Commands

- Add narrow transcript store commands only.
- No command execution.
- No command broker.

### P1M-005 App Transcript Viewer

- Add read-only transcript viewer and redaction review surface.
- No command execution from App.
- No raw output display by default.

### P1M-006 Retention / Export / Delete Policy

- Define retention, export, delete, and tombstone policy.
- Keep delete/export scoped to transcript records.
- No workspace mutation.

### P1M-007 Transcript Events / Replay / Redaction Audit

- Integrate transcript summaries with replay and redaction audit.
- Do not persist raw secrets or raw command output by default.

### P1M-008 Transcript Smoke / Regression

- Add smoke and regression coverage for transcript boundaries.
- Prove no high-privilege execution was opened.

### P1M-009 v0.35 RC Polish + Release

- Polish docs, copy, and release notes.
- Run full gates only at the RC boundary.
- Push, tag, and create prerelease only after gates pass.

## Deferred

P1M explicitly defers:

- Arbitrary shell.
- Auto command execution.
- Auto apply.
- Recursive delete.
- Git commit or push.
- Autonomous loop.
- Full access execution.
- Broad native bridge expansion.
- Mutating MCP tool execution.
- Arbitrary plugin or skill runtime.
- Broad desktop action.

## Next Task

Start with `DW-P1M-001 Raw Transcript / Output Persistence ADR + Threat Model + Implementation Gate`.
