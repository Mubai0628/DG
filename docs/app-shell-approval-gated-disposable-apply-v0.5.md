# App Shell Approval-Gated Disposable Apply v0.5

The App Shell exposes approval-gated disposable apply as a disabled-only status
surface. It shows that the runtime helper exists for explicit disposable
workspace tests, but it does not execute apply.

## App Behavior

- Shows `Approval-Gated Disposable Apply`.
- Badge: `Disabled by default / no user workspace apply`.
- Displays summary refs from the preview chain.
- Shows `Apply with Approval Gate (disabled)`.
- Does not collect approval receipts.
- Does not collect file content.
- Does not call Tauri.
- Does not write events.
- Does not issue PermissionLease.
- Does not run Git or shell.

The surface is intentionally not wired to
`applyWithDisposableApprovalGate()` or `applyPatchToDisposableWorkspace()`.

## Safety Boundary

The App Shell cannot apply to either the user workspace or a disposable
workspace in this phase. Runtime tests may exercise the helper with explicit
temporary disposable roots; the App Shell only reports disabled status and safe
summary refs.

No raw source, raw diff, patch body, approval receipt body, file content, or API
key is accepted by the App surface.

## Relation To Existing Surfaces

- P0J-003 disposable apply remains runtime-only.
- P0J-004 rollback remains runtime-only.
- P0J-005 event projection remains projection-only and not written.
- P0J-006 approval-gated apply remains disabled in App.

Future production PermissionLease and approval execution remain deferred.

## Non-Goals

- No enabled Apply button.
- No approval execution.
- No PermissionLease issuing.
- No EventStore write.
- No user workspace apply.
- No Git commit or push.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.
