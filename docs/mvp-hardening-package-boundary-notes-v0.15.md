# MVP Hardening Package / Boundary Notes v0.15

P0S-007 records low-risk build/package cleanup and boundary tightening for the
v0.15 MVP hardening phase. It does not add runtime features, App execution, new
Tauri commands, EventStore writers, Git/shell execution, native bridge, or
desktop action.

## Build Warnings

### Tauri Bundle Identifier

`pnpm app:build` reports that the configured identifier
`local.deepseek-workbench.app` ends with `.app`. Changing the identifier affects
package identity and future update/install behavior, so this is documented as a
non-blocking warning for v0.15 instead of being changed in a hardening task.

### Vite Chunk Size

`pnpm app:build` reports that the main production JavaScript chunk is larger
than 500 kB after minification. This App Shell is currently a single dense
desktop surface with many preview-only panels. Code-splitting is a product and
loading-behavior decision, so v0.15 documents the warning as non-blocking rather
than hiding it with a larger warning threshold.

### GitHub Actions Node 20 Annotation

The workflow already uses `actions/setup-node@v4` with Node 24. If GitHub
surfaces a Node 20 deprecation annotation from hosted action internals, treat it
as externally owned unless a later workflow run points to a repository-owned
action pin. Do not claim it is fixed without a green GitHub Actions run.

## Boundary Tightening

`scripts/check-boundaries.mjs` now includes MVP-specific checks:

- approved apply, approved rollback, and approved execution summary event
  command strings may appear only in the controlled desktop-flow wrapper and
  Rust command registration/implementation files.
- App source outside `app/src/desktop-flow.ts` must not call `safeInvoke` or
  direct Tauri `invoke`.
- App/runtime preview sources must not set execution readiness flags to `true`.
- App/runtime sources must not enable `nativeBridge` or `desktopAction`.

These rules keep approved apply/rollback commands as the only App-side write
lanes, keep Git/shell lanes fixed, keep live proposal paths from auto-apply,
and keep native bridge / desktop action disabled.

## Still Enforced

- no raw content in approved execution events.
- no raw prompt, raw response, raw source, raw diff, raw CSV, raw DOM,
  reasoning_content, API key, Authorization header, token, stdout, or stderr in
  UI summary outputs.
- no App-side live DeepSeek call.
- no App-side evaluation runner.
- no arbitrary Git/shell execution.
- no broad PermissionLease issuing.
- no replay event write or execution from replay surfaces.

## Verification

P0S-007 scoped checks include:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`
- `git diff --cached --check`
