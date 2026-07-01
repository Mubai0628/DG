import { describe, expect, it } from "vitest";

import {
  InMemoryEventStore,
  appendMcpReadonlyToolSummaryEvents,
  callMcpReadonlyTool,
  projectMcpReadonlyToolReplay,
  replay,
  summarizeMcpReadonlyToolCallResult,
  validateMcpReadonlyToolContract,
  type McpReadonlyToolApprovalReceipt,
  type McpReadonlyToolCallInput,
  type McpReadonlyToolCallResult,
  type McpReadonlyToolContract,
  type McpReadonlyToolTransport
} from "../src/index.js";

function safeContractInput(): Record<string, unknown> {
  return {
    connectionProfileRef: "mcp-profile.docs-readonly",
    serverIdentitySummary: "Docs MCP server summary ref only.",
    toolId: "docs.search",
    toolName: "docs.search",
    toolDescriptionSummary:
      "Searches documentation index summaries and returns bounded metadata.",
    toolInputSchemaSummary:
      "Accepts querySummary, sectionFilter, and maxResults summary fields.",
    declaredReadOnly: true,
    declaredMutating: false,
    riskLevel: "low",
    allowedArgumentKeys: ["querySummary", "sectionFilter", "maxResults"],
    deniedArgumentKeys: [],
    maxInputBytes: 2048,
    maxOutputBytes: 8192,
    timeoutMs: 5000,
    requiredApproval: {
      approvalRequired: true,
      receiptRequired: true,
      typedConfirmation: "CALL READONLY MCP TOOL"
    },
    allowedWorkspaces: ["workspace.demo"],
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-readonly-tool-contract-call-test"
  };
}

function safeContract(): McpReadonlyToolContract {
  return validateMcpReadonlyToolContract(safeContractInput());
}

function safeReceipt(
  contract = safeContract()
): McpReadonlyToolApprovalReceipt {
  return {
    receiptId: "mcp-readonly-tool-receipt-test",
    toolId: contract.toolId,
    connectionProfileRef: contract.profileRef,
    typedConfirmation: "CALL READONLY MCP TOOL",
    allowedArgumentKeys: ["querySummary", "sectionFilter", "maxResults"],
    maxOutputBytes: 8192,
    expiresAt: "2026-07-02T01:00:00.000Z",
    receiptHash: "abcdef1234567890"
  };
}

function safeInput(
  overrides: Partial<McpReadonlyToolCallInput> = {}
): McpReadonlyToolCallInput {
  const contract = overrides.contract ?? safeContract();
  return {
    contract,
    approvalReceipt: overrides.approvalReceipt ?? safeReceipt(contract),
    argumentsSummary: "querySummaryHash=abc123; maxResults=3",
    argumentValues: {
      querySummary: "documentation search summary",
      maxResults: 3
    },
    callMode: "explicit_readonly_tool_call",
    maxOutputBytes: 8192,
    timeoutMs: 1000,
    createdAt: "2026-07-02T00:00:00.000Z",
    idGenerator: () => "mcp-readonly-tool-call-test",
    ...overrides
  };
}

function findingCodes(result: McpReadonlyToolCallResult): string[] {
  return result.findings.map((finding) => finding.code);
}

function expectNoExecution(result: McpReadonlyToolCallResult): void {
  expect(result.readiness).toMatchObject({
    canCallMcpTool: false,
    canInvokeMutatingTool: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    canUsePluginRuntime: false,
    canUseSkillRuntime: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    appCanExecute: false
  });
}

describe("mcp readonly tool call wrapper", () => {
  it("disabled mode calls no transport", async () => {
    let called = false;
    const transport: McpReadonlyToolTransport = {
      async send() {
        called = true;
        return { output: { count: 1 } };
      }
    };
    const result = await callMcpReadonlyTool(
      safeInput({ callMode: "disabled", transport })
    );

    expect(result.status).toBe("disabled");
    expect(called).toBe(false);
    expect(result.readiness.calledReadonlyTool).toBe(false);
    expectNoExecution(result);
  });

  it("dry_run mode calls no transport", async () => {
    let called = false;
    const transport: McpReadonlyToolTransport = {
      async send() {
        called = true;
        return { output: { count: 1 } };
      }
    };
    const result = await callMcpReadonlyTool(
      safeInput({ callMode: "dry_run", transport })
    );

    expect(result.status).toBe("dry_run");
    expect(called).toBe(false);
    expect(result.readiness.calledReadonlyTool).toBe(false);
    expectNoExecution(result);
  });

  it("explicit fake call returns summary-only result", async () => {
    let requestToolId = "";
    const transport: McpReadonlyToolTransport = {
      async send(request) {
        requestToolId = request.toolId;
        return {
          status: "ok",
          output: { matchCount: 2, resultRef: "docs-result-summary" },
          warningCodes: ["MCP_READONLY_SUMMARY"]
        };
      }
    };
    const result = await callMcpReadonlyTool(safeInput({ transport }));
    const summary = summarizeMcpReadonlyToolCallResult(result);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("warning");
    expect(requestToolId).toBe("docs.search");
    expect(result.readiness.calledReadonlyTool).toBe(true);
    expect(result.outputSummary.rawOutputPresent).toBe(false);
    expect(result.eventPreview.notWritten).toBe(true);
    expect(summary.calledReadonlyTool).toBe(true);
    expect(serialized).not.toContain("docs-result-summary");
    expect(serialized).not.toContain("documentation search summary");
    expectNoExecution(result);
  });

  it("records summary-only MCP tool events and replay projection", async () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-07-02T00:00:00.000Z"),
      idFactory: (() => {
        let id = 0;
        return () => {
          id += 1;
          return `mcp-event-${id}`;
        };
      })()
    });
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            return {
              status: "ok",
              output: { matchCount: 2, resultRef: "docs-result-summary" }
            };
          }
        }
      })
    );

    const integration = appendMcpReadonlyToolSummaryEvents(eventStore, {
      callResult: result,
      receiptId: safeReceipt().receiptId
    });
    const events = eventStore.listEvents();
    const replayState = replay(events);
    const projection = projectMcpReadonlyToolReplay(events);
    const serialized = JSON.stringify({ integration, events, projection });

    expect(integration.eventTypes).toEqual([
      "mcp.readonly_tool.proposed",
      "mcp.readonly_tool.approved",
      "mcp.readonly_tool.executed",
      "mcp.readonly_tool.result"
    ]);
    expect(projection).toMatchObject({
      status: "ready",
      eventCount: 4,
      proposedCount: 1,
      approvedCount: 1,
      executedCount: 1,
      resultCount: 1,
      rawArgsIncluded: false,
      rawOutputIncluded: false
    });
    expect(replayState.timeline.map((item) => item.summary)).toContain(
      "mcp.readonly_tool.result: MCP read-only tool result: docs.search"
    );
    expect(serialized).not.toContain("docs-result-summary");
    expect(serialized).not.toContain("documentation search summary");
    expect(serialized).not.toContain("raw output body");
    expect(integration.canWriteEventStore).toBe(false);
    expect(integration.canInvokeMutatingTool).toBe(false);
    expect(integration.canExecuteGit).toBe(false);
    expect(integration.canExecuteShell).toBe(false);
  });

  it("records rejected summary events for blocked MCP tool calls", async () => {
    const eventStore = new InMemoryEventStore({
      clock: () => new Date("2026-07-02T00:00:00.000Z"),
      idFactory: (() => {
        let id = 0;
        return () => {
          id += 1;
          return `mcp-rejected-event-${id}`;
        };
      })()
    });
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            return { output: "Bearer fake-secret-token-1234567890" };
          }
        }
      })
    );

    const integration = appendMcpReadonlyToolSummaryEvents(eventStore, {
      callResult: result,
      receiptId: safeReceipt().receiptId
    });
    const serialized = JSON.stringify({
      integration,
      events: eventStore.listEvents()
    });

    expect(result.status).toBe("blocked");
    expect(integration.status).toBe("rejected");
    expect(integration.eventTypes).toEqual([
      "mcp.readonly_tool.proposed",
      "mcp.readonly_tool.rejected"
    ]);
    expect(integration.replaySummary.rejectedCount).toBe(1);
    expect(serialized).not.toContain("fake-secret-token");
  });

  it("blocks wrong approval confirmation", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        approvalReceipt: {
          ...safeReceipt(),
          typedConfirmation: "CALL MCP TOOL"
        } as unknown as McpReadonlyToolApprovalReceipt,
        transport: {
          async send() {
            throw new Error("should not be called");
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TYPED_CONFIRMATION_REJECTED");
    expect(result.readiness.calledReadonlyTool).toBe(false);
    expectNoExecution(result);
  });

  it("blocks mutating contract", async () => {
    const contract = { ...safeContract(), declaredReadOnly: false };
    const result = await callMcpReadonlyTool(
      safeInput({
        contract,
        approvalReceipt: safeReceipt(contract),
        transport: {
          async send() {
            throw new Error("should not be called");
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("CONTRACT_NOT_READONLY_REJECTED");
    expectNoExecution(result);
  });

  it("blocks denied or unallowlisted args", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        argumentValues: {
          querySummary: "safe",
          rawPrompt: "unsafe"
        },
        transport: {
          async send() {
            throw new Error("should not be called");
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("RAW_PROMPT_FIELD_REJECTED");
    expect(findingCodes(result)).toContain("RAW_PROMPT_ARGUMENT_KEY_REJECTED");
    expectNoExecution(result);
  });

  it("blocks secret args without echoing fake values", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        argumentValues: {
          querySummary: "sk-fake1234567890"
        },
        transport: {
          async send() {
            throw new Error("should not be called");
          }
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("sk-fake1234567890");
    expectNoExecution(result);
  });

  it("blocks secret output without persisting it", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            return { output: "Bearer fake-secret-token-1234567890" };
          }
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("SECRET_MARKER_REJECTED");
    expect(serialized).not.toContain("fake-secret-token-1234567890");
    expectNoExecution(result);
  });

  it("blocks oversized output", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        maxOutputBytes: 10,
        transport: {
          async send() {
            return { output: { summary: "this output is too large" } };
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("OUTPUT_TOO_LARGE");
    expectNoExecution(result);
  });

  it("blocks timeout without raw transport error", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        timeoutMs: 1,
        transport: {
          async send() {
            return await new Promise(() => undefined);
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TOOL_CALL_TIMEOUT");
    expect(JSON.stringify(result)).not.toContain(
      "MCP_READONLY_TOOL_CALL_TIMEOUT"
    );
    expectNoExecution(result);
  });

  it("redacts thrown transport errors", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            throw new Error(
              "Authorization: Bearer fake-secret-token-1234567890"
            );
          }
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("TRANSPORT_ERROR_REDACTED");
    expect(serialized).not.toContain("fake-secret-token-1234567890");
    expectNoExecution(result);
  });

  it("blocks mutating result markers", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            return { output: "wrote file successfully" };
          }
        }
      })
    );

    expect(result.status).toBe("blocked");
    expect(findingCodes(result)).toContain("MUTATING_RESULT_MARKER_REJECTED");
    expectNoExecution(result);
  });

  it("keeps event preview summary-only", async () => {
    const result = await callMcpReadonlyTool(
      safeInput({
        transport: {
          async send() {
            return { output: { matchCount: 1, ref: "safe-summary-ref" } };
          }
        }
      })
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("called");
    expect(result.eventPreview.notWritten).toBe(true);
    expect(result.eventPreview.eventKind).toBe(
      "mcp_readonly_tool_result_summary"
    );
    expect(serialized).not.toContain("safe-summary-ref");
    expect(serialized).not.toContain("raw output");
    expectNoExecution(result);
  });
});
