# DeepSeek Workbench Desktop Shell

This package contains the Tauri v2 desktop shell for the local
web-table-to-CSV flow.

Current scope:

- paste or load a sanitized `BrowserDomPayload` JSON file
- provide an existing local workspace root
- run the existing local `web-table-to-csv` runtime flow
- write CSV drafts only under `workspace/drafts/`
- show a safe summary of draft, event, and replay results
- show App Shell planning surfaces as draft-only, read-only, preview-only, or
  planning-only summaries: Chat / Run Canvas, local Run Draft Preview, Control
  Plane Projection, Context Cart, Agent Route Preview, Capability Plan Preview,
  Patch Proposal / Diff, Approval / Diff / Audit, Memory Inspector, Memory
  Recall Preview, and disabled Bridge Proposal Preview

Current limitations:

- no native browser extension bridge
- no `nativeMessaging`
- no browser data access
- no desktop control
- no network request path
- no real DeepSeek API call from the desktop shell
- no real chat, run creation, approval execution, patch apply, Git execution,
  shell execution, capability invocation, PermissionLease issuance, memory
  commit/revoke/expire UI, or memory persistence UI
- no fully standalone packaged runner yet; packaged conversion must pass
  runner preflight and may require the source tree in v0.1

Development:

```bash
pnpm app:dev
pnpm app:preflight
pnpm app:smoke
pnpm app:manual-smoke:check
pnpm app:qa:check
```

`pnpm app:dev` starts the Tauri desktop shell. For frontend-only debugging,
`pnpm --filter @deepseek-workbench/app dev` starts the Vite dev server on
`http://localhost:5179` with `strictPort` enabled. If that port is occupied,
close the existing process before retrying.

`pnpm app:preflight` checks the fixed runner, Node runtime, fixture conversion,
and safe invalid-payload failure path without opening the GUI.
For packaged-mode strategy and current standalone limitations, see
`docs/desktop-packaging-strategy-v0.1.md`.

`pnpm app:manual-smoke:check` runs the offline manual-smoke preflight without
opening the GUI. It verifies the safe fixture and docs exist, then exercises the
fixed local runner against a temporary workspace.

`pnpm app:qa:check` runs the desktop release-candidate QA check without opening
the GUI. It verifies desktop QA docs, runs the offline preflight and smoke
checks, exercises the fixture flow in a temporary workspace, and scans the event
log for unsafe markers.
