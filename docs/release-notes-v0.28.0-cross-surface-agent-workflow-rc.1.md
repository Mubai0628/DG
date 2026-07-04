# v0.28.0-cross-surface-agent-workflow-rc.1 — Cross-surface agent workflow RC

This release candidate packages the P1F cross-surface agent workflow as a demonstrable, summary-only chain across the already-approved lanes. It stitches existing proposal, agent, knowledge, MCP, plugin/skill, desktop observer, desktop action, approved apply/rollback, Git/shell verification, and replay/audit surfaces without expanding execution authority.

## Scope

- P1F Cross-surface Agent Workflow ADR, threat model, and implementation gate.
- Cross-surface workflow scenario schema.
- Cross-surface workflow planner.
- App Shell cross-surface workflow preview.
- Cross-surface evidence integration.
- Cross-surface approved actions sequencer.
- Unified cross-surface replay/audit timeline.
- Cross-surface workflow smoke fixture and manual QA.

## Current Working Flow

- web_table_to_csv Convert remains the real conversion flow.
- App live DeepSeek proposal generation remains explicit opt-in.
- Fixed multi-agent route can coordinate orchestrator/coder/reviewer/verifier summaries.
- Project Knowledge can provide summary refs.
- MCP read-only discovery/tool execution can provide summary evidence.
- Plugin/skill metadata can provide summary evidence without runtime execution.
- Desktop Observer can provide metadata-only evidence.
- Desktop Action Proposal can model actions.
- Approved Desktop Actions remain limited to existing approved lanes.
- Workspace apply/rollback remain human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- Unified replay/audit timeline can summarize the workflow.

## Explicit Non-goals

- no autonomous agent execution
- no dynamic bidding
- no arbitrary desktop action
- no clipboard write
- no file dialog automation
- no hidden/background action
- no arbitrary MCP tool
- no mutating MCP tool
- no arbitrary plugin/skill runtime
- no broad native bridge
- no arbitrary Git/shell
- no auto-apply
- no raw content in events

## Safety

- fixed roles
- summary-only evidence
- Capability Broker planning
- human approval receipts
- typed confirmation
- approved lanes only
- redaction audits
- replay/audit timeline

## Checks

- Scoped P1F runtime and App tests.
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`
- Manual GUI QA using `docs/cross-surface-agent-workflow-manual-qa.md`.

## Release Hygiene

- No raw prompt, raw response, raw source, raw diff, raw screenshot/OCR, raw stdout/stderr, raw CSV, raw DOM, API key, Authorization header, or token value is intentionally persisted by the P1F surfaces.
- The smoke fixture is summary-only and is not an execution recipe.
- Generated artifacts should remain ignored.
- Recommended tag: `v0.28.0-cross-surface-agent-workflow-rc.1`.
