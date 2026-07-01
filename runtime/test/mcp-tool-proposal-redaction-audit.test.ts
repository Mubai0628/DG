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
  summarizeMcpToolProposalRedactionAudit,
  summarizeMcpToolSimulatedResult,
  validateMcpToolProposalRedactionAudit,
  type McpToolProposalRedactionAudit
} from "../src/index.js";

function proposalSummary(overrides: Record<string, unknown> = {}) {
  const proposal = buildMcpToolInvocationProposal({
    serverRef: "mcp-server.docs",
    connectionProfileRef: "mcp-profile.docs-readonly",
    toolName: "docs.search",
    toolDisplayName: "Docs Search",
    toolDescriptionSummary: "Searches summary-only documentation metadata.",
    toolInputSchemaSummary:
      "Requires query summary and optional section filter. No resource body.",
    argumentsSummary: "queryHash=abc123; scope=docs-index; limit=5",
    declaredReadOnly: true,
    declaredMutating: false,
    riskLevel: "low",
    evidenceRefs: [{ refId: "mcp-tool-metadata.docs-search" }],
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-proposal-audit-test"
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
    idGenerator: () => "mcp-tool-input-risk-audit-test"
  });
  return { ...summarizeMcpToolInputRiskReport(report), ...overrides };
}

function simulatedResultSummary(overrides: Record<string, unknown> = {}) {
  const result = buildMcpToolSimulatedResult({
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultFixture: {
      resultSummary:
        "Simulated docs search returned metadata refs and no resource body.",
      warningCodes: ["SIMULATED_ONLY"]
    },
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-simulated-result-audit-test"
  });
  return { ...summarizeMcpToolSimulatedResult(result), ...overrides };
}

function brokerPlanningSummary(overrides: Record<string, unknown> = {}) {
  const planning = buildMcpToolBrokerPlanning({
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultSummary: simulatedResultSummary(),
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-broker-planning-audit-test"
  });
  return { ...summarizeMcpToolBrokerPlanning(planning), ...overrides };
}

function safeAuditInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    proposalSummary: proposalSummary(),
    riskReportSummary: riskSummary(),
    simulatedResultSummary: simulatedResultSummary(),
    brokerPlanningSummary: brokerPlanningSummary(),
    appSurfaceSummary: {
      status: "proposal_ready",
      proposalViewId: "mcp-tool-proposal-view-1",
      serverRef: "server-ref-abc",
      toolName: "docs.search",
      argumentSummaryHash: "args-hash-001",
      readiness: {
        canInvokeMcpTool: false,
        canApproveToolInvocation: false,
        canWriteEventStore: false,
        appCanExecute: false
      }
    },
    ...overrides
  };
}

function codes(audit: McpToolProposalRedactionAudit): string[] {
  return audit.findings.map((finding) => finding.code);
}

function expectNoExecution(audit: McpToolProposalRedactionAudit): void {
  expect(audit.readiness).toMatchObject({
    canInvokeMcpTool: false,
    canCallTool: false,
    canApproveToolInvocation: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canIssuePermissionLease: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  });
}

describe("mcp tool proposal redaction audit", () => {
  it("returns empty safely when no audit input is provided", () => {
    const audit = validateMcpToolProposalRedactionAudit(undefined);

    expect(audit.status).toBe("empty");
    expect(audit.sourceCounts.totalSourceCount).toBe(0);
    expect(audit.rawFieldDetectedCount).toBe(0);
    expectNoExecution(audit);
  });

  it("audits safe proposal, risk, simulation, broker, and App summaries", () => {
    const audit = buildMcpToolProposalRedactionAudit(safeAuditInput());
    const summary = summarizeMcpToolProposalRedactionAudit(audit);

    expect(audit.status).toBe("audit_ready");
    expect(audit.sourceCounts.totalSourceCount).toBe(5);
    expect(summary.sourceCounts.totalSourceCount).toBe(5);
    expect(audit.rawFieldDetectedCount).toBe(0);
    expect(audit.secretDetected).toBe(false);
    expect(audit.executionClaimDetected).toBe(false);
    expect(audit.mutationClaimDetected).toBe(false);
    expect(audit.eventStoreWriteClaimDetected).toBe(false);
    expect(audit.appExecutionClaimDetected).toBe(false);
    expectNoExecution(audit);
  });

  it("parses JSON string input without preserving raw source text", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      JSON.stringify(safeAuditInput())
    );

    expect(audit.status).toBe("audit_ready");
    expect(JSON.stringify(audit)).not.toContain("Simulated docs search");
    expectNoExecution(audit);
  });

  it("warns when optional source summaries are missing", () => {
    const audit = validateMcpToolProposalRedactionAudit({
      proposalSummary: proposalSummary()
    });

    expect(audit.status).toBe("warning");
    expect(audit.sourceCounts.totalSourceCount).toBe(1);
    expect(codes(audit)).toContain("RISK_REPORT_SUMMARY_MISSING");
    expect(codes(audit)).toContain("SIMULATED_RESULT_SUMMARY_MISSING");
    expect(codes(audit)).toContain("BROKER_PLANNING_SUMMARY_MISSING");
    expectNoExecution(audit);
  });

  it("blocks raw args, raw output, and resource content fields", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      safeAuditInput({
        proposalSummary: {
          ...proposalSummary(),
          rawArgs: { query: "raw argument value" }
        },
        simulatedResultSummary: {
          ...simulatedResultSummary(),
          rawOutput: "raw output value",
          resourceContent: "resource content value"
        }
      })
    );

    expect(audit.status).toBe("blocked");
    expect(audit.rawFieldDetectedCount).toBeGreaterThanOrEqual(3);
    expect(codes(audit)).toContain("RAW_ARGS_FIELD_REJECTED");
    expect(codes(audit)).toContain("RAW_OUTPUT_FIELD_REJECTED");
    expect(codes(audit)).toContain("RAW_RESOURCE_CONTENT_FIELD_REJECTED");
    expect(JSON.stringify(audit)).not.toContain("raw argument value");
    expect(JSON.stringify(audit)).not.toContain("raw output value");
    expect(JSON.stringify(audit)).not.toContain("resource content value");
    expectNoExecution(audit);
  });

  it("blocks secret-like markers without returning their values", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      safeAuditInput({
        appSurfaceSummary: {
          token: "sk-fake-not-real-for-audit"
        }
      })
    );

    expect(audit.status).toBe("blocked");
    expect(audit.secretDetected).toBe(true);
    expect(codes(audit)).toContain("TOKEN_FIELD_REJECTED");
    expect(codes(audit)).toContain("API_KEY_MARKER_REJECTED");
    expect(JSON.stringify(audit)).not.toContain("sk-fake-not-real-for-audit");
    expectNoExecution(audit);
  });

  it("blocks execution, mutation, EventStore, and App execution claims", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      safeAuditInput({
        appSurfaceSummary: {
          canInvokeMcpTool: true,
          canWriteEventStore: true,
          appCanExecute: true
        },
        brokerPlanningSummary: {
          ...brokerPlanningSummary(),
          declaredMutating: true
        }
      })
    );

    expect(audit.status).toBe("blocked");
    expect(audit.executionClaimDetected).toBe(true);
    expect(audit.mutationClaimDetected).toBe(true);
    expect(audit.eventStoreWriteClaimDetected).toBe(true);
    expect(audit.appExecutionClaimDetected).toBe(true);
    expect(codes(audit)).toContain("MCP_TOOL_INVOCATION_CLAIM_REJECTED");
    expect(codes(audit)).toContain("EVENTSTORE_WRITE_CLAIM_REJECTED");
    expect(codes(audit)).toContain("APP_EXECUTION_CLAIM_REJECTED");
    expect(codes(audit)).toContain("MUTATION_CLAIM_REJECTED");
    expectNoExecution(audit);
  });

  it("blocks command, shell, git, tauri, and tool call fields", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      safeAuditInput({
        appSurfaceSummary: {
          command: "do not run",
          shellCommand: "do not run",
          gitCommand: "do not run",
          tauriCommand: "do not run",
          callTool: true
        }
      })
    );

    expect(audit.status).toBe("blocked");
    expect(codes(audit)).toContain("COMMAND_FIELD_REJECTED");
    expect(codes(audit)).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(codes(audit)).toContain("GIT_COMMAND_FIELD_REJECTED");
    expect(codes(audit)).toContain("TAURI_COMMAND_FIELD_REJECTED");
    expect(codes(audit)).toContain("CALL_TOOL_FIELD_REJECTED");
    expect(JSON.stringify(audit)).not.toContain("do not run");
    expectNoExecution(audit);
  });

  it("blocks raw prompt, raw source, and tool call markers in strings", () => {
    const audit = validateMcpToolProposalRedactionAudit(
      safeAuditInput({
        appSurfaceSummary: {
          summary:
            "This unsafe summary mentions rawPrompt, rawSource, and tools/call."
        }
      })
    );

    expect(audit.status).toBe("blocked");
    expect(codes(audit)).toContain("RAW_PROMPT_MARKER_REJECTED");
    expect(codes(audit)).toContain("RAW_SOURCE_MARKER_REJECTED");
    expect(codes(audit)).toContain("MCP_TOOL_CALL_MARKER_REJECTED");
    expect(JSON.stringify(audit)).not.toContain("unsafe summary");
    expectNoExecution(audit);
  });

  it("uses deterministic audit id and hash for the same summaries", () => {
    const first = validateMcpToolProposalRedactionAudit(safeAuditInput());
    const second = validateMcpToolProposalRedactionAudit(safeAuditInput());

    expect(first.auditId).toBe(second.auditId);
    expect(first.auditHash).toBe(second.auditHash);
    expectNoExecution(first);
  });
});
