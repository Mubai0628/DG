# App Shell Sandbox Apply / Rollback Event Projection v0.5

Status: read-only projection panel.

## Scope

The App Shell adds a `Sandbox Apply / Rollback Event Projection` panel. It displays the runtime projection helper output when summary-only disposable apply and rollback result data is available.

The panel is projection only. The App Shell does not write EventStore, does not write event files, does not execute apply, does not execute rollback, does not mutate the user workspace, does not call Tauri for this panel, and does not read or write files.

## App Behavior

The panel:

- shows `Projection only / not written`
- offers `Preview Apply/Rollback Events`, which only updates React state
- shows projection status, event counts, not-written event counts, apply and rollback event counts, hash chain summary, blocker/warning/finding counts, readiness flags, event preview summaries, findings, and next action
- keeps generated event previews summary-only
- keeps readiness flags disabled

The App Shell does not import or call `applyPatchToDisposableWorkspace` or `rollbackDisposablePatchApply` from this panel.

## Surface Integration

When a projection exists, summary refs may appear in:

- Diff Surface as a read-only patch summary
- Approval Surface as a read-only dry/blocked ref when warnings or blockers exist
- Audit Surface as warning/finding codes
- Context Assembly Preview in `no_compress_zone`
- Capability Plan Preview as display-only evidence through the existing summary surfaces

No integration writes events or creates a run.

## Event Preview vs Persisted Event

Event previews are local projection data and carry `notWritten: true`. They are distinct from persisted events. The App Shell must not present them as persisted execution history unless a separate existing event summary explicitly reports persisted events.

## Safety Boundary

The App panel does not accept raw file content, checkpoint preimage content, raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV, stdout, stderr, API keys, authorization headers, or real absolute paths.

## Relation To P0J

This panel visualizes P0J-005 output after P0J-003 disposable apply summaries and P0J-004 disposable rollback summaries. It prepares users to inspect the future P0J-006 Approval-Gated Apply Path without enabling it.

## Non-Goals

- no EventStore write
- no user workspace apply
- no user workspace rollback
- no Git commit or push
- no shell execution
- no DeepSeek call
- no native bridge
- no desktop action
