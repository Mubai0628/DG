import { type DeepSeekModelId as DeepSeekCanonicalModelId } from "../deepseek/types.js";

export type DeepSeekModelFamily = "v4_flash" | "v4_pro" | "legacy_alias";

export type DeepSeekLegacyAlias = "deepseek-chat" | "deepseek-reasoner";

export type DeepSeekModelId = DeepSeekCanonicalModelId | DeepSeekLegacyAlias;

export type DeepSeekFeatureSupport =
  | "supported"
  | "unsupported"
  | "conditional"
  | "unknown";

export type DeepSeekCapabilityWarningKind =
  | "legacy_alias"
  | "unknown_model"
  | "thinking_tool_choice_boundary"
  | "json_requires_response_format"
  | "cache_hit_ratio_not_required";

export type DeepSeekCapabilityWarning = {
  kind: DeepSeekCapabilityWarningKind;
  safeMessage: string;
};

export type DeepSeekCapabilityInvariantKind =
  | "thinking_enabled_request_omits_tool_choice"
  | "tool_roundtrip_preserves_reasoning_content"
  | "non_tool_reasoning_content_not_written_to_memory"
  | "json_output_uses_response_format"
  | "cache_usage_observable_without_hit_ratio_requirement";

export type DeepSeekCapabilityInvariant = {
  kind: DeepSeekCapabilityInvariantKind;
  status: "pass" | "reject" | "not_applicable";
  safeMessage: string;
};

export type DeepSeekCapabilityProfile = {
  modelId: DeepSeekCanonicalModelId;
  family: Exclude<DeepSeekModelFamily, "legacy_alias">;
  thinking: DeepSeekFeatureSupport;
  toolCalls: DeepSeekFeatureSupport;
  jsonOutput: DeepSeekFeatureSupport;
  reasoningContent: DeepSeekFeatureSupport;
  contextCaching: DeepSeekFeatureSupport;
  cacheUsageFields: readonly [
    "prompt_cache_hit_tokens",
    "prompt_cache_miss_tokens"
  ];
  toolChoiceWithThinking: {
    support: DeepSeekFeatureSupport;
    handling: "strip_before_request" | "reject";
  };
  responseFormatJson: {
    support: DeepSeekFeatureSupport;
    requestPath: "response_format.json_object";
  };
  maxContextTokens?: number | "unknown";
  maxOutputTokens?: number | "unknown";
  defaultUseCases: readonly string[];
  warnings: readonly DeepSeekCapabilityWarning[];
  invariants: readonly DeepSeekCapabilityInvariant[];
};

export type DeepSeekCapabilityProbeInput = {
  modelId: string;
  thinkingEnabled?: boolean | undefined;
  includesToolChoice?: boolean | undefined;
  includesToolCallRoundtrip?: boolean | undefined;
  includesReasoningContent?: boolean | undefined;
  requestsJsonOutput?: boolean | undefined;
  observesCacheUsage?: boolean | undefined;
};

export type DeepSeekCapabilityProbeStatus = "pass" | "warn" | "reject";

export type DeepSeekCapabilityProbeResult = {
  status: DeepSeekCapabilityProbeStatus;
  requestedModelId: string;
  canonicalModelId?: DeepSeekCanonicalModelId | undefined;
  family?: DeepSeekModelFamily | undefined;
  dryRun: true;
  networkUsed: false;
  envRead: false;
  profile?: DeepSeekCapabilityProfile | undefined;
  warnings: DeepSeekCapabilityWarning[];
  invariants: DeepSeekCapabilityInvariant[];
  cacheUsageFields: readonly string[];
  requiresCacheHitRatio: false;
  safeSummary: {
    modelId?: DeepSeekCanonicalModelId | undefined;
    status: DeepSeekCapabilityProbeStatus;
    warningCount: number;
    invariantCount: number;
  };
};
