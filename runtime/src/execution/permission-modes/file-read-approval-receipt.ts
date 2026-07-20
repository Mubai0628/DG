import { hashPatchObject } from "../patch/hash.js";
import { stablePreviewHash } from "../../models/stable-preview-hash.js";

/**
 * Approval receipt for workspace file reads.
 *
 * Mirrors the command broker approval receipt conventions: the receipt
 * binds a typed user confirmation to one exact read request (permission
 * mode + workspace reference + relative path) via `requestHash`. The Tauri
 * read lane recomputes the hash server-side; a receipt that does not match
 * the request is rejected. Reads whose tier gate is `auto` do not need a
 * receipt; reads gated `requires_approval` (sensitive files, or every read
 * in the approval_required tier) do.
 */
export type FileReadApprovalReceiptStatus = "ready" | "warning" | "blocked";

export type FileReadApprovalReceiptSeverity = "info" | "warning" | "blocker";

export type FileReadApprovalReceiptFindingKind =
  | "scope"
  | "path"
  | "confirmation"
  | "expiry"
  | "forbidden_field"
  | "readiness";

export type FileReadApprovalReceiptFinding = {
  findingId: string;
  kind: FileReadApprovalReceiptFindingKind;
  severity: FileReadApprovalReceiptSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
};

export type FileReadApprovalReceiptScope = {
  receiptId: string;
  kind: "workspace_file_read";
  mode: string;
  workspaceRootRef: string;
  relativePath: string;
  requestHash: string;
  expiresAt: string;
  typedConfirmation: string;
  receiptHash: string;
};

export type FileReadApprovalReceiptReadiness = {
  canReadFile: false;
  canWriteFilesystem: false;
  canExecuteCommand: false;
  canSpawnProcess: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  appCanExecute: false;
};

export type FileReadApprovalReceipt = {
  status: FileReadApprovalReceiptStatus;
  receiptId: string;
  kind: "workspace_file_read";
  scope: FileReadApprovalReceiptScope;
  findings: FileReadApprovalReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  receiptHash: string;
  readiness: FileReadApprovalReceiptReadiness;
  nextAction: string;
  source: "runtime_file_read_approval_receipt";
  summaryOnly: true;
};

export type FileReadApprovalReceiptInput = {
  mode?: string | undefined;
  workspaceRootRef?: string | undefined;
  relativePath?: string | undefined;
  expiresAt?: string | undefined;
  typedConfirmation?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type FileReadApprovalReceiptValidationResult = {
  ok: boolean;
  status: FileReadApprovalReceiptStatus;
  findings: FileReadApprovalReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: FileReadApprovalReceiptReadiness;
};

export const FILE_READ_APPROVAL_CONFIRMATION = "READ WORKSPACE FILE";

const SOURCE = "runtime_file_read_approval_receipt" as const;
const KIND = "workspace_file_read" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_EXPIRES_AT = "2099-12-31T23:59:59.000Z";

const forbiddenFieldNames = new Set([
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "password",
  "content",
  "filecontent",
  "rawcontent",
  "rawprompt",
  "rawresponse",
  "reasoningcontent"
]);

const executionReadinessFields = new Set([
  "canReadFile",
  "canWriteFilesystem",
  "canExecuteCommand",
  "canSpawnProcess",
  "canReadApiKey",
  "canFetchNetwork",
  "canWriteEventStore",
  "canApplyPatch",
  "canRollback",
  "appCanExecute"
]);

/**
 * Deterministic hash binding a receipt to one exact read request. Mirrored
 * server-side by `file_read_request_hash` in
 * `app/src-tauri/src/path_sensitivity.rs`; both sides must stay in sync.
 */
export function fileReadRequestHash(input: {
  mode: string;
  workspaceRootRef: string;
  relativePath: string;
}): string {
  return stablePreviewHash(
    [
      "v1",
      "file_read",
      input.mode,
      input.workspaceRootRef,
      input.relativePath
    ].join("\n")
  );
}

export function buildFileReadApprovalReceipt(
  input: FileReadApprovalReceiptInput = {}
): FileReadApprovalReceipt {
  const createdAt = safeText(input.createdAt, DEFAULT_CREATED_AT);
  const normalized = {
    mode: safeText(input.mode, ""),
    workspaceRootRef: safeText(input.workspaceRootRef, ""),
    relativePath: safeText(input.relativePath, ""),
    expiresAt: safeText(input.expiresAt, DEFAULT_EXPIRES_AT),
    typedConfirmation: safeText(
      input.typedConfirmation,
      FILE_READ_APPROVAL_CONFIRMATION
    ),
    createdAt
  };
  const requestHash = fileReadRequestHash({
    mode: normalized.mode,
    workspaceRootRef: normalized.workspaceRootRef,
    relativePath: normalized.relativePath
  });
  const receiptId =
    input.idGenerator?.() ??
    `file-read-receipt-${hashPatchObject({
      requestHash,
      createdAt
    }).slice(0, 16)}`;
  const findings = validateReceiptFields(input, normalized, requestHash);
  const receiptHash = hashPatchObject({
    source: SOURCE,
    kind: KIND,
    receiptId,
    requestHash,
    mode: normalized.mode,
    workspaceRootRef: normalized.workspaceRootRef,
    relativePath: normalized.relativePath,
    expiresAt: normalized.expiresAt,
    typedConfirmation: normalized.typedConfirmation
  });
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: FileReadApprovalReceiptStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";

  return {
    status,
    receiptId,
    kind: KIND,
    scope: {
      receiptId,
      kind: KIND,
      mode: normalized.mode,
      workspaceRootRef: normalized.workspaceRootRef,
      relativePath: normalized.relativePath,
      requestHash,
      expiresAt: normalized.expiresAt,
      typedConfirmation: normalized.typedConfirmation,
      receiptHash
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    receiptHash,
    readiness: disabledReadiness(),
    nextAction: nextActionFor(status),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateFileReadApprovalReceipt(
  input: FileReadApprovalReceiptInput = {}
): FileReadApprovalReceiptValidationResult {
  const receipt = buildFileReadApprovalReceipt(input);
  return {
    ok: receipt.status !== "blocked",
    status: receipt.status,
    findings: receipt.findings,
    blockerCount: receipt.blockerCount,
    warningCount: receipt.warningCount,
    findingCount: receipt.findingCount,
    readiness: receipt.readiness
  };
}

export function summarizeFileReadApprovalReceipt(
  receipt: FileReadApprovalReceipt
): string {
  return [
    `status:${receipt.status}`,
    `kind:${receipt.kind}`,
    `receipt:${receipt.receiptId}`,
    `mode:${receipt.scope.mode}`,
    `path:${receipt.scope.relativePath}`,
    `request_hash:${receipt.scope.requestHash.slice(0, 12)}`,
    `blockers:${receipt.blockerCount}`,
    `hash:${receipt.receiptHash.slice(0, 12)}`,
    "summary_only:true",
    "app_execution:false"
  ].join(" | ");
}

function validateReceiptFields(
  original: unknown,
  input: {
    mode: string;
    workspaceRootRef: string;
    relativePath: string;
    expiresAt: string;
    typedConfirmation: string;
    createdAt: string;
  },
  requestHash: string
): FileReadApprovalReceiptFinding[] {
  const findings: FileReadApprovalReceiptFinding[] = [];
  findings.push(...scanForbiddenInput(original));

  if (!requestHash) {
    add(findings, "scope", "blocker", "FILE_READ_RECEIPT_REQUEST_HASH_MISSING");
  }
  if (!input.mode) {
    add(findings, "scope", "blocker", "FILE_READ_RECEIPT_MODE_MISSING");
  }
  if (!input.workspaceRootRef) {
    add(
      findings,
      "scope",
      "blocker",
      "FILE_READ_RECEIPT_WORKSPACE_ROOT_MISSING"
    );
  }
  if (!input.relativePath) {
    add(findings, "path", "blocker", "FILE_READ_RECEIPT_PATH_MISSING");
  } else if (
    input.relativePath.startsWith("/") ||
    input.relativePath.startsWith("\\") ||
    /^[A-Za-z]:/.test(input.relativePath) ||
    input.relativePath.split(/[\\/]/).some((segment) => segment === "..")
  ) {
    add(findings, "path", "blocker", "FILE_READ_RECEIPT_PATH_UNSAFE");
  }
  if (!input.expiresAt || Number.isNaN(Date.parse(input.expiresAt))) {
    add(findings, "expiry", "blocker", "FILE_READ_RECEIPT_EXPIRY_INVALID");
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(findings, "expiry", "blocker", "FILE_READ_RECEIPT_EXPIRED");
  }

  return findings;
}

function scanForbiddenInput(
  value: unknown,
  path: string[] = []
): FileReadApprovalReceiptFinding[] {
  const findings: FileReadApprovalReceiptFinding[] = [];
  if (!value || typeof value !== "object") {
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...scanForbiddenInput(item, [...path, String(index)]));
    });
    return findings;
  }
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (forbiddenFieldNames.has(normalizedKey)) {
      add(
        findings,
        "forbidden_field",
        "blocker",
        "FILE_READ_RECEIPT_FORBIDDEN_FIELD",
        [...path, key].join(".")
      );
    }
    if (executionReadinessFields.has(key) && nested === true) {
      add(
        findings,
        "readiness",
        "blocker",
        "FILE_READ_RECEIPT_EXECUTION_READINESS_TRUE",
        [...path, key].join(".")
      );
    }
    findings.push(...scanForbiddenInput(nested, [...path, key]));
  }
  return findings;
}

function disabledReadiness(): FileReadApprovalReceiptReadiness {
  return {
    canReadFile: false,
    canWriteFilesystem: false,
    canExecuteCommand: false,
    canSpawnProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  };
}

function nextActionFor(status: FileReadApprovalReceiptStatus): string {
  if (status === "blocked") {
    return "Resolve file read receipt blockers; do not read.";
  }
  if (status === "warning") {
    return "Review file read receipt warnings before reading.";
  }
  return "File read receipt is ready for the fixed Tauri read lane.";
}

function add(
  findings: FileReadApprovalReceiptFinding[],
  kind: FileReadApprovalReceiptFindingKind,
  severity: FileReadApprovalReceiptSeverity,
  code: string,
  path?: string
): void {
  findings.push({
    findingId: `file-read-receipt-${kind}-${code.toLowerCase()}-${hashPatchObject(
      `${kind}:${severity}:${code}:${path ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code,
    summary: summaryFor(code),
    path
  });
}

function summaryFor(code: string): string {
  const messages: Record<string, string> = {
    FILE_READ_RECEIPT_REQUEST_HASH_MISSING:
      "File read receipt requires a bound request hash.",
    FILE_READ_RECEIPT_MODE_MISSING:
      "File read receipt requires a permission mode.",
    FILE_READ_RECEIPT_WORKSPACE_ROOT_MISSING:
      "File read receipt requires a workspace root reference.",
    FILE_READ_RECEIPT_PATH_MISSING:
      "File read receipt requires a relative path.",
    FILE_READ_RECEIPT_PATH_UNSAFE:
      "File read receipt path must be relative and traversal-free.",
    FILE_READ_RECEIPT_EXPIRY_INVALID: "File read receipt expiry is invalid.",
    FILE_READ_RECEIPT_EXPIRED: "File read receipt is expired.",
    FILE_READ_RECEIPT_FORBIDDEN_FIELD:
      "File read receipt contains a forbidden field.",
    FILE_READ_RECEIPT_EXECUTION_READINESS_TRUE:
      "File read receipt must not claim execution readiness."
  };
  return messages[code] ?? "File read receipt finding.";
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}
