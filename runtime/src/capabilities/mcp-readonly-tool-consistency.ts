import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type McpReadonlyToolConsistencyStatus =
  | "consistency_ready"
  | "warning"
  | "blocked";

export type McpReadonlyToolConsistencySeverity = "blocker" | "warning";

export type McpReadonlyToolConsistencyFindingKind =
  | "contract"
  | "allowlist"
  | "descriptor"
  | "profile"
  | "approval"
  | "confirmation"
  | "bounds"
  | "redaction"
  | "event"
  | "replay"
  | "raw_field"
  | "secret"
  | "execution";

export type McpReadonlyToolConsistencyFinding = {
  findingId: string;
  kind: McpReadonlyToolConsistencyFindingKind;
  severity: McpReadonlyToolConsistencySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpReadonlyToolConsistencyReadiness = {
  canReviewMcpReadonlyConsistency: boolean;
  canInvokeMcpTool: false;
  canInvokeMutatingMcpTool: false;
  canUseArbitraryMcpTool: false;
  canWriteEventStoreRaw: false;
  canPersistRawOutput: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpReadonlyConsistencyToolContractSummary = {
  toolId?: string | undefined;
  descriptorId?: string | undefined;
  profileId?: string | undefined;
  readOnly?: boolean | undefined;
  allowlisted?: boolean | undefined;
  typedConfirmation?: string | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  operationKind?: string | undefined;
  [key: string]: unknown;
};

export type McpReadonlyConsistencyToolResultSummary = {
  toolId?: string | undefined;
  descriptorId?: string | undefined;
  profileId?: string | undefined;
  approvalReceiptId?: string | undefined;
  typedConfirmation?: string | undefined;
  timeoutMs?: number | undefined;
  outputBytes?: number | undefined;
  outputSummaryHash?: string | undefined;
  redactionSummaryPresent?: boolean | undefined;
  eventSummaryPresent?: boolean | undefined;
  replayProjectionPresent?: boolean | undefined;
  mutating?: boolean | undefined;
  [key: string]: unknown;
};

export type McpReadonlyConsistencyToolApprovalSummary = {
  receiptId?: string | undefined;
  toolId?: string | undefined;
  descriptorId?: string | undefined;
  profileId?: string | undefined;
  typedConfirmation?: string | undefined;
  approved?: boolean | undefined;
  [key: string]: unknown;
};

export type McpReadonlyToolConsistencyInput = {
  contract?: McpReadonlyConsistencyToolContractSummary | undefined;
  toolResult?: McpReadonlyConsistencyToolResultSummary | undefined;
  approvalReceipt?: McpReadonlyConsistencyToolApprovalSummary | undefined;
  redactionSummary?:
    | {
        redactedFieldCount?: number;
        rawFieldDetectedCount?: number;
        [key: string]: unknown;
      }
    | undefined;
  eventSummary?:
    | {
        eventId?: string;
        toolId?: string;
        descriptorId?: string;
        [key: string]: unknown;
      }
    | undefined;
  replayProjection?:
    | {
        replayId?: string;
        toolId?: string;
        descriptorId?: string;
        [key: string]: unknown;
      }
    | undefined;
  allowlistedToolIds?: string[] | undefined;
  maxTimeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type McpReadonlyToolConsistencyReport = {
  status: McpReadonlyToolConsistencyStatus;
  consistencyId: string;
  source: "runtime_mcp_readonly_tool_consistency";
  toolIdHash?: string | undefined;
  descriptorIdHash?: string | undefined;
  profileRef?: string | undefined;
  approvalHash?: string | undefined;
  outputSummary: {
    outputBytes: number;
    maxOutputBytes: number;
    outputSummaryHash?: string | undefined;
  };
  redactionCounts: {
    redactedFieldCount: number;
    rawFieldDetectedCount: number;
  };
  eventReplayCounts: {
    eventSummaryCount: number;
    replayProjectionCount: number;
  };
  findings: McpReadonlyToolConsistencyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  consistencyHash: string;
  readiness: McpReadonlyToolConsistencyReadiness;
  nextAction: string;
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawstderr", "RAW_STDERR_FIELD_REJECTED"],
  ["rawstdout", "RAW_STDOUT_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["mutatingtoolcall", "MUTATING_TOOL_FIELD_REJECTED"]
]);

const executionReadinessKeys = new Set(
  [
    "canInvokeMcpTool",
    "canInvokeMutatingMcpTool",
    "canUseArbitraryMcpTool",
    "canWriteEventStoreRaw",
    "canPersistRawOutput",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretPatterns = [
  {
    code: "API_KEY_MARKER_REJECTED",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/
  },
  {
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /\bAuthorization\s*[:=]/i
  }
];

export function buildMcpReadonlyToolConsistencyReport(
  input: McpReadonlyToolConsistencyInput = {}
): McpReadonlyToolConsistencyReport {
  const findings = validateMcpReadonlyToolConsistency(input);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpReadonlyToolConsistencyStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "consistency_ready";
  const toolId = safeText(
    input.contract?.toolId,
    safeText(input.toolResult?.toolId)
  );
  const descriptorId = safeText(
    input.contract?.descriptorId,
    safeText(input.toolResult?.descriptorId)
  );
  const outputBytes = safeNumber(input.toolResult?.outputBytes);
  const maxOutputBytes =
    safeNumber(input.contract?.maxOutputBytes) ||
    safeNumber(input.maxOutputBytes) ||
    64_000;
  const consistencyHash = stablePreviewHash(
    stableStringify({
      status,
      toolId,
      descriptorId,
      profileId: input.contract?.profileId ?? input.toolResult?.profileId,
      outputBytes,
      maxOutputBytes,
      findingCodes: findings.map((finding) => finding.code)
    })
  );
  const consistencyId =
    input.idGenerator?.() ??
    `mcp-readonly-consistency-${consistencyHash.slice(0, 12)}`;

  return {
    status,
    consistencyId,
    source: "runtime_mcp_readonly_tool_consistency",
    toolIdHash:
      toolId.length > 0 ? stablePreviewHash(toolId).slice(0, 16) : undefined,
    descriptorIdHash:
      descriptorId.length > 0
        ? stablePreviewHash(descriptorId).slice(0, 16)
        : undefined,
    profileRef:
      safeText(
        input.contract?.profileId,
        safeText(input.toolResult?.profileId)
      ) || undefined,
    approvalHash:
      input.approvalReceipt === undefined
        ? undefined
        : stablePreviewHash(
            stableStringify(safeApproval(input.approvalReceipt))
          ).slice(0, 16),
    outputSummary: {
      outputBytes,
      maxOutputBytes,
      outputSummaryHash: input.toolResult?.outputSummaryHash
    },
    redactionCounts: {
      redactedFieldCount: safeNumber(
        input.redactionSummary?.redactedFieldCount
      ),
      rawFieldDetectedCount: safeNumber(
        input.redactionSummary?.rawFieldDetectedCount
      )
    },
    eventReplayCounts: {
      eventSummaryCount: input.eventSummary === undefined ? 0 : 1,
      replayProjectionCount: input.replayProjection === undefined ? 0 : 1
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    consistencyHash,
    readiness: readinessFor(status !== "blocked"),
    nextAction: nextActionFor(status)
  };
}

export function summarizeMcpReadonlyToolConsistency(
  report: McpReadonlyToolConsistencyReport
): Pick<
  McpReadonlyToolConsistencyReport,
  | "status"
  | "consistencyId"
  | "toolIdHash"
  | "descriptorIdHash"
  | "profileRef"
  | "approvalHash"
  | "outputSummary"
  | "redactionCounts"
  | "eventReplayCounts"
  | "blockerCount"
  | "warningCount"
  | "consistencyHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    consistencyId: report.consistencyId,
    toolIdHash: report.toolIdHash,
    descriptorIdHash: report.descriptorIdHash,
    profileRef: report.profileRef,
    approvalHash: report.approvalHash,
    outputSummary: report.outputSummary,
    redactionCounts: report.redactionCounts,
    eventReplayCounts: report.eventReplayCounts,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    consistencyHash: report.consistencyHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validateMcpReadonlyToolConsistency(
  input: McpReadonlyToolConsistencyInput = {}
): McpReadonlyToolConsistencyFinding[] {
  const findings: McpReadonlyToolConsistencyFinding[] = [];
  scanUnsafeInput(input, findings);
  validateRequired(input, findings);
  validateContract(input, findings);
  validateResult(input, findings);
  validateApproval(input, findings);
  validateEvents(input, findings);
  return dedupeFindings(findings);
}

function validateRequired(
  input: McpReadonlyToolConsistencyInput,
  findings: McpReadonlyToolConsistencyFinding[]
): void {
  if (input.contract === undefined) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "CONTRACT_MISSING",
      "MCP read-only tool contract is required."
    );
  }
  if (input.toolResult === undefined) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "TOOL_RESULT_MISSING",
      "MCP read-only tool result summary is required."
    );
  }
}

function validateContract(
  input: McpReadonlyToolConsistencyInput,
  findings: McpReadonlyToolConsistencyFinding[]
): void {
  const contract = input.contract;
  if (contract === undefined) {
    return;
  }
  const toolId = safeText(contract.toolId);
  if (toolId.length === 0) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "TOOL_ID_MISSING",
      "Tool id is required.",
      "contract.toolId"
    );
  }
  if (contract.readOnly !== true) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "CONTRACT_NOT_READ_ONLY",
      "MCP tool contract must be read-only.",
      "contract.readOnly"
    );
  }
  if (
    contract.allowlisted !== true ||
    (input.allowlistedToolIds !== undefined &&
      !input.allowlistedToolIds.includes(toolId))
  ) {
    addFinding(
      findings,
      "allowlist",
      "blocker",
      "TOOL_NOT_ALLOWLISTED",
      "MCP read-only tool must be allowlisted.",
      "contract.toolId"
    );
  }
  if (isMutating(contract)) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "MUTATING_TOOL_BLOCKED",
      "Mutating MCP tool cannot pass read-only consistency.",
      "contract.operationKind"
    );
  }
}

function validateResult(
  input: McpReadonlyToolConsistencyInput,
  findings: McpReadonlyToolConsistencyFinding[]
): void {
  const contract = input.contract;
  const result = input.toolResult;
  if (contract === undefined || result === undefined) {
    return;
  }
  compareField(
    findings,
    "descriptor",
    "DESCRIPTOR_ID_MISMATCH",
    "Descriptor id must match between contract and result.",
    "descriptorId",
    contract.descriptorId,
    result.descriptorId
  );
  compareField(
    findings,
    "profile",
    "PROFILE_ID_MISMATCH",
    "MCP profile id must match between contract and result.",
    "profileId",
    contract.profileId,
    result.profileId
  );
  compareField(
    findings,
    "contract",
    "TOOL_ID_MISMATCH",
    "Tool id must match between contract and result.",
    "toolId",
    contract.toolId,
    result.toolId
  );
  compareField(
    findings,
    "confirmation",
    "TYPED_CONFIRMATION_MISMATCH",
    "Typed confirmation must match the contract.",
    "typedConfirmation",
    contract.typedConfirmation,
    result.typedConfirmation
  );
  if (safeNumber(result.timeoutMs) > timeoutLimit(input)) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "TIMEOUT_OUT_OF_BOUNDS",
      "MCP read-only timeout exceeds the configured bound.",
      "toolResult.timeoutMs"
    );
  }
  if (safeNumber(result.outputBytes) > outputLimit(input)) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "OUTPUT_BYTES_OUT_OF_BOUNDS",
      "MCP read-only output bytes exceed the configured bound.",
      "toolResult.outputBytes"
    );
  }
  if (
    result.redactionSummaryPresent !== true ||
    input.redactionSummary === undefined
  ) {
    addFinding(
      findings,
      "redaction",
      "blocker",
      "OUTPUT_REDACTION_SUMMARY_MISSING",
      "MCP read-only result must include output redaction summary.",
      "toolResult.redactionSummaryPresent"
    );
  }
  if (
    input.redactionSummary?.rawFieldDetectedCount !== undefined &&
    safeNumber(input.redactionSummary.rawFieldDetectedCount) > 0
  ) {
    addFinding(
      findings,
      "redaction",
      "blocker",
      "RAW_OUTPUT_DETECTED_BY_REDACTION",
      "MCP redaction summary detected raw output.",
      "redactionSummary.rawFieldDetectedCount"
    );
  }
  if (result.mutating === true || isMutating(result)) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "MUTATING_TOOL_BLOCKED",
      "MCP result cannot claim mutation.",
      "toolResult.mutating"
    );
  }
}

function validateApproval(
  input: McpReadonlyToolConsistencyInput,
  findings: McpReadonlyToolConsistencyFinding[]
): void {
  const contract = input.contract;
  const receipt = input.approvalReceipt;
  if (contract === undefined || receipt === undefined) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_MISSING",
      "MCP read-only tool execution requires an approval receipt summary."
    );
    return;
  }
  if (receipt.approved !== true) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_NOT_APPROVED",
      "Approval receipt must be approved.",
      "approvalReceipt.approved"
    );
  }
  compareField(
    findings,
    "approval",
    "APPROVAL_TOOL_ID_MISMATCH",
    "Approval receipt tool id must match contract.",
    "approvalReceipt.toolId",
    contract.toolId,
    receipt.toolId
  );
  compareField(
    findings,
    "approval",
    "APPROVAL_DESCRIPTOR_ID_MISMATCH",
    "Approval receipt descriptor id must match contract.",
    "approvalReceipt.descriptorId",
    contract.descriptorId,
    receipt.descriptorId
  );
  compareField(
    findings,
    "approval",
    "APPROVAL_PROFILE_ID_MISMATCH",
    "Approval receipt profile id must match contract.",
    "approvalReceipt.profileId",
    contract.profileId,
    receipt.profileId
  );
  compareField(
    findings,
    "confirmation",
    "APPROVAL_TYPED_CONFIRMATION_MISMATCH",
    "Approval receipt typed confirmation must match contract.",
    "approvalReceipt.typedConfirmation",
    contract.typedConfirmation,
    receipt.typedConfirmation
  );
}

function validateEvents(
  input: McpReadonlyToolConsistencyInput,
  findings: McpReadonlyToolConsistencyFinding[]
): void {
  const contract = input.contract;
  const result = input.toolResult;
  if (
    result?.eventSummaryPresent !== true ||
    input.eventSummary === undefined
  ) {
    addFinding(
      findings,
      "event",
      "blocker",
      "EVENT_SUMMARY_MISSING",
      "MCP read-only result must include summary-only event evidence."
    );
  }
  if (
    result?.replayProjectionPresent !== true ||
    input.replayProjection === undefined
  ) {
    addFinding(
      findings,
      "replay",
      "blocker",
      "REPLAY_PROJECTION_MISSING",
      "MCP read-only result must include replay projection evidence."
    );
  }
  if (contract !== undefined && input.eventSummary !== undefined) {
    compareField(
      findings,
      "event",
      "EVENT_DESCRIPTOR_ID_MISMATCH",
      "Event summary descriptor id must match contract.",
      "eventSummary.descriptorId",
      contract.descriptorId,
      input.eventSummary.descriptorId
    );
  }
  if (contract !== undefined && input.replayProjection !== undefined) {
    compareField(
      findings,
      "replay",
      "REPLAY_DESCRIPTOR_ID_MISMATCH",
      "Replay projection descriptor id must match contract.",
      "replayProjection.descriptorId",
      contract.descriptorId,
      input.replayProjection.descriptorId
    );
  }
}

function compareField(
  findings: McpReadonlyToolConsistencyFinding[],
  kind: McpReadonlyToolConsistencyFindingKind,
  code: string,
  safeMessage: string,
  path: string,
  left: unknown,
  right: unknown
): void {
  const leftText = safeText(left);
  const rightText = safeText(right);
  if (leftText.length > 0 && rightText.length > 0 && leftText !== rightText) {
    addFinding(findings, kind, "blocker", code, safeMessage, path);
  }
}

function scanUnsafeInput(
  value: unknown,
  findings: McpReadonlyToolConsistencyFinding[],
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of secretPatterns) {
      if (pattern.test(value)) {
        addFinding(
          findings,
          "secret",
          "blocker",
          code,
          "Secret-like marker is not allowed in MCP consistency inputs.",
          path
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeInput(item, findings, `${path}.${index}`, seen)
    );
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const normalizedKey = key.toLowerCase();
    const forbiddenCode = forbiddenFieldCodes.get(normalizedKey);
    if (forbiddenCode !== undefined) {
      addFinding(
        findings,
        rawKindFor(normalizedKey),
        "blocker",
        forbiddenCode,
        "Raw output, args, command, EventStore, or secret fields are not allowed.",
        childPath
      );
    }
    if (executionReadinessKeys.has(normalizedKey) && child === true) {
      addFinding(
        findings,
        "execution",
        "blocker",
        "EXECUTION_READINESS_FLAG_TRUE",
        "MCP consistency input cannot claim execution readiness.",
        childPath
      );
    }
    scanUnsafeInput(child, findings, childPath, seen);
  }
}

function safeApproval(
  approval: McpReadonlyConsistencyToolApprovalSummary
): Record<string, unknown> {
  return {
    receiptId: approval.receiptId,
    toolId: approval.toolId,
    descriptorId: approval.descriptorId,
    profileId: approval.profileId,
    typedConfirmation: approval.typedConfirmation,
    approved: approval.approved === true
  };
}

function readinessFor(canReview: boolean): McpReadonlyToolConsistencyReadiness {
  return {
    canReviewMcpReadonlyConsistency: canReview,
    canInvokeMcpTool: false,
    canInvokeMutatingMcpTool: false,
    canUseArbitraryMcpTool: false,
    canWriteEventStoreRaw: false,
    canPersistRawOutput: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: McpReadonlyToolConsistencyStatus): string {
  if (status === "blocked") {
    return "Resolve MCP read-only consistency blockers before replay or App audit.";
  }
  if (status === "warning") {
    return "Review MCP read-only consistency warnings; execution remains bounded.";
  }
  return "MCP read-only tool consistency is ready for summary-only audit.";
}

function timeoutLimit(input: McpReadonlyToolConsistencyInput): number {
  return (
    safeNumber(input.contract?.timeoutMs) ||
    safeNumber(input.maxTimeoutMs) ||
    30_000
  );
}

function outputLimit(input: McpReadonlyToolConsistencyInput): number {
  return (
    safeNumber(input.contract?.maxOutputBytes) ||
    safeNumber(input.maxOutputBytes) ||
    64_000
  );
}

function isMutating(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.mutating === true ||
    safeText(value.operationKind) === "mutate" ||
    safeText(value.operationKind) === "write"
  );
}

function addFinding(
  findings: McpReadonlyToolConsistencyFinding[],
  kind: McpReadonlyToolConsistencyFindingKind,
  severity: McpReadonlyToolConsistencySeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-readonly-consistency-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined && path.length > 0 ? { path } : {})
  });
}

function dedupeFindings(
  findings: McpReadonlyToolConsistencyFinding[]
): McpReadonlyToolConsistencyFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.kind}:${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rawKindFor(
  normalizedKey: string
): McpReadonlyToolConsistencyFindingKind {
  if (
    normalizedKey.includes("key") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey === "authorization" ||
    normalizedKey === "bearer"
  ) {
    return "secret";
  }
  if (normalizedKey.startsWith("raw")) {
    return "raw_field";
  }
  return "execution";
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
