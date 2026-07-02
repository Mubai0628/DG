# Plugin / Skill Host Smoke v0.20

This smoke checklist verifies the P0Y Plugin / Skill Sandbox MVP without
executing plugin or skill code.

Pre-check:

- `git status --short`
- `pnpm --filter @deepseek-workbench/runtime build`
- `pnpm --filter @deepseek-workbench/runtime typecheck`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`

Runtime smoke:

- validate a safe plugin manifest summary
- validate a safe skill manifest summary
- scan safe package metadata
- build a metadata-only sandbox contract
- build plugin / skill broker descriptor previews
- run plugin / skill redaction audit over the summaries
- verify readiness flags keep plugin install, skill runtime, invocation,
  EventStore write, network, filesystem write, Git, shell, native bridge,
  desktop action, and App execution disabled

App smoke:

- open the Plugin / Skill Host panel
- paste safe plugin manifest JSON
- paste safe skill manifest JSON
- paste safe package metadata summary JSON
- click `Preview Plugin Manifest`
- verify status, counts, risk summary, sandbox mode, and broker descriptor
  preview are summary-only
- verify `Install Plugin (disabled)`, `Run Skill (disabled)`, and
  `Execute Plugin Capability (disabled)` remain disabled
- open the Plugin / Skill Redaction Audit panel
- click `Preview Plugin / Skill Audit`
- verify no raw metadata, raw package content, raw prompt, raw args, raw output,
  raw source, raw diff, API key, Authorization, bearer token, install script,
  command, native bridge, desktop action, or execution readiness appears
- verify `Run Plugin / Skill Audit (disabled)` and
  `Write Plugin / Skill Audit Event (disabled)` remain disabled

Regression smoke:

- Convert still remains the real `web_table_to_csv` flow
- Event Log / Replay still shows existing summary events
- Capability Host legacy descriptor preview remains read-only
- MCP read-only tool execution remains fixed allowlist only
- App approved execution remains gated separately and is not affected by P0Y

Current limitations:

- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no plugin installation
- no mutable broker invocation
- no PermissionLease issuance for plugin / skill execution
- no EventStore write for plugin / skill audit
- no native bridge
- no desktop action
