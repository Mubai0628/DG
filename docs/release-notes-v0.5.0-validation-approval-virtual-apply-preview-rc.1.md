# v0.5.0-validation-approval-virtual-apply-preview-rc.1

Validation, approval, and virtual-apply previews, no execution.

Recommended tag:
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and polishes
the P0I validation, approval, virtual apply, rollback, and replay preview
surfaces. It still does not add arbitrary execution.

Included scope:

- v0.4 controlled creation preview surfaces
- Patch Proposal Validation Preview
- Patch Diff Audit Preview
- Patch Approval Draft
- Patch Virtual Apply Preview
- Patch Rollback Checkpoint Preview
- Controlled Creation Replay Projection

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Event Log / Replay remains available.
- Record Draft Event remains the only local summary-event write path.
- Validation, approval, virtual apply, rollback, and replay surfaces are
  preview-only.

## Explicit Non-goals

- No real DeepSeek chat.
- No real ControlPlaneRun execution.
- No patch apply.
- No filesystem write.
- No real rollback.
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
[`app-shell-validation-approval-virtual-apply-manual-qa.md`](app-shell-validation-approval-virtual-apply-manual-qa.md).
