import {
  buildPatchProposalValidationPreview,
  type PatchProposalValidationFinding,
  type PatchProposalValidationPreview,
  type PatchProposalValidationStatus
} from "../../runtime/src/execution/patch/validation-preview.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppPatchProposalCreationPreviewView } from "./patch-proposal-creation-preview-view.js";
import type { AppRunDraftIntent } from "./run-draft-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";
import type { AppWorkspaceIndexBridgeView } from "./workspace-index-bridge-view.js";

export type AppPatchProposalValidationPreviewStatus =
  PatchProposalValidationStatus;

export type AppPatchProposalValidationFindingView = {
  findingId: string;
  kind: PatchProposalValidationFinding["kind"];
  severity: PatchProposalValidationFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppPatchProposalValidationReadinessView = {
  canProceedToDiffAuditPreview: boolean;
  canProceedToApprovalDraftPreview: boolean;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type AppPatchProposalValidationPreviewView = {
  status: AppPatchProposalValidationPreviewStatus;
  validationId: string;
  proposalId: string;
  intent: AppRunDraftIntent;
  fileCount: number;
  linesAdded: number;
  linesRemoved: number;
  riskLevel: string;
  derivedRiskLevel: string;
  requiresApproval: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: AppPatchProposalValidationFindingView[];
  warningCodes: string[];
  readiness: AppPatchProposalValidationReadinessView;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  validationHash: string;
  nextAction: string;
  source: "runtime_patch_validation_preview" | "empty";
  validationOnly: true;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type AppPatchProposalValidationPreviewInput = {
  proposalPreview?: AppPatchProposalCreationPreviewView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
};

export function buildPatchProposalValidationPreviewView(
  input: AppPatchProposalValidationPreviewInput = {}
): AppPatchProposalValidationPreviewView {
  if (
    input.proposalPreview === undefined ||
    input.proposalPreview.status === "empty"
  ) {
    return appViewFromRuntimePreview(
      buildPatchProposalValidationPreview(),
      true
    );
  }

  return appViewFromRuntimePreview(
    buildPatchProposalValidationPreview({
      proposalPreview: runtimeProposalPreview(input.proposalPreview),
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef),
      contextSummaryRef: contextSummaryRef(input.contextAssemblyPreview),
      capabilityPlanRef: capabilityPlanRef(input.capabilityPlanPreview)
    })
  );
}

export function patchProposalValidationSurfaceSummaries(
  view: AppPatchProposalValidationPreviewView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `validation-${view.proposalId}`,
      title: `Patch validation: ${view.proposalId}`,
      status: `validation_${view.status}`,
      riskLevel: view.derivedRiskLevel,
      requiresApproval: view.requiresApproval,
      filesChanged: view.fileCount,
      filesCreated: 0,
      filesUpdated: view.fileCount,
      filesDeleted: 0,
      linesAdded: view.linesAdded,
      linesRemoved: view.linesRemoved,
      pathSummaries: view.findings
        .map((finding) => finding.path)
        .filter((path): path is string => path !== undefined),
      warningCodes: [
        `PATCH_VALIDATION_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.validationHash,
      fingerprint: view.validationHash,
      suggestedNextAction:
        "Review validation findings only. Patch apply is not enabled."
    }
  ];
}

export function patchProposalValidationApprovalRefs(
  view: AppPatchProposalValidationPreviewView | undefined
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
      id: `patch-validation-${view.validationId}`,
      label: `Patch validation ${view.proposalId}`,
      kind: "patch",
      status: "dry",
      summary:
        "Patch validation indicates approval is required. Approval execution is disabled in this phase."
    }
  ];
}

export function patchProposalValidationAuditWarningCodes(
  view: AppPatchProposalValidationPreviewView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `PATCH_VALIDATION_FINDINGS_${view.findingCount}`,
    `PATCH_VALIDATION_BLOCKERS_${view.blockerCount}`,
    `PATCH_VALIDATION_WARNINGS_${view.warningCount}`,
    ...view.warningCodes
  ];
}

function appViewFromRuntimePreview(
  preview: PatchProposalValidationPreview,
  forceEmpty = false
): AppPatchProposalValidationPreviewView {
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
    validationId: preview.validationId,
    proposalId: preview.proposalId,
    intent: normalizeIntent(preview.intent),
    fileCount: preview.fileCount,
    linesAdded: preview.linesAdded,
    linesRemoved: preview.linesRemoved,
    riskLevel: preview.riskLevel,
    derivedRiskLevel: preview.derivedRiskLevel,
    requiresApproval: preview.requiresApproval,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findingCount: preview.findingCount,
    findings,
    warningCodes: findings.map((finding) => finding.code),
    readiness: { ...preview.readiness },
    noCompressRequired: preview.noCompressRequired,
    contextPlacement: preview.contextPlacement,
    validationHash: preview.validationHash,
    nextAction: preview.nextAction,
    source:
      forceEmpty || preview.status === "empty"
        ? "empty"
        : "runtime_patch_validation_preview",
    validationOnly: true,
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
