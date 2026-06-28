# Runtime Live DeepSeek Proposal Adapter v0.8

Status: implemented as a runtime-only explicit opt-in adapter for P0M-004.

The live DeepSeek proposal adapter can call an injected transport to request a
structured `model_patch_proposal` only after the API key policy and summary-only
request builder have passed their gates. It is disabled by default and is not
connected to the App Shell.

## Boundary

- Runtime-only adapter.
- Disabled by default.
- Explicit opt-in required.
- API key resolver injected.
- Transport injected.
- No default environment read.
- No default network call.
- No App call.
- No Tauri command.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No PermissionLease issuing.
- No native bridge.
- No desktop action.

The adapter fails closed unless `liveMode` is
`explicit_live_proposal_call`, the P0M-002 policy is `policy_ready`, the P0M-003
request build result is `request_ready`, `allowApiKeyResolution` is true,
`allowLiveNetwork` is true, an API key resolver is supplied, and a transport is
supplied.

## API Key Resolver

The resolver is an injected runtime dependency. It may return a key only in
memory for the duration of the explicit call.

The adapter never returns:

- raw key values
- Authorization headers
- bearer tokens
- environment values
- vault secret values

Errors from the resolver are redacted to safe finding codes and hash/count
summaries. `apiKeyHashPrefix` may be returned as a summary reference, but the
raw key is never output.

## Transport

The transport is injected and is not used by default. P0M-004 does not add a
default fetch transport. Any future explicit fetch transport must remain
runtime-only, require explicit opt-in, and must not be imported by the App.

Transport responses may include proposal content, safe usage numbers,
response ids, warning codes, and optional `reasoning_content`. The raw response
is never output.

## Request And Response Safety

The request consumed from P0M-003 must remain summary-only:

- No tools/tool_choice
- `summaryOnly: true`
- `noExecution: true`
- no raw prompt
- no raw source
- no raw diff
- no API key or environment value

The response must pass the P0L repair and schema validation chain before the
adapter returns a generated summary. Unsafe paths, secret markers, raw fields,
execution fields, malformed output, and blocked schema validation fail closed.

`reasoning_content` is dropped from output. The result may record only
`droppedReasoningContent` and a length summary.

## Output

`runLiveDeepSeekProposalAdapter()` returns summary-only fields:

- generation id
- request id and request hash
- response hash
- proposal id
- proposal summary
- repair summary
- validation summary
- safe usage summary
- finding codes and counts
- readiness flags

All execution readiness flags remain false:

- `canApplyPatch: false`
- `canRollback: false`
- `canWriteFilesystem: false`
- `canWriteEventStore: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `canIssuePermissionLease: false`
- `appCanExecute: false`

`canEnterPatchProposalPreview` only means a validated proposal summary may enter
the preview chain. It does not enable App execution.

## Tests

Normal scoped tests use fake injected resolvers and fake injected transports.
No default test reads an API key, calls fetch, or calls DeepSeek.

Optional live tests, if added later, must skip by default unless an explicit
opt-in variable is set. They must never print or persist the key.

## Relation to P0M

- P0M-002 defines API key policy metadata and opt-in scope.
- P0M-003 builds the summary-only request boundary consumed here.
- P0L-005 repairs the returned proposal candidate.
- P0L-002 validates the repaired proposal schema.
- Future P0M-005 may deepen repair/validation integration, still without file
  writes.

## Non-goals

- No App execution.
- No App live call.
- No Tauri command.
- No apply or rollback.
- No EventStore write.
- No PermissionLease issuing.
- No Git/shell.
- No native bridge.
- No desktop action.
