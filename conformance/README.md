# Conformance

DeepSeek Workbench includes a conformance harness for adapter and conversation invariants.

## Dry runs

Dry conformance uses `FakeDeepSeekClient`, does not read API keys, and does not access the network:

```bash
pnpm test:conformance:dry
```

## Live runs

Live conformance is explicit opt-in and is skipped unless all gates are present:

```bash
DEEPSEEK_CONFORMANCE_LIVE=1 DEEPSEEK_API_KEY=... pnpm test:conformance:live -- --live
```

Live summaries are redacted and may be written under `conformance/results/`, which is ignored by Git. The harness records only case status, model, finish reason, usage/cache summary, latency, and normalized error kind. It does not write raw prompts, raw messages, raw reasoning content, API keys, authorization headers, DOM, screenshots, or clipboard data.
