# Runtime Cross-surface Workflow Scenario v0.27

The cross-surface workflow scenario schema is a runtime data contract for P1F.
It validates summary-only golden demo scenarios before later planner and App
preview tasks consume them.

## Scope

- Schema and validator only.
- Fixed cross-surface route only.
- Summary refs, evidence refs, warning codes, blocker codes, counts, and hashes
  only.
- Golden demo fixtures for safe and blocked scenarios.

## Non-goals

- No workflow planner.
- No App composer.
- No live DeepSeek call.
- No agent execution.
- No MCP tool invocation.
- No plugin or skill runtime execution.
- No desktop action execution.
- No apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No native bridge or desktop action expansion.

## Stage Contract

The fixed route supports these stage kinds:

- `user_objective`
- `live_proposal`
- `fixed_agent_route`
- `project_knowledge_recall`
- `mcp_readonly_evidence`
- `plugin_skill_metadata_evidence`
- `desktop_observer_evidence`
- `desktop_action_proposal`
- `approved_desktop_action_optional`
- `approved_workspace_apply`
- `git_shell_verification`
- `rollback_optional`
- `unified_replay_audit`

Unknown stages block. Dynamic bidding and arbitrary tool stages block. Missing
the unified replay/audit stage warns, while a replay stage without summary refs
blocks.

## Safety Rules

The validator blocks raw prompt, raw response, reasoning content, raw source,
raw diff, raw patch, raw screenshot, raw OCR, raw tool input/output, raw desktop
action data, file content, preimage content, API key markers, Authorization
markers, bearer markers, command fields, apply/rollback requests, EventStore
writes, native bridge fields, desktop action execution fields, MCP tool
execution fields, plugin/skill runtime fields, and `tools` / `tool_choice`.

Approved workspace apply stages require receipt and typed confirmation refs.
Approved desktop action stages that are completed require approved-lane receipt
refs. A desktop action proposal cannot claim execution.

## Output

`validateCrossSurfaceWorkflowScenario()` returns a summary-only validation
result:

- status: `parsed`, `warning`, or `blocked`
- sanitized scenario only when there are no blockers
- stage/evidence counts
- warning and blocker codes
- deterministic scenario and normalized hashes
- readiness flags with every execution flag false

The result must not include raw prompt, raw response, reasoning content, raw
source, raw diff, raw screenshot, raw OCR, file content, API keys, or secret
values.

## Relation to P1F

P1F-002 feeds the future P1F-003 planner and P1F-004 App composer. It does not
execute any surface. Later tasks may consume the normalized scenario as a
summary-only contract for fixed workflow previews.
