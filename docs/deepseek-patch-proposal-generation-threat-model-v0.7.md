# DeepSeek Patch Proposal Generation Threat Model v0.7

Status: design gate for P0L. No live model call is implemented here.

## Assets

- User workspace source, configuration, generated artifacts, and secret paths.
- Workspace index summaries and context assembly refs.
- Patch proposal validation, diff audit, approval, virtual apply, rollback, and
  replay artifacts.
- User workspace snapshot / backup contract and promotion readiness summaries.
- EventStore summary events and replay projections.
- DeepSeek API credentials and provider metadata.
- App Shell disabled-only execution boundary.

## Trust Boundaries

- User request text crosses into proposal planning and may be malicious.
- Workspace metadata and evidence refs are trusted only after validation.
- Model output is untrusted until schema, secret, path, and chain validation
  pass.
- App Shell display is not an execution surface.
- Runtime apply, rollback, and event writer helpers remain separate explicit
  prototype paths and must not be reachable from model generation.
- Tauri commands are not added for model proposal generation in this phase.

## Attacker-Controlled Inputs

- User objective text.
- File names, directory names, language labels, warning codes, and metadata
  summaries.
- Evidence ref display text.
- Model output fields.
- Error and repair-loop output.
- Markdown, JSON, or tool-call shaped content included in prompts or model
  responses.

## Prompt Injection Risks

Repo text or user instructions may try to override frozen rules, request raw
workspace dumps, ask for direct filesystem writes, or tell the model to skip
validation. Mitigation: separate frozen rules, task contract, and volatile
evidence; keep safety refs in the no-compress zone; treat model output as
untrusted draft data; reject proposals that request execution or bypass gates.

## Model Hallucination Risks

The model may invent files, APIs, tests, approval state, readiness state, or
EventStore records. Mitigation: require evidence refs for every affected path
and gate, require schema validation, and block missing or unknown refs.

## Unsafe Path Risks

The model may propose absolute paths, Windows drive-letter paths, UNC paths,
parent traversal, shell metacharacters, URL-like paths, query-like paths,
`.git`, `.env`, dependency directories, generated artifacts, or secret-like
paths. Mitigation: validate all paths as normalized safe relative refs and fail
closed on any unsafe path.

## Raw Source Leakage Risks

The model may request or return raw source, raw diff, raw patch, raw prompt,
raw DOM, raw CSV, raw screenshot, clipboard data, stdout, stderr, environment
values, or preimage content. Mitigation: forbid these fields in the schema,
scan nested values, and keep proposal output summary-only.

## Secret Leakage Risks

Prompt context or model output may include API key, Authorization, private key,
password, token, credential, or environment markers. Mitigation: run a secret
scan before prompt construction and again on model output; reject any positive
hit; never persist rejected payloads as events or memory.

## Malicious Generated Content Risks

The model may generate code that exfiltrates data, disables tests, modifies
approval logic, weakens path guards, or hides behavior in generated artifacts.
Mitigation: model output is only a proposal and must pass validation preview,
diff audit, approval draft, virtual apply, rollback checkpoint, and replay
projection before any later runtime prototype can consider it.

## JSON / Schema Corruption Risks

The model may return invalid JSON, duplicate ids, missing fields, unknown
schema versions, raw content fields, or mixed natural language and JSON.
Mitigation: define a strict schema, bounded repair loop, deterministic
normalization, hashable output, and fail-closed validation for unrepairable
payloads.

## Reasoning Content Mishandling Risks

Provider reasoning content may be mistaken for patch content, source, audit
evidence, memory, or event payload. Mitigation: do not persist raw
`reasoning_content`; drop or summarize it as a warning only; never include it
in proposal payloads, events, memory, or App UI raw text.

## Event / Replay Confusion Risks

Preview proposals could be mistaken for persisted events or executed changes.
Mitigation: model proposal drafts remain draft / preview artifacts, event
payloads remain summary-only, and replay state must distinguish draft,
validated, approved, previewed, executed, and written states.

## Approval Bypass Risks

The model may claim approval, manual confirmation, or PermissionLease state.
Mitigation: model output cannot issue PermissionLease, cannot approve, cannot
reject, and cannot replace approval draft or future approval receipt checks.

## Mitigations

- Schema-first model output.
- No raw source by default.
- Evidence refs instead of raw workspace dumps.
- Secret scan before and after model generation.
- Path guard before validation preview.
- Existing validation / audit / approval / virtual apply / rollback / replay
  chain remains mandatory.
- App execution remains disabled.
- No Tauri command for model proposal generation.
- No EventStore writer for model proposals in P0L-001.
- Conservative rejection for unknown, stale, or malformed artifacts.

## Out-of-Scope Risks

- Live DeepSeek transport reliability.
- Provider billing, latency, or rate limits.
- Production PermissionLease issuing.
- App-side apply, rollback, approval, or event write execution.
- Git commit or push.
- Shell execution.
- MCP, plugin, or skills runtime execution.
- Native bridge.
- Desktop action.
