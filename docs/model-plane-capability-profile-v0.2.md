# Model Plane Capability Profile v0.2

## Purpose

The Model Plane capability profile is the v0.2 source of truth for model
capabilities. It is intentionally separate from the live DeepSeek client path.
Profiles describe what the runtime believes it may request and which local
invariants must hold before later control-plane work uses a model.

P0F-001 adds only an offline profile and dry probe. It does not call DeepSeek,
does not read API keys, and does not change `ConversationEngine`.

## Canonical Profiles

The canonical v0.2 profile names are:

- `deepseek-v4-flash`
- `deepseek-v4-pro`

Legacy aliases are compatibility-only:

- `deepseek-chat` -> `deepseek-v4-flash`
- `deepseek-reasoner` -> `deepseek-v4-pro`

Alias use must produce a warning. New main-path code should use canonical v4
profile IDs.

## Profile Fields

Each profile records:

- `modelId`
- `family`
- `thinking`
- `toolCalls`
- `jsonOutput`
- `reasoningContent`
- `contextCaching`
- `cacheUsageFields`
- `toolChoiceWithThinking`
- `responseFormatJson`
- `maxContextTokens`
- `maxOutputTokens`
- `defaultUseCases`
- `warnings`
- `invariants`

The profile is descriptive and local. It is not a substitute for live
conformance. Live conformance remains opt-in.

## Dry Probe Result

`runDeepSeekCapabilityDryProbe()` returns a safe local result:

- status: `pass`, `warn`, or `reject`
- requested model ID
- canonical model ID when known
- family
- warnings
- invariants
- cache usage fields
- `dryRun: true`
- `networkUsed: false`
- `envRead: false`
- `requiresCacheHitRatio: false`

The dry probe never prints raw prompts, API keys, Authorization headers, raw
reasoning content, or tool arguments.

## Invariants

The initial dry probe tracks these invariants:

- Thinking-enabled requests must omit `tool_choice` before dispatch.
- Tool-call roundtrips preserve `reasoning_content` for the next request.
- Non-tool `reasoning_content` is not written to memory or event payloads.
- JSON output uses the declared `response_format` JSON path.
- Cache usage fields are observable, but cache hit ratio is not a pass
  condition.

These invariants mirror existing v0.1 behavior without modifying the main
client or conversation engine.

## Non-Goals

This profile/probe layer does not:

- call the real DeepSeek API.
- read `DEEPSEEK_API_KEY`.
- use network `fetch`.
- change request sanitization.
- add memory.
- add MCP, plugins, or skills.
- implement bridge transport.
- implement desktop control.
- apply patches.

Future Model Plane work should build on these profiles instead of scattering
model-specific assumptions through runtime modules.
