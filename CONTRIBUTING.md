# Contributing

Thanks for helping build DeepSeek Workbench.

## Setup

```bash
pnpm install
```

Useful local commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:v0.1-slice
pnpm check:boundaries
pnpm check:secrets
```

Default commands must not require a DeepSeek API key or network access to the
DeepSeek API.

## Required checks before a pull request

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm verify:v0.1-slice
pnpm check:boundaries
pnpm check:secrets
```

`pnpm test:conformance:live` should print `SKIPPED_LIVE_CONFORMANCE` unless the
manual live opt-in gates are deliberately provided outside CI.

## Scope-control rules

- Do not add new browser permissions without an issue or architecture decision.
- Do not add host permissions, `nativeMessaging`, or an automatic browser bridge
  for v0.1.x work.
- Do not add a filesystem write path outside `DraftWriter` and
  `WorkspacePathGuard`.
- Do not write raw prompt, raw DOM, raw CSV, screenshots, clipboard data, API
  keys, authorization headers, or full URL query strings into events.
- Do not add live API tests to default CI.
- Do not introduce Playwright, Puppeteer, jsdom, Electron, CDP, MCP, robotjs, or
  nut-js without reopening project scope.
- Keep Tool Broker registration explicit and whitelist-only.

## Commit guidance

- Keep commits narrow and explain the user-facing or safety-facing reason.
- Do not commit generated artifacts such as `runtime/dist/`,
  `browser-extension/dist/`, `.tmp/`, `conformance/results/`, `evals/reports/`,
  draft CSV files, or local payload files.
- Do not commit `deepseek_workbench_v0_2_1_codex_pack/`, local process notes, or
  private review material.
- Keep README, SECURITY, and docs aligned with actual scripts and behavior.
