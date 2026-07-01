# Project Knowledge Manual QA

Manual GUI QA for `v0.16.0-production-memory-project-knowledge-rc.1`.

Coverage phrases: commit project_fact, commit pitfall, commit policy, reject fake API key, E2E task sees recall, memory events show in replay.

## A. Pre-check

- Run `git status --short`.
- Run `git log --oneline origin/main..HEAD`.
- Run `pnpm verify:ci`.
- Run `pnpm release:smoke`.
- Run `pnpm app:qa:check`.

## B. Start

- Start the desktop shell with `pnpm app:dev`.
- Use a local workspace such as `D:\workspaces\demo`.

## C. Convert Smoke

- Load `runtime/test/fixtures/web-table-sample-payload.json`.
- Set filename to `web-table-export-p0t.csv`.
- Click Convert.
- Verify the CSV exists under the workspace `drafts` directory.
- Verify Result still shows `Event log events`.

## D. Project Knowledge Empty State

- Open the Project Knowledge surface.
- Use a workspace with no project knowledge entries.
- Refresh Project Knowledge.
- Verify the empty state is safe and does not show raw prompt, raw source, raw
  diff, raw response, raw CSV, or API key content.

## E. Commit Project Fact

- Create a `project_fact` candidate with summary-only text, evidence refs, and a
  safe namespace.
- Commit Project Knowledge.
- Verify the committed entry appears with a summary, hash/id, evidence count,
  and no raw content.

## F. Commit Pitfall

- Create a `pitfall` candidate with trigger and mitigation summaries.
- Commit Project Knowledge.
- Verify recall metadata is summary-only and the pitfall has safe warning codes
  if expected.

## G. Commit Policy

- Create a `policy` candidate from a human-reviewed source.
- Enter the required typed policy confirmation.
- Commit Project Knowledge.
- Verify model-suggested or tool-output policy attempts remain blocked unless
  the required human-reviewed boundary is satisfied.

## H. Reject Fake API Key

- Try a candidate containing an obvious fake marker such as
  `sk-FAKE_PROJECT_KNOWLEDGE_TEST_KEY`.
- Verify it is rejected or blocked.
- Verify the fake value is not persisted, replayed, or displayed.

## I. Revoke Entry

- Select a committed entry.
- Revoke Project Knowledge with a summary-only reason.
- Refresh and verify the entry is no longer active.

## J. Recall Into Context

- Preview Project Knowledge Recall for a coding task objective.
- Verify matching summaries enter Context Assembly as summary refs only.
- Verify excluded, revoked, or expired entries do not recall.

## K. E2E Task Sees Recall

- Use a docs-index style task that should match a committed pitfall.
- Verify Context Assembly includes the project knowledge recall ref.
- Verify the model proposal/import/chain surfaces stay preview-only unless a
  separate approved execution gate is used.

## L. Memory Events Replay

- Open Event Log / Replay.
- Verify project knowledge commit, revoke, expire, recall, and redaction audit
  summaries appear.
- Verify replay shows project knowledge event count, entry count, latest
  knowledge summary, latest recall summary, and redaction audit status.

## M. Raw Content Absent

- Inspect Project Knowledge, Recall, Context Assembly, Event Log / Replay, and
  Result.
- Verify no raw prompt, raw source, raw diff, raw CSV, raw response,
  `reasoning_content`, API key, or fake secret marker is displayed.

## N. Approved Apply / Rollback Still Works

- Use the existing approved apply and rollback manual smoke path.
- Verify approved apply still requires the existing human gate.
- Verify rollback remains checkpoint-backed and separate from memory recall.
- Verify project knowledge recall never enables automatic apply or rollback.

## O. Duplicate Filename

- Convert the same filename again.
- Verify the safe `FILE_EXISTS` error is shown and no existing draft is
  overwritten.

## Current Limitations

- No automatic memory commit.
- No model-direct policy write.
- No App-side project knowledge execution.
- No raw content memory.
- No arbitrary Git or shell execution.
- No native bridge.
- No desktop action.
