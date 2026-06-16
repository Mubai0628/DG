# Bridge Pairing UX v0.1

This document describes the proposed extension-to-desktop pairing and preview
gate UX. It is a dry UX design for future bridge work. It does not enable a
live browser extension bridge.

## Current Status

The current stable workflow remains manual:

```text
browser extension captures sanitized BrowserDomPayload
-> user copies or saves payload JSON
-> desktop shell imports or pastes payload
-> user clicks Convert
```

P0E-003 adds a desktop-side preview gate model for future bridge proposals. It
does not add a real transport.

## User Flow

Future bridge UX should follow this sequence:

1. The desktop creates a one-time pairing challenge.
2. The extension submits a sanitized payload proposal after user action.
3. The desktop shows a Bridge Proposal Preview.
4. The user clicks **Import to Payload Editor** or **Reject Proposal**.
5. If imported, the sanitized payload is placed into the existing payload
   editor.
6. The user manually clicks **Convert**.

Importing a proposal is not the same as converting it. Import only moves
sanitized payload JSON into the editor for review.

## Preview Gate Contents

The desktop preview may show only safe summary fields:

- source host
- source path without query
- table count
- row and column summary
- warning count
- injection risk count
- payload byte count
- extension ID and version when present
- received time
- status: pending, imported, rejected, or expired

The preview must not show:

- raw payload JSON
- raw DOM
- raw CSV
- full URL query
- cookies or storage values
- password values
- API keys
- Authorization headers

## Required User Actions

The desktop must require explicit user action at each important step:

- Pairing challenge must be user-visible.
- Payload proposal must be previewed.
- Import must be clicked by the user.
- Convert must be clicked separately by the user.
- Reject must be available for any pending proposal.

## Safety Boundaries

- One-time pairing token.
- Per-session nonce and replay protection.
- Payload schema validation.
- Payload size cap.
- No raw DOM.
- No full URL query in summary.
- Preview before Convert.
- No automatic Convert.
- No file write from the bridge.
- No event log write from the bridge.

## Non-goals

This phase does not implement:

- Native Messaging.
- localhost server.
- HTTP bridge.
- extension auto-send.
- browser extension bridge.
- automatic Convert.
- file writes.
- desktop action.
- MCP, shell, or UI automation.
- real DeepSeek API calls.

## Future Work

Future tasks can use this preview gate as the desktop consent point for real
bridge transport decisions. The next reasonable task is a transport choice ADR
or implementation gate that decides which transport, if any, is allowed to feed
this preview state.
