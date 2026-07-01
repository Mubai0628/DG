import { describe, expect, it } from "vitest";

import {
  buildMcpToolInputRiskReport,
  buildMcpToolInvocationProposal,
  buildMcpToolSimulatedResult,
  summarizeMcpToolInputRiskReport,
  summarizeMcpToolInvocationProposal,
  summarizeMcpToolSimulatedResult,
  validateMcpToolSimulatedResult,
  type McpToolSimulatedResult
} from "../src/index.js";

function proposalSummary(): ReturnType<
  typeof summarizeMcpToolInvocationProposal
> {
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
  return summarizeMcpToolInvocationProposal(proposal);
}

function riskSummary(): ReturnType<typeof summarizeMcpToolInputRiskReport> {
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
  return summarizeMcpToolInputRiskReport(report);
}

function safeSimulationInput(): Record<string, unknown> {
  return {
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultFixture: {
      resultSummary:
        "Simulated docs search returned three metadata refs and no resource content.",
      warningCodes: ["SIMULATED_ONLY"]
    },
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-simulated-result-test"
  };
}

function findingCodes(result: McpToolSimulatedResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoInvocation(result: McpToolSimulatedResult): void {
  expect(result.readiness).toMatchObject({
    canInvokeMcpTool: false,
    canCallTool: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("mcp tool simulated result", () => {
  it("accepts a safe simulated result", () => {
    const result = validateMcpToolSimulatedResult(safeSimulationInput());

    expect(result.status).toBe("simulated");
    expect(result.simulationId).toBe("mcp-tool-simulated-result-test");
    expect(result.summary.simulatedOnly).toBe(true);
    expect(result.summary.calledTool).toBe(false);
    expect(result.summary.mutatedWorkspace).toBe(false);
    expect(result.summary.wroteEventStore).toBe(false);
    expect(result.readiness.canEnterApprovalDraft).toBe(true);
    expect(result.readiness.canEnterAuditPreview).toBe(true);
    expectNoInvocation(result);
  });

  it("blocks raw output fields", () => {
    const input = safeSimulationInput();
    input.simulatedResultFixture = {
      resultSummary: "metadata refs only",
      rawOutput: "raw tool output"
    };
    const result = validateMcpToolSimulatedResult(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_OUTPUT_FIELD_REJECTED");
    expectNoInvocation(result);
  });

  it("blocks secret markers without echoing fake values", () => {
    const input = safeSimulationInput();
    input.simulatedResultFixture = {
      resultSummary: "metadata summary includes sk-fake1234567890"
    };
    const result = validateMcpToolSimulatedResult(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoInvocation(result);
  });

  it("blocks claims of real execution", () => {
    const input = safeSimulationInput();
    input.simulatedResultFixture = {
      resultSummary: "metadata refs only",
      calledTool: true
    };
    const result = validateMcpToolSimulatedResult(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain(
      "REAL_TOOL_EXECUTION_CLAIM_REJECTED"
    );
    expectNoInvocation(result);
  });

  it("blocks mutation and event write claims", () => {
    const input = safeSimulationInput();
    input.simulatedResultFixture = {
      resultSummary: "metadata refs only",
      mutatedWorkspace: true,
      wroteEventStore: true
    };
    const result = validateMcpToolSimulatedResult(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MUTATION_CLAIM_REJECTED");
    expect(findingCodes(result)).toContain("EVENTSTORE_WRITE_CLAIM_REJECTED");
    expectNoInvocation(result);
  });

  it("keeps output summary-only", () => {
    const input = safeSimulationInput();
    input.simulatedResultFixture = {
      resultSummary: "metadata refs with summary-only-private-label",
      warningCodes: ["SIMULATED_ONLY"]
    };
    const result = buildMcpToolSimulatedResult(input);
    const summary = summarizeMcpToolSimulatedResult(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("simulated");
    expect(summary.resultHash).toBeDefined();
    expect(result.fixtureSummary.rawOutputPresent).toBe(false);
    expect(result.fixtureSummary.realExecutionEvidencePresent).toBe(false);
    expect(serialized).not.toContain("summary-only-private-label");
    expect(serialized).not.toContain("raw tool output");
    expectNoInvocation(result);
  });

  it("uses deterministic id and hash with injected id", () => {
    const first = validateMcpToolSimulatedResult(safeSimulationInput());
    const second = validateMcpToolSimulatedResult(safeSimulationInput());

    expect(first.simulationId).toBe("mcp-tool-simulated-result-test");
    expect(second.simulationId).toBe(first.simulationId);
    expect(second.simulationHash).toBe(first.simulationHash);
    expectNoInvocation(first);
  });
});
