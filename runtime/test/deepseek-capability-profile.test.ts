import { describe, expect, it } from "vitest";

import {
  getDeepSeekCapabilityProfile,
  listDeepSeekCapabilityProfiles,
  normalizeLegacyDeepSeekModelId,
  runDeepSeekCapabilityDryProbe
} from "../src/index.js";

describe("DeepSeek Model Plane capability profiles", () => {
  it("defines canonical v4 flash and v4 pro profiles", () => {
    const flash = getDeepSeekCapabilityProfile("deepseek-v4-flash");
    const pro = getDeepSeekCapabilityProfile("deepseek-v4-pro");

    expect(
      listDeepSeekCapabilityProfiles().map((profile) => profile.modelId)
    ).toEqual(["deepseek-v4-flash", "deepseek-v4-pro"]);
    expect(flash).toMatchObject({
      modelId: "deepseek-v4-flash",
      family: "v4_flash"
    });
    expect(pro).toMatchObject({
      modelId: "deepseek-v4-pro",
      family: "v4_pro"
    });
  });

  it("profiles include thinking, tool, JSON, cache, and reasoning fields", () => {
    const profile = getDeepSeekCapabilityProfile("deepseek-v4-pro");

    expect(profile).toBeDefined();
    expect(profile).toMatchObject({
      thinking: "supported",
      toolCalls: "supported",
      jsonOutput: "supported",
      reasoningContent: "supported",
      contextCaching: "supported",
      toolChoiceWithThinking: {
        support: "conditional",
        handling: "strip_before_request"
      },
      responseFormatJson: {
        support: "supported",
        requestPath: "response_format.json_object"
      }
    });
    expect(profile?.cacheUsageFields).toEqual([
      "prompt_cache_hit_tokens",
      "prompt_cache_miss_tokens"
    ]);
  });

  it("normalizes legacy aliases with compatibility warnings only", () => {
    expect(normalizeLegacyDeepSeekModelId("deepseek-chat")).toMatchObject({
      ok: true,
      canonicalModelId: "deepseek-v4-flash",
      legacyAlias: "deepseek-chat",
      warning: { kind: "legacy_alias" }
    });
    expect(normalizeLegacyDeepSeekModelId("deepseek-reasoner")).toMatchObject({
      ok: true,
      canonicalModelId: "deepseek-v4-pro",
      legacyAlias: "deepseek-reasoner",
      warning: { kind: "legacy_alias" }
    });
    expect(
      listDeepSeekCapabilityProfiles().map((profile) => profile.modelId)
    ).not.toContain("deepseek-chat");
    expect(
      listDeepSeekCapabilityProfiles().map((profile) => profile.modelId)
    ).not.toContain("deepseek-reasoner");
  });

  it("rejects unknown models in the dry probe", () => {
    const result = runDeepSeekCapabilityDryProbe({ modelId: "other-model" });

    expect(result).toMatchObject({
      status: "reject",
      requestedModelId: "other-model",
      dryRun: true,
      networkUsed: false,
      envRead: false
    });
    expect(result.warnings).toContainEqual({
      kind: "unknown_model",
      safeMessage: "DeepSeek capability profile is unknown"
    });
  });

  it("does not read env or call network in dry probes", () => {
    const previousSecret = process.env.DEEPSEEK_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.DEEPSEEK_API_KEY = "dry-probe-should-not-read";
    globalThis.fetch = (() => {
      throw new Error("network should not be called");
    }) as typeof fetch;

    try {
      const result = runDeepSeekCapabilityDryProbe({
        modelId: "deepseek-v4-pro"
      });

      expect(result.envRead).toBe(false);
      expect(result.networkUsed).toBe(false);
      expect(JSON.stringify(result)).not.toContain("dry-probe-should-not-read");
    } finally {
      if (previousSecret === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previousSecret;
      }
      globalThis.fetch = previousFetch;
    }
  });

  it("flags the thinking plus tool_choice compatibility boundary", () => {
    const result = runDeepSeekCapabilityDryProbe({
      modelId: "deepseek-v4-pro",
      thinkingEnabled: true,
      includesToolChoice: true
    });

    expect(result.status).toBe("warn");
    expect(result.profile?.toolChoiceWithThinking).toEqual({
      support: "conditional",
      handling: "strip_before_request"
    });
    expect(result.warnings.map((warning) => warning.kind)).toContain(
      "thinking_tool_choice_boundary"
    );
    expect(result.invariants).toContainEqual({
      kind: "thinking_enabled_request_omits_tool_choice",
      status: "pass",
      safeMessage:
        "Dry probe confirms the local invariant: thinking-enabled requests strip tool_choice before dispatch."
    });
  });

  it("includes reasoning_content preservation and memory exclusion invariants", () => {
    const result = runDeepSeekCapabilityDryProbe({
      modelId: "deepseek-v4-pro",
      includesToolCallRoundtrip: true,
      includesReasoningContent: true
    });
    const invariantKinds = result.invariants.map((invariant) => invariant.kind);

    expect(invariantKinds).toContain(
      "tool_roundtrip_preserves_reasoning_content"
    );
    expect(invariantKinds).toContain(
      "non_tool_reasoning_content_not_written_to_memory"
    );
  });

  it("supports JSON output only through declared response_format path", () => {
    const result = runDeepSeekCapabilityDryProbe({
      modelId: "deepseek-v4-flash",
      requestsJsonOutput: true
    });

    expect(result.profile?.responseFormatJson).toEqual({
      support: "supported",
      requestPath: "response_format.json_object"
    });
    expect(result.invariants.map((invariant) => invariant.kind)).toContain(
      "json_output_uses_response_format"
    );
  });

  it("includes cache usage fields without requiring a hit ratio", () => {
    const result = runDeepSeekCapabilityDryProbe({
      modelId: "deepseek-v4-flash",
      observesCacheUsage: true
    });

    expect(result.cacheUsageFields).toEqual([
      "prompt_cache_hit_tokens",
      "prompt_cache_miss_tokens"
    ]);
    expect(result.requiresCacheHitRatio).toBe(false);
    expect(result.warnings.map((warning) => warning.kind)).toContain(
      "cache_hit_ratio_not_required"
    );
  });

  it("keeps profile summaries free of API keys and raw prompts", () => {
    const result = runDeepSeekCapabilityDryProbe({
      modelId: "deepseek-chat",
      thinkingEnabled: true,
      includesToolChoice: true
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("DEEPSEEK_API_KEY");
    expect(serialized).not.toContain("sk-1234567890abcdef");
    expect(serialized).not.toContain("rawPrompt");
    expect(result.safeSummary).toMatchObject({
      modelId: "deepseek-v4-flash",
      status: "warn"
    });
  });
});
