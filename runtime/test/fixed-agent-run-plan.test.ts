import { describe, expect, it } from "vitest";

import {
  buildFixedAgentRunPlan,
  summarizeFixedAgentRunPlan,
  validateFixedAgentRunPlan
} from "../src/index.js";

function baseInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    intent: "code_change",
    objectiveSummary: "Update a summary-only docs page through fixed roles.",
    evidenceRefs: [
      {
        refId: "evidence-task",
        kind: "manual_note",
        summary: "User requested a docs-only update.",
        hashPrefix: "abc12345"
      },
      {
        refId: "evidence-test",
        kind: "test_result",
        summary: "Focused docs-lock tests are available.",
        hashPrefix: "def67890"
      }
    ],
    capabilityPlanRefs: ["capability-plan-docs-preview"],
    contextRefs: ["context-assembly-summary"],
    memoryRefs: ["memory-ref-summary"],
    createdAt: "2026-07-02T00:00:00.000Z",
    ...overrides
  };
}

function expectExecutionReadinessFalse(result: {
  readiness: Record<string, boolean>;
}): void {
  expect(result.readiness.canExecuteAgents).toBe(false);
  expect(result.readiness.canInvokeCapability).toBe(false);
  expect(result.readiness.canWriteFiles).toBe(false);
  expect(result.readiness.canApplyPatch).toBe(false);
  expect(result.readiness.canRollback).toBe(false);
  expect(result.readiness.canWriteEventStore).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.canInvokeMcpTool).toBe(false);
  expect(result.readiness.canRunPlugin).toBe(false);
  expect(result.readiness.canRunSkill).toBe(false);
  expect(result.readiness.canIssuePermissionLease).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("fixed agent run plan schema", () => {
  it("builds the fixed code_change route", () => {
    const result = buildFixedAgentRunPlan(baseInput());

    expect(result.status).toBe("planned");
    expect(result.plan?.route.roles).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
    expect(result.plan?.handoffDossiers).toHaveLength(3);
    expect(result.summary.dossierCount).toBe(3);
    expect(result.readiness.canEnterAgentRunPlanPreview).toBe(true);
    expectExecutionReadinessFalse(result);
  });

  it("builds the fixed documentation route", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "documentation",
        objectiveSummary: "Update summary-only docs."
      })
    );

    expect(result.status).toBe("planned");
    expect(result.plan?.route.roles).toEqual([
      "orchestrator",
      "coder",
      "reviewer"
    ]);
    expect(result.plan?.handoffDossiers).toHaveLength(2);
  });

  it("builds the fixed code_review route", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "code_review",
        objectiveSummary: "Review a summary-only proposal."
      })
    );

    expect(result.status).toBe("planned");
    expect(result.plan?.route.roles).toEqual([
      "orchestrator",
      "reviewer",
      "verifier"
    ]);
  });

  it("builds the fixed verification route", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "verification",
        objectiveSummary: "Verify focused checks from summary refs."
      })
    );

    expect(result.status).toBe("planned");
    expect(result.plan?.route.roles).toEqual(["orchestrator", "verifier"]);
    expect(result.plan?.handoffDossiers).toHaveLength(1);
  });

  it("returns clarification for the explicit unknown intent", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "unknown",
        objectiveSummary: "Need intent clarification."
      })
    );

    expect(result.status).toBe("needs_clarification");
    expect(result.plan).toBeUndefined();
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.summary.warningCodes).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
    expectExecutionReadinessFalse(result);
  });

  it("blocks unsupported intents", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "web_data_extraction"
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("UNKNOWN_INTENT");
  });

  it("blocks dynamic bidding and arbitrary agent ids", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        dynamicBidding: true,
        agentId: "agent-freeform-1"
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("DYNAMIC_BIDDING_BLOCKED");
    expect(result.summary.blockerCodes).toContain("ARBITRARY_AGENT_BLOCKED");
  });

  it("blocks fixed route mismatches", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        intent: "documentation",
        route: ["orchestrator", "reviewer", "verifier"]
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("FIXED_ROUTE_MISMATCH");
  });

  it("blocks raw prompt, source, diff, and API key fields", () => {
    const result = buildFixedAgentRunPlan({
      ...baseInput(),
      rawPrompt: "do not echo this",
      rawSource: "const raw = true",
      rawDiff: "--- diff",
      apiKey: "sk-fake-not-real-000000"
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("RAW_FIELD_BLOCKED");
    expect(result.summary.blockerCodes).toContain("SECRET_FIELD_BLOCKED");
    expect(serialized).not.toContain("do not echo this");
    expect(serialized).not.toContain("const raw = true");
    expect(serialized).not.toContain("--- diff");
    expect(serialized).not.toContain("sk-fake");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("apiKey");
  });

  it("blocks direct tool, command, apply, and rollback fields", () => {
    const result = buildFixedAgentRunPlan({
      ...baseInput(),
      toolCall: "mcp.write",
      shellCommand: "pnpm test",
      applyNow: true,
      rollbackNow: true,
      capabilityInvocation: "native.git.status"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("EXECUTION_FIELD_BLOCKED");
    expect(result.summary.blockerCodes).toContain(
      "DIRECT_CAPABILITY_INVOCATION_BLOCKED"
    );
  });

  it("blocks hidden context and raw memory content", () => {
    const result = buildFixedAgentRunPlan({
      ...baseInput(),
      hiddenContext: "private context",
      memoryRawContent: "memory body"
    });

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "HIDDEN_CONTEXT_OR_MEMORY_BLOCKED"
    );
  });

  it("blocks dossier role order mismatch", () => {
    const result = buildFixedAgentRunPlan(
      baseInput({
        handoffDossiers: [
          {
            fromRole: "orchestrator",
            toRole: "verifier",
            summary: "Skip fixed route order."
          }
        ]
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain("DOSSIER_ROUTE_MISMATCH");
  });

  it("keeps generated dossiers summary-only", () => {
    const result = buildFixedAgentRunPlan(baseInput());
    const serialized = JSON.stringify(result);
    const summary = summarizeFixedAgentRunPlan(result.plan!);

    expect(result.plan?.handoffDossiers.every((item) => item.summaryOnly)).toBe(
      true
    );
    expect(summary.summaryOnly).toBe(true);
    expect(serialized).toContain("summary-only handoff");
    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw source");
    expect(serialized).not.toContain("raw diff");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("sk-fake");
  });

  it("parses JSON string input", () => {
    const result = validateFixedAgentRunPlan(JSON.stringify(baseInput()));

    expect(result.status).toBe("planned");
    expect(result.plan?.intent).toBe("code_change");
  });

  it("blocks execution readiness attempts", () => {
    const result = validateFixedAgentRunPlan(
      baseInput({
        readiness: {
          canApplyPatch: true,
          appCanExecute: true
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(result.summary.blockerCodes).toContain(
      "EXECUTION_READINESS_ATTEMPT"
    );
    expectExecutionReadinessFalse(result);
  });

  it("uses deterministic plan id and hash with injected id and clock", () => {
    const input = baseInput();
    const first = buildFixedAgentRunPlan(input, {
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "fixed-agent-plan-test"
    });
    const second = buildFixedAgentRunPlan(input, {
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "fixed-agent-plan-test"
    });

    expect(first.plan?.planId).toBe("fixed-agent-plan-test");
    expect(first.plan?.planHash).toBe(second.plan?.planHash);
    expect(first.normalizedHash).toBe(second.normalizedHash);
  });
});
