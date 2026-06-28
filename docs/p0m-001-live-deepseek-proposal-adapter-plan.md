# P0M-001 Live DeepSeek Proposal Adapter Plan

Status: next-task plan. Do not implement the live adapter in P0M-001.

## Scope

Write a design plan or ADR for an explicit opt-in live DeepSeek proposal
adapter. P0M-001 defines the live-call threat model, API key boundary,
opt-in gate, request boundary, response validation path, and non-execution
rules.

P0M-001 explicitly has:

- no live DeepSeek call in P0M-001
- no adapter implementation in P0M-001
- no API key read in P0M-001
- no fetch/network in P0M-001
- no file write
- no apply
- no rollback
- no App execution
- all proposal outputs remain draft / preview until later tasks

## Non-goals

- No real DeepSeek chat execution.
- No live proposal request.
- No API key access implementation.
- No model adapter implementation.
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

## Live Call Threat Model

The ADR must define assets, trust boundaries, attacker-controlled inputs, prompt
injection risks, model hallucination risks, unsafe path risks, secret leakage
risks, network/API key misuse risks, reasoning content mishandling risks,
event/replay confusion risks, approval bypass risks, and mitigations.

## API Key Boundary

P0M-001 must define where a future API key may come from, how explicit opt-in
is represented, how key presence is summarized without disclosure, and how
tests prove that P0M-001 itself does not read `DEEPSEEK_API_KEY`,
`OPENAI_API_KEY`, or any authorization material.

## Opt-in Gate

The future live adapter must require explicit opt-in before any network-capable
task. The design must state that disabled/default mode performs no API key
read, no fetch/network, and no model call.

## Model Request Boundary

The model request contract must be summary-only and must forbid raw source,
raw diff, raw patch, raw prompt, raw DOM, raw CSV, screenshots, clipboard
content, environment data, API keys, authorization headers, stdout, and stderr.

## Prompt / Context / No-Compress Requirements

Future live requests must use approved context assembly refs only. Safety
critical ids, proposal refs, validation refs, audit refs, approval refs,
snapshot refs, readiness refs, and rollback refs must remain in the
no-compress zone.

## Thinking / Tool Choice Restrictions

The design must state:

- Do not send tools for proposal generation.
- Do not send `tool_choice`.
- Thinking mode, if represented later, must not introduce tool calls.
- The live proposal path must not expose command, shell, Git, Tauri,
  EventStore, apply, rollback, PermissionLease, native bridge, or desktop
  action controls.

## Reasoning Content Handling

If the provider returns `reasoning_content`, it must be dropped or reduced to a
safe boolean/count summary. Raw reasoning content must not enter proposal
payloads, App UI, EventStore, memory, logs, or release artifacts.

## Response Schema Validation

All live model output must pass the existing P0L model patch proposal schema.
Blocked schema results must not enter the preview chain. Warning results may
enter only with warning summaries.

## Repair Loop Integration

The design must require deterministic local repair before any preview-chain
promotion. Repair may fix safe mechanical/schema issues only. Unsafe paths,
secret markers, raw content fields, execution fields, and authorization data
must fail closed.

## Forbidden Output Fields

Future live output must reject:

- `rawSource`
- `rawDiff`
- `rawPatch`
- `rawPrompt`
- `rawDom`
- `rawCsv`
- `rawScreenshot`
- `beforeContent`
- `afterContent`
- `fileContent`
- `preimageContent`
- `backupContent`
- `apiKey`
- `Authorization`
- `env`
- `stdout`
- `stderr`
- `command`
- `shellCommand`
- `gitCommand`
- `tauriCommand`
- `eventStoreWrite`
- `applyNow`
- `rollbackNow`
- `permissionLease`
- `desktopAction`
- `nativeBridge`

## Telemetry / Redaction Requirements

Telemetry must be summary-only. Future live proposal telemetry may contain
safe counts, hash prefixes, model profile id, status, and warning codes. It
must not persist raw prompt, raw response, raw source, raw diff, API key,
authorization material, environment data, or reasoning content.

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- v0.8 release is locked.
- P0M roadmap exists.
- Live DeepSeek proposal adapter is explicit opt-in.
- P0M-001 has no live DeepSeek call.
- P0M-001 has no API key read.
- P0M-001 has no fetch/network.
- Model output must go through schema / repair / validation / audit / approval
  chain.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.

## Scoped Command Policy

For P0M-001, run docs/app focused checks only:

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
- Stage only P0M-001 task files.

## Completion Report Format

```text
任务：DW-P0M-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Live DeepSeek Proposal Adapter 摘要：
- ADR:
- threat model:
- API key boundary:
- opt-in gate:
- response validation:

关键不变量验证：
- docs/design only:
- no live DeepSeek call:
- no adapter implementation:
- no API key read:
- no fetch/network:
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
- DW-P0M-002 API Key Access Policy / Opt-in Gate, no live call
```
