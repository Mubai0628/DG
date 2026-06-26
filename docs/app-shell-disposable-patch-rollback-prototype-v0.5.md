# App Shell Disposable Patch Rollback Prototype v0.5

Status: disabled view only.

## Scope

The App Shell now shows a `Disposable Patch Rollback Prototype` panel that reflects the runtime rollback helper boundary without connecting execution.

The panel says `Disabled by default / disposable workspace only` and has no enabled rollback control. The placeholder rollback button is disabled and aria-disabled.

## App Behavior

The App Shell:

- does not call `rollbackDisposablePatchApply`
- does not accept checkpoint preimage content
- does not accept a real disposable root path
- does not invoke Tauri
- does not write EventStore
- does not read or write files
- does not rollback the user workspace
- does not execute git, shell, agents, capabilities, DeepSeek, native bridge, or desktop actions

The App adapter only summarizes whether the preview chain has refs for:

- snapshot contract
- disposable apply result
- patch proposal
- validation
- diff audit
- approval draft
- virtual apply
- rollback checkpoint

## Safety Boundary

Runtime tests may opt into explicit disposable rollback. The production App Shell remains disconnected from that helper. User workspace rollback remains deferred.

## Relation To P0J

This panel documents the P0J-004 boundary while preserving the P0I/P0J preview chain. Apply / rollback event projection is not implemented here and remains a P0J-005 concern.

## Non-Goals

- no enabled rollback button
- no user workspace rollback
- no Git commit or push
- no shell execution
- no DeepSeek call
- no raw output
- no EventStore write
- no native bridge
- no desktop action
