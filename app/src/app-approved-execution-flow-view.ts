import type {
  ApprovedUserWorkspaceApplyChangeKind,
  ApprovedUserWorkspaceApplyRequest,
  ApprovedUserWorkspaceApplyResult,
  ApprovedUserWorkspaceRollbackRequest,
  ApprovedUserWorkspaceRollbackResult,
  ApprovedUserWorkspaceExecutionEventRecordResult
} from "./desktop-flow.js";
import type { AppApprovedExecutionReceiptView } from "./app-approved-execution-receipt-view.js";
import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppApprovedExecutionFlowStatus =
  | "empty"
  | "apply_ready"
  | "rollback_ready"
  | "applied"
  | "rolled_back"
  | "blocked"
  | "error";

export type AppApprovedExecutionFlowFinding = {
  code: string;
  severity: "info" | "warning" | "blocker";
  safeMessage: string;
};

export type AppApprovedExecutionFlowReadiness = {
  canApplyApprovedPatch: boolean;
  canRollbackApprovedPatch: boolean;
  canWriteSummaryEvent: boolean;
  canUseGenericCommand: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
};

export type AppApprovedExecutionFlowView = {
  status: AppApprovedExecutionFlowStatus;
  source: "app_approved_execution_flow";
  workspaceRootPresent: boolean;
  receiptId: string;
  receiptKind: "apply" | "rollback" | "unknown";
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  checkpointId: string;
  checkpointHashPrefix?: string | undefined;
  allowedPathCount: number;
  operationCount: number;
  contentDraftBytes: number;
  contentDraftLineCount: number;
  contentDraftHashPrefix?: string | undefined;
  applyResultSummary?: string | undefined;
  rollbackResultSummary?: string | undefined;
  eventRecordSummary?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: AppApprovedExecutionFlowFinding[];
  readiness: AppApprovedExecutionFlowReadiness;
  nextAction: string;
};

export type AppApprovedExecutionFlowInput = {
  workspaceRoot?: string | undefined;
  receiptView?: AppApprovedExecutionReceiptView | undefined;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  contentDraft?: string | undefined;
  applyResult?: ApprovedUserWorkspaceApplyResult | undefined;
  rollbackResult?: ApprovedUserWorkspaceRollbackResult | undefined;
  eventRecordResult?: ApprovedUserWorkspaceExecutionEventRecordResult | undefined;
};

export function buildAppApprovedExecutionFlowView(
  input: AppApprovedExecutionFlowInput = {}
): AppApprovedExecutionFlowView {
  const receipt = input.receiptView;
  const findings: AppApprovedExecutionFlowFinding[] = [];
  const workspaceRootPresent = safeText(input.workspaceRoot, "").trim().length > 0;
  const receiptKind = receipt?.kind ?? "unknown";
  const contentSummary = summarizeContentDraft(input.contentDraft);
  const applyResult = input.applyResult;
  const rollbackResult = input.rollbackResult;
  const hasAnyInput =
    workspaceRootPresent ||
    receipt !== undefined ||
    safeText(input.contentDraft, "").trim().length > 0 ||
    applyResult !== undefined ||
    rollbackResult !== undefined;

  if (!hasAnyInput) {
    return emptyFlowView();
  }

  if (!workspaceRootPresent) {
    add(findings, "APP_APPROVED_EXECUTION_WORKSPACE_MISSING", "blocker");
  }
  if (receipt === undefined || receipt.status === "empty") {
    add(findings, "APP_APPROVED_EXECUTION_RECEIPT_MISSING", "blocker");
  } else if (receipt.status === "blocked") {
    add(findings, "APP_APPROVED_EXECUTION_RECEIPT_BLOCKED", "blocker");
  }
  if (receipt?.receiptPayload === undefined && receipt?.status !== "empty") {
    add(findings, "APP_APPROVED_EXECUTION_RECEIPT_PAYLOAD_MISSING", "blocker");
  }

  for (const [value, code] of [
    [input.patchProposalPreview, "APP_APPROVED_EXECUTION_PROPOSAL_BLOCKED"],
    [input.patchValidationPreview, "APP_APPROVED_EXECUTION_VALIDATION_BLOCKED"],
    [input.patchDiffAuditPreview, "APP_APPROVED_EXECUTION_AUDIT_BLOCKED"],
    [input.patchApprovalDraft, "APP_APPROVED_EXECUTION_APPROVAL_BLOCKED"]
  ] as const) {
    if (summaryBlocked(value)) {
      add(findings, code, "blocker");
    }
  }

  const allowedPaths = receipt?.receiptPayload?.scope.allowedRelativePaths ?? [];
  if (allowedPaths.length === 0) {
    add(findings, "APP_APPROVED_EXECUTION_PATHS_MISSING", "blocker");
  }
  for (const path of allowedPaths) {
    if (unsafeRelativePath(path)) {
      add(findings, "APP_APPROVED_EXECUTION_UNSAFE_PATH", "blocker");
    }
  }
  if (contentSummary.unsafeMarker) {
    add(findings, "APP_APPROVED_EXECUTION_CONTENT_UNSAFE_MARKER", "blocker");
  }
  if (receipt?.kind === "apply") {
    const changeKind = firstChangeKind(input.patchProposalPreview);
    if (changeKind !== "delete" && contentSummary.bytes === 0) {
      add(findings, "APP_APPROVED_EXECUTION_CONTENT_MISSING", "blocker");
    }
    const maxBytes = receipt.receiptPayload?.scope.maxBytes ?? 0;
    if (maxBytes > 0 && contentSummary.bytes > maxBytes) {
      add(findings, "APP_APPROVED_EXECUTION_MAX_BYTES_EXCEEDED", "blocker");
    }
  }
  if (receipt?.kind === "rollback") {
    if (applyResult === undefined) {
      add(findings, "APP_APPROVED_EXECUTION_APPLY_RESULT_MISSING", "blocker");
    } else if (
      receipt.checkpointId.length > 0 &&
      receipt.checkpointId !== applyResult.checkpointId
    ) {
      add(findings, "APP_APPROVED_EXECUTION_CHECKPOINT_MISMATCH", "blocker");
    }
  }

  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const canApply =
    blockerCount === 0 && receipt?.kind === "apply" && applyResult === undefined;
  const canRollback =
    blockerCount === 0 &&
    receipt?.kind === "rollback" &&
    applyResult !== undefined &&
    rollbackResult === undefined;
  const status: AppApprovedExecutionFlowStatus =
    rollbackResult !== undefined
      ? "rolled_back"
      : applyResult !== undefined && receipt?.kind !== "rollback"
        ? "applied"
        : canRollback
          ? "rollback_ready"
          : canApply
            ? "apply_ready"
            : "blocked";

  return {
    status,
    source: "app_approved_execution_flow",
    workspaceRootPresent,
    receiptId: receipt?.receiptId ?? "",
    receiptKind,
    proposalId: receipt?.proposalId ?? safeRef(input.patchProposalPreview, "proposalId"),
    validationId:
      receipt?.validationId ?? safeRef(input.patchValidationPreview, "validationId"),
    auditId: receipt?.auditId ?? safeRef(input.patchDiffAuditPreview, "auditId"),
    approvalDraftId:
      receipt?.approvalDraftId ?? safeRef(input.patchApprovalDraft, "approvalDraftId"),
    checkpointId: receipt?.checkpointId ?? applyResult?.checkpointId ?? "",
    checkpointHashPrefix: applyResult?.checkpointHash.slice(0, 12),
    allowedPathCount: allowedPaths.length,
    operationCount: allowedPaths.length,
    contentDraftBytes: contentSummary.bytes,
    contentDraftLineCount: contentSummary.lineCount,
    contentDraftHashPrefix: contentSummary.hashPrefix,
    applyResultSummary:
      applyResult === undefined
        ? undefined
        : `apply:${applyResult.applyId} checkpoint:${applyResult.checkpointId} files:${applyResult.operationCount}`,
    rollbackResultSummary:
      rollbackResult === undefined
        ? undefined
        : `rollback:${rollbackResult.rollbackId} checkpoint:${rollbackResult.checkpointId} files:${rollbackResult.operationCount}`,
    eventRecordSummary:
      input.eventRecordResult === undefined
        ? undefined
        : `${input.eventRecordResult.eventType}:${input.eventRecordResult.operationId}`,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    findings,
    readiness: {
      canApplyApprovedPatch: canApply,
      canRollbackApprovedPatch: canRollback,
      canWriteSummaryEvent: canApply || canRollback,
      canUseGenericCommand: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false
    },
    nextAction: nextAction(status, findings)
  };
}

export function summarizeAppApprovedExecutionFlowView(
  view: AppApprovedExecutionFlowView
): string {
  return [
    `status:${view.status}`,
    `receipt:${view.receiptKind}`,
    `paths:${view.allowedPathCount}`,
    `content_bytes:${view.contentDraftBytes}`,
    `blockers:${view.blockerCount}`,
    `warnings:${view.warningCount}`,
    `apply_enabled:${view.readiness.canApplyApprovedPatch}`,
    `rollback_enabled:${view.readiness.canRollbackApprovedPatch}`,
    "generic_command:false"
  ].join(" | ");
}

export function buildApprovedApplyRequestFromExecutionFlow(
  input: AppApprovedExecutionFlowInput
): ApprovedUserWorkspaceApplyRequest {
  const view = buildAppApprovedExecutionFlowView(input);
  if (!view.readiness.canApplyApprovedPatch || input.receiptView?.receiptPayload === undefined) {
    throw new Error(view.nextAction);
  }
  const receipt = input.receiptView.receiptPayload;
  const operations = receipt.scope.allowedRelativePaths.map((path) => {
    const changeKind = changeKindForPath(input.patchProposalPreview, path);
    return {
      path,
      changeKind,
      ...(changeKind === "delete" ? {} : { content: input.contentDraft ?? "" }),
      expectedExistsBefore: changeKind !== "create"
    };
  });
  return {
    workspaceRoot: safeText(input.workspaceRoot, ""),
    workspaceRootRef: receipt.scope.workspaceRootRef,
    receipt,
    operations,
    proposalSummary: summaryRef(input.patchProposalPreview, "proposalId"),
    validationSummary: summaryRef(input.patchValidationPreview, "validationId"),
    auditSummary: summaryRef(input.patchDiffAuditPreview, "auditId"),
    approvalSummary: summaryRef(input.patchApprovalDraft, "approvalDraftId"),
    maxFiles: receipt.scope.maxFiles,
    maxBytes: receipt.scope.maxBytes
  };
}

export function buildApprovedRollbackRequestFromExecutionFlow(
  input: AppApprovedExecutionFlowInput
): ApprovedUserWorkspaceRollbackRequest {
  const view = buildAppApprovedExecutionFlowView(input);
  if (
    !view.readiness.canRollbackApprovedPatch ||
    input.receiptView?.receiptPayload === undefined ||
    input.applyResult === undefined
  ) {
    throw new Error(view.nextAction);
  }
  const receipt = input.receiptView.receiptPayload;
  return {
    workspaceRoot: safeText(input.workspaceRoot, ""),
    workspaceRootRef: receipt.scope.workspaceRootRef,
    receipt,
    applyId: input.applyResult.applyId,
    checkpointId: input.applyResult.checkpointId,
    checkpointRef: input.applyResult.checkpointHash
  };
}

function emptyFlowView(): AppApprovedExecutionFlowView {
  return {
    status: "empty",
    source: "app_approved_execution_flow",
    workspaceRootPresent: false,
    receiptId: "",
    receiptKind: "unknown",
    proposalId: "",
    validationId: "",
    auditId: "",
    approvalDraftId: "",
    checkpointId: "",
    allowedPathCount: 0,
    operationCount: 0,
    contentDraftBytes: 0,
    contentDraftLineCount: 0,
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    findings: [],
    readiness: {
      canApplyApprovedPatch: false,
      canRollbackApprovedPatch: false,
      canWriteSummaryEvent: false,
      canUseGenericCommand: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false
    },
    nextAction:
      "Preview an approved execution receipt and provide explicit content before running the narrow App command."
  };
}

function add(
  findings: AppApprovedExecutionFlowFinding[],
  code: string,
  severity: AppApprovedExecutionFlowFinding["severity"]
): void {
  findings.push({
    code,
    severity,
    safeMessage: summaryFor(code)
  });
}

function summaryFor(code: string): string {
  const summaries: Record<string, string> = {
    APP_APPROVED_EXECUTION_WORKSPACE_MISSING:
      "Workspace root is required before approved execution.",
    APP_APPROVED_EXECUTION_RECEIPT_MISSING:
      "A valid apply or rollback receipt is required.",
    APP_APPROVED_EXECUTION_RECEIPT_BLOCKED:
      "The receipt is blocked and cannot enter the command flow.",
    APP_APPROVED_EXECUTION_RECEIPT_PAYLOAD_MISSING:
      "Receipt payload is missing from the safe preview.",
    APP_APPROVED_EXECUTION_PROPOSAL_BLOCKED:
      "Patch proposal summary is blocked.",
    APP_APPROVED_EXECUTION_VALIDATION_BLOCKED:
      "Patch validation summary is blocked.",
    APP_APPROVED_EXECUTION_AUDIT_BLOCKED:
      "Patch diff audit summary is blocked.",
    APP_APPROVED_EXECUTION_APPROVAL_BLOCKED:
      "Patch approval draft summary is blocked.",
    APP_APPROVED_EXECUTION_PATHS_MISSING:
      "Allowed relative paths are required.",
    APP_APPROVED_EXECUTION_UNSAFE_PATH:
      "Allowed path is outside the safe relative path policy.",
    APP_APPROVED_EXECUTION_CONTENT_UNSAFE_MARKER:
      "Content draft contains a raw or secret-like marker.",
    APP_APPROVED_EXECUTION_CONTENT_MISSING:
      "Create and update operations require explicit user-provided content.",
    APP_APPROVED_EXECUTION_MAX_BYTES_EXCEEDED:
      "Content draft exceeds the receipt byte limit.",
    APP_APPROVED_EXECUTION_APPLY_RESULT_MISSING:
      "Rollback requires an apply result with checkpoint metadata.",
    APP_APPROVED_EXECUTION_CHECKPOINT_MISMATCH:
      "Rollback receipt checkpoint does not match the apply result."
  };
  return summaries[code] ?? "Approved execution gate finding.";
}

function count(
  findings: AppApprovedExecutionFlowFinding[],
  severity: AppApprovedExecutionFlowFinding["severity"]
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function nextAction(
  status: AppApprovedExecutionFlowStatus,
  findings: AppApprovedExecutionFlowFinding[]
): string {
  if (status === "apply_ready") {
    return "Apply Approved Patch is available for the fixed narrow Tauri command.";
  }
  if (status === "rollback_ready") {
    return "Rollback Approved Patch is available for the fixed checkpoint command.";
  }
  if (status === "applied") {
    return "Approved apply completed. Preview a rollback receipt to enable rollback.";
  }
  if (status === "rolled_back") {
    return "Approved rollback completed with a summary-only event record.";
  }
  return findings[0]?.safeMessage ?? "Approved execution is not ready.";
}

function summaryBlocked(value: unknown): boolean {
  const record = isRecord(value) ? value : {};
  const status = safeText(record.status, "").toLowerCase();
  return status.includes("blocked") || Number(record.blockerCount ?? 0) > 0;
}

function firstChangeKind(value: unknown): ApprovedUserWorkspaceApplyChangeKind {
  const items = safeArray(isRecord(value) ? value.items : undefined);
  const first = items.find(isRecord);
  return normalizeChangeKind(first?.changeKind);
}

function changeKindForPath(
  value: unknown,
  path: string
): ApprovedUserWorkspaceApplyChangeKind {
  const items = safeArray(isRecord(value) ? value.items : undefined);
  const match = items
    .filter(isRecord)
    .find((item) => safeText(item.path, "") === path);
  return normalizeChangeKind(match?.changeKind ?? firstChangeKind(value));
}

function normalizeChangeKind(value: unknown): ApprovedUserWorkspaceApplyChangeKind {
  return value === "create" || value === "delete" || value === "update"
    ? value
    : "update";
}

function summaryRef(value: unknown, key: string): Record<string, unknown> {
  return {
    [key]: safeRef(value, key),
    status: safeText(isRecord(value) ? value.status : undefined, "summary")
  };
}

function safeRef(value: unknown, key: string): string {
  return safeErrorMessage(safeText(isRecord(value) ? value[key] : undefined, ""));
}

function summarizeContentDraft(value: unknown): {
  bytes: number;
  lineCount: number;
  hashPrefix?: string | undefined;
  unsafeMarker: boolean;
} {
  const text = typeof value === "string" ? value : "";
  const bytes = new TextEncoder().encode(text).length;
  return {
    bytes,
    lineCount: text.length === 0 ? 0 : text.split(/\r?\n/).length,
    hashPrefix: text.length === 0 ? undefined : hashText(text).slice(0, 12),
    unsafeMarker: containsUnsafeMarker(text)
  };
}

function hashText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function unsafeRelativePath(path: string): boolean {
  const value = path.trim().replaceAll("\\", "/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    value.startsWith("//") ||
    value.includes("\0")
  ) {
    return true;
  }
  const segments = value.split("/");
  return segments.some((segment) =>
    ["", ".", "..", ".git", ".env", "node_modules", "dist", "target", ".tmp"].includes(
      segment.toLowerCase()
    )
  );
}

function containsUnsafeMarker(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("authorization") ||
    lower.includes("bearer ") ||
    lower.includes("sk-") ||
    lower.includes("api key") ||
    lower.includes("apikey") ||
    lower.includes("rawprompt") ||
    lower.includes("raw prompt") ||
    lower.includes("rawresponse") ||
    lower.includes("raw response") ||
    lower.includes("reasoning_content") ||
    lower.includes("rawdiff") ||
    lower.includes("raw diff") ||
    lower.includes("rawsource") ||
    lower.includes("raw source")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
