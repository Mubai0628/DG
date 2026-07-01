export type McpToolProposalRedactionAuditInput = unknown;

export type McpToolProposalRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type McpToolProposalRedactionAuditSeverity = "blocker" | "warning";

export type McpToolProposalRedactionAuditFindingKind =
  | "schema"
  | "source"
  | "raw_field"
  | "secret"
  | "execution_claim"
  | "mutation_claim"
  | "eventstore_claim"
  | "app_execution_claim";

export type McpToolProposalRedactionAuditFinding = {
  findingId: string;
  kind: McpToolProposalRedactionAuditFindingKind;
  severity: McpToolProposalRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpToolProposalRedactionSourceCounts = {
  proposalSummaryCount: number;
  riskReportSummaryCount: number;
  simulatedResultSummaryCount: number;
  brokerPlanningSummaryCount: number;
  appSurfaceSummaryCount: number;
  totalSourceCount: number;
};

export type McpToolProposalRedactionSummary = {
  auditId: string;
  sourceCounts: McpToolProposalRedactionSourceCounts;
  rawFieldDetectedCount: number;
  secretDetected: boolean;
  executionClaimDetected: boolean;
  mutationClaimDetected: boolean;
  eventStoreWriteClaimDetected: boolean;
  appExecutionClaimDetected: boolean;
  auditHash: string;
  source: "runtime_mcp_tool_proposal_redaction_audit_summary";
};

export type McpToolProposalRedactionAuditReadiness = {
  canEnterAppSurface: boolean;
  canInvokeMcpTool: false;
  canCallTool: false;
  canApproveToolInvocation: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpToolProposalRedactionAudit = {
  status: McpToolProposalRedactionAuditStatus;
  auditId: string;
  sourceCounts: McpToolProposalRedactionSourceCounts;
  rawFieldDetectedCount: number;
  secretDetected: boolean;
  executionClaimDetected: boolean;
  mutationClaimDetected: boolean;
  eventStoreWriteClaimDetected: boolean;
  appExecutionClaimDetected: boolean;
  findings: McpToolProposalRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpToolProposalRedactionAuditReadiness;
  summary: McpToolProposalRedactionSummary;
  nextAction: string;
  auditHash: string;
  source: "runtime_mcp_tool_proposal_redaction_audit";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawarguments", "RAW_ARGS_FIELD_REJECTED"],
  ["rawinput", "RAW_INPUT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawresourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["resourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["resourcetext", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawdom", "RAW_DOM_FIELD_REJECTED"],
  ["rawcsv", "RAW_CSV_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["envvalue", "ENV_FIELD_REJECTED"],
  ["processenvvalue", "ENV_FIELD_REJECTED"],
  ["stdout", "STDOUT_FIELD_REJECTED"],
  ["stderr", "STDERR_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["tauricommand", "TAURI_COMMAND_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["calltool", "CALL_TOOL_FIELD_REJECTED"],
  ["toolcall", "TOOL_CALL_FIELD_REJECTED"],
  ["tools/call", "TOOLS_CALL_FIELD_REJECTED"],
  ["resources/read", "RESOURCE_READ_FIELD_REJECTED"]
]);

const executionFlagCodes = new Map<string, string>([
  ["caninvokemcptool", "MCP_TOOL_INVOCATION_CLAIM_REJECTED"],
  ["cancalltool", "MCP_TOOL_INVOCATION_CLAIM_REJECTED"],
  ["calledtool", "MCP_TOOL_INVOCATION_CLAIM_REJECTED"],
  ["toolinvocationenabled", "MCP_TOOL_INVOCATION_CLAIM_REJECTED"],
  ["realexecutionevidencepresent", "REAL_EXECUTION_CLAIM_REJECTED"],
  ["canapprovetoolinvocation", "APPROVAL_EXECUTION_CLAIM_REJECTED"],
  ["canapprove", "APPROVAL_EXECUTION_CLAIM_REJECTED"],
  ["canwriteeventstore", "EVENTSTORE_WRITE_CLAIM_REJECTED"],
  ["wroteeventstore", "EVENTSTORE_WRITE_CLAIM_REJECTED"],
  ["eventwriteenabled", "EVENTSTORE_WRITE_CLAIM_REJECTED"],
  ["canapplypatch", "APPLY_CLAIM_REJECTED"],
  ["canrollback", "ROLLBACK_CLAIM_REJECTED"],
  ["canissuepermissionlease", "PERMISSION_LEASE_CLAIM_REJECTED"],
  ["canexecutegit", "GIT_EXECUTION_CLAIM_REJECTED"],
  ["canexecuteshell", "SHELL_EXECUTION_CLAIM_REJECTED"],
  ["appcanexecute", "APP_EXECUTION_CLAIM_REJECTED"],
  ["appexecutionenabled", "APP_EXECUTION_CLAIM_REJECTED"]
]);

const mutationFlagCodes = new Map<string, string>([
  ["declaredmutating", "MUTATION_CLAIM_REJECTED"],
  ["canmutate", "MUTATION_CLAIM_REJECTED"],
  ["mutatedworkspace", "MUTATION_CLAIM_REJECTED"],
  ["mutationenabled", "MUTATION_CLAIM_REJECTED"],
  ["canwritefilesystem", "FILESYSTEM_WRITE_CLAIM_REJECTED"],
  ["writefilesystem", "FILESYSTEM_WRITE_CLAIM_REJECTED"]
]);

const secretPatterns = [
  {
    code: "API_KEY_MARKER_REJECTED",
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i
  },
  {
    code: "BEARER_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER_REJECTED",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "PASSWORD_VALUE_MARKER_REJECTED",
    pattern: /\bPASSWORD_VALUE_MARKER\b/i
  }
];

const rawPatterns = [
  {
    code: "RAW_ARGUMENT_MARKER_REJECTED",
    pattern: /\braw(Args|Arguments|Input)\b|raw arguments?/i
  },
  {
    code: "RAW_OUTPUT_MARKER_REJECTED",
    pattern: /\braw(Output|ToolOutput|Response)\b|raw tool output/i
  },
  {
    code: "RAW_PROMPT_MARKER_REJECTED",
    pattern: /\brawPrompt\b|raw prompt/i
  },
  {
    code: "RAW_SOURCE_MARKER_REJECTED",
    pattern: /\braw(Source|Diff|Dom|Csv)\b|raw source|raw diff/i
  },
  {
    code: "MCP_TOOL_CALL_MARKER_REJECTED",
    pattern: /tools\/call|callTool/i
  }
];

export function buildMcpToolProposalRedactionAudit(
  input: McpToolProposalRedactionAuditInput
): McpToolProposalRedactionAudit {
  return validateMcpToolProposalRedactionAudit(input);
}

export function validateMcpToolProposalRedactionAudit(
  input: McpToolProposalRedactionAuditInput
): McpToolProposalRedactionAudit {
  const findings: McpToolProposalRedactionAuditFinding[] = [];
  const parsed = parseInput(input, findings);

  if (parsed === undefined || parsed === "") {
    return buildResult(undefined, findings);
  }
  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "AUDIT_INPUT_OBJECT_REQUIRED",
      "MCP tool proposal redaction audit input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  addSourceWarnings(parsed, findings);
  return buildResult(parsed, findings);
}

export function summarizeMcpToolProposalRedactionAudit(
  audit: McpToolProposalRedactionAudit
): McpToolProposalRedactionSummary {
  return audit.summary;
}

function parseInput(
  input: McpToolProposalRedactionAuditInput,
  findings: McpToolProposalRedactionAuditFinding[]
): unknown {
  if (typeof input !== "string") {
    return input;
  }
  if (input.trim().length === 0) {
    return "";
  }
  try {
    return JSON.parse(input) as unknown;
  } catch {
    addFinding(
      findings,
      "schema",
      "blocker",
      "INVALID_JSON",
      "MCP tool proposal redaction audit JSON string could not be parsed."
    );
    return undefined;
  }
}

function buildResult(
  value: Record<string, unknown> | undefined,
  findings: McpToolProposalRedactionAuditFinding[]
): McpToolProposalRedactionAudit {
  const sourceCounts = sourceCountsFrom(value);
  const rawFieldDetectedCount = findings.filter(
    (finding) => finding.kind === "raw_field"
  ).length;
  const secretDetected = findings.some((finding) => finding.kind === "secret");
  const executionClaimDetected = findings.some(
    (finding) => finding.kind === "execution_claim"
  );
  const mutationClaimDetected = findings.some(
    (finding) => finding.kind === "mutation_claim"
  );
  const eventStoreWriteClaimDetected = findings.some(
    (finding) => finding.kind === "eventstore_claim"
  );
  const appExecutionClaimDetected = findings.some(
    (finding) => finding.kind === "app_execution_claim"
  );
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const auditHash = hashText(
    stableStringify({
      sourceCounts,
      rawFieldDetectedCount,
      secretDetected,
      executionClaimDetected,
      mutationClaimDetected,
      eventStoreWriteClaimDetected,
      appExecutionClaimDetected,
      blockerCodes: findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code)
        .sort(),
      warningCodes: findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
        .sort()
    })
  );
  const auditId = `mcp-tool-proposal-redaction-audit-${auditHash.slice(0, 12)}`;
  const status: McpToolProposalRedactionAuditStatus =
    value === undefined && findings.length === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "audit_ready";
  const summary: McpToolProposalRedactionSummary = {
    auditId,
    sourceCounts,
    rawFieldDetectedCount,
    secretDetected,
    executionClaimDetected,
    mutationClaimDetected,
    eventStoreWriteClaimDetected,
    appExecutionClaimDetected,
    auditHash,
    source: "runtime_mcp_tool_proposal_redaction_audit_summary"
  };

  return {
    status,
    auditId,
    sourceCounts,
    rawFieldDetectedCount,
    secretDetected,
    executionClaimDetected,
    mutationClaimDetected,
    eventStoreWriteClaimDetected,
    appExecutionClaimDetected,
    findings: findings.map((finding, index) => ({
      ...finding,
      findingId:
        finding.findingId ||
        `mcp-tool-proposal-redaction-finding-${index + 1}`
    })),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readinessFor(status !== "empty" && blockerCount === 0),
    summary,
    nextAction: nextActionFor(status),
    auditHash,
    source: "runtime_mcp_tool_proposal_redaction_audit"
  };
}

function sourceCountsFrom(
  value: Record<string, unknown> | undefined
): McpToolProposalRedactionSourceCounts {
  if (value === undefined) {
    return emptySourceCounts();
  }
  const counts = {
    proposalSummaryCount: isRecord(value.proposalSummary) ? 1 : 0,
    riskReportSummaryCount: isRecord(value.riskReportSummary) ? 1 : 0,
    simulatedResultSummaryCount: isRecord(value.simulatedResultSummary) ? 1 : 0,
    brokerPlanningSummaryCount: isRecord(value.brokerPlanningSummary) ? 1 : 0,
    appSurfaceSummaryCount: isRecord(value.appSurfaceSummary) ? 1 : 0,
    totalSourceCount: 0
  };
  counts.totalSourceCount =
    counts.proposalSummaryCount +
    counts.riskReportSummaryCount +
    counts.simulatedResultSummaryCount +
    counts.brokerPlanningSummaryCount +
    counts.appSurfaceSummaryCount;
  return counts;
}

function emptySourceCounts(): McpToolProposalRedactionSourceCounts {
  return {
    proposalSummaryCount: 0,
    riskReportSummaryCount: 0,
    simulatedResultSummaryCount: 0,
    brokerPlanningSummaryCount: 0,
    appSurfaceSummaryCount: 0,
    totalSourceCount: 0
  };
}

function addSourceWarnings(
  value: Record<string, unknown>,
  findings: McpToolProposalRedactionAuditFinding[]
): void {
  const counts = sourceCountsFrom(value);
  if (counts.totalSourceCount === 0) {
    addFinding(
      findings,
      "source",
      "warning",
      "NO_AUDIT_SOURCES",
      "No MCP tool proposal summary sources were provided."
    );
  }
  if (counts.proposalSummaryCount === 0) {
    addFinding(
      findings,
      "source",
      "warning",
      "PROPOSAL_SUMMARY_MISSING",
      "MCP tool proposal redaction audit is missing proposal summary input."
    );
  }
  if (counts.riskReportSummaryCount === 0) {
    addFinding(
      findings,
      "source",
      "warning",
      "RISK_REPORT_SUMMARY_MISSING",
      "MCP tool proposal redaction audit is missing input risk summary."
    );
  }
  if (counts.simulatedResultSummaryCount === 0) {
    addFinding(
      findings,
      "source",
      "warning",
      "SIMULATED_RESULT_SUMMARY_MISSING",
      "MCP tool proposal redaction audit is missing simulated result summary."
    );
  }
  if (counts.brokerPlanningSummaryCount === 0) {
    addFinding(
      findings,
      "source",
      "warning",
      "BROKER_PLANNING_SUMMARY_MISSING",
      "MCP tool proposal redaction audit is missing broker planning summary."
    );
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: McpToolProposalRedactionAuditFinding[],
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const item of secretPatterns) {
      if (item.pattern.test(value)) {
        addFinding(
          findings,
          "secret",
          "blocker",
          item.code,
          "Secret-like marker was rejected from MCP tool proposal audit input.",
          path
        );
      }
    }
    for (const item of rawPatterns) {
      if (item.pattern.test(value)) {
        addFinding(
          findings,
          "raw_field",
          "blocker",
          item.code,
          "Raw or real tool-call marker was rejected from MCP tool proposal audit input.",
          path
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanUnsafeValues(item, findings, `${path}[${index}]`, seen);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    const childPath = `${path}.${key}`;
    const fieldCode = forbiddenFieldCodes.get(normalizedKey);
    if (fieldCode !== undefined) {
      addFinding(
        findings,
        findingKindForFieldCode(fieldCode),
        "blocker",
        fieldCode,
        "Forbidden MCP tool proposal audit field was rejected.",
        childPath
      );
    }
    const executionCode = executionFlagCodes.get(normalizedKey);
    if (executionCode !== undefined && nestedValue === true) {
      addFinding(
        findings,
        findingKindForExecutionCode(executionCode),
        "blocker",
        executionCode,
        "MCP tool proposal audit input cannot claim execution readiness.",
        childPath
      );
    }
    const mutationCode = mutationFlagCodes.get(normalizedKey);
    if (mutationCode !== undefined && nestedValue === true) {
      addFinding(
        findings,
        "mutation_claim",
        "blocker",
        mutationCode,
        "MCP tool proposal audit input cannot claim mutation readiness.",
        childPath
      );
    }
    scanUnsafeValues(nestedValue, findings, childPath, seen);
  }
}

function findingKindForFieldCode(
  code: string
): McpToolProposalRedactionAuditFindingKind {
  if (
    code.includes("API_KEY") ||
    code.includes("AUTHORIZATION") ||
    code.includes("BEARER") ||
    code.includes("TOKEN") ||
    code.includes("SECRET") ||
    code.includes("ENV")
  ) {
    return "secret";
  }
  if (code.includes("EVENTSTORE")) {
    return "eventstore_claim";
  }
  if (code.includes("COMMAND") || code.includes("CALL")) {
    return "execution_claim";
  }
  return "raw_field";
}

function findingKindForExecutionCode(
  code: string
): McpToolProposalRedactionAuditFindingKind {
  if (code.includes("EVENTSTORE")) {
    return "eventstore_claim";
  }
  if (code.includes("APP_EXECUTION")) {
    return "app_execution_claim";
  }
  return "execution_claim";
}

function readinessFor(
  canEnterAppSurface: boolean
): McpToolProposalRedactionAuditReadiness {
  return {
    canEnterAppSurface,
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
  };
}

function nextActionFor(status: McpToolProposalRedactionAuditStatus): string {
  switch (status) {
    case "audit_ready":
      return "MCP tool proposal summaries passed redaction audit and may enter read-only App preview.";
    case "warning":
      return "Review MCP tool proposal redaction audit warnings before App preview.";
    case "blocked":
      return "Reject MCP tool proposal artifacts and provide summary-only inputs without raw fields or execution claims.";
    case "empty":
    default:
      return "Provide MCP tool proposal summary artifacts to audit redaction boundaries.";
  }
}

function addFinding(
  findings: McpToolProposalRedactionAuditFinding[],
  kind: McpToolProposalRedactionAuditFindingKind,
  severity: McpToolProposalRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: "",
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function countFindings(
  findings: readonly McpToolProposalRedactionAuditFinding[],
  severity: McpToolProposalRedactionAuditSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9/]/gi, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
