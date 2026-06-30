# App Live Proposal Generation Implementation Gate v0.12

Status: P0Q gate artifact. Do not implement App live proposal generation until
the relevant checklist items are covered by code, focused tests, and boundary
checks.

Every item below must be testable. No item may rely only on prose.

## API Key Boundary

- Test App cannot pass raw API key values.
- Test App cannot render API key input as a password or token value field.
- Test Tauri command accepts only policy/source refs and injected resolver
  outputs.
- Test command output never includes raw API key, Authorization, Bearer, token,
  env value, or vault secret value.
- Boundary checker blocks App-side API key reads.

## Session Receipt Boundary

- Test live proposal command requires a session receipt.
- Test receipt scope must be `proposal_generation_only`.
- Test receipt is not a PermissionLease.
- Test expired receipt blocks.
- Test objective, model profile, workspace ref, and policy ref mismatches block.
- Test receipt cannot authorize apply, rollback, Git, shell, EventStore write,
  native bridge, or desktop action.

## Request Boundary

- Test request is summary-only.
- Test rawPrompt, promptText, rawSource, rawDiff, preimage, stdout, stderr,
  env, and API key fields are blocked.
- Test tools and tool_choice are absent.
- Test request includes response format `model_patch_proposal`.
- Test request includes noExecution, noFileWrite, noApply, noRollback,
  noEventStoreWrite, and noGitShell flags.

## Response Schema Boundary

- Test response must parse to structured `model_patch_proposal`.
- Test malformed response blocks.
- Test response with command, gitCommand, shellCommand, tauriCommand,
  eventStoreWrite, applyNow, rollbackNow, permissionLease, nativeBridge, or
  desktopAction blocks.
- Test response with raw prompt, raw response, raw source, raw diff, preimage,
  API key, Authorization, token, or secret marker blocks.

## Repair Fail-Closed Boundary

- Test safe mechanical JSON repair may proceed to schema validation.
- Test unsafe path cannot be repaired into a safe path.
- Test secret markers, raw content, and execution fields remain blockers.
- Test repair failure blocks.
- Test repair warnings are preserved as summary codes only.

## Redaction Boundary

- Test raw model response is not returned to UI.
- Test reasoning_content is dropped and only boolean/count summary is returned.
- Test API key resolver and transport errors are redacted.
- Test usage summary contains numeric fields only.
- Test event summaries contain no raw prompt, raw response, source, diff,
  preimage, stdout/stderr, or API key material.

## App UI Boundary

- Test UI requires explicit user confirmation before live call.
- Test UI shows proposal generation as opt-in only.
- Test UI does not show raw prompt, raw response, reasoning_content, API key,
  raw source, or raw diff.
- Test generated proposal enters import/chain preview only.
- Test App controls do not imply auto-apply or autonomous execution.

## No Auto-Apply Boundary

- Test live proposal generation result does not call approved apply.
- Test live proposal generation result does not call rollback.
- Test apply remains available only through v0.11 human approval, exact typed
  confirmation, path/content gates, checkpoint, and summary event gates.
- Test generated proposal does not create PermissionLease.

## No Git / Shell Boundary

- Test live proposal generation does not execute Git.
- Test live proposal generation does not execute shell.
- Test Git write commands remain absent.
- Test arbitrary shell remains absent.
- Test verification lanes remain fixed safe lanes only.

## CI / Boundary Checker Gate

- Focused tests must cover receipt, command, redaction, import, event, replay,
  and failure states.
- Boundary checker must continue to block App fetch/network outside the approved
  Tauri command path.
- Boundary checker must block new Tauri commands outside the approved live
  proposal command names.
- Boundary checker must block raw EventStore payload fields.
- `pnpm app:test`, focused runtime/app tests, `pnpm check:boundaries`, and
  `pnpm check:secrets` must pass before RC.
