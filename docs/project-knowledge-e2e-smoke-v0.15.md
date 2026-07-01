# Project Knowledge E2E Smoke v0.15

P0T-007 proves that human-reviewed project knowledge can inform a later coding
task without turning memory into an execution path.

## Smoke Flow

The smoke covers the intended sequence:

1. A safe verification summary is recorded.
2. A `project_fact` entry is committed with human-reviewed summary data.
3. A `pitfall` entry is committed for a docs-index miss:
   - trigger: verification failed because the docs index was missing
   - mitigation: update `docs/README.md` whenever adding a docs file
4. A later docs task recalls the pitfall into Context Assembly as a
   summary-only project knowledge ref.
5. The imported proposal includes both the new docs file and `docs/README.md`.
6. Revoking the pitfall removes it from later recall.
7. Event Log / Replay shows project knowledge commit/revoke/recall summaries.
8. Convert remains the real `web_table_to_csv` conversion flow.

## Safety Boundary

Project knowledge can improve the next task only through summary refs. It does
not write raw memory content, does not auto-commit model output, and does not
authorize execution.

The smoke verifies:

- no raw prompt, raw source, raw response, raw diff, or API key memory
- no `reasoning_content` persistence
- no automatic memory commit
- no model-direct policy write
- no App-side apply or rollback from memory
- no EventStore write from recall or replay
- no Git or shell execution from memory
- no native bridge
- no desktop action

## Test Coverage

The App smoke checks:

- commit project_fact
- commit pitfall
- recall pitfall
- Context Assembly includes project knowledge recall refs
- proposal preview includes the recalled docs-index mitigation path
- revoked pitfall no longer recalls
- Convert still works
- Event Log / Replay includes project knowledge events
- output remains summary-only

The Tauri smoke checks real command boundaries for commit, revoke, verification
summary events, and replay projection.
