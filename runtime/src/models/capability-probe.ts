import { getDeepSeekCapabilityProfile } from "./deepseek-capability-profile.js";
import { normalizeLegacyDeepSeekModelId } from "./legacy-alias.js";
import {
  type DeepSeekCapabilityInvariant,
  type DeepSeekCapabilityProbeInput,
  type DeepSeekCapabilityProbeResult,
  type DeepSeekCapabilityProbeStatus,
  type DeepSeekCapabilityWarning
} from "./types.js";

export function runDeepSeekCapabilityDryProbe(
  input: DeepSeekCapabilityProbeInput
): DeepSeekCapabilityProbeResult {
  const normalized = normalizeLegacyDeepSeekModelId(input.modelId);
  if (!normalized.ok) {
    const status: DeepSeekCapabilityProbeStatus = "reject";
    return {
      status,
      requestedModelId: input.modelId,
      family: "legacy_alias",
      dryRun: true,
      networkUsed: false,
      envRead: false,
      warnings: [normalized.warning],
      invariants: [
        {
          kind: "thinking_enabled_request_omits_tool_choice",
          status: "reject",
          safeMessage:
            "Unknown models cannot be probed for thinking/tool_choice compatibility."
        }
      ],
      cacheUsageFields: [],
      requiresCacheHitRatio: false,
      safeSummary: {
        status,
        warningCount: 1,
        invariantCount: 1
      }
    };
  }

  const profile = getDeepSeekCapabilityProfile(normalized.canonicalModelId);
  if (profile === undefined) {
    const status: DeepSeekCapabilityProbeStatus = "reject";
    const warning: DeepSeekCapabilityWarning = {
      kind: "unknown_model",
      safeMessage: "DeepSeek capability profile is unknown"
    };
    return {
      status,
      requestedModelId: input.modelId,
      dryRun: true,
      networkUsed: false,
      envRead: false,
      warnings: [warning],
      invariants: [],
      cacheUsageFields: [],
      requiresCacheHitRatio: false,
      safeSummary: {
        status,
        warningCount: 1,
        invariantCount: 0
      }
    };
  }

  const warnings = [
    ...(normalized.warning !== undefined ? [normalized.warning] : []),
    ...profile.warnings
  ];
  const invariants = buildProbeInvariants(input, profile.invariants);
  const status: DeepSeekCapabilityProbeStatus =
    warnings.length > 0 ? "warn" : "pass";

  return {
    status,
    requestedModelId: input.modelId,
    canonicalModelId: profile.modelId,
    family:
      normalized.legacyAlias === undefined ? profile.family : "legacy_alias",
    dryRun: true,
    networkUsed: false,
    envRead: false,
    profile,
    warnings,
    invariants,
    cacheUsageFields: profile.cacheUsageFields,
    requiresCacheHitRatio: false,
    safeSummary: {
      modelId: profile.modelId,
      status,
      warningCount: warnings.length,
      invariantCount: invariants.length
    }
  };
}

function buildProbeInvariants(
  input: DeepSeekCapabilityProbeInput,
  profileInvariants: readonly DeepSeekCapabilityInvariant[]
): DeepSeekCapabilityInvariant[] {
  const invariants = [...profileInvariants];

  if (input.thinkingEnabled === true && input.includesToolChoice === true) {
    invariants.push({
      kind: "thinking_enabled_request_omits_tool_choice",
      status: "pass",
      safeMessage:
        "Dry probe confirms the local invariant: thinking-enabled requests strip tool_choice before dispatch."
    });
  }

  if (input.includesToolCallRoundtrip === true) {
    invariants.push({
      kind: "tool_roundtrip_preserves_reasoning_content",
      status: "pass",
      safeMessage:
        "Dry probe expects tool-call reasoning_content to be preserved for the next request roundtrip."
    });
  }

  if (input.includesReasoningContent === true) {
    invariants.push({
      kind: "non_tool_reasoning_content_not_written_to_memory",
      status: "pass",
      safeMessage:
        "Dry probe expects non-tool reasoning_content to stay out of memory and event payloads."
    });
  }

  if (input.requestsJsonOutput === true) {
    invariants.push({
      kind: "json_output_uses_response_format",
      status: "pass",
      safeMessage:
        "Dry probe requires JSON output through response_format json_object."
    });
  }

  if (input.observesCacheUsage === true) {
    invariants.push({
      kind: "cache_usage_observable_without_hit_ratio_requirement",
      status: "pass",
      safeMessage:
        "Dry probe records cache usage field availability without requiring a cache hit ratio."
    });
  }

  return dedupeInvariants(invariants);
}

function dedupeInvariants(
  invariants: readonly DeepSeekCapabilityInvariant[]
): DeepSeekCapabilityInvariant[] {
  const byKind = new Map<string, DeepSeekCapabilityInvariant>();
  for (const invariant of invariants) {
    byKind.set(invariant.kind, invariant);
  }
  return [...byKind.values()];
}
