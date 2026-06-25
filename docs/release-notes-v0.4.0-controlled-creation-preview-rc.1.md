# v0.4.0-controlled-creation-preview-rc.1

Controlled creation preview, summary-only side effects.

Recommended tag: `v0.4.0-controlled-creation-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and advances
the v0.3 coding workflow preview into controlled creation surfaces. It still
does not add arbitrary execution.

Included scope:

- v0.3 coding workflow preview surfaces
- Workspace Index summary bridge
- Run Draft summary event
- Context Assembly Preview
- runtime static Agent Route Preview helper
- runtime Capability Plan Preview helper
- Patch Proposal Creation Preview
- runtime Memory Recall Preview helper

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Event Log / Replay remains available.
- Record Draft Event can append one summary-only local draft event after an
  explicit user action.
- All other coding workflow surfaces remain preview, read-only, or
  planning-only.

## Explicit Non-goals

- No real DeepSeek chat.
- No real ControlPlaneRun execution.
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
- Dynamic context refs stay in `volatile_tail` or `no_compress_zone`.
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
[`app-shell-controlled-creation-manual-qa.md`](app-shell-controlled-creation-manual-qa.md).
