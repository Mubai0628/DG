# P0Z-001 Fixed Multi-Agent Execution Gate Plan

P0Z-001 defines the design gate before implementing the fixed multi-agent run
plan schema, orchestrator, role adapters, broker planning, App surface, events,
or smoke flow.

Scope:

- Add Fixed Multi-Agent Execution ADR.
- Add threat model.
- Add implementation gate.
- Add P0Z-002 Agent Run Plan / Handoff Contract Schema plan.

Non-goals:

- no runtime fixed-agent implementation in P0Z-001
- no App UI implementation in P0Z-001
- no dynamic agent bidding
- no arbitrary agent creation
- no hidden raw prompt sharing
- no autonomous arbitrary tool execution
- no agent direct apply/rollback
- no agent direct Git/shell execution
- no agent direct MCP mutating tool invocation
- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no native bridge
- no desktop action
- no broad PermissionLease

Design questions:

- How fixed roles map to fixed routes.
- How summary-only handoff dossiers flow between agents.
- How evidence refs prove what each agent saw without exposing raw prompt,
  source, diff, preimage, API key, or raw model response.
- How agents request capability plans through Capability Broker without direct
  invocation.
- How human approval and typed confirmation remain mandatory before apply or
  rollback.
- How summary-only agent events and replay timelines avoid hidden execution.

Implementation gate categories:

- Role safety.
- Route safety.
- Dossier safety.
- Evidence ref safety.
- Capability safety.
- Memory/context safety.
- Approval safety.
- Apply/rollback safety.
- Event/replay safety.
- App UI safety.
- CI/boundary safety.

Required completion evidence:

- Docs-lock test confirms the ADR, threat model, implementation gate, and
  P0Z-002 plan exist.
- `pnpm lint`
- `pnpm app:test`
- `git diff --check`
- `git diff --cached --check`

Completion report format:

```text
任务：DW-P0Z-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Fixed Multi-Agent Execution Gate 摘要：
- ADR:
- threat model:
- implementation gate:
- P0Z-002 plan:
- docs index:

关键不变量验证：
- docs/design only:
- no dynamic bidding:
- no arbitrary agent creation:
- no hidden raw prompt sharing:
- no direct agent tool execution:
- no native bridge:
- no desktop action:
- no broad PermissionLease:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0Z-002 Agent Run Plan / Handoff Contract Schema
```
