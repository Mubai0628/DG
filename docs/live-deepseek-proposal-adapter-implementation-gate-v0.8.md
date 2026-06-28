# Live DeepSeek Proposal Adapter Implementation Gate v0.8

Status: required gate before any P0M-004 live adapter implementation.

Do not implement live adapter until P0M-001/P0M-002/P0M-003 gates are
satisfied. Each item below must be testable. No item may rely only on prose.

## API Key Safety

- Test that P0M-001 and P0M-002 do not read `DEEPSEEK_API_KEY` or
  `OPENAI_API_KEY`.
- Test that disabled/default mode performs no API key lookup.
- Test future key presence summaries never include raw key material.
- Test secret scanner blocks API key, Authorization, private key, password,
  token, and credential markers in request, response, telemetry, and errors.

## Opt-in Safety

- Test future live calls require an explicit opt-in flag or receipt.
- Test missing, false, stale, malformed, or mismatched opt-in blocks live
  requests.
- Test App Shell cannot enable live model calls by default.
- Test opt-in state cannot imply apply, rollback, approval execution,
  EventStore write, PermissionLease issuance, Git, shell, native bridge, or
  desktop action.

## Request Boundary Safety

- Test live request builder accepts only objective summaries, workspace index
  summary refs, context assembly refs, user workspace readiness refs, allowed
  path refs, forbidden path policy, evidence refs, and no-compress refs.
- Test raw source, raw diff, raw patch, raw prompt dump, raw DOM, raw CSV,
  screenshot, clipboard, arbitrary file content, preimage content, API key,
  Authorization, env, stdout, and stderr are rejected.
- Test no raw workspace dump is constructed.
- Test no raw prompt is persisted.
- Test request hashes are deterministic and summary-only.

## Response Schema Safety

- Test live output must be structured JSON `model_patch_proposal`.
- Test unknown schema versions, missing ids, duplicate ids, missing evidence
  refs, unknown fields, and malformed JSON are blocked or repaired only by the
  deterministic repair loop.
- Test response cannot include Git, shell, Tauri, EventStore, apply, rollback,
  PermissionLease, native bridge, desktop action, or command fields.
- Test `contentDraft`, if present in a later phase, is treated as draft-only
  and appears in App UI only as byte, line, hash, and warning summaries.

## Repair / Validation Safety

- Test repair runs before preview-chain promotion.
- Test repair cannot remove secret markers, execution fields, or unsafe paths
  to make a proposal pass.
- Test failed repair blocks the proposal.
- Test repaired proposals still pass schema validation, forbidden-field guard,
  path guard, secret guard, patch validation preview, diff audit preview,
  approval draft, virtual apply preview, rollback checkpoint preview, and
  replay projection.

## Path / Content / Secret Safety

- Test absolute path, Windows drive-letter path, UNC path, parent traversal,
  null byte, newline, shell metacharacter, URL-like path, and query-like path
  rejection.
- Test `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated
  artifacts, and secret-like paths are rejected.
- Test raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV,
  screenshot, clipboard, stdout, stderr, environment values, arbitrary file
  contents, and preimage content are rejected.

## Telemetry / Redaction Safety

- Test telemetry contains only safe counts, status, model profile id, hash
  prefixes, durations, and warning codes.
- Test raw prompt, raw response, raw source, raw diff, API key, Authorization,
  environment values, provider headers, and raw `reasoning_content` are not
  persisted.
- Test `reasoning_content` is dropped or summarized only as safe dropped
  boolean/count metadata.
- Test usage summary contains safe numbers only.

## App UI Safety

- Test App Shell remains disabled by default.
- Test no enabled Live Model, Approve, Reject, Apply, Rollback, Write Events,
  Commit, or Execute controls are added.
- Test App cannot read API keys.
- Test App cannot call fetch/network for live proposals.
- Test App cannot invoke Tauri for live proposal generation.
- Test App displays only summary-only proposal, repair, validation, telemetry,
  and warning refs.

## CI / Boundary Safety

- Test boundary checker blocks App-side live model calls, Tauri model
  commands, App EventStore writes, Git, shell, child_process, native bridge,
  desktop action, and broad capability invocation.
- Test secrets checker blocks live proposal fixtures with fake secret markers.
- Test focused schema, repair, dry adapter, and future request-builder tests
  pass before P0M-004.
- Test docs-lock coverage for ADR, threat model, implementation gate, and
  P0M-002 plan.

## Gate Result

P0M-004 may not start until this gate reports all required checks as passing.
If any item is missing, untestable, or only described in prose, live adapter
implementation remains blocked.
