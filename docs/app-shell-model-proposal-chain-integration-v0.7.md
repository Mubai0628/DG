# App Shell Model Proposal Chain Integration v0.7

Status: preview chain only / no execution.

The App Shell can project an imported `model_patch_proposal` summary into the
existing P0I/P0K validation, audit, approval, rollback, replay, and user
workspace readiness chain. This surface only connects summary refs. It does not
call a model, call the dry adapter, read API keys, fetch network resources,
write files, apply patches, rollback, approve, issue leases, write EventStore
events, or call Tauri.

## Flow

1. P0L-006 imports a pasted model proposal draft through the local repair and
   schema validator.
2. The chain integration view accepts the imported summary and optional
   downstream previews.
3. The view builds a stage timeline for:
   - Patch Proposal Creation Preview
   - Patch Proposal Validation Preview
   - Patch Diff Audit Preview
   - Patch Approval Draft
   - Patch Virtual Apply Preview
   - Patch Rollback Checkpoint Preview
   - Controlled Creation Replay Projection
   - User Workspace Snapshot / Backup Contract
   - User Workspace Promotion Readiness
   - runtime-only apply, rollback, and event writer surfaces
   - disabled App approval execution
4. The App displays stage counts, missing-stage warnings, blocker counts, hash
   refs, and readiness flags.

Blocked proposals cannot enter the chain. Warning proposals can enter only with
warning summaries and do not enable execution.

## Summary Boundary

The App may display:

- proposal id
- chain id
- stage labels and statuses
- stage counts and missing-stage counts
- warning and blocker codes
- hash prefixes
- next action text
- readiness flags that keep execution disabled

The App must not display raw source, raw diff, raw patch, raw prompt, raw DOM,
raw CSV, raw screenshots, API keys, Authorization values, environment values,
preimage content, or raw `contentDraft`. Model draft content remains summarized
as counts, hashes, and warning codes from the import and schema validation
surfaces.

## Safety Rules

- Chain integration is preview-only.
- No live model call is made.
- No dry adapter call is made.
- No API key is read.
- No fetch or network request is made.
- No file is read or written.
- No patch is applied.
- No rollback is executed.
- No App approval execution is enabled.
- No EventStore write is performed.
- No Tauri command is added or invoked.
- No Git or shell action is executed.
- Any stage claiming App execution, filesystem write, approval execution, Git,
  shell, or EventStore write readiness is blocked.

## Surface Integration

- Diff Surface may show the model chain as a summary-only ref.
- Approval Surface remains read-only and dry.
- Audit Surface may show warning and finding counts only.
- Context Assembly Preview places the model chain ref in `no_compress_zone`.
- Control Projection may consume summaries only.

No event, run, Tauri invocation, apply, rollback, or approval execution is
performed by this integration.

## Relation To P0L And P0I/P0K

- P0L-006 imports the model proposal draft as preview-only App state.
- P0L-007 projects that imported summary into the existing P0I/P0K chain.
- P0I supplies validation, diff audit, approval draft, virtual apply, rollback
  checkpoint, and replay preview surfaces.
- P0K supplies user workspace snapshot, readiness, runtime-only apply/rollback
  prototypes, and runtime-only summary event writer surfaces.

Future P0L work may deepen model proposal integration, but App execution remains
disabled until a separate release gate explicitly changes that boundary.

## Non-Goals

- No live adapter.
- No App execution.
- No DeepSeek call.
- No dry adapter call.
- No API key read.
- No fetch/network.
- No file write.
- No apply or rollback.
- No approval execution.
- No EventStore write.
- No Tauri command.
- No Git or shell.
- No native bridge.
- No desktop action.
