# App Shell Agent Route Preview v0.2

The Agent Route Preview is a read-only App Shell surface for showing the fixed
role sequence that a future local run would use. It derives from the local Run
Draft preview and displays route summaries only.

## Scope

- Shows fixed roles before dynamic bidding:
  - `orchestrator`
  - `coder`
  - `reviewer`
  - `verifier`
- Maps local draft intents to route previews:
  - `web_data_extraction`: orchestrator -> verifier
  - `code_change`: orchestrator -> coder -> reviewer -> verifier
  - `code_review`: orchestrator -> reviewer -> verifier
  - `verification`: orchestrator -> verifier
  - `documentation`: orchestrator -> coder -> reviewer
  - `unknown`: needs clarification
- Shows display-only model profile ids:
  - orchestrator, coder, reviewer: `deepseek-v4-pro`
  - verifier: `deepseek-v4-flash`
- Shows capability ids as refs only. No capability is invoked.

## Summary-Only Policy

The surface may display:

- route id
- role names
- role order
- purpose summaries
- expected output labels
- model profile ids
- capability ids
- context, memory, and evidence refs
- warning codes
- preview hashes

The surface must not display:

- raw prompt
- raw objective text
- raw source code
- raw DOM
- raw CSV
- screenshot content
- clipboard content
- API keys
- Authorization headers
- environment values
- full memory content
- chain-of-thought

Unsafe draft markers are represented as warning codes only.

## Integration Points

- Run Draft: provides the local intent and safe objective summary.
- Agent Dossier: future dossiers can use the same role sequence, but this
  surface does not create executable dossiers.
- Capability Broker: capability ids are shown as display-only refs.
- Context Cart: context refs are summaries only.
- Patch Proposal UI: patch proposal refs may inform the coder/reviewer preview,
  but no patch is applied.

## Non-Goals

- No dynamic bidding.
- No real multi-agent execution.
- No model request.
- No DeepSeek call.
- No capability invocation.
- No EventStore write.
- No patch, Git, or shell execution.
- No MCP, plugin, or skills runtime.
- No desktop action.

The preview is informational. It prepares the UI for a future Agent Runtime
without adding any execution path in this phase.
