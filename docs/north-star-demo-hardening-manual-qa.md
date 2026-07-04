# North Star Demo Hardening Manual QA

This checklist validates the v0.29 North Star demo hardening release candidate. It keeps the existing cross-surface demo flow intact while checking that policies, replay, freshness, and handoff safety remain summary-only.

## Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## Manual Surfaces

Coverage keywords: Convert smoke, live proposal, fixed agent route, project knowledge recall, MCP read-only evidence, plugin/skill metadata evidence, desktop observer evidence, desktop action proposal, approved desktop action, approved workspace apply, Verification, Rollback, Replay/audit, Failure recovery, Redaction checks.

1. Convert smoke: run the standard `web_table_to_csv` demo path and confirm the CSV draft and summary events are created.
2. Live proposal: verify the live proposal surfaces remain explicit opt-in and do not auto-call DeepSeek.
3. Fixed agent route: preview the fixed orchestrator/coder/reviewer/verifier route and confirm no dynamic bidding appears.
4. Project knowledge recall: preview recall summaries and confirm no raw memory content is shown.
5. MCP read-only evidence: preview MCP metadata and read-only tool summaries; confirm no mutating tool invocation.
6. Plugin/skill metadata evidence: preview plugin and skill metadata summaries; confirm no runtime execution.
7. Desktop observer evidence: preview metadata-only observer evidence.
8. Desktop action proposal: preview proposal-only desktop action summaries.
9. Approved desktop action: inspect existing approved desktop action lane boundaries.
10. Approved workspace apply: inspect approved apply receipt and typed confirmation summaries.
11. Verification: inspect fixed Git read and shell verification lanes.
12. Rollback: inspect rollback checkpoint and approval summaries.
13. Replay/audit: inspect summary-only replay/audit completeness and timeline surfaces.
14. Failure recovery: inspect safe failure recovery `nextAction` summaries.
15. Redaction checks: confirm no raw prompt, raw source, raw diff, raw response, raw stdout/stderr, or API key content appears.

## Expected Result

- Convert still works.
- Existing approved apply/rollback lanes still work only inside their bounded gates.
- Verification lanes still work as fixed summary-only lanes.
- No dynamic bidding.
- No autonomous tool execution.
- No mutating MCP tools.
- No arbitrary plugin/skill runtime.
- No broad desktop action.
- No arbitrary Git/shell.
- No native bridge.
- No auto-apply.
- Summary-only events/replay remain preserved.
