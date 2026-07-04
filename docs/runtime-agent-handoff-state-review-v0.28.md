# Runtime Agent Handoff State Review v0.28

The agent handoff state review helper is a runtime-only, deterministic check for long-running fixed-agent handoff summaries. It consumes summary refs from orchestrator, coder, reviewer, and verifier stages and reports whether the handoff chain is ready for read-only review.

It does not rerun agents, create dynamic bidding, invoke tools, apply patches, rollback, write EventStore events, call MCP tools, run Git/shell, or write workspace files.

## Scope

- Validate summary-only agent handoff stage refs.
- Detect missing role output refs.
- Detect role order mismatch.
- Detect stale dossier hashes.
- Detect missing evidence refs.
- Detect skipped reviewer or verifier stages.
- Detect coder output without a proposal id.
- Detect verifier output without a verification summary.
- Detect stale running/pending stages.
- Detect interrupted workflow recovery missing `nextAction`.
- Fail closed on raw prompt/source/diff, API key markers, command fields, dynamic bidding, tool execution, and execution readiness claims.

## Inputs

The helper accepts `AgentHandoffStateReviewInput` with:

- `stages`: summary-only stage refs.
- `expectedRoleOrder`: defaults to orchestrator, coder, reviewer, verifier.
- `staleThresholdMs`: age limit for running or pending stages.
- `createdAt`: deterministic review clock.
- `idGenerator`: deterministic test id hook.

Stage summaries may include role, status, summary text, output ref, proposal id, verification summary ref, dossier hash, expected dossier hash, evidence refs, context refs, timing metadata, warning codes, and `nextAction`.

## Output

The output is an `AgentHandoffStateReviewReport` with:

- status: `empty`, `review_ready`, `warning`, or `blocked`.
- review id and summary hash.
- stage counts, missing output counts, stale counts, skipped role counts, blocker/warning counts.
- stage summaries with summary hashes only.
- finding codes and safe messages only.
- readiness flags.

Every execution readiness flag remains false:

- `canRerunAgent`
- `canCreateDynamicAgent`
- `canBidAgents`
- `canInvokeTools`
- `canApplyPatch`
- `canRollback`
- `canWriteEventStore`
- `canExecuteGit`
- `canExecuteShell`
- `appCanExecute`

## Fail-closed Rules

The helper blocks when it sees:

- missing role output.
- role order mismatch.
- stale dossier hash.
- missing evidence ref.
- skipped reviewer or verifier.
- coder output missing proposal id.
- verifier result missing verification summary.
- interrupted workflow recovery without `nextAction`.
- raw prompt/source/diff/response/output fields.
- API key, bearer token, authorization, or secret markers.
- command, shell, Git, Tauri, EventStore, apply, rollback, tool, dynamic bidding, agent runtime, desktop action, native bridge, or execution fields.

## Non-goals

- No agent rerun.
- No dynamic agent bidding.
- No tool invocation.
- No App execution.
- No EventStore write.
- No file write.
- No apply or rollback.
- No Git or shell execution.
- No native bridge.
- No desktop action.
