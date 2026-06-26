# Runtime Approval-Gated Disposable Apply v0.5

The approval-gated disposable apply helper is a runtime-only prototype for P0J.
It is disabled by default and only runs when tests or a trusted caller pass
`gateMode: "explicit_approval_gated_disposable_apply"` with a summary-only
approval receipt.

This is an explicit disposable workspace path only; it is not a user workspace
apply path.

## Scope

- Runtime tests only.
- Explicit disposable workspace roots only.
- No user workspace apply.
- No Git or shell execution.
- No Tauri command.
- No EventStore write.
- No PermissionLease issuing.
- Output remains summary-only.

The helper validates the approval receipt and preview chain, then delegates the
actual disposable write to the existing P0J-003 disposable patch apply helper.
It does not duplicate filesystem write logic.

## Approval Receipt

The receipt is a test/prototype input, not a production PermissionLease. It must
include:

- `approvalReceiptId`
- `approvalDraftId`
- `approvedFor: "disposable_apply_only"`
- `approvedBy`
- scoped ids for proposal, validation, audit, approval draft, virtual apply, and rollback checkpoint preview
- disposable root ref
- optional max file and byte limits
- optional allowed relative paths
- `receiptHash`

The helper blocks expired receipts, id mismatches, path-scope violations, byte
or file limit violations, and any receipt that is not scoped to disposable apply
only.

## Preconditions

The helper requires summary refs for:

- Patch Proposal Creation Preview
- Patch Proposal Validation Preview
- Patch Diff Audit Preview
- Patch Approval Draft
- Patch Virtual Apply Preview
- Patch Rollback Checkpoint Preview
- Disposable Workspace Snapshot Contract
- Disposable Patch Apply input

Approval draft readiness must keep approval execution, PermissionLease issuing,
and patch apply disabled. The disposable apply input must still satisfy the
P0J-003 disposable apply path guard and secret guard.

## Output

The result includes safe counts, ids, warning codes, hashes, and an event
preview with `notWritten: true`. It never returns operation content, raw source,
raw diff, raw patch bodies, or API keys.

Readiness flags always keep production mutation disabled:

- `canApplyToUserWorkspace: false`
- `canPromoteToUserWorkspace: false`
- `canIssuePermissionLease: false`
- `canCommitGit: false`
- `canExecuteShell: false`

## Relation To P0J

- P0J-003 provides the disposable patch apply helper.
- P0J-004 provides disposable rollback.
- P0J-005 projects apply/rollback event previews without writing them.
- P0J-006 adds this approval gate for disposable apply only.

Future production PermissionLease semantics remain deferred.

## Non-Goals

- No user workspace apply.
- No EventStore write.
- No Git commit or push.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.
