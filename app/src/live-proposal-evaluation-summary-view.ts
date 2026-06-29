import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalEvaluationSummaryStatus =
  | "empty"
  | "summary_ready"
  | "warning"
  | "blocked";

export type LiveProposalEvaluationSummarySeverity = "blocker" | "warning";

export type LiveProposalEvaluationSummaryFinding = {
  code: string;
  severity: LiveProposalEvaluationSummarySeverity;
  safeMessage: string;
};

export type LiveProposalEvaluationSummaryPassWarnBlock = {
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
};

export type LiveProposalEvaluationTaxonomySummary = {
  categories: Record<LiveProposalEvaluationFailureCategory, number>;
  totalFailureCategoryCount: number;
  dominantCategories: LiveProposalEvaluationFailureCategory[];
};

export type LiveProposalEvaluationUsageSummary = {
  requestCount?: number | undefined;
  responseCount?: number | undefined;
  totalPromptTokens?: number | undefined;
  totalCompletionTokens?: number | undefined;
  totalTokens?: number | undefined;
  usageSummaryCaseCount?: number | undefined;
};

export type LiveProposalEvaluationFindingSummary = {
  blockerCodes: string[];
  warningCodes: string[];
};

export type LiveProposalEvaluationSummaryReadiness = {
  canDisplaySummary: boolean;
  canRunEvaluation: false;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canPersistRawPrompt: false;
  canPersistRawResponse: false;
  canPersistReasoningContent: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalEvaluationSummaryView = {
  status: LiveProposalEvaluationSummaryStatus;
  source: "app_live_proposal_evaluation_summary";
  summaryId: string;
  sourceKind: "paste" | "fixture" | "manual_test";
  reportCount: number;
  caseCount: number;
  offlineCaseCount: number;
  liveCaseCount: number;
  passWarnBlockSummary: LiveProposalEvaluationSummaryPassWarnBlock;
  schemaPassRate?: number | undefined;
  repairSuccessRate?: number | undefined;
  taxonomySummary: LiveProposalEvaluationTaxonomySummary;
  usageSummary?: LiveProposalEvaluationUsageSummary | undefined;
  findingSummary: LiveProposalEvaluationFindingSummary;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix?: string | undefined;
  readiness: LiveProposalEvaluationSummaryReadiness;
  findings: LiveProposalEvaluationSummaryFinding[];
  nextAction: string;
};

export type LiveProposalEvaluationSummaryInput = {
  summaryJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalEvaluationSummaryParseResult =
  | {
      ok: true;
      value: Record<string, unknown>;
      findings: LiveProposalEvaluationSummaryFinding[];
    }
  | {
      ok: false;
      status: "empty" | "blocked";
      findings: LiveProposalEvaluationSummaryFinding[];
    };

export type LiveProposalEvaluationFailureCategory =
  | "schema_failure"
  | "malformed_json"
  | "repair_failed"
  | "unsafe_path"
  | "forbidden_field"
  | "secret_marker"
  | "missing_evidence"
  | "missing_test_plan"
  | "high_risk_operation"
  | "hallucinated_path"
  | "poor_objective_fit"
  | "raw_content_leak"
  | "reasoning_content_leak"
  | "usage_summary_missing"
  | "no_failure_expected";

const taxonomyCategories: LiveProposalEvaluationFailureCategory[] = [
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

const forbiddenFieldNames = new Set(
  [
    "raw" + "Prompt",
    "promptText",
    "rawResponse",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    "rawSource",
    "rawDiff",
    "rawPatch",
    "raw" + "Dom",
    "rawCsv",
    "raw" + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
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
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canRunEvaluation",
    "canCallLiveModel",
    "canReadApiKey",
    "canFetchNetwork",
    "canPersistRawPrompt",
    "canPersistRawResponse",
    "canPersistReasoningContent",
    "canWriteFilesystem",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "canRunFromApp",
    "canCallDeepSeekFromApp",
    "canReadApiKeyFromApp",
    "canFetchNetworkFromApp",
    "canSendLiveRequest",
    "fetchEnabled",
    "networkEnabled",
    "liveCallEnabled",
    "sendRequestEnabled",
    "apiKeyReadEnabled",
    "appExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${"raw"}Prompt\\b|raw prompt`, "i")
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: /\brawResponse\b|raw response/i
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: /\brawSource\b|raw source/i
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: /\brawDiff\b|raw diff/i
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /reasoning_content|reasoningContent/i
  }
];

export function parseLiveProposalEvaluationSummaryJson(
  text: string
): LiveProposalEvaluationSummaryParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, status: "empty", findings: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) {
      return {
        ok: false,
        status: "blocked",
        findings: [
          finding(
            "MALFORMED_SUMMARY_JSON",
            "blocker",
            "Evaluation summary JSON must be an object."
          )
        ]
      };
    }
    return { ok: true, value: parsed, findings: [] };
  } catch {
    return {
      ok: false,
      status: "blocked",
      findings: [
        finding(
          "MALFORMED_SUMMARY_JSON",
          "blocker",
          "Evaluation summary JSON could not be parsed."
        )
      ]
    };
  }
}

export function buildLiveProposalEvaluationSummaryView(
  input: LiveProposalEvaluationSummaryInput = {}
): LiveProposalEvaluationSummaryView {
  const sourceKind = input.sourceKind ?? "paste";
  const parsed = parseLiveProposalEvaluationSummaryJson(
    safeText(input.summaryJsonText, "")
  );
  if (!parsed.ok) {
    const status = parsed.status;
    const hash = hashText(
      JSON.stringify({
        status,
        sourceKind,
        createdAt: input.createdAt ?? "not-provided"
      })
    );
    return viewFrom({
      status,
      sourceKind,
      hash,
      findings: parsed.findings,
      reportCount: 0,
      caseCount: 0,
      offlineCaseCount: 0,
      liveCaseCount: 0,
      passWarnBlockSummary: emptyPassWarnBlock(),
      taxonomySummary: emptyTaxonomySummary(),
      nextAction:
        status === "empty"
          ? "Paste summary-only evaluation metrics JSON to inspect read-only status."
          : "Provide valid summary-only evaluation metrics JSON."
    });
  }

  const findings = [...parsed.findings];
  scanSummary(parsed.value, findings);
  validateTaxonomy(parsed.value, findings);
  validateNumericMetrics(parsed.value, findings);
  validateUsageMetrics(parsed.value, findings);
  addSummaryWarnings(parsed.value, findings, sourceKind);

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const hash = hashText(
    stableStringify({
      summary: safeSummarySeed(parsed.value),
      sourceKind,
      blockerCount
    })
  );
  const status: LiveProposalEvaluationSummaryStatus =
    blockerCount > 0
      ? "blocked"
      : findings.some((item) => item.severity === "warning")
        ? "warning"
        : "summary_ready";

  return viewFrom({
    status,
    sourceKind,
    hash,
    findings,
    reportCount: readCount(parsed.value, "reportCount"),
    caseCount: readCount(parsed.value, "caseCount"),
    offlineCaseCount: readCount(parsed.value, "offlineCaseCount"),
    liveCaseCount: readCount(parsed.value, "liveCaseCount"),
    passWarnBlockSummary: readPassWarnBlock(parsed.value),
    schemaPassRate: readRateFrom(parsed.value, "schemaMetrics", "schemaPassRate"),
    repairSuccessRate: readRateFrom(
      parsed.value,
      "repairMetrics",
      "repairSuccessRate"
    ),
    taxonomySummary: readTaxonomySummary(parsed.value),
    usageSummary: readUsageSummary(parsed.value),
    nextAction: nextActionFor(status)
  });
}

export function summarizeLiveProposalEvaluationSummaryView(
  view: LiveProposalEvaluationSummaryView
): {
  status: LiveProposalEvaluationSummaryStatus;
  summaryId: string;
  reportCount: number;
  caseCount: number;
  passWarnBlockSummary: LiveProposalEvaluationSummaryPassWarnBlock;
  schemaPassRate?: number | undefined;
  repairSuccessRate?: number | undefined;
  taxonomySummary: LiveProposalEvaluationTaxonomySummary;
  usageSummary?: LiveProposalEvaluationUsageSummary | undefined;
  blockerCount: number;
  warningCount: number;
  hashPrefix?: string | undefined;
  nextAction: string;
  source: "app_live_proposal_evaluation_summary";
} {
  return {
    status: view.status,
    summaryId: view.summaryId,
    reportCount: view.reportCount,
    caseCount: view.caseCount,
    passWarnBlockSummary: view.passWarnBlockSummary,
    schemaPassRate: view.schemaPassRate,
    repairSuccessRate: view.repairSuccessRate,
    taxonomySummary: view.taxonomySummary,
    usageSummary: view.usageSummary,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

function viewFrom(args: {
  status: LiveProposalEvaluationSummaryStatus;
  sourceKind: "paste" | "fixture" | "manual_test";
  hash: string;
  findings: LiveProposalEvaluationSummaryFinding[];
  reportCount: number;
  caseCount: number;
  offlineCaseCount: number;
  liveCaseCount: number;
  passWarnBlockSummary: LiveProposalEvaluationSummaryPassWarnBlock;
  schemaPassRate?: number | undefined;
  repairSuccessRate?: number | undefined;
  taxonomySummary: LiveProposalEvaluationTaxonomySummary;
  usageSummary?: LiveProposalEvaluationUsageSummary | undefined;
  nextAction: string;
}): LiveProposalEvaluationSummaryView {
  const blockerCount = args.findings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (findingItem) => findingItem.severity === "warning"
  ).length;
  return {
    status: args.status,
    source: "app_live_proposal_evaluation_summary",
    summaryId: `live-proposal-evaluation-summary-${args.hash.slice(0, 12)}`,
    sourceKind: args.sourceKind,
    reportCount: args.reportCount,
    caseCount: args.caseCount,
    offlineCaseCount: args.offlineCaseCount,
    liveCaseCount: args.liveCaseCount,
    passWarnBlockSummary: args.passWarnBlockSummary,
    schemaPassRate: args.schemaPassRate,
    repairSuccessRate: args.repairSuccessRate,
    taxonomySummary: args.taxonomySummary,
    ...(args.usageSummary !== undefined ? { usageSummary: args.usageSummary } : {}),
    findingSummary: {
      blockerCodes: args.findings
        .filter((findingItem) => findingItem.severity === "blocker")
        .map((findingItem) => findingItem.code),
      warningCodes: args.findings
        .filter((findingItem) => findingItem.severity === "warning")
        .map((findingItem) => findingItem.code)
    },
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    hashPrefix: args.hash.slice(0, 12),
    readiness: readinessFor(args.status !== "empty" && blockerCount === 0),
    findings: args.findings,
    nextAction: args.nextAction
  };
}

function scanSummary(
  value: unknown,
  findings: LiveProposalEvaluationSummaryFinding[],
  seen = new WeakSet<object>(),
  path: string[] = []
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
      if (pattern.test(value)) {
        findings.push(finding(code, "blocker", safeMessageFor(code)));
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanSummary(item, findings, seen, [...path, String(index)]);
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
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldNames.has(normalizedKey)) {
      findings.push(
        finding(
          `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
          "blocker",
          "Forbidden evaluation summary field was rejected."
        )
      );
    }
    if (executionFlagNames.has(normalizedKey) && nestedValue === true) {
      findings.push(
        finding(
          "EVALUATION_SUMMARY_EXECUTION_FLAG_TRUE",
          "blocker",
          "Evaluation summary cannot claim App execution or mutation readiness."
        )
      );
    }
    if (
      normalizedKey === "source" &&
      typeof nestedValue === "string" &&
      /app.*(live|deepseek).*(call|runner|execution)/i.test(nestedValue)
    ) {
      findings.push(
        finding(
          "APP_LIVE_EXECUTION_SOURCE_REJECTED",
          "blocker",
          "Evaluation summary source cannot claim App live execution."
        )
      );
    }
    scanSummary(nestedValue, findings, seen, [...path, key]);
  }
}

function validateTaxonomy(
  value: Record<string, unknown>,
  findings: LiveProposalEvaluationSummaryFinding[]
): void {
  const taxonomy = readTaxonomyRecord(value);
  for (const key of Object.keys(taxonomy)) {
    if (!isTaxonomyCategory(key)) {
      findings.push(
        finding(
          "UNKNOWN_TAXONOMY_CATEGORY",
          "blocker",
          "Evaluation summary includes an unknown failure taxonomy category."
        )
      );
    }
  }
  for (const category of readDominantCategories(value)) {
    if (!isTaxonomyCategory(category)) {
      findings.push(
        finding(
          "UNKNOWN_TAXONOMY_CATEGORY",
          "blocker",
          "Evaluation summary includes an unknown dominant taxonomy category."
        )
      );
    }
  }
}

function validateNumericMetrics(
  value: unknown,
  findings: LiveProposalEvaluationSummaryFinding[],
  seen = new WeakSet<object>(),
  path: string[] = []
): void {
  if (typeof value === "number") {
    const key = path[path.length - 1] ?? "metric";
    if (!Number.isFinite(value) || value < 0) {
      findings.push(
        finding(
          "INVALID_NEGATIVE_OR_NONFINITE_METRIC",
          "blocker",
          "Evaluation summary numeric metrics must be finite and non-negative."
        )
      );
    }
    if (/rate/i.test(key) && (value < 0 || value > 1)) {
      findings.push(
        finding(
          "INVALID_RATE_METRIC",
          "blocker",
          "Evaluation summary rate metrics must be between 0 and 1."
        )
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateNumericMetrics(item, findings, seen, [...path, String(index)]);
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
    validateNumericMetrics(nestedValue, findings, seen, [...path, key]);
  }
}

function validateUsageMetrics(
  value: Record<string, unknown>,
  findings: LiveProposalEvaluationSummaryFinding[]
): void {
  const usage = readUsageRecord(value);
  if (usage === undefined) {
    return;
  }
  for (const nestedValue of Object.values(usage)) {
    if (
      nestedValue !== undefined &&
      typeof nestedValue !== "number" &&
      !isRecord(nestedValue)
    ) {
      findings.push(
        finding(
          "USAGE_SUMMARY_RAW_TEXT_REJECTED",
          "blocker",
          "Usage summary accepts numeric telemetry only."
        )
      );
    }
  }
}

function addSummaryWarnings(
  value: Record<string, unknown>,
  findings: LiveProposalEvaluationSummaryFinding[],
  sourceKind: "paste" | "fixture" | "manual_test"
): void {
  if (readUsageRecord(value) === undefined) {
    findings.push(
      finding(
        "USAGE_SUMMARY_MISSING",
        "warning",
        "Usage summary is missing from the evaluation metrics."
      )
    );
  }
  if (readCount(value, "caseCount") > 0 && readCount(value, "caseCount") < 3) {
    findings.push(
      finding(
        "LOW_CASE_COUNT",
        "warning",
        "Evaluation summary has a low case count."
      )
    );
  }
  if (readCount(value, "liveCaseCount") > 0) {
    findings.push(
      finding(
        "LIVE_CASES_PRESENT",
        "warning",
        "Live evaluation cases are summarized only and cannot be run by the App."
      )
    );
  }
  const passWarnBlock = readPassWarnBlock(value);
  if (passWarnBlock.failedExpectationCount > 0) {
    findings.push(
      finding(
        "FAILED_EXPECTATIONS_PRESENT",
        "warning",
        "Evaluation summary contains failed expectations."
      )
    );
  }
  if (passWarnBlock.blockedCount > 0) {
    findings.push(
      finding(
        "BLOCKED_CASES_PRESENT",
        "warning",
        "Evaluation summary contains blocked cases."
      )
    );
  }
  const schemaRate = readRateFrom(value, "schemaMetrics", "schemaPassRate");
  if (schemaRate !== undefined && schemaRate < 0.8) {
    findings.push(
      finding(
        "LOW_SCHEMA_PASS_RATE",
        "warning",
        "Schema pass rate is below the review threshold."
      )
    );
  }
  const repairRate = readRateFrom(
    value,
    "repairMetrics",
    "repairSuccessRate"
  );
  if (repairRate !== undefined && repairRate < 0.8) {
    findings.push(
      finding(
        "LOW_REPAIR_SUCCESS_RATE",
        "warning",
        "Repair success rate is below the review threshold."
      )
    );
  }
  if (sourceKind === "manual_test") {
    findings.push(
      finding(
        "MANUAL_TEST_SOURCE",
        "warning",
        "Manual test summaries should be reviewed before sharing."
      )
    );
  }
}

function readPassWarnBlock(
  value: Record<string, unknown>
): LiveProposalEvaluationSummaryPassWarnBlock {
  const expectationMetrics = recordValue(value, "expectationMetrics");
  const source = expectationMetrics ?? value;
  return {
    passedCount: readCount(source, "passedCount"),
    warningCount: readCount(source, "warningCount"),
    blockedCount: readCount(source, "blockedCount"),
    failedExpectationCount: readCount(source, "failedExpectationCount")
  };
}

function readTaxonomySummary(
  value: Record<string, unknown>
): LiveProposalEvaluationTaxonomySummary {
  const categories = emptyTaxonomyCategories();
  for (const [key, nestedValue] of Object.entries(readTaxonomyRecord(value))) {
    if (isTaxonomyCategory(key)) {
      categories[key] = finiteNumber(nestedValue);
    }
  }
  const explicitTotal =
    numberValue(recordValue(value, "taxonomyMetrics"), "totalFailureCategoryCount") ??
    numberValue(recordValue(value, "taxonomySummary"), "totalFailureCategoryCount");
  const total =
    explicitTotal ??
    taxonomyCategories.reduce((sum, category) => sum + categories[category], 0);
  const dominantCategories = readDominantCategories(value).filter(
    isTaxonomyCategory
  );
  return {
    categories,
    totalFailureCategoryCount: finiteNumber(total),
    dominantCategories:
      dominantCategories.length > 0
        ? dominantCategories
        : taxonomyCategories.filter((category) => categories[category] > 0)
  };
}

function readUsageSummary(
  value: Record<string, unknown>
): LiveProposalEvaluationUsageSummary | undefined {
  const usage = readUsageRecord(value);
  if (usage === undefined) {
    return undefined;
  }
  const summary: LiveProposalEvaluationUsageSummary = {};
  setNumber(summary, "requestCount", numberValue(usage, "requestCount"));
  setNumber(summary, "responseCount", numberValue(usage, "responseCount"));
  setNumber(
    summary,
    "totalPromptTokens",
    numberValue(usage, "totalPromptTokens")
  );
  setNumber(
    summary,
    "totalCompletionTokens",
    numberValue(usage, "totalCompletionTokens")
  );
  setNumber(summary, "totalTokens", numberValue(usage, "totalTokens"));
  setNumber(
    summary,
    "usageSummaryCaseCount",
    numberValue(value, "usageSummaryCaseCount") ??
      numberValue(usage, "usageSummaryCaseCount")
  );
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function readTaxonomyRecord(
  value: Record<string, unknown>
): Record<string, unknown> {
  const taxonomyMetrics = recordValue(value, "taxonomyMetrics");
  const taxonomySummary = recordValue(value, "taxonomySummary");
  return (
    recordValue(taxonomyMetrics, "categories") ??
    recordValue(taxonomySummary, "categories") ??
    {}
  );
}

function readDominantCategories(
  value: Record<string, unknown>
): string[] {
  const taxonomyMetrics = recordValue(value, "taxonomyMetrics");
  const taxonomySummary = recordValue(value, "taxonomySummary");
  const raw =
    arrayValue(taxonomyMetrics, "dominantCategories") ??
    arrayValue(taxonomySummary, "dominantCategories") ??
    [];
  return raw.filter((item): item is string => typeof item === "string");
}

function readUsageRecord(
  value: Record<string, unknown>
): Record<string, unknown> | undefined {
  return recordValue(value, "usageMetrics") ?? recordValue(value, "usageSummary");
}

function readCount(value: Record<string, unknown>, key: string): number {
  return finiteNumber(numberValue(value, key));
}

function readRateFrom(
  value: Record<string, unknown>,
  recordKey: string,
  rateKey: string
): number | undefined {
  return numberValue(recordValue(value, recordKey), rateKey) ?? numberValue(value, rateKey);
}

function recordValue(
  record: Record<string, unknown> | undefined,
  key: string
): Record<string, unknown> | undefined {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
}

function arrayValue(
  record: Record<string, unknown> | undefined,
  key: string
): unknown[] | undefined {
  const value = record?.[key];
  return Array.isArray(value) ? value : undefined;
}

function numberValue(
  record: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function setNumber<T extends Record<string, unknown>>(
  target: T,
  key: keyof T,
  value: number | undefined
): void {
  if (value !== undefined && Number.isFinite(value) && value >= 0) {
    target[key] = value as T[keyof T];
  }
}

function emptyPassWarnBlock(): LiveProposalEvaluationSummaryPassWarnBlock {
  return {
    passedCount: 0,
    warningCount: 0,
    blockedCount: 0,
    failedExpectationCount: 0
  };
}

function emptyTaxonomySummary(): LiveProposalEvaluationTaxonomySummary {
  return {
    categories: emptyTaxonomyCategories(),
    totalFailureCategoryCount: 0,
    dominantCategories: []
  };
}

function emptyTaxonomyCategories(): Record<
  LiveProposalEvaluationFailureCategory,
  number
> {
  return Object.fromEntries(
    taxonomyCategories.map((category) => [category, 0])
  ) as Record<LiveProposalEvaluationFailureCategory, number>;
}

function safeSummarySeed(value: Record<string, unknown>): Record<string, unknown> {
  return {
    reportCount: readCount(value, "reportCount"),
    caseCount: readCount(value, "caseCount"),
    offlineCaseCount: readCount(value, "offlineCaseCount"),
    liveCaseCount: readCount(value, "liveCaseCount"),
    passWarnBlock: readPassWarnBlock(value),
    schemaPassRate: readRateFrom(value, "schemaMetrics", "schemaPassRate"),
    repairSuccessRate: readRateFrom(value, "repairMetrics", "repairSuccessRate"),
    taxonomy: readTaxonomySummary(value),
    usage: readUsageSummary(value),
    metricsHash:
      safeText(value.metricsHash, "") ||
      safeText(value.reportHash, "") ||
      safeText(value.hashPrefix, "")
  };
}

function readinessFor(
  canDisplaySummary: boolean
): LiveProposalEvaluationSummaryReadiness {
  return {
    canDisplaySummary,
    canRunEvaluation: false,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canPersistRawPrompt: false,
    canPersistRawResponse: false,
    canPersistReasoningContent: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canApprove: false,
    canReject: false,
    canIssuePermissionLease: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: LiveProposalEvaluationSummaryStatus): string {
  if (status === "blocked") {
    return "Reject the evaluation summary until only safe summary metrics remain.";
  }
  if (status === "warning") {
    return "Review warning metrics without running evaluation or live calls from the App.";
  }
  if (status === "summary_ready") {
    return "Display the summary read-only; evaluation execution remains disabled.";
  }
  return "Paste summary-only evaluation metrics JSON to inspect read-only status.";
}

function finding(
  code: string,
  severity: LiveProposalEvaluationSummarySeverity,
  safeMessage: string
): LiveProposalEvaluationSummaryFinding {
  return {
    code: safeText(code, "UNKNOWN_EVALUATION_SUMMARY_FINDING"),
    severity,
    safeMessage: safeErrorMessage(safeMessage)
  };
}

function safeMessageFor(code: string): string {
  switch (code) {
    case "API_KEY_MARKER":
      return "Evaluation summary contains an API key marker.";
    case "BEARER_TOKEN_MARKER":
      return "Evaluation summary contains a bearer token marker.";
    case "AUTHORIZATION_HEADER_MARKER":
      return "Evaluation summary contains an authorization marker.";
    case "PRIVATE_KEY_MARKER":
      return "Evaluation summary contains a private key marker.";
    case "RAW_PROMPT_MARKER":
      return "Evaluation summary contains a raw prompt marker.";
    case "RAW_RESPONSE_MARKER":
      return "Evaluation summary contains a raw response marker.";
    case "RAW_SOURCE_MARKER":
      return "Evaluation summary contains a raw source marker.";
    case "RAW_DIFF_MARKER":
      return "Evaluation summary contains a raw diff marker.";
    case "REASONING_CONTENT_MARKER":
      return "Evaluation summary contains a reasoning content marker.";
    default:
      return "Evaluation summary contains unsafe content.";
  }
}

function isTaxonomyCategory(
  value: string
): value is LiveProposalEvaluationFailureCategory {
  return taxonomyCategories.includes(
    value as LiveProposalEvaluationFailureCategory
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
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
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
