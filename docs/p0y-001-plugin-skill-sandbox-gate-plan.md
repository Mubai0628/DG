# P0Y-001 Plugin / Skill Sandbox Gate Plan

P0Y-001 defines the design gate before any v0.21 manifest, package metadata, sandbox, broker, or App surface implementation.

Scope:

- Add Plugin / Skill Sandbox ADR.
- Add threat model.
- Add implementation gate.
- Add P0Y-002 Plugin Manifest Schema plan handoff.

Non-goals:

- no plugin code execution in P0Y-001
- no skill runtime execution in P0Y-001
- no plugin installation
- no package lifecycle script execution
- no runtime manifest schema implementation
- no App UI implementation
- no native bridge
- no desktop action
- no arbitrary shell/process spawn
- no broad PermissionLease

Design questions:

- How plugin manifests enter as metadata first.
- How skill manifests enter as metadata first.
- How package metadata is scanned without code execution.
- How built-in safe skill simulation can be constrained to hardcoded non-mutating summaries.
- How Capability Broker descriptors represent plugin and skill metadata without enabling invocation.
- How redaction and boundary audits prove no raw package content, raw args, raw outputs, API keys, Authorization, bearer values, or secrets persist.

Implementation gate categories:

- Manifest schema safety.
- Package metadata safety.
- Capability descriptor safety.
- Sandbox contract safety.
- Redaction safety.
- Broker/risk safety.
- App UI safety.
- CI/boundary safety.

Required completion evidence:

- Docs-lock test confirms the ADR, threat model, implementation gate, and P0Y-002 plan exist.
- `pnpm lint`
- `pnpm app:test`
- `git diff --check`
- `git diff --cached --check`

Completion report format:

```text
任务：DW-P0Y-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Plugin / Skill Sandbox Gate 摘要：
- ADR:
- threat model:
- implementation gate:
- P0Y-002 plan:
- docs index:

关键不变量验证：
- docs/design only:
- no plugin code execution:
- no skill runtime execution:
- no native bridge:
- no desktop action:
- no arbitrary shell/process:
- no broad PermissionLease:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0Y-002 Plugin Manifest Schema, no runtime execution
```
