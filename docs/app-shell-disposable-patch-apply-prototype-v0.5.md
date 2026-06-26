# App Shell Disposable Patch Apply Prototype v0.5

Status: disabled view only.

## Scope

The App Shell now shows a `Disposable Patch Apply Prototype` panel that reflects the runtime helper boundary without connecting execution. It is a status and education surface only.

The panel says `Disabled by default / disposable workspace only` and has no enabled apply control. The placeholder button is disabled and aria-disabled.

## App Behavior

The App Shell:

- does not call `applyPatchToDisposableWorkspace`
- does not accept patch operation content
- does not accept a real disposable root path
- does not invoke Tauri
- does not write EventStore
- does not read or write files
- does not mutate the user workspace
- does not execute git, shell, agents, capabilities, DeepSeek, native bridge, or desktop actions

The App adapter only summarizes whether the preview chain has refs for:

- snapshot contract
- patch proposal
- validation
- diff audit
- approval draft
- virtual apply
- rollback checkpoint

## Safety Boundary

Runtime tests may opt into explicit disposable apply. The production App Shell remains disconnected from that helper. User workspace mutation remains deferred.

## Relation To P0J

This panel documents the P0J-003 boundary while preserving the P0I/P0J preview chain. Real rollback is not implemented here and remains a P0J-004 concern.

## Non-Goals

- no enabled apply button
- no user workspace apply
- no Git commit or push
- no shell execution
- no DeepSeek call
- no EventStore write
- no native bridge
- no desktop action
