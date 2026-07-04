# North Star Demo Manual QA Matrix

This matrix is the manual QA source for the v0.29 North Star demo hardening path. It is a checklist for validating the demo surfaces without expanding App execution.

## Required Coverage

Coverage keywords: Convert, live proposal, fixed multi-agent route, project knowledge recall, MCP read-only evidence, plugin/skill metadata, desktop observer evidence, desktop action proposal, approved desktop action, approved workspace apply, Git/shell verification, rollback, Replay/audit, Redaction, Failure recovery.

| Area | Manual Check | Expected Boundary |
| --- | --- | --- |
| Convert | Run `web_table_to_csv` Convert with the normal demo payload. | Real conversion flow remains available. |
| Live proposal | Inspect live proposal surfaces. | Runtime live proposal remains explicit opt-in; App does not call DeepSeek by default. |
| Fixed multi-agent route | Preview fixed orchestrator/coder/reviewer/verifier route. | Fixed roles only; no dynamic bidding. |
| Project knowledge recall | Preview project knowledge recall summaries. | Summary refs only; no raw memory content. |
| MCP read-only evidence | Preview MCP read-only metadata/tool evidence. | No mutating MCP tools. |
| Plugin/skill metadata evidence | Preview plugin and skill metadata summaries. | No plugin or skill runtime execution. |
| Desktop observer evidence | Preview desktop observer metadata. | Metadata only; no desktop action execution. |
| Desktop action proposal | Preview desktop action proposal. | Proposal only; no broad desktop action. |
| Approved desktop action | Inspect existing approved desktop action lane. | Existing receipt/typed-confirmation lane only. |
| Approved workspace apply | Inspect approved workspace apply lane. | Existing bounded apply lane only. |
| Git/shell verification | Inspect Git read and shell verification lanes. | Fixed safe lanes only; no arbitrary Git/shell. |
| Rollback | Inspect rollback checkpoint and receipt summaries. | Existing bounded rollback lane only. |
| Replay/audit | Inspect replay and audit summaries. | Summary-only replay; no rerun actions. |
| Redaction | Check all demo summaries for raw/secret leakage. | No raw prompt/source/diff/API key content. |
| Failure recovery | Inspect failure recovery and `nextAction` summaries. | Safe recovery guidance only; no automatic execution. |

## Smoke Guards

- Must not run live DeepSeek by default.
- Must not execute broad desktop action.
- Must not execute arbitrary Git/shell.
- Must not execute MCP mutating tools.
- Must not execute plugin/skill runtime.
- Must not persist raw prompt, raw source, raw diff, or API key material.
- Guard phrase: no raw prompt/source/diff/API key.
- Must preserve summary-only events and replay/audit surfaces.

## Fixture

The App test fixture is:

- `app/test/fixtures/north-star-demo-smoke.json`

It exists only to lock matrix coverage and smoke guards. It does not contain raw prompt, raw source, raw diff, raw response, API key material, or execution payloads.
