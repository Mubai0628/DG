import { describe, expect, it } from "vitest";

import {
  buildLiveProposalEvaluationTelemetryAudit,
  summarizeLiveProposalEvaluationTelemetryAudit,
  validateLiveProposalEvaluationTelemetryAuditInput,
  type LiveProposalEvaluationReport,
  type LiveProposalFailureMetricsReport,
  type LiveProposalGoldenCaseFailureCategory,
  type LiveProposalGoldenCaseValidationResult,
  type LiveProposalOfflineEvaluationReport
} from "../src/index.js";

function categories(): Record<LiveProposalGoldenCaseFailureCategory, number> {
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
  return {
    status: "evaluation_ready",
    reportId: "offline-report-1",
    evaluatorMode: "offline_fake",
    caseCount: 1,
    passedCount: 1,
    warningCount: 0,
    blockedCount: 0,
    failedExpectationCount: 0,
    schemaPassRate: 1,
    repairAttemptCount: 1,
    repairSuccessRate: 1,
    unsafePathBlockedCount: 0,
    forbiddenFieldBlockedCount: 0,
    secretMarkerBlockedCount: 0,
    rawLeakBlockedCount: 0,
    evidenceCoverageWarnings: 0,
    testPlanWarnings: 0,
    highRiskOperationWarnings: 0,
    usageSummaryCaseCount: 1,
    taxonomySummary: {
      categories: categories(),
      totalFailureCategoryCount: 0,
      dominantCategories: []
    },
    metrics: [],
    cases: [
      {
        status: "passed",
        caseId: "case-1",
        title: "Safe docs case",
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
        caseHash: "case-hash-1",
        nextAction: "summary only",
        source: "runtime_live_proposal_offline_evaluation_case"
      }
    ],
    findings: [],
    blockerCount: 0,
    findingCount: 0,
    reportHash: "offline-hash-1",
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
  return {
    status: "evaluation_ready",
    reportId: "live-report-1",
    evaluationMode: "explicit_live_eval",
    caseCount: 1,
    passedCount: 1,
    warningCount: 0,
    blockedCount: 0,
    failedExpectationCount: 0,
    liveCallCaseCount: 1,
    usedLiveNetwork: false,
    schemaPassRate: 1,
    repairSuccessRate: 1,
    taxonomySummary: {
      categories: categories(),
      totalFailureCategoryCount: 0,
      dominantCategories: []
    },
    usageSummary: {
      inputTokens: 20,
      outputTokens: 10,
      totalTokens: 30,
      requestCount: 1,
      responseCount: 1
    },
    metrics: [],
    caseResults: [
      {
        status: "passed",
        caseId: "live-case-1",
        title: "Safe live case",
        evaluationMode: "explicit_live_eval",
        expectedStatus: "pass",
        actualStatus: "pass",
        matchedExpectation: true,
        liveAdapterStatus: "generated",
        validationIntegrationStatus: "integration_ready",
        telemetryAuditStatus: "audit_ready",
        blockerCount: 0,
        warningCount: 0,
        failureCategories: ["no_failure_expected"],
        schemaPassed: true,
        repairSucceeded: true,
        unsafeBlocked: false,
        usageSummary: {
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
          requestCount: 1,
          responseCount: 1
        },
        droppedReasoningContent: false,
        usedLiveNetwork: false,
        caseHash: "live-case-hash-1",
        findings: [],
        nextAction: "summary only",
        source: "runtime_live_proposal_evaluation_case"
      }
    ],
    findings: [],
    blockerCount: 0,
    findingCount: 0,
    reportHash: "live-hash-1",
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

function failureMetrics(
  overrides: Partial<LiveProposalFailureMetricsReport> = {}
): LiveProposalFailureMetricsReport {
  return {
    status: "metrics_ready",
    metricsId: "metrics-1",
    reportCount: 2,
    caseCount: 2,
    offlineCaseCount: 1,
    liveCaseCount: 1,
    taxonomyMetrics: {
      categories: categories(),
      filteredCategories: Object.keys(categories()) as LiveProposalGoldenCaseFailureCategory[],
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
    },
    repairMetrics: {
      repairAttemptCount: 2,
      repairSuccessCount: 2,
      repairFailureCount: 0,
      repairSuccessRate: 1
    },
    schemaMetrics: {
      schemaEvaluatedCaseCount: 2,
      schemaPassedCount: 2,
      schemaBlockedCount: 0,
      schemaWarningCount: 0,
      schemaPassRate: 1
    },
    expectationMetrics: {
      passedCount: 2,
      warningCount: 0,
      blockedCount: 0,
      failedExpectationCount: 0,
      matchedExpectationCount: 2
    },
    usageMetrics: {
      usageSummaryCaseCount: 2,
      requestCount: 2,
      responseCount: 2,
      totalPromptTokens: 30,
      totalCompletionTokens: 15,
      totalTokens: 45
    },
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    metricsHash: "metrics-hash-1",
    readiness: {
      canEnterAppEvaluationSummary: true,
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
    },
    nextAction: "summary only",
    source: "runtime_live_proposal_failure_metrics",
    ...overrides
  };
}

function goldenResult(
  overrides: Partial<LiveProposalGoldenCaseValidationResult> = {}
): LiveProposalGoldenCaseValidationResult {
  return {
    status: "parsed",
    summary: {
      caseId: "golden-1",
      status: "parsed",
      title: "Golden summary",
      intent: "docs_change",
      difficulty: "smoke",
      mode: "offline_only",
      workspaceRefCount: 1,
      contextRefCount: 0,
      evidenceRefCount: 1,
      allowedPathCount: 1,
      expectedStatus: "pass",
      expectedFailureCategories: ["no_failure_expected"],
      expectedMetricSummary: {
        metricCount: 0,
        metricIds: [],
        summaryOnly: true
      },
      warningCodes: [],
      hash: "golden-hash-1"
    },
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    normalizedHash: "golden-normalized-hash-1",
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

function appSummary(): Record<string, unknown> {
  return {
    status: "summary_ready",
    source: "app_live_proposal_evaluation_summary",
    summaryId: "app-summary-1",
    reportCount: 2,
    caseCount: 2,
    hashPrefix: "app-summary-hash-1",
    readiness: {
      canDisplaySummary: true,
      canRunEvaluation: false,
      canCallLiveModel: false,
      canReadApiKey: false,
      canFetchNetwork: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    }
  };
}

function expectNoExecution(
  report: ReturnType<typeof buildLiveProposalEvaluationTelemetryAudit>
): void {
  expect(report.readiness).toMatchObject({
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
  });
}

describe("live proposal evaluation telemetry audit", () => {
  it("returns empty safely without artifacts", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit"
    });

    expect(report.status).toBe("empty");
    expect(report.recordCount).toBe(0);
    expect(report.rawPromptDetected).toBe(false);
    expectNoExecution(report);
  });

  it("produces audit_ready for complete safe summaries", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()],
      appEvaluationSummaryViews: [appSummary()],
      goldenCaseValidationResults: [goldenResult()],
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "audit-fixed"
    });
    const summary = summarizeLiveProposalEvaluationTelemetryAudit(report);

    expect(report.status).toBe("audit_ready");
    expect(report.auditId).toBe("audit-fixed");
    expect(report.offlineReportCount).toBe(1);
    expect(report.liveReportCount).toBe(1);
    expect(report.metricsReportCount).toBe(1);
    expect(report.appSummaryCount).toBe(1);
    expect(report.records.map((record) => record.kind)).toEqual(
      expect.arrayContaining([
        "offline_evaluation_summary",
        "live_evaluation_summary",
        "failure_metrics_summary",
        "golden_case_validation_summary",
        "app_evaluation_summary",
        "usage_summary",
        "redaction_summary",
        "raw_leak_scan_summary",
        "readiness_summary"
      ])
    );
    expect(report.usageSummary?.totalTokens).toBe(120);
    expect(report.apiKeyLeakDetected).toBe(false);
    expect(report.rawPromptDetected).toBe(false);
    expect(report.rawResponseDetected).toBe(false);
    expect(report.reasoningContentPersisted).toBe(false);
    expect(summary.source).toBe(
      "runtime_live_proposal_evaluation_telemetry_audit_summary"
    );
    expectNoExecution(report);
  });

  it("warns when live summary records injected network usage", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport({ usedLiveNetwork: true })],
      failureMetricsReports: [failureMetrics()]
    });

    expect(report.status).toBe("warning");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "LIVE_REPORT_USED_NETWORK"
    );
  });

  it("records failure metrics summaries", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });

    expect(
      report.records.some(
        (record) =>
          record.kind === "failure_metrics_summary" &&
          record.reportId === "metrics-1"
      )
    ).toBe(true);
  });

  it("blocks raw prompt fields", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [
        {
          ...offlineReport(),
          rawPrompt: "blocked"
        } as unknown as LiveProposalOfflineEvaluationReport
      ],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "RAWPROMPT_FIELD_REJECTED"
    );
  });

  it("blocks raw response and reasoning_content fields", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [
        {
          ...liveReport(),
          rawResponse: "blocked",
          reasoning_content: "blocked"
        } as unknown as LiveProposalEvaluationReport
      ],
      failureMetricsReports: [failureMetrics()]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "RAWRESPONSE_FIELD_REJECTED",
        "REASONING_CONTENT_FIELD_REJECTED"
      ])
    );
  });

  it("blocks API key markers and usage raw text", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [
        {
          ...failureMetrics(),
          usageMetrics: {
            totalTokens: "raw text"
          }
        } as unknown as LiveProposalFailureMetricsReport
      ],
      appEvaluationSummaryViews: [
        {
          ...appSummary(),
          safeLabel: "Bearer fake-token-12345678"
        }
      ]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "BEARER_TOKEN_MARKER",
        "USAGE_SUMMARY_RAW_TEXT_REJECTED"
      ])
    );
  });

  it("blocks unknown source and unknown telemetry record kind", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [
        {
          ...offlineReport(),
          source: "unknown_source",
          records: [{ kind: "unknown_record" }]
        } as unknown as LiveProposalOfflineEvaluationReport
      ],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_SUMMARY_SOURCE",
        "UNKNOWN_TELEMETRY_RECORD_KIND"
      ])
    );
  });

  it("blocks duplicate report ids with conflicting hashes", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [
        offlineReport(),
        offlineReport({ reportHash: "different-hash" })
      ],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((finding) => finding.code)).toContain(
      "DUPLICATE_REPORT_ID_CONFLICT"
    );
  });

  it("contains no raw prompt, response, reasoning, or API key output", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("model prompt text");
    expect(serialized).not.toContain("model response text");
    expect(serialized).not.toContain("reasoning body");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("Authorization:");
  });

  it("keeps all execution readiness flags false", () => {
    const report = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()]
    });

    expectNoExecution(report);
  });

  it("builds deterministic hashes with injected id and clock", () => {
    const first = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()],
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "fixed-audit"
    });
    const second = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      offlineEvaluationReports: [offlineReport()],
      liveEvaluationReports: [liveReport()],
      failureMetricsReports: [failureMetrics()],
      createdAt: "2026-06-29T00:00:00.000Z",
      idGenerator: () => "fixed-audit"
    });

    expect(first.auditId).toBe("fixed-audit");
    expect(first.auditHash).toBe(second.auditHash);
  });

  it("validates raw marker findings without executing runners", () => {
    const findings = validateLiveProposalEvaluationTelemetryAuditInput({
      auditMode: "summary_only_audit",
      appEvaluationSummaryViews: [
        {
          source: "app_live_proposal_evaluation_summary",
          summaryId: "summary-raw-marker",
          safeText: "raw response"
        }
      ]
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "RAW_RESPONSE_MARKER"
    );
  });
});
