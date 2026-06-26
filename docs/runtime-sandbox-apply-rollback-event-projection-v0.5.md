# Runtime Sandbox Apply / Rollback Event Projection v0.5

Status: projection-only helper.

## Scope

`runtime/src/execution/sandbox/apply-rollback-event-projection.ts` builds a summary-only event projection from already produced Disposable Patch Apply Result and Disposable Patch Rollback Result summaries.

The helper consumes result summaries and their `eventPreview` objects as data. It does not execute apply, execute rollback, write EventStore, create an EventStore writer, run git, run shell, call DeepSeek, invoke agents or capabilities, issue PermissionLease, use a native bridge, or perform desktop action.

## Event Preview Model

Generated event envelopes are preview events only:

- `sandbox.patch_apply.previewed`
- `sandbox.patch_apply.result_previewed`
- `sandbox.patch_rollback.previewed`
- `sandbox.patch_rollback.result_previewed`
- `sandbox.apply_rollback.projection_built`

Every generated envelope has `notWritten: true`. The projection distinguishes these event previews from persisted events. Existing persisted event counts may be reported only when supplied by an existing event summary input.

## Summary-Only Envelope

Each envelope contains:

- event id, type, timestamp, schema version
- related ids for apply, rollback, checkpoint, proposal, validation, audit, approval draft, virtual apply, and snapshot contract
- operation counts and file counts
- byte totals
- warning and blocker counts
- hash prefixes
- disposable root display ref

Envelopes must not contain file content, checkpoint preimage content, raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV, stdout, stderr, API keys, authorization headers, or real absolute paths.

## Validation

The helper blocks:

- forbidden raw-content fields
- fake API key, bearer token, authorization header, private key, raw prompt, raw DOM, raw CSV, raw screenshot, and clipboard markers
- apply results that claim user-workspace apply readiness
- rollback results that claim user-workspace rollback readiness
- missing required apply or rollback ids
- rollback apply id mismatch
- disposable root ref mismatch
- input event previews with `notWritten: false`
- unknown event preview types
- readiness flags that attempt EventStore write, apply execution, rollback execution, git execution, or shell execution

Warnings cover partial projections, missing snapshot contract, missing rollback checkpoint preview, apply/rollback warning status, and not-written-only event chains.

## Readiness

Runtime output always keeps:

- `canWriteEventStore: false`
- `canExecuteApply: false`
- `canExecuteRollback: false`
- `canApplyToUserWorkspace: false`
- `canExecuteGit: false`
- `canExecuteShell: false`

`projection_ready` means the apply and rollback summaries form a consistent summary chain. It does not mean events were persisted, apply is enabled, rollback is enabled, or user workspace mutation is allowed.

## Relation To P0J

This helper follows P0J-003 Disposable Patch Apply Prototype and P0J-004 Disposable Patch Rollback Prototype. Those helpers may produce sandbox-only result summaries; this helper projects those summaries into a local event-preview chain.

P0J-006 Approval-Gated Apply Path remains future work. It must not treat this projection as persisted approval, persisted execution, or production mutation authority.

## Non-Goals

- no EventStore write
- no EventStore writer
- no apply execution
- no rollback execution
- no user workspace apply
- no user workspace rollback
- no Git commit or push
- no shell execution
- no DeepSeek call
- no native bridge
- no desktop action
