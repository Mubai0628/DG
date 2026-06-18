# Shell Allowlist v0.2

Status: skeleton only. P0F-008 defines command templates, planning, fixture
simulation, output summaries, and future approval hooks. It does not execute a
real command.

## Scope

The Shell Allowlist is a future Execution Plane lane for local verification
commands. This phase is intentionally inert:

- no real shell execution
- no `child_process`, spawn, or exec usage in runtime shell code
- no arbitrary command strings
- no install commands
- no network commands
- no destructive commands
- no desktop action

Allowed templates are fixed argv arrays:

- `pnpm.test` -> `pnpm test`
- `pnpm.lint` -> `pnpm lint`
- `pnpm.typecheck` -> `pnpm typecheck`
- `pnpm.verify_ci` -> `pnpm verify:ci`
- `cargo.check_tauri` -> `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `tsc.runtime_build` -> `pnpm --filter @deepseek-workbench/runtime build`

These templates can be planned and simulated from fixtures only. They are not a
runtime command service.

## Planning Model

Each template declares:

- command id
- category
- fixed argv
- cwd policy
- env policy
- timeout policy
- output policy
- execution mode
- risk level

The planner returns a `ShellCommandPlan` with a safe argv fingerprint and
summary-only reasons. It rejects requests that include a raw command string,
custom argv, or custom executable.

## Deny Rules

The skeleton rejects:

- shell metacharacters
- user-provided executable paths
- `curl`, `wget`, `powershell`, `cmd`, `bash`, `sh`, `rm`, `del`, `format`,
  `chmod`, `chown`, `sudo`, `ssh`, and `scp`
- `pnpm install` and `npm install`
- Git write commands through shell templates
- secret-like env names
- unsafe cwd values
- unbounded output policies
- excessive timeouts

The allowlist is not a substitute for sandboxing. Future real execution would
need a separate sandbox adapter, explicit approval, a permission lease, and an
auditable event chain.

## Fake Runner

`FakeShellRunner` accepts a planned command and fixture data:

```json
{
  "exitCode": 0,
  "stdout": "PASS",
  "stderr": "",
  "durationMs": 1200
}
```

The runner summarizes output deterministically. It records line counts, byte
counts, success or failure markers, redaction counts, truncation status, and
safe short previews. It never launches a process.

## Output and Events

Events are summary-only:

- `shell.command.planned`
- `shell.command.rejected`
- `shell.command.simulated`
- `shell.output.summarized`

Event payloads may include command id, template id, argv fingerprint, category,
status, exit code, duration, line counts, finding codes, and warning codes.
They must not include raw large stdout or stderr, raw prompts, raw source code,
DOM, CSV, screenshots, clipboard data, API keys, authorization headers, or env
values.

## Integrations

- Capability Broker: shell descriptors are native descriptors, but they are
  `DISABLED` and `SIMULATE`; none are `AUTO`.
- Agent Dossier: shell summaries become evidence refs, not raw output.
- Context Ledger: shell summaries enter `volatile_tail`, never frozen prefix.
- Memory Core: shell failures may become pitfall candidates only; they are not
  auto-committed.

## Non-Goals

- no arbitrary shell
- no real execution
- no install command lane
- no network command lane
- no destructive command lane
- no desktop action
- no MCP/plugin/skills runtime
