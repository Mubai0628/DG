import {
  type DeepSeekCapabilityInvariant,
  type DeepSeekCapabilityProfile,
  type DeepSeekCapabilityWarning
} from "./types.js";

const sharedCacheUsageFields = [
  "prompt_cache_hit_tokens",
  "prompt_cache_miss_tokens"
] as const;

const sharedInvariants: readonly DeepSeekCapabilityInvariant[] = [
  {
    kind: "thinking_enabled_request_omits_tool_choice",
    status: "pass",
    safeMessage:
      "When thinking is enabled, tool_choice must be stripped before request dispatch."
  },
  {
    kind: "tool_roundtrip_preserves_reasoning_content",
    status: "pass",
    safeMessage:
      "Tool-call assistant turns preserve reasoning_content for the next request roundtrip."
  },
  {
    kind: "non_tool_reasoning_content_not_written_to_memory",
    status: "pass",
    safeMessage:
      "Non-tool reasoning_content is kept out of memory and event payloads."
  },
  {
    kind: "json_output_uses_response_format",
    status: "pass",
    safeMessage:
      "JSON output is declared through response_format json_object only."
  },
  {
    kind: "cache_usage_observable_without_hit_ratio_requirement",
    status: "pass",
    safeMessage:
      "Cache usage fields are observable, but cache hit ratio is not a pass condition."
  }
];

const v4Warnings: readonly DeepSeekCapabilityWarning[] = [
  {
    kind: "thinking_tool_choice_boundary",
    safeMessage:
      "Thinking mode and tool_choice are a compatibility boundary; local request sanitization strips tool_choice."
  },
  {
    kind: "cache_hit_ratio_not_required",
    safeMessage:
      "Cache fields are telemetry only; dry probes do not require a cache hit ratio."
  }
];

export const deepSeekCapabilityProfiles = {
  "deepseek-v4-flash": {
    modelId: "deepseek-v4-flash",
    family: "v4_flash",
    thinking: "supported",
    toolCalls: "supported",
    jsonOutput: "supported",
    reasoningContent: "supported",
    contextCaching: "supported",
    cacheUsageFields: sharedCacheUsageFields,
    toolChoiceWithThinking: {
      support: "conditional",
      handling: "strip_before_request"
    },
    responseFormatJson: {
      support: "supported",
      requestPath: "response_format.json_object"
    },
    maxContextTokens: "unknown",
    maxOutputTokens: "unknown",
    defaultUseCases: [
      "fast local planning",
      "structured extraction",
      "tool proposal drafting"
    ],
    warnings: v4Warnings,
    invariants: sharedInvariants
  },
  "deepseek-v4-pro": {
    modelId: "deepseek-v4-pro",
    family: "v4_pro",
    thinking: "supported",
    toolCalls: "supported",
    jsonOutput: "supported",
    reasoningContent: "supported",
    contextCaching: "supported",
    cacheUsageFields: sharedCacheUsageFields,
    toolChoiceWithThinking: {
      support: "conditional",
      handling: "strip_before_request"
    },
    responseFormatJson: {
      support: "supported",
      requestPath: "response_format.json_object"
    },
    maxContextTokens: "unknown",
    maxOutputTokens: "unknown",
    defaultUseCases: [
      "coding workbench reasoning",
      "multi-step local task planning",
      "tool roundtrip verification"
    ],
    warnings: v4Warnings,
    invariants: sharedInvariants
  }
} as const satisfies Record<string, DeepSeekCapabilityProfile>;

export type DeepSeekCapabilityProfileId =
  keyof typeof deepSeekCapabilityProfiles;

export function getDeepSeekCapabilityProfile(
  modelId: string
): DeepSeekCapabilityProfile | undefined {
  return deepSeekCapabilityProfiles[modelId as DeepSeekCapabilityProfileId];
}

export function listDeepSeekCapabilityProfiles(): DeepSeekCapabilityProfile[] {
  return Object.values(deepSeekCapabilityProfiles);
}
