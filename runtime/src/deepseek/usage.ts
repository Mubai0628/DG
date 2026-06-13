import { type UsageSummary } from "../events/index.js";

import { type DeepSeekUsage } from "./types.js";

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function mapDeepSeekUsageToUsageSummary(
  usage: DeepSeekUsage | undefined,
  options: { latencyMs?: number; model?: string; retryCount?: number } = {}
): UsageSummary {
  const reasoningTokens =
    usage?.reasoning_tokens ??
    usage?.completion_tokens_details?.reasoning_tokens ??
    0;

  const summary: UsageSummary = {
    inputTokens: numberOrZero(usage?.prompt_tokens),
    outputTokens: numberOrZero(usage?.completion_tokens),
    reasoningTokens: numberOrZero(reasoningTokens),
    cacheHitTokens: numberOrZero(usage?.prompt_cache_hit_tokens),
    cacheMissTokens: numberOrZero(usage?.prompt_cache_miss_tokens),
    retryCount: numberOrZero(options.retryCount),
    latencyMs: numberOrZero(options.latencyMs)
  };

  if (options.model !== undefined) {
    summary.model = options.model;
  }

  return summary;
}
