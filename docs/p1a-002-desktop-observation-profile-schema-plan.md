# P1A-002 Desktop Observation Profile Schema Plan

## Scope

P1A-002 adds a pure runtime schema, validator, normalizer, and summarizer for
desktop observation profiles. It does not observe the desktop, call Tauri,
capture screenshots, add App UI, write EventStore, send model requests, or
perform desktop action.

## Non-goals

- No desktop observation.
- No OS calls.
- No Tauri command.
- No screenshot capture.
- No raw screenshot persistence.
- No raw OCR text persistence.
- No App UI.
- No desktop action.
- No click/type/select.
- No clipboard write.
- No default clipboard read.
- No file dialog automation.
- No hidden background capture.
- No screen recording.
- No model auto-send.
- No native bridge broad action.

## Runtime Files

Add:

- `runtime/src/desktop-observer/desktop-observation-profile.ts`
- `runtime/src/desktop-observer/index.ts`

Update runtime exports only as needed.

## Profile Contract

The profile input should define fixed capture and redaction policy metadata:

- `profileId?`
- `displayName`
- `observationMode`: `disabled` | `metadata_only` |
  `screenshot_metadata_only`
- `scope`
- `capturePolicy`
- `redactionPolicy`
- `maxWindowCount`
- `maxDisplayCount`
- `includeWindowTitles`
- `includeProcessNames`
- `includeDisplayMetadata`
- `includeScreenshotMetadata`
- `createdAt?`
- `idGenerator?`

## Validation Rules

Block:

- unknown observation mode
- missing display name
- desktop action allowed
- click/type/select allowed
- clipboard write allowed
- default clipboard read allowed
- file dialog automation allowed
- hidden background capture allowed
- screen recording allowed
- raw screenshot persistence allowed
- raw OCR persistence allowed
- send-to-model enabled
- max window/display counts above policy limits
- raw prompt/source/diff/response/API key fields
- secret markers

Warn:

- window titles included
- process names included
- screenshot metadata mode enabled
- redaction policy omitted or weak
- high window/display count near the limit

## Output Summary

The normalized profile summary must include status, profile id, display name,
observation mode, capture/redaction summaries, finding counts, profile hash,
next action, and readiness flags. All execution readiness flags must remain
false, including desktop action, click/type/select, clipboard write, file
dialog automation, EventStore write, Git/shell, PermissionLease, and App
execution.

## Tests

Add:

- `runtime/test/desktop-observation-profile.test.ts`

Cover safe profile, disabled profile, screenshot metadata warning, raw
screenshot blocked, raw OCR blocked, desktop action blocked, clipboard blocked,
hidden capture blocked, send-to-model blocked, secret marker blocked,
deterministic id/hash, and execution readiness flags false.

## Docs

Add:

- `docs/runtime-desktop-observation-profile-v0.22.md`

Update `docs/README.md` and any docs-lock tests.

## Scoped Commands

- `git status --short`
- `git status -sb`
- `git log --oneline origin/main..HEAD`
- `pnpm --filter @deepseek-workbench/runtime build`
- `pnpm --filter @deepseek-workbench/runtime typecheck`
- `pnpm exec vitest run runtime/test/desktop-observation-profile.test.ts`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`
- `git diff --cached --check`

Do not run full gates until the P1A RC task.

## Local Commit Workflow

Stage only P1A-002 files and commit locally. Do not push, tag, or create a
GitHub Release.

## Completion Report Format

Report changed files, scoped typecheck, focused runtime tests, focused app/docs
tests, security checks, skipped full gates, safety invariants, local commit
hash and subject, `git status --short`, and `git log --oneline
origin/main..HEAD`.
