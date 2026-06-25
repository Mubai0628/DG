import {
  buildPatchApprovalDraft,
  type PatchApprovalCondition,
  type PatchApprovalDecisionOption,
  type PatchApprovalDraft,
  type PatchApprovalDraftStatus,
  type PatchApprovalFinding
} from "../../runtime/src/execution/patch/approval-draft.js";
import type { AppAgentRoutePreviewView } from "./agent-route-preview-view.js";
import type { AppCapabilityPlanPreviewView } from "./capability-plan-preview-view.js";
import type { AppContextAssemblyPreviewView } from "./context-assembly-preview-view.js";
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

export type AppPatchApprovalDraftStatus = PatchApprovalDraftStatus;

export type AppPatchApprovalFindingView = {
  findingId: string;
  kind: PatchApprovalFinding["kind"];
  severity: PatchApprovalFinding["severity"];
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppPatchApprovalReadinessView = {
  canProceedToApprovalReviewPreview: boolean;
  canApprove: false;
  canReject: false;
  canIssueLease: false;
  canProceedToVirtualApplyPreview: false;
  canApplyPatch: false;
};

export type AppPatchApprovalDraftView = {
  status: AppPatchApprovalDraftStatus;
  approvalDraftId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  intent: AppRunDraftIntent;
  riskLevel: string;
  derivedRiskLevel: string;
  requiresApproval: boolean;
  requiredApprovalReasons: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  decisionOptions: PatchApprovalDecisionOption[];
  suggestedConditions: PatchApprovalCondition[];
  scopeSummary: PatchApprovalDraft["scopeSummary"];
  expiryPreview: PatchApprovalDraft["expiryPreview"];
  findings: AppPatchApprovalFindingView[];
  warningCodes: string[];
  readiness: AppPatchApprovalReadinessView;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  approvalDraftHash: string;
  nextAction: string;
  source: "runtime_patch_approval_draft" | "empty";
  draftOnly: true;
  approvalExecutionEnabled: false;
  rejectionExecutionEnabled: false;
  permissionLeaseIssuingEnabled: false;
  applyEnabled: false;
  virtualApplyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
};

export type AppPatchApprovalDraftInput = {
  proposalPreview?: AppPatchProposalCreationPreviewView | undefined;
  validationPreview?: AppPatchProposalValidationPreviewView | undefined;
  diffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  workspaceIndexRef?: AppWorkspaceIndexBridgeView | undefined;
  contextAssemblyPreview?: AppContextAssemblyPreviewView | undefined;
  capabilityPlanPreview?: AppCapabilityPlanPreviewView | undefined;
  agentRoutePreview?: AppAgentRoutePreviewView | undefined;
};

export function buildPatchApprovalDraftView(
  input: AppPatchApprovalDraftInput = {}
): AppPatchApprovalDraftView {
  if (
    input.proposalPreview === undefined ||
    input.validationPreview === undefined ||
    input.diffAuditPreview === undefined ||
    input.proposalPreview.status === "empty" ||
    input.validationPreview.status === "empty" ||
    input.diffAuditPreview.status === "empty"
  ) {
    return appViewFromRuntimeDraft(buildPatchApprovalDraft(), true);
  }

  return appViewFromRuntimeDraft(
    buildPatchApprovalDraft({
      proposalPreview: runtimeProposalPreview(input.proposalPreview),
      validationPreview: runtimeValidationPreview(input.validationPreview),
      diffAuditPreview: runtimeDiffAuditPreview(input.diffAuditPreview),
      workspaceIndexRef: workspaceIndexRef(input.workspaceIndexRef),
      contextSummaryRef: contextSummaryRef(input.contextAssemblyPreview),
      capabilityPlanRef: capabilityPlanRef(input.capabilityPlanPreview),
      agentRouteRef: agentRouteRef(input.agentRoutePreview)
    })
  );
}

export function patchApprovalDraftSurfaceSummaries(
  view: AppPatchApprovalDraftView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `approval-draft-${view.proposalId}`,
      title: `Patch approval draft: ${view.proposalId}`,
      status: `approval_draft_${view.status}`,
      riskLevel: view.derivedRiskLevel,
      requiresApproval: view.requiresApproval,
      filesChanged: view.scopeSummary.fileCount,
      filesCreated: view.scopeSummary.filesCreated,
      filesUpdated: view.scopeSummary.filesUpdated,
      filesDeleted: view.scopeSummary.filesDeleted,
      linesAdded: view.scopeSummary.linesAdded,
      linesRemoved: view.scopeSummary.linesRemoved,
      pathSummaries: [...view.scopeSummary.pathSummaries],
      warningCodes: [
        `PATCH_APPROVAL_DRAFT_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.approvalDraftHash,
      fingerprint: view.approvalDraftHash,
      suggestedNextAction:
        "Review the approval draft summary only. Approval execution, lease issuing, virtual apply, and patch apply are disabled."
    }
  ];
}

export function patchApprovalDraftApprovalRefs(
  view: AppPatchApprovalDraftView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "blocked"
  ) {
    return [];
  }
  return [
    {
      id: `patch-approval-draft-${view.approvalDraftId}`,
      label: `Patch approval draft ${view.proposalId}`,
      kind: "patch",
      status: "dry",
      summary:
        "Patch approval draft is ready for read-only review. Approval execution is disabled in this phase."
    }
  ];
}

export function patchApprovalDraftWarningCodes(
  view: AppPatchApprovalDraftView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `PATCH_APPROVAL_DRAFT_FINDINGS_${view.findingCount}`,
    `PATCH_APPROVAL_DRAFT_BLOCKERS_${view.blockerCount}`,
    `PATCH_APPROVAL_DRAFT_WARNINGS_${view.warningCount}`,
    `PATCH_APPROVAL_DRAFT_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

function appViewFromRuntimeDraft(
  draft: PatchApprovalDraft,
  forceEmpty = false
): AppPatchApprovalDraftView {
  const findings = draft.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    path: finding.path,
    relatedRef: finding.relatedRef
  }));
  return {
    status: draft.status,
    approvalDraftId: draft.approvalDraftId,
    proposalId: draft.proposalId,
    validationId: draft.validationId,
    auditId: draft.auditId,
    intent: normalizeIntent(draft.intent),
    riskLevel: draft.riskLevel,
    derivedRiskLevel: draft.derivedRiskLevel,
    requiresApproval: draft.requiresApproval,
    requiredApprovalReasons: [...draft.requiredApprovalReasons],
    blockerCount: draft.blockerCount,
    warningCount: draft.warningCount,
    findingCount: draft.findingCount,
    decisionOptions: draft.decisionOptions.map((option) => ({ ...option })),
    suggestedConditions: draft.suggestedConditions.map((condition) => ({
      ...condition,
      warningCodes: [...condition.warningCodes]
    })),
    scopeSummary: {
      ...draft.scopeSummary,
      pathSummaries: [...draft.scopeSummary.pathSummaries]
    },
    expiryPreview: { ...draft.expiryPreview },
    findings,
    warningCodes: findings.map((finding) => finding.code),
    readiness: { ...draft.readiness },
    noCompressRequired: draft.noCompressRequired,
    contextPlacement: draft.contextPlacement,
    approvalDraftHash: draft.approvalDraftHash,
    nextAction: draft.nextAction,
    source:
      forceEmpty || draft.status === "empty"
        ? "empty"
        : "runtime_patch_approval_draft",
    draftOnly: true,
    approvalExecutionEnabled: false,
    rejectionExecutionEnabled: false,
    permissionLeaseIssuingEnabled: false,
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
    auditHash: view.auditHash,
    scopeSummary: {
      pathSummaries: view.findings
        .map((finding) => finding.path)
        .filter((path): path is string => path !== undefined)
    }
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
