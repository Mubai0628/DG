import { createHash } from "node:crypto";

import type { McpReadonlyToolCallResult } from "./mcp-readonly-tool-call.js";
import type { McpReadonlyToolReplaySummary } from "./mcp-readonly-tool-events.js";

export type McpReadonlyToolRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type McpReadonlyToolRedactionAuditSeverity = "blocker" | "warning";

export type McpReadonlyToolRedactionAuditFinding = {
  findingId: string;
  severity: McpReadonlyToolRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpReadonlyToolRedactionAuditInput = {
  callResult?: McpReadonlyToolCallResult | undefined;
  eventPayloads?: unknown[] | undefined;
  replaySummary?: McpReadonlyToolReplaySummary | undefined;
  maxOutputBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type McpReadonlyToolRedactionAudit = {
  status: McpReadonlyToolRedactionAuditStatus;
  auditId: string;
  recordCount: number;
  rawOutputDetected: boolean;
  rawArgsDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
  secretDetected: boolean;
  oversizedOutputDetected: boolean;
  eventPayloadSummaryOnly: boolean;
  replaySummaryOnly: boolean;
  outputHash?: string | undefined;
  outputBytes: number;
  redactionCountsPresent: boolean;
  redactionCounts: {
    secretMarkerCount: number;
    rawMarkerCount: number;
    mutatingMarkerCount: number;
    truncatedByteCount: number;
  };
  warningCodes: string[];
  findings: McpReadonlyToolRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: {
    canPersistRawOutput: false;
    canPersistRawArgs: false;
    canWriteEventStore: false;
    canInvokeMutatingTool: false;
    canExecuteGit: false;
    canExecuteShell: false;
    canIssuePermissionLease: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "runtime_mcp_readonly_tool_redaction_audit";
};

const defaultMaxOutputBytes = 65_536;

export function buildMcpReadonlyToolRedactionAudit(
  input: McpReadonlyToolRedactionAuditInput = {}
): McpReadonlyToolRedactionAudit {
  const findings: McpReadonlyToolRedactionAuditFinding[] = [];
  const records = [
    input.callResult,
    ...(input.eventPayloads ?? []),
    input.replaySummary
  ].filter((record) => record !== undefined);

  if (records.length === 0) {
    addFinding(
      findings,
      "warning",
      "NO_MCP_READONLY_TOOL_RECORDS",
      "No MCP read-only tool records were provided for redaction audit."
    );
  }

  for (const record of records) {
    scanRecord(record, findings);
  }

  const callResult = input.callResult;
  const maxOutputBytes = input.maxOutputBytes ?? defaultMaxOutputBytes;
  if (callResult !== undefined) {
    if (callResult.outputSummary.rawOutputPresent !== false) {
      addFinding(
        findings,
        "blocker",
        "RAW_OUTPUT_PRESENT",
        "MCP read-only tool output must not include raw output."
      );
    }
    if (callResult.outputBytes > maxOutputBytes) {
      addFinding(
        findings,
        "blocker",
        "OUTPUT_SIZE_LIMIT_EXCEEDED",
        "MCP read-only tool output summary exceeds the audit byte limit."
      );
    }
  }

  for (const payload of input.eventPayloads ?? []) {
    validateEventPayload(payload, findings);
  }
  if (input.replaySummary !== undefined) {
    validateReplaySummary(input.replaySummary, findings);
  }

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const rawOutputDetected = findings.some((finding) =>
    ["RAW_OUTPUT_FIELD_REJECTED", "RAW_OUTPUT_PRESENT"].includes(finding.code)
  );
  const rawArgsDetected = findings.some((finding) =>
    ["RAW_ARGS_FIELD_REJECTED", "RAW_ARGS_EVENT_PAYLOAD"].includes(finding.code)
  );
  const rawPromptSourceDiffDetected = findings.some((finding) =>
    [
      "RAW_PROMPT_FIELD_REJECTED",
      "RAW_SOURCE_FIELD_REJECTED",
      "RAW_DIFF_FIELD_REJECTED"
    ].includes(finding.code)
  );
  const secretDetected = findings.some((finding) =>
    [
      "SECRET_MARKER_REJECTED",
      "API_KEY_FIELD_REJECTED",
      "AUTHORIZATION_FIELD_REJECTED",
      "BEARER_FIELD_REJECTED"
    ].includes(finding.code)
  );
  const oversizedOutputDetected = findings.some(
    (finding) => finding.code === "OUTPUT_SIZE_LIMIT_EXCEEDED"
  );
  const eventPayloadSummaryOnly = (input.eventPayloads ?? []).every(
    (payload) =>
      isRecord(payload) &&
      payload.summaryOnly === true &&
      payload.rawArgsIncluded === false &&
      payload.rawOutputIncluded === false
  );
  const replaySummaryOnly =
    input.replaySummary === undefined ||
    (input.replaySummary.rawArgsIncluded === false &&
      input.replaySummary.rawOutputIncluded === false);
  const redactionCounts = callResult?.redactionCounts ?? {
    secretMarkerCount: 0,
    rawMarkerCount: 0,
    mutatingMarkerCount: 0,
    truncatedByteCount: 0
  };
  const status: McpReadonlyToolRedactionAuditStatus =
    records.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "audit_ready";
  const auditHash = hashSafe({
    status,
    recordCount: records.length,
    outputHash: callResult?.outputHash,
    outputBytes: callResult?.outputBytes ?? 0,
    redactionCounts,
    warningCodes: callResult?.summary.warningCodes ?? [],
    blockerCount,
    warningCount,
    eventPayloadSummaryOnly,
    replaySummaryOnly
  });

  return {
    status,
    auditId: input.idGenerator?.() ?? `mcp-readonly-redaction-${auditHash}`,
    recordCount: records.length,
    rawOutputDetected,
    rawArgsDetected,
    rawPromptSourceDiffDetected,
    secretDetected,
    oversizedOutputDetected,
    eventPayloadSummaryOnly,
    replaySummaryOnly,
    outputHash: callResult?.outputHash,
    outputBytes: callResult?.outputBytes ?? 0,
    redactionCountsPresent: callResult !== undefined,
    redactionCounts,
    warningCodes: callResult?.summary.warningCodes ?? [],
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: {
      canPersistRawOutput: false,
      canPersistRawArgs: false,
      canWriteEventStore: false,
      canInvokeMutatingTool: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "runtime_mcp_readonly_tool_redaction_audit"
  };
}

export function summarizeMcpReadonlyToolRedactionAudit(
  audit: McpReadonlyToolRedactionAudit
): {
  status: McpReadonlyToolRedactionAuditStatus;
  auditId: string;
  recordCount: number;
  rawOutputDetected: boolean;
  secretDetected: boolean;
  outputBytes: number;
  blockerCount: number;
  warningCount: number;
  auditHash: string;
  source: "runtime_mcp_readonly_tool_redaction_audit";
} {
  return {
    status: audit.status,
    auditId: audit.auditId,
    recordCount: audit.recordCount,
    rawOutputDetected: audit.rawOutputDetected,
    secretDetected: audit.secretDetected,
    outputBytes: audit.outputBytes,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    auditHash: audit.auditHash,
    source: audit.source
  };
}

function validateEventPayload(
  payload: unknown,
  findings: McpReadonlyToolRedactionAuditFinding[]
): void {
  if (!isRecord(payload) || payload.summaryOnly !== true) {
    addFinding(
      findings,
      "blocker",
      "EVENT_PAYLOAD_NOT_SUMMARY_ONLY",
      "MCP read-only tool event payload must be summary-only."
    );
    return;
  }
  if (payload.rawArgsIncluded !== false) {
    addFinding(
      findings,
      "blocker",
      "RAW_ARGS_EVENT_PAYLOAD",
      "MCP read-only tool event payload must not include raw args."
    );
  }
  if (payload.rawOutputIncluded !== false) {
    addFinding(
      findings,
      "blocker",
      "RAW_OUTPUT_EVENT_PAYLOAD",
      "MCP read-only tool event payload must not include raw output."
    );
  }
}

function validateReplaySummary(
  replaySummary: McpReadonlyToolReplaySummary,
  findings: McpReadonlyToolRedactionAuditFinding[]
): void {
  if (
    replaySummary.rawArgsIncluded !== false ||
    replaySummary.rawOutputIncluded !== false
  ) {
    addFinding(
      findings,
      "blocker",
      "REPLAY_RAW_CONTENT_REJECTED",
      "MCP read-only replay summary must not include raw args or raw output."
    );
  }
}

function scanRecord(
  record: unknown,
  findings: McpReadonlyToolRedactionAuditFinding[],
  path = "$"
): void {
  if (Array.isArray(record)) {
    record.forEach((item, index) =>
      scanRecord(item, findings, `${path}[${index}]`)
    );
    return;
  }
  if (typeof record === "string") {
    if (
      /sk-[A-Za-z0-9_-]{8,}|Authorization\s*:|Bearer\s+[A-Za-z0-9._-]{8,}|PRIVATE KEY/i.test(
        record
      )
    ) {
      addFinding(
        findings,
        "blocker",
        "SECRET_MARKER_REJECTED",
        "MCP read-only tool audit rejected a secret-like marker.",
        path
      );
    }
    return;
  }
  if (!isRecord(record)) {
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const code = forbiddenFieldCodes.get(normalized);
    if (code !== undefined) {
      addFinding(
        findings,
        "blocker",
        code,
        "MCP read-only tool audit rejected a forbidden raw or execution field.",
        `${path}.${key}`
      );
    }
    scanRecord(value, findings, `${path}.${key}`);
  }
}

const forbiddenFieldCodes = new Map<string, string>(
  [
    [["raw", "args"], "RAW_ARGS_FIELD_REJECTED"],
    [["raw", "arguments"], "RAW_ARGS_FIELD_REJECTED"],
    [["raw", "output"], "RAW_OUTPUT_FIELD_REJECTED"],
    [["raw", "prompt"], "RAW_PROMPT_FIELD_REJECTED"],
    [["raw", "source"], "RAW_SOURCE_FIELD_REJECTED"],
    [["raw", "diff"], "RAW_DIFF_FIELD_REJECTED"],
    [["api", "key"], "API_KEY_FIELD_REJECTED"],
    [["authorization"], "AUTHORIZATION_FIELD_REJECTED"],
    [["bearer"], "BEARER_FIELD_REJECTED"],
    [["token"], "TOKEN_FIELD_REJECTED"],
    [["secret"], "SECRET_FIELD_REJECTED"],
    [["command"], "COMMAND_FIELD_REJECTED"],
    [["shell", "command"], "SHELL_COMMAND_FIELD_REJECTED"],
    [["git", "command"], "GIT_COMMAND_FIELD_REJECTED"],
    [["event", "store", "write"], "EVENTSTORE_WRITE_FIELD_REJECTED"],
    [["apply", "now"], "APPLY_NOW_FIELD_REJECTED"],
    [["rollback", "now"], "ROLLBACK_NOW_FIELD_REJECTED"],
    [["permission", "lease"], "PERMISSION_LEASE_FIELD_REJECTED"]
  ].map(([parts, code]) => [(parts as string[]).join(""), code as string])
);

function addFinding(
  findings: McpReadonlyToolRedactionAuditFinding[],
  severity: McpReadonlyToolRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-readonly-redaction-${findings.length + 1}`,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashSafe(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

function nextActionFor(status: McpReadonlyToolRedactionAuditStatus): string {
  switch (status) {
    case "blocked":
      return "Reject MCP read-only tool output until raw output, raw args, secret, and summary-only blockers are cleared.";
    case "warning":
      return "Review MCP read-only tool audit warnings before surfacing the summary.";
    case "audit_ready":
      return "MCP read-only tool output is summary-only and ready for smoke evidence.";
    case "empty":
    default:
      return "Provide MCP read-only tool call, event, and replay summaries for audit.";
  }
}
