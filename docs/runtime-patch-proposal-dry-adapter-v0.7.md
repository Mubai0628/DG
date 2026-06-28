# Runtime Patch Proposal Dry Adapter v0.7

The DeepSeek patch proposal dry adapter builds a summary-only request for model patch proposal generation, calls an injected fake or dry client, and validates the returned draft with the P0L-002 model patch proposal schema.

This adapter is dry only. It is not a live DeepSeek adapter and it does not enable App execution.

## Boundary

- Dry adapter only.
- No live DeepSeek call.
- Injected fake/dry client only.
- No API key read.
- No fetch or network use.
- No file write.
- No apply or rollback.
- No EventStore write.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.

The default helper fails closed if no dry client is supplied. It does not construct a live DeepSeek client, does not read `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`, and does not call `fetch`.

## Request Contract

`buildPatchProposalDryRequest()` emits only summary refs:

- objective summary
- intent
- model profile id
- workspace index refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- forbidden path policy
- evidence refs
- task contract hash
- no-compress refs

The request includes:

- `responseFormat: "model_patch_proposal"`
- `noToolChoice: true`
- `noExecution: true`
- `summaryOnly: true`
- safety instructions for no file write, no apply, no rollback, no Git/shell, no raw secrets, and JSON output

The request does not include `tools` or `tool_choice`. If a future thinking mode flag is represented by caller metadata, it still must not introduce `tool_choice`.

## Response Handling

The injected client may return an object or JSON string proposal draft in `content`. The adapter parses and validates that content with the P0L-002 schema validator.

`reasoning_content` / `reasoningContent` from fake responses is dropped. The result may set `droppedReasoningContent: true`, but the reasoning text is not persisted in the result, docs, memory, events, or App surfaces.

Usage may be retained only as safe numeric counts. Raw requests, raw source, raw diffs, raw prompts, raw DOM, raw CSV, raw screenshots, API keys, Authorization headers, command fields, apply fields, rollback fields, and EventStore write fields are rejected.

## Output

`runPatchProposalDryAdapter()` returns a summary-only result:

- generation id
- request hash
- response hash
- proposal id
- proposal validation status and counts
- proposal path/hash summary
- finding codes and safe messages
- dropped reasoning flag
- safe usage counts
- readiness flags

All execution readiness flags remain false. `canEnterPatchProposalPreview` only means the draft can proceed into the existing proposal preview chain; it does not mean the proposal can apply or write files.

## Relationship To P0L

- P0L-002 defines the schema and validator used here.
- P0L-003 provides the offline fake harness and fixtures this adapter can reuse in tests.
- Future P0L-005 may design proposal/schema repair loops, but those loops must remain no-write and no-apply.

Every dry adapter output must still proceed through patch proposal creation preview, validation preview, diff audit, approval draft, virtual apply, rollback checkpoint, replay projection, and the existing P0K apply/rollback gates before any future execution path.

## Non-Goals

- No live adapter.
- No live DeepSeek call.
- No App execution.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git or shell execution.
- No native bridge.
- No desktop action.
