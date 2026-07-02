# Fixed Multi-Agent Execution Manual QA

Use this checklist for `v0.22.0-fixed-multi-agent-execution-mvp-rc.1`.

Do not record this checklist as passed unless each step is performed manually in
the App Shell.

## Required Smoke Coverage

- Convert smoke
- fixed route preview
- code_change route
- documentation route
- Agent handoff summary
- Reviewer summary
- Verifier summary
- approved apply still works
- verification safe lane still works
- rollback still works
- replay shows agent timeline
- no Add Agent / dynamic bidding / auto-run tool controls
- no raw prompt/source in UI/events

## A. Pre-check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Confirm the working tree is clean and the release candidate commit/tag are the
intended ones before publishing.

## B. Start

```powershell
pnpm app:dev
```

Open the desktop shell from the dev command output.

## C. Convert Smoke

1. Set the workspace to `D:\workspaces\demo`.
2. Load `runtime/test/fixtures/web-table-sample-payload.json`.
3. Set filename to `web-table-export-p0z.csv`.
4. Click Convert.
5. Verify the CSV exists under `workspace/drafts/`.
6. Verify the result panel still says `Event log events`.

## D. Fixed Route Preview

1. Enter a docs-only objective, for example:
   `Create or update a docs-only file through fixed multi-agent flow`.
2. Choose a `code_change` route.
3. Preview the fixed multi-agent run.
4. Confirm the route is `orchestrator / coder / reviewer / verifier`.
5. Confirm there are no enabled Add Agent, dynamic bidding, or auto-run tool
   controls.

## E. Documentation Route

1. Repeat the preview with documentation-focused wording.
2. Confirm the route remains fixed.
3. Confirm the handoff dossier is summary-only.
4. Confirm no raw prompt, raw source, raw diff, raw model response, API key,
   reasoning_content, raw stdout, or raw stderr appears.

## F. Role Summaries

1. Confirm the orchestrator summary plans the fixed route.
2. Confirm the coder summary creates a proposal summary only.
3. Confirm the reviewer summary contains risk/audit information.
4. Confirm the verifier summary references fixed verification safe lanes only.

## G. Approved Apply Still Works

1. Use the existing approved apply smoke path.
2. Confirm typed human approval remains required.
3. Confirm no fixed agent can auto-apply.
4. Confirm apply events remain summary-only.

## H. Verification Safe Lane Still Works

1. Use the existing fixed Git read or shell verification lane smoke.
2. Confirm only allowlisted lane summaries are shown.
3. Confirm arbitrary Git/shell controls are not enabled.
4. Confirm no raw command output is displayed.

## I. Rollback Still Works

1. Use the existing approved rollback smoke path after an approved apply.
2. Confirm typed human approval remains required.
3. Confirm rollback remains available through the existing approved rollback
   boundary.
4. Confirm no fixed agent can auto-rollback.

## J. Replay Timeline

1. Preview the fixed agent replay projection.
2. Confirm `agent.run.planned`, `agent.handoff.created`,
   `agent.review.completed`, `agent.verify.completed`, and
   `agent.run.completed` are represented as summary-only event refs.
3. Confirm the role timeline includes orchestrator, coder, reviewer, and
   verifier.
4. Confirm the replay surface does not write events.

## K. Safety Sweep

Confirm the App Shell does not expose:

- Add Agent as an enabled control
- dynamic bidding
- auto-run tool execution
- auto-apply
- direct mutating MCP tool calls
- arbitrary plugin/skill runtime
- arbitrary Git/shell execution
- native bridge
- desktop action
- broad PermissionLease issuance
- raw prompt/source/diff/model response in UI or events

## L. Duplicate Filename

1. Convert again with the same CSV filename.
2. Confirm the flow returns the safe `FILE_EXISTS` error.
3. Confirm existing fixed multi-agent preview/replay surfaces remain intact.

## Current Limitations

- No dynamic bidding.
- No arbitrary agent creation.
- No direct agent tool execution.
- No agent direct apply/rollback.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.
- Manual QA must be run separately from automated gates.
