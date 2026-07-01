import { createHash } from "node:crypto";

import {
  type EventRecord,
  type EventStore,
  type EventType
} from "../events/index.js";

import type { CapabilityDescriptor, CapabilityRiskLevel } from "./types.js";
import type {
  McpReadonlyToolCallResult,
  McpReadonlyToolRedactionCounts
} from "./mcp-readonly-tool-call.js";
import type { McpReadonlyToolContractSummary } from "./mcp-readonly-tool-contract.js";

export const mcpReadonlyToolEventTypes = [
  "mcp.readonly_tool.proposed",
  "mcp.readonly_tool.approved",
  "mcp.readonly_tool.executed",
  "mcp.readonly_tool.result",
  "mcp.readonly_tool.rejected"
] as const satisfies readonly EventType[];

export type McpReadonlyToolEventType =
  (typeof mcpReadonlyToolEventTypes)[number];

export type McpReadonlyToolCapabilityDescriptorInput = {
  contractSummary: McpReadonlyToolContractSummary;
  title?: string | undefined;
  owner?: string | undefined;
  version?: string | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
};

export type McpReadonlyToolSummaryEventInput = {
  callResult: McpReadonlyToolCallResult;
  receiptId: string;
  contractId?: string | undefined;
  taskId?: string | undefined;
  agentId?: string | undefined;
};

export type McpReadonlyToolSummaryEventPayload = {
  title: string;
  eventKind: McpReadonlyToolEventType;
  connectionProfileRef: string;
  toolId: string;
  contractId: string;
  receiptId: string;
  callId: string;
  outputHash: string;
  outputBytes: number;
  redactionCounts: McpReadonlyToolRedactionCounts;
  warningCount: number;
  warningCodes: string[];
  rawArgsIncluded: false;
  rawOutputIncluded: false;
  summaryOnly: true;
  source: "runtime_mcp_readonly_tool_summary_event";
};

export type McpReadonlyToolReplaySummary = {
  status: "empty" | "ready" | "warning" | "rejected";
  eventCount: number;
  proposedCount: number;
  approvedCount: number;
  executedCount: number;
  resultCount: number;
  rejectedCount: number;
  toolIds: string[];
  callIds: string[];
  outputHashes: string[];
  warningCount: number;
  redactionCounts: McpReadonlyToolRedactionCounts;
  rawArgsIncluded: false;
  rawOutputIncluded: false;
  replayHash: string;
  source: "runtime_mcp_readonly_tool_replay_summary";
};

export type McpReadonlyToolEventIntegrationResult = {
  status: "ready" | "warning" | "rejected";
  eventIds: string[];
  eventCount: number;
  eventTypes: McpReadonlyToolEventType[];
  replaySummary: McpReadonlyToolReplaySummary;
  summaryOnly: true;
  wroteRawArgs: false;
  wroteRawOutput: false;
  canWriteEventStore: false;
  canInvokeMutatingTool: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  source: "runtime_mcp_readonly_tool_event_integration";
};

export function createMcpReadonlyToolCapabilityDescriptor(
  input: McpReadonlyToolCapabilityDescriptorInput
): CapabilityDescriptor {
  const { contractSummary } = input;
  return {
    id: `mcp.readonly_tool.${safeDescriptorSegment(contractSummary.toolId)}`,
    title: input.title ?? `MCP read-only tool: ${contractSummary.toolName}`,
    sourceType: "mcp",
    category: "knowledge",
    riskLevel: input.riskLevel ?? "A1_read",
    invokePolicy: "ASK_FIRST",
    executionMode: "READ_ONLY",
    inputSchema: {
      summaryOnly: true,
      allowedArgumentKeys: contractSummary.allowedArgumentKeys,
      rawArgsIncluded: false
    },
    outputSchema: {
      summaryOnly: true,
      rawOutputIncluded: false,
      outputHashRequired: true,
      redactionCountsRequired: true
    },
    supportsDryRun: true,
    requiresElicitation: true,
    canWriteMemory: false,
    trustTier: "restricted",
    version: input.version ?? "0.19.0",
    owner: input.owner ?? "runtime",
    description:
      "Fixed MCP read-only tool descriptor. Ask-first/manual approval is required; mutating tools, broad leases, raw args, and raw output are not allowed.",
    eventTypes: [...mcpReadonlyToolEventTypes]
  };
}

export function buildMcpReadonlyToolSummaryEvents(
  input: McpReadonlyToolSummaryEventInput
): McpReadonlyToolSummaryEventPayload[] {
  assertSummarySafe(input.callResult);
  const eventTypes = eventTypesForCall(input.callResult);
  return eventTypes.map((eventType) => buildPayload(eventType, input));
}

export function appendMcpReadonlyToolSummaryEvents(
  eventStore: EventStore,
  input: McpReadonlyToolSummaryEventInput
): McpReadonlyToolEventIntegrationResult {
  const payloads = buildMcpReadonlyToolSummaryEvents(input);
  const eventIds = payloads.map((payload) => {
    const record = eventStore.appendEvent({
      type: payload.eventKind,
      payload,
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {})
    });
    return record.id;
  });
  const replaySummary = projectMcpReadonlyToolReplay(eventStore.listEvents());
  const rejected = payloads.some(
    (payload) => payload.eventKind === "mcp.readonly_tool.rejected"
  );
  const warning =
    !rejected &&
    payloads.some(
      (payload) => payload.warningCount > 0 || payload.warningCodes.length > 0
    );

  return {
    status: rejected ? "rejected" : warning ? "warning" : "ready",
    eventIds,
    eventCount: payloads.length,
    eventTypes: payloads.map((payload) => payload.eventKind),
    replaySummary,
    summaryOnly: true,
    wroteRawArgs: false,
    wroteRawOutput: false,
    canWriteEventStore: false,
    canInvokeMutatingTool: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    source: "runtime_mcp_readonly_tool_event_integration"
  };
}

export function projectMcpReadonlyToolReplay(
  events: readonly EventRecord[]
): McpReadonlyToolReplaySummary {
  const relevant = events.filter(isMcpReadonlyToolEvent);
  const redactionCounts = emptyRedactionCounts();
  const toolIds = new Set<string>();
  const callIds = new Set<string>();
  const outputHashes = new Set<string>();
  let warningCount = 0;
  let rawArgsIncluded = false;
  let rawOutputIncluded = false;

  for (const event of relevant) {
    const payload =
      event.payload as Partial<McpReadonlyToolSummaryEventPayload>;
    if (typeof payload.toolId === "string") {
      toolIds.add(payload.toolId);
    }
    if (typeof payload.callId === "string") {
      callIds.add(payload.callId);
    }
    if (typeof payload.outputHash === "string") {
      outputHashes.add(payload.outputHash);
    }
    warningCount += safeNumber(payload.warningCount);
    if (payload.redactionCounts !== undefined) {
      redactionCounts.secretMarkerCount += safeNumber(
        payload.redactionCounts.secretMarkerCount
      );
      redactionCounts.rawMarkerCount += safeNumber(
        payload.redactionCounts.rawMarkerCount
      );
      redactionCounts.mutatingMarkerCount += safeNumber(
        payload.redactionCounts.mutatingMarkerCount
      );
      redactionCounts.truncatedByteCount += safeNumber(
        payload.redactionCounts.truncatedByteCount
      );
    }
    rawArgsIncluded ||= payload.rawArgsIncluded !== false;
    rawOutputIncluded ||= payload.rawOutputIncluded !== false;
  }

  const proposedCount = countType(relevant, "mcp.readonly_tool.proposed");
  const approvedCount = countType(relevant, "mcp.readonly_tool.approved");
  const executedCount = countType(relevant, "mcp.readonly_tool.executed");
  const resultCount = countType(relevant, "mcp.readonly_tool.result");
  const rejectedCount = countType(relevant, "mcp.readonly_tool.rejected");
  const status =
    relevant.length === 0
      ? "empty"
      : rejectedCount > 0
        ? "rejected"
        : warningCount > 0
          ? "warning"
          : "ready";

  return {
    status,
    eventCount: relevant.length,
    proposedCount,
    approvedCount,
    executedCount,
    resultCount,
    rejectedCount,
    toolIds: [...toolIds].sort(),
    callIds: [...callIds].sort(),
    outputHashes: [...outputHashes].sort(),
    warningCount,
    redactionCounts,
    rawArgsIncluded: rawArgsIncluded as false,
    rawOutputIncluded: rawOutputIncluded as false,
    replayHash: hashSafe({
      eventCount: relevant.length,
      proposedCount,
      approvedCount,
      executedCount,
      resultCount,
      rejectedCount,
      toolIds: [...toolIds].sort(),
      callIds: [...callIds].sort(),
      outputHashes: [...outputHashes].sort(),
      warningCount,
      redactionCounts
    }),
    source: "runtime_mcp_readonly_tool_replay_summary"
  };
}

function buildPayload(
  eventKind: McpReadonlyToolEventType,
  input: McpReadonlyToolSummaryEventInput
): McpReadonlyToolSummaryEventPayload {
  const result = input.callResult;
  const contractId =
    input.contractId ??
    result.contractSummary?.contractId ??
    result.summary.contractHash;
  const payload: McpReadonlyToolSummaryEventPayload = {
    title: `MCP read-only tool ${lastSegment(eventKind)}: ${result.toolId}`,
    eventKind,
    connectionProfileRef: result.connectionProfileRef,
    toolId: result.toolId,
    contractId,
    receiptId: input.receiptId,
    callId: result.callId,
    outputHash: result.outputHash,
    outputBytes: result.outputBytes,
    redactionCounts: result.redactionCounts,
    warningCount: result.warningCount,
    warningCodes: [...result.summary.warningCodes],
    rawArgsIncluded: false,
    rawOutputIncluded: false,
    summaryOnly: true,
    source: "runtime_mcp_readonly_tool_summary_event"
  };
  assertSummarySafe(payload);
  return payload;
}

function eventTypesForCall(
  result: McpReadonlyToolCallResult
): McpReadonlyToolEventType[] {
  if (result.status === "blocked") {
    return ["mcp.readonly_tool.proposed", "mcp.readonly_tool.rejected"];
  }
  if (result.readiness.calledReadonlyTool) {
    return [
      "mcp.readonly_tool.proposed",
      "mcp.readonly_tool.approved",
      "mcp.readonly_tool.executed",
      "mcp.readonly_tool.result"
    ];
  }
  return ["mcp.readonly_tool.proposed"];
}

function isMcpReadonlyToolEvent(event: EventRecord): boolean {
  return mcpReadonlyToolEventTypes.includes(
    event.type as McpReadonlyToolEventType
  );
}

function countType(
  events: readonly EventRecord[],
  type: McpReadonlyToolEventType
): number {
  return events.filter((event) => event.type === type).length;
}

function assertSummarySafe(value: unknown): void {
  const forbidden = findForbiddenField(value);
  if (forbidden !== undefined) {
    throw new Error(`MCP read-only tool summary event rejected: ${forbidden}`);
  }
  const serialized = JSON.stringify(value);
  if (
    /sk-[a-z0-9_-]{8,}|authorization\s*:|bearer\s+[a-z0-9._-]{8,}|private key/i.test(
      serialized
    )
  ) {
    throw new Error("MCP read-only tool summary event rejected: secret marker");
  }
}

function findForbiddenField(value: unknown, path = "$"): string | undefined {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenField(value[index], `${path}[${index}]`);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (forbiddenFieldNames.has(normalized)) {
      return `${path}.${key}`;
    }
    const found = findForbiddenField(child, `${path}.${key}`);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

const forbiddenFieldNames = new Set(
  [
    ["raw", "args"],
    ["raw", "arguments"],
    ["raw", "output"],
    ["raw", "prompt"],
    ["raw", "response"],
    ["raw", "source"],
    ["raw", "diff"],
    ["raw", "csv"],
    ["api", "key"],
    ["api", "key", "value"],
    ["authorization"],
    ["bearer"],
    ["token"],
    ["secret"],
    ["command"],
    ["shell", "command"],
    ["git", "command"],
    ["event", "store", "write"],
    ["apply", "now"],
    ["rollback", "now"],
    ["permission", "lease"],
    ["native", "bridge"],
    ["desktop", "action"]
  ].map((parts) => parts.join(""))
);

function safeDescriptorSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, ".")
    .replace(/^[._:-]+|[._:-]+$/g, "");
  return normalized.length > 0 ? normalized : "tool";
}

function lastSegment(value: string): string {
  const parts = value.split(".");
  return parts[parts.length - 1] ?? value;
}

function emptyRedactionCounts(): McpReadonlyToolRedactionCounts {
  return {
    secretMarkerCount: 0,
    rawMarkerCount: 0,
    mutatingMarkerCount: 0,
    truncatedByteCount: 0
  };
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hashSafe(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}
