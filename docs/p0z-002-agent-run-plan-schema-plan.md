# P0Z-002 Agent Run Plan / Handoff Contract Schema Plan

## Scope

P0Z-002 will add a pure runtime schema for fixed agent run plans and summary-only handoff dossiers. It will not execute agents, tools, file writes, apply, rollback, Git/shell, MCP tools, plugin runtime, skill runtime, native bridge, or desktop action.

## Non-Goals

- No dynamic agent bidding.
- No arbitrary agent creation.
- No hidden raw prompt sharing.
- No App UI implementation.
- No runtime orchestrator state machine.
- No direct capability invocation.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git/shell execution.
- No MCP mutating call.
- No plugin or skill runtime execution.
- No native bridge.
- No desktop action.

## Runtime Module

Add `runtime/src/agents/fixed-agent-run-plan.ts` and export it from `runtime/src/agents/index.ts` and `runtime/src/index.ts` if those export paths exist.

## Types

Define:

- `FixedAgentRole`
- `FixedAgentIntent`
- `FixedAgentRoute`
- `FixedAgentRunPlanInput`
- `FixedAgentRunPlan`
- `AgentHandoffDossier`
- `AgentHandoffEvidenceRef`
- `AgentRunPlanValidationResult`
- `AgentRunPlanFinding`
- `AgentRunPlanReadiness`
- `buildFixedAgentRunPlan(input)`
- `validateFixedAgentRunPlan(input)`
- `summarizeFixedAgentRunPlan(plan)`

## Fixed Roles

- `orchestrator`
- `coder`
- `reviewer`
- `verifier`

## Fixed Intents and Routes

- `code_change`: orchestrator -> coder -> reviewer -> verifier
- `documentation`: orchestrator -> coder -> reviewer
- `code_review`: orchestrator -> reviewer -> verifier
- `verification`: orchestrator -> verifier
- `unknown`: blocked unless the caller explicitly requests a planning-only fallback with no execution readiness

## Handoff Dossier Shape

Each dossier should contain:

- dossier id
- from role
- to role
- intent
- objective summary
- evidence refs
- capability plan refs
- context refs
- memory refs
- warning codes
- blocker codes
- summary hash

Each dossier must stay summary-only. It must not contain raw prompt, raw source, raw diff, raw model response, reasoning content, file content, preimage content, command output, API key, Authorization, bearer token, secret, direct command, direct tool invocation, apply, rollback, PermissionLease, native bridge, or desktop action fields.

## Validation Must Block

- unknown role
- unknown intent
- dynamic bidding fields
- arbitrary agent ids
- route not matching fixed route
- raw prompt/source/diff/API key fields
- raw model response or reasoning content fields
- direct command fields
- tool execution fields
- apply/rollback fields
- capability invocation fields
- hidden context fields
- memory raw content
- dossier containing raw source/diff/prompt
- agent plan enabling App execution flags

## Validation Should Warn

- missing optional context refs
- missing optional memory refs
- stale evidence refs
- missing verifier evidence for `code_change`
- route intent `unknown` in planning-only mode
- capability plan refs that are present but not yet broker-approved

## Output

The summary-only plan should include:

- `planId`
- `intent`
- `route`
- `roles`
- `handoffDossiers`
- `evidenceRefs`
- `capabilityPlanRefs`
- `contextRefs`
- `memoryRefs`
- `readiness` with all execution flags false
- `planHash`
- `source: runtime_fixed_agent_run_plan`

## Tests

Add `runtime/test/fixed-agent-run-plan.test.ts`.

Cover:

- route for `code_change`
- route for `documentation`
- route for `code_review`
- route for `verification`
- unknown role blocked
- dynamic bidding blocked
- arbitrary agent id blocked
- raw prompt/source/diff/API key blocked
- direct command/tool/apply/rollback fields blocked
- hidden context/memory raw content blocked
- dossier summary-only output
- all execution readiness flags false
- deterministic plan id/hash with injected id/clock

## Scoped Commands

Run only focused commands:

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/fixed-agent-run-plan.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Local Commit Workflow

Start with `git status --short`, `git status -sb`, and `git log --oneline origin/main..HEAD`. Stop for unrelated dirty changes. Stage only P0Z-002 files, create a local commit, and do not push, tag, or create a release.

## Completion Report Format

Report files changed, scoped checks, test counts, run-plan schema summary, key invariants, local commit hash/subject, final git status, and next task `DW-P0Z-003 Runtime Fixed Agent Orchestrator, state machine only`.
