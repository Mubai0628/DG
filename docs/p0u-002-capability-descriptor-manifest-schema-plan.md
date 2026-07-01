# P0U-002 Capability Descriptor Manifest Schema Plan

## Scope

Implement the runtime schema, validator, normalizer, and summarizer for external
capability descriptors. The schema covers MCP, plugin, and skill metadata as
summary-only data contracts.

This task introduces metadata parsing only. It does not execute MCP tools,
connect to MCP servers, load plugin code, run skills, issue PermissionLease
grants, or write external execution events.

## Non-goals

- No MCP tool invocation.
- No MCP stdio process launch.
- No MCP HTTP/SSE/WebSocket connection.
- No plugin code loading, import, eval, or execution.
- No skill runtime execution.
- No App execution.
- No network fetch.
- No Tauri command.
- No EventStore write that implies execution.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.
- No production PermissionLease issuing.

## Runtime Module

Add:

- `runtime/src/capabilities/external-capability-manifest.ts`

Update exports as needed:

- `runtime/src/capabilities/index.ts`
- `runtime/src/index.ts`

## Descriptor Shape

The manifest should support:

- `schemaVersion`
- `capabilityId`
- `sourceType`: `mcp_server` | `plugin_package` | `skill_package`
- `displayName`
- `summary`
- `packageRef`
- `version`
- `risk`
- `invocationPolicy`
- `approvalPreview`
- `leasePreview`
- `inputSchemaSummary`
- `outputSchemaSummary`
- `documentationRefs`
- `provenanceRefs`
- `warningCodes`

All fields must remain summary-only. Raw arguments, executable command fields,
raw prompt/source/diff/output, secrets, and endpoint handles must be rejected or
redacted before any summary leaves the helper.

## Forbidden Fields

Block these fields at any depth:

- `apiKey`
- `apiKeyValue`
- `Authorization`
- `bearer`
- `token`
- `secret`
- `password`
- `envValue`
- `rawArgs`
- `rawPrompt`
- `rawSource`
- `rawDiff`
- `rawDom`
- `rawCsv`
- `stdout`
- `stderr`
- `command`
- `shellCommand`
- `gitCommand`
- `tauriCommand`
- `stdioCommand`
- `httpEndpoint`
- `sseEndpoint`
- `websocketEndpoint`
- `entrypoint`
- `script`
- `hook`
- `pluginRuntime`
- `skillRuntime`
- `eventStoreWrite`
- `permissionLease`
- `nativeBridge`
- `desktopAction`

## Validation Requirements

Block:

- missing `schemaVersion`.
- unsupported schema version.
- missing or duplicate `capabilityId`.
- unknown `sourceType`.
- unsupported invocation policy.
- descriptor claiming execution is enabled.
- approval or lease metadata claiming a grant is active.
- unsafe path refs: absolute path, Windows drive letter, UNC path, parent
  traversal, `.git`, `.env`, generated artifacts, or secret-like path.
- URL / endpoint metadata that would enable MCP HTTP/SSE/WebSocket connection.
- command, shell, git, native, desktop, plugin runtime, or skill runtime fields.
- secret-like values and fake API key markers.
- raw args, raw prompt, raw output, or raw workspace content.

Warn:

- missing documentation refs.
- missing provenance refs.
- ambiguous package source.
- ambiguous version.
- declared low risk with schema or invocation hints that require manual review.
- descriptors that are safe but require disabled/manual-only preview.

## Output Requirements

The summarizer should emit:

- normalized capability id.
- source type.
- display name.
- summary hash.
- risk summary.
- invocation policy summary.
- approval preview summary.
- lease preview summary.
- documentation/provenance ref counts.
- blocker/warning/finding counts.
- readiness with all execution flags false.
- source: `runtime_external_capability_manifest`.

The output must not include raw args, raw prompt, raw source, raw diff, raw DOM,
raw CSV, stdout, stderr, API key, Authorization, token, command, endpoint handle,
plugin code, skill runtime text, native bridge, or desktop action content.

## Tests

Add focused runtime tests for:

- safe MCP descriptor parses.
- safe plugin descriptor parses.
- safe skill descriptor parses.
- unsupported source blocks.
- duplicate ids block.
- command fields block.
- MCP stdio/http/SSE/WebSocket fields block.
- plugin entrypoint/runtime fields block.
- skill runtime fields block.
- secret marker blocks.
- unsafe path blocks.
- risk downgrade warns or blocks.
- output is summary-only.
- all execution readiness flags are false.

## Scoped Command Policy

Run only scoped checks for P0U-002:

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/external-capability-manifest.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until P0U-008.

## Local Commit Workflow

- Start with `git status --short`, `git status -sb`, and
  `git log --oneline origin/main..HEAD`.
- Stage only P0U-002 files.
- Commit locally.
- Do not push, tag, or create a release.

## Completion Report Format

Report changed files, scoped command results, schema/validator/summarizer
summary, boundary invariants, commit hash/subject, current git status, and next
task.
