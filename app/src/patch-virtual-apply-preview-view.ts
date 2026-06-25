import {
  buildPatchVirtualApplyPreview,
  type PatchVirtualApplyFinding,
  type PatchVirtualApplyOperationPreview,
  type PatchVirtualApplyPreview,
  type PatchVirtualApplyRollbackPreview,
  type PatchVirtualApplySnapshotSummary,
  type PatchVirtualApplyStatus
} from "../../runtime/src/execution/patch/virtual-apply-preview.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchDiffAuditPreviewView } from "./patch-diff-audit-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppRunDraftIntent } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppPatchVirtualApplyPreviewStatus = PatchVirtualApplyStatus;

export type AppPatchVirtualApplyFindingView = {
  findingId: string;
  kind: PatchVirtualApplyFinding["kind"];
  severity: PatchVirtualApplyFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppPatchVirtualApplyReadinessView = {
  canProceedToRollbackCheckpointPreview: boolean;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type AppPatchVirtualApplyPreviewView = {
  status: AppPatchVirtualApplyPreviewStatus;
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: AppRunDraftIntent;
  riskLevel: string;
  derivedRiskLevel: string;
  requiresApproval: boolean;
  inputSnapshot: PatchVirtualApplySnapshotSummary;
  outputSnapshot: PatchVirtualApplySnapshotSummary;
  operations: PatchVirtualApplyOperationPreview[];
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: AppPatchVirtualApplyFindingView[];
  warningCodes: string[];
  rollbackPreview: PatchVirtualApplyRollbackPreview;
  readiness: AppPatchVirtualApplyReadinessView;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  virtualApplyHash: string;
  nextAction: string;
  source: "runtime_patch_virtual_apply_preview" | "empty";
  previewOnly: true;
  inMemoryOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppPatchVirtualApplyPreviewInput = {
  proposalPreview?: AppPatchProposalCreationPreviewView | undefined;
  validationPreview?: AppPatchProposalValidationPreviewView | undefined;
  diffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  approvalDraft?: AppPatchApprovalDraftView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
};

export function buildPatchVirtualApplyPreviewView(
  input: AppPatchVirtualApplyPreviewInput = {}
): AppPatchVirtualApplyPreviewView {
  if (
    input.proposalPreview === undefined ||
    input.validationPreview === undefined ||
    input.diffAuditPreview === undefined ||
    input.approvalDraft === undefined ||
    input.proposalPreview.status === "empty" ||
    input.validationPreview.status === "empty" ||
    input.diffAuditPreview.status === "empty" ||
    input.approvalDraft.status === "empty"
  ) {
    return appViewFromRuntimePreview(buildPatchVirtualApplyPreview(), true);
  }

  return appViewFromRuntimePreview(
    buildPatchVirtualApplyPreview({
      proposalPreview: runtimeProposalPreview(input.proposalPreview),
      validationPreview: runtimeValidationPreview(input.validationPreview),
      diffAuditPreview: runtimeDiffAuditPreview(input.diffAuditPreview),
      approvalDraft: runtimeApprovalDraft(input.approvalDraft),
      workspaceIndexSummary: workspaceSnapshot(input.workspaceIndexRef),
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef),
      contextSummaryRef: contextSummaryRef(input.contextAssemblyPreview),
      capabilityPlanRef: capabilityPlanRef(input.capabilityPlanPreview),
      agentRouteRef: agentRouteRef(input.agentRoutePreview)
    })
  );
}

export function patchVirtualApplySurfaceSummaries(
  view: AppPatchVirtualApplyPreviewView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `virtual-apply-${view.proposalId}`,
      title: `Patch virtual apply: ${view.proposalId}`,
      status: `virtual_apply_${view.status}`,
      riskLevel: view.derivedRiskLevel,
      requiresApproval: view.requiresApproval,
      filesChanged: view.operations.length,
      filesCreated: view.filesCreated,
      filesUpdated: view.filesUpdated,
      filesDeleted: view.filesDeleted,
      linesAdded: view.estimatedLinesAdded,
      linesRemoved: view.estimatedLinesRemoved,
      pathSummaries: view.operations.map((operation) => operation.path),
      warningCodes: [
        `PATCH_VIRTUAL_APPLY_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.virtualApplyHash,
      fingerprint: view.virtualApplyHash,
      suggestedNextAction:
        "Review the in-memory virtual apply summary only. Filesystem write, rollback, and patch apply are disabled."
    }
  ];
}

export function patchVirtualApplyApprovalRefs(
  view: AppPatchVirtualApplyPreviewView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked" ||
    !view.requiresApproval
  ) {
    return [];
  }
  return [
    {
      id: `patch-virtual-apply-${view.virtualApplyId}`,
      label: `Patch virtual apply ${view.proposalId}`,
      kind: "patch",
      status: "dry",
      summary:
        "Virtual apply preview indicates approval review is still read-only. Approval execution is disabled in this phase."
    }
  ];
}

export function patchVirtualApplyWarningCodes(
  view: AppPatchVirtualApplyPreviewView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `PATCH_VIRTUAL_APPLY_FINDINGS_${view.findingCount}`,
    `PATCH_VIRTUAL_APPLY_BLOCKERS_${view.blockerCount}`,
    `PATCH_VIRTUAL_APPLY_WARNINGS_${view.warningCount}`,
    `PATCH_VIRTUAL_APPLY_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

function appViewFromRuntimePreview(
  preview: PatchVirtualApplyPreview,
  forceEmpty = false
): AppPatchVirtualApplyPreviewView {
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
    operations: preview.operations.map((operation) => ({
      ...operation,
      warningCodes: [...operation.warningCodes]
    })),
    filesCreated: preview.filesCreated,
    filesUpdated: preview.filesUpdated,
    filesDeleted: preview.filesDeleted,
    estimatedLinesAdded: preview.estimatedLinesAdded,
    estimatedLinesRemoved: preview.estimatedLinesRemoved,
    findingCount: preview.findingCount,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findings,
    warningCodes: findings.map((finding) => finding.code),
    rollbackPreview: {
      ...preview.rollbackPreview,
      warningCodes: [...preview.rollbackPreview.warningCodes]
    },
    readiness: { ...preview.readiness },
    noCompressRequired: preview.noCompressRequired,
    contextPlacement: preview.contextPlacement,
    virtualApplyHash: preview.virtualApplyHash,
    nextAction: preview.nextAction,
    source:
      forceEmpty || preview.status === "empty"
        ? "empty"
        : "runtime_patch_virtual_apply_preview",
    previewOnly: true,
    inMemoryOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function runtimeProposalPreview(
  view: AppPatchProposalCreationPreviewView
): Record<string, unknown> {
  return {
    proposalId: view.proposalId,
    intent: view.intent,
    title: view.title,
    fileCount: view.fileCount,
    filesCreated: view.filesCreated,
    filesUpdated: view.filesUpdated,
    filesDeleted: view.filesDeleted,
    linesAdded: view.linesAdded,
    linesRemoved: view.linesRemoved,
    riskLevel: view.riskLevel,
    requiresApproval: view.requiresApproval,
    pathSummaries: [...view.pathSummaries],
    warningCodes: [...view.warningCodes],
    proposalHash: view.proposalHash,
    items: view.items.map((item) => ({
      path: item.path,
      changeKind: item.changeKind,
      language: item.language,
      extension: item.extension,
      estimatedLinesAdded: item.estimatedLinesAdded,
      estimatedLinesRemoved: item.estimatedLinesRemoved,
      warningCodes: item.warningCodes,
      requiresApproval: item.requiresApproval
    }))
  };
}

function runtimeValidationPreview(
  view: AppPatchProposalValidationPreviewView
): Record<string, unknown> {
  return {
    validationId: view.validationId,
    proposalId: view.proposalId,
    status: view.status,
    intent: view.intent,
    fileCount: view.fileCount,
    linesAdded: view.linesAdded,
    linesRemoved: view.linesRemoved,
    riskLevel: view.riskLevel,
    derivedRiskLevel: view.derivedRiskLevel,
    requiresApproval: view.requiresApproval,
    findings: view.findings.map((finding) => ({
      findingId: finding.findingId,
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      summary: finding.summary,
      path: finding.path,
      relatedRef: finding.relatedRef
    })),
    readiness: { ...view.readiness },
    validationHash: view.validationHash
  };
}

function runtimeDiffAuditPreview(
  view: AppPatchDiffAuditPreviewView
): Record<string, unknown> {
  return {
    auditId: view.auditId,
    proposalId: view.proposalId,
    validationId: view.validationId,
    status: view.status,
    intent: view.intent,
    riskLevel: view.riskLevel,
    derivedRiskLevel: view.derivedRiskLevel,
    requiresApproval: view.requiresApproval,
    fileCount: view.fileCount,
    filesCreated: view.filesCreated,
    filesUpdated: view.filesUpdated,
    filesDeleted: view.filesDeleted,
    linesAdded: view.linesAdded,
    linesRemoved: view.linesRemoved,
    findings: view.findings.map((finding) => ({
      findingId: finding.findingId,
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      summary: finding.summary,
      path: finding.path,
      relatedRef: finding.relatedRef
    })),
    readiness: { ...view.readiness },
    auditHash: view.auditHash
  };
}

function runtimeApprovalDraft(
  view: AppPatchApprovalDraftView
): Record<string, unknown> {
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
    scopeSummary: {
      ...view.scopeSummary,
      pathSummaries: [...view.scopeSummary.pathSummaries]
    },
    findings: view.findings.map((finding) => ({
      findingId: finding.findingId,
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      summary: finding.summary,
      path: finding.path,
      relatedRef: finding.relatedRef
    })),
    readiness: { ...view.readiness },
    approvalDraftHash: view.approvalDraftHash
  };
}

function workspaceSnapshot(
  view: AppWorkspaceIndexBridgeView | undefined
): Record<string, unknown> | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "rejected"
  ) {
    return undefined;
  }
  return {
    snapshotId: view.workspaceIndexId ?? `workspace-index:${view.hashPrefix}`,
    snapshotHash: view.hashPrefix,
    directoryCount: view.directoryCount,
    files: view.topFiles.map((file) => ({
      path: file.path,
      language: file.language,
      extension: file.extension,
      sizeBytes: file.sizeBytes,
      lineCount: file.lineCount,
      hashPrefix: file.hashPrefix,
      exists: file.indexed
    })),
    warningCodes: view.warnings.map((warning) => warning.code)
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
