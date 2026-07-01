import { describe, expect, it } from "vitest";

import {
  buildMcpToolBrokerPlanning,
  buildMcpToolInputRiskReport,
  buildMcpToolInvocationProposal,
  buildMcpToolSimulatedResult,
  summarizeMcpToolBrokerPlanning,
  summarizeMcpToolInputRiskReport,
  summarizeMcpToolInvocationProposal,
  summarizeMcpToolSimulatedResult,
  validateMcpToolBrokerPlanning,
  type McpToolBrokerPlanning
} from "../src/index.js";

function proposalSummary(overrides: Record<string, unknown> = {}) {
  const proposal = buildMcpToolInvocationProposal({
    serverRef: "mcp-server.docs",
    connectionProfileRef: "mcp-profile.docs-readonly",
    toolName: "docs.search",
    toolDisplayName: "Docs Search",
    toolDescriptionSummary: "Searches summary-only documentation metadata.",
    toolInputSchemaSummary:
      "Requires query summary and optional section filter. No raw resource content.",
    argumentsSummary: "queryHash=abc123; scope=docs-index; limit=5",
    declaredReadOnly: true,
    declaredMutating: false,
    riskLevel: "low",
    evidenceRefs: [{ refId: "mcp-tool-metadata.docs-search" }],
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-proposal-test"
  });
  return { ...summarizeMcpToolInvocationProposal(proposal), ...overrides };
}

function riskSummary(overrides: Record<string, unknown> = {}) {
  const report = buildMcpToolInputRiskReport({
    schemaSummary:
      "Read-only metadata search schema. Accepts query summary hash and limit.",
    schemaType: "metadata_summary",
    riskCategories: ["read_only_metadata"],
    riskLevel: "low",
    approvalRequired: false,
    manualOnly: true,
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-input-risk-test"
  });
  return { ...summarizeMcpToolInputRiskReport(report), ...overrides };
}

function simulatedResultSummary(overrides: Record<string, unknown> = {}) {
  const result = buildMcpToolSimulatedResult({
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultFixture: {
      resultSummary:
        "Simulated docs search returned three metadata refs and no resource content.",
      warningCodes: ["SIMULATED_ONLY"]
    },
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-simulated-result-test"
  });
  return { ...summarizeMcpToolSimulatedResult(result), ...overrides };
}

function safePlanningInput(): Record<string, unknown> {
  return {
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultSummary: simulatedResultSummary(),
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-broker-planning-test"
  };
}

function findingCodes(plan: McpToolBrokerPlanning): string[] {
  return plan.findings.map((finding) => finding.code);
}

function expectNoExecution(plan: McpToolBrokerPlanning): void {
  expect(plan.readiness).toMatchObject({
    canInvokeMcpTool: false,
    canCallTool: false,
    canIssuePermissionLease: false,
    canWriteEventStore: false,
    canAutoInvoke: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
  expect(plan.approvalDraftRequirement.canApprove).toBe(false);
  expect(plan.leasePreview.canIssueLease).toBe(false);
  expect(plan.eventPreview.canWriteEventStore).toBe(false);
}

describe("mcp tool broker planning", () => {
  it("integrates proposal summaries as mcp descriptor previews", () => {
    const plan = validateMcpToolBrokerPlanning(safePlanningInput());

    expect(plan.status).toBe("planning_ready");
    expect(plan.planningId).toBe("mcp-tool-broker-planning-test");
    expect(plan.descriptorPreview).toMatchObject({
      sourceType: "mcp",
      category: "mcp_tool",
      executionMode: "SIMULATE",
      invokePolicy: "MANUAL_ONLY"
    });
    expect(plan.summary.descriptorId).toBe(plan.descriptorPreview?.descriptorId);
    expectNoExecution(plan);
  });

  it("keeps read-only tools manual-only with approval preview", () => {
    const plan = validateMcpToolBrokerPlanning(safePlanningInput());

    expect(plan.descriptorPreview?.manualOnly).toBe(true);
    expect(plan.approvalDraftRequirement.required).toBe(true);
    expect(plan.approvalDraftRequirement.status).toBe("preview_only");
    expect(plan.summary.leasePreviewOnly).toBe(true);
    expectNoExecution(plan);
  });

  it("disables mutating tool summaries", () => {
    const input = safePlanningInput();
    input.proposalSummary = proposalSummary({
      declaredReadOnly: false,
      declaredMutating: true
    });
    const plan = validateMcpToolBrokerPlanning(input);

    expect(plan.status).toBe("blocked");
    expect(plan.descriptorPreview?.invokePolicy).toBe("DISABLED");
    expect(findingCodes(plan)).toContain("MUTATING_TOOL_DISABLED");
    expectNoExecution(plan);
  });

  it("keeps unknown risk disabled and warning-only", () => {
    const input = safePlanningInput();
    input.riskReportSummary = riskSummary({
      riskLevel: "high",
      riskCategories: ["unknown"]
    });
    const plan = validateMcpToolBrokerPlanning(input);

    expect(plan.status).toBe("warning");
    expect(plan.descriptorPreview?.invokePolicy).toBe("DISABLED");
    expect(findingCodes(plan)).toContain("HIGH_OR_UNKNOWN_RISK_DISABLED");
    expectNoExecution(plan);
  });

  it("blocks AUTO policy and lease issuing claims", () => {
    const input = safePlanningInput();
    input.invokePolicy = "AUTO";
    input.issuePermissionLease = true;
    const plan = validateMcpToolBrokerPlanning(input);

    expect(plan.status).toBe("blocked");
    expect(findingCodes(plan)).toContain("AUTO_POLICY_REJECTED");
    expect(findingCodes(plan)).toContain("LEASE_ISSUING_REJECTED");
    expect(plan.descriptorPreview?.invokePolicy).not.toBe("AUTO");
    expectNoExecution(plan);
  });

  it("keeps event previews summary-only without writing events", () => {
    const input = safePlanningInput();
    const plan = buildMcpToolBrokerPlanning(input);
    const summary = summarizeMcpToolBrokerPlanning(plan);
    const serialized = JSON.stringify(plan);

    expect(plan.status).toBe("planning_ready");
    expect(summary.planningHash).toBeDefined();
    expect(plan.eventPreview.summaryOnly).toBe(true);
    expect(serialized).not.toContain("queryHash=abc123");
    expect(serialized).not.toContain("Simulated docs search returned");
    expect(serialized).not.toContain("sk-");
    expectNoExecution(plan);
  });

  it("uses deterministic id and hash with injected id", () => {
    const first = validateMcpToolBrokerPlanning(safePlanningInput());
    const second = validateMcpToolBrokerPlanning(safePlanningInput());

    expect(first.planningId).toBe("mcp-tool-broker-planning-test");
    expect(second.planningId).toBe(first.planningId);
    expect(second.planningHash).toBe(first.planningHash);
    expectNoExecution(first);
  });
});
