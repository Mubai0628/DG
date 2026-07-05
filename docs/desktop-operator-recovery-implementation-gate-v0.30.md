# Desktop Operator Recovery Implementation Gate v0.30

Do not implement or enable desktop operator recovery hardening until each gate
below has test evidence.

## Observation Freshness

- Test blocks observations older than the configured freshness window.
- Test compares created/evaluated timestamps without reading screen content.
- Test blocks stale screenshot and stale target metadata summaries.
- Test keeps raw screenshots and OCR out of output.

## Target Identity

- Test blocks window id mismatch.
- Test blocks app id mismatch.
- Test blocks title hash mismatch.
- Test blocks display id mismatch.
- Test warns or blocks bounds and monitor topology drift according to policy.
- Test blocks foreground/focus mismatch for action readiness.

## Focus / Window Consistency

- Test detects focus lost before action.
- Test detects focus lost after action.
- Test detects window closed, app crashed, user interruption, timeout, unknown
  platform result, permission revocation, and sensitive target transition.
- Test proves no automatic retry is exposed.

## Interruption Detection

- Test summarizes action uncertainty without claiming success.
- Test blocks interrupted or ambiguous results from entering ready execution
  state.
- Test proves replay cannot re-execute interrupted actions.

## Undo / Compensation Summary

- Test returns `no_safe_undo` when no bounded compensation is available.
- Test keeps refocus, restore selection, clear pending text, re-observation,
  and linked workspace rollback as summary recommendations only.
- Test requires manual review for high-risk compensation.
- Test proves no Tauri command, EventStore write, apply, rollback, retry, or
  undo execution is triggered.

## Replay Completeness

- Test requires observer evidence refs.
- Test requires action proposal ids.
- Test requires approval receipt summaries.
- Test requires execution result summaries.
- Test requires recovery summaries when mismatch or interruption is present.
- Test proves replay projections are summary-only and cannot execute actions.

## Privacy / Redaction

- Test blocks raw screenshot, screenshot bytes, raw OCR, raw target text, raw
  clipboard, raw prompt, raw source, raw diff, API key, password, secret,
  native bridge marker, and execution flags.
- Test proves redaction summaries include counts and hashes only.

## App UI Disabled / Explicit Boundaries

- Test proves Desktop Operator Recovery surfaces are read-only.
- Test proves retry and undo buttons are disabled placeholders.
- Test proves no Tauri invoke, EventStore write, fetch/network, clipboard
  write, file dialog automation, native bridge, or desktop action execution is
  added by the App recovery surface.

## CI / Boundary Checks

- `pnpm check:boundaries` keeps App live broad action, Tauri command expansion,
  EventStore writes, Git/shell expansion, native bridge, mutating MCP tools,
  arbitrary plugin/skill runtime, and broad PermissionLease blocked.
- `pnpm check:secrets` keeps API key and secret leakage blocked.
