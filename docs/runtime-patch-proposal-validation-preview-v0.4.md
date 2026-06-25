# Runtime Patch Proposal Validation Preview v0.4

The runtime Patch Proposal Validation Preview helper validates a patch proposal
summary before later diff/audit, approval draft, or virtual apply preview
stages. It is a pure, summary-only helper: validation preview only, no apply.

The helper lives in `runtime/src/execution/patch/validation-preview.ts` and is
exported through the runtime patch module. It accepts a patch proposal summary,
safe path summaries, risk metadata, warning codes, and optional summary refs.
It does not accept raw source, raw diffs, patch bodies, before/after content,
stdout, stderr, environment values, or secret material.

## Scope

- Validate proposal id and summary schema.
- Validate workspace-relative path summaries.
- Detect unsafe paths, generated artifact paths, secret-like paths, raw field
  names, and secret markers.
- Derive risk from path summaries and declared change shape.
- Report approval requirements for source, config/build, protected, or delete
  paths.
- Report readiness for the next preview stages.
- Mark the validation ref as `no_compress_zone` evidence.

Validation success means only that the summary can proceed to diff/audit
preview. It never means a patch is ready to apply.

## Output

The output is `PatchProposalValidationPreview`:

- `status`: `empty`, `valid`, `warning`, `blocked`, or `needs_approval`
- `validationId`
- `proposalId`
- declared and derived risk levels
- blocker, warning, and finding counts
- summary-only findings
- readiness flags
- `noCompressRequired`
- `contextPlacement: no_compress_zone`
- `canApplyPatch: false`

Findings contain only kind, severity, code, safe summary, optional safe path,
and optional related ref. They do not contain raw source, raw diff, raw prompt,
raw DOM, raw CSV, API keys, Authorization headers, stdout, or stderr.

## Non-Goals

- No patch apply.
- No virtual apply.
- No filesystem read or write.
- No raw source/diff display.
- No Git or shell execution.
- No DeepSeek call.
- No EventStore write.
- No native bridge or desktop action.

## Relationships

- Patch Proposal Creation Preview creates the summary that this helper can
  validate.
- Diff Audit Preview may later consume a valid validation ref.
- Approval Gate Draft may later consume `needs_approval` output.
- Context Assembly Preview keeps validation refs in `no_compress_zone`.
- Finding groups cover path/schema/risk/approval/readiness plus evidence,
  context, and safety.
- Real apply remains deferred.
