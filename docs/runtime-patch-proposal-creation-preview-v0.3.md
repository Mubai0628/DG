# Runtime Patch Proposal Creation Preview v0.3

The runtime patch proposal creation preview helper is a pure, browser-safe
summary helper for creating patch proposal previews from safe metadata. It is
designed for App Shell preview surfaces and is preview only. It does not apply
patches, read files, write files, write events, call models, invoke
capabilities, or touch Git or shell execution paths.

## Helper

`buildPatchProposalCreationPreview(input)` accepts summary-only proposal
metadata and returns a deterministic preview. Supporting helpers validate input
and summarize the output:

- `validatePatchProposalCreationInput(input)`
- `buildPatchProposalCreationPreview(input)`
- `summarizePatchProposalCreationPreview(preview)`

The output source is `runtime_patch_creation_preview`.

## Input Model

The helper accepts:

- intent
- title
- change description summary
- selected path refs
- proposed changes
- run draft ref
- workspace index ref
- context summary ref
- agent route ref
- capability plan ref
- createdAt
- idGenerator

Path refs and proposed changes are summary-only path refs. They can contain
path, change kind, language, extension, reason summary, estimated lines added
and removed, risk hints, and warning codes.

The helper rejects raw fields and unsafe markers, including `beforeContent`,
`afterContent`, `rawDiff`, `rawPatch`, `rawSource`, `rawPrompt`, `rawDom`,
`rawCsv`, API keys, authorization headers, environment values, stdout, and
stderr.

## Validation

The helper blocks:

- absolute paths, drive-letter paths, UNC paths, and parent traversal
- `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, and generated output
  paths
- paths with shell metacharacters or URL/query-like forms
- fake API key, bearer token, authorization, private key, raw prompt, raw DOM,
  raw CSV, screenshot, clipboard, and URL query secret markers
- negative line estimates
- too many file refs
- oversized input JSON
- overlong change description summaries

Validation returns warning codes and safe messages only.

## Output Model

The preview contains:

- status: `empty`, `preview`, `blocked`, or `warning`
- proposal id
- title
- intent
- file counts
- created, updated, and deleted counts
- estimated lines added and removed
- risk level
- approval requirement
- path summaries
- warning codes
- proposal hash
- next action

The output never contains raw source, raw diff, patch bodies, prompts, DOM,
CSV, screenshots, clipboard data, API keys, authorization headers, environment
values, stdout, or stderr.

## Risk Rules

- Documentation and test creates or updates are low or medium risk.
- Deletes are high risk and require approval.
- Source, runtime, app, config, and build paths require approval.
- Generated artifact paths are rejected.
- Larger multi-file previews add warning codes.
- Secret and raw-content markers block the preview.

All risk and approval outputs are informational. No approval execution is
enabled by this helper.

## Relation To Patch And Diff Audit

Patch and Diff Audit remains the foundation for future review and audit data.
This helper creates only a proposal preview summary that can be displayed in the
App Diff Surface and Approval Surface. It does not produce a real patch body,
does not run an audit, and does not apply changes.

## Non-Goals

- No patch apply or virtual apply from this helper.
- No filesystem read or write.
- No EventStore write.
- No DeepSeek call.
- No capability invocation or PermissionLease issuing.
- No Git or shell execution.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.
