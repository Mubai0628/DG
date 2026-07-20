# Security Policy

## Project status and supported versions

DeepSeek Workbench is an unofficial community project. It is not produced,
endorsed, or supported by DeepSeek.

The current public target is experimental v0.1.0. The supported security review
surface is the local `web_table_to_csv` vertical slice:

1. User-approved Chromium `activeTab` visible table capture.
2. Sanitized BrowserDomPayload saved by the user.
3. Local CLI conversion to CSV.
4. Draft write under `workspace/drafts/`.
5. Summary event log and replay.

## Reporting vulnerabilities

Please report security issues privately to the project owner until a public
security advisory channel is established. Do not include secrets, access tokens,
private raw DOM, screenshots, or API keys in reports. Provide a minimal
reproduction using synthetic data when possible.

## Secret handling

- Runtime code does not read API keys by default.
- `DEEPSEEK_API_KEY` is only read by the explicit live conformance runner when
  `--live` and `DEEPSEEK_CONFORMANCE_LIVE=1` are also present.
- CI does not set live conformance gates and must not call the real DeepSeek API
  by default.
- API keys, authorization headers, raw prompts, raw DOM, raw screenshots, raw
  clipboard data, and raw CSV content must not be written to events, reports, or
  logs.

## Browser extension boundary

- Manifest V3 permissions are limited to `activeTab` and `scripting`.
- There are no host permissions.
- There is no `nativeMessaging` bridge.
- There is no automatic content script for all pages.
- Capture only runs after the user clicks the extension popup button.
- The extension must not read cookies, browser storage, password field values,
  clipboard data, or raw DOM HTML.
- The extension must not submit forms, click page elements, modify pages, or
  send network requests.

## File safety

- v0.1.0 only writes CSV drafts through `DraftWriter`.
- Drafts are constrained to `workspace/drafts/`.
- Parent traversal, absolute paths, hidden filenames, unsupported extensions,
  deny-listed paths, and symlink escapes are rejected.
- The extension itself never writes files.

## Event safety

Events are the audit source, but they are summary-only. Event payloads may
include counts, hashes, relative paths, sizes, warning counts, usage summaries,
and safe source metadata. They must not include raw prompt text, raw DOM, raw
CSV, screenshots, clipboard data, API keys, authorization headers, or full URL
query strings.

## Command broker boundary (experimental)

- The desktop shell includes an experimental command broker
  (`execute_command_broker_request`) that can run shell commands as the
  current user.
- Authorization is recomputed server-side in the Tauri command: the
  permission mode is validated, the dangerous-command classifier is re-run
  over the actual command text/argv, and client-reported planner decisions
  or classifier categories are never trusted.
- Every broker execution requires a bound approval receipt: fixed source,
  typed confirmation (`EXECUTE WORKSPACE COMMAND`), expiry, and a request
  hash binding the receipt to the exact mode, workspace reference, shell
  kind, working directory, command text, and argv. `approval` mode is gated
  entirely by this receipt (it does not restrict the shell kind);
  `autonomous_safe` mode only runs classifier-safe commands; `break_glass`
  mode is dry-run only. Background processes, destructive flags, git
  writes, and network access through the broker remain blocked.
- Broker output is summary-only: raw stdout/stderr is never returned or
  persisted, and output containing secret markers fails closed.

## Known limitations

- Sanitization is defensive but cannot guarantee that every malicious table cell
  or misleading webpage phrase is harmless.
- Users should inspect the sanitized payload preview before running the local
  CLI.
- The project does not yet provide a native bridge, desktop automation, memory
  system, or real MCP integration (MCP surfaces use injected test transports).
- The command broker's regular-expression classifiers are conservative and may
  over-block (fail-closed); they are not a full shell parser.
- Live DeepSeek conformance is a manual opt-in diagnostic, not a default release
  gate.
