import { describe, expect, it } from "vitest";

import {
  buildMcpToolInvocationProposal,
  summarizeMcpToolInvocationProposal,
  validateMcpToolInvocationProposal,
  type McpToolInvocationProposal
} from "../src/index.js";

function safeProposalInput(): Record<string, unknown> {
  return {
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
    evidenceRefs: [
      {
        refId: "mcp-tool-metadata.docs-search",
        kind: "mcp_tool_metadata",
        hashPrefix: "abc123",
        warningCodes: []
      }
    ],
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-tool-proposal-test"
  };
}

function findingCodes(result: McpToolInvocationProposal): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: McpToolInvocationProposal): void {
  expect(result.readiness).toMatchObject({
    canInvokeMcpTool: false,
    canCallTool: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  });
}

describe("mcp tool invocation proposal schema", () => {
  it("accepts a safe read-only proposal", () => {
    const result = validateMcpToolInvocationProposal(safeProposalInput());

    expect(result.status).toBe("parsed");
    expect(result.proposalId).toBe("mcp-tool-proposal-test");
    expect(result.summary.toolName).toBe("docs.search");
    expect(result.summary.evidenceRefCount).toBe(1);
    expect(result.readiness.canEnterRiskClassification).toBe(true);
    expect(result.readiness.canEnterApprovalDraft).toBe(true);
    expect(result.readiness.canEnterSimulation).toBe(true);
    expectNoExecution(result);
  });

  it("blocks mutating proposals", () => {
    const input = safeProposalInput();
    input.declaredMutating = true;
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MUTATING_TOOL_REJECTED");
    expect(result.readiness.canEnterApprovalDraft).toBe(false);
    expectNoExecution(result);
  });

  it("blocks raw args fields", () => {
    const input = safeProposalInput();
    input.rawArgs = { query: "show raw values" };
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_ARGS_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks raw output fields", () => {
    const input = safeProposalInput();
    input.rawOutput = "raw output should never be present";
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_OUTPUT_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks secret markers without echoing fake values", () => {
    const input = safeProposalInput();
    input.argumentsSummary = "query uses sk-fake1234567890";
    const result = validateMcpToolInvocationProposal(input);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });

  it("blocks shell git and tauri fields", () => {
    const input = safeProposalInput();
    input.shellCommand = "echo unsafe";
    input.gitCommand = "status";
    input.tauriCommand = "callTool";
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SHELL_COMMAND_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("GIT_COMMAND_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("TAURI_COMMAND_FIELD_REJECTED");
    expectNoExecution(result);
  });

  it("blocks missing evidence refs", () => {
    const input = safeProposalInput();
    input.evidenceRefs = [];
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("EVIDENCE_REFS_REQUIRED");
    expectNoExecution(result);
  });

  it("blocks suspicious tool names", () => {
    const input = safeProposalInput();
    input.toolName = "workspace.write";
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SUSPICIOUS_TOOL_NAME_REJECTED");
    expectNoExecution(result);
  });

  it("blocks unknown risk levels", () => {
    const input = safeProposalInput();
    input.riskLevel = "auto";
    const result = validateMcpToolInvocationProposal(input);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RISK_LEVEL_REJECTED");
    expectNoExecution(result);
  });

  it("keeps output summary-only", () => {
    const input = safeProposalInput();
    input.argumentsSummary = "queryHash=private-looking-but-summary-only";
    const result = buildMcpToolInvocationProposal(input);
    const summary = summarizeMcpToolInvocationProposal(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("parsed");
    expect(summary.argumentSummaryHash).toBeDefined();
    expect(result.argumentSummary.rawArgsPresent).toBe(false);
    expect(result.argumentSummary.rawOutputPresent).toBe(false);
    expect(serialized).not.toContain("private-looking-but-summary-only");
    expect(serialized).not.toContain("Authorization");
    expectNoExecution(result);
  });

  it("uses deterministic id and hash with injected id", () => {
    const first = validateMcpToolInvocationProposal(safeProposalInput());
    const second = validateMcpToolInvocationProposal(safeProposalInput());

    expect(first.proposalId).toBe("mcp-tool-proposal-test");
    expect(second.proposalId).toBe(first.proposalId);
    expect(second.proposalHash).toBe(first.proposalHash);
    expectNoExecution(first);
  });
});
