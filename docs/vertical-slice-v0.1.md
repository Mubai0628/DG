# v0.1 Vertical Slice Architecture

The v0.1 release proves one local-first workflow: visible web table to local CSV
draft with replayable summary events.

## Flow

```text
Chromium extension popup
  -> sanitized BrowserDomPayload JSON preview
  -> user saves payload file
  -> web-table-to-csv CLI
  -> runtime payload validation
  -> webTableToCsv extraction
  -> ToolBroker fs.write_draft
  -> DraftWriter / WorkspacePathGuard
  -> workspace/drafts/*.csv
  -> JSONL EventStore
  -> replay summary
  -> offline eval / verify gate
```

## Module responsibilities

- `browser-extension/`: user-triggered activeTab capture of visible table text.
- `runtime/src/web/`: BrowserDomPayload validation and web table extraction.
- `runtime/src/tools/`: whitelist Tool Broker and `fs.write_draft` runtime tool.
- `runtime/src/workspace/`: draft writer and filesystem path guard.
- `runtime/src/events/`: EventStore implementations and replay.
- `runtime/src/flows/`: end-to-end web table to CSV flow.
- `scripts/web-table-to-csv.mjs`: CLI wrapper around the runtime flow.
- `evals/web-table-to-csv/`: offline deterministic acceptance fixtures.
- `conformance/`: DeepSeek adapter conformance with dry default and live opt-in.

## Safety boundaries

- The extension does not write files or call the runtime.
- The CLI reads only a user-provided sanitized payload file.
- Tool Broker only executes registered local tools.
- v0 registers only `fs.write_draft`.
- DraftWriter writes only under `workspace/drafts/`.
- Events store summaries only.
- CI runs dry/offline gates and does not call the real DeepSeek API.

## Replay and eval

Replay reconstructs user-visible state from events without hidden state. The eval
harness creates temporary workspaces, runs the runtime flow, scans event logs for
leakage markers, and verifies expected pass or expected reject outcomes.
