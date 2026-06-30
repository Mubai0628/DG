# App Live Proposal Generation Manual QA

Manual QA for the v0.13 App Live Proposal Generation MVP release candidate.

Recommended release tag:
`v0.13.0-app-live-proposal-generation-mvp-rc.1`

## A. Pre-check

Run:

```bash
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Expected: all command gates pass and generated artifacts remain ignored.

## B. Start

Run:

```bash
pnpm app:dev
```

Expected: the Tauri App Shell opens in source-tree mode and Runner preflight
continues to say no native bridge is enabled.

## C. Convert Smoke

Use:

- workspace: `D:\workspaces\demo`
- payload: `runtime/test/fixtures/web-table-sample-payload.json`
- filename: `web-table-export-p0q.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0q.csv`.
- Result keeps "Event log events".
- No raw CSV, raw DOM, raw prompt, raw response, raw source, raw diff, or API
  key is displayed.

## D. Live Proposal Session Receipt

Preview the Live Proposal Opt-in Gate, Live Proposal Request Builder, and Live
Proposal Session Receipt.

Expected:

- The receipt requires exact typed confirmation:
  `CALL DEEPSEEK FOR PROPOSAL`.
- The receipt is proposal-generation-only.
- The receipt is not an apply approval, rollback approval, broad
  PermissionLease, key value field, or desktop action.

## E. Live Proposal Request

Use a safe docs-only objective and allowed path refs.

Expected:

- Request Builder remains "Request preview / no network".
- Request summary is summary-only and omits `tools` / `tool_choice`.
- The App Shell does not send live requests from the request builder.

## F. Live Proposal Generation

Click Generate Live Proposal only after policy, request, receipt, typed
confirmation, and allowed path gates are ready.

Expected:

- App can explicitly request live DeepSeek patch proposal generation through the
  fixed Tauri command.
- The generated proposal enters repair/schema/import/chain integration.
- Reasoning content is dropped and shown only as boolean/count metadata.
- No raw prompt, raw response, raw source, raw diff, reasoning_content, or API
  key is displayed.
- App does not auto-apply.

## G. Proposal Event Summary

Click Record Live Proposal Summary Event after a safe generated proposal.

Expected:

- Event type is `model.patch_proposal.live_generated`.
- Event payload is summary-only.
- Replay shows live proposal event count and latest live proposal summary.
- No raw prompt, raw response, reasoning content, raw proposal body, or API key
  is written to events.

## H. Proposal Import / Chain Integration

Inspect Model Patch Proposal Import and Model Proposal Chain Integration after
generation.

Expected:

- Generated proposal candidates enter repair/schema/import previews.
- Chain integration remains preview-only.
- Unsafe path, secret marker, malformed response, repair failed, and schema
  blocked candidates are blocked as safe summaries.
- No apply/rollback is enabled from proposal generation.

## I. Approved Apply

If continuing from a safe proposal summary into approved execution, use the
existing approved execution receipt path.

Expected:

- Apply requires exact typed confirmation: `APPLY TO USER WORKSPACE`.
- Apply requires a human-approved execution receipt.
- A private checkpoint is created.
- No model output can directly write files.

## J. Verification Lanes

Run fixed Git read lanes and fixed shell verification lanes after approved
apply.

Expected:

- Git lanes remain read-only summary lanes.
- Shell lanes remain fixed allowlist templates with fixed argv.
- No arbitrary Git or arbitrary shell input is available.
- Verification events are summary-only.

## K. Rollback

Use the approved rollback path for the docs-only apply.

Expected:

- Rollback requires exact typed confirmation: `ROLLBACK USER WORKSPACE`.
- Rollback uses the matching private checkpoint.
- Rollback is not model-driven.

## L. Refresh / Replay

Click Refresh events after live proposal event, approved apply, verification
lanes, and rollback.

Expected:

- Event Log / Replay shows draft, live proposal, approved apply, verification,
  and rollback summaries.
- Replay does not re-execute model calls, apply, rollback, Git, or shell.

## M. Duplicate Conflict

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## N. Raw Prompt / Response / API Key Absent

Verify no visible panel or event summary shows:

- raw prompt
- raw response
- raw reasoning_content
- raw source
- raw diff
- raw CSV
- raw DOM
- API key
- Authorization header
- `PASSWORD_VALUE_MARKER` false positive

## O. No Auto-Apply

Verify:

- Generate Live Proposal does not write workspace files.
- Generate Live Proposal does not apply patches.
- Generate Live Proposal does not rollback.
- Generated proposals require the existing human-approved apply/rollback path
  before any user workspace mutation.

## P. No Arbitrary Git / Shell

Verify:

- There is no arbitrary command textarea or input.
- There is no enabled `Execute`, `Commit`, `Push`, `Install`, or arbitrary
  `Run Shell` button.
- Git read lanes are read-only.
- Shell verification lanes are fixed templates only.

## Q. Current Limitations

- No auto-apply.
- No autonomous coding loop.
- No model-driven file write.
- No broad PermissionLease.
- No arbitrary Git/shell.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key in events.
