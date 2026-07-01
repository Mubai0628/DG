import { safeText } from "./safety.js";
import type {
  McpReadonlyToolCallCommandRequest,
  McpReadonlyToolCallCommandResult
} from "./desktop-flow.js";

export type McpReadonlyToolExecutionStatus =
  | "needs_approval"
  | "ready_to_call"
  | "calling"
  | "called"
  | "blocked";

export type McpReadonlyToolExecutionFindingSeverity = "blocker" | "warning";

export type McpReadonlyToolExecutionFinding = {
  code: string;
  severity: McpReadonlyToolExecutionFindingSeverity;
  safeMessage: string;
};

export type McpReadonlyToolExecutionReadiness = {
  canSubmitReadonlyToolCall: boolean;
  canInvokeMutatingTool: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type McpReadonlyToolExecutionView = {
  status: McpReadonlyToolExecutionStatus;
  source: "app_mcp_readonly_tool_execution_surface";
  executionViewId: string;
  connectionProfileRef: string;
  toolId: string;
  toolName: string;
  riskLevel: "safe_readonly";
  inputSchemaSummary: string;
  argumentSummary: string;
  approvalReceiptId: string;
  typedConfirmation: string;
  typedConfirmationRequired: "CALL READONLY MCP TOOL";
  resultStatus?: "called" | undefined;
  outputHashPrefix?: string | undefined;
  outputBytes?: number | undefined;
  outputLineCount?: number | undefined;
  redactionSummary: {
    secretMarkerCount: number;
    rawMarkerCount: number;
    mutatingMarkerCount: number;
    truncatedByteCount: number;
  };
  warningCodes: string[];
  eventSummary: {
    eventType: "mcp.readonly_tool.result";
    notWritten: true;
    summaryOnly: true;
  };
  replaySummary: {
    status: "empty" | "result_summary_ready";
    resultEventCount: number;
    rawOutputIncluded: false;
    rawArgsIncluded: false;
  };
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: McpReadonlyToolExecutionFinding[];
  safeCallRequest?: McpReadonlyToolCallCommandRequest | undefined;
  readiness: McpReadonlyToolExecutionReadiness;
  nextAction: string;
};

export type McpReadonlyToolExecutionViewInput = {
  connectionProfileRef?: string | undefined;
  toolId?: string | undefined;
  toolName?: string | undefined;
  typedConfirmation?: string | undefined;
  argumentSummary?: string | undefined;
  result?: McpReadonlyToolCallCommandResult | undefined;
  errorSummary?: string | undefined;
  inFlight?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const requiredConfirmation = "CALL READONLY MCP TOOL" as const;
const defaultConnectionProfileRef = "mcp-profile.docs-readonly";
const defaultToolId = "docs.search";
const defaultToolName = "docs.search";
const defaultArgumentSummary = "querySummaryHash=docs-safe; maxResults=3";
const defaultMaxOutputBytes = 8192;
const defaultTimeoutMs = 5000;

const mutatingNamePattern =
  /(^|[._:-])(write|update|delete|remove|create|patch|apply|execute|shell|command|git|commit|push)([._:-]|$)/i;

export function buildMcpReadonlyToolExecutionView(
  input: McpReadonlyToolExecutionViewInput = {}
): McpReadonlyToolExecutionView {
  const connectionProfileRef = safeRef(
    input.connectionProfileRef,
    defaultConnectionProfileRef
  );
  const toolId = safeRef(input.toolId, defaultToolId);
  const toolName = safeRef(input.toolName, defaultToolName);
  const argumentSummary = safeText(
    input.argumentSummary ?? defaultArgumentSummary,
    defaultArgumentSummary
  );
  const typedConfirmation = safeText(input.typedConfirmation, "");
  const findings: McpReadonlyToolExecutionFinding[] = [];

  if (input.errorSummary !== undefined && input.errorSummary.trim() !== "") {
    findings.push({
      code: "CALL_ERROR_SUMMARY",
      severity: "blocker",
      safeMessage: safeText(input.errorSummary, "MCP read-only call failed.")
    });
  }
  if (typedConfirmation !== requiredConfirmation) {
    findings.push({
      code: "TYPED_CONFIRMATION_REQUIRED",
      severity: "warning",
      safeMessage:
        "Exact typed confirmation is required before a read-only MCP tool call."
    });
  }
  if (mutatingNamePattern.test(toolId) || mutatingNamePattern.test(toolName)) {
    findings.push({
      code: "MUTATING_TOOL_REJECTED",
      severity: "blocker",
      safeMessage: "Mutating MCP tool names are blocked."
    });
  }
  if (containsUnsafeText(argumentSummary)) {
    findings.push({
      code: "UNSAFE_ARGUMENT_SUMMARY_REJECTED",
      severity: "blocker",
      safeMessage: "MCP argument summary contains unsafe content."
    });
  }
  if (input.result !== undefined) {
    findings.push(...validateResult(input.result));
  }

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const safeCallRequest =
    blockerCount === 0 && typedConfirmation === requiredConfirmation
      ? buildSafeCallRequest({
          connectionProfileRef,
          toolId,
          toolName,
          typedConfirmation,
          argumentSummary
        })
      : undefined;
  const status: McpReadonlyToolExecutionStatus =
    blockerCount > 0
      ? "blocked"
      : input.inFlight === true
        ? "calling"
        : input.result !== undefined
          ? "called"
          : safeCallRequest !== undefined
            ? "ready_to_call"
            : "needs_approval";
  const redactionSummary = input.result?.redactionCounts ?? {
    secretMarkerCount: 0,
    rawMarkerCount: 0,
    mutatingMarkerCount: 0,
    truncatedByteCount: 0
  };

  return {
    status,
    source: "app_mcp_readonly_tool_execution_surface",
    executionViewId:
      input.idGenerator?.() ??
      `mcp-readonly-tool-execution-${hashText(
        `${connectionProfileRef}:${toolId}:${argumentSummary}`
      ).slice(0, 12)}`,
    connectionProfileRef,
    toolId,
    toolName,
    riskLevel: "safe_readonly",
    inputSchemaSummary: "querySummary, maxResults",
    argumentSummary,
    approvalReceiptId: "mcp-readonly-tool-receipt-app-preview",
    typedConfirmation,
    typedConfirmationRequired: requiredConfirmation,
    resultStatus: input.result?.status,
    outputHashPrefix: input.result?.outputHash.slice(0, 12),
    outputBytes: input.result?.outputBytes,
    outputLineCount: input.result?.outputSummary.outputLineCount,
    redactionSummary,
    warningCodes: input.result?.warningCodes ?? [],
    eventSummary: {
      eventType: "mcp.readonly_tool.result",
      notWritten: true,
      summaryOnly: true
    },
    replaySummary: {
      status: input.result === undefined ? "empty" : "result_summary_ready",
      resultEventCount: input.result === undefined ? 0 : 1,
      rawOutputIncluded: false,
      rawArgsIncluded: false
    },
    blockerCount,
    warningCount,
    findingCount: findings.length,
    findings,
    safeCallRequest,
    readiness: {
      canSubmitReadonlyToolCall: safeCallRequest !== undefined,
      canInvokeMutatingTool: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status)
  };
}

export function summarizeMcpReadonlyToolExecutionView(
  view: McpReadonlyToolExecutionView
): {
  status: McpReadonlyToolExecutionStatus;
  toolId: string;
  connectionProfileRef: string;
  blockerCount: number;
  warningCount: number;
  outputHashPrefix?: string | undefined;
  replayStatus: "empty" | "result_summary_ready";
  nextAction: string;
  source: "app_mcp_readonly_tool_execution_surface";
} {
  return {
    status: view.status,
    toolId: view.toolId,
    connectionProfileRef: view.connectionProfileRef,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    outputHashPrefix: view.outputHashPrefix,
    replayStatus: view.replaySummary.status,
    nextAction: view.nextAction,
    source: view.source
  };
}

function buildSafeCallRequest(input: {
  connectionProfileRef: string;
  toolId: string;
  toolName: string;
  typedConfirmation: typeof requiredConfirmation;
  argumentSummary: string;
}): McpReadonlyToolCallCommandRequest {
  const contractHash = hashText(
    `${input.connectionProfileRef}:${input.toolId}:${input.argumentSummary}`
  );
  return {
    connectionProfileRef: input.connectionProfileRef,
    serverProfile: {
      profileId: input.connectionProfileRef,
      serverKind: "mcp",
      transportKind: "injected_test_transport",
      displayName: "Docs MCP read-only test transport",
      fixedResultSummary: "MCP read-only tool returned bounded summary refs."
    },
    toolContractSummary: {
      contractId: `mcp-readonly-tool-contract-${contractHash.slice(0, 12)}`,
      profileRefHash: hashText(input.connectionProfileRef),
      serverIdentityHash: hashText("docs-mcp-readonly"),
      toolId: input.toolId,
      toolName: input.toolName,
      toolDescriptionSummaryHash: hashText("docs search summary"),
      toolInputSchemaSummaryHash: hashText("querySummary maxResults"),
      declaredReadOnly: true,
      riskLevel: "safe_readonly",
      allowedArgumentKeys: ["querySummary", "maxResults"],
      deniedArgumentKeyCount: 0,
      maxInputBytes: 2048,
      maxOutputBytes: defaultMaxOutputBytes,
      timeoutMs: defaultTimeoutMs,
      approvalRequired: true,
      typedConfirmationRequired: true,
      allowedWorkspaceCount: 1,
      warningCodes: [],
      contractHash
    },
    approvalReceipt: {
      receiptId: "mcp-readonly-tool-receipt-app-preview",
      toolId: input.toolId,
      connectionProfileRef: input.connectionProfileRef,
      typedConfirmation: input.typedConfirmation,
      allowedArgumentKeys: ["querySummary", "maxResults"],
      maxOutputBytes: defaultMaxOutputBytes,
      expiresAt: "2026-12-31T23:59:59.000Z",
      receiptHash: hashText(`receipt:${contractHash}`)
    },
    argumentSummary: input.argumentSummary,
    argumentValues: {
      querySummary: "docs query summary ref",
      maxResults: 3
    },
    maxOutputBytes: defaultMaxOutputBytes,
    timeoutMs: defaultTimeoutMs
  };
}

function validateResult(
  result: McpReadonlyToolCallCommandResult
): McpReadonlyToolExecutionFinding[] {
  const findings: McpReadonlyToolExecutionFinding[] = [];
  if (
    result.rawOutputIncluded !== false ||
    result.rawArgsIncluded !== false ||
    result.outputSummary.rawOutputIncluded !== false ||
    result.eventPreview.rawOutputIncluded !== false
  ) {
    findings.push({
      code: "RAW_OUTPUT_REJECTED",
      severity: "blocker",
      safeMessage: "MCP read-only result must remain summary-only."
    });
  }
  if (
    result.canCallMcpTool !== false ||
    result.canInvokeMutatingTool !== false ||
    result.canWriteEventStore !== false ||
    result.canExecuteGit !== false ||
    result.canExecuteShell !== false ||
    result.canIssuePermissionLease !== false ||
    result.appCanExecute !== false
  ) {
    findings.push({
      code: "EXECUTION_FLAG_REJECTED",
      severity: "blocker",
      safeMessage: "MCP read-only result cannot enable execution flags."
    });
  }
  return findings;
}

function nextActionFor(status: McpReadonlyToolExecutionStatus): string {
  switch (status) {
    case "blocked":
      return "Resolve blockers before attempting a read-only MCP tool call.";
    case "ready_to_call":
      return "Call the fixed read-only MCP tool wrapper. No mutating tool or EventStore write is enabled.";
    case "calling":
      return "Waiting for the fixed read-only MCP tool wrapper to return a summary.";
    case "called":
      return "Review the result summary and replay preview. Raw output and raw args remain hidden.";
    case "needs_approval":
    default:
      return "Enter the exact typed confirmation to enable the fixed read-only MCP tool call.";
  }
}

function safeRef(value: string | undefined, fallback: string): string {
  const text = safeText(value, fallback).trim();
  if (/^[A-Za-z0-9._:-]{1,120}$/.test(text) && !text.includes("..")) {
    return text;
  }
  return fallback;
}

function containsUnsafeText(value: string): boolean {
  return (
    /sk-[A-Za-z0-9_-]{8,}/i.test(value) ||
    /Bearer\s+[A-Za-z0-9._-]{8,}/i.test(value) ||
    /Authorization\s*:/i.test(value) ||
    /raw\s+(?:prompt|output|source|diff|args)/i.test(value)
  );
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
