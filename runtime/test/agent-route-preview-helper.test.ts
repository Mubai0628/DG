import { describe, expect, it } from "vitest";

import {
  buildStaticAgentRoutePreview,
  summarizeStaticAgentRoutePreview,
  validateAgentRoutePreviewInput,
  type AgentRoutePreviewInput,
  type AgentTaskIntent
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function rolesFor(intent: AgentTaskIntent) {
  return buildStaticAgentRoutePreview({
    intent,
    objectiveSummary: `Preview ${intent} route`,
    acceptanceCriteriaCount: 1,
    createdAt
  }).steps.map((step) => step.role);
}

describe("static agent route preview helper", () => {
  it("routes web data extraction through orchestrator and verifier", () => {
    expect(rolesFor("web_data_extraction")).toEqual([
      "orchestrator",
      "verifier"
    ]);
  });

  it("routes code changes through orchestrator, coder, reviewer, and verifier", () => {
    expect(rolesFor("code_change")).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
  });

  it("routes code review through orchestrator, reviewer, and verifier", () => {
    expect(rolesFor("code_review")).toEqual([
      "orchestrator",
      "reviewer",
      "verifier"
    ]);
  });

  it("routes verification through orchestrator and verifier", () => {
    expect(rolesFor("verification")).toEqual(["orchestrator", "verifier"]);
  });

  it("routes documentation through orchestrator, coder, and reviewer", () => {
    expect(rolesFor("documentation")).toEqual([
      "orchestrator",
      "coder",
      "reviewer"
    ]);
  });

  it("returns needs clarification for unknown intent", () => {
    const preview = buildStaticAgentRoutePreview({
      intent: "unknown",
      objectiveSummary: "Clarify this task before route promotion",
      acceptanceCriteriaCount: 1,
      createdAt
    });

    expect(preview.status).toBe("needs_clarification");
    expect(preview.steps.map((step) => step.role)).toEqual(["orchestrator"]);
    expect(preview.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("uses fixed display-only model profile ids", () => {
    const preview = buildStaticAgentRoutePreview({
      intent: "code_change",
      objectiveSummary: "Preview a safe code change route",
      acceptanceCriteriaCount: 1,
      createdAt
    });

    expect(preview.modelProfileIds).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro"
    ]);
    expect(
      preview.steps.find((step) => step.role === "verifier")?.modelProfileId
    ).toBe("deepseek-v4-flash");
    expect(
      preview.steps.find((step) => step.role === "coder")?.modelProfileId
    ).toBe("deepseek-v4-pro");
  });

  it("keeps capability refs display-only", () => {
    const preview = buildStaticAgentRoutePreview({
      intent: "verification",
      objectiveSummary: "Preview verification route",
      acceptanceCriteriaCount: 1,
      createdAt
    });
    const refs = preview.steps.flatMap((step) => step.allowedCapabilityRefs);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((ref) => ref.mode === "display_only")).toBe(true);
    expect(refs.map((ref) => ref.capabilityId)).toEqual(
      expect.arrayContaining(["native.git.status", "native.shell.pnpm_test"])
    );
    expect(preview.executionEnabled).toBe(false);
  });

  it("blocks raw fields and unsafe markers without retaining raw objective or API key", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      intent: "verification",
      objectiveSummary: `Inspect rawDom and rawCsv with ${secret}`,
      rawPrompt: "never keep this",
      acceptanceCriteriaCount: 1,
      createdAt
    } as AgentRoutePreviewInput & Record<string, unknown>;

    const validation = validateAgentRoutePreviewInput(unsafeInput);
    const preview = buildStaticAgentRoutePreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_RAW_FIELD",
        "API_KEY_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(preview.status).toBe("blocked");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawCsv");
    expect(serialized).not.toContain("never keep this");
  });

  it("produces deterministic route ids and summary hashes with injected inputs", () => {
    const first = buildStaticAgentRoutePreview({
      intent: "documentation",
      objectiveSummary: "Preview docs route",
      acceptanceCriteriaCount: 2,
      contextSummaryRef: "context-1",
      createdAt,
      idGenerator: () => "route-fixed"
    });
    const second = buildStaticAgentRoutePreview({
      intent: "documentation",
      objectiveSummary: "Preview docs route",
      acceptanceCriteriaCount: 2,
      contextSummaryRef: "context-1",
      createdAt,
      idGenerator: () => "route-fixed"
    });

    expect(first.routeId).toBe("route-fixed");
    expect(first).toEqual(second);
    expect(summarizeStaticAgentRoutePreview(first)).toEqual(
      summarizeStaticAgentRoutePreview(second)
    );
  });
});
