# Runtime Patch Approval Draft v0.4

The runtime Patch Approval Draft helper builds a local, pure, summary-only
approval request draft from existing patch proposal creation, validation, and
diff audit summaries.

This is not approval execution. It does not approve, reject, issue a
PermissionLease, run virtual apply, apply a patch, read files, write files, call
DeepSeek, invoke tools, or write EventStore records.

## Scope

- Input: patch proposal summary, validation preview summary, and diff audit
  preview summary.
- Output: approval draft status, ids, risk levels, approval reason codes,
  blocker/warning/finding counts, disabled decision options, suggested
  conditions, scope summary, expiry preview, readiness flags, and a draft hash.
- Placement: approval draft summaries are marked for `no_compress_zone`.
- Source: `runtime_patch_approval_draft`.

## Safety

The helper rejects or blocks unsafe inputs:

- missing proposal, validation, or audit ids
- missing path summaries
- blocked validation or blocked audit summaries
- unsafe paths such as absolute paths, drive paths, UNC paths, parent traversal,
  `.git`, `.env`, generated directories, shell metacharacters, and URL/query-like
  paths
- raw content fields such as `beforeContent`, `afterContent`, raw diff/source
  fields, stdout/stderr, environment values, and clipboard-style fields
- API key, Bearer token, Authorization header, private key, raw prompt, raw DOM,
  raw CSV, raw screenshot, and similar unsafe markers
- attempts to set approved/rejected state, include a PermissionLease id, enable
  apply, enable virtual apply, or include approve/reject/apply/execute action
  markers

The output never includes raw source, raw diff, raw patch body, raw prompt,
stdout/stderr, Authorization values, API keys, or file content.

## Decision Options

Decision options are display-only labels:

- `approve_later_requires_user_action`
- `request_changes_later_requires_user_action`
- `reject_later_requires_user_action`
- `defer_later_requires_user_action`

Each option is returned with `enabled: false` and the reason:

`Approval execution is disabled in this phase.`

## Readiness

Readiness is intentionally conservative:

- `canProceedToApprovalReviewPreview` is true only when there are no blockers.
- `canApprove` is always false.
- `canReject` is always false.
- `canIssueLease` is always false.
- `canProceedToVirtualApplyPreview` is always false.
- `canApplyPatch` is always false.

Passing the draft only means the proposal is ready for a future approval review
preview. It does not mean the proposal is approved.

## Related Planes

- Patch Proposal Creation Preview provides safe path and line estimate summaries.
- Patch Proposal Validation Preview contributes validation status and findings.
- Patch Diff Audit Preview contributes audit status and readiness.
- Approval Surface can display the draft as a read-only ref.
- Context Assembly Preview can place the approval draft ref in
  `no_compress_zone`.

## Non-goals

- no approval execution
- no rejection execution
- no PermissionLease issuing
- no patch apply
- no virtual apply
- no filesystem read or write
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no native bridge
- no desktop action
