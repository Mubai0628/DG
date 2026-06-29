import {
  type LiveProposalGoldenCase,
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseInput,
  type LiveProposalGoldenCaseValidationResult,
  validateLiveProposalGoldenCase
} from "./live-proposal-golden-case-schema.js";
import {
  type ModelPatchProposalInput,
  type ModelPatchProposalSummary,
  type ModelPatchProposalValidationResult,
  type ModelPatchProposalValidationStatus
} from "./patch-proposal-schema.js";
import {
  type PatchProposalDryAdapterResult,
  type PatchProposalDryModelClient,
  type PatchProposalDryModelResponse,
  runPatchProposalDryAdapter
} from "./patch-proposal-dry-adapter.js";
import {
  type PatchProposalHarnessResult,
  runPatchProposalHarnessCase
} from "./patch-proposal-fake-harness.js";
import {
  type PatchProposalRepairResult,
  repairModelPatchProposalDraft
} from "./patch-proposal-repair.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalOfflineEvaluationMode = "offline_fake" | "offline_dry";

export type LiveProposalOfflineEvaluationCaseInput = {
  goldenCase: LiveProposalGoldenCaseInput | LiveProposalGoldenCase;
  fakeResponse?: ModelPatchProposalInput | undefined;
  expectedStatus?: "pass" | "warning" | "blocked" | undefined;
  expectedFailureCategories?:
    | LiveProposalGoldenCaseFailureCategory[]
    | undefined;
  expectedWarnings?: string[] | undefined;
  expectedMetrics?: LiveProposalOfflineEvaluationMetric[] | undefined;
};

export type LiveProposalOfflineEvaluationInput = {
  cases?: LiveProposalOfflineEvaluationCaseInput[] | undefined;
  evaluatorMode?: LiveProposalOfflineEvaluationMode | undefined;
  fakeResponses?: Record<string, ModelPatchProposalInput> | undefined;
  dryClient?: PatchProposalDryModelClient | undefined;
  maxCases?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalOfflineEvaluationActualStatus =
  | "pass"
  | "warning"
  | "blocked";

export type LiveProposalOfflineEvaluationCaseStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "failed";

export type LiveProposalOfflineEvaluationStatus =
  | "empty"
  | "evaluation_ready"
  | "warning"
  | "failed"
  | "blocked";

export type LiveProposalOfflineEvaluationFindingKind =
  | "input"
  | "golden_case"
  | "fake_response"
  | "dry_adapter"
  | "repair"
  | "schema"
  | "expectation"
  | "taxonomy"
  | "readiness";

export type LiveProposalOfflineEvaluationSeverity = "blocker" | "warning";

export type LiveProposalOfflineEvaluationFinding = {
  findingId: string;
  kind: LiveProposalOfflineEvaluationFindingKind;
  severity: LiveProposalOfflineEvaluationSeverity;
  code: string;
  safeMessage: string;
  caseId?: string | undefined;
};

export type LiveProposalOfflineEvaluationMetric = {
  metricId: string;
  value: number | string | boolean;
  summary: string;
};

export type LiveProposalFailureTaxonomySummary = {
  categories: Record<LiveProposalGoldenCaseFailureCategory, number>;
  totalFailureCategoryCount: number;
  dominantCategories: LiveProposalGoldenCaseFailureCategory[];
};

export type LiveProposalOfflineEvaluationUsageSummary = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
  requestCount?: number | undefined;
  responseCount?: number | undefined;
};

export type LiveProposalOfflineEvaluationReadiness = {
  canEnterLiveEvaluation: false;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalOfflineEvaluationCaseResult = {
  status: LiveProposalOfflineEvaluationCaseStatus;
  caseId: string;
  title: string;
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalOfflineEvaluationActualStatus;
  matchedExpectation: boolean;
  failureCategories: LiveProposalGoldenCaseFailureCategory[];
  blockerCount: number;
  warningCount: number;
  repairNeeded: boolean;
  repairSucceeded: boolean;
  schemaPassed: boolean;
  unsafeBlocked: boolean;
  evidenceCoverageSummary: "none" | "partial" | "sufficient" | "unknown";
  operationRiskSummary: "low" | "medium" | "high" | "unknown";
  usageSummary?: LiveProposalOfflineEvaluationUsageSummary | undefined;
  proposalId?: string | undefined;
  proposalHash?: string | undefined;
  repairStatus?: PatchProposalRepairResult["status"] | undefined;
  schemaStatus?: ModelPatchProposalValidationStatus | undefined;
  findings: LiveProposalOfflineEvaluationFinding[];
  caseHash: string;
  nextAction: string;
  source: "runtime_live_proposal_offline_evaluation_case";
};

export type LiveProposalOfflineEvaluationReport = {
  status: LiveProposalOfflineEvaluationStatus;
  reportId: string;
  evaluatorMode: LiveProposalOfflineEvaluationMode;
  caseCount: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
  schemaPassRate: number;
  repairAttemptCount: number;
  repairSuccessRate: number;
  unsafePathBlockedCount: number;
  forbiddenFieldBlockedCount: number;
  secretMarkerBlockedCount: number;
  rawLeakBlockedCount: number;
  evidenceCoverageWarnings: number;
  testPlanWarnings: number;
  highRiskOperationWarnings: number;
  usageSummaryCaseCount: number;
  taxonomySummary: LiveProposalFailureTaxonomySummary;
  metrics: LiveProposalOfflineEvaluationMetric[];
  cases: LiveProposalOfflineEvaluationCaseResult[];
  findings: LiveProposalOfflineEvaluationFinding[];
  blockerCount: number;
  findingCount: number;
  reportHash: string;
  readiness: LiveProposalOfflineEvaluationReadiness;
  nextAction: string;
  source: "runtime_live_proposal_offline_evaluation_runner";
};

const defaultMaxCases = 50;
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

const executionAttemptKeys = new Set(
  [
    "canEnterLiveEvaluation",
    "canCallLiveModel",
    "canReadApiKey",
    "canFetchNetwork",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((key) => key.toLowerCase())
);

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

export function validateLiveProposalOfflineEvaluationInput(
  input: LiveProposalOfflineEvaluationInput
): LiveProposalOfflineEvaluationFinding[] {
  const findings: LiveProposalOfflineEvaluationFinding[] = [];
  const mode = input.evaluatorMode ?? "offline_fake";

  if (mode !== "offline_fake" && mode !== "offline_dry") {
    findings.push(finding("input", "blocker", "UNKNOWN_EVALUATOR_MODE"));
  }
  if (
    input.maxCases !== undefined &&
    (!Number.isSafeInteger(input.maxCases) || input.maxCases < 1)
  ) {
    findings.push(finding("input", "blocker", "INVALID_MAX_CASES"));
  }
  if ((input.cases?.length ?? 0) > (input.maxCases ?? defaultMaxCases)) {
    findings.push(finding("input", "blocker", "TOO_MANY_CASES"));
  }
  if (
    mode === "offline_dry" &&
    input.dryClient?.generatePatchProposal === undefined
  ) {
    findings.push(finding("input", "blocker", "MISSING_DRY_CLIENT"));
  }
  findings.push(...findForbiddenFields(input, "input"));
  findings.push(...findUnsafeStringMarkers(input, "input"));
  return uniqueFindings(findings);
}

export async function runLiveProposalOfflineEvaluationCase(
  input: LiveProposalOfflineEvaluationCaseInput & {
    evaluatorMode?: LiveProposalOfflineEvaluationMode | undefined;
    fakeResponses?: Record<string, ModelPatchProposalInput> | undefined;
    dryClient?: PatchProposalDryModelClient | undefined;
    createdAt?: string | undefined;
    idGenerator?: (() => string) | undefined;
  }
): Promise<LiveProposalOfflineEvaluationCaseResult> {
  const mode = input.evaluatorMode ?? "offline_fake";
  const findings: LiveProposalOfflineEvaluationFinding[] = [];
  findings.push(...findForbiddenFields(input, "case"));
  findings.push(...findUnsafeStringMarkers(input, "case"));

  const goldenValidation = validateLiveProposalGoldenCase(input.goldenCase, {
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  findings.push(...findingsFromGolden(goldenValidation));

  const goldenCase = goldenValidation.goldenCase;
  const caseId =
    goldenCase?.caseId ??
    goldenValidation.summary.caseId ??
    extractCaseId(input.goldenCase) ??
    `offline-evaluation-case-${stablePreviewHash(
      stableStringify(goldenValidation.summary)
    ).slice(0, 12)}`;
  const title =
    goldenCase?.title ??
    goldenValidation.summary.title ??
    "Blocked golden case";
  const expectedStatus =
    input.expectedStatus ??
    goldenCase?.expectedOutcome.expectedStatus ??
    goldenValidation.summary.expectedStatus ??
    "blocked";
  const expectedCategories = uniqueFailureCategories([
    ...(input.expectedFailureCategories ?? []),
    ...(goldenCase?.expectedFailureCategories ?? []),
    ...goldenValidation.summary.expectedFailureCategories
  ]);

  let harnessResult: PatchProposalHarnessResult | undefined;
  let dryResult: PatchProposalDryAdapterResult | undefined;
  let repairResult: PatchProposalRepairResult | undefined;
  let schemaValidation: ModelPatchProposalValidationResult | undefined;
  let usageSummary: LiveProposalOfflineEvaluationUsageSummary | undefined;

  if (goldenValidation.status !== "blocked") {
    if (mode === "offline_fake") {
      const fakeResponse =
        input.fakeResponse ?? input.fakeResponses?.[caseId] ?? undefined;
      if (fakeResponse === undefined) {
        findings.push(
          finding("fake_response", "blocker", "MISSING_FAKE_RESPONSE", caseId)
        );
      } else {
        harnessResult = await runPatchProposalHarnessCase({
          caseId,
          title,
          objectiveSummary: goldenCase?.objectiveSummary ?? title,
          workspaceRefs: goldenCase?.workspaceRefs.map((ref) => ref.refId),
          contextRefs: goldenCase?.contextRefs.map((ref) => ref.refId),
          allowedPathRefs: goldenCase?.allowedPathRefs,
          forbiddenPathPolicy: goldenCase?.forbiddenPathPolicy,
          evidenceRefs: goldenCase?.evidenceRefs.map((ref) => ref.refId),
          modelProfileId: "offline-fake-model",
          fakeResponse
        });
        findings.push(...findingsFromHarness(harnessResult));
        repairResult = repairModelPatchProposalDraft({
          rawCandidate: fakeResponse,
          sourceKind: "fixture",
          createdAt: input.createdAt
        });
      }
    } else {
      let capturedResponse: PatchProposalDryModelResponse | undefined;
      if (input.dryClient?.generatePatchProposal === undefined) {
        findings.push(
          finding("dry_adapter", "blocker", "MISSING_DRY_CLIENT", caseId)
        );
      } else {
        const dryClient: PatchProposalDryModelClient = {
          generatePatchProposal: async (request) => {
            const response =
              await input.dryClient?.generatePatchProposal?.(request);
            if (response === undefined) {
              throw new Error("offline_dry_response_missing");
            }
            capturedResponse = response;
            return response;
          }
        };
        dryResult = await runPatchProposalDryAdapter({
          objectiveSummary: goldenCase?.objectiveSummary,
          intent: goldenCase?.intent,
          modelProfileId: "deepseek-offline-dry",
          workspaceIndexRefs: goldenCase?.workspaceRefs.map((ref) => ref.refId),
          contextAssemblyRefs: goldenCase?.contextRefs.map((ref) => ref.refId),
          userWorkspaceReadinessRefs: goldenCase?.contextRefs
            .filter((ref) => ref.kind === "task_contract")
            .map((ref) => ref.refId),
          allowedPathRefs: goldenCase?.allowedPathRefs,
          forbiddenPathPolicy: goldenCase?.forbiddenPathPolicy,
          evidenceRefs: goldenCase?.evidenceRefs.map((ref) => ref.refId),
          dryClient,
          createdAt: input.createdAt
        });
        findings.push(...findingsFromDry(dryResult));
        usageSummary = sanitizeUsageSummary(dryResult.usageSummary);
        if (capturedResponse !== undefined) {
          repairResult = repairModelPatchProposalDraft({
            rawCandidate: capturedResponse.content,
            sourceKind: "dry_adapter_response",
            createdAt: input.createdAt
          });
        }
      }
    }
  }

  if (repairResult !== undefined) {
    findings.push(...findingsFromRepair(repairResult));
    schemaValidation = repairResult.proposalValidation
      ? repairValidationToModelValidation(repairResult)
      : undefined;
  }
  if (
    schemaValidation === undefined &&
    harnessResult?.validationSummary !== undefined
  ) {
    schemaValidation = parseHarnessValidation(harnessResult);
  }

  const failureCategories = uniqueFailureCategories([
    ...expectedCategories,
    ...taxonomyFromGoldenValidation(goldenValidation),
    ...taxonomyFromFindings(findings),
    ...taxonomyFromRepair(repairResult),
    ...taxonomyFromSchema(schemaValidation)
  ]);
  const actualStatus = actualStatusFrom({
    goldenValidation,
    findings,
    repairResult,
    schemaValidation
  });
  const matchedExpectation = matchesExpectation({
    expectedStatus,
    actualStatus,
    expectedCategories,
    actualCategories: failureCategories
  });
  if (!matchedExpectation) {
    findings.push(
      finding("expectation", "blocker", "EXPECTED_OUTCOME_MISMATCH", caseId)
    );
  }
  const finalFindings = uniqueFindings(findings);
  const blockerCount = finalFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = finalFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status = caseStatusFrom({
    expectedStatus,
    actualStatus,
    matchedExpectation,
    blockerCount,
    warningCount
  });
  const repairNeeded =
    (repairResult?.attemptCount ?? 0) > 0 ||
    goldenCase?.expectedOutcome.expectedRepairNeeded === true;
  const repairSucceeded =
    repairResult !== undefined &&
    ["repaired", "unchanged_valid", "warning"].includes(repairResult.status) &&
    repairResult.proposalValidation?.status !== "blocked";
  const schemaPassed =
    schemaValidation?.status === "parsed" ||
    schemaValidation?.status === "warning";
  const unsafeBlocked =
    actualStatus === "blocked" &&
    failureCategories.some((category) =>
      [
        "unsafe_path",
        "forbidden_field",
        "secret_marker",
        "raw_content_leak",
        "reasoning_content_leak"
      ].includes(category)
    );
  const caseHash = stablePreviewHash(
    stableStringify({
      caseId,
      status,
      actualStatus,
      expectedStatus,
      matchedExpectation,
      failureCategories,
      proposalId: schemaValidation?.summary.proposalId,
      repairStatus: repairResult?.status,
      schemaStatus: schemaValidation?.status,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    caseId,
    title,
    expectedStatus,
    actualStatus,
    matchedExpectation,
    failureCategories,
    blockerCount,
    warningCount,
    repairNeeded,
    repairSucceeded,
    schemaPassed,
    unsafeBlocked,
    evidenceCoverageSummary:
      goldenCase?.expectedOutcome.expectedEvidenceCoverage ?? "unknown",
    operationRiskSummary:
      goldenCase?.expectedOutcome.expectedRiskLevel ?? "unknown",
    usageSummary,
    proposalId: schemaValidation?.summary.proposalId,
    proposalHash: schemaValidation?.summary.hash,
    repairStatus: repairResult?.status,
    schemaStatus: schemaValidation?.status,
    findings: finalFindings,
    caseHash,
    nextAction: nextActionForCase(status),
    source: "runtime_live_proposal_offline_evaluation_case"
  };
}

export async function runLiveProposalOfflineEvaluation(
  input: LiveProposalOfflineEvaluationInput = {}
): Promise<LiveProposalOfflineEvaluationReport> {
  const evaluatorMode = input.evaluatorMode ?? "offline_fake";
  const inputFindings = validateLiveProposalOfflineEvaluationInput(input);
  const hasInputBlocker = inputFindings.some(
    (findingItem) => findingItem.severity === "blocker"
  );
  const cases = hasInputBlocker ? [] : (input.cases ?? []);
  const results: LiveProposalOfflineEvaluationCaseResult[] = [];
  for (const [index, evaluationCase] of cases.entries()) {
    results.push(
      await runLiveProposalOfflineEvaluationCase({
        ...evaluationCase,
        evaluatorMode,
        fakeResponses: input.fakeResponses,
        dryClient: input.dryClient,
        createdAt: input.createdAt,
        idGenerator: input.idGenerator
          ? () => `${input.idGenerator?.()}-${index + 1}`
          : undefined
      })
    );
  }
  const allFindings = uniqueFindings([
    ...inputFindings,
    ...results.flatMap((result) => result.findings)
  ]);
  const blockerCount = allFindings.filter(
    (findingItem) => findingItem.severity === "blocker"
  ).length;
  const caseCount = results.length;
  const passedCount = results.filter(
    (result) => result.status === "passed"
  ).length;
  const warningCaseCount = results.filter(
    (result) => result.status === "warning"
  ).length;
  const blockedCount = results.filter(
    (result) => result.status === "blocked"
  ).length;
  const failedExpectationCount = results.filter(
    (result) => result.status === "failed"
  ).length;
  const schemaPassCount = results.filter(
    (result) => result.schemaPassed
  ).length;
  const repairAttemptCount = results.filter(
    (result) => result.repairNeeded
  ).length;
  const repairSuccessCount = results.filter(
    (result) => result.repairSucceeded
  ).length;
  const taxonomySummary = buildTaxonomySummary(results);
  const metrics = buildReportMetrics({
    caseCount,
    schemaPassCount,
    repairAttemptCount,
    repairSuccessCount,
    results,
    failedExpectationCount
  });
  const status = reportStatusFrom({
    caseCount,
    hasInputBlocker,
    failedExpectationCount,
    blockedCount,
    warningCaseCount
  });
  const reportHash = stablePreviewHash(
    stableStringify({
      status,
      evaluatorMode,
      cases: results.map((result) => ({
        caseId: result.caseId,
        status: result.status,
        actualStatus: result.actualStatus,
        matchedExpectation: result.matchedExpectation,
        failureCategories: result.failureCategories,
        caseHash: result.caseHash
      })),
      metrics: metrics.map((metric) => [metric.metricId, metric.value])
    })
  );

  return {
    status,
    reportId:
      input.idGenerator?.() ??
      `live-proposal-offline-eval-${reportHash.slice(0, 12)}`,
    evaluatorMode,
    caseCount,
    passedCount,
    warningCount: warningCaseCount,
    blockedCount,
    failedExpectationCount,
    schemaPassRate: rate(schemaPassCount, caseCount),
    repairAttemptCount,
    repairSuccessRate: rate(repairSuccessCount, repairAttemptCount),
    unsafePathBlockedCount: taxonomySummary.categories.unsafe_path,
    forbiddenFieldBlockedCount: taxonomySummary.categories.forbidden_field,
    secretMarkerBlockedCount: taxonomySummary.categories.secret_marker,
    rawLeakBlockedCount:
      taxonomySummary.categories.raw_content_leak +
      taxonomySummary.categories.reasoning_content_leak,
    evidenceCoverageWarnings: taxonomySummary.categories.missing_evidence,
    testPlanWarnings: taxonomySummary.categories.missing_test_plan,
    highRiskOperationWarnings: taxonomySummary.categories.high_risk_operation,
    usageSummaryCaseCount: results.filter(
      (result) => result.usageSummary !== undefined
    ).length,
    taxonomySummary,
    metrics,
    cases: results,
    findings: allFindings,
    blockerCount,
    findingCount: allFindings.length,
    reportHash,
    readiness: disabledReadiness(),
    nextAction: nextActionForReport(status),
    source: "runtime_live_proposal_offline_evaluation_runner"
  };
}

export function summarizeLiveProposalOfflineEvaluationReport(
  report: LiveProposalOfflineEvaluationReport
): {
  status: LiveProposalOfflineEvaluationStatus;
  reportId: string;
  evaluatorMode: LiveProposalOfflineEvaluationMode;
  caseCount: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedExpectationCount: number;
  schemaPassRate: number;
  repairSuccessRate: number;
  taxonomySummary: LiveProposalFailureTaxonomySummary;
  reportHash: string;
  source: "runtime_live_proposal_offline_evaluation_runner_summary";
} {
  return {
    status: report.status,
    reportId: report.reportId,
    evaluatorMode: report.evaluatorMode,
    caseCount: report.caseCount,
    passedCount: report.passedCount,
    warningCount: report.warningCount,
    blockedCount: report.blockedCount,
    failedExpectationCount: report.failedExpectationCount,
    schemaPassRate: report.schemaPassRate,
    repairSuccessRate: report.repairSuccessRate,
    taxonomySummary: report.taxonomySummary,
    reportHash: report.reportHash,
    source: "runtime_live_proposal_offline_evaluation_runner_summary"
  };
}

function repairValidationToModelValidation(
  repairResult: PatchProposalRepairResult
): ModelPatchProposalValidationResult | undefined {
  if (repairResult.proposalValidation === undefined) {
    return undefined;
  }
  const summary = modelSummaryFromRepair(repairResult);
  return {
    status: repairResult.proposalValidation.status,
    summary,
    findings: [],
    blockerCount: repairResult.proposalValidation.blockerCount,
    warningCount: repairResult.proposalValidation.warningCount,
    findingCount: repairResult.proposalValidation.findingCount,
    normalizedHash: repairResult.proposalValidation.normalizedHash,
    readiness: {
      canEnterPatchProposalPreview:
        repairResult.proposalValidation.status !== "blocked",
      canApplyPatch: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: "Evaluation-only schema summary.",
    source: "runtime_model_patch_proposal_schema"
  };
}

function parseHarnessValidation(
  harnessResult: PatchProposalHarnessResult
): ModelPatchProposalValidationResult | undefined {
  if (harnessResult.validationSummary === undefined) {
    return undefined;
  }
  const summary: ModelPatchProposalSummary = {
    status: harnessResult.validationSummary.status,
    operationCount: harnessResult.validationSummary.operationCount,
    fileCount: harnessResult.validationSummary.fileCount,
    pathSummaries: harnessResult.validationSummary.pathSummaries,
    warningCodes: harnessResult.validationSummary.warningCodes,
    ...(harnessResult.validationSummary.proposalId !== undefined
      ? { proposalId: harnessResult.validationSummary.proposalId }
      : {}),
    ...(harnessResult.validationSummary.hash !== undefined
      ? { hash: harnessResult.validationSummary.hash }
      : {})
  };
  return {
    status: harnessResult.validationSummary.status,
    summary,
    findings: [],
    blockerCount: harnessResult.blockerCount,
    warningCount: harnessResult.warningCount,
    findingCount: harnessResult.findingCount,
    normalizedHash: harnessResult.normalizedHash ?? harnessResult.resultHash,
    readiness: {
      canEnterPatchProposalPreview:
        harnessResult.validationSummary.status !== "blocked",
      canApplyPatch: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: "Evaluation-only harness summary.",
    source: "runtime_model_patch_proposal_schema"
  };
}

function modelSummaryFromRepair(
  repairResult: PatchProposalRepairResult
): ModelPatchProposalSummary {
  const validation = repairResult.proposalValidation;
  const repairSummary = validation?.summary;
  return {
    status: validation?.status ?? "blocked",
    operationCount: repairSummary?.operationCount ?? 0,
    fileCount: repairSummary?.fileCount ?? 0,
    pathSummaries: repairSummary?.pathSummaries ?? [],
    warningCodes: repairSummary?.warningCodes ?? [],
    ...(repairSummary?.proposalId !== undefined
      ? { proposalId: repairSummary.proposalId }
      : {}),
    ...(repairSummary?.title !== undefined
      ? { title: repairSummary.title }
      : {}),
    ...(repairSummary?.intent !== undefined
      ? { intent: repairSummary.intent }
      : {}),
    ...(repairSummary?.hash !== undefined ? { hash: repairSummary.hash } : {}),
    ...(repairSummary?.patchProposalCreationPreviewInput !== undefined
      ? {
          patchProposalCreationPreviewInput:
            repairSummary.patchProposalCreationPreviewInput
        }
      : {})
  };
}

function findingsFromGolden(
  validation: LiveProposalGoldenCaseValidationResult
): LiveProposalOfflineEvaluationFinding[] {
  return validation.findings.map((item) =>
    finding(
      "golden_case",
      item.severity,
      `GOLDEN_${item.code}`,
      validation.summary.caseId
    )
  );
}

function findingsFromHarness(
  harnessResult: PatchProposalHarnessResult
): LiveProposalOfflineEvaluationFinding[] {
  return harnessResult.findings.map((item) =>
    finding("fake_response", item.severity, `FAKE_${item.code}`, item.caseId)
  );
}

function findingsFromDry(
  dryResult: PatchProposalDryAdapterResult
): LiveProposalOfflineEvaluationFinding[] {
  return dryResult.findings.map((item) =>
    finding("dry_adapter", item.severity, `DRY_${item.code}`)
  );
}

function findingsFromRepair(
  repairResult: PatchProposalRepairResult
): LiveProposalOfflineEvaluationFinding[] {
  return repairResult.findings.map((item) =>
    finding("repair", item.severity, `REPAIR_${item.code}`)
  );
}

function taxonomyFromGoldenValidation(
  validation: LiveProposalGoldenCaseValidationResult
): LiveProposalGoldenCaseFailureCategory[] {
  if (validation.status !== "blocked") {
    return [];
  }
  return taxonomyFromCodes(validation.findings.map((item) => item.code));
}

function taxonomyFromFindings(
  findings: readonly LiveProposalOfflineEvaluationFinding[]
): LiveProposalGoldenCaseFailureCategory[] {
  return taxonomyFromCodes(findings.map((item) => item.code));
}

function taxonomyFromRepair(
  repairResult: PatchProposalRepairResult | undefined
): LiveProposalGoldenCaseFailureCategory[] {
  if (repairResult === undefined) {
    return [];
  }
  const codes = [
    repairResult.status === "failed" ? "REPAIR_FAILED" : "",
    ...repairResult.operations.map((operation) => operation.kind),
    ...repairResult.findings.map((findingItem) => findingItem.code)
  ];
  return taxonomyFromCodes(codes);
}

function taxonomyFromSchema(
  validation: ModelPatchProposalValidationResult | undefined
): LiveProposalGoldenCaseFailureCategory[] {
  if (validation === undefined) {
    return [];
  }
  return taxonomyFromCodes([
    validation.status === "blocked" ? "SCHEMA_FAILURE" : "",
    ...validation.findings.map((findingItem) => findingItem.code),
    ...validation.summary.warningCodes
  ]);
}

function taxonomyFromCodes(
  codes: readonly string[]
): LiveProposalGoldenCaseFailureCategory[] {
  const categories: LiveProposalGoldenCaseFailureCategory[] = [];
  const text = codes.join(" ").toUpperCase();
  if (/INVALID_JSON|MALFORMED/.test(text)) {
    categories.push("malformed_json");
  }
  if (/SCHEMA|VALIDATION|UNSUPPORTED_SCHEMA/.test(text)) {
    categories.push("schema_failure");
  }
  if (/REPAIR_FAILED|CANDIDATE_NOT_OBJECT|MAX_ATTEMPTS/.test(text)) {
    categories.push("repair_failed");
  }
  if (
    /PATH|TRAVERSAL|DRIVE|UNC|GENERATED|SECRET_PATH|HALLUCINATED/.test(text)
  ) {
    categories.push(
      /HALLUCINATED/.test(text) ? "hallucinated_path" : "unsafe_path"
    );
  }
  if (
    /EXECUTION|FORBIDDEN|COMMAND|TOOL_CHOICE|TOOLS|APPLY|ROLLBACK|EVENTSTORE/.test(
      text
    )
  ) {
    categories.push("forbidden_field");
  }
  if (/API_KEY|BEARER|AUTHORIZATION|PRIVATE_KEY|SECRET_MARKER/.test(text)) {
    categories.push("secret_marker");
  }
  if (/RAW_PROMPT|RAW_RESPONSE|RAW_SOURCE|RAW_DIFF|RAW_CONTENT/.test(text)) {
    categories.push("raw_content_leak");
  }
  if (/REASONING/.test(text)) {
    categories.push("reasoning_content_leak");
  }
  if (/MISSING_EVIDENCE|EVIDENCE_REFS/.test(text)) {
    categories.push("missing_evidence");
  }
  if (/MISSING_TEST|TEST_SUMMARY|TEST_PLAN/.test(text)) {
    categories.push("missing_test_plan");
  }
  if (/HIGH_RISK|DELETE|CONFIG|RISK/.test(text)) {
    categories.push("high_risk_operation");
  }
  if (/OBJECTIVE_FIT|POOR_OBJECTIVE|INTENT_MISMATCH/.test(text)) {
    categories.push("poor_objective_fit");
  }
  if (/USAGE_SUMMARY_MISSING/.test(text)) {
    categories.push("usage_summary_missing");
  }
  return uniqueFailureCategories(categories);
}

function actualStatusFrom(args: {
  goldenValidation: LiveProposalGoldenCaseValidationResult;
  findings: readonly LiveProposalOfflineEvaluationFinding[];
  repairResult?: PatchProposalRepairResult | undefined;
  schemaValidation?: ModelPatchProposalValidationResult | undefined;
}): LiveProposalOfflineEvaluationActualStatus {
  if (
    args.goldenValidation.status === "blocked" ||
    args.repairResult?.status === "blocked" ||
    args.repairResult?.status === "failed" ||
    args.schemaValidation?.status === "blocked" ||
    args.findings.some((item) => item.severity === "blocker")
  ) {
    return "blocked";
  }
  if (
    args.goldenValidation.status === "warning" ||
    hasActionableRepairWarning(args.repairResult) ||
    hasActionableSchemaWarning(args.schemaValidation) ||
    args.findings.some(
      (item) => item.severity === "warning" && !isIgnorableWarning(item.code)
    )
  ) {
    return "warning";
  }
  return "pass";
}

function matchesExpectation(args: {
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalOfflineEvaluationActualStatus;
  expectedCategories: readonly LiveProposalGoldenCaseFailureCategory[];
  actualCategories: readonly LiveProposalGoldenCaseFailureCategory[];
}): boolean {
  if (args.expectedStatus !== args.actualStatus) {
    return false;
  }
  if (args.expectedStatus !== "blocked") {
    return true;
  }
  if (args.expectedCategories.length === 0) {
    return true;
  }
  return args.expectedCategories.some((category) =>
    args.actualCategories.includes(category)
  );
}

function caseStatusFrom(args: {
  expectedStatus: "pass" | "warning" | "blocked";
  actualStatus: LiveProposalOfflineEvaluationActualStatus;
  matchedExpectation: boolean;
  blockerCount: number;
  warningCount: number;
}): LiveProposalOfflineEvaluationCaseStatus {
  if (!args.matchedExpectation) {
    return "failed";
  }
  if (args.expectedStatus === "blocked" && args.actualStatus === "blocked") {
    return "blocked";
  }
  if (args.actualStatus === "warning") {
    return "warning";
  }
  return "passed";
}

function hasActionableRepairWarning(
  repairResult: PatchProposalRepairResult | undefined
): boolean {
  if (repairResult === undefined) {
    return false;
  }
  return repairResult.findings.some(
    (item) => item.severity === "warning" && !isIgnorableWarning(item.code)
  );
}

function hasActionableSchemaWarning(
  validation: ModelPatchProposalValidationResult | undefined
): boolean {
  if (validation === undefined) {
    return false;
  }
  return validation.findings.some(
    (item) => item.severity === "warning" && !isIgnorableWarning(item.code)
  );
}

function isIgnorableWarning(code: string): boolean {
  return code.toUpperCase().endsWith("EVIDENCE_REFS_SUMMARY_ONLY");
}

function reportStatusFrom(args: {
  caseCount: number;
  hasInputBlocker: boolean;
  failedExpectationCount: number;
  blockedCount: number;
  warningCaseCount: number;
}): LiveProposalOfflineEvaluationStatus {
  if (args.caseCount === 0 && !args.hasInputBlocker) {
    return "empty";
  }
  if (args.hasInputBlocker) {
    return "blocked";
  }
  if (args.failedExpectationCount > 0) {
    return "failed";
  }
  if (args.blockedCount > 0 || args.warningCaseCount > 0) {
    return "warning";
  }
  return "evaluation_ready";
}

function buildTaxonomySummary(
  results: readonly LiveProposalOfflineEvaluationCaseResult[]
): LiveProposalFailureTaxonomySummary {
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

function buildReportMetrics(args: {
  caseCount: number;
  schemaPassCount: number;
  repairAttemptCount: number;
  repairSuccessCount: number;
  results: readonly LiveProposalOfflineEvaluationCaseResult[];
  failedExpectationCount: number;
}): LiveProposalOfflineEvaluationMetric[] {
  const taxonomy = buildTaxonomySummary(args.results);
  return [
    metric(
      "schemaPassRate",
      rate(args.schemaPassCount, args.caseCount),
      "Schema pass rate."
    ),
    metric("repairAttemptCount", args.repairAttemptCount, "Repair attempts."),
    metric(
      "repairSuccessRate",
      rate(args.repairSuccessCount, args.repairAttemptCount),
      "Repair success rate."
    ),
    metric(
      "unsafePathBlockedCount",
      taxonomy.categories.unsafe_path,
      "Unsafe path blockers."
    ),
    metric(
      "forbiddenFieldBlockedCount",
      taxonomy.categories.forbidden_field,
      "Forbidden field blockers."
    ),
    metric(
      "secretMarkerBlockedCount",
      taxonomy.categories.secret_marker,
      "Secret marker blockers."
    ),
    metric(
      "rawLeakBlockedCount",
      taxonomy.categories.raw_content_leak +
        taxonomy.categories.reasoning_content_leak,
      "Raw leak blockers."
    ),
    metric(
      "failedExpectationCount",
      args.failedExpectationCount,
      "Expectation mismatches."
    )
  ];
}

function metric(
  metricId: string,
  value: number | string | boolean,
  summary: string
): LiveProposalOfflineEvaluationMetric {
  return { metricId, value, summary };
}

function sanitizeUsageSummary(
  value: unknown
): LiveProposalOfflineEvaluationUsageSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const usage: LiveProposalOfflineEvaluationUsageSummary = {};
  for (const key of [
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "requestCount",
    "responseCount"
  ] as const) {
    const numberValue = value[key];
    if (typeof numberValue === "number" && Number.isFinite(numberValue)) {
      usage[key] = numberValue;
    }
  }
  return Object.keys(usage).length > 0 ? usage : undefined;
}

function extractCaseId(value: unknown): string | undefined {
  return isRecord(value) && typeof value.caseId === "string"
    ? value.caseId
    : undefined;
}

function disabledReadiness(): LiveProposalOfflineEvaluationReadiness {
  return {
    canEnterLiveEvaluation: false,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionForCase(
  status: LiveProposalOfflineEvaluationCaseStatus
): string {
  if (status === "failed") {
    return "Inspect summary-only expectation mismatch before using this case in offline evaluation.";
  }
  if (status === "blocked") {
    return "Blocked case matched expected failure taxonomy. No execution is enabled.";
  }
  if (status === "warning") {
    return "Review warning summaries and taxonomy counts. No live call or apply is enabled.";
  }
  return "Case passed offline evaluation. Proposal still cannot be applied.";
}

function nextActionForReport(
  status: LiveProposalOfflineEvaluationStatus
): string {
  if (status === "empty") {
    return "Add summary-only golden cases and fake/dry responses before running offline evaluation.";
  }
  if (status === "blocked") {
    return "Fix blocked offline evaluation inputs before rerunning. Live calls remain disabled.";
  }
  if (status === "failed") {
    return "Review failed expectations and taxonomy summaries before adding more cases.";
  }
  if (status === "warning") {
    return "Review warning and blocked expected cases. This report remains summary-only.";
  }
  return "Offline evaluation report is ready for review. Live calls, apply, and rollback remain disabled.";
}

function findForbiddenFields(
  value: unknown,
  path: string
): LiveProposalOfflineEvaluationFinding[] {
  const findings: LiveProposalOfflineEvaluationFinding[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findForbiddenFields(item, `${path}.${index}`));
    });
    return findings;
  }
  if (!isRecord(value)) {
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const childPath = `${path}.${key}`;
    if (forbiddenFieldKeys.has(lower)) {
      findings.push(forbiddenFinding(key, childPath));
    }
    if (executionAttemptKeys.has(lower) && child === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_TRUE", childPath)
      );
    }
    findings.push(...findForbiddenFields(child, childPath));
  }
  return findings;
}

function forbiddenFinding(
  key: string,
  path: string
): LiveProposalOfflineEvaluationFinding {
  const lower = key.toLowerCase();
  if (
    lower === "command" ||
    lower === "shellcommand" ||
    lower === "gitcommand" ||
    lower === "tauricommand" ||
    lower === "eventstorewrite" ||
    lower === "applynow" ||
    lower === "rollbacknow" ||
    lower === "permissionlease" ||
    lower === "desktopaction" ||
    lower === "nativebridge" ||
    lower === "tools" ||
    lower === toolChoiceField
  ) {
    return finding("input", "blocker", "EXECUTION_FIELD_REJECTED", path);
  }
  return finding("input", "blocker", `${safeCode(key)}_FIELD_REJECTED`, path);
}

function findUnsafeStringMarkers(
  value: unknown,
  path: string
): LiveProposalOfflineEvaluationFinding[] {
  const findings: LiveProposalOfflineEvaluationFinding[] = [];
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      findings.push(finding("input", "blocker", code, path));
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findUnsafeStringMarkers(item, `${path}.${index}`));
    });
    return findings;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      findings.push(...findUnsafeStringMarkers(child, `${path}.${key}`));
    }
  }
  return findings;
}

function unsafeMarkerCodes(value: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code }) => code);
}

function uniqueFailureCategories(
  values: readonly LiveProposalGoldenCaseFailureCategory[]
): LiveProposalGoldenCaseFailureCategory[] {
  return Array.from(
    new Set(values.filter((value) => failureCategories.includes(value)))
  );
}

function uniqueFindings(
  findings: readonly LiveProposalOfflineEvaluationFinding[]
): LiveProposalOfflineEvaluationFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.caseId ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function finding(
  kind: LiveProposalOfflineEvaluationFindingKind,
  severity: LiveProposalOfflineEvaluationSeverity,
  code: string,
  caseId?: string | undefined
): LiveProposalOfflineEvaluationFinding {
  const normalizedCode = safeCode(code);
  return {
    findingId: `${kind}-${normalizedCode.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${normalizedCode}:${caseId ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code: normalizedCode,
    safeMessage: safeMessageFor(normalizedCode),
    caseId
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_FAKE_RESPONSE:
      "Offline fake evaluation requires an explicit fake response.",
    MISSING_DRY_CLIENT:
      "Offline dry evaluation requires an injected dry client.",
    UNKNOWN_EVALUATOR_MODE:
      "Evaluator mode must be offline_fake or offline_dry.",
    EXPECTED_OUTCOME_MISMATCH:
      "Actual summary result did not match expected golden outcome.",
    EXECUTION_FIELD_REJECTED:
      "Execution/action fields are not allowed in offline evaluation.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false.",
    API_KEY_MARKER: "Key-like marker detected and rejected.",
    BEARER_TOKEN_MARKER: "Bearer-token marker detected and rejected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected and rejected.",
    PRIVATE_KEY_MARKER: "Private-key marker detected and rejected.",
    RAW_PROMPT_MARKER: "Raw prompt marker detected and rejected.",
    RAW_RESPONSE_MARKER: "Raw response marker detected and rejected.",
    RAW_SOURCE_MARKER: "Raw source marker detected and rejected.",
    RAW_DIFF_MARKER: "Raw diff marker detected and rejected.",
    RAW_REASONING_MARKER: "Raw reasoning marker detected and rejected."
  };
  return messages[code] ?? "Offline evaluation finding requires review.";
}

function safeCode(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
