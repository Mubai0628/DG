import {
  buildDesktopActionCapabilityPlanning,
  classifyDesktopActionRisk,
  simulateDesktopActionProposal,
  validateDesktopActionProposal,
  validateDesktopActionTargets,
  type DesktopActionCapabilityPlanningResult,
  type DesktopActionProposalValidationResult,
  type DesktopActionRiskClassification,
  type DesktopActionSimulationResult,
  type DesktopTargetMetadataValidationResult
} from "../../runtime/src/desktop-action/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type DesktopActionProposalViewStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked";

export type DesktopActionProposalViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type DesktopActionProposalViewReadiness = {
  canDisplayReadOnlyPreview: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type DesktopActionProposalView = {
  status: DesktopActionProposalViewStatus;
  source: "app_desktop_action_proposal_surface";
  viewId: string;
  proposalId?: string | undefined;
  actionCount: number;
  targetSummary: string;
  riskSummary: string;
  simulationSummary: string;
  capabilitySummary: string;
  proposalHash?: string | undefined;
  validationHash?: string | undefined;
  riskHash?: string | undefined;
  simulationHash?: string | undefined;
  capabilityHash?: string | undefined;
  contextAssemblyRef?: string | undefined;
  agentDossierEvidenceRef?: string | undefined;
  auditSurfaceSummary: {
    blockerCount: number;
    warningCount: number;
    findingCount: number;
  };
  proposalValidation?: DesktopActionProposalValidationResult["summary"];
  targetValidation?: DesktopTargetMetadataValidationResult["summary"];
  riskClassification?: DesktopActionRiskClassification["summary"];
  simulation?: DesktopActionSimulationResult["summary"];
  capabilityPlanning?: DesktopActionCapabilityPlanningResult["summary"];
  findings: DesktopActionProposalViewFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionProposalViewReadiness;
  nextAction: string;
};

export type DesktopActionProposalViewInput = {
  proposalJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildDesktopActionProposalView(
  input: DesktopActionProposalViewInput = {}
): DesktopActionProposalView {
  const draft = input.proposalJsonText ?? "";
  if (draft.trim().length === 0) {
    return emptyView(input);
  }

  const proposalValidation = validateDesktopActionProposal(draft);
  const proposal = proposalValidation.proposal;
  const targetValidation =
    proposal === undefined
      ? undefined
      : validateDesktopActionTargets({
          proposal,
          observerSummary: observerSummaryFromProposal(proposalValidation),
          currentMetadataSummary: currentMetadataFromProposal(
            proposalValidation
          ),
          staleThresholdMs: 60 * 60 * 1000,
          createdAt: input.createdAt ?? proposal.createdAt
        });
  const riskClassification =
    proposal === undefined
      ? undefined
      : classifyDesktopActionRisk({
          proposal,
          targetValidation,
          createdAt: input.createdAt
        });
  const simulation =
    proposal === undefined
      ? undefined
      : simulateDesktopActionProposal({
          proposal,
          targetValidation,
          riskClassification,
          createdAt: input.createdAt
        });
  const capabilityPlanning =
    proposal === undefined
      ? undefined
      : buildDesktopActionCapabilityPlanning({
          proposal,
          targetValidation,
          riskClassification,
          simulation,
          createdAt: input.createdAt
        });

  const findings = [
    ...proposalValidation.findings,
    ...(targetValidation?.findings || []),
    ...(riskClassification?.findings || []),
    ...(simulation?.findings || []),
    ...(capabilityPlanning?.findings || [])
  ].map((finding) => ({
    code: safeCode(finding.code),
    severity: finding.severity,
    safeMessage: safeErrorMessage(finding.safeMessage)
  }));
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: DesktopActionProposalViewStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "preview_ready";
  const proposalHash = proposal?.proposalHash;
  const viewHash =
    capabilityPlanning?.planningHash ||
    simulation?.simulationHash ||
    riskClassification?.classificationHash ||
    targetValidation?.validationHash ||
    proposalHash ||
    "empty";
  const targetSummary =
    proposal === undefined
      ? "n/a"
      : proposal.operations
          .map((operation) =>
            safeText(
              `${operation.actionKind}:${operation.targetRef.targetId}`,
              "target"
            )
          )
          .join(", ");

  return {
    status,
    source: "app_desktop_action_proposal_surface",
    viewId: input.idGenerator?.() || `desktop-action-proposal-${viewHash.slice(0, 12)}`,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    actionCount: proposal?.operations.length ?? 0,
    targetSummary,
    riskSummary:
      riskClassification === undefined
        ? "n/a"
        : `${riskClassification.riskLevel} / score ${riskClassification.riskScore}`,
    simulationSummary: simulation?.summary.predictedStateSummary ?? "n/a",
    capabilitySummary:
      capabilityPlanning === undefined
        ? "n/a"
        : `${capabilityPlanning.summary.descriptorCount} descriptors / execute ${capabilityPlanning.summary.executionDescriptorMode}`,
    ...(proposalHash ? { proposalHash } : {}),
    ...(targetValidation?.validationHash
      ? { validationHash: targetValidation.validationHash }
      : {}),
    ...(riskClassification?.classificationHash
      ? { riskHash: riskClassification.classificationHash }
      : {}),
    ...(simulation?.simulationHash
      ? { simulationHash: simulation.simulationHash }
      : {}),
    ...(capabilityPlanning?.planningHash
      ? { capabilityHash: capabilityPlanning.planningHash }
      : {}),
    ...(proposal?.proposalId
      ? {
          contextAssemblyRef: `desktop_action_proposal:${proposal.proposalId}:no_compress_zone`,
          agentDossierEvidenceRef: `desktop_action_proposal:${proposal.proposalId}:summary_only`
        }
      : {}),
    auditSurfaceSummary: {
      blockerCount,
      warningCount,
      findingCount: findings.length
    },
    proposalValidation: proposalValidation.summary,
    ...(targetValidation ? { targetValidation: targetValidation.summary } : {}),
    ...(riskClassification
      ? { riskClassification: riskClassification.summary }
      : {}),
    ...(simulation ? { simulation: simulation.summary } : {}),
    ...(capabilityPlanning
      ? { capabilityPlanning: capabilityPlanning.summary }
      : {}),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked"),
    nextAction: nextActionFor(status)
  };
}

function emptyView(
  input: DesktopActionProposalViewInput
): DesktopActionProposalView {
  return {
    status: "empty",
    source: "app_desktop_action_proposal_surface",
    viewId: input.idGenerator?.() || "desktop-action-proposal-empty",
    actionCount: 0,
    targetSummary: "n/a",
    riskSummary: "n/a",
    simulationSummary: "n/a",
    capabilitySummary: "n/a",
    auditSurfaceSummary: {
      blockerCount: 0,
      warningCount: 0,
      findingCount: 0
    },
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    readiness: readiness(false),
    nextAction: "Paste a summary-only desktop_action_proposal JSON draft."
  };
}

function observerSummaryFromProposal(
  result: DesktopActionProposalValidationResult
) {
  const proposal = result.proposal;
  return {
    status: "observed",
    observationId: proposal?.observerEvidenceRefs[0]?.observationId,
    observedAt: proposal?.observerEvidenceRefs[0]?.observedAt,
    evidenceRefs:
      proposal?.observerEvidenceRefs.map((evidence) => ({
        evidenceRefId: evidence.evidenceRefId,
        observationId: evidence.observationId,
        observedAt: evidence.observedAt,
        warningCodes: evidence.warningCodes
      })) || [],
    windows:
      proposal?.operations.map((operation) => ({
        windowIdHash:
          operation.targetRef.windowIdHash ||
          `window:${operation.targetRef.targetId}`,
        appIdHash: operation.targetRef.appIdHash,
        displayIdHash: operation.targetRef.displayIdHash,
        boundsSummary: operation.targetRef.boundsSummary,
        titleSummary: operation.targetRef.labelSummary,
        targetIds: [operation.targetRef.targetId]
      })) || [],
    displays:
      unique(
        proposal?.operations
          .map((operation) => operation.targetRef.displayIdHash)
          .filter((item): item is string => Boolean(item)) || []
      ).map((displayIdHash) => ({
        displayIdHash,
        sizeSummary: "8192x8192",
        primary: true
      }))
  };
}

function currentMetadataFromProposal(
  result: DesktopActionProposalValidationResult
) {
  const proposal = result.proposal;
  return {
    observedAt: proposal?.createdAt,
    targets:
      proposal?.operations.map((operation) => ({
        targetId: operation.targetRef.targetId,
        windowIdHash: operation.targetRef.windowIdHash,
        appIdHash: operation.targetRef.appIdHash,
        displayIdHash: operation.targetRef.displayIdHash,
        boundsSummary: operation.targetRef.boundsSummary,
        labelSummary: operation.targetRef.labelSummary,
        confidence: 0.9,
        candidateCount: 1
      })) || [],
    displays:
      unique(
        proposal?.operations
          .map((operation) => operation.targetRef.displayIdHash)
          .filter((item): item is string => Boolean(item)) || []
      ).map((displayIdHash) => ({
        displayIdHash,
        sizeSummary: "8192x8192",
        primary: true
      }))
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function readiness(
  canDisplayReadOnlyPreview: boolean
): DesktopActionProposalViewReadiness {
  return {
    canDisplayReadOnlyPreview,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canUseClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function nextActionFor(status: DesktopActionProposalViewStatus): string {
  if (status === "empty") {
    return "Paste a summary-only desktop_action_proposal JSON draft.";
  }
  if (status === "blocked") {
    return "Fix blocked desktop action proposal fields before preview.";
  }
  if (status === "warning") {
    return "Review warnings. Desktop action execution remains disabled.";
  }
  return "Review read-only desktop action proposal preview. Execution remains disabled.";
}

function safeCode(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 96);
}
