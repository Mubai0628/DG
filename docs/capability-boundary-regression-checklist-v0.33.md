# Capability Boundary Regression Checklist v0.33

Use this checklist whenever the v1 candidate branch changes capability,
permission, EventStore, or desktop surface code.

## Category Regression

- Enabled capabilities stay bounded to their named caller.
- Approved-only capabilities require approval receipts before mutation.
- Runtime-only explicit helpers are not reachable from the App Shell by default.
- Read-only lanes do not write files, EventStore entries, or external state.
- Preview-only lanes do not execute.
- Simulation-only lanes do not call live providers, transports, or real tools.
- Disabled lanes remain unavailable.
- Deferred lanes remain documented and blocked.

## Required Capability Checks

- `web_table_to_csv` remains the only baseline conversion flow.
- Record Draft Event remains the only App/Tauri local summary-event write path
  outside approved execution surfaces.
- App approved apply and rollback require receipts and exact typed confirmation.
- Git read lane remains read-only; Git commit, push, reset, checkout, and
  arbitrary args stay blocked.
- Shell verification lane remains fixed-template only; install, network,
  destructive, and arbitrary commands stay blocked.
- Project Knowledge commit/revoke/recall remains human-reviewed and
  summary-only.
- MCP discovery and read-only tool calls remain allowlisted, bounded, and
  summary-only.
- MCP mutating tools remain disabled.
- Plugin and skill metadata scan remain read-only.
- Plugin execution and skill runtime execution remain disabled.
- Skill simulation remains fixed and summary-only.
- Fixed agent route remains preview-only.
- Dynamic agent bidding remains disabled.
- Desktop observer remains user-triggered and summary-only.
- Desktop focus/raise/activate and desktop safe click/type remain approved-only.
- Clipboard write, file dialog automation, drag/drop, native bridge, and
  MCP/plugin broad execution remain disabled.

## Raw Data Regression

- No raw prompt.
- No raw source.
- No raw diff.
- No raw model response.
- No raw reasoning content.
- No raw DOM, raw CSV, raw screenshot, clipboard content, file dialog content,
  API key, Authorization value, token, or secret.

## Command Gate

```powershell
pnpm lint
pnpm app:test
pnpm check:boundaries
git diff --check
git diff --cached --check
```

## Manual QA Gate

- Confirm the App Shell copy does not imply App live DeepSeek calls,
  App-side evaluation runs, arbitrary Git/shell execution, broad native bridge,
  or unapproved desktop actions.
- Confirm approved apply/rollback, approved desktop actions, and safe click/type
  panels remain receipt-gated.
- Confirm read-only and preview-only surfaces expose summary counts, hashes, and
  warning codes only.
- Confirm disabled controls are visibly disabled and cannot trigger execution.

## Release Blockers

- Any disabled row becoming callable.
- Any preview-only row executing.
- Any read-only row writing EventStore or workspace files.
- Any approved-only row bypassing approval receipt or typed confirmation.
- Any broad MCP/plugin/skill/native bridge execution path.
- Any raw prompt/source/diff/model response/reasoning/API key persistence.
