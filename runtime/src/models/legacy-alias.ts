import {
  type DeepSeekCapabilityWarning,
  type DeepSeekLegacyAlias
} from "./types.js";
import { type DeepSeekCapabilityProfileId } from "./deepseek-capability-profile.js";

const legacyAliasTargets: Record<
  DeepSeekLegacyAlias,
  DeepSeekCapabilityProfileId
> = {
  "deepseek-chat": "deepseek-v4-flash",
  "deepseek-reasoner": "deepseek-v4-pro"
};

export type DeepSeekLegacyAliasResult =
  | {
      ok: true;
      inputModelId: string;
      canonicalModelId: DeepSeekCapabilityProfileId;
      legacyAlias?: DeepSeekLegacyAlias | undefined;
      warning?: DeepSeekCapabilityWarning | undefined;
    }
  | {
      ok: false;
      inputModelId: string;
      warning: DeepSeekCapabilityWarning;
    };

export function normalizeLegacyDeepSeekModelId(
  modelId: string
): DeepSeekLegacyAliasResult {
  if (modelId === "deepseek-v4-flash" || modelId === "deepseek-v4-pro") {
    return {
      ok: true,
      inputModelId: modelId,
      canonicalModelId: modelId
    };
  }

  if (modelId === "deepseek-chat" || modelId === "deepseek-reasoner") {
    return {
      ok: true,
      inputModelId: modelId,
      canonicalModelId: legacyAliasTargets[modelId],
      legacyAlias: modelId,
      warning: {
        kind: "legacy_alias",
        safeMessage:
          "Legacy DeepSeek model aliases are compatibility aliases only; use the canonical v4 profile name on the main path."
      }
    };
  }

  return {
    ok: false,
    inputModelId: modelId,
    warning: {
      kind: "unknown_model",
      safeMessage: "DeepSeek capability profile is unknown"
    }
  };
}
