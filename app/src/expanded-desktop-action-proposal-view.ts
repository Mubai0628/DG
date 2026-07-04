import {
  classifyDesktopActionExpansionRisk,
  simulateDesktopActionSequence,
  validateDesktopActionExpansionProposal,
  validateDesktopTargetFreshness,
  type DesktopActionExpansionProposalValidationResult,
  type DesktopActionExpansionRiskClassification,
  type DesktopActionSequenceSimulation,
  type DesktopTargetFreshnessReport
} from "../../runtime/src/desktop/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ExpandedDesktopActionProposalViewStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked";

export type ExpandedDesktopActionProposalViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ExpandedDesktopActionProposalViewReadiness = {
  canDisplayReadOnlyPreview: boolean;
  canExecuteClick: false;
  canTypeText: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canExecuteDesktopAction: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type ExpandedDesktopActionProposalView = {
  status: ExpandedDesktopActionProposalViewStatus;
  source: "app_expanded_desktop_action_proposal_surface";
  viewId: string;
  proposalId?: string | undefined;
  actionKind?: string | undefined;
  targetSummary: string;
  freshnessSummary: string;
  riskSummary: string;
  simulationSummary: string;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  proposalHash?: string | undefined;
  freshnessHash?: string | undefined;
  riskHash?: string | undefined;
  simulationHash?: string | undefined;
  contextAssemblyRef?: string | undefined;
  auditSurfaceSummary: {
    blockerCount: number;
    warningCount: number;
    findingCount: number;
  };
  proposalValidation?: DesktopActionExpansionProposalValidationResult["summary"];
  freshness?: Pick<
    DesktopTargetFreshnessReport,
    "status" | "freshnessId" | "warningCodes" | "blockerCodes" | "reportHash"
  >;
  riskClassification?: DesktopActionExpansionRiskClassification["summary"];
  simulation?: Pick<
    DesktopActionSequenceSimulation,
    | "simulationId"
    | "status"
    | "stepCount"
    | "blockedStepCount"
    | "warningStepCount"
    | "simulationHash"
  >;
  findings: ExpandedDesktopActionProposalViewFinding[];
  readiness: ExpandedDesktopActionProposalViewReadiness;
  nextAction: string;
};

export type ExpandedDesktopActionProposalViewInput = {
  proposalJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildExpandedDesktopActionProposalView(
  input: ExpandedDesktopActionProposalViewInput = {}
): ExpandedDesktopActionProposalView {
  const draft = input.proposalJsonText ?? "";
  if (draft.trim().length === 0) {
    return emptyView(input);
  }

  const proposalValidation = validateDesktopActionExpansionProposal(draft);
  const proposal = proposalValidation.proposal;
  const freshness =
    proposal === undefined
      ? undefined
      : validateDesktopTargetFreshness({
          observerEvidenceSummary: {
            evidenceRefId: proposal.observerEvidenceRef.evidenceRefId,
            observedAt: proposal.observerEvidenceRef.observedAt,
            summary: proposal.observerEvidenceRef.summary,
            targetHash: proposal.observerEvidenceRef.targetHash,
            windowIdHash: proposal.observerEvidenceRef.windowIdHash,
            appIdHash: proposal.observerEvidenceRef.appIdHash,
            displayIdHash: proposal.observerEvidenceRef.displayIdHash
          },
          currentMetadataSummary: {
            capturedAt: input.createdAt ?? proposal.createdAt,
            summary:
              "Current metadata mirrors proposal summary for read-only preview.",
            targetHash: proposal.observerEvidenceRef.targetHash,
            windowIdHash: proposal.targetSummary.windowIdHash,
            appIdHash: proposal.targetSummary.appIdHash,
            displayIdHash: proposal.targetSummary.displayIdHash,
            boundsHash: proposal.targetSummary.boundsHash,
            labelSummary: proposal.targetSummary.labelSummary,
            confidence: proposal.targetSummary.confidence,
            windowState: "visible",
            focusState: "focused",
            monitorCount: 1
          },
          actionProposalTargetSummary: {
            targetId: proposal.targetSummary.targetId,
            targetKind: proposal.targetSummary.targetKind,
            labelSummary: proposal.targetSummary.labelSummary,
            confidence: proposal.targetSummary.confidence,
            targetHash: proposal.observerEvidenceRef.targetHash,
            windowIdHash: proposal.targetSummary.windowIdHash,
            appIdHash: proposal.targetSummary.appIdHash,
            displayIdHash: proposal.targetSummary.displayIdHash,
            boundsHash: proposal.targetSummary.boundsHash
          },
          freshnessThresholdMs: 5 * 60 * 1000,
          targetConfidenceThreshold: 0.75
        });
  const riskClassification =
    proposal === undefined
      ? undefined
      : classifyDesktopActionExpansionRisk({
          proposalSummary: {
            proposalId: proposal.proposalId,
            actionKind: proposal.actionKind,
            objectiveSummary: proposal.objectiveSummary,
            targetSummary: {
              targetId: proposal.targetSummary.targetId,
              targetKind: proposal.targetSummary.targetKind,
              labelSummary: proposal.targetSummary.labelSummary,
              appNameSummary: proposal.targetSummary.appNameSummary,
              windowTitleSummary: proposal.targetSummary.windowTitleSummary,
              confidence: proposal.targetSummary.confidence
            },
            expectedEffectSummary: proposal.expectedEffect.summary,
            proposalHash: proposal.proposalHash
          },
          freshnessResult: freshness
            ? {
                status: freshness.status,
                blockerCodes: freshness.blockerCodes,
                warningCodes: freshness.warningCodes
              }
            : undefined
        });
  const simulation =
    proposal === undefined
      ? undefined
      : simulateDesktopActionSequence({
          steps: [
            {
              stepId: "expanded-desktop-action-step-1",
              proposalSummary: {
                proposalId: proposal.proposalId,
                actionKind: proposal.actionKind,
                targetId: proposal.targetSummary.targetId,
                targetKind: proposal.targetSummary.targetKind,
                expectedEffectSummary: proposal.expectedEffect.summary,
                proposalHash: proposal.proposalHash
              },
              freshnessResult: freshness
                ? {
                    status: freshness.status,
                    blockerCodes: freshness.blockerCodes,
                    warningCodes: freshness.warningCodes,
                    targetHash: freshness.targetHash
                  }
                : undefined,
              riskSummary: riskClassification
                ? {
                    riskClass: riskClassification.riskClass,
                    riskFactors: riskClassification.riskFactors,
                    warningCodes: riskClassification.warningCodes,
                    blockerCodes: riskClassification.blockedReasons
                  }
                : undefined,
              preconditionSummary: "Read-only preview preconditions only.",
              postconditionSummary: proposal.expectedEffect.summary
            }
          ],
          sequencePolicy: {
            maxSteps: 5
          }
        });

  const findings = [
    ...proposalValidation.findings,
    ...(freshness?.findings ?? []),
    ...(riskClassification?.findings ?? []),
    ...(simulation?.findings ?? [])
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
  const status: ExpandedDesktopActionProposalViewStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "preview_ready";
  const viewHash =
    simulation?.simulationHash ||
    riskClassification?.classificationHash ||
    freshness?.reportHash ||
    proposal?.proposalHash ||
    "empty";

  return {
    status,
    source: "app_expanded_desktop_action_proposal_surface",
    viewId:
      input.idGenerator?.() ||
      `expanded-desktop-action-${viewHash.slice(0, 12)}`,
    ...(proposal?.proposalId ? { proposalId: proposal.proposalId } : {}),
    ...(proposal?.actionKind ? { actionKind: proposal.actionKind } : {}),
    targetSummary:
      proposal === undefined
        ? "n/a"
        : safeText(
            `${proposal.targetSummary.targetKind}:${proposal.targetSummary.targetId}`,
            "target"
          ),
    freshnessSummary:
      freshness === undefined
        ? "n/a"
        : `${freshness.status} / blockers ${freshness.blockerCount} / warnings ${freshness.warningCount}`,
    riskSummary:
      riskClassification === undefined
        ? "n/a"
        : `${riskClassification.riskClass} / score ${riskClassification.riskScore}`,
    simulationSummary:
      simulation === undefined
        ? "n/a"
        : `${simulation.status} / steps ${simulation.stepCount}`,
    warningCount,
    blockerCount,
    findingCount: findings.length,
    ...(proposal?.proposalHash ? { proposalHash: proposal.proposalHash } : {}),
    ...(freshness?.reportHash ? { freshnessHash: freshness.reportHash } : {}),
    ...(riskClassification?.classificationHash
      ? { riskHash: riskClassification.classificationHash }
      : {}),
    ...(simulation?.simulationHash
      ? { simulationHash: simulation.simulationHash }
      : {}),
    ...(proposal?.proposalId
      ? {
          contextAssemblyRef: `expanded_desktop_action_proposal:${proposal.proposalId}:no_compress_zone`
        }
      : {}),
    auditSurfaceSummary: {
      blockerCount,
      warningCount,
      findingCount: findings.length
    },
    proposalValidation: proposalValidation.summary,
    ...(freshness
      ? {
          freshness: {
            status: freshness.status,
            freshnessId: freshness.freshnessId,
            warningCodes: freshness.warningCodes,
            blockerCodes: freshness.blockerCodes,
            reportHash: freshness.reportHash
          }
        }
      : {}),
    ...(riskClassification
      ? { riskClassification: riskClassification.summary }
      : {}),
    ...(simulation
      ? {
          simulation: {
            simulationId: simulation.simulationId,
            status: simulation.status,
            stepCount: simulation.stepCount,
            blockedStepCount: simulation.blockedStepCount,
            warningStepCount: simulation.warningStepCount,
            simulationHash: simulation.simulationHash
          }
        }
      : {}),
    findings,
    readiness: readiness(status !== "blocked"),
    nextAction: nextActionFor(status)
  };
}

export function summarizeExpandedDesktopActionProposalView(
  view: ExpandedDesktopActionProposalView
): Pick<
  ExpandedDesktopActionProposalView,
  | "status"
  | "viewId"
  | "proposalId"
  | "actionKind"
  | "targetSummary"
  | "freshnessSummary"
  | "riskSummary"
  | "simulationSummary"
  | "warningCount"
  | "blockerCount"
  | "contextAssemblyRef"
  | "auditSurfaceSummary"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: view.status,
    viewId: view.viewId,
    proposalId: view.proposalId,
    actionKind: view.actionKind,
    targetSummary: view.targetSummary,
    freshnessSummary: view.freshnessSummary,
    riskSummary: view.riskSummary,
    simulationSummary: view.simulationSummary,
    warningCount: view.warningCount,
    blockerCount: view.blockerCount,
    contextAssemblyRef: view.contextAssemblyRef,
    auditSurfaceSummary: view.auditSurfaceSummary,
    readiness: view.readiness,
    nextAction: view.nextAction,
    source: view.source
  };
}

function emptyView(
  input: ExpandedDesktopActionProposalViewInput
): ExpandedDesktopActionProposalView {
  return {
    status: "empty",
    source: "app_expanded_desktop_action_proposal_surface",
    viewId: input.idGenerator?.() || "expanded-desktop-action-empty",
    targetSummary: "n/a",
    freshnessSummary: "n/a",
    riskSummary: "n/a",
    simulationSummary: "n/a",
    warningCount: 0,
    blockerCount: 0,
    findingCount: 0,
    auditSurfaceSummary: {
      blockerCount: 0,
      warningCount: 0,
      findingCount: 0
    },
    findings: [],
    readiness: readiness(false),
    nextAction:
      "Paste a summary-only expanded desktop action proposal JSON draft."
  };
}

function readiness(
  canDisplayReadOnlyPreview: boolean
): ExpandedDesktopActionProposalViewReadiness {
  return {
    canDisplayReadOnlyPreview,
    canExecuteClick: false,
    canTypeText: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canExecuteDesktopAction: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function nextActionFor(
  status: ExpandedDesktopActionProposalViewStatus
): string {
  if (status === "empty") {
    return "Paste a summary-only expanded desktop action proposal JSON draft.";
  }
  if (status === "blocked") {
    return "Fix blocked expanded desktop action proposal fields before preview.";
  }
  if (status === "warning") {
    return "Review warnings. Expanded desktop action execution remains disabled.";
  }
  return "Review the read-only expanded desktop action proposal. Execution remains disabled.";
}

function safeCode(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 96);
}
