# ADR 0004: Native Host Proof-of-Life Gate

Status: Proposed

## Context

The bridge roadmap has deliberately stayed below a live browser-to-desktop
transport:

- P0E-001 documented the bridge threat model.
- P0E-002 added a protocol dry harness.
- P0E-003 added a desktop preview gate.
- P0E-004 selected Native Messaging as the preferred future transport
  candidate, while keeping manual import as the default.
- P0E-005 added a disabled Native Messaging manifest dry check.
- P0E-006 added a fake native host harness.

None of those phases enabled a real host, browser connection, extension
auto-send, automatic Convert, or bridge file write.

## Decision

Any future Native Messaging proof-of-life must be behind an explicit dev flag
and disabled by default. It must be a development-only experiment until a later
ADR accepts production packaging, installation, rollback, and browser-specific
support.

The desktop preview gate remains mandatory. A live host may at most deliver a
payload proposal. It must not Convert, write CSV, write `events.jsonl`, or
modify workspace files.

## Gate Criteria

A proof-of-life implementation task may start only after these criteria are
met for the selected scope:

- Native Messaging manifest dry check passes.
- Fake native host harness passes.
- Bridge protocol dry harness passes.
- Extension ID allowlist is fixed.
- Explicit dev flag is documented and required.
- Manual installation only.
- Manual uninstall or rollback is documented.
- Desktop preview gate is mandatory.
- Import to Payload Editor requires a user click.
- Convert requires a separate user click.
- No automatic Convert.
- No file write from bridge.
- No `events.jsonl` write from bridge receipt.
- Boundary checker rejects accidental production transport code.
- CI and release smoke remain disabled by default.

## Non-Goals

- Production bridge.
- Browser extension permission change by default.
- `chrome.runtime.connectNative` in the shipping extension.
- `chrome.runtime.sendNativeMessage` in the shipping extension.
- Native host binary or installer.
- OS native host registration.
- Extension auto-send.
- Background capture.
- Automatic Convert.
- Bridge file write.
- Localhost server or HTTP bridge.
- Desktop action, UI automation, or MCP bridge.

## Required Safety Constraints

- Browser extension default permissions remain `activeTab` and `scripting`.
- The transport is untrusted until paired.
- Pairing must use a one-time challenge or token.
- Session messages must use nonce and replay protection.
- Payload proposals must pass `BrowserDomPayload` validation.
- Payload size caps must remain enforced.
- Raw DOM, `innerHTML`, `outerHTML`, cookies, storage, password values,
  screenshots, raw CSV, prompt text, API keys, Authorization headers, and
  full URL queries must not be surfaced in UI or logs.
- Proposal summaries may show only safe host/path-without-query, counts,
  warnings, and risk summaries.

## Rollback Strategy

Rollback must be simple and non-destructive:

1. Turn off the dev flag.
2. Remove the manually installed host manifest.
3. Remove the development host binary if one exists.
4. Restart the browser and desktop app if required.
5. Verify manual import still works.
6. Run `pnpm verify:ci` and `pnpm release:smoke`.

Rollback must not delete drafts, event logs, or workspace files.

## Future Migration Notes

If a later phase proves the dev-only host path, productionization still needs a
separate ADR. That later ADR must cover packaging, signing, browser-specific
install paths, extension ID management, support burden, rollback UX, and release
criteria.

Manual import remains the default safe fallback until that production ADR is
accepted.
