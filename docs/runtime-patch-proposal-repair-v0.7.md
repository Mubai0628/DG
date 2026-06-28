# Runtime Patch Proposal Repair v0.7

The patch proposal repair loop is a deterministic runtime helper for P0L. It repairs only safe mechanical schema issues in model patch proposal drafts and then re-runs the P0L-002 schema validator.

It is not a model retry loop. It does not call DeepSeek, does not call a dry adapter client, and does not execute any proposal.

## Boundary

- Deterministic repair only.
- No model retry.
- No live DeepSeek call.
- No API key read.
- No fetch or network use.
- No file write.
- No apply or rollback.
- No EventStore write.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.

The repair helper accepts a raw candidate supplied by tests or later preview-only callers. It never reads workspace files and never writes repaired JSON to disk.

## Safe Repair Operations

The repair loop may perform mechanical repairs:

- strip markdown fences
- extract a JSON object from surrounding explanatory text
- trim trailing non-JSON noise
- close a single missing trailing brace or bracket when structurally safe
- generate missing proposal ids
- generate missing operation ids
- derive missing path summaries from operations
- add conservative risk notes or warning codes for delete, config, or content-draft proposals
- normalize a missing/current schema version
- normalize safe change-kind casing

Every repair is followed by schema validation. The result is summary-only and includes operation kinds, hashes, counts, finding codes, and readiness flags.

## Fail-Closed Rules

The repair loop must not make unsafe model output look safe.

These cases are blocked and not repaired:

- unsafe paths
- path traversal
- generated/dependency/secret paths
- secret-like markers
- raw source, raw diff, raw prompt, raw DOM, raw CSV, or raw screenshot fields
- file/preimage/backup content fields
- command, shell, Git, Tauri, EventStore, apply, rollback, PermissionLease, native bridge, or desktop action fields
- unrecoverable malformed JSON
- max repair attempts exceeded

The helper does not remove secret markers, raw fields, execution fields, or unsafe paths to pass validation.

## Output

`repairModelPatchProposalDraft()` returns:

- repair id
- source kind
- attempt count
- operation kinds
- proposal validation summary
- proposal path/hash summary
- blocker/warning/finding counts
- original and repaired hashes
- readiness flags
- next action

It does not return raw candidate text, repaired raw JSON, raw `contentDraft`, raw source, raw diff, raw prompt, raw DOM, raw CSV, API keys, or reasoning content.

`canEnterPatchProposalPreview` only means the repaired summary can enter the existing preview chain. It does not mean apply, rollback, EventStore write, App execution, Git, or shell are enabled.

## Relationship To P0L

- P0L-002 provides the schema validator used after each repair attempt.
- P0L-003 provides fake harness fixtures for safe and rejected model output.
- P0L-004 provides the dry adapter; repair can accept a safe candidate associated with a dry adapter result, but it does not call the adapter.
- Future P0L-006 App import remains preview-only and must not execute apply or rollback.

## Non-Goals

- No live adapter.
- No model retry.
- No App execution.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No native bridge.
- No desktop action.
