# Agent Dossier and Static Router v0.2

This document describes the v0.2 Agent Plane skeleton. It defines fixed agent
roles, summary-only dossiers, and a static router for planning. It does not
implement dynamic agent bidding, real multi-LLM execution, MCP/plugin/skill
runtimes, shell execution, desktop action, patch application, Memory Core, or a
bridge transport.

## Why Fixed Roles First

v0.2 starts with deterministic routing before any dynamic agent selection. The
router produces a plan and per-role dossiers; it does not call a model and does
not execute tools.

The initial roles are:

- `orchestrator`: frames the task, constraints, and route.
- `coder`: receives implementation objectives and allowed capability
  references.
- `reviewer`: receives review outputs and evidence references, not coder
  private scratchpads.
- `verifier`: receives acceptance criteria, evidence references, artifact
  summaries, and verification outputs.

Dynamic bidding, health scoring, automatic parallel execution, and model
runtime orchestration remain future work.

## Agent Dossier

An `AgentDossier` is the only packet a role should receive. It contains
references and safe summaries:

- `objective`
- `acceptedFacts`
- `activeConstraints`
- `allowedCapabilities`
- `requiredOutputs`
- `forbiddenSideEffects`
- `evidenceRefs`
- `contextRefs`
- `memoryRefs`
- `capabilityLeaseRefs`
- `modelProfileId`

Dossiers reference Context Ledger reports, no-compress-zone ids, Capability
Broker descriptors, and future memory records by id. They do not inline raw
Context Ledger content or memory content.

## Isolation Rules

The router and dossier validator enforce role isolation:

- The coder does not receive reviewer private notes.
- The reviewer does not receive coder scratchpads or raw model reasoning.
- The verifier receives evidence and artifact references, not raw model
  reasoning.
- The orchestrator sees route summaries, not private scratchpads.
- External evidence remains marked as untrusted.
- Capability leases are references only; Capability Broker v2 validates them.

The validator rejects fields or markers for raw prompts, raw source code, raw
DOM, raw CSV, raw screenshots, clipboard data, API keys, Authorization headers,
and direct executable command strings.

## Static Routes

The static router maps intent to a fixed role sequence:

- `web_data_extraction`: `orchestrator -> verifier`
- `code_change`: `orchestrator -> coder -> reviewer -> verifier`
- `code_review`: `orchestrator -> reviewer -> verifier`
- `verification`: `orchestrator -> verifier`
- `documentation`: `orchestrator -> coder -> reviewer`
- `unknown`: needs clarification by default

The `web_data_extraction` route intentionally avoids an unnecessary coder
because the v0.1 flow is deterministic runtime behavior.

## Model Mapping

New dossiers use canonical Model Plane profile ids:

- `orchestrator`: `deepseek-v4-pro`
- `coder`: `deepseek-v4-pro`
- `reviewer`: `deepseek-v4-pro`
- `verifier`: `deepseek-v4-flash`

Legacy aliases such as `deepseek-chat` and `deepseek-reasoner` are not used for
new dossiers.

## Capability Integration

Allowed capabilities are descriptor ids only. The router can validate required
capability ids against Capability Broker v2, but it does not execute a
capability and does not issue a permission lease. Unknown required capabilities
move the plan to `needs_clarification`.

Forbidden side effects for this phase include shell execution, desktop action,
MCP/plugin/skill execution, Memory Core writes, patch application, bridge file
writes, automatic Convert, native bridge transport, and real DeepSeek API calls.

## Events

If an event store is provided, the router may emit:

- `agent.route.planned`
- `agent.dossier.created`
- `agent.route.rejected`
- `agent.route.needs_clarification`

Event payloads are summary-only. They include task id, route id, roles, dossier
ids, capability ids, model profile ids, risk level, decision, warnings, errors,
and hashes. They do not include raw prompts, raw source code, raw DOM, raw CSV,
screenshots, clipboard data, API keys, Authorization headers, or raw memory
content.

## Non-goals

This phase does not implement:

- real multi-agent LLM execution
- dynamic agent bidding
- MCP/plugin/skill runtimes
- shell execution
- desktop action
- Memory Core
- patch application
- nativeMessaging or any bridge transport
- automatic Convert
- bridge file writes
- real DeepSeek API calls

The next layer can build an Agent Runtime on top of these dossiers after the
proposal, validation, approval, and event boundaries remain stable.
