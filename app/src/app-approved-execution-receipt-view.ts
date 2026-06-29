import {
  buildAppApprovedExecutionReceipt,
  summarizeAppApprovedExecutionReceipt,
  type AppApprovedExecutionKind,
  type AppApprovedExecutionReceipt
} from "../../runtime/src/execution/index.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppApprovedExecutionReceiptViewStatus =
  | "empty"
  | AppApprovedExecutionReceipt["status"];

export type AppApprovedExecutionReceiptView = {
  status: AppApprovedExecutionReceiptViewStatus;
  source: "runtime_app_approved_execution_receipt";
  receiptId: string;
  kind: AppApprovedExecutionKind;
  workspaceRootRef: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  checkpointId: string;
  allowedPathCount: number;
  maxFiles: number;
  maxBytes: number;
  expiresAt: string;
  typedConfirmationPreview: string;
  receiptHashPrefix?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: Array<{
    code: string;
    severity: "info" | "warning" | "blocker";
    safeMessage: string;
    path?: string | undefined;
  }>;
  readiness: AppApprovedExecutionReceipt["readiness"] & {
    canPreviewReceipt: boolean;
  };
  summary: string;
  nextAction: string;
};

export type AppApprovedExecutionReceiptViewInput = {
  receiptKind?: AppApprovedExecutionKind | undefined;
  applyTypedConfirmation?: string | undefined;
  rollbackTypedConfirmation?: string | undefined;
  allowedRelativePathsText?: string | undefined;
  workspaceSnapshotBackupContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildAppApprovedExecutionReceiptView(
  input: AppApprovedExecutionReceiptViewInput = {}
): AppApprovedExecutionReceiptView {
  const hasPreviewInput =
    input.receiptKind !== undefined ||
    safeText(input.applyTypedConfirmation, "").trim().length > 0 ||
    safeText(input.rollbackTypedConfirmation, "").trim().length > 0 ||
    safeText(input.allowedRelativePathsText, "").trim().length > 0;
  const kind = input.receiptKind ?? "apply";
  const allowedRelativePaths = allowedPathsFrom(input);
  const typedConfirmation =
    kind === "apply"
      ? safeText(input.applyTypedConfirmation, "")
      : safeText(input.rollbackTypedConfirmation, "");
  const receipt = buildAppApprovedExecutionReceipt({
    scope: {
      kind,
      workspaceRootRef: safeRef(
        input.workspaceSnapshotBackupContract,
        "userWorkspaceRootRef"
      ),
      proposalId: safeRef(input.patchProposalPreview, "proposalId"),
      validationId: safeRef(input.patchValidationPreview, "validationId"),
      auditId: safeRef(input.patchDiffAuditPreview, "auditId"),
      approvalDraftId: safeRef(input.patchApprovalDraft, "approvalDraftId"),
      checkpointId: safeRef(
        input.patchRollbackCheckpointPreview,
        "checkpointPreviewId"
      ),
      allowedRelativePaths,
      maxFiles: Math.max(1, allowedRelativePaths.length),
      maxBytes: 1_048_576,
      expiresAt: "2099-01-01T00:00:00.000Z",
      typedConfirmation
    },
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const status: AppApprovedExecutionReceiptViewStatus = hasPreviewInput
    ? receipt.status
    : "empty";

  return {
    status,
    source: receipt.source,
    receiptId: receipt.receiptId,
    kind: receipt.kind,
    workspaceRootRef: receipt.scope.workspaceRootRef,
    proposalId: receipt.scope.proposalId,
    validationId: receipt.scope.validationId,
    auditId: receipt.scope.auditId,
    approvalDraftId: receipt.scope.approvalDraftId,
    checkpointId: receipt.scope.checkpointId ?? "",
    allowedPathCount: receipt.scope.allowedRelativePaths.length,
    maxFiles: receipt.scope.maxFiles,
    maxBytes: receipt.scope.maxBytes,
    expiresAt: receipt.scope.expiresAt,
    typedConfirmationPreview:
      receipt.scope.typedConfirmation.length > 0
        ? "typed confirmation present"
        : "missing",
    receiptHashPrefix: receipt.receiptHash.slice(0, 12),
    blockerCount: receipt.blockerCount,
    warningCount: receipt.warningCount,
    findingCount: receipt.findingCount,
    findings: receipt.findings.map((finding) => ({
      code: safeText(finding.code, "APP_APPROVED_RECEIPT_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.summary),
      path: finding.path
    })),
    readiness: {
      ...receipt.readiness,
      canPreviewReceipt: status !== "empty" && receipt.status !== "blocked"
    },
    summary:
      status === "empty"
        ? "status:empty | receipt_preview:false | app_execution:false"
        : summarizeAppApprovedExecutionReceipt(receipt),
    nextAction:
      status === "empty"
        ? "Enter the exact apply or rollback confirmation to preview a receipt. No Tauri command, file write, or EventStore write is performed."
        : receipt.nextAction
  };
}

export function summarizeAppApprovedExecutionReceiptView(
  view: AppApprovedExecutionReceiptView
): string {
  return [
    `status:${view.status}`,
    `kind:${view.kind}`,
    `paths:${view.allowedPathCount}`,
    `blockers:${view.blockerCount}`,
    `warnings:${view.warningCount}`,
    `hash:${view.receiptHashPrefix ?? "n/a"}`,
    "app_execution:false"
  ].join(" | ");
}

function allowedPathsFrom(
  input: AppApprovedExecutionReceiptViewInput
): string[] {
  const textPaths = safeText(input.allowedRelativePathsText, "")
    .split(/\r?\n|,/)
    .map((path) => path.trim())
    .filter((path) => path.length > 0);
  if (textPaths.length > 0) {
    return textPaths;
  }
  const preview = isRecord(input.patchProposalPreview)
    ? input.patchProposalPreview
    : {};
  const items = safeArray(preview.items);
  const itemPaths = items
    .map((item) => (isRecord(item) ? safeText(item.path, "") : ""))
    .filter((path) => path.length > 0);
  if (itemPaths.length > 0) {
    return itemPaths;
  }
  return safeArray(preview.pathSummaries)
    .map((path) => safeText(path, ""))
    .filter((path) => path.length > 0);
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
