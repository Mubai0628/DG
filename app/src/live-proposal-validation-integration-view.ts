import {
  buildLiveProposalValidationIntegration,
  summarizeLiveProposalValidationIntegration,
  type LiveProposalValidationIntegration,
  type LiveProposalValidationIntegrationStatus
} from "../../runtime/src/models/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type LiveProposalValidationIntegrationView = {
  status: LiveProposalValidationIntegrationStatus;
  source: "runtime_live_proposal_validation_integration";
  integrationId: string;
  gateCount: number;
  passedGateCount: number;
  warningGateCount: number;
  blockedGateCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  droppedReasoningContent: boolean;
  usageSummary?: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    totalTokens?: number | undefined;
  };
  readiness: LiveProposalValidationIntegration["readiness"];
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  nextAction: string;
  summary: ReturnType<typeof summarizeLiveProposalValidationIntegration>;
};

export function buildLiveProposalValidationIntegrationView(): LiveProposalValidationIntegrationView {
  const integration = buildLiveProposalValidationIntegration();
  return {
    status: integration.status,
    source: integration.source,
    integrationId: integration.integrationId,
    gateCount: integration.gates.length,
    passedGateCount: integration.gates.filter(
      (gate) => gate.status === "passed"
    ).length,
    warningGateCount: integration.gates.filter(
      (gate) => gate.status === "warning"
    ).length,
    blockedGateCount: integration.gates.filter(
      (gate) => gate.status === "blocked"
    ).length,
    blockerCount: integration.blockerCount,
    warningCount: integration.warningCount,
    findingCount: integration.findingCount,
    droppedReasoningContent: integration.droppedReasoningContent,
    ...(integration.usageSummary !== undefined
      ? { usageSummary: integration.usageSummary }
      : {}),
    readiness: integration.readiness,
    findings: integration.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_LIVE_VALIDATION_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    nextAction: integration.nextAction,
    summary: summarizeLiveProposalValidationIntegration(integration)
  };
}

export function summarizeLiveProposalValidationIntegrationView(
  view: LiveProposalValidationIntegrationView
): LiveProposalValidationIntegrationView["summary"] & {
  status: LiveProposalValidationIntegrationStatus;
  gateCount: number;
} {
  return {
    ...view.summary,
    status: view.status,
    gateCount: view.gateCount
  };
}
