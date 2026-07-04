# North Star Demo Release Smoke v0.28

This release smoke checklist hardens the North Star demo before the v0.29 RC. It is tests/docs/fixture-only and adds no execution capability.

## Smoke Path

1. Convert remains the real `web_table_to_csv` flow.
2. Live proposal surfaces remain explicit opt-in and summary-only from the App perspective.
3. Fixed multi-agent route remains orchestrator/coder/reviewer/verifier only.
4. Project knowledge recall contributes summary refs only.
5. MCP read-only evidence stays read-only.
6. Plugin/skill metadata is evidence only; runtime execution remains disabled.
7. Desktop observer evidence is metadata-only.
8. Desktop action proposal remains proposal-only.
9. Approved desktop action remains inside existing approved lanes.
10. Approved workspace apply remains inside existing bounded apply lanes.
11. Git/shell verification remains fixed safe lanes only.
12. Rollback remains bounded by checkpoint and approval summaries.
13. Replay/audit remains summary-only.
14. Redaction checks continue to block raw prompt/source/diff/API key material.
15. Failure recovery produces safe `nextAction` summaries only.

## Must Not

- Do not run live DeepSeek by default.
- Do not execute broad desktop action.
- Do not execute arbitrary Git/shell.
- Do not execute MCP mutating tools.
- Do not execute plugin/skill runtime.
- Do not persist raw prompt/source/diff/API key content.
- Do not add dynamic bidding.
- Do not add autonomous tool execution.
- Do not add native bridge or desktop action expansion.

## Scoped Gate

Run these scoped checks for this hardening task:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Full release gates are deferred to the v0.29 RC polish task.
