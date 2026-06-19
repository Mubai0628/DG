# P0G Coding Workflow Roadmap

Status: proposed roadmap lock after `v0.2.0-app-shell-rc.1`.

## Goal

P0G turns the v0.2 control-plane skeleton into a coding workflow MVP while
still avoiding arbitrary execution. The phase starts with read-only workspace
intelligence and patch proposal UI. It does not begin with shell, Git, or model
execution.

## Operating Boundary

- Keep the v0.1 `web_table_to_csv` flow working.
- Keep App Shell execution surfaces draft-only, read-only, disabled, or
  proposal-only until an explicit later gate enables execution.
- Prefer virtual or in-memory fixtures for early workflow previews.
- Keep events summary-only.
- Do not store raw secret content, raw prompt, raw source code, raw DOM, raw
  CSV, API keys, authorization headers, environment values, screenshots, or
  clipboard content in events.

## Recommended Tasks

### P0G-001 Workspace Read / Index Skeleton

- Read-only virtual workspace index.
- Path guard.
- File summary.
- Symbol/file tree summary.
- No raw secret content in events.
- No Git or shell execution.

### P0G-002 Patch Proposal UI Bridge

- Show `PatchProposal` and `DiffAudit` summaries in the App Shell Diff Surface.
- Keep patch apply disabled.
- Display refs and summaries only.

### P0G-003 Control Plane Run Draft From Chat Canvas

- Create a local draft run model from Chat / Run Canvas.
- Do not call DeepSeek.
- Do not execute agents or capabilities.

### P0G-004 Context Cart / Rules Ledger Visualization

- Show frozen prefix, volatile tail, no-compress zone, and warning summaries.
- Do not display raw prompt or raw segment content.

### P0G-005 Agent Route Preview

- Use the Static Router to show orchestrator, coder, reviewer, and verifier
  route previews.
- Do not execute agents.

### P0G-006 Capability Plan Preview

- Use Capability Broker v2 planning for the selected task draft.
- Do not execute capabilities.

### P0G-007 Memory Recall Preview

- Use Memory Core summary-only recall for the task draft.
- Do not commit, revoke, expire, or persist memory from the UI.

### P0G-008 App Shell RC Polish / Release Notes For P0G

- Polish the P0G coding workflow MVP.
- Add manual QA and release notes.
- Preserve v0.1 Convert and v0.2 App Shell safety boundaries.

## Explicitly Deferred

- Patch apply.
- Real Git execution.
- Real shell execution.
- Real DeepSeek chat.
- MCP, plugin, or skills runtime.
- Native bridge or `nativeMessaging`.
- Desktop action.
- Persistent memory UI.
- Automatic run execution from Chat / Run Canvas.

## Next Task

Start with `DW-P0G-001 Workspace Read / Index skeleton`. The task should only
build read-only workspace intelligence and safe summaries. It must not perform
filesystem writes, Git commands, shell commands, model calls, or App Shell
execution.
