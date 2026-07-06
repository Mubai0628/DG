# v0.35.0-raw-transcript-output-persistence-rc.1

Raw transcript and output persistence foundation, no arbitrary shell.

## Scope

This RC closes P1M on top of the v0.34 permission mode and execution policy
foundation. It adds the transcript persistence baseline without enabling broad
command execution, arbitrary shell, Full Access execution, auto apply, recursive
delete, Git push, or autonomous loops.

## Current Working Flow

- v0.34 permission modes remain metadata/policy foundation.
- Transcript records can be validated and summarized.
- Redaction pipeline can summarize stdout/stderr-like output.
- Transcript store commands can write, list, read, delete, and export summaries.
- App Transcript Viewer displays redacted summaries.
- Retention, export, and delete policies are modeled.
- Replay can project transcript summary events.
- Redaction audit can verify summary-only transcript replay artifacts.
- Transcript smoke fixtures cover safe lanes and blocked raw/secret cases.
- No arbitrary shell is enabled.
- No command broker is enabled.
- No auto apply, recursive delete, Git push, autonomous loop, or Full Access
  execution is enabled.

## Explicit Non-goals

- No arbitrary shell.
- No automatic command execution.
- No auto apply.
- No arbitrary file deletion.
- No recursive directory deletion.
- No Git commit/push.
- No autonomous loop.
- No Full Access execution.
- No raw output shown by default.
- No cloud upload.
- No telemetry upload.

## Safety

- Redacted by default.
- Raw output gated.
- Summary-only retention policy.
- Delete/export summary-only.
- Redaction audit.
- No raw prompt, raw response, reasoning_content, or API key persistence.
- No command replay.
- Event Log / Replay shows transcript summaries only.
- Existing v0.1 Convert flow remains unchanged.

## Checks

The RC gate should include scoped P1M checks first, then full stage-end gates:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/transcript-schema.test.ts runtime/test/transcript-redaction.test.ts runtime/test/transcript-retention-policy.test.ts runtime/test/transcript-replay-projection.test.ts runtime/test/transcript-redaction-audit.test.ts runtime/test/transcript-smoke.test.ts`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

Manual GUI QA is tracked in
[`docs/raw-transcript-output-persistence-manual-qa.md`](raw-transcript-output-persistence-manual-qa.md).

## Recommended Release

- Tag: `v0.35.0-raw-transcript-output-persistence-rc.1`
- Title: `v0.35.0-raw-transcript-output-persistence-rc.1 — Raw transcript and output persistence foundation, no arbitrary shell`
