# App Shell Patch Proposal Creation Preview v0.3

The App Shell Patch Proposal Creation Preview is a local, summary-only surface
for drafting a patch proposal preview from safe path refs and line estimates.
It is preview only: it does not read workspace files, write files, apply
patches, write events, call DeepSeek, or invoke agents, capabilities, Git, or
shell commands.

## Scope

- Accept a local title, change description summary, change kind, estimated line
  counts, and safe workspace-relative path refs.
- Call the pure runtime patch proposal creation preview helper.
- Render proposal id, file counts, line estimates, risk level, approval
  requirement, warning codes, path summaries, hash prefix, and next action.
- Keep the generated preview in React state only.
- Feed summary-only proposal rows into the existing Diff Surface.
- Feed approval-required proposal refs into the Approval Surface as read-only dry
  refs.
- Feed patch proposal refs into the Context Assembly Preview no-compress zone.
- Allow Capability Plan Preview to see the proposal ref as display-only context.

## Summary-Only Inputs

The UI accepts summary-only path refs as one workspace-relative path per line or
as a small JSON array of summary objects. A path summary may include:

- path
- change kind
- language or extension
- reason summary
- estimated lines added and removed
- risk hints
- warning codes

The bridge rejects or blocks raw content fields, including `content`,
`beforeContent`, `afterContent`, `rawSource`, `rawDiff`, `rawPatch`,
`rawPrompt`, `rawDom`, `rawCsv`, `rawScreenshot`, `clipboard`, API keys,
authorization headers, environment values, stdout, and stderr.

## Surface Integration

- Diff Surface: shows the proposal summary, file counts, line counts, risk
  warnings, and safe path summaries. Apply remains disabled.
- Approval Surface: shows approval-required proposal refs as read-only dry
  items. Approval execution remains disabled.
- Context Assembly Preview: places patch proposal refs in `no_compress_zone`
  only. It does not assemble a real prompt.
- Capability Plan Preview: can display the patch proposal ref as planning
  context. It does not invoke capabilities or issue leases.
- Control Plane Projection: remains event-summary driven. The preview does not
  create a control event or real run.

## Safety Model

The preview is local-only and no-apply:

- No patch apply.
- No virtual apply from this App Shell path.
- No filesystem read or write.
- No EventStore write.
- No Tauri command.
- No raw source, raw diff, or patch body display.
- No Git or shell execution.
- No DeepSeek call.
- No native bridge or desktop action.

Unsafe paths, generated artifact paths, secret markers, raw prompt markers, raw
DOM/CSV markers, private key markers, and token-like URL query strings are
rejected or represented as warning codes only.

## Future Path

Later controlled-creation work may add proposal validation, explicit approval,
virtual apply, and eventually a separately gated real apply path. Real apply
remains deferred and is not enabled by this preview.

## Non-Goals

- No patch apply.
- No file read or write.
- No raw source or raw diff display.
- No Git or shell execution.
- No DeepSeek call.
- No EventStore write.
- No capability invocation or PermissionLease issuing.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.
