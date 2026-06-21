# P0H Coding Workflow Controlled Creation Roadmap

Status: proposed roadmap lock after `v0.3.0-coding-workflow-preview-rc.1`.

## Goal

P0H turns preview-only coding workflow surfaces into a controlled creation MVP.
It still does not allow arbitrary execution. The phase starts with safe sources
of summaries and controlled proposal creation, not with patch apply, Git
execution, shell execution, or model execution.

## Operating Boundary

- Keep the v0.1 `web_table_to_csv` flow working.
- Keep App Shell execution surfaces draft-only, read-only, preview-only,
  planning-only, or controlled-creation-only until a later explicit execution
  gate exists.
- Prefer explicit safe inputs, deterministic fixtures, and summary-only
  adapters.
- Do not crawl the real filesystem by default.
- Do not read `.env`, private keys, generated build output, or ignored
  directories.
- Do not store raw secret content, raw prompt, raw source code, raw DOM, raw
  CSV, API keys, authorization headers, environment values, screenshots,
  clipboard content, or full memory content in events.

## Recommended Tasks

### P0H-001 Workspace Index To App Bridge, Still Read-Only

- Connect virtual or safe `WorkspaceIndex` summaries to the App Shell.
- Do not display raw file content.
- Do not crawl the filesystem by default unless the user provides an explicit
  safe fixture or selected input.
- Do not read `.env` or secret-looking files.
- Keep summaries path-guarded, size-limited, and metadata-only.

### P0H-002 Run Draft To Control Plane Draft Event, Local-Only Opt-In

- Create a summary-only draft event or in-memory event preview from Run Draft.
- Keep it local and explicit.
- Do not create a real ControlPlaneRun.
- Do not call DeepSeek.
- Do not execute agents or capabilities.

### P0H-003 Context Cart From Run Draft And Workspace Index Summaries

- Build a context assembly preview from Run Draft and Workspace Index summaries.
- Keep raw prompt and raw file content out of the UI and events.
- Do not call a model.
- Do not execute context assembly as part of a real run.

### P0H-004 Static Agent Route Preview Using Runtime Static Router Helper

- Integrate a pure browser-safe runtime static router helper if available.
- Keep the route display summary-only.
- Do not execute agents.
- Do not introduce dynamic bidding.

### P0H-005 Capability Plan Preview Using Runtime Capability Broker Dry Planning Helper

- Use a pure dry planning helper from Capability Broker v2 when browser-safe.
- Do not invoke capabilities.
- Do not issue PermissionLease.
- Keep disabled and high-risk capabilities clearly marked.

### P0H-006 Patch Proposal Creation Preview

- Create `PatchProposal` previews from synthetic or safe app input.
- Keep proposals virtual and summary-only.
- Do not apply patches.
- Do not write files.
- Do not call Git or shell.

### P0H-007 Memory Recall Preview Using Runtime Memory Core With In-Memory Fixtures

- Use Memory Core summary-only recall with in-memory fixtures.
- Do not connect persistence.
- Do not commit, revoke, or expire memory from the UI.
- Keep all recall placement volatile-tail only.

### P0H-008 Coding Workflow Controlled Creation RC Polish / Release Notes

- Polish the controlled creation MVP.
- Add release notes, manual QA, and RC checklist.
- Preserve v0.1 Convert and v0.3 preview safety boundaries.

## Explicitly Deferred

- Real DeepSeek chat.
- Real ControlPlaneRun execution.
- Patch apply.
- Git execution.
- Shell execution.
- Capability invocation.
- PermissionLease issuing.
- Memory persistence and memory commit UI.
- MCP, plugin, or skills runtime.
- Native bridge or `nativeMessaging`.
- Desktop action.
- Arbitrary filesystem crawling.

## Next Task

Start with `DW-P0H-001 Workspace Index to App Bridge, still read-only`. The task
should only connect safe workspace index summaries to the App Shell. It must not
read raw secret files, display raw source content, run Git, run shell, call
DeepSeek, create a real run, write events by default, or add execution controls.
