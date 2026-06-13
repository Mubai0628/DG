# Contributing

Thanks for helping build DeepSeek Workbench.

## Development scope

Work should follow the task sequence in `deepseek_workbench_v0_2_1_codex_pack/tasks/tasks.yaml`. Do not implement later phases early.

For DW-P0A-001, the accepted scope is only the pnpm workspace, TypeScript runtime skeleton, linting, formatting, tests, dry conformance stub, replay stub, and documentation boundaries.

## Local commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm run replay -- --demo
```

Default commands must not require a DeepSeek API key.

## Safety expectations

Do not commit secrets, `.env` files, browser storage dumps, raw DOM, raw prompts, screenshots from private pages, or generated draft CSV files containing private data.
