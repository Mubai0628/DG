# DeepSeek Patch Proposal Generation Implementation Gate v0.7

Status: required gate before any P0L-004 dry DeepSeek adapter.

Do not implement live model call until P0L-001, P0L-002, and P0L-003 gates are
satisfied. Each item below must be testable. No item may rely only on prose.

## Schema Safety

- Test that the model patch proposal schema exists and has a schema version.
- Test required ids, title, intent, path summaries, structured draft
  operations, risk notes, evidence refs, warning codes, and output hash.
- Test rejection of unknown event, execution, filesystem, raw content, and
  secret-bearing fields.
- Test deterministic normalization and hashing.
- Test duplicate ids and duplicate path refs.

## Prompt / Context Safety

- Test that prompt input uses objective summaries, workspace index summary
  refs, context assembly refs, readiness refs, allowed path refs, denied path
  refs, and policy summaries.
- Test that raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV,
  raw screenshot, clipboard, stdout, stderr, environment values, API key,
  Authorization, and preimage content are not accepted.
- Test no-compress refs for approval, diff audit, tool argument summaries,
  snapshot refs, readiness refs, rollback refs, and replay refs.
- Test that `reasoning_content` is dropped or warning-summarized and is never
  persisted as proposal content, event payload, memory, or App UI raw text.

## Model Output Safety

- Test invalid JSON is blocked or repaired only by a bounded summary-only
  repair loop.
- Test unknown schema versions are blocked.
- Test missing evidence refs are blocked.
- Test model output cannot claim approval, PermissionLease, execution, apply,
  rollback, EventStore write, Git, shell, native bridge, or desktop action.
- Test model output cannot include direct filesystem commands.

## Path / Content Safety

- Test absolute path, Windows drive-letter path, UNC path, parent traversal,
  null byte, newline, shell metacharacter, URL-like path, and query-like path
  rejection.
- Test `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated
  artifacts, and secret-like paths are rejected.
- Test fake API key, Authorization, private key, password, token, and
  credential markers are rejected.
- Test raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV,
  raw screenshot, clipboard, stdout, stderr, environment values, and preimage
  content are rejected.

## Validation / Audit Chain Safety

- Test model proposals enter patch proposal creation preview as drafts only.
- Test patch validation preview must pass before diff audit.
- Test diff audit must pass before approval draft.
- Test approval draft remains summary-only and cannot issue PermissionLease.
- Test virtual apply remains preview-only unless a later explicit runtime gate
  changes that boundary.
- Test rollback checkpoint preview is required before later apply chains.
- Test replay projection reconstructs proposal, validation, audit, approval,
  virtual apply, rollback, and event preview state.

## Approval Safety

- Test App cannot approve or reject model proposals.
- Test model output cannot set approval state.
- Test future manual confirmation refs are required before any execution phase.
- Test future PermissionLease artifacts, if any, must come from a production
  lease gate and not from model output.

## Replay Safety

- Test all model proposal state is replayable from summary-only refs.
- Test preview artifacts and persisted events remain distinguishable.
- Test replay blocks if a proposal result hash, evidence ref, or schema version
  is stale or mismatched.

## App UI Safety

- Test App Shell remains preview-only.
- Test no enabled Approve, Reject, Apply, Rollback, Write Events, Commit, or
  Execute controls are added.
- Test no Tauri invoke is added for model proposal generation.
- Test no raw model output, raw source, raw diff, raw prompt, or API key is
  displayed.

## CI / Boundary Safety

- Test boundary checker blocks App-side execution, Tauri model commands,
  EventStore writes from App, Git, shell, child_process, native bridge, and
  desktop action.
- Test secrets checker blocks model proposal fixtures with secret markers.
- Test focused P0L schema and fake harness tests pass before P0L-004.
- Test docs-lock coverage for ADR, threat model, implementation gate, and
  P0L-002 plan.

## Gate Result

P0L-004 may not start until this gate reports all required checks as passing.
If any item is missing, untestable, or only described in prose, live model calls
remain blocked.
