# ADR 0011: Raw Transcript / Output Persistence

## Status

Accepted for the P1M raw transcript design gate.

## Context

The v0.34 prerelease established Permission Mode and Execution Policy metadata
without enabling full access, arbitrary shell, automatic command execution,
auto apply, recursive delete, Git writes, autonomous loops, or raw transcript
persistence.

Future command broker, autonomous loop, and full access work will need durable
audit evidence for prompts, model output, command output, redaction decisions,
retention, export, deletion, and replay. That foundation must exist before any
broader execution path is considered.

## Decision

Transcript persistence must be redacted summary-only by default.

- Raw output can be persisted only through explicit opt-in.
- Raw transcript access is not Full Access.
- Raw transcript storage must not automatically enable shell.
- Raw transcript storage must not automatically enable command execution.
- Raw transcript records must support retention, delete, and export policy.
- Raw transcript records must accept redaction audit.
- Raw transcript storage must bind records to session, workspace, permission
  mode, and risk level metadata.
- Transcript events remain summary-only.
- Replay defaults to summaries and does not display raw transcript content.
- Raw view must be gated, warning-heavy, scoped, and revocable.

## Non-goals

- No transcript store implementation in P1M-001.
- No Tauri transcript command in P1M-001.
- No App transcript viewer in P1M-001.
- No arbitrary shell.
- No command broker.
- No automatic command execution.
- No auto apply.
- No recursive delete.
- No Git commit or push.
- No autonomous loop.
- No full access execution.
- No network or fetch.
- No API key read.
- No native bridge expansion.
- No broad desktop action.

## Redacted-by-default Contract

Default transcript artifacts may contain safe summaries such as counts, hashes,
warning codes, redaction counts, retention state, and replay refs. They must not
contain raw prompt, raw response, reasoning_content, raw stdout, raw stderr, raw
source, raw diff, raw CSV, raw DOM, API key, Authorization value, token, or
password.

## Raw Opt-in Contract

Raw opt-in must be explicit, visible, scoped, time-limited, audited, and denied
by default. Raw opt-in can allow a future raw view or future raw export, but it
does not grant command execution, apply, rollback, Git write, shell execution,
native bridge, desktop action, autonomous loop, or full access execution.

## Required Gates Before Implementation

- Schema safety gate exists.
- Redaction safety gate exists.
- Raw opt-in safety gate exists.
- Storage safety gate exists.
- Retention/delete/export safety gate exists.
- App viewer safety gate exists.
- Replay safety gate exists.
- CI/boundary safety gate exists.

## Blocking Rules

Do not implement arbitrary shell until transcript storage and redaction gates
pass.

Do not implement autonomous loop until transcript replay and retention gates
pass.

## Consequences

P1M slows down the path to command execution, but it gives future higher-risk
features a common audit substrate. Later execution work can reference transcript
policy instead of inventing raw output persistence after the fact.
