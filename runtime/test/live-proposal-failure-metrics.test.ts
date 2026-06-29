import { describe, expect, it } from "vitest";

import {
  buildLiveProposalFailureMetrics,
  summarizeLiveProposalFailureMetrics,
  validateLiveProposalFailureMetricsInput,
  type LiveProposalEvaluationReport,
  type LiveProposalFailureMetricsReport,
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseValidationResult,
  type LiveProposalOfflineEvaluationReport
} from "../src/index.js";

function emptyCategories(): Record<
  LiveProposalGoldenCaseFailureCategory,
  number
> {
  return {
    schema_failure: 0,
    malformed_json: 0,
    repair_failed: 0,
    unsafe_path: 0,
    forbidden_field: 0,
    secret_marker: 0,
    missing_evidence: 0,
    missing_test_plan: 0,
    high_risk_operation: 0,
    hallucinated_path: 0,
    poor_objective_fit: 0,
    raw_content_leak: 0,
    reasoning_content_leak: 0,
    usage_summary_missing: 0,
    no_failure_expected: 0
  };
}

function offlineReport(
  overrides: Partial<LiveProposalOfflineEvaluationReport> = {}
): LiveProposalOfflineEvaluationReport {
  const categories = emptyCategories();
  categories.unsafe_path = 1;
  categories.missing_test_plan = 1;
  return {
    status: "warning",
    reportId: "offline-report-1",
    evaluatorMode: "offline_fake",
    caseCount: 3,
    passedCount: 1,
    warningCount: 1,
    blockedCount: 1,
    failedExpectationCount: 0,
    schemaPassRate: 0.6667,
    repairAttemptCount: 2,
    repairSuccessRate: 0.5,
    unsafePathBlockedCount: 1,
    forbiddenFieldBlockedCount: 0,
    secretMarkerBlockedCount: 0,
    rawLeakBlockedCount: 0,
    evidenceCoverageWarnings: 0,
    testPlanWarnings: 1,
    highRiskOperationWarnings: 0,
    usageSummaryCaseCount: 1,
    taxonomySummary: {
      categories,
      totalFailureCategoryCount: 2,
      dominantCategories: ["unsafe_path", "missing_test_plan"]
    },
    metrics: [],
    cases: [
      {
        status: "passed",
        caseId: "case-pass",
        title: "Passing case",
        expectedStatus: "pass",
        actualStatus: "pass",
        matchedExpectation: true,
        failureCategories: ["no_failure_expected"],
        blockerCount: 0,
        warningCount: 0,
        repairNeeded: true,
        repairSucceeded: true,
        schemaPassed: true,
        unsafeBlocked: false,
        evidenceCoverageSummary: "sufficient",
        operationRiskSummary: "low",
        usageSummary: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          requestCount: 1,
          responseCount: 1
        },
        repairStatus: "unchanged_valid",
        schemaStatus: "parsed",
        findings: [],
        caseHash: "case-pass-hash",
        nextAction: "summary only",
        source: "runtime_live_proposal_offline_evaluation_case"
      },
      {
        status: "warning",
        caseId: "case-warning",
        title: "Warning case",
        expectedStatus: "warning",
        actualStatus: "warning",
        matchedExpectation: true,
        failureCategories: ["missing_test_plan"],
        blockerCount: 0,
        warningCount: 1,
        repairNeeded: false,
        repairSucceeded: false,
        schemaPassed: true,
        unsafeBlocked: false,
        evidenceCoverageSummary: "partial",
        operationRiskSummary: "medium",
        repairStatus: "warning",
        schemaStatus: "warning",
        findings: [],
        caseHash: "case-warning-hash",
        nextAction: "summary only",
        source: "runtime_live_proposal_offline_evaluation_case"
      },
      {
        status: "blocked",
        caseId: "case-blocked",
        title: "Blocked case",
        expectedStatus: "blocked",
        actualStatus: "blocked",
        matchedExpectation: true,
        failureCategories: ["unsafe_path"],
        blockerCount: 1,
        warningCount: 0,
        repairNeeded: true,
        repairSucceeded: false,
        schemaPassed: false,
        unsafeBlocked: true,
        evidenceCoverageSummary: "unknown",
        operationRiskSummary: "high",
        repairStatus: "blocked",
        schemaStatus: "blocked",
        findings: [],
        caseHash: "case-blocked-hash",
        nextAction: "summary only",
        source: "runtime_live_proposal_offline_evaluation_case"
      }
    ],
    findings: [],
    blockerCount: 0,
    findingCount: 0,
    reportHash: "offline-report-hash",
    readiness: {
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
    },
    nextAction: "summary only",
    source: "runtime_live_proposal_offline_evaluation_runner",
    ...overrides
  };
}

function liveReport(
  overrides: Partial<LiveProposalEvaluationReport> = {}
): LiveProposalEvaluationReport {
  const categories = emptyCategories();
  categories.secret_marker = 1;
  categories.malformed_json = 1;
  return {
    status: "warning",
    reportId: "live-report-1",
    evaluationMode: "explicit_live_eval",
    caseCount: 2,
    passedCount: 1,
    warningCount: 0,
    blockedCount: 1,
    failedExpectationCount: 1,
    liveCallCaseCount: 2,
    usedLiveNetwork: true,
    schemaPassRate: 0.5,
    repairSuccessRate: 0.5,
    taxonomySummary: {
      categories,
      totalFailureCategoryCount: 2,
      dominantCategories: ["secret_marker", "malformed_json"]
    },
    usageSummary: {
      inputTokens: 20,
      outputTokens: 12,
      totalTokens: 32,
      requestCount: 2,
      responseCount: 2
    },
    metrics: [],
    caseResults: [
      {
        status: "passed",
        caseId: "live-pass",
        title: "Live pass",
        evaluationMode: "explicit_live_eval",
        expectedStatus: "pass",
        actualStatus: "pass",
        matchedExpectation: true,
        liveAdapterStatus: "generated",
        validationIntegrationStatus: "integration_ready",
        telemetryAuditStatus: "audit_ready",
        proposalId: "proposal-live-pass",
        blockerCount: 0,
        warningCount: 0,
        failureCategories: ["no_failure_expected"],
        schemaPassed: true,
        repairSucceeded: true,
        unsafeBlocked: false,
        usageSummary: {
          inputTokens: 20,
          outputTokens: 12,
          totalTokens: 32,
          requestCount: 1,
          responseCount: 1
        },
        droppedReasoningContent: false,
        usedLiveNetwork: true,
        caseHash: "live-pass-hash",
        findings: [],
        nextAction: "summary only",
        source: "runtime_live_proposal_evaluation_case"
      },
      {
        status: "failed",
        caseId: "live-failed",
        title: "Live failed",
        evaluationMode: "explicit_live_eval",
        expectedStatus: "pass",
        actualStatus: "blocked",
        matchedExpectation: false,
        liveAdapterStatus: "blocked",
        validationIntegrationStatus: "blocked",
        telemetryAuditStatus: "warning",
        blockerCount: 1,
        warningCount: 1,
        failureCategories: ["secret_marker", "malformed_json"],
        schemaPassed: false,
        repairSucceeded: false,
        unsafeBlocked: false,
        droppedReasoningContent: true,
        usedLiveNetwork: true,
        caseHash: "live-failed-hash",
        findings: [],
        nextAction: "summary only",
        source: "runtime_live_proposal_evaluation_case"
      }
    ],
    findings: [],
    blockerCount: 0,
    findingCount: 0,
    reportHash: "live-report-hash",
    readiness: {
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
    },
    nextAction: "summary only",
    source: "runtime_live_proposal_evaluation_runner",
    ...overrides
  };
}

function goldenResult(
  overrides: Partial<LiveProposalGoldenCaseValidationResult> = {}
): LiveProposalGoldenCaseValidationResult {
  return {
    status: "warning",
    summary: {
      caseId: "golden-warning",
      status: "warning",
      title: "Golden warning",
      intent: "documentation_update",
      difficulty: "standard",
      mode: "offline_only",
      workspaceRefCount: 1,
      contextRefCount: 1,
      evidenceRefCount: 1,
      allowedPathCount: 1,
      expectedStatus: "warning",
      expectedFailureCategories: ["missing_evidence"],
      expectedMetricSummary: {
        metricCount: 1,
        metricIds: ["schema_validity"],
        summaryOnly: true
      },
      warningCodes: ["MISSING_EVIDENCE"],
      hash: "golden-warning-hash"
    },
    findings: [],
    blockerCount: 0,
    warningCount: 1,
    findingCount: 1,
    normalizedHash: "golden-normalized-hash",
    readiness: {
      canEnterOfflineEvaluation: true,
      canEnterLiveEvaluation: false,
      canCallLiveModel: false,
      canReadApiKey: false,
      canFetchNetwork: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: "summary only",
    source: "runtime_live_proposal_golden_case_schema",
    ...overrides
  };
}

function expectNoExecution(report: LiveProposalFailureMetricsReport): void {
  expect(report.readiness).toMatchObject({
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
  });
}

describe("live proposal failure metrics", () => {
  it("returns empty with blockers safely without reports", () => {
    const report = buildLiveProposalFailureMetrics();

    expect(report.status).toBe("empty");
    expect(report.blockerCount).toBeGreaterThan(0);
    expect(report.caseCount).toBe(0);
    expectNoExecution(report);
  });

  it("aggregates offline report metrics", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      includeUsageSummary: true
    });

    expect(report.status).toBe("warning");
    expect(report.reportCount).toBe(1);
    expect(report.caseCount).toBe(3);
    expect(report.offlineCaseCount).toBe(3);
    expect(report.taxonomyMetrics.unsafePathBlockedCount).toBe(1);
    expect(report.repairMetrics.repairAttemptCount).toBe(2);
    expect(report.repairMetrics.repairSuccessCount).toBe(1);
    expect(report.schemaMetrics.schemaPassRate).toBe(0.6667);
    expect(report.usageMetrics?.totalPromptTokens).toBe(10);
  });

  it("aggregates live report metrics", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [liveReport()]
    });

    expect(report.caseCount).toBe(2);
    expect(report.liveCaseCount).toBe(2);
    expect(report.expectationMetrics.failedExpectationCount).toBe(1);
    expect(report.taxonomyMetrics.secretMarkerBlockedCount).toBe(1);
    expect(report.taxonomyMetrics.malformedJsonCount).toBe(1);
    expect(report.usageMetrics?.totalTokens).toBe(64);
  });

  it("aggregates combined offline, live, and golden summaries", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      goldenCaseValidationResults: [goldenResult()]
    });
    const summary = summarizeLiveProposalFailureMetrics(report);

    expect(report.reportCount).toBe(3);
    expect(report.caseCount).toBe(6);
    expect(report.taxonomyMetrics.missingEvidenceCount).toBe(1);
    expect(summary.caseCount).toBe(6);
    expect(summary.source).toBe(
      "runtime_live_proposal_failure_metrics_summary"
    );
  });

  it("computes taxonomy counts correctly", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()]
    });

    expect(report.taxonomyMetrics.categories.unsafe_path).toBe(1);
    expect(report.taxonomyMetrics.categories.secret_marker).toBe(1);
    expect(report.taxonomyMetrics.categories.missing_test_plan).toBe(1);
    expect(report.taxonomyMetrics.totalFailureCategoryCount).toBe(4);
  });

  it("computes repair and schema rates", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()]
    });

    expect(report.repairMetrics.repairAttemptCount).toBe(4);
    expect(report.repairMetrics.repairSuccessCount).toBe(2);
    expect(report.repairMetrics.repairSuccessRate).toBe(0.5);
    expect(report.schemaMetrics.schemaEvaluatedCaseCount).toBe(5);
    expect(report.schemaMetrics.schemaPassedCount).toBe(3);
    expect(report.schemaMetrics.schemaPassRate).toBe(0.6);
  });

  it("warns on failed expectations and low rates", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [liveReport()]
    });
    const codes = report.findings.map((finding) => finding.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "FAILED_EXPECTATIONS_PRESENT",
        "LOW_REPAIR_SUCCESS_RATE",
        "LOW_SCHEMA_PASS_RATE"
      ])
    );
  });

  it("blocks raw prompt fields", () => {
    const findings = validateLiveProposalFailureMetricsInput({
      offlineEvaluationReports: [
        {
          ...offlineReport(),
          rawPrompt: "blocked"
        } as unknown as LiveProposalOfflineEvaluationReport
      ]
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "RAWPROMPT_FIELD_REJECTED"
    );
  });

  it("blocks raw response fields", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [
        {
          ...liveReport(),
          rawResponse: "blocked"
        } as unknown as LiveProposalEvaluationReport
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "RAWRESPONSE_FIELD_REJECTED"
    );
  });

  it("blocks reasoning_content fields", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [
        {
          ...liveReport(),
          reasoning_content: "blocked"
        } as unknown as LiveProposalEvaluationReport
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "REASONING_CONTENT_FIELD_REJECTED"
    );
  });

  it("blocks API key markers", () => {
    const fakeSecret = "sk-test1234567890abcdef";
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [
        {
          ...offlineReport(),
          nextAction: fakeSecret
        }
      ]
    });
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "API_KEY_MARKER"
    );
    expect(serialized).not.toContain(fakeSecret);
  });

  it("blocks unknown taxonomy categories", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [
        {
          ...offlineReport({
            taxonomySummary: {
              categories: {
                ...emptyCategories(),
                made_up_category: 1
              } as Record<LiveProposalGoldenCaseFailureCategory, number>,
              totalFailureCategoryCount: 1,
              dominantCategories: ["unsafe_path"]
            }
          })
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "UNKNOWN_TAXONOMY"
    );
  });

  it("allows numeric usage summary", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [liveReport()]
    });

    expect(report.usageMetrics).toMatchObject({
      totalPromptTokens: 40,
      totalCompletionTokens: 24,
      totalTokens: 64
    });
  });

  it("blocks usage raw text", () => {
    const report = buildLiveProposalFailureMetrics({
      liveEvaluationReports: [
        {
          ...liveReport(),
          usageSummary: {
            rawResponse: "blocked"
          } as unknown as LiveProposalEvaluationReport["usageSummary"]
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "RAWRESPONSE_FIELD_REJECTED"
    );
  });

  it("blocks duplicate report ids with conflicting hashes", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [
        offlineReport({ reportId: "duplicate", reportHash: "hash-a" }),
        offlineReport({ reportId: "duplicate", reportHash: "hash-b" })
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "DUPLICATE_REPORT_ID_CONFLICT"
    );
  });

  it("contains no raw prompt, response, reasoning, or API key in output", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()]
    });
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("raw prompt");
    expect(serialized).not.toContain("raw response");
    expect(serialized).not.toContain("reasoning secret");
    expect(serialized).not.toContain("sk-test");
  });

  it("keeps all execution readiness flags false", () => {
    const report = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()]
    });

    expectNoExecution(report);
    expect(report.readiness.canEnterAppEvaluationSummary).toBe(true);
  });

  it("keeps deterministic metricsId and hash with injected id and clock", () => {
    const first = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "failure-metrics-id"
    });
    const second = buildLiveProposalFailureMetrics({
      offlineEvaluationReports: [offlineReport()],
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "failure-metrics-id"
    });

    expect(first.metricsId).toBe("failure-metrics-id");
    expect(first.metricsHash).toBe(second.metricsHash);
  });
});
