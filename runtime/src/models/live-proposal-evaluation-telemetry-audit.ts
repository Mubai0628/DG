import {
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseValidationResult
} from "./live-proposal-golden-case-schema.js";
import {
  type LiveProposalEvaluationReport,
  type LiveProposalEvaluationUsageSummary
} from "./live-proposal-evaluation-runner.js";
import {
  type LiveProposalFailureMetricsReport,
  type LiveProposalUsageMetrics
} from "./live-proposal-failure-metrics.js";
import {
  type LiveProposalOfflineEvaluationReport,
  type LiveProposalOfflineEvaluationUsageSummary
} from "./live-proposal-offline-evaluation-runner.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalEvaluationTelemetryAuditInput = {
  offlineEvaluationReports?: LiveProposalOfflineEvaluationReport[] | undefined;
  liveEvaluationReports?: LiveProposalEvaluationReport[] | undefined;
  failureMetricsReports?: LiveProposalFailureMetricsReport[] | undefined;
  appEvaluationSummaryViews?: unknown[] | undefined;
  goldenCaseValidationResults?:
    | LiveProposalGoldenCaseValidationResult[]
    | undefined;
  auditMode?: "disabled" | "summary_only_audit" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalEvaluationTelemetryAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type LiveProposalEvaluationTelemetryFindingKind =
  | "input"
  | "source"
  | "offline_evaluation_summary"
  | "live_evaluation_summary"
  | "failure_metrics_summary"
  | "golden_case_validation_summary"
  | "app_evaluation_summary"
  | "usage_summary"
  | "redaction"
  | "raw_leak_scan"
  | "readiness"
  | "telemetry_record"
  | "duplicate_report";

export type LiveProposalEvaluationTelemetrySeverity = "blocker" | "warning";

export type LiveProposalEvaluationTelemetryFinding = {
  findingId: string;
  kind: LiveProposalEvaluationTelemetryFindingKind;
  severity: LiveProposalEvaluationTelemetrySeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalEvaluationTelemetryRecordKind =
  | "offline_evaluation_summary"
  | "live_evaluation_summary"
  | "failure_metrics_summary"
  | "golden_case_validation_summary"
  | "app_evaluation_summary"
  | "usage_summary"
  | "redaction_summary"
  | "raw_leak_scan_summary"
  | "readiness_summary";

export type LiveProposalEvaluationTelemetryRecord = {
  recordId: string;
  kind: LiveProposalEvaluationTelemetryRecordKind;
  source: string;
  status: "passed" | "warning" | "blocked" | "missing";
  summary: string;
  reportId?: string | undefined;
  hash?: string | undefined;
  caseCount?: number | undefined;
  count?: number | undefined;
  warningCodes: string[];
};

export type LiveProposalEvaluationUsageTelemetrySummary = {
  usageSummaryCaseCount: number;
  requestCount: number;
  responseCount: number;
  totalPromptTokens?: number | undefined;
  totalCompletionTokens?: number | undefined;
  totalTokens?: number | undefined;
};

export type LiveProposalEvaluationRedactionSummary = {
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

export type LiveProposalEvaluationTelemetryReadiness = {
  canEnterRcSummary: boolean;
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

export type LiveProposalEvaluationTelemetryAuditReport = {
  status: LiveProposalEvaluationTelemetryAuditStatus;
  auditId: string;
  auditMode: "disabled" | "summary_only_audit";
  recordCount: number;
  offlineReportCount: number;
  liveReportCount: number;
  metricsReportCount: number;
  appSummaryCount: number;
  rawFieldDetectedCount: number;
  redactedFieldCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  usageSummary?: LiveProposalEvaluationUsageTelemetrySummary | undefined;
  redactionSummary: LiveProposalEvaluationRedactionSummary;
  records: LiveProposalEvaluationTelemetryRecord[];
  findings: LiveProposalEvaluationTelemetryFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: LiveProposalEvaluationTelemetryReadiness;
  nextAction: string;
  source: "runtime_live_proposal_evaluation_telemetry_audit";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const apiKeyValueField = ["api", "Key", "Value"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const taxonomyCategories: LiveProposalGoldenCaseFailureCategory[] = [
  "schema_failure",
  "malformed_json",
  "repair_failed",
  "unsafe_path",
  "forbidden_field",
  "secret_marker",
  "missing_evidence",
  "missing_test_plan",
  "high_risk_operation",
  "hallucinated_path",
  "poor_objective_fit",
  "raw_content_leak",
  "reasoning_content_leak",
  "usage_summary_missing",
  "no_failure_expected"
];

const acceptedSources = new Set([
  "runtime_live_proposal_offline_evaluation_runner",
  "runtime_live_proposal_evaluation_runner",
  "runtime_live_proposal_failure_metrics",
  "runtime_live_proposal_golden_case_schema",
  "app_live_proposal_evaluation_summary"
]);

const recordKinds = new Set<LiveProposalEvaluationTelemetryRecordKind>([
  "offline_evaluation_summary",
  "live_evaluation_summary",
  "failure_metrics_summary",
  "golden_case_validation_summary",
  "app_evaluation_summary",
  "usage_summary",
  "redaction_summary",
  "raw_leak_scan_summary",
  "readiness_summary"
]);

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Response",
    "responseText",
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
    apiKeyField,
    apiKeyValueField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
    "env",
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
    "canCallLiveModel",
    "canFetchNetwork",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "canRunEvaluation",
    "canRunFromApp",
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

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: new RegExp(`\\b${bearerField}\\s+[A-Za-z0-9._-]{8,}\\b`, "i")
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
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
    code: "REASONING_CONTENT_MARKER",
    pattern: /reasoning_content|reasoningContent/i
  }
];

export function validateLiveProposalEvaluationTelemetryAuditInput(
  input: LiveProposalEvaluationTelemetryAuditInput = {}
): LiveProposalEvaluationTelemetryFinding[] {
  const findings: LiveProposalEvaluationTelemetryFinding[] = [];
  const auditMode = input.auditMode ?? "disabled";

  if (auditMode !== "disabled" && auditMode !== "summary_only_audit") {
    findings.push(finding("input", "blocker", "UNKNOWN_AUDIT_MODE"));
  }
  if (auditMode === "disabled") {
    findings.push(finding("input", "warning", "AUDIT_MODE_DISABLED"));
  }

  scanObject(input, findings);
  validateSources(input, findings);
  validateUsageSummaries(input, findings);
  validateOptionalTelemetryRecords(input, findings);
  validateDuplicateReportIds(input, findings);
  addWarnings(input, findings);

  return uniqueFindings(findings);
}

export function buildLiveProposalEvaluationTelemetryAudit(
  input: LiveProposalEvaluationTelemetryAuditInput = {}
): LiveProposalEvaluationTelemetryAuditReport {
  const findings = validateLiveProposalEvaluationTelemetryAuditInput(input);
  const usageSummary = aggregateUsage(input);
  const records = buildRecords(input, findings, usageSummary);
  const blockerCount = findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (findingItem) => findingItem.severity === "warning"
  ).length;
  const redactionSummary = redactionSummaryFrom(input, findings);
  const auditMode = input.auditMode ?? "disabled";
  const auditHash = stablePreviewHash(
    JSON.stringify({
      auditMode,
      records: records.map((recordItem) => [
        recordItem.kind,
        recordItem.source,
        recordItem.status,
        recordItem.reportId,
        recordItem.hash,
        recordItem.caseCount,
        recordItem.count
      ]),
      redactionSummary,
      usageSummary,
      blockerCount,
      warningCount,
      createdAt: input.createdAt
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
      `live-proposal-evaluation-telemetry-audit-${auditHash.slice(0, 12)}`,
    auditMode,
    recordCount: records.length,
    offlineReportCount: input.offlineEvaluationReports?.length ?? 0,
    liveReportCount: input.liveEvaluationReports?.length ?? 0,
    metricsReportCount: input.failureMetricsReports?.length ?? 0,
    appSummaryCount: input.appEvaluationSummaryViews?.length ?? 0,
    rawFieldDetectedCount: redactionSummary.rawFieldDetectedCount,
    redactedFieldCount: redactionSummary.redactedFieldCount,
    apiKeyLeakDetected: redactionSummary.apiKeyLeakDetected,
    rawPromptDetected: redactionSummary.rawPromptDetected,
    rawResponseDetected: redactionSummary.rawResponseDetected,
    reasoningContentPersisted: redactionSummary.reasoningContentPersisted,
    ...(usageSummary !== undefined ? { usageSummary } : {}),
    redactionSummary,
    records,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: disabledReadiness(blockerCount === 0 && status !== "empty"),
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_evaluation_telemetry_audit"
  };
}

export function summarizeLiveProposalEvaluationTelemetryAudit(
  report: LiveProposalEvaluationTelemetryAuditReport
): {
  status: LiveProposalEvaluationTelemetryAuditStatus;
  auditId: string;
  auditMode: "disabled" | "summary_only_audit";
  recordCount: number;
  offlineReportCount: number;
  liveReportCount: number;
  metricsReportCount: number;
  appSummaryCount: number;
  rawFieldDetectedCount: number;
  redactedFieldCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  source: "runtime_live_proposal_evaluation_telemetry_audit_summary";
} {
  return {
    status: report.status,
    auditId: report.auditId,
    auditMode: report.auditMode,
    recordCount: report.recordCount,
    offlineReportCount: report.offlineReportCount,
    liveReportCount: report.liveReportCount,
    metricsReportCount: report.metricsReportCount,
    appSummaryCount: report.appSummaryCount,
    rawFieldDetectedCount: report.rawFieldDetectedCount,
    redactedFieldCount: report.redactedFieldCount,
    apiKeyLeakDetected: report.apiKeyLeakDetected,
    rawPromptDetected: report.rawPromptDetected,
    rawResponseDetected: report.rawResponseDetected,
    reasoningContentPersisted: report.reasoningContentPersisted,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    auditHash: report.auditHash,
    source: "runtime_live_proposal_evaluation_telemetry_audit_summary"
  };
}

function buildRecords(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: readonly LiveProposalEvaluationTelemetryFinding[],
  usageSummary: LiveProposalEvaluationUsageTelemetrySummary | undefined
): LiveProposalEvaluationTelemetryRecord[] {
  if (!hasAnyArtifact(input)) {
    return [];
  }
  const records: LiveProposalEvaluationTelemetryRecord[] = [];
  for (const report of input.offlineEvaluationReports ?? []) {
    records.push(
      artifactRecord("offline_evaluation_summary", report, findings)
    );
  }
  for (const report of input.liveEvaluationReports ?? []) {
    records.push(artifactRecord("live_evaluation_summary", report, findings));
  }
  for (const report of input.failureMetricsReports ?? []) {
    records.push(artifactRecord("failure_metrics_summary", report, findings));
  }
  for (const result of input.goldenCaseValidationResults ?? []) {
    records.push(
      artifactRecord("golden_case_validation_summary", result, findings)
    );
  }
  for (const summary of input.appEvaluationSummaryViews ?? []) {
    records.push(artifactRecord("app_evaluation_summary", summary, findings));
  }
  records.push(usageRecord(usageSummary, findings));
  records.push(redactionRecord(input, findings));
  records.push(rawLeakRecord(input, findings));
  records.push(readinessRecord(findings));
  return records.map((recordItem) => ({
    ...recordItem,
    warningCodes: uniqueStrings(recordItem.warningCodes)
  }));
}

function artifactRecord(
  kind: LiveProposalEvaluationTelemetryRecordKind,
  artifact: unknown,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryRecord {
  const relevant = findingsForKind(kind, findings);
  const status = statusForFindings(relevant, artifact);
  const recordHash = artifactHash(artifact);
  const reportId = artifactId(artifact);
  const caseCount = artifactCaseCount(artifact);
  return record({
    kind,
    source: artifactSource(artifact),
    status,
    summary: artifactSummary(kind, artifact),
    reportId,
    hash: recordHash,
    caseCount,
    warningCodes: [
      ...relevant.map((findingItem) => findingItem.code),
      ...(status === "passed"
        ? []
        : [`${kind.toUpperCase()}_${status.toUpperCase()}`])
    ]
  });
}

function usageRecord(
  usageSummary: LiveProposalEvaluationUsageTelemetrySummary | undefined,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryRecord {
  const relevant = findings.filter(
    (findingItem) => findingItem.kind === "usage_summary"
  );
  if (usageSummary === undefined) {
    return record({
      kind: "usage_summary",
      source: "runtime_live_proposal_evaluation_telemetry_audit",
      status: "missing",
      summary: "usage summary missing",
      warningCodes: ["USAGE_SUMMARY_MISSING"]
    });
  }
  const count =
    usageSummary.totalTokens ??
    (usageSummary.totalPromptTokens ?? 0) +
      (usageSummary.totalCompletionTokens ?? 0);
  return record({
    kind: "usage_summary",
    source: "runtime_live_proposal_evaluation_telemetry_audit",
    status: statusForFindings(relevant, usageSummary),
    summary: `tokens:${count}`,
    hash: stablePreviewHash(JSON.stringify(usageSummary)),
    count,
    warningCodes: relevant.map((findingItem) => findingItem.code)
  });
}

function redactionRecord(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryRecord {
  const summary = redactionSummaryFrom(input, findings);
  const relevant = findings.filter(
    (findingItem) =>
      findingItem.kind === "redaction" || findingItem.kind === "raw_leak_scan"
  );
  return record({
    kind: "redaction_summary",
    source: "runtime_live_proposal_evaluation_telemetry_audit",
    status: statusForFindings(relevant, summary),
    summary: `raw:${summary.rawFieldDetectedCount} redacted:${summary.redactedFieldCount}`,
    hash: stablePreviewHash(JSON.stringify(summary)),
    count: summary.rawFieldDetectedCount,
    warningCodes: relevant.map((findingItem) => findingItem.code)
  });
}

function rawLeakRecord(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryRecord {
  const counts = leakCountsFrom(input);
  const relevant = findings.filter(
    (findingItem) =>
      findingItem.kind === "raw_leak_scan" ||
      [
        "RAW_LEAK_COUNT_PRESENT",
        "REASONING_LEAK_COUNT_PRESENT",
        "API_KEY_LEAK_DETECTED"
      ].includes(findingItem.code)
  );
  return record({
    kind: "raw_leak_scan_summary",
    source: "runtime_live_proposal_evaluation_telemetry_audit",
    status: statusForFindings(relevant, counts),
    summary: `raw leaks:${counts.rawLeakCount} reasoning leaks:${counts.reasoningLeakCount}`,
    hash: stablePreviewHash(JSON.stringify(counts)),
    count: counts.rawLeakCount + counts.reasoningLeakCount,
    warningCodes: relevant.map((findingItem) => findingItem.code)
  });
}

function readinessRecord(
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryRecord {
  const relevant = findings.filter(
    (findingItem) => findingItem.kind === "readiness"
  );
  return record({
    kind: "readiness_summary",
    source: "runtime_live_proposal_evaluation_telemetry_audit",
    status: statusForFindings(relevant, {}),
    summary: "all execution readiness remains false",
    hash: stablePreviewHash(JSON.stringify({ readiness: "disabled" })),
    warningCodes: relevant.map((findingItem) => findingItem.code)
  });
}

function record(args: {
  kind: LiveProposalEvaluationTelemetryRecordKind;
  source: string;
  status: LiveProposalEvaluationTelemetryRecord["status"];
  summary: string;
  reportId?: string | undefined;
  hash?: string | undefined;
  caseCount?: number | undefined;
  count?: number | undefined;
  warningCodes: readonly string[];
}): LiveProposalEvaluationTelemetryRecord {
  const recordHash = stablePreviewHash(
    JSON.stringify({
      kind: args.kind,
      source: args.source,
      status: args.status,
      summary: args.summary,
      reportId: args.reportId,
      hash: args.hash,
      caseCount: args.caseCount,
      count: args.count
    })
  );
  return {
    recordId: `${args.kind}-${recordHash.slice(0, 10)}`,
    kind: args.kind,
    source: safeSummaryText(args.source),
    status: args.status,
    summary: safeSummaryText(args.summary),
    ...(args.reportId !== undefined ? { reportId: args.reportId } : {}),
    ...(args.hash !== undefined ? { hash: args.hash } : {}),
    ...(args.caseCount !== undefined ? { caseCount: args.caseCount } : {}),
    ...(args.count !== undefined ? { count: args.count } : {}),
    warningCodes: args.warningCodes.map(safeCode).filter(Boolean)
  };
}

function validateSources(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  for (const artifact of artifacts(input)) {
    const source = artifactSource(artifact.value);
    if (!acceptedSources.has(source)) {
      findings.push(
        finding(artifact.kind, "blocker", "UNKNOWN_SUMMARY_SOURCE")
      );
    }
  }
}

function validateUsageSummaries(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  for (const value of [
    ...(input.offlineEvaluationReports ?? []),
    ...(input.liveEvaluationReports ?? []),
    ...(input.failureMetricsReports ?? []),
    ...(input.appEvaluationSummaryViews ?? [])
  ]) {
    scanUsageRecords(value, findings);
  }
}

function validateOptionalTelemetryRecords(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  for (const artifact of artifacts(input)) {
    const records = asArray(asRecord(artifact.value)?.records);
    for (const recordItem of records) {
      const kind = asRecord(recordItem)?.kind;
      if (typeof kind === "string" && !recordKinds.has(kind as never)) {
        findings.push(
          finding(
            "telemetry_record",
            "blocker",
            "UNKNOWN_TELEMETRY_RECORD_KIND"
          )
        );
      }
    }
  }
}

function validateDuplicateReportIds(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  const seen = new Map<string, string>();
  for (const artifact of artifacts(input)) {
    const id = artifactId(artifact.value);
    const hash = artifactHash(artifact.value);
    if (id === undefined || hash === undefined) {
      continue;
    }
    const existing = seen.get(id);
    if (existing !== undefined && existing !== hash) {
      findings.push(
        finding("duplicate_report", "blocker", "DUPLICATE_REPORT_ID_CONFLICT")
      );
    }
    seen.set(id, hash);
  }
}

function addWarnings(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  if ((input.offlineEvaluationReports?.length ?? 0) === 0) {
    findings.push(
      finding("offline_evaluation_summary", "warning", "NO_OFFLINE_REPORTS")
    );
  }
  if ((input.liveEvaluationReports?.length ?? 0) === 0) {
    findings.push(
      finding("live_evaluation_summary", "warning", "NO_LIVE_REPORTS")
    );
  }
  if ((input.failureMetricsReports?.length ?? 0) === 0) {
    findings.push(
      finding("failure_metrics_summary", "warning", "NO_FAILURE_METRICS")
    );
  }
  if (aggregateUsage(input) === undefined) {
    findings.push(finding("usage_summary", "warning", "NO_USAGE_SUMMARY"));
  }
  if (
    (input.liveEvaluationReports ?? []).some((item) => item.usedLiveNetwork)
  ) {
    findings.push(
      finding("live_evaluation_summary", "warning", "LIVE_REPORT_USED_NETWORK")
    );
  }
  const counts = leakCountsFrom(input);
  if (counts.rawLeakCount > 0) {
    findings.push(
      finding("raw_leak_scan", "warning", "RAW_LEAK_COUNT_PRESENT")
    );
  }
  if (counts.reasoningLeakCount > 0) {
    findings.push(
      finding("raw_leak_scan", "warning", "REASONING_LEAK_COUNT_PRESENT")
    );
  }
  if (counts.apiKeyLeakCount > 0) {
    findings.push(finding("raw_leak_scan", "warning", "API_KEY_LEAK_DETECTED"));
  }
  if (failedExpectationCount(input) > 0) {
    findings.push(
      finding(
        "failure_metrics_summary",
        "warning",
        "FAILED_EXPECTATIONS_PRESENT"
      )
    );
  }
  if (artifactBlockerCount(input) > 0) {
    findings.push(
      finding("failure_metrics_summary", "warning", "ARTIFACT_BLOCKERS_PRESENT")
    );
  }
}

function scanObject(
  value: unknown,
  findings: LiveProposalEvaluationTelemetryFinding[],
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    if (
      taxonomyCategories.includes(
        value as LiveProposalGoldenCaseFailureCategory
      )
    ) {
      return;
    }
    for (const { code, pattern } of unsafeTextPatterns) {
      if (pattern.test(value)) {
        findings.push(finding("redaction", "blocker", code));
      }
    }
    if (looksLikeLongToken(value)) {
      findings.push(
        finding("redaction", "blocker", "TOKEN_LIKE_VALUE_REJECTED")
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      scanObject(item, findings, seen);
    }
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
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          "redaction",
          "blocker",
          `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
          "Forbidden evaluation telemetry field was rejected."
        )
      );
    }
    if (executionReadinessKeys.has(normalizedKey) && nestedValue === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_TRUE_REJECTED")
      );
    }
    scanObject(nestedValue, findings, seen);
  }
}

function scanUsageRecords(
  value: unknown,
  findings: LiveProposalEvaluationTelemetryFinding[],
  seen = new WeakSet<object>()
): void {
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "usagesummary" || lowerKey === "usagemetrics") {
      validateUsageRecord(nestedValue, findings);
    }
    if (Array.isArray(nestedValue)) {
      nestedValue.forEach((item) => scanUsageRecords(item, findings, seen));
    } else if (isRecord(nestedValue)) {
      scanUsageRecords(nestedValue, findings, seen);
    }
  }
}

function validateUsageRecord(
  value: unknown,
  findings: LiveProposalEvaluationTelemetryFinding[]
): void {
  if (!isRecord(value)) {
    return;
  }
  for (const nestedValue of Object.values(value)) {
    if (nestedValue === undefined) {
      continue;
    }
    if (typeof nestedValue !== "number" || !Number.isFinite(nestedValue)) {
      findings.push(
        finding("usage_summary", "blocker", "USAGE_SUMMARY_RAW_TEXT_REJECTED")
      );
    }
  }
}

function aggregateUsage(
  input: LiveProposalEvaluationTelemetryAuditInput
): LiveProposalEvaluationUsageTelemetrySummary | undefined {
  const usage: LiveProposalEvaluationUsageTelemetrySummary = {
    usageSummaryCaseCount: 0,
    requestCount: 0,
    responseCount: 0
  };
  let hasUsage = false;
  for (const report of input.offlineEvaluationReports ?? []) {
    for (const item of report.cases ?? []) {
      if (item.usageSummary !== undefined) {
        mergeUsage(usage, item.usageSummary);
        usage.usageSummaryCaseCount += 1;
        hasUsage = true;
      }
    }
  }
  for (const report of input.liveEvaluationReports ?? []) {
    if (report.usageSummary !== undefined) {
      mergeUsage(usage, report.usageSummary);
      usage.usageSummaryCaseCount += 1;
      hasUsage = true;
    }
    for (const item of report.caseResults ?? []) {
      if (item.usageSummary !== undefined) {
        mergeUsage(usage, item.usageSummary);
        usage.usageSummaryCaseCount += 1;
        hasUsage = true;
      }
    }
  }
  for (const report of input.failureMetricsReports ?? []) {
    if (report.usageMetrics !== undefined) {
      mergeFailureUsage(usage, report.usageMetrics);
      hasUsage = true;
    }
  }
  for (const summary of input.appEvaluationSummaryViews ?? []) {
    const usageRecord = asRecord(asRecord(summary)?.usageSummary);
    if (usageRecord !== undefined) {
      mergeAppUsage(usage, usageRecord);
      hasUsage = true;
    }
  }
  return hasUsage ? usage : undefined;
}

function mergeUsage(
  target: LiveProposalEvaluationUsageTelemetrySummary,
  usage:
    | LiveProposalOfflineEvaluationUsageSummary
    | LiveProposalEvaluationUsageSummary
): void {
  target.requestCount += usage.requestCount ?? 0;
  target.responseCount += usage.responseCount ?? 0;
  addNumber(target, "totalPromptTokens", usage.inputTokens);
  addNumber(target, "totalCompletionTokens", usage.outputTokens);
  addNumber(target, "totalTokens", usage.totalTokens);
}

function mergeFailureUsage(
  target: LiveProposalEvaluationUsageTelemetrySummary,
  usage: LiveProposalUsageMetrics
): void {
  target.usageSummaryCaseCount += usage.usageSummaryCaseCount;
  target.requestCount += usage.requestCount;
  target.responseCount += usage.responseCount;
  addNumber(target, "totalPromptTokens", usage.totalPromptTokens);
  addNumber(target, "totalCompletionTokens", usage.totalCompletionTokens);
  addNumber(target, "totalTokens", usage.totalTokens);
}

function mergeAppUsage(
  target: LiveProposalEvaluationUsageTelemetrySummary,
  usage: Record<string, unknown>
): void {
  target.usageSummaryCaseCount += safeNumber(usage.usageSummaryCaseCount);
  target.requestCount += safeNumber(usage.requestCount);
  target.responseCount += safeNumber(usage.responseCount);
  addNumber(target, "totalPromptTokens", numberValue(usage.totalPromptTokens));
  addNumber(
    target,
    "totalCompletionTokens",
    numberValue(usage.totalCompletionTokens)
  );
  addNumber(target, "totalTokens", numberValue(usage.totalTokens));
}

function addNumber(
  target: LiveProposalEvaluationUsageTelemetrySummary,
  key: "totalPromptTokens" | "totalCompletionTokens" | "totalTokens",
  value: number | undefined
): void {
  if (value !== undefined && Number.isFinite(value) && value >= 0) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function redactionSummaryFrom(
  input: LiveProposalEvaluationTelemetryAuditInput,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationRedactionSummary {
  const counts = leakCountsFrom(input);
  const rawFieldDetectedCount =
    findings.filter(isRawFinding).length + counts.rawLeakCount;
  const apiKeyLeakDetected =
    counts.apiKeyLeakCount > 0 ||
    findings.some((item) =>
      [
        "API_KEY_MARKER",
        "BEARER_TOKEN_MARKER",
        "AUTHORIZATION_HEADER_MARKER",
        "PRIVATE_KEY_MARKER",
        "TOKEN_LIKE_VALUE_REJECTED"
      ].includes(item.code)
    );
  const rawPromptDetected = findings.some((item) =>
    ["RAW_PROMPT_MARKER", "RAW_PROMPT_FIELD_REJECTED"].includes(item.code)
  );
  const rawResponseDetected = findings.some((item) =>
    ["RAW_RESPONSE_MARKER", "RAW_RESPONSE_FIELD_REJECTED"].includes(item.code)
  );
  const reasoningContentPersisted =
    counts.reasoningLeakCount > 0 ||
    findings.some((item) =>
      [
        "REASONING_CONTENT_MARKER",
        "REASONINGCONTENT_FIELD_REJECTED",
        "REASONING_CONTENT_FIELD_REJECTED"
      ].includes(item.code)
    );
  return {
    redactedFieldCount: redactedFieldCountFrom(input),
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
}

function leakCountsFrom(input: LiveProposalEvaluationTelemetryAuditInput): {
  rawLeakCount: number;
  reasoningLeakCount: number;
  apiKeyLeakCount: number;
} {
  let rawLeakCount = 0;
  let reasoningLeakCount = 0;
  let apiKeyLeakCount = 0;
  for (const artifact of artifacts(input)) {
    const recordValue = asRecord(artifact.value);
    rawLeakCount += safeNumber(recordValue?.rawLeakBlockedCount);
    rawLeakCount += safeNumber(recordValue?.rawFieldDetectedCount);
    reasoningLeakCount += safeNumber(recordValue?.reasoningLeakBlockedCount);
    if (recordValue?.reasoningContentPersisted === true) {
      reasoningLeakCount += 1;
    }
    if (recordValue?.apiKeyLeakDetected === true) {
      apiKeyLeakCount += 1;
    }
    const taxonomy =
      asRecord(recordValue?.taxonomySummary) ??
      asRecord(recordValue?.taxonomyMetrics);
    const categories = asRecord(taxonomy?.categories);
    rawLeakCount += safeNumber(categories?.raw_content_leak);
    reasoningLeakCount += safeNumber(categories?.reasoning_content_leak);
    apiKeyLeakCount += safeNumber(categories?.secret_marker);
    const redactionSummary = asRecord(recordValue?.redactionSummary);
    rawLeakCount += safeNumber(redactionSummary?.rawFieldDetectedCount);
    if (redactionSummary?.apiKeyLeakDetected === true) {
      apiKeyLeakCount += 1;
    }
    if (redactionSummary?.reasoningContentPersisted === true) {
      reasoningLeakCount += 1;
    }
  }
  return { rawLeakCount, reasoningLeakCount, apiKeyLeakCount };
}

function redactedFieldCountFrom(
  input: LiveProposalEvaluationTelemetryAuditInput
): number {
  let count = 0;
  for (const artifact of artifacts(input)) {
    const recordValue = asRecord(artifact.value);
    count += safeNumber(recordValue?.redactedFieldCount);
    count += safeNumber(
      asRecord(recordValue?.redactionSummary)?.redactedFieldCount
    );
  }
  return count;
}

function failedExpectationCount(
  input: LiveProposalEvaluationTelemetryAuditInput
): number {
  let count = 0;
  for (const artifact of artifacts(input)) {
    const recordValue = asRecord(artifact.value);
    count += safeNumber(recordValue?.failedExpectationCount);
    count += safeNumber(
      asRecord(recordValue?.expectationMetrics)?.failedExpectationCount
    );
    count += safeNumber(
      asRecord(recordValue?.passWarnBlockSummary)?.failedExpectationCount
    );
  }
  return count;
}

function artifactBlockerCount(
  input: LiveProposalEvaluationTelemetryAuditInput
): number {
  return artifacts(input).reduce(
    (sum, artifact) => sum + safeNumber(asRecord(artifact.value)?.blockerCount),
    0
  );
}

function artifacts(input: LiveProposalEvaluationTelemetryAuditInput): Array<{
  kind: LiveProposalEvaluationTelemetryFindingKind;
  value: unknown;
}> {
  return [
    ...(input.offlineEvaluationReports ?? []).map((value) => ({
      kind: "offline_evaluation_summary" as const,
      value
    })),
    ...(input.liveEvaluationReports ?? []).map((value) => ({
      kind: "live_evaluation_summary" as const,
      value
    })),
    ...(input.failureMetricsReports ?? []).map((value) => ({
      kind: "failure_metrics_summary" as const,
      value
    })),
    ...(input.goldenCaseValidationResults ?? []).map((value) => ({
      kind: "golden_case_validation_summary" as const,
      value
    })),
    ...(input.appEvaluationSummaryViews ?? []).map((value) => ({
      kind: "app_evaluation_summary" as const,
      value
    }))
  ];
}

function hasAnyArtifact(
  input: LiveProposalEvaluationTelemetryAuditInput
): boolean {
  return artifacts(input).length > 0;
}

function artifactSource(value: unknown): string {
  return safeString(asRecord(value)?.source, "unknown_source");
}

function artifactId(value: unknown): string | undefined {
  const recordValue = asRecord(value);
  return (
    readString(recordValue, "reportId") ??
    readString(recordValue, "metricsId") ??
    readString(recordValue, "summaryId") ??
    readString(asRecord(recordValue?.summary), "caseId")
  );
}

function artifactHash(value: unknown): string | undefined {
  const recordValue = asRecord(value);
  return (
    readString(recordValue, "reportHash") ??
    readString(recordValue, "metricsHash") ??
    readString(recordValue, "normalizedHash") ??
    readString(recordValue, "hashPrefix") ??
    readString(recordValue, "auditHash")
  );
}

function artifactCaseCount(value: unknown): number | undefined {
  const recordValue = asRecord(value);
  const valueCount =
    numberValue(recordValue?.caseCount) ??
    numberValue(asRecord(recordValue?.summary)?.caseCount);
  return valueCount !== undefined ? valueCount : undefined;
}

function artifactSummary(
  kind: LiveProposalEvaluationTelemetryRecordKind,
  value: unknown
): string {
  const recordValue = asRecord(value);
  const status = safeString(recordValue?.status, "unknown");
  const count = artifactCaseCount(value) ?? 0;
  return `${kind} status:${status} cases:${count}`;
}

function statusForFindings(
  findings: readonly LiveProposalEvaluationTelemetryFinding[],
  artifact: unknown
): LiveProposalEvaluationTelemetryRecord["status"] {
  if (findings.some((findingItem) => findingItem.severity === "blocker")) {
    return "blocked";
  }
  const recordValue = asRecord(artifact);
  const status = safeString(recordValue?.status, "");
  if (
    findings.some((findingItem) => findingItem.severity === "warning") ||
    status === "blocked" ||
    status === "failed" ||
    status === "warning" ||
    recordValue?.usedLiveNetwork === true ||
    safeNumber(recordValue?.blockerCount) > 0
  ) {
    return "warning";
  }
  return "passed";
}

function findingsForKind(
  kind: LiveProposalEvaluationTelemetryRecordKind,
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryFinding[] {
  const findingKind = kind.replace(
    "_summary",
    ""
  ) as LiveProposalEvaluationTelemetryFindingKind;
  return findings.filter((findingItem) => findingItem.kind === findingKind);
}

function statusFrom(args: {
  hasArtifact: boolean;
  blockerCount: number;
  warningCount: number;
}): LiveProposalEvaluationTelemetryAuditStatus {
  if (!args.hasArtifact) {
    return "empty";
  }
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "audit_ready";
}

function disabledReadiness(
  canEnterRcSummary: boolean
): LiveProposalEvaluationTelemetryReadiness {
  return {
    canEnterRcSummary,
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

function nextActionFor(
  status: LiveProposalEvaluationTelemetryAuditStatus
): string {
  if (status === "empty") {
    return "Provide summary-only evaluation artifacts for telemetry audit.";
  }
  if (status === "blocked") {
    return "Remove raw or execution-shaped telemetry before RC summary.";
  }
  if (status === "warning") {
    return "Review audit warnings before release summary; no telemetry write is enabled.";
  }
  return "Use summary-only telemetry audit for P0N RC review.";
}

function finding(
  kind: LiveProposalEvaluationTelemetryFindingKind,
  severity: LiveProposalEvaluationTelemetrySeverity,
  code: string,
  safeMessage = safeMessageFor(code)
): LiveProposalEvaluationTelemetryFinding {
  return {
    findingId: `${kind}-${code.toLowerCase()}`,
    kind,
    severity,
    code,
    safeMessage
  };
}

function uniqueFindings(
  findings: readonly LiveProposalEvaluationTelemetryFinding[]
): LiveProposalEvaluationTelemetryFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalEvaluationTelemetryFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function isRawFinding(item: LiveProposalEvaluationTelemetryFinding): boolean {
  return (
    item.kind === "redaction" ||
    item.code.includes("RAW_") ||
    item.code.includes("REASONING") ||
    item.code.includes("API_KEY") ||
    item.code.includes("AUTHORIZATION") ||
    item.code.includes("BEARER") ||
    item.code.includes("PRIVATE_KEY")
  );
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    UNKNOWN_AUDIT_MODE: "Evaluation telemetry audit mode is unsupported.",
    AUDIT_MODE_DISABLED: "Evaluation telemetry audit mode is disabled.",
    UNKNOWN_SUMMARY_SOURCE:
      "Evaluation telemetry artifact source is unsupported.",
    UNKNOWN_TELEMETRY_RECORD_KIND:
      "Evaluation telemetry record kind is unsupported.",
    DUPLICATE_REPORT_ID_CONFLICT:
      "Duplicate report ids must not have conflicting hashes.",
    USAGE_SUMMARY_RAW_TEXT_REJECTED:
      "Usage summary must contain numeric telemetry only.",
    NO_OFFLINE_REPORTS: "No offline evaluation reports were supplied.",
    NO_LIVE_REPORTS: "No live evaluation reports were supplied.",
    NO_FAILURE_METRICS: "No failure metrics reports were supplied.",
    NO_USAGE_SUMMARY: "No usage summary was supplied.",
    LIVE_REPORTS_PRESENT: "Live evaluation summaries are present.",
    LIVE_REPORT_USED_NETWORK:
      "A live evaluation report records injected network usage.",
    RAW_LEAK_COUNT_PRESENT: "Raw leak taxonomy count is present.",
    REASONING_LEAK_COUNT_PRESENT: "Reasoning leak taxonomy count is present.",
    API_KEY_LEAK_DETECTED: "API key leak summary is present.",
    FAILED_EXPECTATIONS_PRESENT:
      "Evaluation summaries contain failed expectations.",
    ARTIFACT_BLOCKERS_PRESENT: "Evaluation summaries contain blockers.",
    TELEMETRY_PERSISTENCE_DEFERRED:
      "Evaluation telemetry persistence remains deferred.",
    API_KEY_MARKER: "API key-like marker was rejected.",
    BEARER_TOKEN_MARKER: "Bearer token marker was rejected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization header marker was rejected.",
    PRIVATE_KEY_MARKER: "Private key marker was rejected.",
    RAW_PROMPT_MARKER: "Raw prompt marker was rejected.",
    RAW_RESPONSE_MARKER: "Raw response marker was rejected.",
    RAW_SOURCE_MARKER: "Raw source marker was rejected.",
    RAW_DIFF_MARKER: "Raw diff marker was rejected.",
    REASONING_CONTENT_MARKER: "reasoning_content marker was rejected.",
    TOKEN_LIKE_VALUE_REJECTED: "Long token-like value was rejected.",
    EXECUTION_READINESS_TRUE_REJECTED: "Execution readiness must remain false."
  };
  return messages[code] ?? "Evaluation telemetry audit finding.";
}

function safeSummaryText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 240);
}

function safeCode(value: string): string {
  return value
    .replace(/[^A-Z0-9_]/gi, "_")
    .toUpperCase()
    .slice(0, 120);
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readString(
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeLongToken(value: string): boolean {
  if (/^[a-f0-9]{48,64}$/i.test(value)) {
    return false;
  }
  return /[A-Za-z0-9_-]{48,}/.test(value);
}
