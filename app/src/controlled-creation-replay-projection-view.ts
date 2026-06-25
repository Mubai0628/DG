import {
  buildControlledCreationReplayProjection,
  type ControlledCreationReplayFinding,
  type ControlledCreationReplayHashChainSummary,
  type ControlledCreationReplayProjection,
  type ControlledCreationReplayProjectionStatus,
  type ControlledCreationReplayReadiness,
  type ControlledCreationReplayStage
} from "../../runtime/src/control-plane/replay-projection-preview.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
import type { AppControlPlaneProjectionView } from "./control-plane-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchDiffAuditPreviewView } from "./patch-diff-audit-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppPatchRollbackCheckpointPreviewView } from "./patch-rollback-checkpoint-preview-view.js";
import type { AppPatchVirtualApplyPreviewView } from "./patch-virtual-apply-preview-view.js";
import type { AppRunDraftEventRecordResult } from "./run-draft-event-view.js";
import {
  safeArray,
  safeErrorMessage,
  type WorkspaceEventSummary
} from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";

export type AppControlledCreationReplayProjectionStatus =
  ControlledCreationReplayProjectionStatus;

export type AppControlledCreationReplayStageView =
  ControlledCreationReplayStage;

export type AppControlledCreationReplayFindingView = {
  findingId: string;
  kind: ControlledCreationReplayFinding["kind"];
  severity: ControlledCreationReplayFinding["severity"];
  code: string;
  summary: string;
  stageKind?: ControlledCreationReplayFinding["stageKind"];
  relatedRef?: string | undefined;
};

export type AppControlledCreationReplayProjectionView = {
  status: AppControlledCreationReplayProjectionStatus;
  projectionId: string;
  chainId: string;
  stageCount: number;
  persistedEventCount: number;
  localPreviewStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: AppControlledCreationReplayStageView[];
  findings: AppControlledCreationReplayFindingView[];
  warningCodes: string[];
  hashChainSummary: ControlledCreationReplayHashChainSummary;
  readiness: ControlledCreationReplayReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  projectionHash: string;
  nextAction: string;
  source: "runtime_controlled_creation_replay_projection" | "empty";
  previewOnly: true;
  eventWritesEnabled: false;
  executionEnabled: false;
  runExecutionEnabled: false;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppControlledCreationReplayProjectionInput = {
  eventSummary?: WorkspaceEventSummary | undefined;
  runDraftEventResult?: AppRunDraftEventRecordResult | undefined;
  patchProposalCreationPreview?:
    | AppPatchProposalCreationPreviewView
    | undefined;
  patchValidationPreview?: AppPatchProposalValidationPreviewView | undefined;
  patchDiffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  patchApprovalDraft?: AppPatchApprovalDraftView | undefined;
  patchVirtualApplyPreview?: AppPatchVirtualApplyPreviewView | undefined;
  patchRollbackCheckpointPreview?:
    | AppPatchRollbackCheckpointPreviewView
    | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  controlProjection?: AppControlPlaneProjectionView | undefined;
};

export function buildControlledCreationReplayProjectionView(
  input: AppControlledCreationReplayProjectionInput = {}
): AppControlledCreationReplayProjectionView {
  if (
    input.eventSummary === undefined &&
    input.runDraftEventResult === undefined &&
    isEmptyPreview(input.patchProposalCreationPreview) &&
    isEmptyPreview(input.patchValidationPreview) &&
    isEmptyPreview(input.patchDiffAuditPreview) &&
    isEmptyPreview(input.patchApprovalDraft) &&
    isEmptyPreview(input.patchVirtualApplyPreview) &&
    isEmptyPreview(input.patchRollbackCheckpointPreview)
  ) {
    return appViewFromRuntimeProjection(
      buildControlledCreationReplayProjection(),
      true
    );
  }

  return appViewFromRuntimeProjection(
    buildControlledCreationReplayProjection({
      eventSummary: input.eventSummary,
      runDraftEventSummary: runDraftEventSummary(input.runDraftEventResult),
      patchProposalCreationPreview: previewOrUndefined(
        input.patchProposalCreationPreview
      ),
      patchValidationPreview: previewOrUndefined(input.patchValidationPreview),
      patchDiffAuditPreview: previewOrUndefined(input.patchDiffAuditPreview),
      patchApprovalDraft: previewOrUndefined(input.patchApprovalDraft),
      patchVirtualApplyPreview: previewOrUndefined(
        input.patchVirtualApplyPreview
      ),
      patchRollbackCheckpointPreview: previewOrUndefined(
        input.patchRollbackCheckpointPreview
      ),
      contextAssemblyPreview: previewOrUndefined(input.contextAssemblyPreview),
      controlProjection: previewOrUndefined(input.controlProjection)
    })
  );
}

export function controlledCreationReplayPatchSummaries(
  view: AppControlledCreationReplayProjectionView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `controlled-replay-${view.projectionId}`,
      taskId: view.chainId,
      title: "Controlled creation replay projection",
      status: `replay_projection_${view.status}`,
      riskLevel: "A1_read",
      requiresApproval: view.warningCount > 0 || view.blockerCount > 0,
      filesChanged: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0,
      pathSummaries: view.stages.map((stage) => stage.kind),
      warningCodes: [
        `CONTROLLED_REPLAY_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.projectionHash,
      fingerprint: view.hashChainSummary.chainHash,
      suggestedNextAction:
        "Review the replay projection timeline only. No event is written and no action is executed."
    }
  ];
}

export function controlledCreationReplayApprovalRefs(
  view: AppControlledCreationReplayProjectionView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    (view.blockerCount === 0 && view.warningCount === 0)
  ) {
    return [];
  }
  return [
    {
      id: `controlled-replay-${view.projectionId}`,
      label: "Controlled creation replay projection",
      kind: "patch",
      status: view.blockerCount > 0 ? "blocked" : "dry",
      summary:
        "Replay projection is read-only. Approval, rollback, patch apply, and execution are disabled in this phase."
    }
  ];
}

export function controlledCreationReplayWarningCodes(
  view: AppControlledCreationReplayProjectionView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `CONTROLLED_REPLAY_STAGES_${view.stageCount}`,
    `CONTROLLED_REPLAY_MISSING_${view.missingStageCount}`,
    `CONTROLLED_REPLAY_BLOCKERS_${view.blockerCount}`,
    `CONTROLLED_REPLAY_WARNINGS_${view.warningCount}`,
    `CONTROLLED_REPLAY_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

export function summarizeControlledCreationReplayProjectionView(
  view: AppControlledCreationReplayProjectionView
): string {
  if (view.status === "empty") {
    return "No controlled creation replay projection is available.";
  }
  return [
    `status:${view.status}`,
    `stages:${view.stageCount}`,
    `persisted:${view.persistedEventCount}`,
    `local:${view.localPreviewStageCount}`,
    `missing:${view.missingStageCount}`,
    `hash:${view.hashChainSummary.chainHash}`
  ].join(" | ");
}

function appViewFromRuntimeProjection(
  projection: ControlledCreationReplayProjection,
  forceEmpty = false
): AppControlledCreationReplayProjectionView {
  const findings = projection.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    ...(finding.stageKind !== undefined
      ? { stageKind: finding.stageKind }
      : {}),
    relatedRef: finding.relatedRef
  }));
  return {
    status: projection.status,
    projectionId: projection.projectionId,
    chainId: projection.chainId,
    stageCount: projection.stageCount,
    persistedEventCount: projection.persistedEventCount,
    localPreviewStageCount: projection.localPreviewStageCount,
    missingStageCount: projection.missingStageCount,
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    findingCount: projection.findingCount,
    stages: projection.stages.map((stage) => ({
      ...stage,
      warningCodes: [...stage.warningCodes],
      relatedIds: { ...stage.relatedIds }
    })),
    findings,
    warningCodes: [
      ...new Set([
        ...findings.map((finding) => finding.code),
        ...safeArray(projection.hashChainSummary.warningCodes).filter(
          (code): code is string => typeof code === "string"
        )
      ])
    ],
    hashChainSummary: {
      ...projection.hashChainSummary,
      stageHashPrefixes: [...projection.hashChainSummary.stageHashPrefixes],
      warningCodes: [...projection.hashChainSummary.warningCodes]
    },
    readiness: { ...projection.readiness },
    noCompressRequired: projection.noCompressRequired,
    contextPlacement: projection.contextPlacement,
    projectionHash: projection.projectionHash,
    nextAction: projection.nextAction,
    source:
      forceEmpty || projection.status === "empty"
        ? "empty"
        : "runtime_controlled_creation_replay_projection",
    previewOnly: true,
    eventWritesEnabled: false,
    executionEnabled: false,
    runExecutionEnabled: false,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function runDraftEventSummary(
  result: AppRunDraftEventRecordResult | undefined
): Record<string, unknown> | undefined {
  if (result === undefined || result.ok !== true) {
    return undefined;
  }
  return {
    eventId: result.eventId,
    eventType: result.eventType,
    draftId: result.draftId,
    safeSummary: result.safeMessage,
    warningCodes: result.warnings
  };
}

function previewOrUndefined<T extends { status?: string }>(
  value: T | undefined
): T | undefined {
  return isEmptyPreview(value) ? undefined : value;
}

function isEmptyPreview(value: { status?: string } | undefined): boolean {
  return (
    value === undefined ||
    value.status === undefined ||
    value.status === "empty"
  );
}
