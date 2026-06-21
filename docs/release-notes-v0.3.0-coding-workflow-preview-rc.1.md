# v0.3.0-coding-workflow-preview-rc.1

Coding workflow preview surfaces, no execution.

Recommended tag: `v0.3.0-coding-workflow-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and layers a
preview-only coding workflow shell over the v0.2 control-plane foundation.

Included foundation:

- P0F control-plane foundation
- Model capability profiles
- Rules Ledger v2 and Context Ledger v2
- Capability Broker v2 skeleton
- Agent Dossier static router
- Memory Core v1
- Patch and Diff Audit foundation
- Git Safe Lanes skeleton
- Shell Allowlist skeleton
- Control Plane Task/Run skeleton

Included P0G preview surfaces:

- Workspace Read / Index skeleton
- Patch Proposal UI Bridge
- local Run Draft Preview
- Context Cart / Rules Ledger visualization
- Agent Route Preview
- Capability Plan Preview
- Memory Recall Preview

## Current Working Flow

- `web_table_to_csv` Convert remains the only real user-facing workflow.
- Event Log / Replay remains available.
- App Shell surfaces visualize the future coding workflow in read-only,
  draft-only, preview-only, or planning-only form.

## Explicit Non-goals

- No real DeepSeek chat.
- No real ControlPlaneRun creation from UI.
- No patch apply.
- No Git execution.
- No shell execution.
- No capability invocation.
- No PermissionLease issuance.
- No memory commit, revoke, or expire UI.
- No MCP/plugin/skills runtime.
- No `nativeMessaging` or live bridge.
- No desktop action.

## Safety

- App Shell surfaces are summary-only.
- Raw payload, raw CSV, raw source, raw prompt, raw DOM, raw diff, API keys,
  authorization headers, environment values, and full memory content are not
  displayed outside explicit local draft inputs.
- Existing v0.1 web-table-to-CSV behavior is preserved.
- Generated artifacts remain ignored.

## Checks

Before publishing this RC, run:

```bash
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-coding-workflow-manual-qa.md`](app-shell-coding-workflow-manual-qa.md).
