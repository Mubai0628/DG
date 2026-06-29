import {
  buildLiveProposalEvaluationTelemetryAudit,
  summarizeLiveProposalEvaluationTelemetryAudit,
  type LiveProposalEvaluationTelemetryAuditInput,
  type LiveProposalEvaluationTelemetryAuditReport,
  type LiveProposalEvaluationTelemetryAuditStatus,
  type LiveProposalEvaluationUsageTelemetrySummary
} from "../../runtime/src/models/index.js";
import type { LiveProposalEvaluationSummaryView } from "./live-proposal-evaluation-summary-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalEvaluationTelemetryAuditView = {
  status: LiveProposalEvaluationTelemetryAuditStatus;
  source:
    | "runtime_live_proposal_evaluation_telemetry_audit"
    | "app_live_proposal_evaluation_telemetry_audit";
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
  redactionSummary: LiveProposalEvaluationTelemetryAuditReport["redactionSummary"];
  records: Array<{
    kind: string;
    source: string;
    status: "passed" | "warning" | "blocked" | "missing";
    summary: string;
    warningCodes: string[];
  }>;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  auditHashPrefix: string;
  readiness: LiveProposalEvaluationTelemetryAuditReport["readiness"];
  nextAction: string;
  summary: ReturnType<typeof summarizeLiveProposalEvaluationTelemetryAudit>;
};

export type LiveProposalEvaluationTelemetryAuditViewInput = {
  auditJsonText?: string | undefined;
  appEvaluationSummaryView?: LiveProposalEvaluationSummaryView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

type JsonParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: "empty" | "malformed" };

export function buildLiveProposalEvaluationTelemetryAuditView(
  input: LiveProposalEvaluationTelemetryAuditViewInput = {}
): LiveProposalEvaluationTelemetryAuditView {
  const parsed = parseSummaryJson(input.auditJsonText ?? "");
  if (!parsed.ok && parsed.reason === "malformed") {
    return viewFromReport(
      buildLiveProposalEvaluationTelemetryAudit({
        auditMode: "summary_only_audit",
        appEvaluationSummaryViews: [
          {
            source: "app_live_proposal_evaluation_summary",
            summaryId: "malformed-evaluation-telemetry-audit",
            malformedSummaryJson: "blocked"
          }
        ],
        createdAt: input.createdAt,
        idGenerator: input.idGenerator
      })
    );
  }

  if (parsed.ok) {
    if (
      safeText(parsed.value.source, "") ===
      "runtime_live_proposal_evaluation_telemetry_audit"
    ) {
      const guard = guardPastedAuditReport(parsed.value, input);
      if (guard !== undefined) {
        return viewFromReport(guard);
      }
      return viewFromReport(coerceAuditReport(parsed.value));
    }
    const guard = buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      appEvaluationSummaryViews: [
        {
          source: "app_live_proposal_evaluation_summary",
          summaryId: "pasted-evaluation-telemetry-audit-guard",
          hashPrefix: "pasted-audit",
          nestedSummary: parsed.value
        }
      ],
      createdAt: input.createdAt
    });
    if (guard.blockerCount > 0) {
      return viewFromReport(guard);
    }
    return viewFromReport(
      buildLiveProposalEvaluationTelemetryAudit({
        ...inputFromSummaryArtifact(parsed.value),
        auditMode: "summary_only_audit",
        createdAt: input.createdAt,
        idGenerator: input.idGenerator
      })
    );
  }

  const appSummary =
    input.appEvaluationSummaryView !== undefined &&
    input.appEvaluationSummaryView.status !== "empty"
      ? [input.appEvaluationSummaryView]
      : undefined;
  return viewFromReport(
    buildLiveProposalEvaluationTelemetryAudit({
      auditMode: "summary_only_audit",
      appEvaluationSummaryViews: appSummary,
      createdAt: input.createdAt,
      idGenerator: input.idGenerator
    })
  );
}

export function summarizeLiveProposalEvaluationTelemetryAuditView(
  view: LiveProposalEvaluationTelemetryAuditView
): LiveProposalEvaluationTelemetryAuditView["summary"] & {
  auditHashPrefix: string;
} {
  return {
    ...view.summary,
    auditHashPrefix: view.auditHashPrefix
  };
}

function parseSummaryJson(text: string): JsonParseResult {
  if (text.trim().length === 0) {
    return { ok: false, reason: "empty" };
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      return { ok: true, value: parsed };
    }
    return { ok: false, reason: "malformed" };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

function inputFromSummaryArtifact(value: Record<string, unknown>): Parameters<
  typeof buildLiveProposalEvaluationTelemetryAudit
>[0] {
  if (Array.isArray(value.offlineEvaluationReports)) {
    return {
      offlineEvaluationReports: value.offlineEvaluationReports as never[],
      liveEvaluationReports: Array.isArray(value.liveEvaluationReports)
        ? (value.liveEvaluationReports as never[])
        : undefined,
      failureMetricsReports: Array.isArray(value.failureMetricsReports)
        ? (value.failureMetricsReports as never[])
        : undefined,
      goldenCaseValidationResults: Array.isArray(
        value.goldenCaseValidationResults
      )
        ? (value.goldenCaseValidationResults as never[])
        : undefined,
      appEvaluationSummaryViews: Array.isArray(value.appEvaluationSummaryViews)
        ? value.appEvaluationSummaryViews
        : undefined
    };
  }
  switch (safeText(value.source, "")) {
    case "runtime_live_proposal_offline_evaluation_runner":
      return { offlineEvaluationReports: [value as never] };
    case "runtime_live_proposal_evaluation_runner":
      return { liveEvaluationReports: [value as never] };
    case "runtime_live_proposal_failure_metrics":
      return { failureMetricsReports: [value as never] };
    case "runtime_live_proposal_golden_case_schema":
      return { goldenCaseValidationResults: [value as never] };
    case "app_live_proposal_evaluation_summary":
      return { appEvaluationSummaryViews: [value] };
    default:
      return { appEvaluationSummaryViews: [value] };
  }
}

function viewFromReport(
  report: LiveProposalEvaluationTelemetryAuditReport
): LiveProposalEvaluationTelemetryAuditView {
  return {
    status: report.status,
    source: report.source,
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
    ...(report.usageSummary !== undefined
      ? { usageSummary: report.usageSummary }
      : {}),
    redactionSummary: report.redactionSummary,
    records: report.records.map((record) => ({
      kind: safeText(record.kind, "unknown_record"),
      source: safeText(record.source, "unknown_source"),
      status: record.status,
      summary: safeErrorMessage(record.summary),
      warningCodes: record.warningCodes.map((code) =>
        safeText(code, "UNKNOWN_EVALUATION_TELEMETRY_WARNING")
      )
    })),
    findings: report.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_EVALUATION_TELEMETRY_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    auditHash: report.auditHash,
    auditHashPrefix: report.auditHash.slice(0, 12),
    readiness: report.readiness,
    nextAction: report.nextAction,
    summary: summarizeLiveProposalEvaluationTelemetryAudit(report)
  };
}

function coerceAuditReport(
  value: Record<string, unknown>
): LiveProposalEvaluationTelemetryAuditReport {
  const redactionSummary: LiveProposalEvaluationTelemetryAuditReport["redactionSummary"] = isRecord(value.redactionSummary)
    ? (value.redactionSummary as LiveProposalEvaluationTelemetryAuditReport["redactionSummary"])
    : {
        redactedFieldCount: 0,
        rawFieldDetectedCount: 0,
        apiKeyLeakDetected: false,
        rawPromptDetected: false,
        rawResponseDetected: false,
        reasoningContentPersisted: false,
        rawSourceDetected: false,
        rawDiffDetected: false,
        outputSummaryOnly: true
      };
  return {
    status: safeAuditStatus(value.status),
    auditId: safeText(value.auditId, "pasted-evaluation-telemetry-audit"),
    auditMode:
      value.auditMode === "summary_only_audit"
        ? "summary_only_audit"
        : "disabled",
    recordCount: numberValue(value.recordCount),
    offlineReportCount: numberValue(value.offlineReportCount),
    liveReportCount: numberValue(value.liveReportCount),
    metricsReportCount: numberValue(value.metricsReportCount),
    appSummaryCount: numberValue(value.appSummaryCount),
    rawFieldDetectedCount: numberValue(value.rawFieldDetectedCount),
    redactedFieldCount: numberValue(value.redactedFieldCount),
    apiKeyLeakDetected: value.apiKeyLeakDetected === true,
    rawPromptDetected: value.rawPromptDetected === true,
    rawResponseDetected: value.rawResponseDetected === true,
    reasoningContentPersisted: value.reasoningContentPersisted === true,
    usageSummary: isRecord(value.usageSummary)
      ? (value.usageSummary as LiveProposalEvaluationUsageTelemetrySummary)
      : undefined,
    redactionSummary,
    records: Array.isArray(value.records)
      ? (value.records as LiveProposalEvaluationTelemetryAuditReport["records"])
      : [],
    findings: Array.isArray(value.findings)
      ? (value.findings as LiveProposalEvaluationTelemetryAuditReport["findings"])
      : [],
    blockerCount: numberValue(value.blockerCount),
    warningCount: numberValue(value.warningCount),
    findingCount: numberValue(value.findingCount),
    auditHash: safeText(value.auditHash, "pasted-audit-hash"),
    readiness: isRecord(value.readiness)
      ? (value.readiness as LiveProposalEvaluationTelemetryAuditReport["readiness"])
      : {
          canEnterRcSummary: false,
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
        },
    nextAction: safeText(
      value.nextAction,
      "Display summary-only audit report without executing telemetry writes."
    ),
    source: "runtime_live_proposal_evaluation_telemetry_audit"
  };
}

function guardPastedAuditReport(
  value: Record<string, unknown>,
  input: LiveProposalEvaluationTelemetryAuditInput
): LiveProposalEvaluationTelemetryAuditReport | undefined {
  const violation = findPastedAuditReportViolation(value);
  if (violation === undefined) {
    return undefined;
  }
  return buildLiveProposalEvaluationTelemetryAudit({
    auditMode: "summary_only_audit",
    appEvaluationSummaryViews: [
      {
        source: "app_live_proposal_evaluation_summary",
        summaryId: "pasted-evaluation-telemetry-audit-guard",
        hashPrefix: "pasted-audit",
        nestedSummary:
          violation.value !== undefined
            ? { safeLabel: violation.value }
            : { [violation.fieldName]: "blocked" }
      }
    ],
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
}

function findPastedAuditReportViolation(
  value: unknown
): { fieldName: string; value?: string } | undefined {
  if (typeof value === "string") {
    if (containsUnsafeTextMarker(value)) {
      return { fieldName: "safeLabel", value };
    }
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const violation = findPastedAuditReportViolation(item);
      if (violation !== undefined) {
        return violation;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const fieldCode = blockedAuditReportFieldName(key);
    if (fieldCode !== undefined) {
      return { fieldName: fieldCode };
    }
    const violation = findPastedAuditReportViolation(nestedValue);
    if (violation !== undefined) {
      return violation;
    }
  }
  return undefined;
}

function blockedAuditReportFieldName(key: string): string | undefined {
  const allowedAuditFieldNames = new Set([
    "rawFieldDetectedCount",
    "rawPromptDetected",
    "rawResponseDetected",
    "rawSourceDetected",
    "rawDiffDetected",
    "reasoningContentPersisted",
    "canPersistRawPrompt",
    "canPersistRawResponse",
    "canPersistReasoningContent"
  ]);
  if (allowedAuditFieldNames.has(key)) {
    return undefined;
  }
  const blockedFieldNames = [
    "raw" + "Prompt",
    "prompt" + "Text",
    "raw" + "Response",
    "response" + "Text",
    "reasoning" + "Content",
    "reasoning_" + "content",
    "api" + "Key",
    "api" + "KeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret"
  ];
  return blockedFieldNames.includes(key) ? key : undefined;
}

function containsUnsafeTextMarker(value: string): boolean {
  return /Bearer\s+/i.test(value) ||
    /Authorization/i.test(value) ||
    /sk-[A-Za-z0-9_-]{8,}/.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
    ? true
    : false;
}

function safeAuditStatus(value: unknown): LiveProposalEvaluationTelemetryAuditStatus {
  return value === "audit_ready" ||
    value === "warning" ||
    value === "blocked" ||
    value === "empty"
    ? value
    : "blocked";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
