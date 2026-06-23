# Runtime Static Agent Route Preview v0.3

The runtime static agent route preview helper provides a pure runtime static router preview helper for App Shell planning surfaces. It produces summary-only
route previews and never promotes a draft into execution.

## Purpose

`buildStaticAgentRoutePreview()` gives the App Shell a browser-safe route
preview that matches the current fixed Agent Dossier roles:

- `web_data_extraction`: orchestrator -> verifier
- `code_change`: orchestrator -> coder -> reviewer -> verifier
- `code_review`: orchestrator -> reviewer -> verifier
- `verification`: orchestrator -> verifier
- `documentation`: orchestrator -> coder -> reviewer
- `unknown`: needs clarification

The preview source is `runtime_static_router_preview`. App Shell can display the
route id, status, roles, expected outputs, model profile ids, display-only
capability refs, and warning codes.

## Summary-Only Contract

The helper accepts summaries and refs only:

- intent
- objective summary
- acceptance criteria count
- workspace index ref
- context summary ref
- memory recall ref
- patch proposal ref
- capability plan ref
- timestamps and deterministic id generators

The output must not contain raw objective text, raw prompt text, raw source,
raw DOM, raw CSV, raw diff, before/after content, screenshots, clipboard data,
API keys, authorization headers, env values, memory content, or chain-of-thought.
Unsafe markers become warning codes, and blocked previews do not include route
steps.

## Model Profiles

Model profile ids are display-only:

- orchestrator: `deepseek-v4-pro`
- coder: `deepseek-v4-pro`
- reviewer: `deepseek-v4-pro`
- verifier: `deepseek-v4-flash`

No model call is made.

## Capability Refs

Capability ids are refs only:

- orchestrator: `native.workspace.index`
- coder: `native.patch.propose`
- reviewer: `native.git.diff_summary`, `native.workspace.index`
- verifier: `native.git.status`, `native.shell.pnpm_test`

These refs are not invoked. Shell and mutating capabilities remain future,
simulated, disabled, or approval-gated in downstream surfaces.

## App Shell Integration

The App Shell Agent Route Preview consumes the helper through a thin adapter.
The panel remains preview-only and says that the route was generated from the
runtime static router helper. It does not write events and does not create a
ControlPlaneRun.

Related surfaces:

- Run Draft supplies local intent and objective summary.
- Context Cart and Context Assembly Preview provide context refs only.
- Capability Plan Preview consumes route capability refs as descriptors only.
- Patch Proposal UI Bridge and Memory Recall Preview provide summary refs only.

## Non-Goals

- No dynamic bidding.
- No agent execution.
- No real multi-agent execution.
- No model call.
- No DeepSeek call.
- No capability invocation.
- No PermissionLease issuing.
- No EventStore write.
- No patch, Git, or shell execution.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

Real run creation remains deferred to a later controlled creation stage.
