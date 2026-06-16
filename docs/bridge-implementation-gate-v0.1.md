# Bridge Implementation Gate v0.1

This checklist defines the minimum evidence required before DeepSeek Workbench
may implement a real extension-to-desktop bridge transport. It is a maintenance
gate, not an implementation. The current supported path remains manual import.

## Current Bridge Status

- No Native Messaging implementation.
- No localhost server.
- No HTTP bridge.
- No custom protocol handler.
- No extension auto-send.
- No automatic Convert.
- No file write from bridge.

The only implemented bridge work is design, a protocol dry harness, a fake
transport, and a desktop preview gate model.

## Required Gate Before Real Transport

Do not begin a real bridge implementation until all items below are satisfied:

- [ ] Threat model reviewed:
      `docs/extension-desktop-bridge-threat-model-v0.1.md`
- [ ] Protocol dry harness green:
      `pnpm test -- bridge-protocol`
- [ ] Pairing UX and preview gate green:
      `docs/bridge-pairing-ux-v0.1.md`
- [ ] Bridge transport ADR accepted:
      `docs/adr/0003-bridge-transport-choice.md`
- [ ] Boundary checker updated for the selected transport.
- [ ] Extension ID allowlist strategy documented.
- [ ] Desktop pairing token UX documented.
- [ ] Nonce and replay tests green.
- [ ] Forged payload tests green.
- [ ] Stale token and reused token tests green.
- [ ] Oversized payload tests green.
- [ ] `rawDom`, `innerHTML`, `outerHTML`, cookies, storage, password values,
      and screenshots rejected.
- [ ] Full URL query rejection or stripping tests green.
- [ ] Proposal summaries contain host and path without query only.
- [ ] Preview gate remains required before import.
- [ ] Importing a proposal does not Convert.
- [ ] No auto Convert.
- [ ] No file write from bridge.
- [ ] No `events.jsonl` write from bridge receipt.
- [ ] Manual desktop QA checklist updated.
- [ ] Rollback and disable flag documented.
- [ ] CI gate plan documented.

## CI Gate Plan

A future real transport task must keep the existing gates green and add focused
transport tests:

- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`
- `pnpm test -- bridge-protocol`
- transport-specific forged sender tests
- transport-specific replay and nonce tests
- transport-specific oversized payload tests
- boundary checker tests for forbidden capabilities outside the selected scope

Live DeepSeek conformance must remain opt-in and skipped by default.

## Red Lines

The following remain forbidden unless a future ADR explicitly changes the
boundary and the implementation gate is updated:

- Native Messaging enabled by default.
- localhost server enabled by default.
- HTTP bridge enabled by default.
- `chrome.runtime.connectNative` or `chrome.runtime.sendNativeMessage` added to
  the extension before an accepted transport implementation task.
- drop-folder auto-ingest.
- custom protocol auto-import.
- automatic Convert.
- file write from bridge.
- event log write from bridge receipt.
- reading cookies, storage, password values, raw DOM, raw CSV, screenshots,
  prompt text, environment variables, API keys, or Authorization headers.

## Manual QA Expectations

Manual QA for a future bridge transport must prove:

1. Manual import still works.
2. A valid proposal reaches preview state only.
3. Import to Payload Editor requires a user click.
4. Convert requires a separate user click.
5. Reject Proposal clears preview state.
6. Forged sender is rejected.
7. Stale token and replayed nonce are rejected.
8. Oversized and unsafe payloads are rejected.
9. Event Log / Replay remains summary-only.
10. Rollback or disable flag returns the app to manual import mode.

## Rollback Requirements

A real transport must be reversible:

- Disable the transport without changing the local CSV runner.
- Preserve manual copy/save/import.
- Remove or ignore host manifests, protocol handlers, listeners, or drop
  folders without data loss.
- Clear pending bridge proposal state without touching drafts or event logs.
