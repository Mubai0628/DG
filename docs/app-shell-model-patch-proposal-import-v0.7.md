# App Shell Model Patch Proposal Import v0.7

Status: preview only / no model call.

The App Shell can accept a pasted `model_patch_proposal` JSON draft and run the
local repair/schema validation chain before showing summary-only proposal
preview data. This is an import surface only. It does not generate proposals,
call DeepSeek, read API keys, fetch network resources, write files, apply
patches, rollback, write events, or call Tauri.

## Flow

1. The user pastes a structured proposal draft into the App Shell textarea.
2. The App calls the P0L-005 deterministic repair helper.
3. The repair helper reuses the P0L-002 model patch proposal schema validator.
4. Valid or warning proposals are converted into a Patch Proposal Creation
   Preview summary input.
5. Diff, Approval, Audit, and Context Assembly surfaces receive summary refs
   only.

Blocked proposals do not enter the preview chain.

## Summary Boundary

The App may display:

- proposal id
- title and intent
- operation and file counts
- path summaries
- evidence and risk-note counts
- warning or blocker counts
- proposal hash prefix
- safe finding codes

The App must not display raw source, raw diff, raw prompt, raw DOM, raw CSV,
API keys, Authorization values, environment values, preimage content, or raw
`contentDraft`. If a draft includes `contentDraft`, only validator warning
codes, counts, and hashes may be surfaced.

## Safety Rules

- Unsafe paths are blocked.
- Secret markers are blocked.
- Raw-content fields are blocked.
- Execution fields are blocked.
- Warning proposals may enter the preview chain only as warning summaries.
- Importing a proposal does not enable apply, rollback, approval execution, or
  EventStore writes.
- The App Shell cannot call the dry adapter or a live model from this surface.

## Surface Integration

- Patch Proposal Creation Preview receives summary-only input.
- Diff Surface shows operation/path summaries without raw diff.
- Approval Surface remains read-only and dry.
- Audit Surface shows warning/finding counts only.
- Context Assembly Preview places the model import ref in `no_compress_zone`.

## Relation To P0L

- P0L-002 defines the model patch proposal schema.
- P0L-005 defines deterministic local repair and fail-closed rules.
- P0L-006 adds App import from pasted draft to preview chain only.
- Future P0L-007 can deepen model proposal integration with the existing
  P0I/P0K chain, still without App execution.

## Non-Goals

- No live adapter.
- No App execution.
- No DeepSeek call.
- No API key read.
- No fetch/network.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git or shell.
- No native bridge.
- No desktop action.
