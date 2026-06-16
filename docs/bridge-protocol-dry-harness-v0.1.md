# Bridge Protocol Dry Harness v0.1

This document describes the P0E-002 extension-to-desktop bridge protocol dry
harness. It is not a production bridge and does not change the current manual
browser-extension-to-desktop workflow.

## What Exists

The runtime package now includes an offline `runtime/src/bridge/` module that
models a future extension-to-desktop bridge protocol:

- protocol message envelopes with `schemaVersion: 1`
- pairing request, challenge, and confirmation messages
- one-time pairing token checks
- session IDs with expiry
- per-message nonces
- replay protection for message IDs and nonces
- `BrowserDomPayload` validation for payload proposals
- safe proposal risk summaries
- an in-memory fake transport for tests

The dry harness can accept a sanitized payload as a **proposal** and mark it as
ready for desktop preview. It cannot convert the payload to CSV, cannot write a
draft, and cannot create event logs.

## What Does Not Exist

P0E-002 deliberately does not implement:

- Native Messaging
- localhost or loopback HTTP server
- custom protocol handler
- browser extension auto-send
- extension-to-desktop production bridge
- automatic Convert
- file writes
- ToolBroker calls
- Tauri command integration
- browser APIs, Chrome APIs, cookies, storage, or clipboard access
- network access

The stable v0.1 workflow remains:

```text
browser extension capture sanitized payload
-> user manually copies or saves payload
-> desktop shell imports payload
-> user clicks Convert
-> CSV is written only under workspace/drafts/
```

## Protocol Rules

Every envelope has this shape:

```json
{
  "schemaVersion": 1,
  "messageId": "message-id",
  "type": "payload.proposed",
  "sentAt": "2026-01-01T00:00:00.000Z",
  "sessionId": "session-id",
  "nonce": "nonce",
  "payload": {}
}
```

Supported message types:

- `pairing.request`
- `pairing.challenge`
- `pairing.confirm`
- `payload.proposed`
- `payload.accepted`
- `payload.rejected`
- `session.closed`
- `error`

Pairing rules:

- The desktop side creates the pairing challenge.
- The pairing token has a short TTL.
- The token is one-time use.
- Wrong, stale, or reused tokens are rejected.
- A confirmed pairing creates a session ID.
- Session messages require the session ID and a nonce.

Nonce and replay rules:

- Every post-pairing message must include a nonce.
- A nonce can be used only once.
- A message ID can be used only once.
- Expired sessions reject payload proposals.

Payload proposal rules:

- `payload.proposed` may include only a sanitized `BrowserDomPayload`.
- Payloads are capped at the same size class as the desktop import path.
- `rawDom`, `innerHTML`, `outerHTML`, cookie access, storage access, and raw
  password values are rejected by the payload contract.
- Full URL query strings are kept out of risk summaries.
- Prompt-injection-like table text is counted as untrusted risk; it is not
  elevated to instruction or policy.
- Accepted proposals are accepted only for desktop preview.
- Accepted proposals do not trigger Convert.
- Accepted proposals do not write CSV or events.

## Safe Summary Fields

The dry harness risk summary may include:

- source host
- source path without query
- table count
- selected table ID
- row and column counts
- warning count and warning codes
- injection risk count and snippet hashes
- payload byte count
- extension ID/version if provided
- identity warnings such as unknown extension ID

The summary must not include:

- raw payload JSON
- raw DOM
- raw CSV
- full URL query
- API keys
- Authorization headers
- environment variables
- browser cookies or storage values

## Future Implementation Candidates

The next phase should keep using this dry harness before any real transport is
enabled.

Potential future transports:

- Native Messaging, after extension ID allowlisting and packaging risk review.
- localhost loopback HTTP, only with strict token, nonce, origin, and size
  controls.
- custom protocol or file-drop flows only as explicit user-mediated handoff
  mechanisms.

The recommended next task is a bridge protocol dry-client UX or desktop preview
gate design. Production bridge transport should remain out of scope until the
dry harness has tests for forged token, stale nonce, replay, oversized payload,
unsafe payload fields, and automatic Convert blocking.
