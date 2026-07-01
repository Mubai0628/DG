import { describe, expect, it } from "vitest";

import {
  buildMcpToolInputRiskReport,
  summarizeMcpToolInputRiskReport,
  validateMcpToolInputRiskReport,
  type McpToolInputRiskReport
} from "../src/index.js";

function safeRiskInput(): Record<string, unknown> {
  return {
    schemaSummary:
      "Read-only metadata search schema. Accepts query summary hash and limit. Returns descriptor summaries only.",
    schemaType: "metadata_summary",
    riskCategories: ["read_only_metadata"],
    riskLevel: "low",
    approvalRequired: false,
    manualOnly: true,
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-input-risk-test"
  };
}

function findingCodes(report: McpToolInputRiskReport): string[] {
  return report.findings.map((finding) => finding.code);
}

function expectNoInvocation(report: McpToolInputRiskReport): void {
  expect(report.readiness).toMatchObject({
    canInvokeMcpTool: false,
    canCallTool: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("mcp tool input risk classifier", () => {
  it("classifies a safe read-only schema", () => {
    const report = validateMcpToolInputRiskReport(safeRiskInput());

    expect(report.status).toBe("parsed");
    expect(report.reportId).toBe("mcp-tool-input-risk-test");
    expect(report.classification.riskLevel).toBe("low");
    expect(report.classification.riskCategories).toContain(
      "read_only_metadata"
    );
    expect(report.classification.manualOnly).toBe(true);
    expect(report.classification.autoInvoke).toBe(false);
    expect(report.readiness.canEnterApprovalDraft).toBe(true);
    expect(report.readiness.canEnterSimulation).toBe(true);
    expectNoInvocation(report);
  });

  it("parses JSON string input", () => {
    const input = safeRiskInput();
    delete input.idGenerator;
    const report = validateMcpToolInputRiskReport(JSON.stringify(input));

    expect(report.status).toBe("parsed");
    expect(report.schemaSummary.rawSchemaPresent).toBe(false);
    expectNoInvocation(report);
  });

  it("blocks filesystem write schemas", () => {
    const input = safeRiskInput();
    input.schemaSummary = "Requires create file and write file path summary.";
    input.riskCategories = ["filesystem_write"];
    input.riskLevel = "high";
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("FILESYSTEM_WRITE_REJECTED");
    expectNoInvocation(report);
  });

  it("blocks command execution schemas", () => {
    const input = safeRiskInput();
    input.schemaSummary = "Requires shell command summary and stdout status.";
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("COMMAND_EXECUTION_REJECTED");
    expectNoInvocation(report);
  });

  it("blocks credential access schemas", () => {
    const input = safeRiskInput();
    input.schemaSummary = "Requires credential reference and API key lookup.";
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("CREDENTIAL_ACCESS_REJECTED");
    expectNoInvocation(report);
  });

  it("blocks unknown schema without conservative risk", () => {
    const input = safeRiskInput();
    input.schemaType = "unknown";
    input.riskCategories = ["read_only_metadata"];
    input.riskLevel = "low";
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain(
      "UNKNOWN_SCHEMA_REQUIRES_CONSERVATIVE_RISK"
    );
    expectNoInvocation(report);
  });

  it("blocks oversized schema summaries", () => {
    const input = safeRiskInput();
    input.schemaSummary = "metadata ".repeat(400);
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("SCHEMA_SUMMARY_REQUIRED");
    expectNoInvocation(report);
  });

  it("blocks secret markers without echoing fake values", () => {
    const input = safeRiskInput();
    input.schemaSummary = "metadata query summary includes sk-fake1234567890";
    const report = validateMcpToolInputRiskReport(input);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoInvocation(report);
  });

  it("blocks auto invoke claims", () => {
    const input = safeRiskInput();
    input.autoInvoke = true;
    const report = validateMcpToolInputRiskReport(input);

    expect(report.status).toBe("blocked");
    expect(findingCodes(report)).toContain("AUTO_INVOKE_REJECTED");
    expectNoInvocation(report);
  });

  it("keeps risk report output summary-only", () => {
    const input = safeRiskInput();
    input.schemaSummary = "metadata queryHash=summary-only-private-label";
    const report = buildMcpToolInputRiskReport(input);
    const summary = summarizeMcpToolInputRiskReport(report);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("parsed");
    expect(summary.schemaHash).toBeDefined();
    expect(report.schemaSummary.rawSchemaPresent).toBe(false);
    expect(serialized).not.toContain("summary-only-private-label");
    expect(serialized).not.toContain("Authorization");
    expectNoInvocation(report);
  });

  it("uses deterministic id and hash with injected id", () => {
    const first = validateMcpToolInputRiskReport(safeRiskInput());
    const second = validateMcpToolInputRiskReport(safeRiskInput());

    expect(first.reportId).toBe("mcp-tool-input-risk-test");
    expect(second.reportId).toBe(first.reportId);
    expect(second.reportHash).toBe(first.reportHash);
    expectNoInvocation(first);
  });
});
