# Patch Proposal UI Bridge v0.2

Patch Proposal UI Bridge connects the Patch and Diff Audit foundation to the App
Shell Diff Surface as a summary-only preview path.

This is a UI bridge only. It does not apply patches, write files, execute Git or
shell commands, call DeepSeek, create a real control-plane run, or start an
agent.

## Scope

- Accept future patch proposal summaries and diff audit reports as view-model
  input.
- Render safe file counts, line counts, risk level, status, path summaries,
  warning codes, hashes, and suggested next action in the App Shell Diff Surface.
- Preserve the existing empty Diff Surface state when there are no patch
  proposals.
- Keep `web_table_to_csv` conversion separate: successful CSV conversion does
  not create a patch proposal.
- Keep all App Shell surfaces read-only or draft-only.

## Summary-Only Policy

The bridge never displays or stores raw source code. The view model intentionally
excludes the following, so no raw source code is displayed in the Diff Surface:

- `beforeContent`
- `afterContent`
- raw patch bodies
- raw source code
- raw prompts, DOM, CSV, screenshots, clipboard text, stdout, stderr, env values
- API keys, Authorization headers, and bearer tokens

Warnings are represented as stable warning codes. If an audit warning contains a
path-like suffix, the UI keeps the code and drops the raw detail.

## Diff Surface Mapping

Patch proposal summaries map to:

- proposal id and task id
- title
- status and risk level
- approval requirement flag
- files changed, created, updated, and deleted
- lines added and removed
- safe path summaries
- warning codes
- hash or fingerprint
- suggested next action

Patch audit reports map to warning codes and audit status only. The UI does not
show full audit payloads or raw file content.

## Non-Goals

- No patch apply
- No filesystem write
- No raw source code display
- No real Git execution
- No real shell execution
- No DeepSeek call
- No coder agent
- No approval execution
- No MCP, plugin, or skills runtime
- No native bridge or desktop action

## Relation to Other Planes

- Patch and Diff Audit remains the source of proposal and audit summary shapes.
- Control Plane can later reference patch proposal ids, but this bridge does not
  create or execute runs.
- Approval Surface can later show approval requests for patch proposals, but no
  approve or reject execution controls are enabled here.
- Agent Dossier should receive patch evidence refs and summaries, not raw code.

## Future Path

Later P0G work can create a local draft run and route patch proposal summaries
into Control Plane references. Real patch application still requires a separate
safe apply implementation, explicit approval, permission lease validation,
rollback handling, and summary-only event logging.
