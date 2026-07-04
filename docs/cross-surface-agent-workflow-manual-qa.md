# Cross-surface Agent Workflow Manual QA

Use this checklist for the v0.28 cross-surface workflow smoke. The flow is a summary-only demo chain; it does not enable autonomous agent execution, broad desktop actions, arbitrary MCP tools, arbitrary plugin or skill runtime, auto-apply, or raw content persistence.

Recommended smoke fixture:

- `app/test/fixtures/cross-surface-agent-workflow-smoke.json`

## Pre-check

- Run `git status --short`.
- Run `git log --oneline origin/main..HEAD`.
- Confirm the branch contains the P1F commits through the cross-surface workflow smoke.
- Confirm generated artifacts remain ignored.

## Start

- Run `pnpm app:dev`.
- Keep ports `5173` and `5174` reserved for other local projects; use the configured App dev port.

## Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p1f.csv`
- Press Convert.
- Verify the CSV is created through the existing web_table_to_csv flow.
- Repeat the same filename and verify the safe `FILE_EXISTS` path.

## Cross-surface Workflow Surfaces

- Open Cross-surface Agent Workflow.
- Paste the fixture `scenario` object.
- Verify the live proposal generation path still appears as explicit opt-in summary metadata only.
- Verify workflow preview renders and the disabled controls remain disabled:
  - `Run Cross-surface Workflow (disabled)`
  - `Auto-execute Workflow (disabled)`
- Verify fixed agent route, project knowledge, MCP read-only evidence, plugin/skill metadata, desktop observer evidence, desktop action proposal, approved apply, verification, rollback, and replay stages appear as summaries only.

## Evidence and Approved Lanes

- Paste the fixture `evidenceRefs` into Cross-surface Evidence Summary.
- Verify project knowledge, MCP metadata/tool summary, plugin metadata, skill metadata, desktop observer metadata, and desktop action proposal refs are summarized without raw content.
- Review the Approved actions sequencer summary.
- Verify the approved desktop action lane remains limited to existing approved lanes.
- Verify approved desktop actions remain limited to existing approved lanes.
- Verify approved workspace apply/rollback still require the existing human approval receipts and typed confirmation paths.
- Verify Git/shell verification safe lanes remain fixed and summary-only.

## Replay / Audit Timeline

- Paste the fixture `timelineRefs` into Cross-surface Replay Audit Timeline.
- Verify the cross-surface replay timeline is read-only.
- Verify objective, proposal, agent route, knowledge recall, MCP evidence, plugin/skill metadata, desktop observer, desktop proposal, desktop approved action, workspace apply, verification, rollback, and final audit timeline stages render.
- Verify no replay execution or re-run action control is enabled.

## Safety Checks

- Verify no raw prompt, raw response, raw source, raw diff, screenshot bytes, OCR text, raw stdout/stderr, raw CSV, raw DOM, API key, Authorization header, or token value is displayed.
- Verify no dynamic bidding is shown.
- Verify no broad desktop action is enabled.
- Verify no clipboard write, file dialog automation, drag/drop, hidden/background action, arbitrary MCP tool, mutating MCP tool, arbitrary plugin runtime, arbitrary skill runtime, broad native bridge, arbitrary Git command, arbitrary shell command, or auto-apply path is enabled.

## Refresh / Replay

- Press Refresh events.
- Verify Event Log / Replay still shows existing summary events and draft/timeline projections.
- Verify cross-surface preview surfaces remain read-only after refresh.

## Current Limitations

- The App Shell does not run the cross-surface workflow.
- The App Shell does not execute agents, MCP tools, plugin runtimes, skill runtimes, desktop actions, apply, rollback, Git, shell, native bridge, or desktop action expansion outside approved lanes.
- The smoke fixture is a summary-only golden demo input, not an execution recipe.
