# Live DeepSeek Proposal Adapter Threat Model v0.8

Status: design gate for P0M. No live DeepSeek call, API key read, or
fetch/network is implemented here.

## Assets

- DeepSeek API credentials and any future API key source metadata.
- User request text, objective summaries, and task contracts.
- Workspace index summaries and context assembly refs.
- No-compress refs for safety-critical proposal, validation, approval,
  readiness, rollback, and replay artifacts.
- Model patch proposal drafts, repair reports, validation previews, diff audit
  previews, approval drafts, virtual apply previews, rollback checkpoint
  previews, and replay projections.
- User workspace source, generated artifacts, dependency directories, secret
  paths, and backup/preimage boundaries.
- App Shell disabled-only execution boundary.

## Trust Boundaries

- User request text crosses into prompt construction and may be malicious.
- Workspace metadata is trusted only after existing summary and path guards.
- API key source, if introduced later, crosses a sensitive trust boundary and
  must require explicit opt-in.
- Live model output is untrusted until schema, repair, forbidden-field, path,
  secret, validation, audit, approval, rollback, and replay gates pass.
- App Shell display is not an execution surface.
- Runtime apply, rollback, and EventStore writer helpers remain separate
  explicit prototype paths and must not be reachable from live proposal
  generation.

## Attacker-Controlled Inputs

- User objective text.
- Workspace file names, directory names, language labels, warning codes, and
  metadata summaries.
- Evidence ref display text.
- Prompt snippets and no-compress refs.
- Live model response fields.
- Repair-loop errors and schema validation errors.
- JSON, Markdown, or tool-call shaped content inside prompts or responses.

## Prompt Injection Risks

Repo text, user text, or evidence text may ask the model to ignore frozen
rules, dump raw workspace contents, reveal API key material, call tools, write
files, or skip validation. Mitigation: separate frozen rules, task contract,
and volatile evidence; keep safety refs in the no-compress zone; treat output
as untrusted draft data; reject proposals that request execution or bypass
gates.

## API Key Leakage Risks

Future live adapter work could accidentally read, log, display, persist, or
echo `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, Authorization headers, provider
tokens, or vault metadata. Mitigation: P0M-001 reads no key; future tasks must
use explicit opt-in, key-presence summaries only, redaction tests, secret
scanner coverage, and no raw credential persistence.

## Raw Prompt / Source Leakage Risks

Prompt construction or live response logging may include raw source, raw diff,
raw patch, raw prompt, raw DOM, raw CSV, screenshots, clipboard content,
stdout, stderr, environment values, arbitrary file contents, or preimage
content. Mitigation: summary-only request boundary, forbidden-field scans at
every depth, no raw prompt persistence, and fail-closed rejection.

## Live Model Hallucination Risks

The model may invent files, APIs, tests, approval state, readiness state,
EventStore records, PermissionLease state, or execution results. Mitigation:
require evidence refs, schema validation, id consistency checks, and existing
preview-chain validation before any draft advances.

## Unsafe Path Risks

The model may propose absolute paths, Windows drive-letter paths, UNC paths,
parent traversal, shell metacharacters, URL-like paths, query-like paths,
`.git`, `.env`, dependency directories, generated artifacts, temporary paths,
or secret-like paths. Mitigation: validate all paths as normalized safe
relative refs and fail closed on unsafe paths.

## Malicious Generated Content Risks

The model may generate code that exfiltrates data, disables tests, weakens
approval logic, bypasses path guards, or hides behavior in generated files.
Mitigation: live output is only a draft proposal and must pass validation,
diff audit, approval draft, virtual apply, rollback checkpoint, and replay
projection before any later runtime prototype can consider it.

## JSON / Schema Corruption Risks

The model may return invalid JSON, duplicate ids, missing fields, unknown
schema versions, mixed prose and JSON, raw content fields, or execution fields.
Mitigation: strict schema, deterministic bounded repair, hashable normalized
output, and fail-closed validation for unrepairable or unsafe payloads.

## Reasoning Content Mishandling Risks

Provider `reasoning_content` may be mistaken for patch content, audit
evidence, memory, or event payload. Mitigation: raw `reasoning_content` must
not be persisted; it may only be dropped or represented as a safe dropped
boolean/count summary.

## Usage Telemetry Leakage Risks

Telemetry may leak raw prompt, raw response, credential state, provider
headers, or sensitive file refs. Mitigation: telemetry must be summary-only and
limited to safe counts, hashes, model profile id, status, and warning codes.

## Event / Replay Confusion Risks

Draft proposals could be mistaken for persisted events or executed changes.
Mitigation: live proposal drafts remain draft / preview artifacts; event
payloads remain summary-only; replay state must distinguish draft, validated,
approved, previewed, executed, written, and rolled-back states.

## Approval Bypass Risks

The model may claim approval, manual confirmation, production PermissionLease,
or user consent. Mitigation: model output cannot issue PermissionLease,
approve, reject, or replace approval draft and future approval receipt checks.

## Opt-in Bypass Risks

Code, tests, App UI, or defaults may accidentally enable live calls without an
explicit user opt-in. Mitigation: disabled/default mode performs no API key
read, no fetch/network, and no model call; future tests must monkey-patch
network and environment sentinels; boundary checks must block implicit live
paths.

## Mitigations

- Explicit opt-in before future live calls.
- No API key read in P0M-001.
- No fetch/network in P0M-001.
- Summary-only request builder before any live adapter.
- Secret scan before request construction and after response receipt.
- Forbidden-field scan for request and response objects.
- Path guard before preview-chain integration.
- Deterministic repair that fails closed for unsafe content.
- Existing P0L/P0I/P0K schema, repair, validation, audit, approval, virtual
  apply, rollback, and replay chain remains mandatory.
- App execution remains disabled.
- No Tauri command or App EventStore writer for live proposal generation.

## Out-of-Scope Risks

- Provider billing, latency, quota, and outage handling.
- Production PermissionLease issuing.
- App-side apply, rollback, approval, or event write execution.
- Git commit or push.
- Shell execution.
- MCP, plugin, or skills runtime execution.
- Native bridge.
- Desktop action.
