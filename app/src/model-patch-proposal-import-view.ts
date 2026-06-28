import {
  repairModelPatchProposalDraft,
  type PatchProposalRepairResult,
  type PatchProposalRepairSourceKind
} from "../../runtime/src/models/patch-proposal-repair.js";
import {
  buildPatchProposalCreationPreviewView,
  type AppPatchProposalCreationPreviewView
} from "./patch-proposal-creation-preview-view.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";

export type ModelPatchProposalImportStatus =
  | "empty"
  | "imported"
  | "warning"
  | "blocked";

export type ModelPatchProposalImportFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ModelPatchProposalImportPreview = {
  proposalId: string;
  title: string;
  intent: string;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  evidenceRefCount: number;
  riskNoteCount: number;
  warningCodes: string[];
  proposalHash: string;
  patchProposalCreationPreviewInput: NonNullable<
    PatchProposalRepairResult["proposalSummary"]
  >["patchProposalCreationPreviewInput"];
};

export type ModelPatchProposalImportSummary = {
  status: ModelPatchProposalImportStatus;
  importId: string;
  proposalId: string;
  operationCount: number;
  fileCount: number;
  warningCount: number;
  blockerCount: number;
  proposalHash: string;
  nextAction: string;
};

export type ModelPatchProposalImportView = {
  status: ModelPatchProposalImportStatus;
  importId: string;
  sourceKind: "paste" | "file" | "fixture" | "manual_test";
  repairId: string;
  repairStatus: PatchProposalRepairResult["status"] | "empty";
  preview?: ModelPatchProposalImportPreview | undefined;
  findings: ModelPatchProposalImportFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  contentDraftSummaryOnly: true;
  repairOperations: string[];
  readiness: {
    canImportToPatchPreview: boolean;
    canApplyPatch: false;
    canWriteFilesystem: false;
    canExecuteGit: false;
    canExecuteShell: false;
    canWriteEventStore: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_model_patch_proposal_import";
};

export type ModelPatchProposalImportInput = {
  draftText?: string | undefined;
  sourceKind: "paste" | "file" | "fixture" | "manual_test";
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildModelPatchProposalImportView(
  input: ModelPatchProposalImportInput
): ModelPatchProposalImportView {
  const draftText = input.draftText ?? "";
  if (draftText.trim().length === 0) {
    return emptyImportView(input);
  }

  const repair = repairModelPatchProposalDraft({
    rawCandidate: draftText,
    sourceKind: repairSourceKind(input.sourceKind),
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const blockerCount = repair.blockerCount;
  const warningCount = repair.warningCount;
  const preview = previewFromRepair(repair);
  const status = statusFromRepair(repair, preview);
  const importHash =
    preview?.proposalHash ?? repair.repairedHash ?? repair.originalHash;

  return {
    status,
    importId: `model-patch-proposal-import-${importHash.slice(0, 12)}`,
    sourceKind: input.sourceKind,
    repairId: repair.repairId,
    repairStatus: repair.status,
    preview,
    findings: repair.findings.map((finding) => ({
      code: safeCode(finding.code),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    blockerCount,
    warningCount,
    findingCount: repair.findingCount,
    contentDraftSummaryOnly: true,
    repairOperations: repair.operations.map((operation) => operation.kind),
    readiness: {
      canImportToPatchPreview:
        status !== "blocked" &&
        preview !== undefined &&
        repair.readiness.canEnterPatchProposalPreview,
      canApplyPatch: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "app_model_patch_proposal_import"
  };
}

export function summarizeModelPatchProposalImportView(
  view: ModelPatchProposalImportView
): ModelPatchProposalImportSummary {
  return {
    status: view.status,
    importId: view.importId,
    proposalId: view.preview?.proposalId ?? "n/a",
    operationCount: view.preview?.operationCount ?? 0,
    fileCount: view.preview?.fileCount ?? 0,
    warningCount: view.warningCount,
    blockerCount: view.blockerCount,
    proposalHash: view.preview?.proposalHash ?? "n/a",
    nextAction: view.nextAction
  };
}

export function buildPatchProposalCreationPreviewFromModelImport(
  view: ModelPatchProposalImportView | undefined
): AppPatchProposalCreationPreviewView | undefined {
  if (
    view === undefined ||
    !view.readiness.canImportToPatchPreview ||
    view.preview === undefined
  ) {
    return undefined;
  }
  const input = viewPreviewInput(view);
  if (input === undefined) {
    return undefined;
  }
  return buildPatchProposalCreationPreviewView({
    titleDraft: input.title,
    changeDescriptionSummary: input.changeDescriptionSummary,
    pathRefsText: JSON.stringify(input.proposedChanges)
  });
}

export function modelPatchProposalImportSurfaceSummaries(
  view: ModelPatchProposalImportView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (
    view === undefined ||
    view.preview === undefined ||
    !view.readiness.canImportToPatchPreview
  ) {
    return [];
  }
  return [
    {
      proposalId: view.preview.proposalId,
      title: view.preview.title,
      status: view.status,
      riskLevel:
        view.warningCount > 0 ? "A2_model_import_warning" : "A1_model_import",
      requiresApproval: true,
      filesChanged: view.preview.fileCount,
      filesCreated: 0,
      filesUpdated: view.preview.fileCount,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0,
      pathSummaries: view.preview.pathSummaries,
      warningCodes: view.preview.warningCodes,
      hash: view.preview.proposalHash,
      fingerprint: view.preview.proposalHash,
      suggestedNextAction:
        "Review imported model proposal summary only. App apply is disabled."
    }
  ];
}

export function modelPatchProposalImportApprovalRefs(
  view: ModelPatchProposalImportView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.preview === undefined ||
    !view.readiness.canImportToPatchPreview
  ) {
    return [];
  }
  return [
    {
      id: `model-import-${view.preview.proposalId}`,
      label: view.preview.title,
      kind: "patch",
      status: "dry",
      summary:
        "Imported model patch proposal requires read-only review. Approval execution is disabled."
    }
  ];
}

export function modelPatchProposalImportWarningCodes(
  view: ModelPatchProposalImportView | undefined
): string[] {
  if (view === undefined) {
    return [];
  }
  return Array.from(
    new Set([
      ...view.findings.map((finding) => finding.code),
      ...(view.preview?.warningCodes ?? [])
    ])
  );
}

function emptyImportView(
  input: ModelPatchProposalImportInput
): ModelPatchProposalImportView {
  const id = input.idGenerator?.() ?? "empty";
  return {
    status: "empty",
    importId: `model-patch-proposal-import-${id}`,
    sourceKind: input.sourceKind,
    repairId: "n/a",
    repairStatus: "empty",
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    contentDraftSummaryOnly: true,
    repairOperations: [],
    readiness: {
      canImportToPatchPreview: false,
      canApplyPatch: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction:
      "Paste a structured model_patch_proposal JSON draft to preview it.",
    source: "app_model_patch_proposal_import"
  };
}

function repairSourceKind(
  sourceKind: ModelPatchProposalImportInput["sourceKind"]
): PatchProposalRepairSourceKind {
  if (sourceKind === "fixture" || sourceKind === "manual_test") {
    return sourceKind;
  }
  return "model_response";
}

function previewFromRepair(
  repair: PatchProposalRepairResult
): ModelPatchProposalImportPreview | undefined {
  const summary = repair.proposalSummary;
  if (
    summary === undefined ||
    repair.blockerCount > 0 ||
    summary.proposalId === undefined ||
    summary.title === undefined ||
    summary.intent === undefined ||
    summary.hash === undefined
  ) {
    return undefined;
  }
  const previewInput = summary.patchProposalCreationPreviewInput;
  return {
    proposalId: safeText(summary.proposalId, "model-proposal"),
    title: safeText(summary.title, "Imported model proposal"),
    intent: safeText(summary.intent, "unknown"),
    operationCount: summary.operationCount,
    fileCount: summary.fileCount,
    pathSummaries: summary.pathSummaries.map((item) =>
      safeErrorMessage(item).slice(0, 180)
    ),
    evidenceRefCount: summary.evidenceRefCount,
    riskNoteCount: summary.riskNoteCount,
    warningCodes: summary.warningCodes.map(safeCode),
    proposalHash: summary.hash,
    patchProposalCreationPreviewInput: previewInput
  };
}

function viewPreviewInput(
  view: ModelPatchProposalImportView
):
  | NonNullable<
      PatchProposalRepairResult["proposalSummary"]
    >["patchProposalCreationPreviewInput"]
  | undefined {
  return view.preview?.patchProposalCreationPreviewInput;
}

function statusFromRepair(
  repair: PatchProposalRepairResult,
  preview: ModelPatchProposalImportPreview | undefined
): ModelPatchProposalImportStatus {
  if (repair.blockerCount > 0 || preview === undefined) {
    return "blocked";
  }
  if (repair.warningCount > 0 || repair.status === "warning") {
    return "warning";
  }
  return "imported";
}

function nextActionFor(status: ModelPatchProposalImportStatus): string {
  if (status === "empty") {
    return "Paste a model_patch_proposal JSON draft to preview it.";
  }
  if (status === "blocked") {
    return "Review safe finding codes only. Blocked model proposals do not enter the preview chain.";
  }
  if (status === "warning") {
    return "Review warning codes. Imported proposal remains preview-only and cannot apply.";
  }
  return "Review the imported proposal in the preview chain. App execution remains disabled.";
}

function safeCode(value: string): string {
  const code = value
    .trim()
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .toUpperCase();
  return /^[A-Z0-9_.-]{1,96}$/.test(code) ? code : "MODEL_IMPORT_WARNING";
}
