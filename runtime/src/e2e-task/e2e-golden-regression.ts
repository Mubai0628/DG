import {
  buildEndToEndCodingTaskOrchestrator,
  summarizeEndToEndCodingTaskOrchestrator,
  type EndToEndCodingTaskOrchestratorInput,
  type EndToEndCodingTaskOrchestratorView,
  type EndToEndCodingTaskSummaryRef
} from "./e2e-task-orchestrator.js";
import {
  summarizeEndToEndCodingTaskFixture,
  validateEndToEndCodingTaskFixture,
  type EndToEndCodingTaskExpectedArtifact,
  type EndToEndCodingTaskExpectedStatus,
  type EndToEndCodingTaskFailureCategory,
  type EndToEndCodingTaskFixture,
  type EndToEndCodingTaskFixtureInput,
  type EndToEndCodingTaskFixtureValidationResult
} from "./e2e-task-fixture-schema.js";
import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type EndToEndGoldenRegressionActualOutcome =
  EndToEndCodingTaskExpectedStatus;

export type EndToEndGoldenRegressionCaseStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "failed";

export type EndToEndGoldenRegressionStatus =
  | "empty"
  | "passed"
  | "warning"
  | "failed"
  | "blocked";

export type EndToEndGoldenRegressionFindingKind =
  | "input"
  | "fixture"
  | "orchestrator"
  | "expectation"
  | "readiness";

export type EndToEndGoldenRegressionSeverity = "blocker" | "warning";

export type EndToEndGoldenRegressionFinding = {
  findingId: string;
  kind: EndToEndGoldenRegressionFindingKind;
  severity: EndToEndGoldenRegressionSeverity;
  code: string;
  safeMessage: string;
  taskId?: string | undefined;
};

export type EndToEndGoldenRegressionSummaryRef = {
  refId?: string | undefined;
  status: "ready" | "warning" | "blocked" | "missing";
  summary?: string | undefined;
  pathCount: number;
  eventKindCount: number;
  warningCodes: string[];
  blockerCodes: string[];
  hashPrefix?: string | undefined;
};

export type EndToEndGoldenRegressionEventReplaySummary = {
  replayRefId?: string | undefined;
  eventCount: number;
  replayStatus: EndToEndGoldenRegressionSummaryRef["status"];
  eventKindCount: number;
  warningCodes: string[];
  blockerCodes: string[];
};

export type EndToEndGoldenRegressionCaseInput = {
  fixture: EndToEndCodingTaskFixtureInput | EndToEndCodingTaskFixture;
  expectedOutcome?: EndToEndCodingTaskExpectedStatus | undefined;
  expectedFailureCategories?: EndToEndCodingTaskFailureCategory[] | undefined;
};

export type EndToEndGoldenRegressionInput = {
  suiteId?: string | undefined;
  cases?: EndToEndGoldenRegressionCaseInput[] | undefined;
  maxCases?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type EndToEndGoldenRegressionReadiness = {
  canUseExistingApprovedFlow: boolean;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canAutoApply: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type EndToEndGoldenRegressionCaseResult = {
  status: EndToEndGoldenRegressionCaseStatus;
  taskId: string;
  title: string;
  expectedOutcome: EndToEndCodingTaskExpectedStatus;
  actualOutcome: EndToEndGoldenRegressionActualOutcome;
  matchedExpectation: boolean;
  proposalSummary: EndToEndGoldenRegressionSummaryRef;
  approvalSummary: EndToEndGoldenRegressionSummaryRef;
  applySummary: EndToEndGoldenRegressionSummaryRef;
  verificationSummary: EndToEndGoldenRegressionSummaryRef;
  rollbackSummary?: EndToEndGoldenRegressionSummaryRef | undefined;
  eventReplaySummary: EndToEndGoldenRegressionEventReplaySummary;
  orchestratorSummary?: ReturnType<
    typeof summarizeEndToEndCodingTaskOrchestrator
  >;
  failureCategories: EndToEndCodingTaskFailureCategory[];
  blockerCodes: string[];
  warningCodes: string[];
  findingCount: number;
  caseHash: string;
  readiness: EndToEndGoldenRegressionReadiness;
  nextAction: string;
  source: "runtime_e2e_golden_regression_case";
};

export type EndToEndFailureTaxonomySummary = Record<
  EndToEndCodingTaskFailureCategory,
  number
>;

export type EndToEndGoldenRegressionReport = {
  status: EndToEndGoldenRegressionStatus;
  suiteId: string;
  caseCount: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  failedRegressionCount: number;
  rollbackRegressionCount: number;
  expectedBlockedCount: number;
  taxonomySummary: EndToEndFailureTaxonomySummary;
  cases: EndToEndGoldenRegressionCaseResult[];
  findings: EndToEndGoldenRegressionFinding[];
  blockerCount: number;
  findingCount: number;
  reportHash: string;
  readiness: EndToEndGoldenRegressionReadiness;
  nextAction: string;
  source: "runtime_e2e_golden_regression_suite";
};

const defaultMaxCases = 50;

const failureCategories: EndToEndCodingTaskFailureCategory[] = [
  "schema_failure",
  "unsafe_path",
  "secret_marker",
  "raw_content_leak",
  "missing_expected_event",
  "stale_snapshot",
  "apply_conflict",
  "verification_failure",
  "rollback_failure",
  "event_mismatch",
  "replay_mismatch",
  "no_failure_expected"
];

const executionReadinessKeys = new Set(
  [
    "canCallLiveModel",
    "canReadApiKey",
    "canFetchNetwork",
    "canAutoApply",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowGit",
    "allowShell",
    "allowAppExecution"
  ].map((key) => key.toLowerCase())
);

export function validateEndToEndGoldenRegressionInput(
  input: EndToEndGoldenRegressionInput = {}
): EndToEndGoldenRegressionFinding[] {
  const findings: EndToEndGoldenRegressionFinding[] = [];
  const caseCount = input.cases?.length ?? 0;
  if (
    input.maxCases !== undefined &&
    (!Number.isSafeInteger(input.maxCases) || input.maxCases < 1)
  ) {
    findings.push(finding("input", "blocker", "INVALID_MAX_CASES"));
  }
  if (caseCount > (input.maxCases ?? defaultMaxCases)) {
    findings.push(finding("input", "blocker", "TOO_MANY_CASES"));
  }
  findings.push(...findExecutionReadinessClaims(input, "input"));
  return uniqueFindings(findings);
}

export function runEndToEndGoldenRegressionCase(
  input: EndToEndGoldenRegressionCaseInput,
  options: Pick<EndToEndGoldenRegressionInput, "createdAt" | "idGenerator"> = {}
): EndToEndGoldenRegressionCaseResult {
  const validation = validateEndToEndCodingTaskFixture(input.fixture, {
    idGenerator: options.idGenerator
  });
  const fixture = validation.fixture;
  const taskId = taskIdFor(input.fixture, validation);
  const title = fixture?.title ?? validation.summary.title ?? "Blocked fixture";
  const expectedOutcome =
    input.expectedOutcome ??
    fixture?.expectedFlow.expectedStatus ??
    validation.summary.expectedStatus ??
    "blocked";
  const expectedFailureCategories = uniqueCategories([
    ...(input.expectedFailureCategories ?? []),
    ...(fixture?.expectedFailureCategories ?? []),
    ...validation.summary.expectedFailureCategories
  ]);

  const orchestrator =
    fixture === undefined ? undefined : orchestratorForFixture(fixture);
  const fixtureFindings = findingsFromFixture(validation, taskId);
  const orchestratorFindings =
    orchestrator === undefined
      ? []
      : findingsFromOrchestrator(orchestrator, taskId);
  const findings = uniqueFindings([
    ...fixtureFindings,
    ...orchestratorFindings
  ]);
  const actualOutcome = actualOutcomeFor(
    validation,
    orchestrator,
    expectedOutcome
  );
  const failureCategories = uniqueCategories([
    ...expectedFailureCategories,
    ...taxonomyFromFixture(validation),
    ...taxonomyFromOrchestrator(orchestrator),
    ...(expectedOutcome === "blocked" ? expectedFailureCategories : [])
  ]);
  const matchedExpectation = matchesExpectation(
    expectedOutcome,
    actualOutcome,
    expectedFailureCategories,
    failureCategories
  );
  const expectationFindings = matchedExpectation
    ? []
    : [finding("expectation", "blocker", "EXPECTED_OUTCOME_MISMATCH", taskId)];
  const finalFindings = uniqueFindings([...findings, ...expectationFindings]);
  const blockerCodes = uniqueStrings(
    finalFindings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code)
  );
  const warningCodes = uniqueStrings([
    ...finalFindings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    ...(fixture?.expectedArtifacts.flatMap(
      (artifact) => artifact.warningCodes
    ) ?? [])
  ]);
  const status = caseStatusFor({
    actualOutcome,
    matchedExpectation,
    warningCodes
  });
  const proposalSummary = summaryForKind(fixture, "proposal_summary");
  const applySummary = summaryForKind(
    fixture,
    "apply_summary",
    expectedOutcome === "blocked" ? "blocked" : undefined
  );
  const verificationSummary = summaryForKind(
    fixture,
    "verification_summary",
    expectedOutcome === "rollback_required" ? "warning" : undefined
  );
  const rollbackSummary = summaryForKind(fixture, "rollback_summary");
  const eventReplaySummary = eventReplaySummaryFor(fixture, expectedOutcome);
  const approvalSummary = approvalSummaryFor(fixture, taskId, expectedOutcome);
  const caseHash = stablePreviewHash(
    stableStringify({
      taskId,
      expectedOutcome,
      actualOutcome,
      matchedExpectation,
      status,
      blockerCodes,
      warningCodes,
      failureCategories,
      orchestratorState: orchestrator?.state
    })
  );

  return {
    status,
    taskId,
    title,
    expectedOutcome,
    actualOutcome,
    matchedExpectation,
    proposalSummary,
    approvalSummary,
    applySummary,
    verificationSummary,
    ...(rollbackSummary.status === "missing" ? {} : { rollbackSummary }),
    eventReplaySummary,
    ...(orchestrator === undefined
      ? {}
      : {
          orchestratorSummary:
            summarizeEndToEndCodingTaskOrchestrator(orchestrator)
        }),
    failureCategories,
    blockerCodes,
    warningCodes,
    findingCount: finalFindings.length,
    caseHash,
    readiness: regressionReadiness(status !== "failed"),
    nextAction: nextActionForCase(status),
    source: "runtime_e2e_golden_regression_case"
  };
}

export function runEndToEndGoldenRegression(
  input: EndToEndGoldenRegressionInput = {}
): EndToEndGoldenRegressionReport {
  const suiteId =
    input.suiteId ?? input.idGenerator?.() ?? "e2e-golden-regression";
  const inputFindings = validateEndToEndGoldenRegressionInput(input);
  const hasInputBlocker = inputFindings.some(
    (item) => item.severity === "blocker"
  );
  const cases = hasInputBlocker
    ? []
    : (input.cases ?? []).map((regressionCase, index) =>
        runEndToEndGoldenRegressionCase(regressionCase, {
          createdAt: input.createdAt,
          idGenerator: input.idGenerator
            ? () => `${input.idGenerator?.()}-case-${index + 1}`
            : undefined
        })
      );
  const failedRegressionCount = cases.filter(
    (item) => item.status === "failed"
  ).length;
  const warningCount = cases.filter((item) => item.status === "warning").length;
  const blockedCount = cases.filter((item) => item.status === "blocked").length;
  const passedCount = cases.filter((item) => item.status === "passed").length;
  const rollbackRegressionCount = cases.filter(
    (item) => item.actualOutcome === "rollback_required"
  ).length;
  const expectedBlockedCount = cases.filter(
    (item) => item.expectedOutcome === "blocked"
  ).length;
  const blockerCount = inputFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const taxonomySummary = buildTaxonomySummary(cases);
  const status = reportStatusFor({
    caseCount: cases.length,
    hasInputBlocker,
    failedRegressionCount,
    warningCount
  });
  const reportHash = stablePreviewHash(
    stableStringify({
      suiteId,
      status,
      caseHashes: cases.map((item) => item.caseHash),
      findingCodes: inputFindings.map((item) => item.code),
      taxonomySummary
    })
  );

  return {
    status,
    suiteId,
    caseCount: cases.length,
    passedCount,
    warningCount,
    blockedCount,
    failedRegressionCount,
    rollbackRegressionCount,
    expectedBlockedCount,
    taxonomySummary,
    cases,
    findings: inputFindings,
    blockerCount,
    findingCount: inputFindings.length,
    reportHash,
    readiness: regressionReadiness(status !== "blocked" && status !== "failed"),
    nextAction: nextActionForReport(status),
    source: "runtime_e2e_golden_regression_suite"
  };
}

export function summarizeEndToEndGoldenRegressionReport(
  report: EndToEndGoldenRegressionReport
): Pick<
  EndToEndGoldenRegressionReport,
  | "status"
  | "suiteId"
  | "caseCount"
  | "passedCount"
  | "warningCount"
  | "blockedCount"
  | "failedRegressionCount"
  | "rollbackRegressionCount"
  | "expectedBlockedCount"
  | "taxonomySummary"
  | "reportHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    suiteId: report.suiteId,
    caseCount: report.caseCount,
    passedCount: report.passedCount,
    warningCount: report.warningCount,
    blockedCount: report.blockedCount,
    failedRegressionCount: report.failedRegressionCount,
    rollbackRegressionCount: report.rollbackRegressionCount,
    expectedBlockedCount: report.expectedBlockedCount,
    taxonomySummary: report.taxonomySummary,
    reportHash: report.reportHash,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

function orchestratorForFixture(
  fixture: EndToEndCodingTaskFixture
): EndToEndCodingTaskOrchestratorView {
  const expectedOutcome = fixture.expectedFlow.expectedStatus;
  const input: EndToEndCodingTaskOrchestratorInput = {
    objectiveSummary: fixture.objective.objectiveSummary,
    taskRunId: `golden:${fixture.taskId}`,
    liveProposalGenerationSummary: orchestratorSummary(
      summaryForKind(fixture, "proposal_summary")
    ),
    modelProposalImportSummary: orchestratorSummary(
      summaryForKind(fixture, "proposal_summary")
    ),
    chainIntegrationSummary: readySummary(`chain:${fixture.taskId}`),
    validationAuditApprovalSummary: readySummary(
      `validation:${fixture.taskId}`
    ),
    approvalReceiptSummary: orchestratorSummary(
      approvalSummaryFor(fixture, fixture.taskId, expectedOutcome)
    ),
    applyResultSummary: orchestratorSummary(
      summaryForKind(
        fixture,
        "apply_summary",
        expectedOutcome === "blocked" ? "blocked" : undefined
      )
    ),
    verificationResultSummary: orchestratorSummary(
      summaryForKind(
        fixture,
        "verification_summary",
        expectedOutcome === "rollback_required" ? "warning" : undefined
      )
    ),
    rollbackResultSummary:
      expectedOutcome === "rollback_required"
        ? orchestratorSummary(summaryForKind(fixture, "rollback_summary"))
        : undefined,
    replaySummary: orchestratorSummary(
      replaySummaryRefFor(fixture, expectedOutcome)
    )
  };
  return buildEndToEndCodingTaskOrchestrator(input);
}

function summaryForKind(
  fixture: EndToEndCodingTaskFixture | undefined,
  kind: EndToEndCodingTaskExpectedArtifact["kind"],
  forcedStatus?: EndToEndGoldenRegressionSummaryRef["status"]
): EndToEndGoldenRegressionSummaryRef {
  const artifact = fixture?.expectedArtifacts.find(
    (item) => item.kind === kind
  );
  if (artifact === undefined) {
    return {
      status: "missing",
      pathCount: 0,
      eventKindCount: 0,
      warningCodes: [],
      blockerCodes: []
    };
  }
  const blockerCodes =
    forcedStatus === "blocked"
      ? failureCodesFor(fixture?.expectedFailureCategories ?? [])
      : [];
  return {
    refId: artifact.refId,
    status:
      forcedStatus ?? (artifact.warningCodes.length > 0 ? "warning" : "ready"),
    summary: artifact.summary,
    pathCount: artifact.pathRefs.length,
    eventKindCount: artifact.eventKinds.length,
    warningCodes: uniqueStrings(artifact.warningCodes),
    blockerCodes,
    ...(artifact.hashPrefix === undefined
      ? {}
      : { hashPrefix: artifact.hashPrefix })
  };
}

function approvalSummaryFor(
  fixture: EndToEndCodingTaskFixture | undefined,
  taskId: string,
  expectedOutcome: EndToEndCodingTaskExpectedStatus
): EndToEndGoldenRegressionSummaryRef {
  if (fixture === undefined) {
    return {
      status: "missing",
      pathCount: 0,
      eventKindCount: 0,
      warningCodes: [],
      blockerCodes: []
    };
  }
  return {
    refId: `approval:${taskId}`,
    status: expectedOutcome === "blocked" ? "missing" : "ready",
    summary:
      "Approval receipt summary is required before existing approved execution.",
    pathCount: fixture.objective.allowedPathRefs.length,
    eventKindCount: 0,
    warningCodes: [],
    blockerCodes: []
  };
}

function eventReplaySummaryFor(
  fixture: EndToEndCodingTaskFixture | undefined,
  expectedOutcome: EndToEndCodingTaskExpectedStatus
): EndToEndGoldenRegressionEventReplaySummary {
  if (fixture === undefined) {
    return {
      eventCount: 0,
      replayStatus: "missing",
      eventKindCount: 0,
      warningCodes: [],
      blockerCodes: []
    };
  }
  const eventArtifacts = fixture.expectedArtifacts.filter(
    (item) => item.kind === "event_summary"
  );
  const replay = replaySummaryRefFor(fixture, expectedOutcome);
  return {
    replayRefId: replay.refId,
    eventCount: fixture.expectedEventCount,
    replayStatus: replay.status,
    eventKindCount: uniqueStrings(
      eventArtifacts.flatMap((artifact) => artifact.eventKinds)
    ).length,
    warningCodes: uniqueStrings([
      ...eventArtifacts.flatMap((artifact) => artifact.warningCodes),
      ...replay.warningCodes
    ]),
    blockerCodes: replay.blockerCodes
  };
}

function replaySummaryRefFor(
  fixture: EndToEndCodingTaskFixture,
  expectedOutcome: EndToEndCodingTaskExpectedStatus
): EndToEndGoldenRegressionSummaryRef {
  return summaryForKind(
    fixture,
    "replay_summary",
    expectedOutcome === "blocked" ? "blocked" : undefined
  );
}

function orchestratorSummary(
  summary: EndToEndGoldenRegressionSummaryRef
): EndToEndCodingTaskSummaryRef | undefined {
  if (summary.status === "missing") {
    return undefined;
  }
  return {
    refId: summary.refId,
    status: summary.status,
    summary: summary.summary,
    warningCodes: summary.warningCodes,
    blockerCodes: summary.blockerCodes,
    blockerCount: summary.blockerCodes.length,
    warningCount: summary.warningCodes.length
  };
}

function readySummary(refId: string): EndToEndCodingTaskSummaryRef {
  return {
    refId,
    status: "ready",
    summary: `${refId} summary`,
    warningCodes: [],
    blockerCodes: []
  };
}

function actualOutcomeFor(
  validation: EndToEndCodingTaskFixtureValidationResult,
  orchestrator: EndToEndCodingTaskOrchestratorView | undefined,
  expectedOutcome: EndToEndCodingTaskExpectedStatus
): EndToEndGoldenRegressionActualOutcome {
  if (validation.status === "blocked" || orchestrator?.state === "blocked") {
    return "blocked";
  }
  if (expectedOutcome === "rollback_required") {
    return "rollback_required";
  }
  if (
    validation.status === "warning" ||
    (orchestrator?.warningCount ?? 0) > 0
  ) {
    return "warning";
  }
  return "pass";
}

function matchesExpectation(
  expectedOutcome: EndToEndCodingTaskExpectedStatus,
  actualOutcome: EndToEndGoldenRegressionActualOutcome,
  expectedCategories: readonly EndToEndCodingTaskFailureCategory[],
  actualCategories: readonly EndToEndCodingTaskFailureCategory[]
): boolean {
  if (expectedOutcome !== actualOutcome) {
    return false;
  }
  if (expectedOutcome !== "blocked") {
    return true;
  }
  const actionableExpected = expectedCategories.filter(
    (category) => category !== "no_failure_expected"
  );
  if (actionableExpected.length === 0) {
    return true;
  }
  return actionableExpected.some((category) =>
    actualCategories.includes(category)
  );
}

function caseStatusFor(args: {
  actualOutcome: EndToEndGoldenRegressionActualOutcome;
  matchedExpectation: boolean;
  warningCodes: readonly string[];
}): EndToEndGoldenRegressionCaseStatus {
  if (!args.matchedExpectation) {
    return "failed";
  }
  if (args.actualOutcome === "blocked") {
    return "blocked";
  }
  if (args.actualOutcome === "warning") {
    return "warning";
  }
  return "passed";
}

function reportStatusFor(args: {
  caseCount: number;
  hasInputBlocker: boolean;
  failedRegressionCount: number;
  warningCount: number;
}): EndToEndGoldenRegressionStatus {
  if (args.caseCount === 0 && !args.hasInputBlocker) {
    return "empty";
  }
  if (args.hasInputBlocker) {
    return "blocked";
  }
  if (args.failedRegressionCount > 0) {
    return "failed";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "passed";
}

function findingsFromFixture(
  validation: EndToEndCodingTaskFixtureValidationResult,
  taskId: string
): EndToEndGoldenRegressionFinding[] {
  return validation.findings.map((item) =>
    finding("fixture", item.severity, `FIXTURE_${item.code}`, taskId)
  );
}

function findingsFromOrchestrator(
  orchestrator: EndToEndCodingTaskOrchestratorView,
  taskId: string
): EndToEndGoldenRegressionFinding[] {
  return orchestrator.findings.map((item) =>
    finding("orchestrator", item.severity, `ORCHESTRATOR_${item.code}`, taskId)
  );
}

function taxonomyFromFixture(
  validation: EndToEndCodingTaskFixtureValidationResult
): EndToEndCodingTaskFailureCategory[] {
  if (validation.status !== "blocked") {
    return [];
  }
  return taxonomyFromCodes(validation.findings.map((item) => item.code));
}

function taxonomyFromOrchestrator(
  orchestrator: EndToEndCodingTaskOrchestratorView | undefined
): EndToEndCodingTaskFailureCategory[] {
  if (orchestrator === undefined || orchestrator.blockerCount === 0) {
    return [];
  }
  return taxonomyFromCodes([
    orchestrator.state,
    ...orchestrator.findings.map((item) => item.code),
    ...orchestrator.stageTimeline.flatMap((stage) => [
      ...stage.blockerCodes,
      ...stage.warningCodes
    ])
  ]);
}

function taxonomyFromCodes(
  codes: readonly string[]
): EndToEndCodingTaskFailureCategory[] {
  const text = codes.join(" ").toUpperCase();
  const categories: EndToEndCodingTaskFailureCategory[] = [];
  if (/SCHEMA|JSON|UNSUPPORTED/.test(text)) {
    categories.push("schema_failure");
  }
  if (/PATH|TRAVERSAL|UNC|ABSOLUTE/.test(text)) {
    categories.push("unsafe_path");
  }
  if (/SECRET|API_KEY|BEARER|AUTHORIZATION|PRIVATE_KEY/.test(text)) {
    categories.push("secret_marker");
  }
  if (/RAW|PREIMAGE|REASONING|CONTENT/.test(text)) {
    categories.push("raw_content_leak");
  }
  if (/MISSING_EXPECTED_EVENT|EVENT/.test(text)) {
    categories.push("missing_expected_event");
  }
  if (/STALE|SNAPSHOT/.test(text)) {
    categories.push("stale_snapshot");
  }
  if (/APPLY_CONFLICT|CONFLICT/.test(text)) {
    categories.push("apply_conflict");
  }
  if (/VERIFICATION_FAILED|FAILED/.test(text)) {
    categories.push("verification_failure");
  }
  if (/ROLLBACK/.test(text)) {
    categories.push("rollback_failure");
  }
  if (/EVENT_MISMATCH/.test(text)) {
    categories.push("event_mismatch");
  }
  if (/REPLAY/.test(text)) {
    categories.push("replay_mismatch");
  }
  return uniqueCategories(categories);
}

function buildTaxonomySummary(
  cases: readonly EndToEndGoldenRegressionCaseResult[]
): EndToEndFailureTaxonomySummary {
  const summary = Object.fromEntries(
    failureCategories.map((category) => [category, 0])
  ) as EndToEndFailureTaxonomySummary;
  for (const result of cases) {
    for (const category of result.failureCategories) {
      summary[category] += 1;
    }
  }
  return summary;
}

function failureCodesFor(
  categories: readonly EndToEndCodingTaskFailureCategory[]
): string[] {
  return uniqueStrings(
    categories
      .filter((category) => category !== "no_failure_expected")
      .map((category) => category.toUpperCase())
  );
}

function taskIdFor(
  input: EndToEndCodingTaskFixtureInput | EndToEndCodingTaskFixture,
  validation: EndToEndCodingTaskFixtureValidationResult
): string {
  if (validation.fixture?.taskId !== undefined) {
    return validation.fixture.taskId;
  }
  if (validation.summary.taskId !== undefined) {
    return validation.summary.taskId;
  }
  if (isRecord(input) && typeof input.taskId === "string") {
    return input.taskId;
  }
  return `blocked-fixture-${stablePreviewHash(
    stableStringify(validation.summary)
  ).slice(0, 12)}`;
}

function regressionReadiness(
  canUseExistingApprovedFlow: boolean
): EndToEndGoldenRegressionReadiness {
  return {
    canUseExistingApprovedFlow,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canAutoApply: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionForCase(status: EndToEndGoldenRegressionCaseStatus): string {
  if (status === "failed") {
    return "Review summary-only expectation mismatch before using this regression case.";
  }
  if (status === "blocked") {
    return "Expected blocker was reproduced. No apply, rollback, or event write is enabled.";
  }
  if (status === "warning") {
    return "Review warning codes before promoting this regression case.";
  }
  return "Golden regression case passed. Existing approved flow gates remain required.";
}

function nextActionForReport(status: EndToEndGoldenRegressionStatus): string {
  if (status === "empty") {
    return "Add summary-only E2E golden regression fixtures.";
  }
  if (status === "blocked") {
    return "Fix blocked regression input before rerunning.";
  }
  if (status === "failed") {
    return "Review failed regression expectations before continuing.";
  }
  if (status === "warning") {
    return "Review warning cases. No execution path is enabled by this report.";
  }
  return "Golden regression suite passed. Continue to hardening tasks.";
}

function findExecutionReadinessClaims(
  value: unknown,
  taskId?: string
): EndToEndGoldenRegressionFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findExecutionReadinessClaims(item, `${taskId ?? "input"}.${index}`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  const findings: EndToEndGoldenRegressionFinding[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (executionReadinessKeys.has(normalized) && child === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_TRUE", taskId)
      );
    }
    findings.push(...findExecutionReadinessClaims(child, taskId));
  }
  return findings;
}

function uniqueCategories(
  values: readonly EndToEndCodingTaskFailureCategory[]
): EndToEndCodingTaskFailureCategory[] {
  return Array.from(
    new Set(values.filter((value) => failureCategories.includes(value)))
  );
}

function uniqueFindings(
  findings: readonly EndToEndGoldenRegressionFinding[]
): EndToEndGoldenRegressionFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.taskId ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== "")));
}

function finding(
  kind: EndToEndGoldenRegressionFindingKind,
  severity: EndToEndGoldenRegressionSeverity,
  code: string,
  taskId?: string | undefined
): EndToEndGoldenRegressionFinding {
  const normalizedCode = safeCode(code);
  return {
    findingId: `${kind}-${normalizedCode.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${normalizedCode}:${taskId ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code: normalizedCode,
    safeMessage: safeMessageFor(normalizedCode),
    taskId
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    INVALID_MAX_CASES: "maxCases must be a positive safe integer.",
    TOO_MANY_CASES: "Golden regression input exceeded maxCases.",
    EXPECTED_OUTCOME_MISMATCH:
      "Actual summary outcome did not match the expected golden outcome.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false."
  };
  return messages[code] ?? "Golden regression summary finding requires review.";
}

function safeCode(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
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
