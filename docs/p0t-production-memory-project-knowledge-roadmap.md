# P0T Production Memory / Project Knowledge Roadmap

Status: planned after `v0.15.0-mvp-hardening-recovery-rc.1`.

## Goal

P0T moves the existing Memory Core preview ideas into a narrow production
project knowledge MVP.

The goal is a workspace-local, persistent, summary-only, auditable knowledge
store that can support later coding tasks without expanding execution
authority.

## Memory Types

P0T supports exactly three project knowledge entry types:

- `policy`
- `project_fact`
- `pitfall`

Policy memory requires a human-approved trusted source. Project facts require
evidence refs. Pitfalls require a trigger summary and mitigation summary.

## Commit Gate

All project knowledge must pass this lifecycle:

```text
candidate
-> human review
-> commit
-> recall
-> revoke
-> expire
-> replay
```

No model output, tool output, external source, or automatic workflow may commit
long-term memory directly. They may only propose summary-only candidates for
human review.

## Project Knowledge Store

The project knowledge store must be:

- summary-only.
- persistent.
- workspace-local under `.deepseek-workbench`.
- auditable.
- replayable.
- revocable and expirable.
- free of raw prompt, raw source, raw diff, raw CSV, raw DOM, raw screenshot,
  raw response, reasoning_content, API key, Authorization, Bearer, private key,
  preimage, backup content, stdout, or stderr.

## App Scope

The App may:

- review memory candidates.
- commit human-reviewed candidates.
- revoke entries with typed confirmation.
- expire entries with a reason summary.
- view recall summaries.
- show replay and redaction audit state.

The App must not:

- automatically commit memory.
- let a model directly write policy memory.
- let a tool or external source directly write policy memory.
- trigger apply or rollback from memory recall.
- expand Git/shell authority.
- enable native bridge or desktop action.

## Recommended Tasks

### P0T-001 Production Memory ADR / Threat Model / Implementation Gate

- Document the production memory strategy.
- Threat model poisoning, leakage, stale facts, wrong policy persistence, and
  replay mismatch.
- Define testable implementation gates.

### P0T-002 Project Knowledge Store Contract + Schema

- Implement runtime schema, validator, snapshot builder, and summary helpers.
- Define the logical store contract without adding App write commands yet.

### P0T-003 Tauri Project Knowledge Store Commands

- Add fixed Tauri commands for list, commit candidate, revoke, and expire.
- Persist summary-only records in the workspace-local store.

### P0T-004 App Project Knowledge Review / Commit / Revoke Surface

- Add the human-reviewed App surface for project knowledge.
- Require confirmation for policy and knowledge commits.
- Keep raw fields and automatic commits blocked.

### P0T-005 Project Knowledge Recall Integration into E2E Context

- Recall committed project facts and pitfalls into later coding task context.
- Permit policy recall only from human-reviewed trusted sources.
- Keep recall summary-only and non-executing.

### P0T-006 Memory Events / Replay / Redaction Audit

- Make knowledge commit, revoke, expire, and recall events replayable.
- Add redaction audit for raw or secret markers.

### P0T-007 Knowledge-Informed E2E Coding Task Smoke

- Prove a committed pitfall can inform a later E2E task without unsafe memory
  writes or execution expansion.

### P0T-008 RC Release

- Run full gates.
- Push main, tag, wait for GitHub Actions, and create the GitHub prerelease.

## Deferred

P0T explicitly defers:

- Automatic memory commit.
- Model-direct policy write.
- Tool-direct policy write.
- External-source direct policy write.
- Memory-triggered apply.
- Memory-triggered rollback.
- Arbitrary Git command execution.
- Arbitrary shell command execution.
- Broad PermissionLease issuance.
- MCP/plugin/skills runtime execution.
- Native bridge.
- Desktop action.
- Raw prompt/source/diff/API key memory.

## Next Task

Start with `DW-P0T-001 Production Memory ADR / Threat Model / Implementation
Gate`.
