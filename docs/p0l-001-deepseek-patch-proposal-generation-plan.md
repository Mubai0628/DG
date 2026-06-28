# P0L-001 DeepSeek Patch Proposal Generation Plan / ADR

Status: next-task plan. Do not implement model proposal generation in P0L-001.

## Scope

Write a design plan or ADR for DeepSeek-assisted patch proposal generation.
P0L-001 defines how a future model output can become a structured patch
proposal draft. It must remain design-only.

P0L-001 explicitly has:

- no live DeepSeek call
- no model implementation
- no file write
- no apply
- no rollback
- no App execution
- all proposal outputs remain draft / preview until later tasks

## Non-goals

- No real DeepSeek chat execution.
- No DeepSeek autonomous coding loop.
- No patch apply.
- No rollback.
- No user workspace mutation.
- No App-side approval execution.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No capability invocation.
- No production PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

## Model I/O Contract

The ADR must define a strict model I/O contract:

- Input is summary-only context refs, proposal intent, constraints, and safe
  evidence refs.
- Output is a structured patch proposal draft.
- Output is not raw source, raw diff, raw patch, raw prompt, stdout, stderr,
  environment data, API key, or authorization material.
- Output must include path refs, change summaries, risk hints, validation
  expectations, and evidence refs.
- Output must be schema validated before entering existing proposal surfaces.

## Prompt Boundary

Prompts must be assembled only from approved summaries and no-compress refs.
P0L-001 must define what context may be included and must forbid raw source,
raw diff, raw DOM, raw CSV, raw prompt, secrets, and API keys.

## Context Assembly Requirements

Future model proposal generation must consume existing Context Assembly Preview
evidence. The design must state that no model request is sent in P0L-001 and
that later model requests require explicit gates.

## No-Compress Requirements

Evidence refs required for safety, including proposal ids, validation ids,
snapshot contract refs, readiness refs, approval refs, and rollback refs, must
remain in the no-compress zone when used by future model proposal generation.

## Patch Proposal Schema Requirements

The future schema must define:

- proposal id
- title
- objective summary
- change summary
- affected path refs
- change kind
- estimated line counts
- risk level
- required validation refs
- evidence refs
- warning codes
- model output hash

## Forbidden Output Fields

The design must forbid:

- `content`
- `fileContent`
- `preimageContent`
- `backupContent`
- `rawSource`
- `rawDiff`
- `rawPatch`
- `beforeContent`
- `afterContent`
- `rawPrompt`
- `rawDom`
- `rawCsv`
- `rawScreenshot`
- `clipboard`
- `apiKey`
- `Authorization`
- `env`
- `stdout`
- `stderr`
- `realAbsolutePath`
- `backupFilePath`

## Reasoning Content Handling Reminder

Reasoning content must not be treated as patch content. If a model provider
returns reasoning content, it must be dropped or summarized according to the
existing DeepSeek adapter policy and must not enter proposal payloads, events,
or App UI as raw text.

## JSON / Tool-Call Repair Considerations

The ADR must define repair behavior for invalid JSON, missing required fields,
unsafe paths, forbidden raw fields, secret markers, and schema version
mismatches. Repair attempts must be bounded, summary-only, and must not write
files or execute tools.

## Secret / Path Guard Requirements

Every model proposal draft must pass:

- secret scan
- path traversal guard
- Windows drive / UNC guard
- symlink, junction, and reparse point policy
- `.git`, `.env`, dependency directory, generated artifact, and secret path
  deny rules
- schema validation
- patch proposal validation preview
- diff audit preview
- approval draft
- virtual apply preview
- rollback checkpoint preview
- replay projection

## Evidence Refs

Future proposal drafts should carry refs to:

- context assembly preview
- workspace index summary
- patch proposal creation preview
- validation preview
- diff audit preview
- approval draft
- virtual apply preview
- rollback checkpoint preview
- user workspace snapshot / backup contract
- promotion readiness summary
- event/replay projection summary

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- P0L roadmap exists
- P0L-001 plan exists
- DeepSeek patch proposal generation is draft-only
- model must not write files
- model output must enter validation / audit / approval chain
- no App execution
- no Git or shell execution
- no native bridge or desktop action

## Scoped Command Policy

For P0L-001, run docs/app focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates unless the task expands beyond docs and docs-lock tests.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0L-001 task files.

## Completion Report Format

```text
任务：DW-P0L-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

DeepSeek Patch Proposal Generation 摘要：
- plan / ADR:
- model I/O:
- prompt boundary:
- schema:
- safety gates:

关键不变量验证：
- docs/design only:
- no live DeepSeek call:
- no model implementation:
- no file write:
- no apply/rollback:
- no App execution:
- no Git/shell execution:
- no native bridge:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0L-002 Patch Proposal Schema for Model Output, no model call
```
