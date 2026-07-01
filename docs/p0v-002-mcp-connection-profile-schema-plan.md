# P0V-002 MCP Connection Profile Schema Plan

## Scope

Add a runtime schema for MCP read-only connection profiles. Profiles describe
future discovery metadata only; they do not connect or execute anything.

## Non-Goals

- no MCP connection
- no tool invocation
- no resource content read
- no process spawn
- no Tauri command
- no App UI feature
- no EventStore writer

## Planned Fields

- `profileId`
- `displayName`
- `transportKind`
- `serverKind`
- `readOnlyPolicy`
- `allowedMethods`
- `timeoutMs`
- `maxMetadataBytes`
- `maxDescriptorCount`
- optional fixed stdio profile ref

## Validation Must Block

- missing profile id
- unknown transport
- user-supplied command fields
- shell command fields
- `tools/call`
- mutating methods
- resource content read by default
- unsafe timeout / size limits
- raw prompt/source/diff/API key markers
- App execution readiness flags

## Tests

Add `runtime/test/mcp-connection-profile-schema.test.ts` with explicit Vitest
path coverage for safe profiles, rejected command fields, rejected tools/call,
rejected resource content reads, and false execution readiness.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/mcp-connection-profile-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Commit

```text
feat(runtime): add mcp connection profile schema
```
