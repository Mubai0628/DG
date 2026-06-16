# ADR 0002: Extension to Desktop Bridge

Status: Proposed

## Context

DeepSeek Workbench v0.1 uses an intentionally manual handoff between the
browser extension and the desktop shell:

1. The browser extension captures a sanitized `BrowserDomPayload` only after a
   user action.
2. The user reviews and copies or saves that payload.
3. The desktop shell imports the payload manually.
4. The local runner converts the payload to CSV and writes only under
   `workspace/drafts/`.

This manual handoff is slower than a direct bridge, but it is easy to audit and
keeps the browser and desktop trust boundaries separate. The next bridge design
must preserve the same safety posture: the extension may propose data, while the
desktop app remains responsible for validation, preview, explicit user consent,
and constrained local writes.

## Decision

Do not implement an extension-to-desktop bridge in v0.1. The proposed design is
to prepare a token-paired bridge protocol in later phases, with desktop preview
and explicit confirmation before any conversion or draft write.

The recommended initial path is:

1. Keep the current manual copy/save/import workflow as the stable baseline.
2. Add a dry bridge harness with a fake transport and fake client before any
   real browser or desktop transport is enabled.
3. Introduce a one-time transfer token and per-session nonce for pairing.
4. Require the desktop app to preview the received sanitized payload before
   Convert.
5. Continue to forbid automatic file writes from the browser extension.

## Options Considered

### Native Messaging

Native Messaging gives the browser a structured way to talk to a registered
local host and can allow extension ID allowlisting. It also has meaningful
packaging and installation complexity. A mistaken host registration or manifest
change could widen the bridge from "explicit local workflow" to "browser can
reach desktop process" too early.

Native Messaging is a plausible future implementation, but only after a dry
harness proves token validation, nonce freshness, payload validation, size
limits, preview requirements, and event safety.

### Localhost Loopback HTTP

A localhost server is easy to test and works across browsers, but it creates an
endpoint that other local processes and websites may try to reach. Even with
CORS, the design must assume local endpoint abuse, CSRF-like requests, replay,
token theft, and oversized payload attempts.

Loopback HTTP is not rejected forever, but it is not the first implementation
choice unless it has strict token binding, short-lived nonces, origin checks,
method restrictions, payload limits, and no automatic Convert.

### Local File Drop Folder

A drop folder is simple and offline, but it moves the bridge security problem
to filesystem monitoring, tamper detection, race handling, naming collisions,
and workspace confusion. It is especially easy for another process to place a
forged payload where the desktop app expects user-approved data.

This option may be useful as a manual import convenience, but it is not a safe
automatic bridge without signing or token binding.

### Custom Protocol

A custom protocol can make user intent visible because the browser opens a
desktop handler. It is also hard to make robust for larger payloads and can be
spoofed by confusing links, stale tokens, or OS-level handler ambiguity.

This option may fit a pairing or import-token flow, but it should not carry raw
payloads and should not trigger automatic Convert.

### QR or Copy-Token Pairing

QR or copy-token pairing is a good consent and pairing primitive, not a full
transport. It can help the desktop prove that a payload came from a user-visible
extension session and not an unrelated local process.

This is recommended as part of the initial bridge protocol because it is
compatible with Native Messaging, localhost, and manual handoff variants.

## Recommended Initial Path

Use a phased protocol-first rollout:

1. **Phase E1: Design only.** Document the bridge threat model and ADR. No
   runtime, extension, or desktop behavior changes.
2. **Phase E2: Dry harness.** Build an offline fake bridge client/server pair
   that validates tokens, nonces, schema, size limits, and preview gating.
3. **Phase E3: Tokened transfer.** Let the extension produce a sanitized
   payload plus a one-time transfer token. The desktop still requires preview
   and Convert.
4. **Phase E4: Real transport.** Choose Native Messaging or loopback HTTP only
   after dry harness tests pass and packaging risk is understood.
5. **Phase E5: Optional auto-import.** The desktop may auto-import a valid
   payload into preview state, but it must never auto-write a draft.

## Explicit Non-goals

- No Native Messaging implementation in this phase.
- No localhost HTTP bridge in this phase.
- No custom protocol handler in this phase.
- No extension auto-send in this phase.
- No browser extension file write.
- No automatic desktop Convert.
- No arbitrary filesystem write.
- No desktop action, browser automation, MCP, shell automation, or memory
  system.
- No real DeepSeek API call in the bridge path.

## Security Constraints

- Payload capture must remain user-triggered.
- The bridge transport is untrusted until authenticated.
- Every transfer must use a one-time token and per-session nonce.
- Stale, replayed, oversized, malformed, or unsigned payloads must be rejected.
- Payloads must pass the existing `BrowserDomPayload` schema and safety checks.
- Raw DOM, `innerHTML`, `outerHTML`, password values, cookies, storage values,
  full URL queries, and raw screenshots must not cross the bridge.
- The desktop app must preview the payload before Convert.
- CSV drafts must still be written only under `workspace/drafts/`.
- Event logs must remain summary-only and must not contain raw payloads or raw
  CSV content.
- Extension IDs, origins, and desktop sessions must be allowlisted or paired.

## Rollout Phases

| Phase | Scope                       | Exit criteria                                                   |
| ----- | --------------------------- | --------------------------------------------------------------- |
| E1    | ADR and threat model        | No behavior changes; CI remains green                           |
| E2    | Offline fake bridge harness | Forged, stale, oversized, and unsafe payload cases rejected     |
| E3    | Tokened extension proposal  | Desktop preview required; no auto-write                         |
| E4    | Real transport candidate    | Transport abuse tests pass; packaging story documented          |
| E5    | Optional auto-import        | Valid payload may populate preview; Convert remains user-driven |

## Reversal Strategy

The bridge must be reversible at each phase:

- Keep manual import as the default fallback.
- Gate bridge code behind explicit feature flags or build-time configuration.
- Remove or disable any Native Messaging host registration, loopback listener,
  or protocol handler without changing the local CSV runner.
- Preserve existing browser extension capture behavior and desktop manual import
  behavior as independent paths.
- Treat event logs from bridge experiments as summary-only diagnostics so they
  can be deleted without losing draft files.
