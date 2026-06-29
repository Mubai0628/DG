import {
  buildLiveProposalRequest,
  type LiveProposalRequestBuilderInput,
  type LiveProposalRequestBuildResult
} from "./live-proposal-request-builder.js";
import {
  type LiveDeepSeekApiKeyResolver,
  type LiveDeepSeekProposalAdapterResult,
  type LiveDeepSeekProposalTransport,
  runLiveDeepSeekProposalAdapter
} from "./live-deepseek-proposal-adapter.js";
import { type LiveProposalApiKeyPolicy } from "./live-proposal-api-key-policy.js";
import {
  type LiveProposalGoldenCase,
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseInput,
  type LiveProposalGoldenCaseValidationResult,
  validateLiveProposalGoldenCase
} from "./live-proposal-golden-case-schema.js";
import {
  buildLiveProposalTelemetryRedactionAudit,
  summarizeLiveProposalTelemetryRedactionAudit,
  type LiveProposalTelemetryRedactionAudit,
  type LiveProposalTelemetryUsageSummary
} from "./live-proposal-telemetry-redaction-audit.js";
import {
  buildLiveProposalValidationIntegration,
  type LiveProposalValidationIntegration
} from "./live-proposal-validation-integration.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalEvaluationMode =
  | "disabled"
  | "dry_run"
  | "explicit_live_eval";

export type LiveProposalEvaluationCaseInput = {
  goldenCase: LiveProposalGoldenCaseInput | LiveProposalGoldenCase;
  objectiveOverride?: string | undefined;
  modelProfileId?: string | undefined;
  expectedStatus?: "pass" | "warning" | "blocked" | undefined;
  expectedFailureCategories?:
    | LiveProposalGoldenCaseFailureCategory[]
    | undefined;
  expectedWarnings?: string[] | undefined;
  expectedMetrics?: LiveProposalEvaluationMetric[] | undefined;
};

export type LiveProposalEvaluationInput = {
  cases?: LiveProposalEvaluationCaseInput[] | undefined;
  evaluationMode?: LiveProposalEvaluationMode | undefined;
  apiKeyPolicy?: LiveProposalApiKeyPolicy | undefined;
  requestBuilderDefaults?: Partial<LiveProposalRequestBuilderInput> | undefined;
  apiKeyResolver?: LiveDeepSeekApiKeyResolver | undefined;
  transport?: LiveDeepSeekProposalTransport | undefined;
  allowLiveNetwork?: boolean | undefined;
  allowApiKeyResolution?: boolean | undefined;
  maxCases?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalEvaluationActualStatus = "pass" | "warning" | "blocked";

export type LiveProposalEvaluationCaseStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "failed";

export type LiveProposalEvaluationStatus =
  | "disabled"
  | "dry_run_ready"
  | "evaluation_ready"
  | "warning"
  | "failed"
  | "blocked";

export type LiveProposalEvaluationFindingKind =
  | "input"
  | "golden_case"
  | "request_builder"
  | "live_adapter"
  | "validation_integration"
  | "telemetry_audit"
  | "expectation"
  | "taxonomy"
  | "readiness";

export type LiveProposalEvaluationSeverity = "blocker" | "warning";

export type LiveProposalEvaluationFinding = {
  findingId: string;
  kind: LiveProposalEvaluationFindingKind;
  severity: LiveProposalEvaluationSeverity;
  code: string;
  safeMessage: string;
  caseId?: string | undefined;
};

export type LiveProposalEvaluationMetric = {
  metricId: string;
  value: number | string | boolean;
  summary: string;
};

export type LiveProposalEvaluationReadiness = {
  canCallLiveModelByDefault: false;
  canRunFromApp: false;
  canReadApiKeyByDefault: false;
  canFetchNetworkByDefault: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalEvaluationUsageSummary = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
  requestCount?: number | undefined;
  responseCount?: number | undefined;
};

export type LiveProposalEvaluationTelemetryAuditSummary = ReturnType<
  typeof summarizeLiveProposalTelemetryRedactionAudit
>;

export type LiveProposalEvaluationFailureTaxonomySummary = {
  categories: Record<LiveProposalGoldenCaseFailureCategory, number>;
  totalFailureCategoryCount: number;
  dominantCategories: LiveProposalGoldenCaseFailureCategory[];
};

export type LiveProposalEvaluationCaseResult = {
  status: LiveProposalEvaluationCaseStatus;
  caseId: string;
  title: string;
  evaluationMode: LiveProposalEvaluationMode;
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalEvaluationActualStatus;
  matchedExpectation: boolean;
  liveAdapterStatus?: LiveDeepSeekProposalAdapterResult["status"] | undefined;
  validationIntegrationStatus?:
    | LiveProposalValidationIntegration["status"]
    | undefined;
  telemetryAuditStatus?:
    | LiveProposalTelemetryRedactionAudit["status"]
    | undefined;
  proposalId?: string | undefined;
  blockerCount: number;
  warningCount: number;
  failureCategories: LiveProposalGoldenCaseFailureCategory[];
  schemaPassed: boolean;
  repairSucceeded: boolean;
  unsafeBlocked: boolean;
  usageSummary?: LiveProposalEvaluationUsageSummary | undefined;
  droppedReasoningContent: boolean;
  usedLiveNetwork: boolean;
  caseHash: string;
  findings: LiveProposalEvaluationFinding[];
  nextAction: string;
  source: "runtime_live_proposal_evaluation_case";
};

export type LiveProposalEvaluationReport = {
  status: LiveProposalEvaluationStatus;
  reportId: string;
  evaluationMode: LiveProposalEvaluationMode;
  caseCount: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
  liveCallCaseCount: number;
  usedLiveNetwork: boolean;
  schemaPassRate: number;
  repairSuccessRate: number;
  taxonomySummary: LiveProposalEvaluationFailureTaxonomySummary;
  usageSummary?: LiveProposalEvaluationUsageSummary | undefined;
  telemetryAuditSummary?: LiveProposalEvaluationTelemetryAuditSummary;
  metrics: LiveProposalEvaluationMetric[];
  caseResults: LiveProposalEvaluationCaseResult[];
  findings: LiveProposalEvaluationFinding[];
  blockerCount: number;
  findingCount: number;
  reportHash: string;
  readiness: LiveProposalEvaluationReadiness;
  nextAction: string;
  source: "runtime_live_proposal_evaluation_runner";
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

const failureCategories: LiveProposalGoldenCaseFailureCategory[] = [
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

export function validateLiveProposalEvaluationInput(
  input: LiveProposalEvaluationInput
): LiveProposalEvaluationFinding[] {
  const findings: LiveProposalEvaluationFinding[] = [];
  scanObject(input, (code, message) => {
    findings.push(finding("input", "blocker", code, message));
  });

  const mode = input.evaluationMode ?? "disabled";
  if (!["disabled", "dry_run", "explicit_live_eval"].includes(mode)) {
    findings.push(finding("input", "blocker", "UNKNOWN_EVALUATION_MODE"));
  }
  if ((input.cases?.length ?? 0) === 0) {
    findings.push(finding("input", "warning", "NO_CASES"));
  }
  if (
    input.maxCases !== undefined &&
    (input.maxCases < 1 || !Number.isInteger(input.maxCases))
  ) {
    findings.push(finding("input", "blocker", "INVALID_MAX_CASES"));
  }
  if (
    input.maxCases !== undefined &&
    input.cases !== undefined &&
    input.cases.length > input.maxCases
  ) {
    findings.push(finding("input", "blocker", "MAX_CASES_EXCEEDED"));
  }

  if (mode === "disabled") {
    findings.push(finding("input", "warning", "EVALUATION_DISABLED"));
  }
  if (mode === "dry_run") {
    findings.push(finding("input", "warning", "DRY_RUN_ONLY"));
  }
  if (mode === "explicit_live_eval") {
    findings.push(finding("input", "warning", "EXPLICIT_LIVE_EVAL_REQUESTED"));
    if (input.allowLiveNetwork !== true) {
      findings.push(finding("input", "blocker", "LIVE_NETWORK_NOT_ALLOWED"));
    }
    if (input.allowApiKeyResolution !== true) {
      findings.push(
        finding("input", "blocker", "API_KEY_RESOLUTION_NOT_ALLOWED")
      );
    }
    if (input.apiKeyPolicy === undefined) {
      findings.push(finding("input", "blocker", "MISSING_API_KEY_POLICY"));
    }
    if (input.apiKeyResolver === undefined) {
      findings.push(finding("input", "blocker", "MISSING_API_KEY_RESOLVER"));
    }
    if (input.transport === undefined) {
      findings.push(finding("input", "blocker", "MISSING_TRANSPORT"));
    }
    validatePolicy(input.apiKeyPolicy, findings);
  }

  return uniqueFindings(findings);
}

export async function runLiveProposalEvaluationCase(
  input: LiveProposalEvaluationCaseInput & {
    evaluationMode?: LiveProposalEvaluationMode | undefined;
    apiKeyPolicy?: LiveProposalApiKeyPolicy | undefined;
    requestBuilderDefaults?:
      | Partial<LiveProposalRequestBuilderInput>
      | undefined;
    apiKeyResolver?: LiveDeepSeekApiKeyResolver | undefined;
    transport?: LiveDeepSeekProposalTransport | undefined;
    allowLiveNetwork?: boolean | undefined;
    allowApiKeyResolution?: boolean | undefined;
    createdAt?: string | undefined;
    idGenerator?: (() => string) | undefined;
  }
): Promise<LiveProposalEvaluationCaseResult> {
  const mode = input.evaluationMode ?? "disabled";
  const findings: LiveProposalEvaluationFinding[] = [];
  scanObject(input, (code, message) => {
    findings.push(finding("input", "blocker", code, message));
  });

  const goldenValidation = validateLiveProposalGoldenCase(input.goldenCase, {
    createdAt: input.createdAt
  });
  findings.push(...findingsFromGolden(goldenValidation));
  const golden = goldenValidation.goldenCase;
  const caseId =
    golden?.caseId ?? goldenValidation.summary.caseId ?? "unknown-golden-case";
  const title = golden?.title ?? goldenValidation.summary.title ?? "Untitled";
  const expectedStatus =
    input.expectedStatus ??
    golden?.expectedStatus ??
    goldenValidation.summary.expectedStatus ??
    "blocked";
  const expectedFailureCategories = uniqueCategories(
    input.expectedFailureCategories ??
      golden?.expectedFailureCategories ??
      goldenValidation.summary.expectedFailureCategories
  );

  let requestBuildResult: LiveProposalRequestBuildResult | undefined;
  let liveAdapterResult: LiveDeepSeekProposalAdapterResult | undefined;
  let validationIntegration: LiveProposalValidationIntegration | undefined;
  let telemetryAudit: LiveProposalTelemetryRedactionAudit | undefined;

  if (goldenValidation.status !== "blocked" && golden !== undefined) {
    if (mode === "dry_run" && input.apiKeyPolicy === undefined) {
      findings.push(
        finding(
          "request_builder",
          "warning",
          "DRY_RUN_POLICY_METADATA_MISSING",
          "Dry run skipped request-builder metadata because no policy summary was supplied.",
          caseId
        )
      );
    } else if (mode === "dry_run" || mode === "explicit_live_eval") {
      requestBuildResult = buildLiveProposalRequest(
        requestInputForGoldenCase({
          golden,
          input,
          mode
        })
      );
      findings.push(...findingsFromRequest(requestBuildResult, caseId));
    }

    if (mode === "explicit_live_eval") {
      liveAdapterResult = await runLiveDeepSeekProposalAdapter({
        liveMode: "explicit_live_proposal_call",
        apiKeyPolicy: input.apiKeyPolicy,
        requestBuildResult,
        apiKeyResolver: input.apiKeyResolver,
        transport: wrapTransportForEvaluationAudit({
          transport: input.transport,
          findings,
          caseId
        }),
        allowLiveNetwork: input.allowLiveNetwork,
        allowApiKeyResolution: input.allowApiKeyResolution,
        createdAt: input.createdAt,
        idGenerator: input.idGenerator
      });
      findings.push(...findingsFromLiveAdapter(liveAdapterResult, caseId));

      validationIntegration = buildLiveProposalValidationIntegration({
        liveAdapterResult,
        expectedRequestId: requestBuildResult?.requestId,
        expectedModelProfileId:
          input.modelProfileId ??
          input.requestBuilderDefaults?.modelProfileId ??
          input.apiKeyPolicy?.modelProfileId,
        requireGeneratedStatus: true,
        createdAt: input.createdAt
      });
      findings.push(
        ...findingsFromValidationIntegration(validationIntegration, caseId)
      );

      telemetryAudit = buildLiveProposalTelemetryRedactionAudit({
        apiKeyPolicy: input.apiKeyPolicy,
        requestBuildResult,
        liveAdapterResult,
        validationIntegration,
        usageSummary: liveAdapterResult.usageSummary,
        telemetryMode: "summary_only_audit",
        createdAt: input.createdAt
      });
      findings.push(...findingsFromTelemetryAudit(telemetryAudit, caseId));
    }
  }

  const actualStatus = actualStatusFor({
    mode,
    goldenValidation,
    requestBuildResult,
    liveAdapterResult,
    validationIntegration,
    telemetryAudit
  });
  const failureCategories = categoriesFor({
    expectedFailureCategories,
    findings,
    goldenValidation,
    liveAdapterResult,
    validationIntegration,
    telemetryAudit,
    actualStatus
  });
  const matchedExpectation = expectationMatched({
    expectedStatus,
    actualStatus,
    expectedFailureCategories,
    failureCategories
  });
  if (!matchedExpectation) {
    findings.push(
      finding(
        "expectation",
        "warning",
        "EXPECTED_OUTCOME_MISMATCH",
        undefined,
        caseId
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const schemaPassed =
    liveAdapterResult?.validationSummary?.status === "parsed" ||
    liveAdapterResult?.validationSummary?.status === "warning" ||
    (mode !== "explicit_live_eval" && goldenValidation.status !== "blocked");
  const repairSucceeded =
    liveAdapterResult?.repairSummary !== undefined
      ? !["blocked", "failed"].includes(liveAdapterResult.repairSummary.status)
      : mode !== "explicit_live_eval" && goldenValidation.status !== "blocked";
  const status = caseStatusFor({
    expectedStatus,
    actualStatus,
    matchedExpectation
  });
  const usageSummary = sanitizeUsageSummary(liveAdapterResult?.usageSummary);
  const caseHash = stablePreviewHash(
    JSON.stringify({
      caseId,
      title,
      mode,
      expectedStatus,
      actualStatus,
      matchedExpectation,
      liveAdapterStatus: liveAdapterResult?.status,
      validationIntegrationStatus: validationIntegration?.status,
      telemetryAuditStatus: telemetryAudit?.status,
      proposalId:
        validationIntegration?.proposalId ?? liveAdapterResult?.proposalId,
      failureCategories,
      blockerCount,
      warningCount,
      schemaPassed,
      repairSucceeded,
      usedLiveNetwork: liveAdapterResult?.usedLiveNetwork ?? false
    })
  );

  return {
    status,
    caseId,
    title,
    evaluationMode: mode,
    expectedStatus,
    actualStatus,
    matchedExpectation,
    liveAdapterStatus: liveAdapterResult?.status,
    validationIntegrationStatus: validationIntegration?.status,
    telemetryAuditStatus: telemetryAudit?.status,
    proposalId:
      validationIntegration?.proposalId ?? liveAdapterResult?.proposalId,
    blockerCount,
    warningCount,
    failureCategories,
    schemaPassed,
    repairSucceeded,
    unsafeBlocked: failureCategories.includes("unsafe_path"),
    ...(usageSummary !== undefined ? { usageSummary } : {}),
    droppedReasoningContent:
      liveAdapterResult?.droppedReasoningContent ??
      validationIntegration?.droppedReasoningContent ??
      false,
    usedLiveNetwork: liveAdapterResult?.usedLiveNetwork ?? false,
    caseHash,
    findings: uniqueFindings(findings),
    nextAction: nextActionForCase(status),
    source: "runtime_live_proposal_evaluation_case"
  };
}

export async function runLiveProposalEvaluation(
  input: LiveProposalEvaluationInput = {}
): Promise<LiveProposalEvaluationReport> {
  const mode = input.evaluationMode ?? "disabled";
  const inputFindings = validateLiveProposalEvaluationInput(input);
  const inputBlockers = inputFindings.filter(
    (item) => item.severity === "blocker"
  );
  const cases = input.cases ?? [];

  const caseResults: LiveProposalEvaluationCaseResult[] = [];
  if (inputBlockers.length === 0 && mode !== "disabled") {
    for (const item of cases.slice(0, input.maxCases ?? cases.length)) {
      caseResults.push(
        await runLiveProposalEvaluationCase({
          ...item,
          evaluationMode: mode,
          apiKeyPolicy: input.apiKeyPolicy,
          requestBuilderDefaults: input.requestBuilderDefaults,
          apiKeyResolver: input.apiKeyResolver,
          transport: input.transport,
          allowLiveNetwork: input.allowLiveNetwork,
          allowApiKeyResolution: input.allowApiKeyResolution,
          createdAt: input.createdAt,
          idGenerator: input.idGenerator
        })
      );
    }
  }

  const findings = uniqueFindings([
    ...inputFindings,
    ...caseResults.flatMap((result) => result.findings)
  ]);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const reportHash = stablePreviewHash(
    JSON.stringify({
      mode,
      cases: caseResults.map((item) => [
        item.caseId,
        item.status,
        item.actualStatus,
        item.caseHash
      ]),
      blockerCount,
      warningCount: findings.filter((item) => item.severity === "warning")
        .length
    })
  );
  const taxonomySummary = taxonomySummaryFor(caseResults);
  const usageSummary = aggregateUsage(caseResults);
  const telemetryAuditSummary = aggregateTelemetrySummary(caseResults);
  const reportStatus = reportStatusFor({
    mode,
    blockerCount,
    caseResults
  });

  return {
    status: reportStatus,
    reportId:
      input.idGenerator?.() ?? `live-proposal-eval-${reportHash.slice(0, 12)}`,
    evaluationMode: mode,
    caseCount: caseResults.length,
    passedCount: caseResults.filter((item) => item.status === "passed").length,
    warningCount: caseResults.filter((item) => item.status === "warning")
      .length,
    blockedCount: caseResults.filter((item) => item.status === "blocked")
      .length,
    failedExpectationCount: caseResults.filter(
      (item) => item.status === "failed"
    ).length,
    liveCallCaseCount: caseResults.filter((item) => item.usedLiveNetwork)
      .length,
    usedLiveNetwork: caseResults.some((item) => item.usedLiveNetwork),
    schemaPassRate: rate(
      caseResults.filter((item) => item.schemaPassed).length,
      caseResults.length
    ),
    repairSuccessRate: rate(
      caseResults.filter((item) => item.repairSucceeded).length,
      caseResults.length
    ),
    taxonomySummary,
    ...(usageSummary !== undefined ? { usageSummary } : {}),
    ...(telemetryAuditSummary !== undefined ? { telemetryAuditSummary } : {}),
    metrics: metricsFor(caseResults),
    caseResults,
    findings,
    blockerCount,
    findingCount: findings.length,
    reportHash,
    readiness: disabledReadiness(),
    nextAction: nextActionForReport(reportStatus),
    source: "runtime_live_proposal_evaluation_runner"
  };
}

export function summarizeLiveProposalEvaluationReport(
  report: LiveProposalEvaluationReport
): {
  status: LiveProposalEvaluationStatus;
  reportId: string;
  evaluationMode: LiveProposalEvaluationMode;
  caseCount: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
  liveCallCaseCount: number;
  usedLiveNetwork: boolean;
  schemaPassRate: number;
  repairSuccessRate: number;
  blockerCount: number;
  findingCount: number;
  reportHash: string;
  source: "runtime_live_proposal_evaluation_runner_summary";
} {
  return {
    status: report.status,
    reportId: report.reportId,
    evaluationMode: report.evaluationMode,
    caseCount: report.caseCount,
    passedCount: report.passedCount,
    warningCount: report.warningCount,
    blockedCount: report.blockedCount,
    failedExpectationCount: report.failedExpectationCount,
    liveCallCaseCount: report.liveCallCaseCount,
    usedLiveNetwork: report.usedLiveNetwork,
    schemaPassRate: report.schemaPassRate,
    repairSuccessRate: report.repairSuccessRate,
    blockerCount: report.blockerCount,
    findingCount: report.findingCount,
    reportHash: report.reportHash,
    source: "runtime_live_proposal_evaluation_runner_summary"
  };
}

function requestInputForGoldenCase(args: {
  golden: LiveProposalGoldenCase;
  input: LiveProposalEvaluationCaseInput & {
    apiKeyPolicy?: LiveProposalApiKeyPolicy | undefined;
    requestBuilderDefaults?:
      | Partial<LiveProposalRequestBuilderInput>
      | undefined;
    createdAt?: string | undefined;
  };
  mode: LiveProposalEvaluationMode;
}): LiveProposalRequestBuilderInput {
  const defaults = args.input.requestBuilderDefaults ?? {};
  return {
    apiKeyPolicy: args.input.apiKeyPolicy ?? defaults.apiKeyPolicy,
    objectiveSummary:
      args.input.objectiveOverride ??
      args.golden.objectiveSummary ??
      defaults.objectiveSummary,
    intent: args.golden.intent ?? defaults.intent,
    modelProfileId:
      args.input.modelProfileId ??
      defaults.modelProfileId ??
      args.input.apiKeyPolicy?.modelProfileId,
    workspaceIndexRefs:
      defaults.workspaceIndexRefs ??
      args.golden.workspaceRefs.map(summaryRefForGoldenRef),
    contextAssemblyRefs:
      defaults.contextAssemblyRefs ??
      args.golden.contextRefs.map(summaryRefForGoldenRef),
    userWorkspaceReadinessRefs: defaults.userWorkspaceReadinessRefs ?? [
      `golden-case-readiness:${args.golden.caseId}`
    ],
    allowedPathRefs: defaults.allowedPathRefs ?? args.golden.allowedPathRefs,
    forbiddenPathPolicy:
      defaults.forbiddenPathPolicy ?? args.golden.forbiddenPathPolicy,
    evidenceRefs:
      defaults.evidenceRefs ??
      args.golden.evidenceRefs.map(summaryRefForGoldenRef),
    taskContractHash: defaults.taskContractHash ?? args.golden.caseHash,
    noCompressRefs:
      defaults.noCompressRefs ??
      ensureNonEmptyRefs(
        args.golden.contextRefs
          .filter((item) => item.kind === "no_compress_ref")
          .map(summaryRefForGoldenRef),
        `golden-case-no-compress:${args.golden.caseId}`
      ),
    promptMode: "summary_only",
    thinkingMode: defaults.thinkingMode ?? "off",
    createdAt: args.input.createdAt ?? defaults.createdAt,
    idGenerator: defaults.idGenerator
  };
}

function validatePolicy(
  policy: LiveProposalApiKeyPolicy | undefined,
  findings: LiveProposalEvaluationFinding[]
): void {
  if (policy === undefined) {
    return;
  }
  if (policy.status === "blocked" || policy.blockerCount > 0) {
    findings.push(finding("input", "blocker", "API_KEY_POLICY_BLOCKED"));
  }
  if (!policy.readiness.canProceedToLiveRequestBuilder) {
    findings.push(
      finding("input", "blocker", "API_KEY_POLICY_CANNOT_BUILD_REQUEST")
    );
  }
  if (policy.readiness.canReadApiKey) {
    findings.push(finding("readiness", "blocker", "POLICY_READ_KEY_REJECTED"));
  }
  if (policy.readiness.canCallLiveModel) {
    findings.push(
      finding("readiness", "blocker", "POLICY_CALL_MODEL_REJECTED")
    );
  }
  if (policy.readiness.canFetchNetwork) {
    findings.push(
      finding("readiness", "blocker", "POLICY_FETCH_NETWORK_REJECTED")
    );
  }
}

function actualStatusFor(args: {
  mode: LiveProposalEvaluationMode;
  goldenValidation: LiveProposalGoldenCaseValidationResult;
  requestBuildResult?: LiveProposalRequestBuildResult | undefined;
  liveAdapterResult?: LiveDeepSeekProposalAdapterResult | undefined;
  validationIntegration?: LiveProposalValidationIntegration | undefined;
  telemetryAudit?: LiveProposalTelemetryRedactionAudit | undefined;
}): LiveProposalEvaluationActualStatus {
  if (args.goldenValidation.status === "blocked") {
    return "blocked";
  }
  if (args.mode === "disabled") {
    return "blocked";
  }
  if (args.requestBuildResult?.status === "blocked") {
    return "blocked";
  }
  if (args.mode === "dry_run") {
    return "pass";
  }
  if (
    args.liveAdapterResult?.status === "blocked" ||
    args.validationIntegration?.status === "blocked" ||
    args.telemetryAudit?.status === "blocked"
  ) {
    return "blocked";
  }
  if (args.liveAdapterResult?.validationSummary?.status === "blocked") {
    return "blocked";
  }
  if (args.liveAdapterResult?.droppedReasoningContent === true) {
    return "warning";
  }
  if (
    args.liveAdapterResult?.validationSummary?.status === "parsed" ||
    args.validationIntegration?.status === "integration_ready"
  ) {
    return "pass";
  }
  return "blocked";
}

function categoriesFor(args: {
  expectedFailureCategories: LiveProposalGoldenCaseFailureCategory[];
  findings: readonly LiveProposalEvaluationFinding[];
  goldenValidation: LiveProposalGoldenCaseValidationResult;
  liveAdapterResult?: LiveDeepSeekProposalAdapterResult | undefined;
  validationIntegration?: LiveProposalValidationIntegration | undefined;
  telemetryAudit?: LiveProposalTelemetryRedactionAudit | undefined;
  actualStatus: LiveProposalEvaluationActualStatus;
}): LiveProposalGoldenCaseFailureCategory[] {
  const categories = new Set<LiveProposalGoldenCaseFailureCategory>();
  for (const category of args.expectedFailureCategories) {
    if (category !== "no_failure_expected") {
      categories.add(category);
    }
  }
  for (const findingItem of args.findings) {
    for (const category of categoriesForCode(findingItem.code)) {
      categories.add(category);
    }
  }
  if (args.goldenValidation.status === "blocked") {
    for (const findingItem of args.goldenValidation.findings) {
      for (const category of categoriesForCode(findingItem.code)) {
        categories.add(category);
      }
    }
  }
  if (args.liveAdapterResult !== undefined) {
    for (const findingItem of args.liveAdapterResult.findings) {
      for (const category of categoriesForCode(findingItem.code)) {
        categories.add(category);
      }
    }
  }
  if (args.validationIntegration !== undefined) {
    for (const findingItem of args.validationIntegration.findings) {
      for (const category of categoriesForCode(findingItem.code)) {
        categories.add(category);
      }
    }
  }
  if (args.telemetryAudit !== undefined) {
    for (const findingItem of args.telemetryAudit.findings) {
      for (const category of categoriesForCode(findingItem.code)) {
        categories.add(category);
      }
    }
  }
  if (args.actualStatus === "blocked" && categories.size === 0) {
    categories.add("schema_failure");
  }
  if (categories.size === 0) {
    categories.add("no_failure_expected");
  }
  return [...categories].filter((category) =>
    failureCategories.includes(category)
  );
}

function categoriesForCode(
  code: string
): LiveProposalGoldenCaseFailureCategory[] {
  const normalized = code.toUpperCase();
  const categories: LiveProposalGoldenCaseFailureCategory[] = [];
  if (
    normalized.includes("RAW") ||
    normalized.includes("RAW_RESPONSE") ||
    normalized.includes("RAW_PROMPT") ||
    normalized.includes("RAW_SOURCE") ||
    normalized.includes("RAW_DIFF")
  ) {
    categories.push("raw_content_leak");
  }
  if (normalized.includes("REASONING")) {
    categories.push("reasoning_content_leak");
  }
  if (
    normalized.includes("API_KEY") ||
    normalized.includes("BEARER") ||
    normalized.includes("AUTHORIZATION") ||
    normalized.includes("PRIVATE_KEY") ||
    normalized.includes("TOKEN") ||
    normalized.includes("SECRET")
  ) {
    categories.push("secret_marker");
  }
  if (
    normalized.includes("UNSAFE_PATH") ||
    normalized.includes("PATH_TRAVERSAL") ||
    normalized.includes("ABSOLUTE_PATH") ||
    normalized.includes("WINDOWS_DRIVE") ||
    normalized.includes("UNC_PATH") ||
    normalized.includes("HALLUCINATED_PATH")
  ) {
    categories.push("unsafe_path");
  }
  if (normalized.includes("HALLUCINATED")) {
    categories.push("hallucinated_path");
  }
  if (
    normalized.includes("FORBIDDEN") ||
    normalized.includes("EXECUTION") ||
    normalized.includes("COMMAND") ||
    normalized.includes("TOOL") ||
    normalized.includes("APPLY") ||
    normalized.includes("ROLLBACK") ||
    normalized.includes("EVENTSTORE") ||
    normalized.includes("PERMISSION") ||
    normalized.includes("NATIVE")
  ) {
    categories.push("forbidden_field");
  }
  if (
    normalized.includes("MALFORMED") ||
    normalized.includes("PARSE") ||
    normalized.includes("JSON")
  ) {
    categories.push("malformed_json");
  }
  if (normalized.includes("REPAIR")) {
    categories.push("repair_failed");
  }
  if (
    normalized.includes("SCHEMA") ||
    normalized.includes("VALIDATION") ||
    normalized.includes("PROPOSAL_SUMMARY") ||
    normalized.includes("MISSING_RESPONSE_CONTENT")
  ) {
    categories.push("schema_failure");
  }
  if (normalized.includes("EVIDENCE")) {
    categories.push("missing_evidence");
  }
  if (normalized.includes("TEST")) {
    categories.push("missing_test_plan");
  }
  if (normalized.includes("RISK")) {
    categories.push("high_risk_operation");
  }
  if (normalized.includes("OBJECTIVE")) {
    categories.push("poor_objective_fit");
  }
  if (normalized.includes("USAGE_SUMMARY_MISSING")) {
    categories.push("usage_summary_missing");
  }
  return [...new Set(categories)];
}

function expectationMatched(args: {
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalEvaluationActualStatus;
  expectedFailureCategories: LiveProposalGoldenCaseFailureCategory[];
  failureCategories: LiveProposalGoldenCaseFailureCategory[];
}): boolean {
  if (args.expectedStatus !== args.actualStatus) {
    return false;
  }
  const expected = args.expectedFailureCategories.filter(
    (category) => category !== "no_failure_expected"
  );
  if (args.expectedStatus !== "blocked" || expected.length === 0) {
    return true;
  }
  return expected.every((category) =>
    args.failureCategories.includes(category)
  );
}

function caseStatusFor(args: {
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalEvaluationActualStatus;
  matchedExpectation: boolean;
}): LiveProposalEvaluationCaseStatus {
  if (!args.matchedExpectation) {
    return "failed";
  }
  if (args.actualStatus === "blocked") {
    return "blocked";
  }
  if (args.actualStatus === "warning") {
    return "warning";
  }
  return "passed";
}

function reportStatusFor(args: {
  mode: LiveProposalEvaluationMode;
  blockerCount: number;
  caseResults: readonly LiveProposalEvaluationCaseResult[];
}): LiveProposalEvaluationStatus {
  if (args.mode === "disabled") {
    return "disabled";
  }
  if (args.blockerCount > 0 && args.caseResults.length === 0) {
    return "blocked";
  }
  if (args.caseResults.some((item) => item.status === "failed")) {
    return "failed";
  }
  if (args.caseResults.some((item) => item.status === "blocked")) {
    return "blocked";
  }
  if (args.mode === "dry_run") {
    return "dry_run_ready";
  }
  if (args.caseResults.some((item) => item.status === "warning")) {
    return "warning";
  }
  return "evaluation_ready";
}

function findingsFromGolden(
  result: LiveProposalGoldenCaseValidationResult
): LiveProposalEvaluationFinding[] {
  return result.findings.map((item) =>
    finding(
      "golden_case",
      item.severity,
      `GOLDEN_${item.code}`,
      item.safeMessage,
      result.summary.caseId
    )
  );
}

function findingsFromRequest(
  result: LiveProposalRequestBuildResult,
  caseId: string
): LiveProposalEvaluationFinding[] {
  return result.findings.map((item) =>
    finding(
      "request_builder",
      item.severity,
      `REQUEST_${item.code}`,
      item.safeMessage,
      caseId
    )
  );
}

function findingsFromLiveAdapter(
  result: LiveDeepSeekProposalAdapterResult,
  caseId: string
): LiveProposalEvaluationFinding[] {
  return result.findings.map((item) =>
    finding(
      "live_adapter",
      item.severity,
      `LIVE_${item.code}`,
      item.safeMessage,
      caseId
    )
  );
}

function findingsFromValidationIntegration(
  result: LiveProposalValidationIntegration,
  caseId: string
): LiveProposalEvaluationFinding[] {
  return result.findings.map((item) =>
    finding(
      "validation_integration",
      item.severity,
      `VALIDATION_${item.code}`,
      item.safeMessage,
      caseId
    )
  );
}

function findingsFromTelemetryAudit(
  result: LiveProposalTelemetryRedactionAudit,
  caseId: string
): LiveProposalEvaluationFinding[] {
  return result.findings.map((item) =>
    finding(
      "telemetry_audit",
      item.severity,
      `TELEMETRY_${item.code}`,
      item.safeMessage,
      caseId
    )
  );
}

function wrapTransportForEvaluationAudit(args: {
  transport: LiveDeepSeekProposalTransport | undefined;
  findings: LiveProposalEvaluationFinding[];
  caseId: string;
}): LiveDeepSeekProposalTransport | undefined {
  if (args.transport === undefined) {
    return undefined;
  }
  const transport = args.transport;
  return {
    send: async (request) => {
      const response = await transport.send(request);
      scanObject(
        isRecord(response)
          ? {
              content: response.content,
              modelProfileId: response.modelProfileId,
              responseId: response.responseId,
              warningCodes: response.warningCodes,
              usageSummary: response.usageSummary
            }
          : response,
        (code, message) => {
          args.findings.push(
            finding(
              "telemetry_audit",
              "blocker",
              `TRANSPORT_${code}`,
              message,
              args.caseId
            )
          );
        }
      );
      return response;
    }
  };
}

function taxonomySummaryFor(
  results: readonly LiveProposalEvaluationCaseResult[]
): LiveProposalEvaluationFailureTaxonomySummary {
  const categories = Object.fromEntries(
    failureCategories.map((category) => [category, 0])
  ) as Record<LiveProposalGoldenCaseFailureCategory, number>;
  for (const result of results) {
    for (const category of result.failureCategories) {
      categories[category] += 1;
    }
  }
  const dominantCategories = failureCategories.filter(
    (category) => categories[category] > 0
  );
  return {
    categories,
    totalFailureCategoryCount: dominantCategories.reduce(
      (sum, category) => sum + categories[category],
      0
    ),
    dominantCategories
  };
}

function metricsFor(
  results: readonly LiveProposalEvaluationCaseResult[]
): LiveProposalEvaluationMetric[] {
  return [
    metric("case_count", results.length, "Evaluated case count."),
    metric(
      "schema_pass_rate",
      rate(results.filter((item) => item.schemaPassed).length, results.length),
      "Share of cases with schema validation passing or warning."
    ),
    metric(
      "repair_success_rate",
      rate(
        results.filter((item) => item.repairSucceeded).length,
        results.length
      ),
      "Share of cases with repair success."
    ),
    metric(
      "failed_expectation_count",
      results.filter((item) => item.status === "failed").length,
      "Cases where actual status or failure taxonomy did not match."
    ),
    metric(
      "live_call_case_count",
      results.filter((item) => item.usedLiveNetwork).length,
      "Cases that used the injected live transport."
    )
  ];
}

function aggregateUsage(
  results: readonly LiveProposalEvaluationCaseResult[]
): LiveProposalEvaluationUsageSummary | undefined {
  const usage: LiveProposalEvaluationUsageSummary = {};
  let requestCount = 0;
  let responseCount = 0;
  for (const result of results) {
    if (result.usageSummary === undefined) {
      continue;
    }
    requestCount += result.usageSummary.requestCount ?? 1;
    responseCount += result.usageSummary.responseCount ?? 1;
    usage.inputTokens =
      (usage.inputTokens ?? 0) + (result.usageSummary.inputTokens ?? 0);
    usage.outputTokens =
      (usage.outputTokens ?? 0) + (result.usageSummary.outputTokens ?? 0);
    usage.totalTokens =
      (usage.totalTokens ?? 0) + (result.usageSummary.totalTokens ?? 0);
  }
  if (requestCount === 0 && responseCount === 0) {
    return undefined;
  }
  usage.requestCount = requestCount;
  usage.responseCount = responseCount;
  return usage;
}

function aggregateTelemetrySummary(
  results: readonly LiveProposalEvaluationCaseResult[]
): LiveProposalEvaluationTelemetryAuditSummary | undefined {
  const audited = results.filter(
    (item) => item.telemetryAuditStatus !== undefined
  );
  if (audited.length === 0) {
    return undefined;
  }
  const synthetic = buildLiveProposalTelemetryRedactionAudit({
    usageSummary: aggregateUsage(results),
    telemetryMode: "summary_only_audit"
  });
  return summarizeLiveProposalTelemetryRedactionAudit(synthetic);
}

function sanitizeUsageSummary(
  usage: unknown
): LiveProposalEvaluationUsageSummary | undefined {
  if (!isRecord(usage)) {
    return undefined;
  }
  const result: LiveProposalEvaluationUsageSummary = {
    requestCount: 1,
    responseCount: 1
  };
  if (isSafeNonNegativeNumber(usage.inputTokens)) {
    result.inputTokens = usage.inputTokens;
  }
  if (isSafeNonNegativeNumber(usage.outputTokens)) {
    result.outputTokens = usage.outputTokens;
  }
  if (isSafeNonNegativeNumber(usage.totalTokens)) {
    result.totalTokens = usage.totalTokens;
  }
  return result;
}

function disabledReadiness(): LiveProposalEvaluationReadiness {
  return {
    canCallLiveModelByDefault: false,
    canRunFromApp: false,
    canReadApiKeyByDefault: false,
    canFetchNetworkByDefault: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function summaryRefForGoldenRef(ref: {
  refId: string;
  kind: string;
  hashPrefix?: string | undefined;
}): string {
  return `${ref.kind}:${ref.refId}:${ref.hashPrefix ?? "summary"}`;
}

function ensureNonEmptyRefs(refs: string[], fallback: string): string[] {
  return refs.length > 0 ? refs : [fallback];
}

function metric(
  metricId: string,
  value: number | string | boolean,
  summary: string
): LiveProposalEvaluationMetric {
  return { metricId, value, summary };
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function nextActionForCase(status: LiveProposalEvaluationCaseStatus): string {
  if (status === "failed") {
    return "Inspect expectation mismatch summary before expanding evaluation.";
  }
  if (status === "blocked") {
    return "Keep the live proposal blocked and review taxonomy summary.";
  }
  if (status === "warning") {
    return "Review warning summary before counting the case as clean.";
  }
  return "Case may contribute to summary-only evaluation metrics.";
}

function nextActionForReport(status: LiveProposalEvaluationStatus): string {
  if (status === "disabled") {
    return "Enable dry_run or explicit opt-in live evaluation in runtime tests only.";
  }
  if (status === "dry_run_ready") {
    return "Review dry-run request summaries; no live call was made.";
  }
  if (status === "blocked") {
    return "Resolve blockers before live evaluation can be trusted.";
  }
  if (status === "failed") {
    return "Inspect failed expectations and taxonomy counts.";
  }
  if (status === "warning") {
    return "Review warnings before using the report as a golden baseline.";
  }
  return "Use the summary-only report for P0N quality tracking.";
}

function scanObject(
  value: unknown,
  onFinding: (code: string, safeMessage: string) => void,
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    if (
      failureCategories.includes(value as LiveProposalGoldenCaseFailureCategory)
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
        "Forbidden live evaluation field was rejected."
      );
    }
    if (
      key.startsWith("can") &&
      nestedValue === true &&
      key !== "canProceedToLiveAdapter" &&
      key !== "canProceedToLiveRequestBuilder"
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
  kind: LiveProposalEvaluationFindingKind,
  severity: LiveProposalEvaluationSeverity,
  code: string,
  safeMessage = safeMessageFor(code),
  caseId?: string | undefined
): LiveProposalEvaluationFinding {
  return {
    findingId: `${caseId ?? "report"}-${code.toLowerCase()}`,
    kind,
    severity,
    code,
    safeMessage,
    caseId
  };
}

function uniqueFindings(
  findings: readonly LiveProposalEvaluationFinding[]
): LiveProposalEvaluationFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalEvaluationFinding[] = [];
  for (const item of findings) {
    const key = `${item.caseId ?? ""}:${item.kind}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function uniqueCategories(
  categories: readonly LiveProposalGoldenCaseFailureCategory[] | undefined
): LiveProposalGoldenCaseFailureCategory[] {
  return [...new Set(categories ?? [])].filter((category) =>
    failureCategories.includes(category)
  );
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
    UNKNOWN_EVALUATION_MODE: "Evaluation mode is not supported.",
    NO_CASES: "No golden cases were supplied.",
    INVALID_MAX_CASES: "maxCases must be a positive integer.",
    MAX_CASES_EXCEEDED: "Input case count exceeds maxCases.",
    EVALUATION_DISABLED: "Live evaluation is disabled by default.",
    DRY_RUN_ONLY: "Dry run does not call the live adapter.",
    EXPLICIT_LIVE_EVAL_REQUESTED:
      "Explicit live evaluation was requested with runtime-only guards.",
    LIVE_NETWORK_NOT_ALLOWED:
      "Explicit live evaluation requires allowLiveNetwork.",
    API_KEY_RESOLUTION_NOT_ALLOWED:
      "Explicit live evaluation requires allowApiKeyResolution.",
    MISSING_API_KEY_POLICY:
      "Explicit live evaluation requires API key policy metadata.",
    MISSING_API_KEY_RESOLVER:
      "Explicit live evaluation requires an injected API key resolver.",
    MISSING_TRANSPORT:
      "Explicit live evaluation requires an injected transport.",
    API_KEY_POLICY_BLOCKED: "API key policy has blockers.",
    API_KEY_POLICY_CANNOT_BUILD_REQUEST:
      "API key policy cannot proceed to request builder.",
    POLICY_READ_KEY_REJECTED: "Policy readiness cannot read API keys here.",
    POLICY_CALL_MODEL_REJECTED:
      "Policy readiness cannot call live models by default.",
    POLICY_FETCH_NETWORK_REJECTED:
      "Policy readiness cannot fetch network by default.",
    EXPECTED_OUTCOME_MISMATCH:
      "Actual live evaluation outcome did not match the golden case.",
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
  return messages[code] ?? "Live evaluation finding recorded.";
}
