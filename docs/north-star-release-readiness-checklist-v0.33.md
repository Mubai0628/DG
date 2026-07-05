# North Star Release Readiness Checklist v0.33

Use this checklist before moving from local v1 candidate polish to the final RC
full gates.

## Required Manual QA Rows

- baseline Convert.
- approved apply / rollback.
- Git/shell verification.
- Project Knowledge recall.
- Live proposal generation.
- E2E coding task.
- MCP read-only discovery.
- MCP read-only tool execution.
- Plugin/skill metadata.
- Fixed multi-agent workflow.
- Desktop observer.
- Desktop action proposal.
- Approved desktop actions.
- Cross-surface workflow.
- Failure recovery.
- Replay/audit timeline.
- Packaging/migration dry-run.

## Release Readiness Gate

- Every row has setup, steps, expected result, must not happen, artifacts to
  inspect, and links to docs.
- Every enabled or approved-only lane has command or manual QA evidence.
- Every disabled or deferred lane has a blocker assertion.
- Artifact hygiene passes `pnpm check:artifacts`.
- Security boundaries pass `pnpm check:boundaries`.
- Secret scanning passes `pnpm check:secrets`.
- App tests pass `pnpm app:test`.
- Final RC full gates pass before push/tag/release.

## Blockers

- Any App live DeepSeek call.
- Any App API key read.
- Any App fetch/network.
- Any arbitrary Git/shell execution.
- Any broad native bridge.
- Any arbitrary desktop automation.
- Any mutating MCP tool.
- Any arbitrary plugin execution.
- Any arbitrary skill runtime.
- Any unapproved apply/rollback or desktop action.
- Any destructive migration, silent deletion, cloud sync, auto-update, or
  telemetry upload.
- Any raw prompt/source/diff/response/reasoning/DOM/CSV/screenshot/clipboard/file
  dialog/API key/Authorization/token/secret persistence.

## Exit Criteria

The v0.33 RC can proceed only when this checklist is green, the release notes
link every relevant doc, and GitHub Actions are green after the later push/tag
release flow.
