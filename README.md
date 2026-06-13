# DeepSeek Workbench

DeepSeek Workbench is a local-first, DeepSeek-native desktop agent workbench skeleton.

This is an unofficial community project. It is not produced, endorsed, or supported by DeepSeek.

## Release scope

The first release target is v0.1.0 and only covers the `web_table_to_csv` vertical slice:

1. A user explicitly authorizes a Chromium extension to read the current tab.
2. Only visible DOM/table content is captured.
3. Captured content is redacted before model processing.
4. DeepSeek or a fake client extracts a table.
5. The runtime writes CSV drafts under `workspace/drafts/*.csv`.
6. Events are recorded and can be replayed.

## Explicit non-goals for v0.1.0

v0.1.0 does not:

- Control arbitrary desktop apps.
- Execute real mouse clicks.
- Submit forms.
- Read cookies, localStorage, or sessionStorage.
- Read password field values.
- Read or store API keys by default.
- Call the real DeepSeek API in default tests.
- Store raw prompt or raw DOM logs by default.

## Current task status

DW-P0A-001 initializes the repository skeleton only. It does not implement ConversationEngine, Browser Extension, Memory, Tool Broker, Event Store, or real ReplayEngine logic.

`pnpm run replay -- --demo` currently prints a clear TODO/stub message and exits 0. DW-P0A-002 will implement Event Store + Replay.

## Development

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm run replay -- --demo
```

## Workspace layout

```text
app/
browser-extension/
conformance/
docs/
evals/
runtime/
```

The only TypeScript package in DW-P0A-001 is `runtime/`.
