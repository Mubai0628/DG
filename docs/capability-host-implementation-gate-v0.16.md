# Capability Host Implementation Gate v0.16

## Purpose

This gate defines the testable requirements that must pass before Capability
Host work can move beyond descriptor-first metadata previews. Every item below
must be backed by code tests, docs-lock tests, boundary checks, or manual QA
evidence in the task that claims it.

```text
Do not implement MCP/plugin/skill execution until descriptor, broker, audit, App UI, and redaction gates are complete.
```

## Gate Categories

Required gate category phrases:

- descriptor schema safety.
- source identity safety.
- path / URL metadata safety.
- command/execution field safety.
- secret/redaction safety.
- capability broker mapping safety.
- App UI safety.
- CI/boundary checker safety.
- docs/replay safety.

### Descriptor Schema Safety

- Test descriptor parsing for MCP, plugin, and skill source types.
- Test that unsupported schema versions block.
- Test that unknown source types block.
- Test that duplicate capability ids block.
- Test that descriptors normalize to summary-only output.
- Test that raw args, raw prompt, raw source, raw diff, raw DOM, raw CSV, stdout,
  stderr, file contents, and executable examples do not appear in output.

### Source Identity Safety

- Test package name, provider, source type, and version normalization.
- Test version spoofing warnings or blockers.
- Test dependency confusion warning codes for ambiguous package sources.
- Test id collision blockers across MCP, plugin, and skill descriptors.
- Test that provenance refs are summaries or hashes, not raw package contents.

### Path / URL Metadata Safety

- Test parent traversal, absolute path, Windows drive letter, UNC path, `.git`,
  `.env`, generated artifact, and secret-like path blockers.
- Test private endpoint and connection-capable endpoint metadata blockers.
- Test that MCP HTTP/SSE/WebSocket connection fields are not emitted as usable
  connection handles.
- Test that safe docs refs remain summary-only.

### Command / Execution Field Safety

- Test command, shellCommand, gitCommand, tauriCommand, desktopAction,
  nativeBridge, process, script, hook, entrypoint, lifecycle command, and raw
  args blockers at any depth.
- Test that MCP stdio command fields block.
- Test that plugin import/eval/runtime fields block.
- Test that skill runtime execution fields block.
- Test that all execution readiness flags remain false.

### Secret / Redaction Safety

- Test API key, token, Authorization, bearer, password, private key marker,
  env value, and secret-like string blockers.
- Test redaction summaries contain counts, hashes, source types, and warning
  codes only.
- Test output does not include raw secret-bearing metadata.
- Test boundary checker coverage for source and App surfaces.

### Capability Broker Mapping Safety

- Test descriptors map into Capability Broker preview structures only.
- Test invocation policy defaults to disabled or manual-only preview.
- Test risk computation cannot be downgraded by descriptor-declared risk.
- Test approval preview and lease preview cannot grant execution authority.
- Test broker output is safe for replay as preview metadata only.

### App UI Safety

- Test App Capability Host surface is read-only.
- Test no enabled Invoke, Execute, Connect, Install, Import Code, Load Plugin,
  Run Skill, Issue Lease, Approve, Reject, Apply, Rollback, Git, Shell, Native
  Bridge, or Desktop Action button exists.
- Test App does not call fetch, Tauri capability commands, MCP, plugin runtime,
  skill runtime, EventStore external execution writers, Git, shell, native
  bridge, or desktop actions.
- Test App shows disabled/manual-only labels for external capabilities.

### CI / Boundary Checker Safety

- Test scoped runtime and App tests with explicit file paths for ordinary
  tasks.
- Keep full gates for stage-end RC work only.
- Keep boundary checks blocking network fetch, env secret reads, Tauri command
  additions, EventStore execution writes, Git/shell execution, native bridge,
  desktop action, MCP execution, plugin execution, and skill execution.
- Classify docs/test-only references narrowly when denylist strings are needed.

### Docs / Replay Safety

- Docs must state descriptor previews are not execution events.
- Replay surfaces must not show external capability execution occurred.
- Manual QA must verify disabled controls and summary-only metadata.
- Release notes must preserve no-external-execution boundaries.

## Exit Criteria for Future Execution Work

Future MCP/plugin/skill execution work remains blocked until all of these are
true:

- Descriptor schema, scanner, broker mapping, App surface, and redaction audit
  have dedicated tests.
- Boundary checker proves App/runtime default paths do not execute external
  capabilities.
- Manual QA proves App controls remain disabled.
- Replay can distinguish descriptor preview from execution event.
- A later explicit roadmap task separately authorizes a narrow execution path.

Until then, Capability Host output is metadata only.
