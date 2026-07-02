# Fixed Multi-Agent E2E Smoke v0.21

This smoke locks one safe docs-only fixed multi-agent flow:

```text
Create or update a docs-only file through fixed multi-agent flow.
```

The smoke is a preview and hardening check. It does not create the docs file,
write workspace files, write EventStore records, call DeepSeek, invoke tools, or
execute apply/rollback.

## Fixed Route

The only accepted route is:

```text
orchestrator -> coder -> reviewer -> verifier
```

- The orchestrator plans the fixed route and produces summary refs.
- The coder creates a proposal summary for a docs-only target.
- The reviewer validates path scope, audits risk, and keeps approval human-gated.
- The verifier reports fixed verification safe-lane summaries only.

No dynamic bidding, arbitrary agent creation, or direct agent tool execution is
enabled by this smoke.

## Smoke Flow

1. Orchestrator plans the fixed route.
2. Coder creates a proposal summary for the docs-only change.
3. Reviewer validates and audits the low-risk docs-only proposal.
4. Verifier reports fixed verification summary refs.
5. Human approval remains required before any approved apply path.
6. Approved apply, if later used, must use the existing App approved apply flow.
7. Verification safe lanes remain fixed summaries, not arbitrary Git/shell.
8. Rollback remains available through the existing approved rollback boundary.
9. Agent events replay reconstructs a summary-only role timeline.

## Summary-Only Boundaries

The smoke fixture and replay projection must not include:

- raw prompt text
- raw source
- raw diff
- raw model response
- reasoning_content
- API keys, authorization headers, or tokens
- raw stdout or stderr
- direct command text

The replay surface may show event types such as `agent.run.planned`,
`agent.handoff.created`, `agent.review.completed`, `agent.verify.completed`, and
`agent.run.completed`, but only as safe summary refs.

## Execution Boundaries

The smoke keeps these lanes disabled:

- no dynamic bidding
- no auto-apply
- no arbitrary Git or shell
- no mutating MCP tool
- no plugin or skill runtime execution
- no native bridge
- no desktop action
- no EventStore write from the replay projection

Passing this smoke means the fixed-route preview and replay surfaces agree on
safe summaries. It does not mean that an agent can apply, rollback, approve,
write events, invoke tools, or execute commands.

## Manual QA

1. Open the App Shell.
2. Enter a docs-only objective such as `Create or update a docs-only file
   through fixed multi-agent flow`.
3. Choose the coding intent and preview the fixed multi-agent run.
4. Confirm the route is `orchestrator / coder / reviewer / verifier`.
5. Confirm reviewer risk summary stays low and summary-only.
6. Confirm verifier output is a safe-lane summary only.
7. Preview the fixed agent replay projection.
8. Confirm the role timeline shows orchestrator, coder, reviewer, and verifier.
9. Confirm apply remains human-approved and no auto-apply control is enabled.
10. Confirm rollback remains available only through the existing approved
    rollback boundary.
11. Confirm no raw prompt, raw source, raw diff, raw model response, API key,
    reasoning_content, raw stdout, or raw stderr appears.

## Related Fixtures

- `app/test/fixtures/fixed-multi-agent-e2e-smoke.json`
