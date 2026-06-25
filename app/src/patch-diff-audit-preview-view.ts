import {
  buildPatchDiffAuditPreview,
  type PatchDiffAuditFinding,
  type PatchDiffAuditPathCategorySummary,
  type PatchDiffAuditPreview,
  type PatchDiffAuditStatus,
  type PatchDiffAuditValidationFindingSummary
} from "../../runtime/src/execution/patch/diff-audit-preview.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppRunDraftIntent } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppPatchDiffAuditPreviewStatus = PatchDiffAuditStatus;

export type AppPatchDiffAuditFindingView = {
  findingId: string;
  kind: PatchDiffAuditFinding["kind"];
  severity: PatchDiffAuditFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppPatchDiffAuditReadinessView = {
  canProceedToApprovalDraftPreview: boolean;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type AppPatchDiffAuditPreviewView = {
  status: AppPatchDiffAuditPreviewStatus;
  auditId: string;
  proposalId: string;
  validationId: string;
  intent: AppRunDraftIntent;
  riskLevel: string;
  derivedRiskLevel: string;
  requiresApproval: boolean;
  fileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: AppPatchDiffAuditFindingView[];
  warningCodes: string[];
  pathCategorySummary: PatchDiffAuditPathCategorySummary;
  validationFindingSummary: PatchDiffAuditValidationFindingSummary;
  readiness: AppPatchDiffAuditReadinessView;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  auditHash: string;
  nextAction: string;
  source: "runtime_patch_diff_audit_preview" | "empty";
  previewOnly: true;
  diffGenerated: false;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type AppPatchDiffAuditPreviewInput = {
  proposalPreview?: AppPatchProposalCreationPreviewView | undefined;
  validationPreview?: AppPatchProposalValidationPreviewView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
};

export function buildPatchDiffAuditPreviewView(
  input: AppPatchDiffAuditPreviewInput = {}
): AppPatchDiffAuditPreviewView {
  if (
    input.proposalPreview === undefined ||
    input.validationPreview === undefined ||
    input.proposalPreview.status === "empty" ||
    input.validationPreview.status === "empty"
  ) {
    return appViewFromRuntimePreview(buildPatchDiffAuditPreview(), true);
  }

  return appViewFromRuntimePreview(
    buildPatchDiffAuditPreview({
      proposalPreview: runtimeProposalPreview(input.proposalPreview),
      validationPreview: runtimeValidationPreview(input.validationPreview),
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef),
      contextSummaryRef: contextSummaryRef(input.contextAssemblyPreview),
      capabilityPlanRef: capabilityPlanRef(input.capabilityPlanPreview)
    })
  );
}

export function patchDiffAuditSurfaceSummaries(
  view: AppPatchDiffAuditPreviewView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `diff-audit-${view.proposalId}`,
      title: `Patch diff audit: ${view.proposalId}`,
      status: `diff_audit_${view.status}`,
      riskLevel: view.derivedRiskLevel,
      requiresApproval: view.requiresApproval,
      filesChanged: view.fileCount,
      filesCreated: view.filesCreated,
      filesUpdated: view.filesUpdated,
      filesDeleted: view.filesDeleted,
      linesAdded: view.linesAdded,
      linesRemoved: view.linesRemoved,
      pathSummaries: view.findings
        .map((finding) => finding.path)
        .filter((path): path is string => path !== undefined),
      warningCodes: [
        `PATCH_DIFF_AUDIT_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.auditHash,
      fingerprint: view.auditHash,
      suggestedNextAction:
        "Review patch diff audit summary only. Raw diff generation and patch apply are disabled."
    }
  ];
}

export function patchDiffAuditApprovalRefs(
  view: AppPatchDiffAuditPreviewView | undefined
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
      id: `patch-diff-audit-${view.auditId}`,
      label: `Patch diff audit ${view.proposalId}`,
      kind: "patch",
      status: "dry",
      summary:
        "Patch diff audit preview indicates approval is required. Approval execution is disabled in this phase."
    }
  ];
}

export function patchDiffAuditWarningCodes(
  view: AppPatchDiffAuditPreviewView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `PATCH_DIFF_AUDIT_FINDINGS_${view.findingCount}`,
    `PATCH_DIFF_AUDIT_BLOCKERS_${view.blockerCount}`,
    `PATCH_DIFF_AUDIT_WARNINGS_${view.warningCount}`,
    `PATCH_DIFF_AUDIT_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

function appViewFromRuntimePreview(
  preview: PatchDiffAuditPreview,
  forceEmpty = false
): AppPatchDiffAuditPreviewView {
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
    auditId: preview.auditId,
    proposalId: preview.proposalId,
    validationId: preview.validationId,
    intent: normalizeIntent(preview.intent),
    riskLevel: preview.riskLevel,
    derivedRiskLevel: preview.derivedRiskLevel,
    requiresApproval: preview.requiresApproval,
    fileCount: preview.fileCount,
    filesCreated: preview.filesCreated,
    filesUpdated: preview.filesUpdated,
    filesDeleted: preview.filesDeleted,
    linesAdded: preview.linesAdded,
    linesRemoved: preview.linesRemoved,
    findingCount: preview.findingCount,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findings,
    warningCodes: findings.map((finding) => finding.code),
    pathCategorySummary: { ...preview.pathCategorySummary },
    validationFindingSummary: { ...preview.validationFindingSummary },
    readiness: { ...preview.readiness },
    noCompressRequired: preview.noCompressRequired,
    contextPlacement: preview.contextPlacement,
    auditHash: preview.auditHash,
    nextAction: preview.nextAction,
    source:
      forceEmpty || preview.status === "empty"
        ? "empty"
        : "runtime_patch_diff_audit_preview",
    previewOnly: true,
    diffGenerated: false,
    applyEnabled: false,
    virtualApplyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false
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
