# Plugin / Skill Sandbox Implementation Gate v0.20

Do not implement arbitrary plugin code execution until P0Y gates are satisfied and a later execution-specific ADR is accepted.

Do not implement skill runtime execution in P0Y.

Every gate item below must be testable. No item may rely on prose alone.

## Manifest Schema Safety

- Plugin manifest tests block raw code, source code content, bundle content, lifecycle scripts, shell commands, native module markers, API keys, raw prompt/source/diff fields, desktop action, native bridge, filesystem write requests, and network credentials.
- Skill manifest tests block raw prompt templates with secrets, raw tool args, raw code, shell/Git commands, direct filesystem writes, network credentials, arbitrary MCP tool invocation, plugin execution requests, native bridge, desktop action, and lifecycle scripts.
- Duplicate capability or step IDs are blocked.
- Readiness flags that imply execution are blocked.

## Package Metadata Safety

- Package scanner tests prove file-list summaries are scanned without reading raw package contents.
- Lifecycle scripts are blocked.
- Native/binary module markers are blocked.
- Unsafe paths, `.env`, `.git`, secret files, generated artifacts, and executable script entrypoints are blocked.
- Oversized metadata is blocked.

## Capability Descriptor Safety

- Broker integration tests prove plugin and skill descriptors are read-only previews.
- Descriptor IDs are unique.
- Execution-ready modes are blocked.
- Invoke policies remain disabled or manual-only preview.
- PermissionLease issuance remains false.

## Sandbox Contract Safety

- Sandbox contract tests enumerate allowed modes: `disabled`, `metadata_only`, and `simulated_builtin_safe`.
- Tests prove arbitrary code, package runtime, shell, native, desktop, network, filesystem write, and EventStore write modes are denied.
- Built-in safe skill simulation tests prove simulations are hardcoded, non-mutating, summary-only, and do not import external packages.

## Redaction Safety

- Redaction audit tests block raw source, raw package file contents, raw prompt, raw args, raw outputs, API keys, Authorization, bearer values, install scripts, shell commands, native bridge, desktop action, and arbitrary execution flags.
- Output tests prove reports are summary-only.

## Broker/Risk Safety

- Risk classifier tests prove write, network, UI, native, desktop, shell, and high-risk custom claims cannot become auto-invokable.
- Broker tests prove broad PermissionLease is not issued.

## App UI Safety

- App tests prove the Plugin / Skill Host is read-only.
- App tests prove Install Plugin, Run Skill, and Execute Plugin Capability controls are disabled placeholders.
- App tests prove no Tauri invoke, fetch/network, EventStore write, native bridge, desktop action, arbitrary shell, or arbitrary process spawn is added.

## CI/Boundary Safety

- Boundary checks block App fetch/live plugin calls, raw API key output, env secret reads, Tauri commands, EventStore writes, apply/rollback, Git/shell/native bridge execution, and arbitrary process spawn.
- `pnpm check:boundaries` and `pnpm check:secrets` remain required for implementation stages.
