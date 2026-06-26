import { createHash } from "node:crypto";

import {
  applyPatchToDisposableWorkspace,
  type DisposablePatchApplyEventPreview,
  type DisposablePatchApplyInput,
  type DisposablePatchApplyOperation,
  type DisposablePatchApplyResult,
  validateDisposablePatchApplyInput
} from "./disposable-patch-apply.js";

export type ApprovalGatedDisposableApplyStatus =
  | "disabled"
  | "gate_ready"
  | "applied_to_disposable"
  | "blocked"
  | "warning";

export type DisposableApplyApprovalScope = {
  disposableRootRef: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  virtualApplyId: string;
  checkpointPreviewId: string;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  allowedRelativePaths?: string[] | undefined;
};

export type DisposableApplyApprovalReceipt = {
  approvalReceiptId: string;
  approvalDraftId: string;
  approvedFor: "disposable_apply_only";
  approvedBy: "explicit_user_test_fixture" | "manual_user_preview";
  scope: DisposableApplyApprovalScope;
  expiresAt?: string | undefined;
  receiptHash: string;
  warningCodes?: string[] | undefined;
};

export type ApprovalGatedDisposableApplySeverity =
  | "info"
  | "warning"
  | "blocker";

export type ApprovalGatedDisposableApplyFindingKind =
  | "mode"
  | "receipt"
  | "scope"
  | "precondition"
  | "apply"
  | "readiness"
  | "safety";

export type ApprovalGatedDisposableApplyFinding = {
  findingId: string;
  kind: ApprovalGatedDisposableApplyFindingKind;
  severity: ApprovalGatedDisposableApplySeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type ApprovalGatedDisposableApplyReadiness = {
  approvalGateSatisfied: boolean;
  appliedToDisposable: boolean;
  canApplyToUserWorkspace: false;
  canPromoteToUserWorkspace: false;
  canIssuePermissionLease: false;
  canCommitGit: false;
  canExecuteShell: false;
};

export type ApprovalGatedDisposableApplyEventPreview = {
  type: "sandbox.approval_gated_disposable_apply.preview_result";
  gatedApplyId: string;
  approvalReceiptId: string;
  applyId?: string | undefined;
  disposableRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  resultHash: string;
  warningCodes: string[];
  disposableApplyEventPreview?: DisposablePatchApplyEventPreview | undefined;
  notWritten: true;
};

export type ApprovalGatedDisposableApplyInput = {
  disposableRoot?: string | undefined;
  disposableRootRef?: string | undefined;
  approvalReceipt?: unknown;
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  disposableApplyInput?: unknown;
  gateMode?:
    | "disabled"
    | "dry_run"
    | "explicit_approval_gated_disposable_apply";
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovalGatedDisposableApplyResult = {
  status: ApprovalGatedDisposableApplyStatus;
  gatedApplyId: string;
  approvalReceiptId: string;
  applyId?: string | undefined;
  disposableRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  findings: ApprovalGatedDisposableApplyFinding[];
  blockerCount: number;
  warningCount: number;
  eventPreview: ApprovalGatedDisposableApplyEventPreview;
  readiness: ApprovalGatedDisposableApplyReadiness;
  resultHash: string;
  nextAction: string;
  source: "runtime_approval_gated_disposable_apply";
  disabledByDefault: true;
  disposableOnly: true;
  userWorkspaceMutationEnabled: false;
  eventWritesEnabled: false;
  permissionLeaseIssuingEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type ApprovalGatedDisposableApplyValidationResult = {
  ok: boolean;
  findings: ApprovalGatedDisposableApplyFinding[];
  warningCodes: string[];
};

type NormalizedInput = {
  disposableRoot: string;
  disposableRootRef: string;
  approvalReceipt: DisposableApplyApprovalReceipt | undefined;
  approvalReceiptApprovedFor: string;
  snapshotContract: Record<string, unknown>;
  patchProposalPreview: Record<string, unknown>;
  patchValidationPreview: Record<string, unknown>;
  patchDiffAuditPreview: Record<string, unknown>;
  patchApprovalDraft: Record<string, unknown>;
  patchVirtualApplyPreview: Record<string, unknown>;
  patchRollbackCheckpointPreview: Record<string, unknown>;
  disposableApplyInput: DisposablePatchApplyInput | undefined;
  gateMode: "disabled" | "dry_run" | "explicit_approval_gated_disposable_apply";
};

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "preimageContent",
    "fileContent",
    "beforeContent",
    "afterContent",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Source",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr",
    "realAbsolutePath",
    "permissionLeaseId"
  ].map((key) => key.toLowerCase())
);

const unsafeContentPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildApprovalGatedDisposableApplyPlan(
  input: ApprovalGatedDisposableApplyInput = {}
): ApprovalGatedDisposableApplyResult {
  return resultFromInput(input, false);
}

export function applyWithDisposableApprovalGate(
  input: ApprovalGatedDisposableApplyInput
): ApprovalGatedDisposableApplyResult {
  return resultFromInput(input, true);
}

export function summarizeApprovalGatedDisposableApplyResult(
  result: ApprovalGatedDisposableApplyResult
): {
  gatedApplyId: string;
  status: ApprovalGatedDisposableApplyStatus;
  approvalReceiptId: string;
  applyId?: string | undefined;
  disposableRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  blockerCount: number;
  warningCount: number;
  eventPreviewNotWritten: true;
  approvalGateSatisfied: boolean;
  appliedToDisposable: boolean;
  canApplyToUserWorkspace: false;
  canPromoteToUserWorkspace: false;
  canIssuePermissionLease: false;
  canCommitGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    gatedApplyId: result.gatedApplyId,
    status: result.status,
    approvalReceiptId: result.approvalReceiptId,
    applyId: result.applyId,
    disposableRootRef: result.disposableRootRef,
    operationCount: result.operationCount,
    filesCreated: result.filesCreated,
    filesUpdated: result.filesUpdated,
    filesDeleted: result.filesDeleted,
    bytesWritten: result.bytesWritten,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    eventPreviewNotWritten: true,
    approvalGateSatisfied: result.readiness.approvalGateSatisfied,
    appliedToDisposable: result.readiness.appliedToDisposable,
    canApplyToUserWorkspace: false,
    canPromoteToUserWorkspace: false,
    canIssuePermissionLease: false,
    canCommitGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        result.gatedApplyId,
        result.status,
        result.approvalReceiptId,
        result.applyId ?? "",
        result.operationCount,
        result.resultHash
      ].join("|")
    )
  };
}

export function validateApprovalGatedDisposableApplyInput(
  input: ApprovalGatedDisposableApplyInput
): ApprovalGatedDisposableApplyValidationResult {
  const normalized = normalizeInput(input);
  const findings: ApprovalGatedDisposableApplyFinding[] = [];
  const inputJson = safeStringify(sanitizedForInputScan(input));

  if (normalized.gateMode !== "explicit_approval_gated_disposable_apply") {
    findings.push(
      finding("mode", "blocker", "APPROVAL_GATED_APPLY_MODE_DISABLED")
    );
  }
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of executionAttemptWarningsFrom(input)) {
    findings.push(finding("readiness", "blocker", code));
  }

  findings.push(...preconditionFindings(normalized, input.createdAt));
  findings.push(...applyInputFindings(normalized));

  const deduped = uniqueFindings(findings);
  return {
    ok: !deduped.some((item) => item.severity === "blocker"),
    findings: deduped,
    warningCodes: deduped.map((item) => item.code)
  };
}

function resultFromInput(
  input: ApprovalGatedDisposableApplyInput,
  execute: boolean
): ApprovalGatedDisposableApplyResult {
  const normalized = normalizeInput(input);
  const validation = validateApprovalGatedDisposableApplyInput(input);
  const gatedApplyId =
    input.idGenerator?.() ??
    `approval-gated-disposable-apply-${hashPreview(
      [
        normalized.disposableRootRef,
        normalized.approvalReceipt?.approvalReceiptId ?? "",
        refFrom(normalized.patchApprovalDraft, "approvalDraftId"),
        operationCountFrom(normalized.disposableApplyInput),
        input.createdAt ?? "runtime-approval-gated-disposable-apply"
      ].join("|")
    )}`;
  const blockerCount = validation.findings.filter(
    (item) => item.severity === "blocker"
  ).length;

  if (
    normalized.gateMode !== "explicit_approval_gated_disposable_apply" ||
    blockerCount > 0 ||
    !execute
  ) {
    const disabled =
      normalized.gateMode !== "explicit_approval_gated_disposable_apply";
    return resultEnvelope({
      status: disabled
        ? "disabled"
        : blockerCount > 0
          ? "blocked"
          : "gate_ready",
      gatedApplyId,
      normalized,
      findings: validation.findings,
      disposableApplyResult: undefined
    });
  }

  const disposableApplyResult = applyPatchToDisposableWorkspace(
    mergedDisposableApplyInput(normalized)
  );
  const applyFindings = disposableApplyResult.findings.map((item) =>
    finding(
      "apply",
      item.severity === "blocker" ? "blocker" : "warning",
      item.code,
      item.path,
      item.findingId
    )
  );
  const finalFindings = uniqueFindings([
    ...validation.findings,
    ...applyFindings
  ]);
  const finalBlockerCount = finalFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  return resultEnvelope({
    status:
      finalBlockerCount > 0 || disposableApplyResult.status === "blocked"
        ? "blocked"
        : disposableApplyResult.status === "applied_to_disposable"
          ? "applied_to_disposable"
          : "warning",
    gatedApplyId,
    normalized,
    findings: finalFindings,
    disposableApplyResult
  });
}

function resultEnvelope(input: {
  status: ApprovalGatedDisposableApplyStatus;
  gatedApplyId: string;
  normalized: NormalizedInput;
  findings: ApprovalGatedDisposableApplyFinding[];
  disposableApplyResult: DisposablePatchApplyResult | undefined;
}): ApprovalGatedDisposableApplyResult {
  const blockerCount = input.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const approvalReceiptId =
    input.normalized.approvalReceipt?.approvalReceiptId ?? "";
  const operationCount =
    input.disposableApplyResult?.operationCount ??
    operationCountFrom(input.normalized.disposableApplyInput);
  const filesCreated = input.disposableApplyResult?.filesCreated ?? 0;
  const filesUpdated = input.disposableApplyResult?.filesUpdated ?? 0;
  const filesDeleted = input.disposableApplyResult?.filesDeleted ?? 0;
  const bytesWritten = input.disposableApplyResult?.bytesWritten ?? 0;
  const resultHash = hashPreview(
    JSON.stringify({
      gatedApplyId: input.gatedApplyId,
      status: input.status,
      approvalReceiptId,
      applyId: input.disposableApplyResult?.applyId,
      disposableRootRef: input.normalized.disposableRootRef,
      operationCount,
      filesCreated,
      filesUpdated,
      filesDeleted,
      bytesWritten,
      findingCodes: input.findings.map((item) => item.code),
      disposableApplyResultHash: input.disposableApplyResult?.resultHash
    })
  );
  const eventPreview: ApprovalGatedDisposableApplyEventPreview = {
    type: "sandbox.approval_gated_disposable_apply.preview_result",
    gatedApplyId: input.gatedApplyId,
    approvalReceiptId,
    applyId: input.disposableApplyResult?.applyId,
    disposableRootRef: input.normalized.disposableRootRef,
    operationCount,
    filesCreated,
    filesUpdated,
    filesDeleted,
    bytesWritten,
    resultHash,
    warningCodes: input.findings
      .filter((findingItem) => findingItem.severity !== "info")
      .map((findingItem) => findingItem.code),
    disposableApplyEventPreview: input.disposableApplyResult?.eventPreview,
    notWritten: true
  };
  const appliedToDisposable =
    input.status === "applied_to_disposable" &&
    input.disposableApplyResult?.readiness.appliedToDisposable === true;
  return {
    status: input.status,
    gatedApplyId: input.gatedApplyId,
    approvalReceiptId,
    applyId: input.disposableApplyResult?.applyId,
    disposableRootRef: input.normalized.disposableRootRef,
    operationCount,
    filesCreated,
    filesUpdated,
    filesDeleted,
    bytesWritten,
    findings: input.findings,
    blockerCount,
    warningCount,
    eventPreview,
    readiness: {
      approvalGateSatisfied:
        input.status === "gate_ready" ||
        input.status === "applied_to_disposable",
      appliedToDisposable,
      canApplyToUserWorkspace: false,
      canPromoteToUserWorkspace: false,
      canIssuePermissionLease: false,
      canCommitGit: false,
      canExecuteShell: false
    },
    resultHash,
    nextAction: nextActionFor(input.status),
    source: "runtime_approval_gated_disposable_apply",
    disabledByDefault: true,
    disposableOnly: true,
    userWorkspaceMutationEnabled: false,
    eventWritesEnabled: false,
    permissionLeaseIssuingEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(
  input: ApprovalGatedDisposableApplyInput
): NormalizedInput {
  return {
    disposableRoot: safeText(input.disposableRoot, ""),
    disposableRootRef: safeIdentifier(
      input.disposableRootRef,
      "disposable-root"
    ),
    approvalReceipt: normalizeReceipt(input.approvalReceipt),
    approvalReceiptApprovedFor: isRecord(input.approvalReceipt)
      ? safeText(input.approvalReceipt.approvedFor, "")
      : "",
    snapshotContract: asRecord(input.snapshotContract),
    patchProposalPreview: asRecord(input.patchProposalPreview),
    patchValidationPreview: asRecord(input.patchValidationPreview),
    patchDiffAuditPreview: asRecord(input.patchDiffAuditPreview),
    patchApprovalDraft: asRecord(input.patchApprovalDraft),
    patchVirtualApplyPreview: asRecord(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: asRecord(
      input.patchRollbackCheckpointPreview
    ),
    disposableApplyInput: isRecord(input.disposableApplyInput)
      ? (input.disposableApplyInput as DisposablePatchApplyInput)
      : undefined,
    gateMode:
      input.gateMode === "explicit_approval_gated_disposable_apply"
        ? "explicit_approval_gated_disposable_apply"
        : input.gateMode === "dry_run"
          ? "dry_run"
          : "disabled"
  };
}

function normalizeReceipt(
  value: unknown
): DisposableApplyApprovalReceipt | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const scope = asRecord(value.scope);
  return {
    approvalReceiptId: safeIdentifier(value.approvalReceiptId, ""),
    approvalDraftId: safeIdentifier(value.approvalDraftId, ""),
    approvedFor:
      value.approvedFor === "disposable_apply_only"
        ? "disposable_apply_only"
        : ("disposable_apply_only" as const),
    approvedBy:
      value.approvedBy === "manual_user_preview"
        ? "manual_user_preview"
        : "explicit_user_test_fixture",
    scope: {
      disposableRootRef: safeIdentifier(scope.disposableRootRef, ""),
      proposalId: safeIdentifier(scope.proposalId, ""),
      validationId: safeIdentifier(scope.validationId, ""),
      auditId: safeIdentifier(scope.auditId, ""),
      approvalDraftId: safeIdentifier(scope.approvalDraftId, ""),
      virtualApplyId: safeIdentifier(scope.virtualApplyId, ""),
      checkpointPreviewId: safeIdentifier(scope.checkpointPreviewId, ""),
      maxFiles: optionalPositiveInteger(scope.maxFiles),
      maxBytes: optionalPositiveInteger(scope.maxBytes),
      allowedRelativePaths: safeStringArray(scope.allowedRelativePaths).map(
        safePathText
      )
    },
    expiresAt: optionalSafeText(value.expiresAt),
    receiptHash: safeIdentifier(value.receiptHash, ""),
    warningCodes: safeStringArray(value.warningCodes).map(safeCodeText)
  };
}

function preconditionFindings(
  normalized: NormalizedInput,
  createdAt: string | undefined
): ApprovalGatedDisposableApplyFinding[] {
  const findings: ApprovalGatedDisposableApplyFinding[] = [];
  const receipt = normalized.approvalReceipt;
  if (receipt === undefined) {
    findings.push(
      finding("receipt", "blocker", "APPROVAL_GATED_APPLY_RECEIPT_MISSING")
    );
  } else {
    if (
      refFrom(asRecord(normalized.patchApprovalDraft), "approvalDraftId") !==
      receipt.approvalDraftId
    ) {
      findings.push(
        finding(
          "receipt",
          "blocker",
          "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_ID_MISMATCH"
        )
      );
    }
    if (normalized.approvalReceiptApprovedFor !== "disposable_apply_only") {
      findings.push(
        finding(
          "receipt",
          "blocker",
          "APPROVAL_GATED_APPLY_SCOPE_NOT_DISPOSABLE"
        )
      );
    }
    if (receipt.scope.disposableRootRef !== normalized.disposableRootRef) {
      findings.push(
        finding("scope", "blocker", "APPROVAL_GATED_APPLY_ROOT_REF_MISMATCH")
      );
    }
    for (const mismatch of receiptScopeMismatches(normalized, receipt)) {
      findings.push(finding("scope", "blocker", mismatch));
    }
    if (receiptExpired(receipt, createdAt)) {
      findings.push(
        finding("receipt", "blocker", "APPROVAL_GATED_APPLY_RECEIPT_EXPIRED")
      );
    }
    findings.push(...receiptLimitFindings(normalized, receipt));
  }

  requireRecord(
    findings,
    normalized.snapshotContract,
    "APPROVAL_GATED_APPLY_SNAPSHOT_CONTRACT_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchApprovalDraft,
    "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_MISSING"
  );
  if (
    safeText(readValue(normalized.patchApprovalDraft, "status"), "") ===
    "blocked"
  ) {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_BLOCKED"
      )
    );
  }
  for (const code of approvalDraftReadinessWarnings(
    normalized.patchApprovalDraft
  )) {
    findings.push(finding("readiness", "blocker", code));
  }
  if (normalized.disposableApplyInput === undefined) {
    findings.push(
      finding("precondition", "blocker", "APPROVAL_GATED_APPLY_INPUT_MISSING")
    );
  }
  if (normalized.disposableRoot.length === 0) {
    findings.push(
      finding("precondition", "blocker", "APPROVAL_GATED_APPLY_ROOT_MISSING")
    );
  }
  return findings;
}

function receiptScopeMismatches(
  normalized: NormalizedInput,
  receipt: DisposableApplyApprovalReceipt
): string[] {
  const expected = [
    [
      "proposalId",
      refFrom(normalized.patchProposalPreview, "proposalId"),
      receipt.scope.proposalId
    ],
    [
      "validationId",
      refFrom(normalized.patchValidationPreview, "validationId"),
      receipt.scope.validationId
    ],
    [
      "auditId",
      refFrom(normalized.patchDiffAuditPreview, "auditId"),
      receipt.scope.auditId
    ],
    [
      "approvalDraftId",
      refFrom(normalized.patchApprovalDraft, "approvalDraftId"),
      receipt.scope.approvalDraftId
    ],
    [
      "virtualApplyId",
      refFrom(normalized.patchVirtualApplyPreview, "virtualApplyId"),
      receipt.scope.virtualApplyId
    ],
    [
      "checkpointPreviewId",
      refFrom(normalized.patchRollbackCheckpointPreview, "checkpointPreviewId"),
      receipt.scope.checkpointPreviewId
    ]
  ] as const;
  return expected
    .filter(
      ([, actual, scoped]) =>
        actual.length > 0 && scoped.length > 0 && actual !== scoped
    )
    .map(([key]) => `APPROVAL_GATED_APPLY_${key.toUpperCase()}_MISMATCH`);
}

function receiptLimitFindings(
  normalized: NormalizedInput,
  receipt: DisposableApplyApprovalReceipt
): ApprovalGatedDisposableApplyFinding[] {
  const findings: ApprovalGatedDisposableApplyFinding[] = [];
  const operations = operationsFrom(normalized.disposableApplyInput);
  if (
    receipt.scope.maxFiles !== undefined &&
    operations.length > receipt.scope.maxFiles
  ) {
    findings.push(
      finding(
        "scope",
        "blocker",
        "APPROVAL_GATED_APPLY_SCOPE_MAX_FILES_EXCEEDED"
      )
    );
  }
  const totalBytes = operations.reduce(
    (sum, operation) =>
      sum +
      (typeof operation.content === "string"
        ? Buffer.byteLength(operation.content, "utf8")
        : 0),
    0
  );
  if (
    receipt.scope.maxBytes !== undefined &&
    totalBytes > receipt.scope.maxBytes
  ) {
    findings.push(
      finding(
        "scope",
        "blocker",
        "APPROVAL_GATED_APPLY_SCOPE_MAX_BYTES_EXCEEDED"
      )
    );
  }
  if ((receipt.scope.allowedRelativePaths ?? []).length > 0) {
    const allowed = new Set(
      (receipt.scope.allowedRelativePaths ?? []).map((item) =>
        item.toLowerCase()
      )
    );
    for (const operation of operations) {
      if (!allowed.has(operation.path.toLowerCase())) {
        findings.push(
          finding(
            "scope",
            "blocker",
            "APPROVAL_GATED_APPLY_SCOPE_PATH_NOT_ALLOWED",
            operation.path
          )
        );
      }
    }
  }
  return findings;
}

function applyInputFindings(
  normalized: NormalizedInput
): ApprovalGatedDisposableApplyFinding[] {
  if (normalized.disposableApplyInput === undefined) {
    return [];
  }
  const mergedInput = mergedDisposableApplyInput(normalized);
  const applyValidation = validateDisposablePatchApplyInput(mergedInput);
  return applyValidation.findings.map((item) =>
    finding(
      "apply",
      item.severity === "blocker" ? "blocker" : "warning",
      item.code,
      item.path,
      item.findingId
    )
  );
}

function mergedDisposableApplyInput(
  normalized: NormalizedInput
): DisposablePatchApplyInput {
  return {
    ...(normalized.disposableApplyInput ?? {}),
    disposableRoot: normalized.disposableRoot,
    disposableRootRef: normalized.disposableRootRef,
    snapshotContract: normalized.snapshotContract,
    patchProposalPreview: normalized.patchProposalPreview,
    patchValidationPreview: normalized.patchValidationPreview,
    patchDiffAuditPreview: normalized.patchDiffAuditPreview,
    patchApprovalDraft: normalized.patchApprovalDraft,
    patchVirtualApplyPreview: normalized.patchVirtualApplyPreview,
    patchRollbackCheckpointPreview: normalized.patchRollbackCheckpointPreview
  };
}

function approvalDraftReadinessWarnings(
  patchApprovalDraft: Record<string, unknown>
): string[] {
  const readiness = asRecord(readValue(patchApprovalDraft, "readiness"));
  return [
    readValue(readiness, "canApprove") === true
      ? "APPROVAL_GATED_APPLY_APPROVE_ENABLED_REJECTED"
      : undefined,
    readValue(readiness, "canIssueLease") === true
      ? "APPROVAL_GATED_APPLY_LEASE_ENABLED_REJECTED"
      : undefined,
    readValue(readiness, "canApplyPatch") === true
      ? "APPROVAL_GATED_APPLY_PATCH_ENABLED_REJECTED"
      : undefined
  ].filter((code): code is string => code !== undefined);
}

function receiptExpired(
  receipt: DisposableApplyApprovalReceipt,
  createdAt: string | undefined
): boolean {
  if (receipt.expiresAt === undefined) {
    return false;
  }
  const expiresAtMs = Date.parse(receipt.expiresAt);
  const nowMs = Date.parse(createdAt ?? "2026-01-01T00:00:00.000Z");
  return Number.isFinite(expiresAtMs) && Number.isFinite(nowMs)
    ? expiresAtMs <= nowMs
    : true;
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("APPROVAL_GATED_APPLY_RAW_FIELD_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function executionAttemptWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key, nested) => {
    const lower = key?.toLowerCase() ?? "";
    if (
      nested === true &&
      (lower.includes("canapplytouserworkspace") ||
        lower.includes("canpromotetouserworkspace") ||
        lower.includes("canissuepermissionlease") ||
        lower.includes("canissuelease") ||
        lower.includes("cancommitgit") ||
        lower.includes("canexecuteshell") ||
        lower.includes("eventwritesenabled") ||
        lower.includes("permissionleaseissuingenabled") ||
        lower.includes("gitexecutionenabled") ||
        lower.includes("shellexecutionenabled"))
    ) {
      warnings.push("APPROVAL_GATED_APPLY_EXECUTION_FLAG_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function sanitizedForInputScan(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizedForInputScan);
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    next[key] =
      key === "content" ? "[operation-content]" : sanitizedForInputScan(nested);
  }
  return next;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafeContentPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function requireRecord(
  findings: ApprovalGatedDisposableApplyFinding[],
  record: Record<string, unknown>,
  code: string
): void {
  if (Object.keys(record).length === 0) {
    findings.push(finding("precondition", "blocker", code));
  }
}

function operationsFrom(
  input: DisposablePatchApplyInput | undefined
): DisposablePatchApplyOperation[] {
  return safeArray(input?.operations)
    .filter(isRecord)
    .map((operation, index) => ({
      operationId: safeIdentifier(
        operation.operationId,
        `operation-${index + 1}`
      ),
      path: safePathText(operation.path),
      changeKind:
        operation.changeKind === "create" ||
        operation.changeKind === "update" ||
        operation.changeKind === "delete"
          ? operation.changeKind
          : "update",
      content:
        typeof operation.content === "string" ? operation.content : undefined,
      expectedBeforeHashPrefix: optionalSafeText(
        operation.expectedBeforeHashPrefix
      ),
      expectedExistsBefore:
        typeof operation.expectedExistsBefore === "boolean"
          ? operation.expectedExistsBefore
          : undefined,
      estimatedLinesAdded: optionalNonNegativeInteger(
        operation.estimatedLinesAdded
      ),
      estimatedLinesRemoved: optionalNonNegativeInteger(
        operation.estimatedLinesRemoved
      ),
      contentEncoding: "utf8",
      contentHash: optionalSafeText(operation.contentHash),
      warningCodes: safeStringArray(operation.warningCodes).map(safeCodeText)
    }));
}

function operationCountFrom(
  input: DisposablePatchApplyInput | undefined
): number {
  return safeArray(input?.operations).length;
}

function refFrom(record: Record<string, unknown>, key: string): string {
  return safeIdentifier(readValue(record, key), "");
}

function nextActionFor(status: ApprovalGatedDisposableApplyStatus): string {
  if (status === "disabled") {
    return "Approval-gated disposable apply is disabled by default. Only explicit runtime test calls may apply to a disposable workspace.";
  }
  if (status === "blocked") {
    return "Resolve approval receipt, preview chain, and disposable apply blockers before the gated apply helper can run.";
  }
  if (status === "gate_ready") {
    return "Approval gate is satisfied for a disposable workspace prototype. App execution, PermissionLease issuing, and user workspace apply remain disabled.";
  }
  if (status === "warning") {
    return "Review warnings. Result remains disposable-only and cannot be promoted to the user workspace.";
  }
  return "Applied to the disposable workspace through the approval gate. Event preview was not written.";
}

function finding(
  kind: ApprovalGatedDisposableApplyFindingKind,
  severity: ApprovalGatedDisposableApplySeverity,
  code: string,
  pathText?: string | undefined,
  relatedRef?: string | undefined
): ApprovalGatedDisposableApplyFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `approval-gated-apply-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${pathText ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: findingSummary(safeCode),
    ...(pathText !== undefined && pathText.length > 0
      ? { path: safePathText(pathText) }
      : {}),
    ...(relatedRef !== undefined && relatedRef.length > 0
      ? { relatedRef: safeIdentifier(relatedRef) }
      : {})
  };
}

function findingSummary(code: string): string {
  const summaries: Record<string, string> = {
    APPROVAL_GATED_APPLY_MODE_DISABLED:
      "Approval-gated disposable apply requires explicit gate mode.",
    APPROVAL_GATED_APPLY_RECEIPT_MISSING:
      "Approval-gated disposable apply requires a summary-only approval receipt.",
    APPROVAL_GATED_APPLY_SCOPE_NOT_DISPOSABLE:
      "Approval receipt must be scoped to disposable apply only.",
    APPROVAL_GATED_APPLY_APPROVAL_DRAFT_ID_MISMATCH:
      "Approval receipt approval draft id must match the approval draft summary.",
    APPROVAL_GATED_APPLY_ROOT_REF_MISMATCH:
      "Approval receipt disposable root ref must match the input root ref.",
    APPROVAL_GATED_APPLY_RECEIPT_EXPIRED:
      "Approval receipt is expired for this disposable apply attempt.",
    APPROVAL_GATED_APPLY_SCOPE_MAX_FILES_EXCEEDED:
      "Disposable apply operations exceed the approval receipt file scope.",
    APPROVAL_GATED_APPLY_SCOPE_MAX_BYTES_EXCEEDED:
      "Disposable apply content bytes exceed the approval receipt byte scope.",
    APPROVAL_GATED_APPLY_SCOPE_PATH_NOT_ALLOWED:
      "Disposable apply operation path is outside the approval receipt path scope.",
    APPROVAL_GATED_APPLY_SNAPSHOT_CONTRACT_MISSING:
      "Approval-gated disposable apply requires a snapshot contract summary.",
    APPROVAL_GATED_APPLY_APPROVAL_DRAFT_MISSING:
      "Approval-gated disposable apply requires an approval draft summary.",
    APPROVAL_GATED_APPLY_APPROVAL_DRAFT_BLOCKED:
      "Approval draft summary is blocked.",
    APPROVAL_GATED_APPLY_APPROVE_ENABLED_REJECTED:
      "Approval execution must remain disabled in the approval draft summary.",
    APPROVAL_GATED_APPLY_LEASE_ENABLED_REJECTED:
      "Permission lease issuing must remain disabled in the approval draft summary.",
    APPROVAL_GATED_APPLY_PATCH_ENABLED_REJECTED:
      "Patch apply must remain disabled in the approval draft summary.",
    APPROVAL_GATED_APPLY_INPUT_MISSING:
      "Approval-gated disposable apply requires a disposable apply input.",
    APPROVAL_GATED_APPLY_ROOT_MISSING:
      "Approval-gated disposable apply requires an explicit disposable root.",
    APPROVAL_GATED_APPLY_RAW_FIELD_REJECTED:
      "Approval-gated disposable apply input contains a forbidden raw field.",
    APPROVAL_GATED_APPLY_EXECUTION_FLAG_REJECTED:
      "Approval-gated disposable apply rejects EventStore, user-workspace, PermissionLease, git, or shell execution flags."
  };
  return summaries[code] ?? "Approval-gated disposable apply safety finding.";
}

function safePathText(value: unknown): string {
  return safeText(value, "").replace(/\\/g, "/").trim().slice(0, 240);
}

function safeIdentifier(value: unknown, fallback = "unknown"): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return text.length > 0 ? text : fallback;
}

function safeCodeText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_")
    .slice(0, 120);
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    : [];
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function optionalSafeText(value: unknown): string | undefined {
  const text = safeText(value, "");
  return text.length > 0 ? text.slice(0, 160) : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readValue(
  record: Record<string, unknown>,
  key: string
): unknown | undefined {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((item) => item.length > 0))).sort();
}

function uniqueFindings(
  findings: readonly ApprovalGatedDisposableApplyFinding[]
): ApprovalGatedDisposableApplyFinding[] {
  const seen = new Set<string>();
  const result: ApprovalGatedDisposableApplyFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}:${item.relatedRef ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function visitUnknown(
  value: unknown,
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string | undefined,
  seen = new Set<unknown>()
): void {
  visitor(key, value);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, undefined, seen));
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    visitUnknown(childValue, visitor, childKey, seen);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nestedValue: unknown) =>
      typeof nestedValue === "function" ? "[function]" : nestedValue
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}
