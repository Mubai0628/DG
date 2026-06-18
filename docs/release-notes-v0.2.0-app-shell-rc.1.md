# v0.2.0-app-shell-rc.1 Release Notes

Suggested release name: `v0.2.0-app-shell-rc.1`

Status: release-candidate documentation for App Shell review.

This release candidate collects the v0.2 control-plane foundation and App
Shell surfaces while preserving the v0.1 local `web_table_to_csv` workflow.
It does not add new execution capabilities.

## Scope

- v0.2 Control Plane foundation and roadmap.
- Model capability profiles and dry capability probe.
- Rules Ledger v2.
- Capability Broker v2 skeleton.
- Agent Dossier static router.
- Memory Core v1.
- Patch/Diff Audit foundation.
- Git Safe Lanes.
- Shell Allowlist.
- Control Plane Task/Run skeleton.
- App Shell Chat / Run Canvas draft-only surface.
- App Shell Control Plane Projection.
- App Shell Approval / Diff / Audit read-only surfaces.
- App Shell Memory Inspector read-only skeleton.
- Bridge Proposal Preview disabled/dry state.

## Current Working Flow

The supported desktop flow remains:

1. Import or paste a sanitized `BrowserDomPayload`.
2. Convert it through the local `web_table_to_csv` runner.
3. Write the CSV draft under `workspace/drafts/`.
4. Review summary-only Event Log / Replay data.
5. Review the read-only Control Plane Projection derived from event summaries.

The App Shell surfaces are intentionally non-executing:

- Chat / Run Canvas is draft-only.
- Control Plane Projection is read-only.
- Approval / Diff / Audit surfaces are read-only skeletons.
- Memory Inspector is read-only and not connected to persistence.
- Bridge Proposal Preview is disabled unless a future dry proposal exists.

## Explicit Non-Goals

- No real chat or LLM execution.
- No real control-plane run creation from the UI.
- No patch apply.
- No Git execution.
- No shell execution.
- No MCP, plugin, or skills runtime.
- No `nativeMessaging` or live extension-to-desktop bridge.
- No desktop action.
- No persistent Memory Inspector UI.
- No extension auto-send.
- No automatic Convert from bridge proposals.

## Safety

- Event payloads and App Shell projections remain summary-only.
- The UI must not display raw payloads, raw CSV, raw DOM, API keys,
  authorization headers, environment values, screenshots, or clipboard values.
- Current v0.1 draft writes are still constrained to `workspace/drafts/`.
- Bridge proposal import, when future dry proposals exist, must still only
  populate the payload editor and must not Convert or write files.
- Default tests and CI do not call the real DeepSeek API.

## Required Checks

Run these before treating this RC as ready for manual GUI review:

```bash
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-v0.2-manual-qa.md`](app-shell-v0.2-manual-qa.md).

## Known Limitations

- Packaged standalone conversion remains subject to runner preflight.
- Live DeepSeek conformance remains a manual opt-in diagnostic and is skipped
  by default.
- The v0.2 App Shell surfaces are presentation and planning surfaces only.
- Future execution work must pass the same proposal, validation, approval, and
  summary-event boundaries before it can become active.
