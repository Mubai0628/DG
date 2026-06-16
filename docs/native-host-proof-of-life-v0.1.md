# Native Host Proof-of-Life Gate v0.1

This document describes a future Native Messaging proof-of-life direction for
DeepSeek Workbench. It is a design gate only. It does not enable a production
bridge and does not change the current manual import workflow.

## Current Status

- No Native Messaging implementation.
- No OS native host registration.
- No native host binary.
- No browser extension permission change.
- No `chrome.runtime.connectNative`.
- No `chrome.runtime.sendNativeMessage`.
- No extension auto-send.
- No automatic Convert.
- No file write from bridge.
- No localhost server or HTTP bridge.

The browser extension continues to request only `activeTab` and `scripting`.
The desktop app continues to require manual import or paste of sanitized
payload JSON.

## Design Goal

The future proof-of-life should answer one narrow question: can a
developer-controlled Native Messaging host receive a framed bridge proposal and
hand it to the existing desktop preview gate without weakening the v0.1 safety
model?

The answer may only be tested behind an explicit dev flag. CI and release
commands must keep the bridge disabled by default.

## Dev Flag Concept

A future implementation may define a development-only switch such as:

```text
DG_BRIDGE_DEV_NATIVE_HOST=1
```

The exact flag name is intentionally not implemented yet. Any future flag must
be:

- absent by default.
- ignored by release smoke and CI unless a dedicated dev-only test asks for it.
- documented in manual setup steps.
- paired with a visible desktop warning.
- easy to remove or disable without changing the local CSV runner.

The flag must not be read by dry conformance, release smoke, or normal desktop
conversion flows.

## Required Gate Before Any Live Proof-of-Life

Before a real host process, registration script, or extension connection is
allowed, all of the following must be true:

- Native Messaging manifest dry check passes.
- Fake native host harness passes.
- Bridge protocol dry harness passes.
- Extension ID allowlist is fixed and documented.
- Explicit dev flag is required.
- Installation is manual and reversible.
- Desktop preview gate is mandatory.
- Import to Payload Editor requires a user action.
- Convert requires a separate user action.
- No automatic Convert.
- No file write from bridge receipt.
- No `events.jsonl` write from bridge receipt.
- Boundary checker rejects accidental production transport code.
- Rollback and uninstall steps are documented.

## Manual Pairing and Preview

A proof-of-life must still follow the same user-visible shape:

1. Desktop creates or displays a one-time pairing challenge.
2. Extension-side development code submits a proposal only after a user action.
3. Desktop validates the proposal and shows a preview.
4. User explicitly imports the proposal into the payload editor.
5. User explicitly clicks Convert.

Accepting or importing a proposal is not conversion. It must not write CSV,
`events.jsonl`, or any workspace file.

## Manifest and Install Policy

The disabled sample manifest from P0E-005 remains a sample only. A proof-of-life
must not:

- add `nativeMessaging` to `browser-extension/manifest.json` by default.
- install a host manifest into Chrome, Edge, or Chromium directories as part of
  CI or release smoke.
- include an installer, registration script, or background daemon by default.
- trust wildcard origins or unknown extension IDs.

Any future manual install step must use a known extension ID allowlist and must
have an equally clear uninstall path.

## Rollback and Uninstall Plan

Rollback must return the app to manual import mode:

- disable or remove the dev flag.
- unregister or delete the manually installed host manifest.
- remove any proof-of-life host binary from the developer install location.
- restart the browser and desktop app if required.
- verify the extension manifest still requests only `activeTab` and
  `scripting`.
- run `pnpm verify:ci` and `pnpm release:smoke`.

Rollback must not delete user drafts or event logs.

## CI and Release Defaults

CI and release smoke remain offline and disabled by default:

- no Native Messaging host registration.
- no browser connection.
- no live browser extension transport.
- no local server.
- no DeepSeek API call from the desktop bridge path.
- no automatic Convert.

The current fake harness coverage is the only transport-like coverage expected
in default CI. It verifies frame encoding, caller origin checks, pairing,
nonce/replay protection, payload validation, and preview-only side effects.

## Current Fake Harness Coverage

The existing fake host harness covers:

- 4-byte length-prefix framing.
- UTF-8 JSON encode/decode.
- message size caps.
- invalid frame and invalid JSON rejection.
- caller origin allowlist checks.
- bridge pairing and confirmation.
- nonce and message replay rejection.
- sanitized payload proposal validation.
- raw DOM, cookies, and storage rejection.
- preview-only acceptance with no Convert, CSV write, or event write.

That coverage is necessary but not sufficient for a real host. A live
proof-of-life still needs manual install safety, rollback evidence, and
browser-specific extension ID verification.
