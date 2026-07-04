# External Capability Execution Hardening Implementation Gate v0.30

Every gate item must be backed by tests or source-boundary checks before a
future implementation can claim readiness.

## Descriptor Safety

- Test descriptor missing id, source type, provenance, or risk level.
- Test descriptor id mismatch across policy, lease, result, event, and replay
  summaries.
- Test mutating capability marked read-only.
- Test descriptor drift and stale evidence warnings.

## Policy / Lease Safety

- Test missing approval receipt for approval-required capability.
- Test PermissionLease scope mismatch.
- Test expired lease.
- Test typed confirmation mismatch.
- Test AUTO mode on mutating or high-risk capability.
- Test readiness flags cannot claim broad execution.

## MCP Read-only Tool Safety

- Test contract is read-only.
- Test tool id is allowlisted.
- Test MCP profile id matches.
- Test timeout and output bytes stay within bounds.
- Test mutating tool disguised as read-only blocks.
- Test event and replay summaries exist.

## Plugin / Skill Sandbox Safety

- Test lifecycle scripts, postinstall/preinstall, native modules, binary
  payloads, shell scripts, network permissions, filesystem write permissions,
  process execution permissions, dynamic import/eval markers, native bridge
  markers, desktop action markers, secret access markers, clipboard write
  markers, file dialog automation markers, mutating capability claims, and
  broad permission claims.
- Test no plugin code or skill runtime executes.

## Result Redaction Safety

- Test raw tool args and raw tool output block.
- Test raw stdout/stderr blocks.
- Test raw package content blocks.
- Test raw source, raw prompt, raw response, raw diff, API key, Authorization,
  Bearer, token, and secret markers block.

## Replay Completeness

- Test every external result has id, descriptor ref, source type, risk summary,
  redaction summary, and replay projection.
- Test event-written results include summary event refs.
- Test replay cannot include raw output.

## App UI Safety

- Test App audit surface renders read-only.
- Test disabled placeholders cannot invoke external capability execution.
- Test App source has no new fetch/network, Tauri invoke, EventStore write,
  process, Git/shell, or native bridge path.
- Test raw output/API key input is absent or blocked.

## CI / Boundary Safety

- Test focused runtime files with explicit Vitest paths.
- Run `pnpm app:test` for docs/App source locks.
- Run `pnpm check:boundaries` and `pnpm check:secrets`.
- Run full gates only in the RC release stage.

## Stop Rule

Do not enable mutating MCP tools, arbitrary plugin code execution, or arbitrary
skill runtime in v0.30.
