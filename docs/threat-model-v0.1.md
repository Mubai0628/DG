# v0.1 Threat Model

This document describes the security model for the experimental v0.1
`web_table_to_csv` vertical slice.

## Assets

- User-approved sanitized BrowserDomPayload files.
- Local CSV drafts under `workspace/drafts/`.
- JSONL event logs under `workspace/.deepseek-workbench/`.
- User workspace paths and local metadata.
- Optional DeepSeek API key used only for manual live conformance.

## Trust boundaries

- Browser page content is untrusted.
- Sanitized payload JSON is user-provided local input.
- LLM tool-call arguments are untrusted proposals.
- Tool Broker is the local execution boundary.
- DraftWriter and WorkspacePathGuard are the filesystem boundary.
- EventStore is an audit boundary and must receive summaries only.

## Attacker-controlled inputs

- Webpage table cells, captions, nearby text, and titles.
- Prompt-injection-like text embedded in webpage content.
- Formula-injection-like CSV cells beginning with `=`, `+`, `-`, or `@`.
- Payload JSON supplied to the CLI.
- LLM tool arguments for `fs.write_draft`.
- Filenames and metadata supplied through the draft-write path.

## Mitigations

- Browser extension v0 captures visible table text only after user action.
- Payload validation rejects raw DOM fields and unsupported schemes.
- Web table extraction labels prompt-injection-like content as untrusted data.
- CSV writer escapes formula-injection-like cells.
- Tool Broker parses raw tool arguments as JSON objects only; it does not eval
  or repair them.
- Tool Broker v0 registers only `fs.write_draft`.
- DraftWriter rejects path traversal, absolute paths, unsupported extensions,
  deny-listed names, overwrites by default, and symlink escapes.
- Event payloads include summaries, counts, hashes, and relative paths instead
  of raw CSV, raw DOM, prompts, screenshots, clipboard data, API keys, or full
  URL query strings.
- Boundary and secret checkers run in CI.

## Out of scope for v0.1

- Native browser-to-runtime bridge.
- Tauri or desktop UI.
- Desktop clicking, form submission, or arbitrary app control.
- Browser automation beyond activeTab visible table capture.
- MCP, shell execution, memory system, or full context compression.
- Guaranteeing all malicious table text is harmless.
