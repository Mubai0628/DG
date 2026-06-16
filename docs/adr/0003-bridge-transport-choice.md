# ADR 0003: Bridge Transport Choice

Status: Proposed

## Context

DeepSeek Workbench currently keeps the browser and desktop trust boundaries
separate:

1. The browser extension captures a sanitized `BrowserDomPayload` after a user
   action.
2. The user manually copies, saves, imports, or pastes the payload into the
   desktop shell.
3. The desktop shell validates and previews the payload.
4. The user explicitly clicks Convert.
5. CSV output remains constrained to `workspace/drafts/`.

P0E-002 added an offline bridge protocol dry harness with pairing token,
nonce, replay protection, and payload validation. P0E-003 added a desktop
preview gate model. Neither task implemented a real transport. The next design
decision is which transport, if any, should be allowed to feed the preview gate
in a later phase.

## Decision

Keep manual import as the default v0.1 and desktop RC path. Do not implement a
real bridge transport yet.

The recommended next implementation path is Native Messaging, but only as a
disabled-by-default design skeleton and dry check first. Native Messaging has
more install friction than localhost HTTP, but it provides a browser-mediated
identity model and an explicit extension-to-host registration point. That makes
it a better first candidate than an always-listening localhost endpoint.

No transport may auto Convert, auto-write drafts, bypass desktop preview, or
weaken the existing payload validation and runner hardening boundaries.

## Options Considered

### A. Native Messaging

Native Messaging lets a browser extension communicate with a registered local
host and can bind that path to an extension ID allowlist. It also requires host
manifest installation, browser-specific packaging details, and careful rollback
instructions.

Pros:

- Stronger browser-mediated identity story than a generic local port.
- Clear future place to enforce extension ID allowlisting.
- No ambient network listener.
- Compatible with the existing pairing token and nonce protocol.

Cons:

- More packaging and installation friction.
- Host registration mistakes can be confusing to users.
- Browser-specific setup must be documented and tested per platform.

Decision: recommended first real transport candidate, but only after a
manifest-only dry check and fake host harness prove the implementation gate.

### B. Localhost Loopback HTTP

A localhost HTTP bridge is easy to debug and can work across browsers, but it
creates a local endpoint that other processes may attempt to call. CORS is not
enough as a trust boundary. The design must assume local process abuse, replay,
CSRF-like attempts, port confusion, and oversized payload attempts.

Pros:

- Simple developer experience.
- Easy to test with ordinary HTTP clients.
- Browser independent.

Cons:

- Local process abuse risk.
- Requires listener lifecycle, port binding, and origin checks.
- More likely to be mistaken for a general local API.
- Higher risk of accidental auto-import or auto-write pressure.

Decision: not the preferred first transport. It remains a possible later
fallback only if Native Messaging proves impractical and the implementation
gate adds strict pairing, nonce, origin, method, payload size, and disable
controls.

### C. Local Drop Folder

A drop folder avoids network listeners, but it shifts the trust problem into
filesystem monitoring and path handling. Another local process can write a
forged payload, race a replacement, or confuse users about which workspace is
receiving proposals.

Pros:

- Offline and easy to inspect.
- Simple mental model for manual imports.
- No browser host registration.

Cons:

- Spoofing and race risks.
- Path confusion and stale file risks.
- Hard to prove sender identity.
- Easy to blur into automatic filesystem ingestion.

Decision: acceptable only as a manual import convenience. Not acceptable as an
automatic bridge transport without signing or token binding.

### D. Custom URL Protocol

A custom protocol can make user intent visible because opening the protocol is
a user-visible action, but it is fragile for larger payloads and has OS-level
registration ambiguity. URL injection and stale token handling are central
risks.

Pros:

- User-visible handoff.
- Can carry a small token or session reference.
- No background listener required.

Cons:

- URL injection and handler registration risks.
- Bad fit for large payloads.
- Difficult cross-platform packaging story.
- Can confuse "open app" with "approve conversion".

Decision: do not carry payloads over a custom protocol. It may later carry only
a short pairing or import token if the implementation gate is met.

### E. Manual Import Only

Manual import is the current v0.1 default. It is slower, but it is easy to
audit and keeps all desktop writes behind explicit user action.

Pros:

- Safest current behavior.
- No extra browser or desktop capability.
- No sender impersonation problem beyond user-chosen file/text import.
- Easy rollback because there is nothing to disable.

Cons:

- More user steps.
- Less convenient than a paired bridge.

Decision: remain the default path until a real bridge transport passes the
implementation gate.

## Recommended Next Implementation Path

The next implementation path should be conservative:

1. **P0E-005: Native Messaging manifest dry check.** Add documentation and
   static validation for a disabled-by-default host manifest plan. Do not
   register a host and do not enable live extension traffic.
2. **P0E-006: Native Messaging fake host harness.** Exercise protocol framing
   and pairing in tests without a real browser extension or OS registration.
3. **P0E-007: user-paired local host proof of concept behind a dev flag.**
   Only after the gate passes, evaluate a live transport candidate with manual
   preview and Convert still required.

Manual import remains the release fallback for v0.1 and desktop RC builds.

## Explicitly Rejected Paths for Now

- Starting a localhost HTTP server in the desktop app.
- Registering Native Messaging with a browser.
- Adding `chrome.runtime.connectNative` or `chrome.runtime.sendNativeMessage`
  calls to the extension.
- Adding a custom protocol handler.
- Watching or auto-ingesting a drop folder.
- Auto-importing proposals into Convert.
- Auto-writing CSV drafts or event logs from bridge receipt.
- Using bridge code to read cookies, storage, password values, raw DOM, raw
  CSV, screenshots, prompt text, environment variables, or API keys.

## Security Constraints

- The bridge transport is untrusted until paired and authenticated.
- Pairing must use a one-time token or challenge.
- Each session message must use a nonce with replay protection.
- Payloads must pass `BrowserDomPayload` validation and the existing size cap.
- Full URL queries must not appear in summaries or UI.
- Raw DOM, `innerHTML`, `outerHTML`, cookies, storage values, password values,
  screenshots, raw CSV, and API keys must not cross the bridge.
- The desktop preview gate must appear before any import into the payload
  editor.
- Importing a proposal must not Convert.
- Accepting or importing a proposal must not write CSV or `events.jsonl`.
- CSV draft writes must still go through the existing local runner,
  `ToolBroker`, and `DraftWriter` path.
- A kill switch or disable flag must exist before any real transport is
  enabled.

## Implementation Gate

Do not start P0E-005 implementation unless the checklist in
`docs/bridge-implementation-gate-v0.1.md` is satisfied for the selected scope.
At minimum, the gate requires:

- Threat model reviewed.
- Protocol dry harness green.
- Preview gate green.
- This transport ADR accepted.
- Boundary checker updated to reject live transport implementations until the
  implementation task explicitly allows them.
- Extension ID allowlist strategy documented.
- Desktop pairing token UX documented.
- Nonce and replay tests green.
- Forged, stale, oversized, raw DOM, and full URL query tests green.
- No auto Convert.
- No file write from bridge.
- Manual QA and rollback plan documented.

## Rollback Strategy

- Keep manual import available and documented.
- Keep bridge transport disabled by default until explicitly released.
- Remove or disable host manifests, protocol handlers, or listeners without
  changing the local web-table-to-CSV runner.
- Keep transport code separate from `DraftWriter`, `ToolBroker`, and the
  desktop runner.
- Make bridge preview state disposable; rejecting or clearing a proposal must
  not affect existing drafts or event logs.

## Future Migration Notes

If Native Messaging is implemented later, the migration should preserve the
current protocol dry harness and preview gate:

- Browser extension captures sanitized payload only after user action.
- Transport delivers only a payload proposal.
- Desktop validates, previews, and imports only after explicit user action.
- User manually clicks Convert.
- CSV and event writes remain constrained to the existing local flow.
