import {
  buildLiveProposalTelemetryRedactionAudit,
  summarizeLiveProposalTelemetryRedactionAudit,
  type LiveProposalTelemetryRedactionAudit,
  type LiveProposalTelemetryRedactionAuditStatus
} from "../../runtime/src/models/index.js";
import type { LiveProposalOptInGateView } from "./live-proposal-opt-in-gate-view.js";
import type { LiveProposalPreviewGateView } from "./live-proposal-preview-gate-view.js";
import type { LiveProposalRequestBuilderView } from "./live-proposal-request-builder-view.js";
import type { LiveProposalValidationIntegrationView } from "./live-proposal-validation-integration-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalTelemetryAuditView = {
  status: LiveProposalTelemetryRedactionAuditStatus;
  source: "runtime_live_proposal_telemetry_redaction_audit";
  auditId: string;
  telemetryMode: "disabled" | "summary_only_audit";
  recordCount: number;
  blockedRecordCount: number;
  warningRecordCount: number;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  apiKeyLeakDetected: boolean;
  rawPromptDetected: boolean;
  rawResponseDetected: boolean;
  reasoningContentPersisted: boolean;
  usageSummary?: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    totalTokens?: number | undefined;
    requestCount?: number | undefined;
    responseCount?: number | undefined;
  };
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  auditHashPrefix: string;
  readiness: LiveProposalTelemetryRedactionAudit["readiness"];
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  records: Array<{
    kind: string;
    status: "passed" | "warning" | "blocked" | "missing";
    summary: string;
    warningCodes: string[];
  }>;
  nextAction: string;
  summary: ReturnType<typeof summarizeLiveProposalTelemetryRedactionAudit>;
};

export type LiveProposalTelemetryAuditInput = {
  liveProposalApiKeyPolicyView?: LiveProposalOptInGateView | undefined;
  liveProposalRequestBuilderView?: LiveProposalRequestBuilderView | undefined;
  liveProposalValidationIntegrationView?:
    | LiveProposalValidationIntegrationView
    | undefined;
  liveProposalPreviewGateView?: LiveProposalPreviewGateView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildLiveProposalTelemetryAuditView(
  input: LiveProposalTelemetryAuditInput = {}
): LiveProposalTelemetryAuditView {
  const audit = buildLiveProposalTelemetryRedactionAudit({
    telemetryMode: "summary_only_audit",
    apiKeyPolicy: input.liveProposalApiKeyPolicyView,
    requestBuildResult: input.liveProposalRequestBuilderView,
    validationIntegration: input.liveProposalValidationIntegrationView,
    appPreviewGate: safeGateSummary(input.liveProposalPreviewGateView),
    usageSummary: usageSummaryFrom(input.liveProposalValidationIntegrationView),
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });

  return {
    status: audit.status,
    source: audit.source,
    auditId: audit.auditId,
    telemetryMode: audit.telemetryMode,
    recordCount: audit.recordCount,
    blockedRecordCount: audit.blockedRecordCount,
    warningRecordCount: audit.warningRecordCount,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    apiKeyLeakDetected: audit.apiKeyLeakDetected,
    rawPromptDetected: audit.rawPromptDetected,
    rawResponseDetected: audit.rawResponseDetected,
    reasoningContentPersisted: audit.reasoningContentPersisted,
    ...(audit.usageSummary !== undefined
      ? { usageSummary: audit.usageSummary }
      : {}),
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    findingCount: audit.findingCount,
    auditHash: audit.auditHash,
    auditHashPrefix: audit.auditHash.slice(0, 12),
    readiness: audit.readiness,
    findings: audit.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_TELEMETRY_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    records: audit.records.map((record) => ({
      kind: safeText(record.kind, "unknown_record"),
      status: record.status,
      summary: safeErrorMessage(record.summary),
      warningCodes: record.warningCodes.map((code) =>
        safeText(code, "UNKNOWN_TELEMETRY_WARNING")
      )
    })),
    nextAction: audit.nextAction,
    summary: summarizeLiveProposalTelemetryRedactionAudit(audit)
  };
}

export function summarizeLiveProposalTelemetryAuditView(
  view: LiveProposalTelemetryAuditView
): LiveProposalTelemetryAuditView["summary"] & {
  auditHashPrefix: string;
} {
  return {
    ...view.summary,
    auditHashPrefix: view.auditHashPrefix
  };
}

function safeGateSummary(
  view: LiveProposalPreviewGateView | undefined
): Record<string, unknown> | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    status: view.status,
    gateId: view.gateId,
    stageCount: view.stageCount,
    satisfiedStageCount: view.satisfiedStageCount,
    warningStageCount: view.warningStageCount,
    blockedStageCount: view.blockedStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    findingCount: view.findingCount,
    gateHash: view.gateHash,
    readiness: { ...view.readiness },
    source: view.source
  };
}

function usageSummaryFrom(
  view: LiveProposalValidationIntegrationView | undefined
): Record<string, number> | undefined {
  if (view?.usageSummary === undefined) {
    return undefined;
  }
  const result: Record<string, number> = {};
  if (typeof view.usageSummary.inputTokens === "number") {
    result.inputTokens = view.usageSummary.inputTokens;
  }
  if (typeof view.usageSummary.outputTokens === "number") {
    result.outputTokens = view.usageSummary.outputTokens;
  }
  if (typeof view.usageSummary.totalTokens === "number") {
    result.totalTokens = view.usageSummary.totalTokens;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
