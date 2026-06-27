# Runtime User Workspace Promotion Readiness v0.6

The User Workspace Promotion Readiness helper is a summary-only readiness checker
for the P0K promotion gate. It evaluates whether disposable
apply/rollback summaries, event projection summaries, patch preview summaries,
and the metadata-only user workspace snapshot/backup contract are complete
enough to feed a future P0K-004 runtime prototype.

It does not promote anything. It does not read user workspace files, write user
workspace files, create backups, capture preimage content, apply patches,
execute rollback, write EventStore events, invoke Git or shell, call DeepSeek,
issue a PermissionLease, or enable App execution.

## Required Artifacts

The readiness chain requires summary refs for:

- User Workspace Snapshot / Backup Contract
- Disposable Patch Apply Result
- Disposable Patch Rollback Result
- Sandbox Apply / Rollback Event Projection
- Patch Proposal Validation Preview
- Patch Diff Audit Preview
- Patch Approval Draft
- Patch Rollback Checkpoint Preview

Optional evidence may include Patch Proposal Creation Preview, Patch Virtual
Apply Preview, and Approval-Gated Disposable Apply. Missing optional evidence
can produce warning findings, but it does not create an execution path.

## Gates

The runtime output includes these gates:

- `user_workspace_snapshot_contract`
- `disposable_apply_result`
- `disposable_rollback_result`
- `apply_rollback_event_projection`
- `patch_validation`
- `patch_diff_audit`
- `patch_approval_draft`
- `rollback_checkpoint_preview`
- `backup_preimage_requirement`
- `manual_confirmation_deferred`
- `production_permission_lease_deferred`
- `app_execution_disabled`

`readiness_ready` means the metadata chain has no blocker findings and may feed
future P0K-004 design/prototype work. It does not mean user workspace apply is
enabled.

## Validation

The helper blocks:

- missing or blocked user workspace snapshot/backup contract
- contract readiness that cannot proceed
- missing source workspace fingerprint or user workspace root ref
- missing disposable apply or rollback summaries
- disposable apply not `applied_to_disposable`
- disposable rollback not `rolled_back_disposable`
- apply/rollback id or disposable root ref mismatch
- missing or blocked sandbox apply/rollback event projection
- event previews with `notWritten: false`
- missing expected user snapshot hash or disposable output hash
- expected hash mismatches between the user contract and disposable apply
- missing patch validation, diff audit, approval draft, or rollback checkpoint
- raw content fields, raw prompt/DOM/CSV/diff markers, API key markers,
  authorization markers, private key markers, real absolute paths, backup file
  paths, stdout/stderr, and environment fields
- attempts to set user apply, filesystem write, rollback, Git, shell,
  PermissionLease, EventStore, or App execution readiness flags to true

The helper may warn about optional evidence, existing contract warnings,
disposable apply/rollback warnings, event projection warnings, deferred
preimage capture for backup requirements, binary files, source mutation without
test summaries, and future confirmation/PermissionLease work remaining
deferred.

## Output

The output includes only summary data:

- status and readiness id
- chain id
- gate counts and artifact counts
- artifact refs
- gates
- findings
- blocker, warning, and finding counts
- expected hash prefixes
- fixed-false execution readiness flags
- readiness hash
- next action
- source: `runtime_user_workspace_promotion_readiness`

It never includes raw source, raw diff, raw patch content, preimage content,
backup content, raw prompt, or API keys.

## Readiness Flags

All execution flags remain false:

- `canApplyToUserWorkspace: false`
- `canWriteFilesystem: false`
- `canRollbackUserWorkspace: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `canIssuePermissionLease: false`
- `appCanExecute: false`

Only `canProceedToUserWorkspaceApplyPrototype` may become true, and only when
there are no blockers. That flag means "ready for future prototype design",
not "ready to write the user workspace".

## Relation To P0K

This helper sits after P0K-002 User Workspace Snapshot / Backup Contract and
before the future P0K-004 User Workspace Apply Prototype. It implements the
promotion gate readiness check described by ADR 0006 without introducing user
workspace mutation.

Future work remains disabled by default:

- user workspace apply prototype
- user workspace rollback prototype
- real backup/preimage capture
- EventStore writer for real promotion results
- production PermissionLease issuance
- App-side approval execution
