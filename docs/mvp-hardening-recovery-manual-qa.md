# MVP Hardening / Recovery Manual QA

Use this checklist for `v0.15.0-mvp-hardening-recovery-rc.1` manual GUI QA.
The goal is to validate recovery, replay, and regression hardening while
preserving the narrow execution lanes.

## Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- Confirm scoped checks and full gates passed locally.
- Confirm no generated artifacts are staged.

## Start

- Run `pnpm app:dev`.
- Use the source-tree runner mode.
- Keep all live model paths explicitly opt-in and proposal-only.

## Convert Smoke

- Use the `web_table_to_csv` Convert flow with a safe table payload.
- Verify the CSV draft is written under `workspace/drafts/`.
- Repeat the same filename and verify the safe `FILE_EXISTS` path.
- Confirm Event Log / Replay still updates after Refresh events.

## Live Proposal Generation

- Confirm App live proposal generation remains explicit opt-in.
- Confirm no auto-apply follows proposal generation.
- Confirm generated proposals enter repair/schema/import/chain previews before
  any approved execution path.

## Approved Apply

- Use an approved apply fixture with a valid receipt and typed confirmation.
- Confirm approved apply remains human-approved and typed-confirmation gated.
- Confirm stale snapshot and conflict cases fail closed before mutation.
- Confirm summary-only approved execution events are recorded only by the
  approved event wrapper.

## Verification Lane

- Run fixed verification safe lanes through the sequencer.
- Confirm Git read lanes stay read-only.
- Confirm shell verification lanes stay fixed-template only.
- Confirm no arbitrary Git/shell command is exposed.

## Event Log / Replay

- Refresh events after proposal, apply, verification, rollback, and failure
  scenarios.
- Confirm Event Log / Replay shows summary counts and safe event ids.
- Confirm Approved Execution Replay Timeline shows proposal, validation, audit,
  approval receipt, apply, checkpoint, verification, rollback, and final status
  stages.
- Confirm missing events produce warnings and duplicate event ids are
  deduplicated.

## Rollback

- Run rollback from an approved checkpoint fixture.
- Confirm rollback remains checkpoint-based and validates current file hash /
  bytes before mutation.
- Confirm stale current file state blocks rollback with safe guidance.

## Stale Conflict

- Exercise conflict after approval and stale snapshot fixtures.
- Confirm the App blocks apply or rollback before unsafe writes.
- Confirm the recovery surface shows safe failure codes only.

## Failure Recovery UX

- Preview apply failure, partial checkpoint, rollback failure, and verification
  failure states.
- Confirm Approved Execution Recovery does not auto-retry, does not rollback
  from the panel, does not write files, and does not write events.
- Confirm disabled buttons remain disabled: retry apply, rollback from recovery,
  write recovery event, replay write event, and execute from timeline.

## Raw Content Absence

- Confirm no raw content appears in UI, events, replay, or recovery summaries:
  raw source, raw diff, raw prompt, raw response, raw CSV, raw DOM,
  reasoning_content, API key, Authorization header, token, stdout, stderr, or
  raw backup content.
- Confirm summaries use ids, counts, hashes, warning codes, blocker codes,
  checkpoint ids, and safe messages only.

## No Expansion Checks

- no auto-apply.
- no autonomous coding loop.
- no arbitrary Git/shell.
- no broad PermissionLease.
- no MCP/plugin/skills runtime.
- no native bridge.
- no desktop action.
- no raw content in events.

## Current Limitations

- App-side apply/rollback exists only through the approved execution lane.
- App live proposal generation is proposal-only and explicit opt-in.
- App does not run arbitrary Git/shell commands.
- App does not expose native bridge or desktop action.
