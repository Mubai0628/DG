# Runtime Patch Virtual Apply Preview v0.4

`buildPatchVirtualApplyPreview()` is a pure, summary-only helper for previewing
how a patch proposal would affect an in-memory metadata snapshot. It is not the
runtime patch apply path.

## Scope

- accepts patch proposal, validation, diff audit, and approval draft summaries
- accepts an optional summary-only workspace snapshot
- predicts created, updated, and deleted file counts
- predicts input and output snapshot hashes from metadata only
- emits blocker, warning, and finding counts
- emits a rollback checkpoint preview summary
- returns readiness for rollback checkpoint preview only

## Safety Boundary

The helper does not read files, write files, apply patches, generate raw diff,
execute Git, execute shell, call DeepSeek, issue a PermissionLease, write
EventStore records, or perform rollback.

Allowed snapshot fields are safe metadata such as path, language, extension,
sizeBytes, lineCount, hashPrefix, and exists. The helper rejects raw content
fields such as beforeContent, afterContent, rawSource, rawDiff, rawPatch,
rawPrompt, rawDom, rawCsv, clipboard, Authorization, API key markers, stdout,
stderr, and env values.

## Output Contract

The output includes:

- virtualApplyId
- proposalId, validationId, auditId, and approvalDraftId
- inputSnapshot and outputSnapshot summaries
- operation summaries with safe paths and line estimates
- rollbackPreview with `canRollbackReal: false`
- readiness flags with filesystem, apply, Git, and shell execution always false
- `contextPlacement: no_compress_zone`
- `source: runtime_patch_virtual_apply_preview`

Passing this preview means only that the summary is ready for a future rollback
checkpoint preview. It does not mean the patch is approved or ready to apply.

## Non-goals

- no real patch apply
- no virtual apply path that uses file content
- no filesystem read or write
- no raw source or raw diff display
- no real rollback
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no native bridge or desktop action
