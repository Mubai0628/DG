# Desktop Action Expansion Implementation Gate v0.25

Do not implement or enable expanded desktop action execution until each gate
below has test evidence.

## Proposal Schema Safety

- Test accepts safe proposal-only `click_target`, `type_text`, `select_option`,
  `keyboard_shortcut`, `scroll`, and `wait_for_state` proposals.
- Test accepts clipboard and file dialog proposals only as summaries.
- Test blocks unknown action kinds.
- Test blocks execution fields such as `clickNow`, `typeNow`, `executeNow`,
  `desktopCommand`, and `nativeBridge`.

## Target Metadata Safety

- Test requires observer evidence refs.
- Test requires target metadata.
- Test blocks unsupported target kinds.
- Test warns for missing display id, window id, app id, or low confidence.

## Screen Freshness Safety

- Test blocks stale evidence beyond the configured threshold.
- Test blocks window/app mismatches.
- Test warns or blocks display, bounds, label, minimized/hidden, focus, and
  multi-monitor mismatches according to policy.

## Sensitive UI Risk Safety

- Test detects password/credential targets.
- Test detects payment/finance UI.
- Test detects delete/remove/wipe/reset actions.
- Test detects system settings and security prompts.
- Test escalates or blocks external send/post/upload actions.

## Clipboard Safety

- Test accepts content length/hash/category summaries.
- Test blocks raw clipboard text.
- Test blocks password, token, API key, copied secret, file content, command
  content, `pasteNow`, `writeNow`, and `clearNow`.

## File Dialog Safety

- Test accepts safe path refs and extension summaries.
- Test blocks absolute paths, drive paths, UNC paths, traversal, `.env`, `.git`,
  dependency/generated dirs, secret paths, `autoSelect`, `clickNow`,
  `typePathNow`, `openDialogNow`, and `nativeBridge`.

## Sequence Simulation Safety

- Test simulates action steps without execution.
- Test propagates stale target blockers.
- Test stops on sensitive or destructive UI.
- Test keeps clipboard and file dialog steps proposal-only.

## App UI Disabled / Read-only Safety

- Test proves expanded proposal surfaces are read-only.
- Test proves click/type/clipboard/file-dialog buttons are disabled.
- Test proves no Tauri invoke, EventStore write, fetch/network, or native bridge
  is added for expanded desktop actions.

## Redaction / Privacy Safety

- Test blocks raw screenshot, screenshot bytes, raw OCR, clipboard content, raw
  file dialog path, API key, password, secret, raw prompt, raw source, raw diff,
  native bridge marker, and execution flags.
- Test proves outputs are summary-only.

## CI / Boundary Safety

- `pnpm check:boundaries` keeps App fetch/live broad action, native bridge,
  Tauri command expansion, EventStore writes, Git/shell expansion, mutating MCP
  tools, arbitrary plugin/skill runtime, and broad PermissionLease blocked.
- `pnpm check:secrets` keeps API key and secret leakage blocked.
