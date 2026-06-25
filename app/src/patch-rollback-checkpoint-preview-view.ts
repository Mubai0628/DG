import {
  buildPatchRollbackCheckpointPreview,
  type PatchRollbackCheckpointPreview,
  type PatchRollbackCheckpointStatus,
  type PatchRollbackFinding,
  type PatchRollbackOperationSummary,
  type PatchRollbackReadiness,
  type PatchRollbackRestoreScope,
  type PatchRollbackSnapshotSummary
} from "../../runtime/src/execution/patch/rollback-checkpoint-preview.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchDiffAuditPreviewView } from "./patch-diff-audit-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppPatchVirtualApplyPreviewView } from "./patch-virtual-apply-preview-view.js";
import type { AppRunDraftIntent } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppPatchRollbackCheckpointStatus = PatchRollbackCheckpointStatus;

export type AppPatchRollbackFindingView = {
  findingId: string;
  kind: PatchRollbackFinding["kind"];
  severity: PatchRollbackFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppPatchRollbackReadinessView = PatchRollbackReadiness;

export type AppPatchRollbackCheckpointPreviewView = {
  status: AppPatchRollbackCheckpointStatus;
  checkpointPreviewId: string;
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: AppRunDraftIntent;
  riskLevel: string;
  derivedRiskLevel: string;
  requiresApproval: boolean;
  inputSnapshot: PatchRollbackSnapshotSummary;
  outputSnapshot: PatchRollbackSnapshotSummary;
  restoreScope: PatchRollbackRestoreScope;
  operationSummaries: PatchRollbackOperationSummary[];
  affectedFileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: AppPatchRollbackFindingView[];
  warningCodes: string[];
  readiness: AppPatchRollbackReadinessView;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  checkpointHash: string;
  nextAction: string;
  source: "runtime_patch_rollback_checkpoint_preview" | "empty";
  previewOnly: true;
  metadataOnly: true;
  checkpointFileWriteEnabled: false;
  rollbackEnabled: false;
  applyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppPatchRollbackCheckpointPreviewInput = {
  virtualApplyPreview?: AppPatchVirtualApplyPreviewView | undefined;
  proposalPreview?: AppPatchProposalCreationPreviewView | undefined;
  validationPreview?: AppPatchProposalValidationPreviewView | undefined;
  diffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  approvalDraft?: AppPatchApprovalDraftView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
};

export function buildPatchRollbackCheckpointPreviewView(
  input: AppPatchRollbackCheckpointPreviewInput = {}
): AppPatchRollbackCheckpointPreviewView {
  if (
    input.virtualApplyPreview === undefined ||
    input.virtualApplyPreview.status === "empty"
  ) {
    return appViewFromRuntimePreview(
      buildPatchRollbackCheckpointPreview(),
      true
    );
  }

  return appViewFromRuntimePreview(
    buildPatchRollbackCheckpointPreview({
      virtualApplyPreview: runtimeVirtualApplyPreview(
        input.virtualApplyPreview
      ),
      proposalPreview: input.proposalPreview,
      validationPreview: input.validationPreview,
      diffAuditPreview: input.diffAuditPreview,
      approvalDraft: runtimeApprovalDraft(input.approvalDraft),
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef),
      contextSummaryRef: contextSummaryRef(input.contextAssemblyPreview),
      capabilityPlanRef: capabilityPlanRef(input.capabilityPlanPreview),
      agentRouteRef: agentRouteRef(input.agentRoutePreview)
    })
  );
}

export function patchRollbackCheckpointSurfaceSummaries(
  view: AppPatchRollbackCheckpointPreviewView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `rollback-checkpoint-${view.proposalId}`,
      title: `Patch rollback checkpoint: ${view.proposalId}`,
      status: `rollback_checkpoint_${view.status}`,
      riskLevel: view.derivedRiskLevel,
      requiresApproval: view.requiresApproval || view.warningCount > 0,
      filesChanged: view.affectedFileCount,
      filesCreated: view.filesCreated,
      filesUpdated: view.filesUpdated,
      filesDeleted: view.filesDeleted,
      linesAdded: view.operationSummaries.reduce(
        (sum, operation) => sum + operation.estimatedLinesAdded,
        0
      ),
      linesRemoved: view.operationSummaries.reduce(
        (sum, operation) => sum + operation.estimatedLinesRemoved,
        0
      ),
      pathSummaries: view.operationSummaries.map((operation) => operation.path),
      warningCodes: [
        `PATCH_ROLLBACK_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.checkpointHash,
      fingerprint: view.checkpointHash,
      suggestedNextAction:
        "Review the rollback checkpoint summary only. Real rollback, filesystem write, and patch apply are disabled."
    }
  ];
}

export function patchRollbackCheckpointApprovalRefs(
  view: AppPatchRollbackCheckpointPreviewView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked" ||
    (!view.requiresApproval && view.warningCount === 0)
  ) {
    return [];
  }
  return [
    {
      id: `patch-rollback-checkpoint-${view.checkpointPreviewId}`,
      label: `Patch rollback checkpoint ${view.proposalId}`,
      kind: "patch",
      status: "dry",
      summary:
        "Rollback checkpoint preview is read-only. Approval and rollback execution are disabled in this phase."
    }
  ];
}

export function patchRollbackCheckpointWarningCodes(
  view: AppPatchRollbackCheckpointPreviewView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `PATCH_ROLLBACK_FINDINGS_${view.findingCount}`,
    `PATCH_ROLLBACK_BLOCKERS_${view.blockerCount}`,
    `PATCH_ROLLBACK_WARNINGS_${view.warningCount}`,
    `PATCH_ROLLBACK_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

function appViewFromRuntimePreview(
  preview: PatchRollbackCheckpointPreview,
  forceEmpty = false
): AppPatchRollbackCheckpointPreviewView {
  const findings = preview.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    path: finding.path,
    relatedRef: finding.relatedRef
  }));
  return {
    status: preview.status,
    checkpointPreviewId: preview.checkpointPreviewId,
    virtualApplyId: preview.virtualApplyId,
    proposalId: preview.proposalId,
    validationId: preview.validationId,
    auditId: preview.auditId,
    approvalDraftId: preview.approvalDraftId,
    intent: normalizeIntent(preview.intent),
    riskLevel: preview.riskLevel,
    derivedRiskLevel: preview.derivedRiskLevel,
    requiresApproval: preview.requiresApproval,
    inputSnapshot: { ...preview.inputSnapshot },
    outputSnapshot: { ...preview.outputSnapshot },
    restoreScope: {
      ...preview.restoreScope,
      filesToRestore: [...preview.restoreScope.filesToRestore],
      filesToRemoveIfCreated: [...preview.restoreScope.filesToRemoveIfCreated],
      filesToRecreateIfDeleted: [
        ...preview.restoreScope.filesToRecreateIfDeleted
      ],
      warningCodes: [...preview.restoreScope.warningCodes]
    },
    operationSummaries: preview.operationSummaries.map((operation) => ({
      ...operation,
      warningCodes: [...operation.warningCodes]
    })),
    affectedFileCount: preview.affectedFileCount,
    filesCreated: preview.filesCreated,
    filesUpdated: preview.filesUpdated,
    filesDeleted: preview.filesDeleted,
    findingCount: preview.findingCount,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findings,
    warningCodes: findings.map((finding) => finding.code),
    readiness: { ...preview.readiness },
    noCompressRequired: preview.noCompressRequired,
    contextPlacement: preview.contextPlacement,
    checkpointHash: preview.checkpointHash,
    nextAction: preview.nextAction,
    source:
      forceEmpty || preview.status === "empty"
        ? "empty"
        : "runtime_patch_rollback_checkpoint_preview",
    previewOnly: true,
    metadataOnly: true,
    checkpointFileWriteEnabled: false,
    rollbackEnabled: false,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function runtimeVirtualApplyPreview(
  view: AppPatchVirtualApplyPreviewView
): Record<string, unknown> {
  return {
    status: view.status,
    virtualApplyId: view.virtualApplyId,
    proposalId: view.proposalId,
    validationId: view.validationId,
    auditId: view.auditId,
    approvalDraftId: view.approvalDraftId,
    intent: view.intent,
    riskLevel: view.riskLevel,
    derivedRiskLevel: view.derivedRiskLevel,
    requiresApproval: view.requiresApproval,
    inputSnapshot: view.inputSnapshot,
    outputSnapshot: view.outputSnapshot,
    operations: view.operations.map((operation) => ({
      operationId: operation.operationId,
      path: operation.path,
      changeKind: operation.changeKind,
      estimatedLinesAdded: operation.estimatedLinesAdded,
      estimatedLinesRemoved: operation.estimatedLinesRemoved,
      existsBefore: operation.existsBefore,
      existsAfter: operation.existsAfter,
      warningCodes: operation.warningCodes,
      operationHash: operation.operationHash
    })),
    filesCreated: view.filesCreated,
    filesUpdated: view.filesUpdated,
    filesDeleted: view.filesDeleted,
    warningCount: view.warningCount,
    readiness: view.readiness,
    rollbackPreview: view.rollbackPreview,
    virtualApplyHash: view.virtualApplyHash
  };
}

function runtimeApprovalDraft(
  view: AppPatchApprovalDraftView | undefined
): Record<string, unknown> | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    approvalDraftId: view.approvalDraftId,
    proposalId: view.proposalId,
    validationId: view.validationId,
    auditId: view.auditId,
    status: view.status,
    intent: view.intent,
    riskLevel: view.riskLevel,
    derivedRiskLevel: view.derivedRiskLevel,
    requiresApproval: view.requiresApproval,
    warningCount: view.warningCount,
    findings: view.findings.map((finding) => ({
      findingId: finding.findingId,
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      summary: finding.summary,
      path: finding.path,
      relatedRef: finding.relatedRef
    })),
    readiness: view.readiness,
    approvalDraftHash: view.approvalDraftHash
  };
}

function workspaceIndexRef(
  view: AppWorkspaceIndexBridgeView | undefined
): string | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return view.workspaceIndexId ?? `workspace-index:${view.hashPrefix}`;
}

function contextSummaryRef(
  view: AppContextAssemblyPreviewView | undefined
): string | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return `context-assembly:${view.totalSegments}:${view.noCompressSegmentCount}`;
}

function capabilityPlanRef(
  view: AppCapabilityPlanPreviewView | undefined
): string | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return `capability-plan:${view.intent}:${view.itemCount}`;
}

function agentRouteRef(
  view: AppAgentRoutePreviewView | undefined
): string | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return view.routeId;
}

function normalizeIntent(value: unknown): AppRunDraftIntent {
  const text = safeText(value, "unknown");
  return text === "web_data_extraction" ||
    text === "code_change" ||
    text === "code_review" ||
    text === "verification" ||
    text === "documentation" ||
    text === "unknown"
    ? text
    : "unknown";
}
