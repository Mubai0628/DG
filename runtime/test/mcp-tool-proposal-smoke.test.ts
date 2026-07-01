import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  buildMcpToolBrokerPlanning,
  buildMcpToolInputRiskReport,
  buildMcpToolInvocationProposal,
  buildMcpToolProposalRedactionAudit,
  buildMcpToolSimulatedResult,
  summarizeMcpToolBrokerPlanning,
  summarizeMcpToolInputRiskReport,
  summarizeMcpToolInvocationProposal,
  summarizeMcpToolSimulatedResult,
  validateMcpToolBrokerPlanning,
  validateMcpToolInvocationProposal,
  validateMcpToolProposalRedactionAudit
} from "../src/index.js";

const fixtureRoot = new URL(
  "./fixtures/mcp-tool-proposal-smoke/",
  import.meta.url
);

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8")) as Record<
    string,
    unknown
  >;
}

function riskSummary(schemaSummary: string, riskLevel: "low" | "medium" | "high") {
  const report = buildMcpToolInputRiskReport({
    schemaSummary,
    schemaType: "metadata_summary",
    riskCategories:
      riskLevel === "low" ? ["read_only_metadata"] : ["unknown"],
    riskLevel,
    approvalRequired: riskLevel !== "low",
    manualOnly: true,
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => `mcp-tool-smoke-risk-${riskLevel}`
  });
  return summarizeMcpToolInputRiskReport(report);
}

function expectNoExecution(summary: unknown): void {
  const serialized = JSON.stringify(summary);
  expect(serialized).toContain("canInvokeMcpTool\":false");
  expect(serialized).toContain("canCallTool\":false");
  expect(serialized).toContain("canWriteEventStore\":false");
  expect(serialized).toContain("canExecuteGit\":false");
  expect(serialized).toContain("canExecuteShell\":false");
  expect(serialized).toContain("appCanExecute\":false");
}

describe("mcp tool proposal smoke", () => {
  it("runs safe read-only metadata through the full preview chain", async () => {
    const metadata = await fixture("safe-readonly-metadata.json");
    const simulatedFixture = await fixture("simulated-result.json");
    const proposal = buildMcpToolInvocationProposal({
      ...metadata,
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-proposal-safe"
    });
    const proposalSummary = summarizeMcpToolInvocationProposal(proposal);
    const risk = riskSummary(String(metadata.toolInputSchemaSummary), "low");
    const simulation = buildMcpToolSimulatedResult({
      proposalSummary,
      riskReportSummary: risk,
      simulatedResultFixture: simulatedFixture,
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-simulation-safe"
    });
    const simulationSummary = summarizeMcpToolSimulatedResult(simulation);
    const broker = buildMcpToolBrokerPlanning({
      proposalSummary,
      riskReportSummary: risk,
      simulatedResultSummary: simulationSummary,
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-broker-safe"
    });
    const brokerSummary = summarizeMcpToolBrokerPlanning(broker);
    const audit = buildMcpToolProposalRedactionAudit({
      proposalSummary,
      riskReportSummary: risk,
      simulatedResultSummary: simulationSummary,
      brokerPlanningSummary: brokerSummary,
      appSurfaceSummary: {
        status: "proposal_ready",
        proposalViewId: "mcp-tool-smoke-app-surface",
        serverRef: proposalSummary.serverRefHash,
        toolName: proposalSummary.toolName,
        riskLevel: risk.riskLevel,
        argumentSummaryHash: proposalSummary.argumentSummaryHash,
        readiness: {
          canInvokeMcpTool: false,
          canApproveToolInvocation: false,
          canWriteEventStore: false,
          appCanExecute: false
        }
      }
    });

    expect(proposal.status).toBe("parsed");
    expect(risk.riskLevel).toBe("low");
    expect(simulation.status).toBe("simulated");
    expect(simulation.fixtureSummary.rawOutputPresent).toBe(false);
    expect(simulation.summary.calledTool).toBe(false);
    expect(broker.status).toBe("planning_ready");
    expect(broker.descriptorPreview?.invokePolicy).toBe("MANUAL_ONLY");
    expect(broker.eventPreview.canWriteEventStore).toBe(false);
    expect(audit.status).toBe("audit_ready");
    expect(audit.sourceCounts.totalSourceCount).toBe(5);
    expect(audit.readiness.canInvokeMcpTool).toBe(false);
    expect(JSON.stringify(audit)).not.toContain("Simulated docs search");
    expectNoExecution(proposal);
    expectNoExecution(simulation);
    expectNoExecution(broker);
    expectNoExecution(audit);
  });

  it("blocks mutating tool metadata before real invocation", async () => {
    const metadata = await fixture("mutating-tool-metadata.json");
    const proposal = validateMcpToolInvocationProposal({
      ...metadata,
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-proposal-mutating"
    });
    const broker = validateMcpToolBrokerPlanning({
      proposalSummary: {
        ...summarizeMcpToolInvocationProposal(
          buildMcpToolInvocationProposal({
            ...(await fixture("safe-readonly-metadata.json")),
            createdAt: "2026-07-02T00:00:00.000Z",
            idGenerator: () => "mcp-tool-smoke-proposal-safe-for-mutating"
          })
        ),
        declaredReadOnly: false,
        declaredMutating: true
      },
      riskReportSummary: riskSummary("Mutating metadata summary.", "high"),
      simulatedResultSummary: {
        simulationId: "sim-mutating",
        resultHash: "sim-mutating-hash",
        resultBytes: 0,
        warningCodes: ["SIMULATED_ONLY"],
        simulatedOnly: true,
        calledTool: false,
        mutatedWorkspace: false,
        wroteEventStore: false,
        simulationHash: "sim-mutating-hash",
        source: "runtime_mcp_tool_simulated_result_summary"
      }
    });

    expect(proposal.status).toBe("blocked");
    expect(proposal.findings.map((finding) => finding.code)).toContain(
      "SUSPICIOUS_TOOL_NAME_REJECTED"
    );
    expect(broker.status).toBe("blocked");
    expect(broker.descriptorPreview?.invokePolicy).toBe("DISABLED");
    expect(broker.findings.map((finding) => finding.code)).toContain(
      "MUTATING_TOOL_DISABLED"
    );
    expectNoExecution(proposal);
    expectNoExecution(broker);
  });

  it("blocks unsafe args and secret marker fixtures", async () => {
    const unsafeArgs = validateMcpToolInvocationProposal(
      await fixture("unsafe-args.json")
    );
    const secretMarker = validateMcpToolInvocationProposal(
      await fixture("secret-marker.json")
    );

    expect(unsafeArgs.status).toBe("blocked");
    expect(unsafeArgs.findings.map((finding) => finding.code)).toContain(
      "RAW_ARGS_FIELD_REJECTED"
    );
    expect(secretMarker.status).toBe("blocked");
    expect(secretMarker.findings.map((finding) => finding.code)).toContain(
      "SECRET_MARKER_REJECTED"
    );
    expect(JSON.stringify(unsafeArgs)).not.toContain(
      "unsafe raw argument fixture value"
    );
    expect(JSON.stringify(secretMarker)).not.toContain(
      "sk-fake-smoke-not-real"
    );
    expectNoExecution(unsafeArgs);
    expectNoExecution(secretMarker);
  });

  it("keeps simulated result summary-only and broker policy manual or disabled", async () => {
    const metadata = await fixture("safe-readonly-metadata.json");
    const proposal = buildMcpToolInvocationProposal({
      ...metadata,
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-proposal-policy"
    });
    const proposalSummary = summarizeMcpToolInvocationProposal(proposal);
    const highRisk = riskSummary(String(metadata.toolInputSchemaSummary), "high");
    const simulation = buildMcpToolSimulatedResult({
      proposalSummary,
      riskReportSummary: highRisk,
      simulatedResultFixture: await fixture("simulated-result.json"),
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-simulation-policy"
    });
    const broker = buildMcpToolBrokerPlanning({
      proposalSummary,
      riskReportSummary: highRisk,
      simulatedResultSummary: summarizeMcpToolSimulatedResult(simulation),
      createdAt: "2026-07-02T00:00:00.000Z",
      idGenerator: () => "mcp-tool-smoke-broker-policy"
    });

    expect(simulation.summary.simulatedOnly).toBe(true);
    expect(simulation.summary.calledTool).toBe(false);
    expect(simulation.summary.wroteEventStore).toBe(false);
    expect(broker.status).toBe("warning");
    expect(broker.descriptorPreview?.invokePolicy).toBe("DISABLED");
    expect(broker.findings.map((finding) => finding.code)).toContain(
      "HIGH_OR_UNKNOWN_RISK_DISABLED"
    );
    expectNoExecution(simulation);
    expectNoExecution(broker);
  });

  it("redaction audit detects unsafe App surface cases", () => {
    const audit = validateMcpToolProposalRedactionAudit({
      proposalSummary: {
        proposalId: "mcp-tool-smoke-proposal-unsafe",
        proposalHash: "proposal-hash",
        toolName: "docs.search",
        rawArgs: "unsafe raw args"
      },
      appSurfaceSummary: {
        canInvokeMcpTool: true,
        rawOutput: "unsafe raw output"
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.rawFieldDetectedCount).toBeGreaterThanOrEqual(2);
    expect(audit.executionClaimDetected).toBe(true);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "RAW_ARGS_FIELD_REJECTED"
    );
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "RAW_OUTPUT_FIELD_REJECTED"
    );
    expect(audit.findings.map((finding) => finding.code)).toContain(
      "MCP_TOOL_INVOCATION_CLAIM_REJECTED"
    );
    expect(JSON.stringify(audit)).not.toContain("unsafe raw args");
    expect(JSON.stringify(audit)).not.toContain("unsafe raw output");
    expectNoExecution(audit);
  });
});
