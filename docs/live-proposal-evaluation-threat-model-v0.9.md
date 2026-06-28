# Live Proposal Evaluation Threat Model v0.9

Status: design-only threat model for P0N-001.

## Assets

- API key references and future API key values.
- Summary-only prompt and request boundaries.
- Golden case fixtures and expected outputs.
- Workspace refs, context refs, readiness refs, and evidence refs.
- Model proposal summaries.
- Schema, repair, validation, audit, approval, rollback, and replay summaries.
- Usage summaries and token counts.
- Redaction audit summaries.
- App disabled-only boundary.
- Release and CI artifacts.

## Trust Boundaries

- User-authored task objectives cross into golden case fixtures.
- Workspace, context, readiness, and evidence refs cross into evaluation input.
- Future live model output crosses into schema and repair validators.
- Evaluation reports cross into docs, CI, and possible App read-only summaries.
- App surfaces remain outside live-call, API-key, fetch/network, apply,
  rollback, and EventStore boundaries.

## Attacker-Controlled Inputs

- Objective summaries.
- Workspace refs and path refs.
- Evidence ref summaries.
- Golden case fixture text.
- Expected output summaries.
- Future model responses.
- Warning codes and failure category labels.
- Usage summary-like objects.

## Risks

### Golden Case Poisoning

An attacker could add fixtures that normalize unsafe paths, missing evidence,
raw content leakage, or overly permissive acceptance criteria.

### Expected-Output Overfitting

Golden cases could reward brittle exact text instead of safe proposal behavior,
causing a model or evaluator to optimize for superficial matches.

### Raw Prompt / Response Leakage

Fixtures or reports could accidentally persist raw prompt text, raw model
response text, raw source, raw diff, raw CSV, raw DOM, stdout, or stderr.

### reasoning_content Leakage

Provider reasoning_content could be copied into golden cases, reports, logs,
memory, App UI, or release artifacts.

### API Key Leakage

API key values, Authorization headers, bearer tokens, or environment values
could be inserted into fixture fields, failure summaries, thrown errors, or
usage records.

### Unsafe Proposal False Positive

An unsafe proposal could be scored as safe because a fixture expected the wrong
summary, omitted a blocker category, or ignored validation/audit warnings.

### Unsafe Proposal False Negative

A safe proposal could be rejected by overly broad taxonomy rules, causing
developers to weaken guards later.

### Hallucinated Path Risks

The model may invent paths that do not exist, use dependency/generated paths,
cross workspace boundaries, or target hidden/config files.

### Metric Gaming

Metrics such as pass rate or repair success rate may be optimized while
ignoring quality, evidence, test coverage, or risk severity.

### Evaluation Artifact Leakage

Reports may include raw fixture fragments, raw response fragments, stack traces,
or conformance artifacts not meant for release.

### Live Evaluation Cost / Usage Risks

Future live evaluation may create unexpected token costs, usage spikes, or
confusing summaries if opt-in, rate, and redaction policies are weak.

## Mitigations

- Keep P0N-001 design-only.
- Require no live call in P0N-001.
- Require no API key read in P0N-001.
- Require no fetch/network in P0N-001.
- Require summary-only golden case fixtures.
- Forbid raw prompt, raw response, raw source, raw diff, raw CSV, raw DOM,
  reasoning_content, API key, Authorization, env, stdout, and stderr fields.
- Use stable failure taxonomy codes.
- Include both unsafe-positive and unsafe-negative fixture categories in future
  plans.
- Require schema, repair, validation, audit, approval, rollback, replay, and
  redaction checks before quality conclusions.
- Treat usage telemetry as numeric summary only.
- Block any raw field, key-like marker, reasoning_content leak, or execution
  readiness claim.
- Keep App read-only and disabled for live calls, API key reads, fetch/network,
  apply, rollback, EventStore writes, Git, shell, native bridge, and desktop
  action.

## Out-of-Scope Risks

- Implementing an evaluator runner.
- Performing live DeepSeek calls.
- Reading API keys.
- Fetching network.
- Writing files or EventStore events.
- Applying or rolling back patches.
- Issuing PermissionLease.
- Executing Git or shell.
- Enabling native bridge or desktop action.
