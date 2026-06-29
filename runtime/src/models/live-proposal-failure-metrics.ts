import {
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseValidationResult
} from "./live-proposal-golden-case-schema.js";
import {
  type LiveProposalOfflineEvaluationReport,
  type LiveProposalOfflineEvaluationUsageSummary
} from "./live-proposal-offline-evaluation-runner.js";
import {
  type LiveProposalEvaluationReport,
  type LiveProposalEvaluationUsageSummary
} from "./live-proposal-evaluation-runner.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalFailureMetricsInput = {
  offlineEvaluationReports?: LiveProposalOfflineEvaluationReport[] | undefined;
  liveEvaluationReports?: LiveProposalEvaluationReport[] | undefined;
  goldenCaseValidationResults?:
    | LiveProposalGoldenCaseValidationResult[]
    | undefined;
  taxonomyFilter?: LiveProposalGoldenCaseFailureCategory[] | undefined;
  includeUsageSummary?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalFailureMetricsStatus =
  | "empty"
  | "metrics_ready"
  | "warning"
  | "blocked";

export type LiveProposalFailureMetricsFindingKind =
  | "input"
  | "source"
  | "taxonomy"
  | "repair_metrics"
  | "schema_metrics"
  | "expectation_metrics"
  | "usage_metrics"
  | "redaction"
  | "duplicate_report"
  | "readiness";

export type LiveProposalFailureMetricsSeverity = "blocker" | "warning";

export type LiveProposalFailureMetricsFinding = {
  findingId: string;
  kind: LiveProposalFailureMetricsFindingKind;
  severity: LiveProposalFailureMetricsSeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalFailureTaxonomyMetrics = {
  categories: Record<LiveProposalGoldenCaseFailureCategory, number>;
  filteredCategories: LiveProposalGoldenCaseFailureCategory[];
  totalFailureCategoryCount: number;
  dominantCategories: LiveProposalGoldenCaseFailureCategory[];
  unsafePathBlockedCount: number;
  forbiddenFieldBlockedCount: number;
  secretMarkerBlockedCount: number;
  rawLeakBlockedCount: number;
  reasoningLeakBlockedCount: number;
  malformedJsonCount: number;
  missingEvidenceCount: number;
  missingTestPlanCount: number;
  highRiskOperationCount: number;
  hallucinatedPathCount: number;
  poorObjectiveFitCount: number;
};

export type LiveProposalRepairMetrics = {
  repairAttemptCount: number;
  repairSuccessCount: number;
  repairFailureCount: number;
  repairSuccessRate: number;
};

export type LiveProposalSchemaMetrics = {
  schemaEvaluatedCaseCount: number;
  schemaPassedCount: number;
  schemaBlockedCount: number;
  schemaWarningCount: number;
  schemaPassRate: number;
};

export type LiveProposalExpectationMetrics = {
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
  matchedExpectationCount: number;
};

export type LiveProposalUsageMetrics = {
  usageSummaryCaseCount: number;
  requestCount: number;
  responseCount: number;
  totalPromptTokens?: number | undefined;
  totalCompletionTokens?: number | undefined;
  totalTokens?: number | undefined;
};

export type LiveProposalFailureMetricsReadiness = {
  canEnterAppEvaluationSummary: boolean;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canPersistRawPrompt: false;
  canPersistRawResponse: false;
  canPersistReasoningContent: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalFailureMetricsReport = {
  status: LiveProposalFailureMetricsStatus;
  metricsId: string;
  reportCount: number;
  caseCount: number;
  offlineCaseCount: number;
  liveCaseCount: number;
  taxonomyMetrics: LiveProposalFailureTaxonomyMetrics;
  repairMetrics: LiveProposalRepairMetrics;
  schemaMetrics: LiveProposalSchemaMetrics;
  expectationMetrics: LiveProposalExpectationMetrics;
  usageMetrics?: LiveProposalUsageMetrics | undefined;
  findings: LiveProposalFailureMetricsFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  metricsHash: string;
  readiness: LiveProposalFailureMetricsReadiness;
  nextAction: string;
  source: "runtime_live_proposal_failure_metrics";
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

const blockerTaxonomyCategories: LiveProposalGoldenCaseFailureCategory[] = [
  "schema_failure",
  "malformed_json",
  "repair_failed",
  "unsafe_path",
  "forbidden_field",
  "secret_marker",
  "raw_content_leak",
  "reasoning_content_leak"
];

const acceptedSources = new Set([
  "runtime_live_proposal_offline_evaluation_runner",
  "runtime_live_proposal_evaluation_runner",
  "runtime_live_proposal_golden_case_schema"
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

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\bsk-[a-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: new RegExp(`\\b${bearerField}\\s+[a-z0-9._-]{8,}`, "i")
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`${authHeaderField}\\s*:`, "i")
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
] satisfies Array<{ code: string; pattern: RegExp }>;

export function validateLiveProposalFailureMetricsInput(
  input: LiveProposalFailureMetricsInput = {}
): LiveProposalFailureMetricsFinding[] {
  const findings: LiveProposalFailureMetricsFinding[] = [];
  scanObject(input, (code, message) => {
    findings.push(finding("redaction", "blocker", code, message));
  });

  const reports = allReports(input);
  const goldenResults = input.goldenCaseValidationResults ?? [];
  if (reports.length === 0 && goldenResults.length === 0) {
    findings.push(finding("input", "blocker", "NO_SUMMARY_REPORTS"));
  }

  validateSources(input, findings);
  validateTaxonomyObjects(input, findings);
  validateTaxonomyFilter(input.taxonomyFilter, findings);
  validateDuplicateReports(reports, findings);

  if ((input.liveEvaluationReports?.length ?? 0) === 0) {
    findings.push(finding("source", "warning", "NO_LIVE_EVALUATION_REPORTS"));
  }
  if ((input.offlineEvaluationReports?.length ?? 0) === 0) {
    findings.push(
      finding("source", "warning", "NO_OFFLINE_EVALUATION_REPORTS")
    );
  }
  if (!hasUsageSummary(input)) {
    findings.push(finding("usage_metrics", "warning", "NO_USAGE_SUMMARY"));
  }

  const preMetrics = aggregateMetrics(input);
  addMetricWarnings(preMetrics, input, findings);
  validateReadiness(input, findings);

  return uniqueFindings(findings);
}

export function buildLiveProposalFailureMetrics(
  input: LiveProposalFailureMetricsInput = {}
): LiveProposalFailureMetricsReport {
  const findings = validateLiveProposalFailureMetricsInput(input);
  const metrics = aggregateMetrics(input);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status = statusFor({
    hasArtifacts: metrics.reportCount > 0 || metrics.goldenCaseCount > 0,
    blockerCount,
    warningCount
  });
  const usageMetrics =
    input.includeUsageSummary === false ? undefined : metrics.usageMetrics;
  const metricsHash = stablePreviewHash(
    JSON.stringify({
      reportCount: metrics.reportCount,
      caseCount: metrics.caseCount,
      offlineCaseCount: metrics.offlineCaseCount,
      liveCaseCount: metrics.liveCaseCount,
      taxonomyMetrics: metrics.taxonomyMetrics,
      repairMetrics: metrics.repairMetrics,
      schemaMetrics: metrics.schemaMetrics,
      expectationMetrics: metrics.expectationMetrics,
      usageMetrics,
      blockerCount,
      warningCount,
      createdAt: input.createdAt
    })
  );

  return {
    status,
    metricsId:
      input.idGenerator?.() ??
      `live-proposal-failure-metrics-${metricsHash.slice(0, 12)}`,
    reportCount: metrics.reportCount + metrics.goldenCaseCount,
    caseCount: metrics.caseCount,
    offlineCaseCount: metrics.offlineCaseCount,
    liveCaseCount: metrics.liveCaseCount,
    taxonomyMetrics: metrics.taxonomyMetrics,
    repairMetrics: metrics.repairMetrics,
    schemaMetrics: metrics.schemaMetrics,
    expectationMetrics: metrics.expectationMetrics,
    ...(usageMetrics !== undefined ? { usageMetrics } : {}),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    metricsHash,
    readiness: disabledReadiness(blockerCount === 0 && status !== "empty"),
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_failure_metrics"
  };
}

export function summarizeLiveProposalFailureMetrics(
  report: LiveProposalFailureMetricsReport
): {
  status: LiveProposalFailureMetricsStatus;
  metricsId: string;
  reportCount: number;
  caseCount: number;
  offlineCaseCount: number;
  liveCaseCount: number;
  failedExpectationCount: number;
  schemaPassRate: number;
  repairSuccessRate: number;
  totalFailureCategoryCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  metricsHash: string;
  source: "runtime_live_proposal_failure_metrics_summary";
} {
  return {
    status: report.status,
    metricsId: report.metricsId,
    reportCount: report.reportCount,
    caseCount: report.caseCount,
    offlineCaseCount: report.offlineCaseCount,
    liveCaseCount: report.liveCaseCount,
    failedExpectationCount: report.expectationMetrics.failedExpectationCount,
    schemaPassRate: report.schemaMetrics.schemaPassRate,
    repairSuccessRate: report.repairMetrics.repairSuccessRate,
    totalFailureCategoryCount: report.taxonomyMetrics.totalFailureCategoryCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    metricsHash: report.metricsHash,
    source: "runtime_live_proposal_failure_metrics_summary"
  };
}

function aggregateMetrics(input: LiveProposalFailureMetricsInput): {
  reportCount: number;
  goldenCaseCount: number;
  caseCount: number;
  offlineCaseCount: number;
  liveCaseCount: number;
  taxonomyMetrics: LiveProposalFailureTaxonomyMetrics;
  repairMetrics: LiveProposalRepairMetrics;
  schemaMetrics: LiveProposalSchemaMetrics;
  expectationMetrics: LiveProposalExpectationMetrics;
  usageMetrics?: LiveProposalUsageMetrics | undefined;
} {
  const offlineReports = input.offlineEvaluationReports ?? [];
  const liveReports = input.liveEvaluationReports ?? [];
  const goldenResults = input.goldenCaseValidationResults ?? [];
  const taxonomyMetrics = emptyTaxonomyMetrics(input.taxonomyFilter);
  const expectationMetrics: LiveProposalExpectationMetrics = {
    passedCount: 0,
    warningCount: 0,
    blockedCount: 0,
    failedExpectationCount: 0,
    matchedExpectationCount: 0
  };
  let repairAttemptCount = 0;
  let repairSuccessCount = 0;
  let schemaEvaluatedCaseCount = 0;
  let schemaPassedCount = 0;
  let schemaBlockedCount = 0;
  let schemaWarningCount = 0;
  let usageSummaryCaseCount = 0;
  const usageMetrics: LiveProposalUsageMetrics = {
    usageSummaryCaseCount: 0,
    requestCount: 0,
    responseCount: 0
  };

  for (const report of offlineReports) {
    expectationMetrics.passedCount += report.passedCount;
    expectationMetrics.warningCount += report.warningCount;
    expectationMetrics.blockedCount += report.blockedCount;
    expectationMetrics.failedExpectationCount += report.failedExpectationCount;
    mergeTaxonomy(taxonomyMetrics, report.taxonomySummary.categories);
    repairAttemptCount += report.repairAttemptCount;
    for (const item of report.cases) {
      if (item.matchedExpectation) {
        expectationMetrics.matchedExpectationCount += 1;
      }
      if (item.repairSucceeded) {
        repairSuccessCount += 1;
      }
      schemaEvaluatedCaseCount += 1;
      if (item.schemaPassed) {
        schemaPassedCount += 1;
      }
      if (item.schemaStatus === "blocked" || item.actualStatus === "blocked") {
        schemaBlockedCount += 1;
      }
      if (item.schemaStatus === "warning" || item.actualStatus === "warning") {
        schemaWarningCount += 1;
      }
      if (item.usageSummary !== undefined) {
        usageSummaryCaseCount += 1;
        mergeUsage(usageMetrics, item.usageSummary);
      }
    }
    if (report.usageSummaryCaseCount > 0 && report.cases.length === 0) {
      usageSummaryCaseCount += report.usageSummaryCaseCount;
    }
  }

  for (const report of liveReports) {
    expectationMetrics.passedCount += report.passedCount;
    expectationMetrics.warningCount += report.warningCount;
    expectationMetrics.blockedCount += report.blockedCount;
    expectationMetrics.failedExpectationCount += report.failedExpectationCount;
    mergeTaxonomy(taxonomyMetrics, report.taxonomySummary.categories);
    for (const item of report.caseResults) {
      if (item.matchedExpectation) {
        expectationMetrics.matchedExpectationCount += 1;
      }
      repairAttemptCount += 1;
      if (item.repairSucceeded) {
        repairSuccessCount += 1;
      }
      schemaEvaluatedCaseCount += 1;
      if (item.schemaPassed) {
        schemaPassedCount += 1;
      }
      if (item.actualStatus === "blocked") {
        schemaBlockedCount += 1;
      }
      if (item.actualStatus === "warning") {
        schemaWarningCount += 1;
      }
      if (item.usageSummary !== undefined) {
        usageSummaryCaseCount += 1;
        mergeUsage(usageMetrics, item.usageSummary);
      }
    }
    if (report.usageSummary !== undefined) {
      mergeUsage(usageMetrics, report.usageSummary);
    }
  }

  for (const result of goldenResults) {
    mergeCategories(taxonomyMetrics, result.summary.expectedFailureCategories);
    schemaEvaluatedCaseCount += 1;
    if (result.status === "blocked") {
      schemaBlockedCount += 1;
      expectationMetrics.blockedCount += 1;
    } else {
      schemaPassedCount += 1;
      if (result.status === "warning") {
        schemaWarningCount += 1;
        expectationMetrics.warningCount += 1;
      } else {
        expectationMetrics.passedCount += 1;
      }
      expectationMetrics.matchedExpectationCount += 1;
    }
  }

  finalizeTaxonomy(taxonomyMetrics);
  const caseCount =
    offlineReports.reduce((sum, report) => sum + report.caseCount, 0) +
    liveReports.reduce((sum, report) => sum + report.caseCount, 0) +
    goldenResults.length;
  const repairMetrics: LiveProposalRepairMetrics = {
    repairAttemptCount,
    repairSuccessCount,
    repairFailureCount: Math.max(0, repairAttemptCount - repairSuccessCount),
    repairSuccessRate: rate(repairSuccessCount, repairAttemptCount)
  };
  const schemaMetrics: LiveProposalSchemaMetrics = {
    schemaEvaluatedCaseCount,
    schemaPassedCount,
    schemaBlockedCount,
    schemaWarningCount,
    schemaPassRate: rate(schemaPassedCount, schemaEvaluatedCaseCount)
  };
  usageMetrics.usageSummaryCaseCount = usageSummaryCaseCount;

  return {
    reportCount: offlineReports.length + liveReports.length,
    goldenCaseCount: goldenResults.length,
    caseCount,
    offlineCaseCount: offlineReports.reduce(
      (sum, report) => sum + report.caseCount,
      0
    ),
    liveCaseCount: liveReports.reduce(
      (sum, report) => sum + report.caseCount,
      0
    ),
    taxonomyMetrics,
    repairMetrics,
    schemaMetrics,
    expectationMetrics,
    usageMetrics:
      usageSummaryCaseCount > 0 || usageMetrics.requestCount > 0
        ? usageMetrics
        : undefined
  };
}

function validateSources(
  input: LiveProposalFailureMetricsInput,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  for (const report of input.offlineEvaluationReports ?? []) {
    if (!acceptedSources.has(report.source)) {
      findings.push(finding("source", "blocker", "UNKNOWN_REPORT_SOURCE"));
    }
  }
  for (const report of input.liveEvaluationReports ?? []) {
    if (!acceptedSources.has(report.source)) {
      findings.push(finding("source", "blocker", "UNKNOWN_REPORT_SOURCE"));
    }
  }
  for (const result of input.goldenCaseValidationResults ?? []) {
    if (!acceptedSources.has(result.source)) {
      findings.push(finding("source", "blocker", "UNKNOWN_REPORT_SOURCE"));
    }
  }
}

function validateTaxonomyObjects(
  input: LiveProposalFailureMetricsInput,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  for (const report of input.offlineEvaluationReports ?? []) {
    validateCategoryKeys(report.taxonomySummary.categories, findings);
    for (const item of report.cases) {
      validateCategoryList(item.failureCategories, findings);
    }
  }
  for (const report of input.liveEvaluationReports ?? []) {
    validateCategoryKeys(report.taxonomySummary.categories, findings);
    for (const item of report.caseResults) {
      validateCategoryList(item.failureCategories, findings);
    }
  }
  for (const result of input.goldenCaseValidationResults ?? []) {
    validateCategoryList(result.summary.expectedFailureCategories, findings);
  }
}

function validateCategoryKeys(
  categories: Record<string, unknown>,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  for (const key of Object.keys(categories)) {
    if (
      !taxonomyCategories.includes(key as LiveProposalGoldenCaseFailureCategory)
    ) {
      findings.push(finding("taxonomy", "blocker", "UNKNOWN_TAXONOMY"));
    }
  }
}

function validateCategoryList(
  categories: readonly string[],
  findings: LiveProposalFailureMetricsFinding[]
): void {
  for (const category of categories) {
    if (
      !taxonomyCategories.includes(
        category as LiveProposalGoldenCaseFailureCategory
      )
    ) {
      findings.push(finding("taxonomy", "blocker", "UNKNOWN_TAXONOMY"));
    }
  }
}

function validateTaxonomyFilter(
  filter: readonly LiveProposalGoldenCaseFailureCategory[] | undefined,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  if (filter === undefined) {
    return;
  }
  for (const category of filter) {
    if (!taxonomyCategories.includes(category)) {
      findings.push(finding("taxonomy", "blocker", "UNKNOWN_TAXONOMY"));
    }
  }
  const omitted = blockerTaxonomyCategories.filter(
    (category) => !filter.includes(category)
  );
  if (omitted.length > 0) {
    findings.push(
      finding("taxonomy", "warning", "TAXONOMY_FILTER_OMITS_BLOCKERS")
    );
  }
}

function validateDuplicateReports(
  reports: Array<{
    reportId: string;
    reportHash: string;
  }>,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  const seen = new Map<string, string>();
  for (const report of reports) {
    const existing = seen.get(report.reportId);
    if (existing !== undefined && existing !== report.reportHash) {
      findings.push(
        finding("duplicate_report", "blocker", "DUPLICATE_REPORT_ID_CONFLICT")
      );
    }
    seen.set(report.reportId, report.reportHash);
  }
}

function addMetricWarnings(
  metrics: ReturnType<typeof aggregateMetrics>,
  input: LiveProposalFailureMetricsInput,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  if (metrics.expectationMetrics.failedExpectationCount > 0) {
    findings.push(
      finding("expectation_metrics", "warning", "FAILED_EXPECTATIONS_PRESENT")
    );
  }
  if (
    metrics.repairMetrics.repairAttemptCount > 0 &&
    metrics.repairMetrics.repairSuccessRate < 0.8
  ) {
    findings.push(
      finding("repair_metrics", "warning", "LOW_REPAIR_SUCCESS_RATE")
    );
  }
  if (
    metrics.schemaMetrics.schemaEvaluatedCaseCount > 0 &&
    metrics.schemaMetrics.schemaPassRate < 0.8
  ) {
    findings.push(finding("schema_metrics", "warning", "LOW_SCHEMA_PASS_RATE"));
  }
  if (metrics.taxonomyMetrics.unsafePathBlockedCount > 0) {
    findings.push(finding("taxonomy", "warning", "UNSAFE_PATH_COUNT_PRESENT"));
  }
  if (metrics.taxonomyMetrics.secretMarkerBlockedCount > 0) {
    findings.push(
      finding("taxonomy", "warning", "SECRET_MARKER_COUNT_PRESENT")
    );
  }
  if (metrics.taxonomyMetrics.malformedJsonCount > 0) {
    findings.push(
      finding("taxonomy", "warning", "MALFORMED_JSON_COUNT_PRESENT")
    );
  }
  if (
    (input.liveEvaluationReports ?? []).some((report) => report.usedLiveNetwork)
  ) {
    findings.push(finding("source", "warning", "LIVE_REPORT_USED_NETWORK"));
  }
  if (metrics.caseCount > 0 && metrics.caseCount < 3) {
    findings.push(finding("input", "warning", "EVALUATION_SAMPLE_SIZE_SMALL"));
  }
}

function validateReadiness(
  input: LiveProposalFailureMetricsInput,
  findings: LiveProposalFailureMetricsFinding[]
): void {
  scanReadiness(input.offlineEvaluationReports ?? [], findings);
  scanReadiness(input.liveEvaluationReports ?? [], findings);
  scanReadiness(input.goldenCaseValidationResults ?? [], findings);
}

function scanReadiness(
  values: unknown[],
  findings: LiveProposalFailureMetricsFinding[]
): void {
  for (const value of values) {
    scanObject(value, (code, message) => {
      findings.push(finding("readiness", "blocker", code, message));
    });
  }
}

function allReports(input: LiveProposalFailureMetricsInput): Array<{
  reportId: string;
  reportHash: string;
  source: string;
}> {
  return [
    ...(input.offlineEvaluationReports ?? []),
    ...(input.liveEvaluationReports ?? [])
  ];
}

function emptyTaxonomyMetrics(
  filter: readonly LiveProposalGoldenCaseFailureCategory[] | undefined
): LiveProposalFailureTaxonomyMetrics {
  const categories = Object.fromEntries(
    taxonomyCategories.map((category) => [category, 0])
  ) as Record<LiveProposalGoldenCaseFailureCategory, number>;
  return {
    categories,
    filteredCategories: filter !== undefined ? [...filter] : taxonomyCategories,
    totalFailureCategoryCount: 0,
    dominantCategories: [],
    unsafePathBlockedCount: 0,
    forbiddenFieldBlockedCount: 0,
    secretMarkerBlockedCount: 0,
    rawLeakBlockedCount: 0,
    reasoningLeakBlockedCount: 0,
    malformedJsonCount: 0,
    missingEvidenceCount: 0,
    missingTestPlanCount: 0,
    highRiskOperationCount: 0,
    hallucinatedPathCount: 0,
    poorObjectiveFitCount: 0
  };
}

function mergeTaxonomy(
  metrics: LiveProposalFailureTaxonomyMetrics,
  categories: Partial<Record<LiveProposalGoldenCaseFailureCategory, number>>
): void {
  for (const category of taxonomyCategories) {
    const value = categories[category];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      metrics.categories[category] += value;
    }
  }
}

function mergeCategories(
  metrics: LiveProposalFailureTaxonomyMetrics,
  categories: readonly LiveProposalGoldenCaseFailureCategory[]
): void {
  for (const category of categories) {
    if (taxonomyCategories.includes(category)) {
      metrics.categories[category] += 1;
    }
  }
}

function finalizeTaxonomy(metrics: LiveProposalFailureTaxonomyMetrics): void {
  metrics.totalFailureCategoryCount = taxonomyCategories.reduce(
    (sum, category) => sum + metrics.categories[category],
    0
  );
  metrics.dominantCategories = taxonomyCategories.filter(
    (category) => metrics.categories[category] > 0
  );
  metrics.unsafePathBlockedCount = metrics.categories.unsafe_path;
  metrics.forbiddenFieldBlockedCount = metrics.categories.forbidden_field;
  metrics.secretMarkerBlockedCount = metrics.categories.secret_marker;
  metrics.rawLeakBlockedCount = metrics.categories.raw_content_leak;
  metrics.reasoningLeakBlockedCount = metrics.categories.reasoning_content_leak;
  metrics.malformedJsonCount = metrics.categories.malformed_json;
  metrics.missingEvidenceCount = metrics.categories.missing_evidence;
  metrics.missingTestPlanCount = metrics.categories.missing_test_plan;
  metrics.highRiskOperationCount = metrics.categories.high_risk_operation;
  metrics.hallucinatedPathCount = metrics.categories.hallucinated_path;
  metrics.poorObjectiveFitCount = metrics.categories.poor_objective_fit;
}

function mergeUsage(
  metrics: LiveProposalUsageMetrics,
  usage:
    | LiveProposalOfflineEvaluationUsageSummary
    | LiveProposalEvaluationUsageSummary
): void {
  metrics.requestCount += usage.requestCount ?? 0;
  metrics.responseCount += usage.responseCount ?? 0;
  if (isSafeNonNegativeNumber(usage.inputTokens)) {
    metrics.totalPromptTokens =
      (metrics.totalPromptTokens ?? 0) + usage.inputTokens;
  }
  if (isSafeNonNegativeNumber(usage.outputTokens)) {
    metrics.totalCompletionTokens =
      (metrics.totalCompletionTokens ?? 0) + usage.outputTokens;
  }
  if (isSafeNonNegativeNumber(usage.totalTokens)) {
    metrics.totalTokens = (metrics.totalTokens ?? 0) + usage.totalTokens;
  }
}

function hasUsageSummary(input: LiveProposalFailureMetricsInput): boolean {
  return (
    (input.offlineEvaluationReports ?? []).some((report) =>
      report.cases.some((item) => item.usageSummary !== undefined)
    ) ||
    (input.liveEvaluationReports ?? []).some(
      (report) =>
        report.usageSummary !== undefined ||
        report.caseResults.some((item) => item.usageSummary !== undefined)
    )
  );
}

function statusFor(args: {
  hasArtifacts: boolean;
  blockerCount: number;
  warningCount: number;
}): LiveProposalFailureMetricsStatus {
  if (!args.hasArtifacts) {
    return "empty";
  }
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "metrics_ready";
}

function disabledReadiness(
  canEnterAppEvaluationSummary: boolean
): LiveProposalFailureMetricsReadiness {
  return {
    canEnterAppEvaluationSummary,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canPersistRawPrompt: false,
    canPersistRawResponse: false,
    canPersistReasoningContent: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: LiveProposalFailureMetricsStatus): string {
  if (status === "empty") {
    return "Provide summary-only evaluation reports or golden case results.";
  }
  if (status === "blocked") {
    return "Resolve metrics blockers before publishing evaluation summaries.";
  }
  if (status === "warning") {
    return "Review warning metrics before treating the taxonomy as stable.";
  }
  return "Use summary-only metrics for P0N evaluation tracking.";
}

function scanObject(
  value: unknown,
  onFinding: (code: string, safeMessage: string) => void,
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
        onFinding(code, safeMessageFor(code));
      }
    }
    if (looksLikeLongToken(value)) {
      onFinding(
        "TOKEN_LIKE_VALUE_REJECTED",
        safeMessageFor("TOKEN_LIKE_VALUE_REJECTED")
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      scanObject(item, onFinding, seen);
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
      onFinding(
        `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
        "Forbidden metrics input field was rejected."
      );
    }
    if (
      key.startsWith("can") &&
      nestedValue === true &&
      key !== "canEnterAppEvaluationSummary"
    ) {
      onFinding(
        "EXECUTION_READINESS_TRUE_REJECTED",
        "Execution readiness must remain false."
      );
    }
    scanObject(nestedValue, onFinding, seen);
  }
}

function finding(
  kind: LiveProposalFailureMetricsFindingKind,
  severity: LiveProposalFailureMetricsSeverity,
  code: string,
  safeMessage = safeMessageFor(code)
): LiveProposalFailureMetricsFinding {
  return {
    findingId: `${kind}-${code.toLowerCase()}`,
    kind,
    severity,
    code,
    safeMessage
  };
}

function uniqueFindings(
  findings: readonly LiveProposalFailureMetricsFinding[]
): LiveProposalFailureMetricsFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalFailureMetricsFinding[] = [];
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

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function looksLikeLongToken(value: string): boolean {
  if (/^[a-f0-9]{48,64}$/i.test(value)) {
    return false;
  }
  return /[A-Za-z0-9_-]{48,}/.test(value);
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    NO_SUMMARY_REPORTS:
      "At least one summary report or golden case result is required.",
    UNKNOWN_REPORT_SOURCE: "Metrics input contains an unsupported source.",
    UNKNOWN_TAXONOMY: "Metrics input contains an unknown taxonomy category.",
    TAXONOMY_FILTER_OMITS_BLOCKERS:
      "Taxonomy filter omits one or more blocker categories.",
    DUPLICATE_REPORT_ID_CONFLICT:
      "Duplicate report ids must not have conflicting hashes.",
    NO_LIVE_EVALUATION_REPORTS: "No live evaluation reports were supplied.",
    NO_OFFLINE_EVALUATION_REPORTS:
      "No offline evaluation reports were supplied.",
    NO_USAGE_SUMMARY: "No usage summary was supplied.",
    FAILED_EXPECTATIONS_PRESENT:
      "Evaluation reports contain failed expectations.",
    LOW_REPAIR_SUCCESS_RATE: "Repair success rate is below threshold.",
    LOW_SCHEMA_PASS_RATE: "Schema pass rate is below threshold.",
    UNSAFE_PATH_COUNT_PRESENT: "Unsafe path taxonomy count is present.",
    SECRET_MARKER_COUNT_PRESENT: "Secret marker taxonomy count is present.",
    MALFORMED_JSON_COUNT_PRESENT: "Malformed JSON taxonomy count is present.",
    LIVE_REPORT_USED_NETWORK:
      "A live evaluation report records injected network usage.",
    EVALUATION_SAMPLE_SIZE_SMALL: "Evaluation sample size is small.",
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
    EXECUTION_READINESS_TRUE_REJECTED:
      "Execution readiness flags must remain false."
  };
  return messages[code] ?? "Failure metrics finding recorded.";
}
