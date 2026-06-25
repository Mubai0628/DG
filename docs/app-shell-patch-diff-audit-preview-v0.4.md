# App Shell Patch Diff Audit Preview v0.4

The App Shell Patch Diff Audit Preview consumes the runtime
`buildPatchDiffAuditPreview()` helper through a thin React view-model adapter.
It audits the current Patch Proposal Creation Preview and Patch Proposal
Validation Preview summaries without generating a raw diff.

## User Surface

The panel is labeled:

- `Patch Diff Audit Preview`
- `Audit preview / no raw diff`

The `Preview Diff Audit` button only updates local React state. It does not call
Tauri, write EventStore records, read files, write files, invoke Git or shell,
call DeepSeek, or execute capability/agent/runtime actions.

Displayed fields are summary-only:

- audit status and id
- proposal and validation ids
- risk and derived risk
- file/change counts
- estimated line additions/removals
- validation finding summary
- warning/blocker counts
- readiness flags
- no-compress placement
- finding codes and safe summaries

## Integrations

- Diff Surface: displays the audit summary as another patch summary item.
- Approval Surface: shows a read-only approval preview item when approval is
  required.
- Audit Surface: receives audit finding and readiness warning codes.
- Context Assembly Preview: places the audit ref in `no_compress_zone`.
- Capability Plan Preview: may treat the audit ref as display-only evidence.

None of these integrations enable apply, approve/reject execution, virtual
apply, Git, shell, or filesystem actions.

## Safety

The App view model does not display raw source, raw diff, raw patch body, raw
prompt, raw DOM, raw CSV, API keys, Authorization values, stdout, or stderr. Raw
or secret markers are surfaced only as warning codes.

## Non-goals

- no raw diff generation
- no patch apply
- no virtual apply
- no filesystem read or write
- no EventStore write
- no Tauri command
- no DeepSeek call
- no Git or shell execution
- no native bridge
- no desktop action

## Future Path

The next phase may create an Approval Gate Draft from the audit summary. That
draft still must not execute approve/reject or apply behavior unless a later
task explicitly adds and verifies those gates.
