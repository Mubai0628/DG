# Runtime Model Patch Proposal Schema v0.7

Status: implemented as a schema / validator layer. No model call.

## Scope

`runtime/src/models/patch-proposal-schema.ts` parses DeepSeek-style model
output into a `model_patch_proposal` draft. It accepts an object or JSON
string, validates structure, normalizes safe summary fields, and returns a
summary-only validation result.

This module is schema only. It does not call DeepSeek, does not read files,
does not write files, does not apply patches, does not rollback, and does not
write EventStore.

## Runtime Contract

The runtime helper exposes:

- `parseModelPatchProposalDraft(input)`
- `validateModelPatchProposalDraft(input)`
- `normalizeModelPatchProposalDraft(input)`
- `summarizeModelPatchProposalDraft(proposal)`

Accepted model output may include:

- schema version
- proposal id
- title
- intent
- objective summary
- operations
- path summaries
- evidence refs
- risk notes
- assumptions
- validation hints
- createdAt
- model profile id

The normalized proposal is a draft with `source:
"model_patch_proposal_draft"`. Schema ready does not mean safe to apply.

## Forbidden Fields

The validator rejects forbidden fields at any depth:

- raw source / raw diff / raw patch / raw prompt / raw DOM / raw CSV / raw
  screenshot
- before or after file content
- file content, preimage content, backup content
- API key, Authorization, env, stdout, stderr
- command, shell command, git command, child process, spawn, exec
- Tauri command
- EventStore write
- apply now / rollback now
- PermissionLease
- desktop action
- native bridge

## Path, Content, And Secret Guards

Path validation blocks:

- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- null bytes and newlines
- shell metacharacters
- URL-like or query-like paths
- `.git`
- `.env`
- `node_modules`
- `dist`
- `target`
- `.tmp`
- generated artifact paths
- secret-like filenames
- duplicate operation paths

Content validation blocks fake API key markers, Bearer tokens, Authorization
headers, private key markers, raw prompt / raw DOM / raw CSV / raw screenshot
markers, clipboard markers, over-large content drafts, and binary-looking
content drafts.

`contentDraft` is accepted only as model proposal draft text for create or
update-like operations. The normalized output does not return raw draft text.
It only returns bytes, line count, and hash prefix.

## Fixtures

Focused tests use fixtures under
`runtime/test/fixtures/model-patch-proposals/`:

- `safe-basic.json`
- `warning-content-draft.json`
- `rejected-raw-source.json`
- `rejected-unsafe-path.json`
- `rejected-secret-marker.json`

Rejected fixtures use synthetic markers only and do not contain real secrets.

## Existing Chain Integration

The schema summary can produce a draft input shape compatible with existing
Patch Proposal Creation Preview. It does not call that preview helper and does
not call any apply, rollback, EventStore, Git, shell, Tauri, native bridge, or
desktop action path.

Every accepted model proposal still must pass:

- patch proposal creation preview
- patch proposal validation preview
- diff audit
- approval draft
- virtual apply
- rollback checkpoint
- replay projection

## Relation To P0L

This implements the P0L-002 schema layer described by ADR 0007 and the P0L-002
plan. P0L-003 may add an offline fake model harness. Live DeepSeek integration
and any adapter remain deferred.

## Non-goals

- No DeepSeek call.
- No live adapter.
- No fake model harness.
- No App execution.
- No file write.
- No apply.
- No rollback.
- No EventStore writer.
- No Git or shell execution.
- No native bridge.
- No desktop action.
