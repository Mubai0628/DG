# Runtime Patch Diff Audit Preview v0.4

`buildPatchDiffAuditPreview()` is a pure runtime helper that audits patch
proposal and validation summaries. It is local-only, summary-only, and does not
generate a raw diff.

## Scope

- Input: patch proposal summary, validation summary, safe refs, counts, risk
  levels, warning codes, and path summaries.
- Output: audit status, file and line counts, path category counts, validation
  finding summary, approval readiness, no-compress placement, warning codes, and
  a deterministic audit hash.
- Placement: patch diff audit refs belong in `no_compress_zone`.
- Readiness: `canProceedToApprovalDraftPreview` may become true when there are
  no blockers. `canProceedToVirtualApplyPreview` and `canApplyPatch` are always
  false in this phase.

## Safety

The helper rejects or blocks:

- missing proposal or validation ids
- missing path summaries
- blocked validation previews
- validation summaries not ready for diff audit preview
- unsafe paths, generated artifact paths, `.git`, `.env`, `node_modules`,
  `dist`, `target`, `.tmp`, URL/query-like paths, and shell metacharacters
- raw fields such as before/after content, raw patch, raw source, raw prompt,
  raw DOM, raw CSV, screenshots, clipboard data, stdout, stderr, env, API key,
  or Authorization fields
- fake API key markers, Bearer tokens, Authorization headers, private key
  markers, raw prompt/DOM/CSV/screenshot markers, and token-like URL queries
- attempts to set apply or virtual-apply readiness true

The output contains no raw source, raw diff, raw patch body, raw prompt, raw
payload, API key, Authorization value, stdout, or stderr.

## Findings

Findings are summary-only:

- `validation`
- `path`
- `risk`
- `approval`
- `evidence`
- `context`
- `test_coverage`
- `readiness`
- `safety`

Severity is `info`, `warning`, or `blocker`.

## Non-goals

- no raw diff generation
- no patch apply
- no virtual apply
- no filesystem read or write
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no native bridge
- no desktop action

## Future Path

This preview can feed a later approval-gate draft. Virtual apply preview and
real apply remain deferred and must stay behind explicit future gates.
