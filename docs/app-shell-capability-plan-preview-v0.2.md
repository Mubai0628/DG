# App Shell Capability Plan Preview v0.2

Capability Plan Preview is a planning-only App Shell surface. It turns the
local Run Draft, Agent Route Preview, Context Cart, Patch Surface, and Memory
Inspector summaries into descriptor-style capability needs by consuming the
pure runtime Capability Broker preview helper.

It does not call Capability Broker execution APIs. It does not invoke tools. It
does not issue permission leases.

## What It Shows

Each preview item is a summary-only descriptor with:

- capability id
- source type
- category
- risk level
- invoke policy
- execution mode
- display-only plan status
- role and route-step refs
- approval and lease requirement counts
- disabled reason when applicable
- dry-run availability
- warning codes

No raw arguments, prompt text, payloads, DOM, CSV, source code, API keys,
Authorization headers, stdout/stderr, environment values, screenshots,
clipboard data, or full memory content are displayed.

## Intent Mapping

- `web_data_extraction`
  - `native.workspace.index`
  - `native.fs.write_draft`
- `code_change`
  - `native.workspace.index`
  - `native.patch.propose`
  - `native.git.diff_summary`
  - `native.git.status`
  - `native.shell.pnpm_test`
  - `native.patch.apply` as disabled
  - `native.git.commit_draft` as disabled
- `code_review`
  - `native.workspace.index`
  - `native.git.diff_summary`
  - patch audit summary refs when available
- `verification`
  - `native.git.status`
  - `native.shell.pnpm_test` as disabled/simulated preview
- `documentation`
  - `native.workspace.index`
  - `native.patch.propose`
- `unknown`
  - needs clarification

All items are local preview rows. They are not executable plans.

## Risk And Policy Display

- A0/A1 read-only descriptors are display-only.
- A2 draft-write descriptors are marked approval-required and may show a
  not-issued lease preview.
- A3+ or mutating descriptors are warning/disabled unless explicitly safe in a
  later phase.
- shell descriptors remain disabled or simulated, never AUTO.
- git write descriptors remain disabled.
- patch apply remains disabled.
- MCP, plugin, and skill runtimes are unavailable in this phase.

## Integration

- Capability Broker v2: the App surface consumes the runtime preview helper for
  descriptor fields but does not call invocation planning or execution.
- Agent Route Preview: role and route-step refs are derived from the local
  route preview.
- Approval Surface: approval-required capability rows may appear as read-only
  dry approval refs.
- Control Plane: this is a local preview only; no control event is written.

## Non-Goals

- No capability execution.
- No permission lease issuing.
- No real dry-run execution.
- No approval execution.
- No DeepSeek call.
- No MCP, plugin, or skills runtime.
- No patch, Git, or shell execution.
- No native bridge.
- No desktop action.
