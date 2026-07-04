# P1F-002 Cross-surface Workflow Scenario Schema Plan

## Scope

P1F-002 will add a runtime scenario schema and golden demo contract for the
cross-surface workflow preview. The schema will describe a fixed route across
existing DeepSeek Workbench surfaces and will validate summary-only stage refs.

The task is a runtime data-contract task. It will not implement a planner,
orchestrator, App composer, live model call, desktop action execution, MCP tool
execution, plugin / skill runtime, Git command, shell command, workspace write,
EventStore write, apply, or rollback.

## Non-goals

- No dynamic agent bidding.
- No runtime workflow planner.
- No App workflow composer.
- No live DeepSeek call.
- No model-driven file write.
- No arbitrary MCP tool invocation.
- No arbitrary plugin / skill execution.
- No desktop action execution.
- No workspace apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No native bridge or desktop action expansion.

## Scenario Shape

The schema should accept object or JSON string input with fields similar to:

- schemaVersion
- scenarioId
- title
- objectiveSummary
- routeKind: fixed_cross_surface_workflow
- stages
- evidenceRefs
- noCompressRefs
- expectedOutputs
- forbiddenPolicySummary
- createdAt
- source

Stage kinds should be fixed and explicit:

- user_objective_summary
- live_proposal_opt_in_policy
- live_proposal_request_boundary
- live_proposal_generation_summary
- model_patch_proposal_import
- model_proposal_chain_integration
- fixed_multi_agent_route
- project_knowledge_summary_refs
- mcp_readonly_evidence_refs
- plugin_skill_metadata_refs
- desktop_observer_metadata_refs
- desktop_action_proposal
- approved_desktop_action_receipt
- approved_workspace_apply_receipt
- approved_workspace_rollback_receipt
- git_read_lane_summary
- shell_verification_lane_summary
- unified_replay_audit_timeline

## Allowed Stage Data

Stage data may include only summary values:

- ids and refs
- short summary text
- counts
- warning codes
- blocker codes
- hash prefixes
- createdAt timestamps
- source labels
- readiness booleans that do not grant execution

## Forbidden Fields

Validation must block forbidden fields at any depth:

- rawPrompt
- promptText
- rawResponse
- reasoningContent
- reasoning_content
- rawSource
- rawDiff
- rawPatch
- rawPreimage
- rawScreenshot
- rawOcr
- rawCsv
- apiKey
- Authorization
- bearer
- token
- secret
- command
- shellCommand
- gitCommand
- mcpToolInvoke
- pluginRuntime
- skillRuntime
- tauriCommand
- eventStoreWrite
- applyNow
- rollbackNow
- permissionLease
- nativeBridge
- desktopActionExpansion
- clipboardWrite
- fileDialogAutomation
- dragDrop
- screenRecording
- hiddenCapture
- remoteControl
- tools
- tool_choice
- dynamicAgentBidding

## Validation Rules

The schema should block:

- missing title or objective summary
- unknown schema version
- unknown route kind
- unknown stage kind
- duplicate stage ids
- dynamic agent bidding fields
- arbitrary tool execution fields
- App execution readiness set to true
- raw content or secret-like markers
- desktop action expansion outside existing lanes
- workspace mutation claims without approved-lane receipt refs
- Git/shell claims outside fixed safe lanes
- MCP or plugin / skill execution claims

The schema should warn:

- missing later stages in a partial scenario
- stale evidence refs
- missing replay timeline refs
- missing redaction audit refs
- missing rollback checkpoint refs
- missing verification refs

## Golden Demo Contract

The golden demo should describe one complete happy-path scenario and several
blocked scenarios. Fixtures should be summary-only and include:

- safe full preview chain
- partial chain with missing later stages
- blocked dynamic bidding
- blocked arbitrary tool request
- blocked raw prompt or raw response
- blocked desktop action expansion
- blocked apply without approval receipt
- blocked Git/shell command

## Tests

Focused runtime tests should cover:

- object input parses
- JSON string input parses
- safe full scenario validates
- missing optional later stages warn
- dynamic agent bidding blocks
- arbitrary tool / MCP / plugin / skill / Git / shell fields block
- raw prompt / raw response / reasoning content fields block
- desktop action expansion blocks
- apply/rollback without approved receipt blocks
- output contains no raw content or API key
- all execution readiness flags remain false
- deterministic ids and hashes with injected id/clock

App docs-lock tests may assert the schema docs and docs index exist. P1F-002
does not add App UI.

## Scoped Commands

- git status --short
- git status -sb
- git log --oneline origin/main..HEAD
- pnpm --filter @deepseek-workbench/runtime build
- pnpm --filter @deepseek-workbench/runtime typecheck
- pnpm exec vitest run runtime/test/cross-surface-workflow-scenario-schema.test.ts
- pnpm app:test
- git diff --check
- git diff --cached --check

Do not run full gates until P1F-009.

## Local Commit

Suggested commit message:

- feat(runtime): add cross-surface workflow scenario schema

No push, no tag, and no GitHub Release in P1F-002.

## Completion Report Format

- task and status
- files changed
- commands run
- test result count
- scenario schema summary
- key invariant verification
- local commit hash and subject
- clean git status
- next task: DW-P1F-003 Cross-surface Workflow Planner / Orchestrator State
  Machine, no new execution
