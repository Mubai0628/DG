# End-to-End Coding Task Threat Model v0.13

## Scope

This threat model covers the P0R End-to-End Coding Task MVP:

```text
objective
-> live proposal generation
-> repair/schema validation
-> import
-> chain integration
-> validation/diff/audit/approval
-> typed confirmation
-> approved apply
-> Git/shell verification
-> summary events/replay
-> rollback if verification fails or user requests
```

## Assets

- User workspace files.
- Private checkpoint metadata.
- Human approval receipt and typed confirmation.
- Live proposal session receipt.
- Model patch proposal summaries.
- Verification summaries.
- Apply, verification, rollback, and replay summary events.
- API key source references and resolver boundary.
- Redacted usage, token, warning, and failure summaries.

## Trust Boundaries

- User objective to prompt/request boundary.
- Live DeepSeek response to local repair/schema boundary.
- Proposal preview to human approval boundary.
- Human approval to approved apply boundary.
- Workspace snapshot to apply/rollback boundary.
- Approved apply to Git/shell verification boundary.
- Verification result to replay/event boundary.
- App UI to Tauri command boundary.

## Threats

### Model Hallucination

The model may propose non-existent files, impossible edits, or claims that do
not match the workspace summary. Mitigations: schema validation, allowed path
refs, hallucinated path blockers, diff/audit preview, and human approval.

### Unsafe Patch

The proposal may attempt risky operations, generated content with secret-like
markers, or high-risk changes without evidence. Mitigations: repair fail-closed,
schema validation, risk notes, evidence coverage checks, and approval draft.

### Stale Workspace Snapshot

The workspace may change after proposal generation but before approved apply.
Mitigations: snapshot/checkpoint references, expected-before hashes, stale
snapshot blockers, and conflict recovery UX.

### Apply Conflict

The patch may no longer apply cleanly or may conflict with local changes.
Mitigations: approved apply preflight, expected-before hash checks, summary-only
conflict findings, and no mutation on mismatch.

### Verification Failure

Fixed Git/shell verification lanes may report failing status, tests, or
verification summaries. Mitigations: verification summary events, failure
recovery UX, rollback-needed state, and replay projection.

### Rollback Failure

Rollback may fail if checkpoint metadata is missing, expired, mismatched, or
unsafe. Mitigations: checkpoint requirement, typed confirmation, path safety,
rollback summary events, and blocked recovery state.

### Event Mismatch

Events could claim a stage completed without matching summary evidence.
Mitigations: stage IDs, proposal IDs, receipt IDs, checkpoint refs, event
allowlists, and replay consistency checks.

### Replay Tampering

Replay could display inconsistent or unsafe fields. Mitigations: summary-only
event payloads, allowlisted replay fields, raw payload denylist, and tests for
event/replay safety.

### Path Traversal

An attacker may attempt parent traversal, absolute paths, Windows drive paths,
UNC paths, `.git`, `.env`, `node_modules`, `dist`, `target`, or `.tmp`
mutation. Mitigations: path guard, workspace root confinement, explicit
allowed path refs, and fail-closed blockers.

### Symlink / Junction / Reparse Traversal

Windows reparse points, junctions, or symlinks may escape the intended
workspace. Mitigations: canonical path checks, no traversal through reparse
targets, and blocked mutation on suspicious path metadata.

### Secret Leakage

Proposals, events, or verification summaries may contain API key, token,
Authorization, password, private key, or fake secret markers. Mitigations:
secret marker guard, redaction audit, safe errors, and no raw output payloads.

### Raw Prompt / Response Leakage

The task flow may accidentally persist raw prompt, raw response, or
reasoning_content. Mitigations: request/response summary boundaries,
reasoning_content drop summaries, telemetry/redaction audit, and event denylist.

### Approval Bypass

The flow may try to mutate the workspace without human approval receipt or exact
typed confirmation. Mitigations: approval receipt gate, typed confirmation
gate, disabled auto-apply, and blocked App execution unless the existing
approved apply/rollback gates are satisfied.

### Arbitrary Command Injection

The flow may try to run arbitrary Git or shell commands as verification.
Mitigations: fixed Git read lanes, fixed shell verification templates, no shell
interpreter, no write commands, and command allowlist tests.

## Out of Scope

- Autonomous coding loops.
- Arbitrary Git/shell execution.
- Native bridge.
- Desktop action.
- Broad MCP/plugin/skills runtime execution.
- Production PermissionLease issuing.

## Required Mitigation Evidence

- Proposal safety tests.
- Path/content safety tests.
- Approval receipt and typed confirmation tests.
- Approved apply and rollback tests.
- Verification safe lane tests.
- Summary-only event/replay tests.
- Redaction and boundary checker tests.
