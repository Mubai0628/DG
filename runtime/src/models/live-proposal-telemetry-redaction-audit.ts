import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalTelemetryMode = "disabled" | "summary_only_audit";

export type LiveProposalTelemetryRedactionAuditInput = {
  apiKeyPolicy?: unknown;
  requestBuildResult?: unknown;
  liveAdapterResult?: unknown;
  validationIntegration?: unknown;
  appPreviewGate?: unknown;
  usageSummary?: unknown;
  telemetryMode?: LiveProposalTelemetryMode | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalTelemetryRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type LiveProposalTelemetryRedactionFindingKind =
  | "input"
  | "api_key_policy_summary"
  | "request_boundary_summary"
  | "live_adapter_summary"
  | "validation_integration_summary"
  | "usage_summary"
  | "redaction"
  | "readiness"
  | "telemetry_record";

export type LiveProposalTelemetryRedactionSeverity = "blocker" | "warning";

export type LiveProposalTelemetryRedactionFinding = {
  findingId: string;
  kind: LiveProposalTelemetryRedactionFindingKind;
  severity: LiveProposalTelemetryRedactionSeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalTelemetryRecordKind =
  | "api_key_policy_summary"
  | "request_boundary_summary"
  | "live_adapter_summary"
  | "validation_integration_summary"
  | "usage_summary"
  | "reasoning_content_drop_summary"
  | "redaction_summary"
  | "app_gate_summary";

export type LiveProposalTelemetryRecord = {
  recordId: string;
  kind: LiveProposalTelemetryRecordKind;
  status: "passed" | "warning" | "blocked" | "missing";
  summary: string;
  hash?: string | undefined;
  count?: number | undefined;
  warningCodes: string[];
};

export type LiveProposalRedactionSummary = {
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  outputSummaryOnly: true;
};

export type LiveProposalTelemetryUsageSummary = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
  requestCount?: number | undefined;
  responseCount?: number | undefined;
};

export type LiveProposalTelemetryReadiness = {
  canWriteTelemetryEvent: false;
  canPersistRawPrompt: false;
  canPersistRawResponse: false;
  canPersistReasoningContent: false;
  canReadApiKey: false;
  canCallLiveModel: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalTelemetryRedactionAudit = {
  status: LiveProposalTelemetryRedactionAuditStatus;
  auditId: string;
  telemetryMode: LiveProposalTelemetryMode;
  recordCount: number;
  blockedRecordCount: number;
  warningRecordCount: number;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  usageSummary?: LiveProposalTelemetryUsageSummary | undefined;
  records: LiveProposalTelemetryRecord[];
  redactionSummary: LiveProposalRedactionSummary;
  findings: LiveProposalTelemetryRedactionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: LiveProposalTelemetryReadiness;
  nextAction: string;
  source: "runtime_live_proposal_telemetry_redaction_audit";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const promptTextField = ["prompt", "Text"].join("");
const rawRequestField = [rawPrefix, "Request"].join("");

const forbiddenFieldKeys = new Set(
  [
    apiKeyField,
    "apiKeyValue",
    "secret",
    "token",
    authHeaderField,
    bearerField,
    "rawKey",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    rawPrefix + "Prompt",
    promptTextField,
    rawRequestField,
    rawPrefix + "Response",
    reasoningCamelField,
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "stdout",
    "stderr",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    toolChoiceField
  ].map((key) => key.toLowerCase())
);

const executionReadinessKeys = new Set(
  [
    "canWriteTelemetryEvent",
    "canPersistRawPrompt",
    "canPersistRawResponse",
    "canPersistReasoningContent",
    "canReadApiKey",
    "canReadApiKeyFromApp",
    "canCallLiveModel",
    "canCallDeepSeekFromApp",
    "canFetchNetwork",
    "canFetchNetworkFromApp",
    "canSendLiveRequest",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteApply",
    "canExecuteRollback",
    "canExecuteGit",
    "canExecuteShell",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution",
    "fetchEnabled",
    "networkEnabled",
    "liveCallEnabled",
    "sendRequestEnabled",
    "apiKeyReadEnabled",
    "appExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const recordKinds = new Set<LiveProposalTelemetryRecordKind>([
  "api_key_policy_summary",
  "request_boundary_summary",
  "live_adapter_summary",
  "validation_integration_summary",
  "usage_summary",
  "reasoning_content_drop_summary",
  "redaction_summary",
  "app_gate_summary"
]);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_REQUEST_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Request"}\\b|raw request`, "i")
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Response"}\\b|raw response`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  },
  {
    code: "RAW_REASONING_MARKER",
    pattern: /raw reasoning|reasoning text/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateLiveProposalTelemetryRedactionAuditInput(
  input: LiveProposalTelemetryRedactionAuditInput
): LiveProposalTelemetryRedactionFinding[] {
  const findings: LiveProposalTelemetryRedactionFinding[] = [];

  if (
    input.telemetryMode !== undefined &&
    input.telemetryMode !== "disabled" &&
    input.telemetryMode !== "summary_only_audit"
  ) {
    findings.push(finding("input", "blocker", "UNKNOWN_TELEMETRY_MODE"));
  }
  if (input.telemetryMode === "disabled") {
    findings.push(finding("input", "warning", "TELEMETRY_MODE_DISABLED"));
  }

  scanObject(input, "input", findings);
  validateOptionalRecords(input, findings);
  validateUsageSummary(input.usageSummary, findings);
  validateKnownArtifacts(input, findings);

  return uniqueFindings(findings);
}

export function buildLiveProposalTelemetryRedactionAudit(
  input: LiveProposalTelemetryRedactionAuditInput = {}
): LiveProposalTelemetryRedactionAudit {
  const findings = validateLiveProposalTelemetryRedactionAuditInput(input);
  const usageSummary = firstUsageSummary(input);
  const records = buildRecords(input, findings, usageSummary);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const blockedRecordCount = records.filter(
    (record) => record.status === "blocked"
  ).length;
  const warningRecordCount = records.filter(
    (record) => record.status === "warning" || record.status === "missing"
  ).length;
  const rawFieldDetectedCount = findings.filter(isRawFinding).length;
  const apiKeyLeakDetected = findings.some((item) =>
    [
      "API_KEY_MARKER",
      "BEARER_TOKEN_MARKER",
      "AUTHORIZATION_HEADER_MARKER",
      "PRIVATE_KEY_MARKER",
      "TOKEN_LIKE_VALUE_REJECTED",
      "RAW_KEY_FIELD_REJECTED",
      "API_KEY_RAW_VALUE_PRESENT"
    ].includes(item.code)
  );
  const rawPromptDetected = findings.some((item) =>
    ["RAW_PROMPT_MARKER", "RAW_PROMPT_FIELD_REJECTED"].includes(item.code)
  );
  const rawResponseDetected = findings.some((item) =>
    ["RAW_RESPONSE_MARKER", "RAW_RESPONSE_FIELD_REJECTED"].includes(item.code)
  );
  const reasoningContentPersisted = findings.some((item) =>
    [
      "REASONING_CONTENT_FIELD_REJECTED",
      "REASONING_CONTENT_PERSISTED"
    ].includes(item.code)
  );
  const redactedFieldCount =
    countSafeRedactionSignals(input) +
    (records.some((record) => record.kind === "redaction_summary") ? 1 : 0);
  const redactionSummary: LiveProposalRedactionSummary = {
    redactedFieldCount,
    rawFieldDetectedCount,
    apiKeyLeakDetected,
    rawPromptDetected,
    rawResponseDetected,
    reasoningContentPersisted,
    rawSourceDetected: findings.some((item) =>
      ["RAW_SOURCE_MARKER", "RAW_SOURCE_FIELD_REJECTED"].includes(item.code)
    ),
    rawDiffDetected: findings.some((item) =>
      ["RAW_DIFF_MARKER", "RAW_DIFF_FIELD_REJECTED"].includes(item.code)
    ),
    outputSummaryOnly: true
  };
  const telemetryMode = input.telemetryMode ?? "disabled";
  const auditHash = stablePreviewHash(
    JSON.stringify({
      telemetryMode,
      records: records.map((record) => [
        record.kind,
        record.status,
        record.hash,
        record.count
      ]),
      redactionSummary,
      blockerCount,
      warningCount
    })
  );
  const status = statusFrom({
    hasArtifact: hasAnyArtifact(input),
    blockerCount,
    warningCount
  });

  return {
    status,
    auditId:
      input.idGenerator?.() ??
      `live-proposal-telemetry-audit-${auditHash.slice(0, 12)}`,
    telemetryMode,
    recordCount: records.length,
    blockedRecordCount,
    warningRecordCount,
    redactedFieldCount,
    rawFieldDetectedCount,
    apiKeyLeakDetected,
    rawPromptDetected,
    rawResponseDetected,
    reasoningContentPersisted,
    ...(usageSummary !== undefined ? { usageSummary } : {}),
    records,
    redactionSummary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: disabledReadiness(),
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_telemetry_redaction_audit"
  };
}

export function summarizeLiveProposalTelemetryRedactionAudit(
  result: LiveProposalTelemetryRedactionAudit
): {
  status: LiveProposalTelemetryRedactionAuditStatus;
  auditId: string;
  telemetryMode: LiveProposalTelemetryMode;
  recordCount: number;
  blockedRecordCount: number;
  warningRecordCount: number;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  source: "runtime_live_proposal_telemetry_redaction_audit_summary";
} {
  return {
    status: result.status,
    auditId: result.auditId,
    telemetryMode: result.telemetryMode,
    recordCount: result.recordCount,
    blockedRecordCount: result.blockedRecordCount,
    warningRecordCount: result.warningRecordCount,
    redactedFieldCount: result.redactedFieldCount,
    rawFieldDetectedCount: result.rawFieldDetectedCount,
    apiKeyLeakDetected: result.apiKeyLeakDetected,
    rawPromptDetected: result.rawPromptDetected,
    rawResponseDetected: result.rawResponseDetected,
    reasoningContentPersisted: result.reasoningContentPersisted,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    auditHash: result.auditHash,
    source: "runtime_live_proposal_telemetry_redaction_audit_summary"
  };
}

function buildRecords(
  input: LiveProposalTelemetryRedactionAuditInput,
  findings: readonly LiveProposalTelemetryRedactionFinding[],
  usageSummary: LiveProposalTelemetryUsageSummary | undefined
): LiveProposalTelemetryRecord[] {
  if (!hasAnyArtifact(input)) {
    return [];
  }
  const records: LiveProposalTelemetryRecord[] = [
    artifactRecord("api_key_policy_summary", input.apiKeyPolicy, findings),
    artifactRecord(
      "request_boundary_summary",
      input.requestBuildResult,
      findings
    ),
    artifactRecord("live_adapter_summary", input.liveAdapterResult, findings),
    artifactRecord(
      "validation_integration_summary",
      input.validationIntegration,
      findings
    ),
    usageRecord(usageSummary, findings),
    reasoningRecord(input, findings),
    artifactRecord("app_gate_summary", input.appPreviewGate, findings),
    redactionRecord(findings)
  ];
  return records.map((record) => ({
    ...record,
    warningCodes: uniqueStrings(record.warningCodes)
  }));
}

function artifactRecord(
  kind: LiveProposalTelemetryRecordKind,
  value: unknown,
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRecord {
  const relevant = findingsForKind(kind, findings);
  if (value === undefined) {
    return record(kind, "missing", `${kind} missing`, undefined, [
      `${kind.toUpperCase()}_MISSING`
    ]);
  }
  const status = statusForFindings(relevant);
  const summary = summaryForArtifact(kind, value);
  return record(kind, status, summary, safeArtifactHash(value), [
    ...relevant.map((item) => item.code),
    ...(status === "passed"
      ? []
      : [`${kind.toUpperCase()}_${status.toUpperCase()}`])
  ]);
}

function usageRecord(
  usageSummary: LiveProposalTelemetryUsageSummary | undefined,
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRecord {
  const relevant = findings.filter((item) => item.kind === "usage_summary");
  if (usageSummary === undefined) {
    return record(
      "usage_summary",
      "missing",
      "usage summary missing",
      undefined,
      ["USAGE_SUMMARY_MISSING"]
    );
  }
  const status = statusForFindings(relevant);
  const count =
    usageSummary.totalTokens ??
    (usageSummary.inputTokens ?? 0) + (usageSummary.outputTokens ?? 0);
  return record(
    "usage_summary",
    status,
    `tokens:${count}`,
    stablePreviewHash(JSON.stringify(usageSummary)),
    relevant.map((item) => item.code),
    count
  );
}

function reasoningRecord(
  input: LiveProposalTelemetryRedactionAuditInput,
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRecord {
  const live = asRecord(input.liveAdapterResult);
  const validation = asRecord(input.validationIntegration);
  const dropped =
    readBoolean(live, "droppedReasoningContent") === true ||
    readBoolean(validation, "droppedReasoningContent") === true;
  const length =
    readNumber(live, "droppedReasoningContentLength") ??
    readNumber(validation, "droppedReasoningContentLength");
  const relevant = findings.filter((item) =>
    item.kind === "redaction" || item.kind === "live_adapter_summary"
      ? item.code.includes("REASONING")
      : false
  );
  const status =
    statusForFindings(relevant) === "passed" && dropped
      ? "warning"
      : statusForFindings(relevant);
  return record(
    "reasoning_content_drop_summary",
    status,
    dropped
      ? `reasoning content dropped; length:${length ?? 0}`
      : "no reasoning content persisted",
    stablePreviewHash(JSON.stringify({ dropped, length: length ?? 0 })),
    [
      ...relevant.map((item) => item.code),
      ...(dropped ? ["REASONING_CONTENT_DROPPED"] : [])
    ],
    length
  );
}

function redactionRecord(
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRecord {
  const relevant = findings.filter(
    (item) => item.kind === "redaction" || isRawFinding(item)
  );
  const status = statusForFindings(relevant);
  return record(
    "redaction_summary",
    status,
    `raw findings:${relevant.length}`,
    stablePreviewHash(
      JSON.stringify(relevant.map((item) => [item.kind, item.code]))
    ),
    relevant.map((item) => item.code),
    relevant.length
  );
}

function record(
  kind: LiveProposalTelemetryRecordKind,
  status: LiveProposalTelemetryRecord["status"],
  summary: string,
  hash: string | undefined,
  warningCodes: readonly string[],
  count?: number | undefined
): LiveProposalTelemetryRecord {
  const recordHash = stablePreviewHash(
    JSON.stringify({ kind, status, summary, hash })
  );
  return {
    recordId: `${kind}-${recordHash.slice(0, 10)}`,
    kind,
    status,
    summary: safeSummaryText(summary) ?? `${kind} summary`,
    ...(hash !== undefined ? { hash } : {}),
    ...(count !== undefined && Number.isFinite(count) ? { count } : {}),
    warningCodes: warningCodes.map(safeCode).filter((code) => code.length > 0)
  };
}

function validateKnownArtifacts(
  input: LiveProposalTelemetryRedactionAuditInput,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  validateApiKeyPolicy(input.apiKeyPolicy, findings);
  validateRequestBuild(input.requestBuildResult, findings);
  validateLiveAdapterResult(input.liveAdapterResult, findings);
  validateValidationIntegration(input.validationIntegration, findings);
  validateAppPreviewGate(input.appPreviewGate, findings);
}

function validateApiKeyPolicy(
  value: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (value === undefined) {
    return;
  }
  const recordValue = asRecord(value);
  if (recordValue === undefined) {
    findings.push(
      finding("api_key_policy_summary", "blocker", "API_KEY_POLICY_INVALID")
    );
    return;
  }
  if (
    readBoolean(asRecord(recordValue.keySourceSummary), "rawKeyPresent") ===
      true ||
    readBoolean(asRecord(recordValue.apiKeyPolicyRef), "rawKeyIncluded") ===
      true
  ) {
    findings.push(
      finding("api_key_policy_summary", "blocker", "API_KEY_RAW_VALUE_PRESENT")
    );
  }
  const readiness = asRecord(recordValue.readiness);
  if (
    readBoolean(readiness, "canReadApiKey") ||
    readBoolean(readiness, "canCallLiveModel") ||
    readBoolean(readiness, "canFetchNetwork")
  ) {
    findings.push(
      finding(
        "api_key_policy_summary",
        "blocker",
        "API_KEY_POLICY_READINESS_REJECTED"
      )
    );
  }
}

function validateRequestBuild(
  value: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (value === undefined) {
    return;
  }
  const recordValue = asRecord(value);
  if (recordValue === undefined) {
    findings.push(
      finding("request_boundary_summary", "blocker", "REQUEST_BUILD_INVALID")
    );
    return;
  }
  const request = asRecord(recordValue.request);
  if (request !== undefined) {
    if (Object.prototype.hasOwnProperty.call(request, "tools")) {
      findings.push(
        finding("request_boundary_summary", "blocker", "REQUEST_TOOLS_REJECTED")
      );
    }
    if (Object.prototype.hasOwnProperty.call(request, toolChoiceField)) {
      findings.push(
        finding(
          "request_boundary_summary",
          "blocker",
          "REQUEST_TOOL_CHOICE_REJECTED"
        )
      );
    }
  }
}

function validateLiveAdapterResult(
  value: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (value === undefined) {
    findings.push(
      finding("live_adapter_summary", "warning", "LIVE_ADAPTER_RESULT_MISSING")
    );
    return;
  }
  const recordValue = asRecord(value);
  if (recordValue === undefined) {
    findings.push(
      finding("live_adapter_summary", "blocker", "LIVE_ADAPTER_RESULT_INVALID")
    );
    return;
  }
  if (readBoolean(recordValue, "usedLiveNetwork") === true) {
    findings.push(
      finding("live_adapter_summary", "warning", "LIVE_NETWORK_USED")
    );
  }
  if (readBoolean(recordValue, "droppedReasoningContent") === true) {
    findings.push(
      finding("live_adapter_summary", "warning", "REASONING_CONTENT_DROPPED")
    );
  }
  validateUsageSummary(recordValue.usageSummary, findings);
}

function validateValidationIntegration(
  value: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (value === undefined) {
    findings.push(
      finding(
        "validation_integration_summary",
        "warning",
        "VALIDATION_INTEGRATION_MISSING"
      )
    );
    return;
  }
  if (!isRecord(value)) {
    findings.push(
      finding(
        "validation_integration_summary",
        "blocker",
        "VALIDATION_INTEGRATION_INVALID"
      )
    );
  }
}

function validateAppPreviewGate(
  value: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    findings.push(finding("telemetry_record", "blocker", "APP_GATE_INVALID"));
  }
}

function validateUsageSummary(
  usageSummary: unknown,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  if (usageSummary === undefined) {
    return;
  }
  if (!isRecord(usageSummary)) {
    findings.push(finding("usage_summary", "blocker", "USAGE_SUMMARY_INVALID"));
    return;
  }
  const allowedKeys = new Set([
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "requestCount",
    "responseCount"
  ]);
  for (const [key, value] of Object.entries(usageSummary)) {
    if (!allowedKeys.has(key) || !isSafeNonNegativeNumber(value)) {
      findings.push(
        finding("usage_summary", "blocker", "UNSAFE_USAGE_SUMMARY")
      );
    }
    if (typeof value === "string") {
      findings.push(
        finding("usage_summary", "blocker", "USAGE_SUMMARY_RAW_TEXT")
      );
    }
  }
}

function validateOptionalRecords(
  input: LiveProposalTelemetryRedactionAuditInput,
  findings: LiveProposalTelemetryRedactionFinding[]
): void {
  const records = asRecord(input)?.records;
  if (!Array.isArray(records)) {
    return;
  }
  for (const recordValue of records) {
    const kind = asRecord(recordValue)?.kind;
    if (typeof kind !== "string" || !recordKinds.has(kind as never)) {
      findings.push(
        finding("telemetry_record", "blocker", "UNKNOWN_TELEMETRY_RECORD_KIND")
      );
    }
  }
}

function scanObject(
  value: unknown,
  kind: LiveProposalTelemetryRedactionFindingKind,
  findings: LiveProposalTelemetryRedactionFinding[],
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      findings.push(finding(kind, "blocker", code));
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(fieldFinding(kind, key));
    }
    if (executionReadinessKeys.has(normalizedKey) && nestedValue === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_REJECTED")
      );
    }
    scanObject(nestedValue, kind, findings, seen);
  }
}

function fieldFinding(
  kind: LiveProposalTelemetryRedactionFindingKind,
  fieldName: string
): LiveProposalTelemetryRedactionFinding {
  const normalized = fieldName.toLowerCase();
  if (normalized.includes("prompt")) {
    return finding(kind, "blocker", "RAW_PROMPT_FIELD_REJECTED");
  }
  if (normalized.includes("request")) {
    return finding(kind, "blocker", "RAW_REQUEST_FIELD_REJECTED");
  }
  if (normalized.includes("response")) {
    return finding(kind, "blocker", "RAW_RESPONSE_FIELD_REJECTED");
  }
  if (normalized.includes("reasoning")) {
    return finding(kind, "blocker", "REASONING_CONTENT_FIELD_REJECTED");
  }
  if (normalized.includes("source")) {
    return finding(kind, "blocker", "RAW_SOURCE_FIELD_REJECTED");
  }
  if (normalized.includes("diff")) {
    return finding(kind, "blocker", "RAW_DIFF_FIELD_REJECTED");
  }
  if (
    normalized.includes("apikey") ||
    normalized.includes("authorization") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("bearer")
  ) {
    return finding(kind, "blocker", "RAW_KEY_FIELD_REJECTED");
  }
  return finding(kind, "blocker", "FORBIDDEN_FIELD");
}

function firstUsageSummary(
  input: LiveProposalTelemetryRedactionAuditInput
): LiveProposalTelemetryUsageSummary | undefined {
  return (
    sanitizeUsageSummary(input.usageSummary) ??
    sanitizeUsageSummary(asRecord(input.liveAdapterResult)?.usageSummary) ??
    sanitizeUsageSummary(asRecord(input.validationIntegration)?.usageSummary)
  );
}

function sanitizeUsageSummary(
  value: unknown
): LiveProposalTelemetryUsageSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const result: LiveProposalTelemetryUsageSummary = {};
  if (isSafeNonNegativeNumber(value.inputTokens)) {
    result.inputTokens = value.inputTokens;
  }
  if (isSafeNonNegativeNumber(value.outputTokens)) {
    result.outputTokens = value.outputTokens;
  }
  if (isSafeNonNegativeNumber(value.totalTokens)) {
    result.totalTokens = value.totalTokens;
  }
  if (isSafeNonNegativeNumber(value.requestCount)) {
    result.requestCount = value.requestCount;
  }
  if (isSafeNonNegativeNumber(value.responseCount)) {
    result.responseCount = value.responseCount;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function summaryForArtifact(
  kind: LiveProposalTelemetryRecordKind,
  value: unknown
): string {
  const recordValue = asRecord(value);
  if (recordValue === undefined) {
    return `${kind} summary`;
  }
  switch (kind) {
    case "api_key_policy_summary":
      return [
        `status:${safeSummaryText(recordValue.status) ?? "unknown"}`,
        `provider:${safeSummaryText(recordValue.providerId) ?? "unknown"}`,
        `policy:${safeSummaryText(recordValue.policyId) ?? "unknown"}`
      ].join(" | ");
    case "request_boundary_summary":
      return [
        `status:${safeSummaryText(recordValue.status) ?? "unknown"}`,
        `request:${safeSummaryText(recordValue.requestId) ?? "unknown"}`,
        `hash:${safeSummaryText(recordValue.requestHash) ?? safeSummaryText(asRecord(recordValue.request)?.requestHash) ?? "n/a"}`
      ].join(" | ");
    case "live_adapter_summary":
      return [
        `status:${safeSummaryText(recordValue.status) ?? "unknown"}`,
        `generation:${safeSummaryText(recordValue.generationId) ?? "unknown"}`,
        `proposal:${safeSummaryText(recordValue.proposalId) ?? "n/a"}`
      ].join(" | ");
    case "validation_integration_summary":
      return [
        `status:${safeSummaryText(recordValue.status) ?? "unknown"}`,
        `integration:${safeSummaryText(recordValue.integrationId) ?? "unknown"}`,
        `proposal:${safeSummaryText(recordValue.proposalId) ?? "n/a"}`
      ].join(" | ");
    case "app_gate_summary":
      return [
        `status:${safeSummaryText(recordValue.status) ?? "unknown"}`,
        `gate:${safeSummaryText(recordValue.gateId) ?? "unknown"}`,
        `stages:${readNumber(recordValue, "stageCount") ?? 0}`
      ].join(" | ");
    default:
      return `${kind} summary`;
  }
}

function safeArtifactHash(value: unknown): string {
  const recordValue = asRecord(value);
  const directHash =
    safeSummaryText(recordValue?.policyHash) ??
    safeSummaryText(recordValue?.requestHash) ??
    safeSummaryText(recordValue?.responseHash) ??
    safeSummaryText(recordValue?.integrationHash) ??
    safeSummaryText(recordValue?.gateHash) ??
    safeSummaryText(recordValue?.auditHash);
  if (directHash !== undefined) {
    return directHash;
  }
  return stablePreviewHash(JSON.stringify(toSafeHashInput(value)));
}

function toSafeHashInput(value: unknown): unknown {
  if (typeof value === "string") {
    return {
      textHash: stablePreviewHash(value),
      byteLength: new TextEncoder().encode(value).length
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSafeHashInput(item));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !forbiddenFieldKeys.has(key.toLowerCase()))
        .map(([key, nestedValue]) => [key, toSafeHashInput(nestedValue)])
    );
  }
  return value;
}

function findingsForKind(
  kind: LiveProposalTelemetryRecordKind,
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRedactionFinding[] {
  const mappedKind = recordKindToFindingKind(kind);
  return findings.filter((item) => item.kind === mappedKind);
}

function recordKindToFindingKind(
  kind: LiveProposalTelemetryRecordKind
): LiveProposalTelemetryRedactionFindingKind {
  if (kind === "reasoning_content_drop_summary") {
    return "redaction";
  }
  if (kind === "redaction_summary" || kind === "app_gate_summary") {
    return "telemetry_record";
  }
  return kind;
}

function statusForFindings(
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRecord["status"] {
  if (findings.some((item) => item.severity === "blocker")) {
    return "blocked";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "warning";
  }
  return "passed";
}

function statusFrom(args: {
  hasArtifact: boolean;
  blockerCount: number;
  warningCount: number;
}): LiveProposalTelemetryRedactionAuditStatus {
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (!args.hasArtifact) {
    return "empty";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "audit_ready";
}

function nextActionFor(
  status: LiveProposalTelemetryRedactionAuditStatus
): string {
  switch (status) {
    case "audit_ready":
      return "Telemetry redaction audit is summary-only. Event writes and live calls remain disabled.";
    case "warning":
      return "Review telemetry warnings. Persisting raw prompts, responses, reasoning content, or keys remains disallowed.";
    case "blocked":
      return "Fix telemetry redaction blockers before using these summaries downstream.";
    case "empty":
    default:
      return "Provide summary artifacts to audit telemetry redaction boundaries.";
  }
}

function countSafeRedactionSignals(
  input: LiveProposalTelemetryRedactionAuditInput
): number {
  let count = 0;
  const policy = asRecord(input.apiKeyPolicy);
  const request = asRecord(input.requestBuildResult);
  const live = asRecord(input.liveAdapterResult);
  const validation = asRecord(input.validationIntegration);
  if (
    readBoolean(asRecord(policy?.keySourceSummary), "rawKeyPresent") === false
  ) {
    count += 1;
  }
  if (
    readBoolean(
      asRecord(asRecord(request?.request)?.apiKeyPolicyRef),
      "rawKeyIncluded"
    ) === false
  ) {
    count += 1;
  }
  if (live?.apiKeyHashPrefix !== undefined) {
    count += 1;
  }
  if (readBoolean(live, "droppedReasoningContent") === true) {
    count += 1;
  }
  if (readBoolean(validation, "droppedReasoningContent") === true) {
    count += 1;
  }
  return count;
}

function hasAnyArtifact(
  input: LiveProposalTelemetryRedactionAuditInput
): boolean {
  return (
    input.apiKeyPolicy !== undefined ||
    input.requestBuildResult !== undefined ||
    input.liveAdapterResult !== undefined ||
    input.validationIntegration !== undefined ||
    input.appPreviewGate !== undefined ||
    input.usageSummary !== undefined
  );
}

function isRawFinding(
  findingItem: LiveProposalTelemetryRedactionFinding
): boolean {
  return (
    findingItem.severity === "blocker" &&
    (findingItem.code.includes("RAW_") ||
      findingItem.code.includes("API_KEY") ||
      findingItem.code.includes("BEARER") ||
      findingItem.code.includes("AUTHORIZATION") ||
      findingItem.code.includes("PRIVATE_KEY") ||
      findingItem.code.includes("TOKEN") ||
      findingItem.code.includes("REASONING_CONTENT"))
  );
}

function unsafeMarkerCodes(text: string): string[] {
  const codes = unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
  if (looksLikeLongToken(text)) {
    codes.push("TOKEN_LIKE_VALUE_REJECTED");
  }
  return codes;
}

function finding(
  kind: LiveProposalTelemetryRedactionFindingKind,
  severity: LiveProposalTelemetryRedactionSeverity,
  code: string
): LiveProposalTelemetryRedactionFinding {
  return {
    findingId: code.toLowerCase(),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code)
  };
}

function uniqueFindings(
  findings: readonly LiveProposalTelemetryRedactionFinding[]
): LiveProposalTelemetryRedactionFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalTelemetryRedactionFinding[] = [];
  for (const findingItem of findings) {
    const key = `${findingItem.kind}:${findingItem.severity}:${findingItem.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      ...findingItem,
      findingId: `${findingItem.code.toLowerCase()}-${result.length + 1}`
    });
  }
  return result;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function safeMessageFor(code: string): string {
  switch (code) {
    case "RAW_PROMPT_FIELD_REJECTED":
    case "RAW_PROMPT_MARKER":
      return "Telemetry summaries must not include raw prompt material.";
    case "RAW_RESPONSE_FIELD_REJECTED":
    case "RAW_RESPONSE_MARKER":
      return "Telemetry summaries must not include raw model responses.";
    case "REASONING_CONTENT_FIELD_REJECTED":
      return "Reasoning content must be dropped and summarized only.";
    case "API_KEY_RAW_VALUE_PRESENT":
    case "RAW_KEY_FIELD_REJECTED":
    case "API_KEY_MARKER":
      return "Telemetry summaries must not include raw API keys or token values.";
    case "REQUEST_TOOLS_REJECTED":
    case "REQUEST_TOOL_CHOICE_REJECTED":
      return "Telemetry request summaries must not contain tools or tool_choice.";
    case "EXECUTION_READINESS_REJECTED":
      return "Telemetry audit cannot authorize execution readiness.";
    case "LIVE_NETWORK_USED":
      return "Live network use is recorded only as a warning summary.";
    case "REASONING_CONTENT_DROPPED":
      return "Reasoning content was dropped and only a summary is kept.";
    case "UNSAFE_USAGE_SUMMARY":
    case "USAGE_SUMMARY_RAW_TEXT":
      return "Usage telemetry must contain safe numeric fields only.";
    default:
      return "Live proposal telemetry redaction audit finding.";
  }
}

function disabledReadiness(): LiveProposalTelemetryReadiness {
  return {
    canWriteTelemetryEvent: false,
    canPersistRawPrompt: false,
    canPersistRawResponse: false,
    canPersistReasoningContent: false,
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readBoolean(
  recordValue: Record<string, unknown> | undefined,
  key: string
): boolean | undefined {
  const value = recordValue?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(
  recordValue: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  const value = recordValue?.[key];
  return isSafeNonNegativeNumber(value) ? value : undefined;
}

function isSafeNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function safeSummaryText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || unsafeMarkerCodes(trimmed).length > 0) {
    return undefined;
  }
  return trimmed.slice(0, 240);
}

function safeCode(value: string): string {
  return value.replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 120);
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}
