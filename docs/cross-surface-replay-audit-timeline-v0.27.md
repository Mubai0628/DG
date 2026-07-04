# Cross-surface Replay / Audit Timeline v0.27

The cross-surface replay/audit timeline projects summary refs from the fixed
workflow into a read-only audit chain. It is not an execution replay.

## Timeline Stages

- objective
- proposal
- agent route
- knowledge recall
- MCP evidence
- plugin/skill metadata
- desktop observer
- desktop proposal
- desktop approved action
- workspace apply
- verification
- rollback
- final audit

## Runtime Helper

`runtime/src/workflows/cross-surface-replay-audit.ts` validates timeline refs,
blocks raw or executable fields, reports missing critical stages, and produces a
summary-only timeline hash.

The helper does not:

- replay execution;
- re-run actions;
- write EventStore events;
- show raw content;
- show raw screenshot or OCR;
- show raw stdout/stderr;
- apply patches or rollback;
- execute desktop actions, Git, or shell commands.

## App Surface

The App Shell exposes a Cross-surface Replay Audit Timeline panel. It accepts
pasted summary-only timeline refs and only updates React state. The disabled
placeholders `Replay Execution (disabled)` and `Re-run Actions (disabled)` make
the non-execution boundary explicit.

## Fail-closed Rules

Timeline refs are blocked when they contain raw event payloads, raw prompt,
source, diff, screenshot/OCR, stdout/stderr, command fields, secrets, or
execution readiness claims.

Warnings are emitted for missing critical stages. Warnings do not enable replay
or action execution.

## Relation to P1F

P1F-007 consumes summaries from the workflow planner, evidence integration, and
approved sequencer. It prepares the audit projection needed by P1F-008 smoke QA
and P1F-009 RC release notes without expanding App execution.
