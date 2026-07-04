import { describe, expect, it } from "vitest";

import {
  buildMcpReadonlyToolConsistencyReport,
  summarizeMcpReadonlyToolConsistency,
  validateMcpReadonlyToolConsistency,
  type McpReadonlyToolConsistencyInput,
  type McpReadonlyToolConsistencyReport
} from "../src/capabilities/index.js";

function safeInput(): McpReadonlyToolConsistencyInput {
  return {
    contract: {
      toolId: "mcp.read.workspace_index",
      descriptorId: "descriptor-read-workspace-index",
      profileId: "profile-readonly-local",
      readOnly: true,
      allowlisted: true,
      typedConfirmation: "READONLY",
      timeoutMs: 5_000,
      maxOutputBytes: 8_192,
      operationKind: "read"
    },
    toolResult: {
      toolId: "mcp.read.workspace_index",
      descriptorId: "descriptor-read-workspace-index",
      profileId: "profile-readonly-local",
      approvalReceiptId: "approval-readonly-1",
      typedConfirmation: "READONLY",
      timeoutMs: 2_000,
      outputBytes: 1_024,
      outputSummaryHash: "output-summary-hash",
      redactionSummaryPresent: true,
      eventSummaryPresent: true,
      replayProjectionPresent: true,
      mutating: false
    },
    approvalReceipt: {
      receiptId: "approval-readonly-1",
      toolId: "mcp.read.workspace_index",
      descriptorId: "descriptor-read-workspace-index",
      profileId: "profile-readonly-local",
      typedConfirmation: "READONLY",
      approved: true
    },
    redactionSummary: {
      redactedFieldCount: 2,
      rawFieldDetectedCount: 0
    },
    eventSummary: {
      eventId: "event-readonly-1",
      toolId: "mcp.read.workspace_index",
      descriptorId: "descriptor-read-workspace-index"
    },
    replayProjection: {
      replayId: "replay-readonly-1",
      toolId: "mcp.read.workspace_index",
      descriptorId: "descriptor-read-workspace-index"
    },
    allowlistedToolIds: ["mcp.read.workspace_index"]
  };
}

function codes(result: McpReadonlyToolConsistencyReport): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: McpReadonlyToolConsistencyReport): void {
  expect(result.readiness.canInvokeMcpTool).toBe(false);
  expect(result.readiness.canInvokeMutatingMcpTool).toBe(false);
  expect(result.readiness.canUseArbitraryMcpTool).toBe(false);
  expect(result.readiness.canWriteEventStoreRaw).toBe(false);
  expect(result.readiness.canPersistRawOutput).toBe(false);
  expect(result.readiness.canExecuteGit).toBe(false);
  expect(result.readiness.canExecuteShell).toBe(false);
  expect(result.readiness.appCanExecute).toBe(false);
}

describe("mcp readonly tool consistency", () => {
  it("builds a summary-only consistency-ready report for matching read-only evidence", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      idGenerator: () => "mcp-readonly-test"
    });
    const summary = summarizeMcpReadonlyToolConsistency(result);

    expect(result.status).toBe("consistency_ready");
    expect(result.consistencyId).toBe("mcp-readonly-test");
    expect(result.toolIdHash).toBeDefined();
    expect(result.descriptorIdHash).toBeDefined();
    expect(result.approvalHash).toBeDefined();
    expect(result.outputSummary.outputBytes).toBe(1_024);
    expect(result.redactionCounts.rawFieldDetectedCount).toBe(0);
    expect(result.eventReplayCounts.eventSummaryCount).toBe(1);
    expect(result.eventReplayCounts.replayProjectionCount).toBe(1);
    expect(summary.source).toBe("runtime_mcp_readonly_tool_consistency");
    expect(result.readiness.canReviewMcpReadonlyConsistency).toBe(true);
    expectNoExecution(result);
  });

  it("blocks missing contract, result, approval, event, and replay summaries", () => {
    const result = buildMcpReadonlyToolConsistencyReport();

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "CONTRACT_MISSING",
        "TOOL_RESULT_MISSING",
        "APPROVAL_RECEIPT_MISSING",
        "EVENT_SUMMARY_MISSING",
        "REPLAY_PROJECTION_MISSING"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks non-read-only, non-allowlisted, and mutating MCP tools", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      contract: {
        ...safeInput().contract,
        readOnly: false,
        allowlisted: false,
        operationKind: "write"
      },
      allowlistedToolIds: ["mcp.read.other"]
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "CONTRACT_NOT_READ_ONLY",
        "TOOL_NOT_ALLOWLISTED",
        "MUTATING_TOOL_BLOCKED"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks descriptor, profile, tool, typed confirmation, and approval mismatches", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      toolResult: {
        ...safeInput().toolResult,
        toolId: "mcp.read.other",
        descriptorId: "descriptor-other",
        profileId: "profile-other",
        typedConfirmation: "OTHER"
      },
      approvalReceipt: {
        ...safeInput().approvalReceipt,
        toolId: "mcp.read.other",
        descriptorId: "descriptor-other",
        profileId: "profile-other",
        typedConfirmation: "OTHER",
        approved: false
      }
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "DESCRIPTOR_ID_MISMATCH",
        "PROFILE_ID_MISMATCH",
        "TOOL_ID_MISMATCH",
        "TYPED_CONFIRMATION_MISMATCH",
        "APPROVAL_RECEIPT_NOT_APPROVED",
        "APPROVAL_TOOL_ID_MISMATCH",
        "APPROVAL_DESCRIPTOR_ID_MISMATCH",
        "APPROVAL_PROFILE_ID_MISMATCH",
        "APPROVAL_TYPED_CONFIRMATION_MISMATCH"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks timeout and output bounds plus missing redaction, event, and replay evidence", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      toolResult: {
        ...safeInput().toolResult,
        timeoutMs: 60_000,
        outputBytes: 1_000_000,
        redactionSummaryPresent: false,
        eventSummaryPresent: false,
        replayProjectionPresent: false
      },
      redactionSummary: undefined,
      eventSummary: undefined,
      replayProjection: undefined,
      maxTimeoutMs: 5_000,
      maxOutputBytes: 8_192
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "TIMEOUT_OUT_OF_BOUNDS",
        "OUTPUT_BYTES_OUT_OF_BOUNDS",
        "OUTPUT_REDACTION_SUMMARY_MISSING",
        "EVENT_SUMMARY_MISSING",
        "REPLAY_PROJECTION_MISSING"
      ])
    );
    expectNoExecution(result);
  });

  it("blocks raw args, raw output, secret markers, and execution readiness without leaking raw values", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      toolResult: {
        ...safeInput().toolResult,
        rawOutput: "RAW_MCP_OUTPUT_SHOULD_NOT_LEAK"
      },
      rawArgs: "RAW_MCP_ARGS_SHOULD_NOT_LEAK",
      marker: "Bearer fake-token-for-test-only",
      nested: {
        readiness: {
          canInvokeMcpTool: true
        }
      }
    } as never);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "RAW_ARGS_FIELD_REJECTED",
        "RAW_OUTPUT_FIELD_REJECTED",
        "BEARER_TOKEN_MARKER_REJECTED",
        "EXECUTION_READINESS_FLAG_TRUE"
      ])
    );
    expect(serialized).not.toContain("RAW_MCP_OUTPUT_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("RAW_MCP_ARGS_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("Bearer fake-token-for-test-only");
    expectNoExecution(result);
  });

  it("blocks redaction raw-field detections and event/replay descriptor mismatches", () => {
    const result = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      redactionSummary: {
        redactedFieldCount: 1,
        rawFieldDetectedCount: 1
      },
      eventSummary: {
        eventId: "event-readonly-1",
        toolId: "mcp.read.workspace_index",
        descriptorId: "descriptor-other"
      },
      replayProjection: {
        replayId: "replay-readonly-1",
        toolId: "mcp.read.workspace_index",
        descriptorId: "descriptor-other"
      }
    });

    expect(result.status).toBe("blocked");
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "RAW_OUTPUT_DETECTED_BY_REDACTION",
        "EVENT_DESCRIPTOR_ID_MISMATCH",
        "REPLAY_DESCRIPTOR_ID_MISMATCH"
      ])
    );
    expectNoExecution(result);
  });

  it("returns deterministic hashes and validation findings", () => {
    const first = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      idGenerator: () => "deterministic-mcp-readonly"
    });
    const second = buildMcpReadonlyToolConsistencyReport({
      ...safeInput(),
      idGenerator: () => "deterministic-mcp-readonly"
    });
    const findings = validateMcpReadonlyToolConsistency(safeInput());

    expect(first.consistencyHash).toBe(second.consistencyHash);
    expect(first.consistencyId).toBe(second.consistencyId);
    expect(findings).toHaveLength(0);
    expectNoExecution(first);
  });
});
