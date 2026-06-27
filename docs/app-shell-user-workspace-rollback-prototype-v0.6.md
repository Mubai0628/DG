# App Shell User Workspace Rollback Prototype v0.6

The App Shell exposes a disabled-only panel for the P0K-005 user workspace
rollback prototype. The panel documents that rollback exists only for runtime
tests with explicit fixture roots.

## App Behavior

- Badge: `Disabled by default / runtime prototype only`.
- Text: the App Shell cannot rollback the user workspace.
- Disabled placeholder button: `Rollback User Workspace (disabled)`.
- No enabled rollback button.
- No preimage input.
- No approval receipt input.
- No Tauri invoke.
- No EventStore write.

The App view model is summary-only and does not import or call the runtime
rollback helper. It only displays refs and disabled-state warnings.

## Boundary

The App Shell still cannot:

- rollback the user workspace,
- apply patches,
- promote sandbox results,
- write rollback events,
- execute Git or shell,
- issue PermissionLease,
- call DeepSeek,
- use a native bridge,
- perform desktop actions.

## Relation to Runtime

Runtime tests may call
`rollbackUserWorkspaceApplyPrototype()` with explicit fixture roots and
checkpoint preimage input. The App Shell remains disconnected from that helper.

## Future Path

P0K-006 may introduce summary-only EventStore writer design. The App Shell
rollback panel remains disabled until an explicit later release gate changes
that boundary.
