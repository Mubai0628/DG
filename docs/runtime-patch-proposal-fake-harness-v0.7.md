# Runtime Patch Proposal Fake Harness v0.7

The offline fake model patch proposal harness is a runtime test utility for P0L. It uses deterministic fake model responses, passes them through the P0L-002 model patch proposal schema parser and validator, and returns a summary-only harness report.

This is schema-chain rehearsal only. It is not a live DeepSeek integration, not a dry adapter, and not an execution path.

## Boundary

- Offline fake harness only.
- No live DeepSeek call.
- No API key read.
- No fetch or network use.
- No file write.
- No apply or rollback.
- No EventStore write.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.

The harness accepts only summary refs and explicit fake responses. It does not read `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, or any workspace file content. It does not call a DeepSeek client and does not call `fetch`.

## Flow

1. A harness case supplies a summary-only request and an explicit fake response.
2. `createFakePatchProposalModel()` returns the deterministic response for that case.
3. `runPatchProposalHarnessCase()` builds a summary-only request.
4. The fake response is parsed with the P0L-002 model patch proposal schema.
5. The schema validator applies forbidden-field, path, content, and secret guards.
6. The case result includes only ids, counts, finding codes, hash summaries, readiness flags, and next action text.
7. `runPatchProposalHarness()` aggregates case results into a summary-only report.

Harness readiness flags always remain false for live model calls, API key reads, network, filesystem writes, apply, Git, shell, EventStore writes, and App execution.

## Fixtures

Harness fixtures live under:

`runtime/test/fixtures/model-patch-proposals/harness/`

Current fixture families:

- `case-safe-basic.json`: a safe draft that reaches schema validation with summary-only evidence warnings.
- `case-warning-content-draft.json`: a draft with `contentDraft`, which stays summarized and warning-only.
- `case-rejected-unsafe-path.json`: path traversal rejection.
- `case-rejected-secret-marker.json`: fake secret marker rejection.
- `case-rejected-execution-field.json`: execution field rejection.
- `case-malformed-json.json`: malformed JSON rejection.

Fixtures may contain obvious synthetic secret markers for rejection tests, but must never contain real credentials.

## Blocked And Warning Cases

Blocked cases prove fail-closed behavior. Unsafe paths, secret markers, execution fields, malformed JSON, forbidden request fields, or fake model errors with secret-like markers return blocked case results without retaining raw values.

Warning cases prove that a draft can remain non-executable while still carrying safety findings. `contentDraft` is summarized by hash, byte count, and line count by the schema layer; the harness report does not return the raw draft text.

## Relationship To P0L

P0L-002 defines the model patch proposal schema. This harness exercises that schema with deterministic fake responses so later work can build confidence before any live model adapter exists.

Future P0L-004 may add a dry DeepSeek proposal adapter, but that future adapter must remain no-apply and must continue to feed model output through schema validation, secret scanning, path guard, patch proposal validation, diff audit, approval draft, virtual apply, rollback checkpoint, and replay projection.

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
