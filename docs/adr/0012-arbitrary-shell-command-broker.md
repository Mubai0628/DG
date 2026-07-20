# ADR 0012: Arbitrary Shell / Command Broker

## Status

Accepted for the P1N command broker design gate.

## Context

v0.35 added raw transcript and output persistence with redaction, replay, audit,
retention, export, and delete boundaries. It did not enable arbitrary shell,
automatic command execution, recursive delete, Git commit or push, autonomous
loops, or full access execution.

Future work needs a command broker so every non-fixed verification shell path
has one auditable entry point. The broker must be permission-mode-gated and must
reuse the transcript pipeline before any broader command execution is exposed.

## Decision

The Command Broker is the only entry point for every non-fixed verification
shell command.

Every command execution request must pass:

- permission mode
- session lease
- risk budget
- command policy decision
- dangerous command classifier
- transcript policy
- kill switch

Approval Mode remains limited to fixed safe lanes.

Autonomous Safe Mode may allow allowlisted verification commands only.

Advanced Workspace Mode may allow workspace-scoped arbitrary shell only after
policy, scope, lease, classifier, transcript, and kill switch gates pass.

Full Access Mode is modeled in P1N, but it is not enabled by default.

The Command Broker must not execute apply, recursive delete, Git commit, Git
push, or autonomous loop actions.

All command output must enter the transcript pipeline. Event Log and Replay
record summary-only command and transcript events. Raw output may be persisted
only when transcript policy has explicit raw opt-in.

## Non-goals

- No command broker implementation in P1N-001.
- No runtime command execution in P1N-001.
- No Tauri command execution in P1N-001.
- No App command execution in P1N-001.
- No arbitrary shell in P1N-001.
- No auto apply.
- No recursive delete.
- No Git commit or push.
- No autonomous loop.
- No full access execution.
- No network or fetch.
- No API key read.
- No native bridge expansion.
- No broad desktop action.

## Command Boundary

Future command requests must be structured data, not raw shell strings flowing
through the App. They must include command intent, working directory scope,
permission mode, session lease ref, risk budget ref, transcript policy ref,
timeout, output bounds, and kill switch ref.

The broker must reject hidden execution, ambiguous shells, background processes,
unbounded output, unsafe working directories, raw secret inputs, and command
requests that bypass transcript capture.

## Mode Boundary

- Approval Mode: fixed safe lanes only.
- Autonomous Safe Mode: allowlisted verification commands only.
- Advanced Workspace Mode: workspace-scoped arbitrary shell may be allowed by
  future gates.
- Full Access Mode: modeled but disabled by default.
- Break-glass: out of scope until future gates explicitly define it.

## Transcript Boundary

Command stdout, stderr, exit summaries, duration, truncation, redaction counts,
and warning codes must flow into transcript records. Replay and EventStore
surfaces use summary-only projections.

Raw output persistence remains denied by default and requires transcript policy
raw opt-in.

## Required Gates Before Implementation

- Permission mode gate exists.
- Session lease gate exists.
- Command request schema gate exists.
- Dangerous command classifier gate exists.
- Environment safety gate exists.
- Working directory safety gate exists.
- Timeout and kill switch gate exists.
- Output bound gate exists.
- Transcript capture and redaction gate exists.
- Event and replay summary gate exists.
- App UI safety gate exists.
- CI and boundary checker gate exists.

Do not implement Tauri command execution until P1N-002/P1N-003/P1N-004 gates are
satisfied.

## Consequences

P1N makes the route to arbitrary shell slower, but it keeps command execution
centralized, auditable, permission-mode-gated, transcript-backed, and easier to
test. It also preserves the fixed safe lanes while keeping high-risk execution
disabled until explicit future gates prove the boundary.
