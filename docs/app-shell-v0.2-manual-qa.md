# App Shell v0.2 Manual QA

This checklist verifies the v0.2 App Shell RC without enabling new execution
capabilities. The only supported active flow is the existing local
`web_table_to_csv` Convert path.

## A. Pre-Check

Run:

```bash
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
git status --short
```

Expected:

- All command gates pass.
- Generated artifact directories remain ignored.
- The worktree shows only intentional source and documentation changes.

## B. Start

Run:

```bash
pnpm app:dev
```

Expected:

- The Tauri App Shell opens.
- The top badge states source-tree mode and no native bridge.
- Runner preflight is visible and actionable.

## C. Convert Smoke

Use:

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-v02.csv`

Steps:

1. Paste or load the sanitized payload.
2. Set the draft filename.
3. Click Convert.
4. Verify the CSV exists under `D:\workspaces\demo\drafts\`.

Expected:

- Convert succeeds.
- Result shows row/column counts, warning counts, draft path, and Event Log
  event count.
- The UI does not display raw CSV content.

## D. Event / Projection

Expected:

- Event Log / Replay shows event count, draft count, timeline, and safety
  status.
- Control Plane Projection shows completed `web_data_extraction`.
- Draft/artifact refs are relative paths only.
- Safety warnings are displayed as codes only.

## E. Surfaces

Expected:

- Chat / Run Canvas says draft-only and no LLM request is sent.
- Create Run is disabled.
- Approval Surface is empty and read-only.
- Diff Surface is empty and read-only.
- Audit Surface shows summary event counts only.
- Memory Inspector is empty, read-only, and not connected to persistence.
- Bridge Proposal Preview is disabled and says no live bridge is enabled.
- No surface offers active approve, apply, execute, Git, shell, memory commit,
  memory revoke, or memory expire controls.

## F. Refresh

Steps:

1. Type a local draft objective in Chat / Run Canvas.
2. Click Refresh events.

Expected:

- Workspace root, payload editor, filename, conversion result, chat draft, and
  App Shell surfaces remain visible.
- Event Log / Replay, Control Plane Projection, and Audit Surface refresh from
  event summaries.
- No new run is created.

## G. Duplicate Filename

Steps:

1. Run Convert again with the same filename.

Expected:

- The app shows a safe `FILE_EXISTS` action path.
- Existing projection and surfaces remain readable.
- The next action asks the user to choose a new filename or remove the existing
  file.

## H. Safety

Expected:

- No raw CSV is displayed.
- No raw DOM is displayed.
- No API key-like value is displayed.
- No password value is displayed.
- `PASSWORD_VALUE_MARKER` is not reported as a false positive in normal
  summary-only event output.
- Draft warnings with fake secret markers stay local to the draft surface and
  are not written to events.

## I. Current Limitations

- No DeepSeek chat execution.
- No control-plane run creation.
- No patch, Git, or shell execution.
- No native bridge.
- No memory persistence UI.
- No MCP, plugin, or skills runtime.
- No desktop action.
