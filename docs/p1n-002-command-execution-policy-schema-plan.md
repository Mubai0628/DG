# P1N-002 Command Execution Policy / Request Schema Plan

Status: next-task plan. Do not implement command execution in P1N-002.

## Scope

Add a pure runtime schema, validator, normalizer, and summarizer for future
command broker requests and command execution policy decisions.

P1N-002 should define structured command request metadata, permission mode
readiness, session lease refs, risk budget refs, dangerous classifier refs,
transcript policy refs, timeout/output bounds, kill switch refs, and summary
readiness flags.

## Non-goals

- No command execution.
- No arbitrary shell execution.
- No Tauri command.
- No App command surface.
- No process spawn.
- No auto apply.
- No recursive delete.
- No Git commit or push.
- No autonomous loop.
- No full access execution.
- No network or fetch.
- No fetch/network.
- No API key read.
- No native bridge.
- No desktop action.

## Schema Direction

The future schema should include:

- request id
- command intent
- mode: fixed safe lane, autonomous safe verification, advanced workspace shell,
  or full access modeled
- executable ref
- argument summaries
- working directory scope
- permission mode ref
- session lease ref
- risk budget ref
- transcript policy ref
- kill switch ref
- timeout and output bounds
- environment policy summary
- expected transcript capture mode
- readiness flags that keep execution disabled in P1N-002

## Validation Direction

Validation must block:

- raw shell strings without structure
- hidden process execution fields
- raw env values
- API key, Authorization, token, bearer, password, and private key markers
- recursive delete
- Git commit, tag, push, force push, reset, checkout, and history rewrite
- auto apply or rollback
- autonomous loop execution
- full access execution enabled by default
- missing transcript policy
- missing kill switch ref
- missing output bounds
- unsafe working directory scope

Validation should warn:

- modeled full access mode
- advanced workspace shell requested without future execution gate
- missing evidence refs
- high output bounds
- long timeout
- raw output opt-in requested

## Output Direction

The result should be summary-only and include:

- status
- request id
- policy decision summary
- mode summary
- risk summary
- transcript policy summary
- timeout/output bound summary
- finding counts
- readiness flags with all execution flags false in P1N-002
- next action

## Tests

P1N-002 should add focused runtime tests for:

- safe fixed lane request parses
- autonomous safe verification request parses
- advanced workspace shell request is modeled but cannot execute
- full access mode is modeled but disabled by default
- raw shell string blocks
- recursive delete blocks
- Git commit/push blocks
- env secret markers block
- missing transcript policy blocks
- missing kill switch blocks
- output summary contains no raw command, raw output, or secrets
- all execution readiness flags remain false

## Scoped Command Policy

Run only P1N-002 scoped checks:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/command-execution-policy-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until the final RC stage.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P1N-002 files.
