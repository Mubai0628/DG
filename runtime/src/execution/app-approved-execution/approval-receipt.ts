import { patchSha256 } from "../patch/hash.js";

export type AppApprovedExecutionKind = "apply" | "rollback";

export type AppApprovedExecutionReceiptStatus = "ready" | "warning" | "blocked";

export type AppApprovedExecutionReceiptSeverity =
  | "info"
  | "warning"
  | "blocker";

export type AppApprovedExecutionReceiptFindingKind =
  | "scope"
  | "confirmation"
  | "expiry"
  | "path"
  | "limit"
  | "forbidden_field"
  | "secret_marker"
  | "readiness"
  | "safety";

export type AppApprovedExecutionReceiptFinding = {
  findingId: string;
  kind: AppApprovedExecutionReceiptFindingKind;
  severity: AppApprovedExecutionReceiptSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type AppApprovedExecutionScope = {
  receiptId: string;
  kind: AppApprovedExecutionKind;
  workspaceRootRef: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  checkpointId?: string | undefined;
  allowedRelativePaths: string[];
  maxFiles: number;
  maxBytes: number;
  expiresAt: string;
  typedConfirmation: string;
  receiptHash: string;
};

export type AppApprovedExecutionReadiness = {
  canApplyPatch: false;
  canRollback: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type AppApprovedExecutionReceipt = {
  status: AppApprovedExecutionReceiptStatus;
  receiptId: string;
  kind: AppApprovedExecutionKind;
  scope: AppApprovedExecutionScope;
  findings: AppApprovedExecutionReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  receiptHash: string;
  readiness: AppApprovedExecutionReadiness;
  nextAction: string;
  source: "runtime_app_approved_execution_receipt";
  summaryOnly: true;
};

export type AppApprovedExecutionReceiptInput = {
  scope?: Partial<AppApprovedExecutionScope> | undefined;
  kind?: AppApprovedExecutionKind | undefined;
  workspaceRootRef?: string | undefined;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  auditId?: string | undefined;
  approvalDraftId?: string | undefined;
  checkpointId?: string | undefined;
  allowedRelativePaths?: string[] | undefined;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  expiresAt?: string | undefined;
  typedConfirmation?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type AppApprovedExecutionReceiptValidationResult = {
  ok: boolean;
  status: AppApprovedExecutionReceiptStatus;
  findings: AppApprovedExecutionReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: AppApprovedExecutionReadiness;
};

type NormalizedReceiptInput = {
  receiptId: string;
  kind: AppApprovedExecutionKind;
  workspaceRootRef: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  checkpointId?: string | undefined;
  allowedRelativePaths: string[];
  maxFiles: number;
  maxBytes: number;
  expiresAt: string;
  typedConfirmation: string;
  createdAt: string;
};

const SOURCE = "runtime_app_approved_execution_receipt";
const APPLY_CONFIRMATION = "APPLY TO USER WORKSPACE";
const ROLLBACK_CONFIRMATION = "ROLLBACK USER WORKSPACE";
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";

const forbiddenFieldNames = new Set([
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "env",
  "envvalue",
  "processenvvalue",
  "vaultsecretvalue",
  "password",
  "rawkey",
  "rawprompt",
  "prompttext",
  "rawresponse",
  "responsetext",
  "reasoningcontent",
  "reasoning_content",
  "rawsource",
  "rawdiff",
  "rawpatch",
  "rawpreimage",
  "rawdom",
  "rawcsv",
  "rawscreenshot",
  "beforecontent",
  "aftercontent",
  "filecontent",
  "preimagecontent",
  "backupcontent",
  "stdout",
  "stderr",
  "command",
  "shellcommand",
  "gitcommand",
  "tauricommand",
  "eventstorewrite",
  "applynow",
  "rollbacknow",
  "permissionlease",
  "desktopaction",
  "nativebridge",
  "tools",
  "tool_choice"
]);

const executionReadinessFields = new Set([
  "canApplyPatch",
  "canRollback",
  "canWriteFilesystem",
  "canWriteEventStore",
  "canExecuteGit",
  "canExecuteShell",
  "canIssuePermissionLease",
  "appCanExecute"
]);

export function buildAppApprovedExecutionReceipt(
  input: AppApprovedExecutionReceiptInput = {}
): AppApprovedExecutionReceipt {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const receiptHash = hashStable({
    source: SOURCE,
    scope: {
      ...normalized,
      receiptHash: undefined
    }
  });
  const scope: AppApprovedExecutionScope = {
    receiptId: normalized.receiptId,
    kind: normalized.kind,
    workspaceRootRef: normalized.workspaceRootRef,
    proposalId: normalized.proposalId,
    validationId: normalized.validationId,
    auditId: normalized.auditId,
    approvalDraftId: normalized.approvalDraftId,
    checkpointId: normalized.checkpointId,
    allowedRelativePaths: normalized.allowedRelativePaths,
    maxFiles: normalized.maxFiles,
    maxBytes: normalized.maxBytes,
    expiresAt: normalized.expiresAt,
    typedConfirmation: normalized.typedConfirmation,
    receiptHash
  };
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: AppApprovedExecutionReceiptStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";

  return {
    status,
    receiptId: normalized.receiptId,
    kind: normalized.kind,
    scope,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    receiptHash,
    readiness: disabledReadiness(),
    nextAction: nextActionFor(status, normalized.kind),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateAppApprovedExecutionReceipt(
  input: AppApprovedExecutionReceiptInput = {}
): AppApprovedExecutionReceiptValidationResult {
  const receipt = buildAppApprovedExecutionReceipt(input);
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

export function summarizeAppApprovedExecutionReceipt(
  receipt: AppApprovedExecutionReceipt
): string {
  return [
    `status:${receipt.status}`,
    `kind:${receipt.kind}`,
    `receipt:${receipt.receiptId}`,
    `paths:${receipt.scope.allowedRelativePaths.length}`,
    `max_files:${receipt.scope.maxFiles}`,
    `max_bytes:${receipt.scope.maxBytes}`,
    `blockers:${receipt.blockerCount}`,
    `warnings:${receipt.warningCount}`,
    `hash:${receipt.receiptHash.slice(0, 12)}`,
    "summary_only:true",
    "app_execution:false"
  ].join(" | ");
}

function normalizeInput(
  input: AppApprovedExecutionReceiptInput
): NormalizedReceiptInput {
  const scope = isRecord(input.scope) ? input.scope : {};
  const kind = normalizeKind(input.kind ?? scope.kind);
  const createdAt = safeString(input.createdAt, DEFAULT_CREATED_AT);
  const base = {
    kind,
    workspaceRootRef: safeString(
      input.workspaceRootRef ?? scope.workspaceRootRef,
      ""
    ),
    proposalId: safeString(input.proposalId ?? scope.proposalId, ""),
    validationId: safeString(input.validationId ?? scope.validationId, ""),
    auditId: safeString(input.auditId ?? scope.auditId, ""),
    approvalDraftId: safeString(
      input.approvalDraftId ?? scope.approvalDraftId,
      ""
    ),
    checkpointId: safeOptionalString(input.checkpointId ?? scope.checkpointId),
    allowedRelativePaths: normalizeStringArray(
      input.allowedRelativePaths ?? scope.allowedRelativePaths
    ),
    maxFiles: safePositiveInteger(input.maxFiles ?? scope.maxFiles),
    maxBytes: safePositiveInteger(input.maxBytes ?? scope.maxBytes),
    expiresAt: safeString(input.expiresAt ?? scope.expiresAt, ""),
    typedConfirmation: safeString(
      input.typedConfirmation ?? scope.typedConfirmation,
      ""
    ),
    createdAt
  };
  const fallbackReceiptId = `receipt-${hashStable(base).slice(0, 12)}`;
  return {
    receiptId: safeString(
      scope.receiptId,
      input.idGenerator?.() ?? fallbackReceiptId
    ),
    ...base
  };
}

function validateNormalizedInput(
  original: unknown,
  input: NormalizedReceiptInput
): AppApprovedExecutionReceiptFinding[] {
  const findings: AppApprovedExecutionReceiptFinding[] = [];
  findings.push(...scanForbiddenInput(original));

  if (!isRecord((original as AppApprovedExecutionReceiptInput).scope)) {
    add(findings, "scope", "blocker", "APP_APPROVED_RECEIPT_SCOPE_MISSING");
  }
  if (!input.workspaceRootRef) {
    add(
      findings,
      "scope",
      "blocker",
      "APP_APPROVED_RECEIPT_WORKSPACE_ROOT_MISSING"
    );
  }
  for (const [field, code] of [
    ["proposalId", "APP_APPROVED_RECEIPT_PROPOSAL_MISSING"],
    ["validationId", "APP_APPROVED_RECEIPT_VALIDATION_MISSING"],
    ["auditId", "APP_APPROVED_RECEIPT_AUDIT_MISSING"],
    ["approvalDraftId", "APP_APPROVED_RECEIPT_APPROVAL_DRAFT_MISSING"]
  ] as const) {
    if (!input[field]) {
      add(findings, "scope", "blocker", code);
    }
  }
  if (input.kind === "rollback" && !input.checkpointId) {
    add(
      findings,
      "scope",
      "blocker",
      "APP_APPROVED_RECEIPT_CHECKPOINT_MISSING"
    );
  }

  const expectedConfirmation =
    input.kind === "apply" ? APPLY_CONFIRMATION : ROLLBACK_CONFIRMATION;
  if (input.typedConfirmation !== expectedConfirmation) {
    add(
      findings,
      "confirmation",
      "blocker",
      "APP_APPROVED_RECEIPT_CONFIRMATION_MISMATCH"
    );
  }

  if (!input.expiresAt || !isValidIsoDate(input.expiresAt)) {
    add(findings, "expiry", "blocker", "APP_APPROVED_RECEIPT_EXPIRY_INVALID");
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(findings, "expiry", "blocker", "APP_APPROVED_RECEIPT_EXPIRED");
  }

  if (input.allowedRelativePaths.length === 0) {
    add(findings, "path", "blocker", "APP_APPROVED_RECEIPT_PATHS_MISSING");
  }
  const uniquePaths = new Set(input.allowedRelativePaths);
  if (uniquePaths.size !== input.allowedRelativePaths.length) {
    add(findings, "path", "blocker", "APP_APPROVED_RECEIPT_DUPLICATE_PATH");
  }
  for (const relativePath of input.allowedRelativePaths) {
    const pathCode = unsafeRelativePathCode(relativePath);
    if (pathCode) {
      add(findings, "path", "blocker", pathCode, safePath(relativePath));
    }
  }

  if (input.maxFiles <= 0) {
    add(findings, "limit", "blocker", "APP_APPROVED_RECEIPT_MAX_FILES_INVALID");
  } else if (input.allowedRelativePaths.length > input.maxFiles) {
    add(
      findings,
      "limit",
      "blocker",
      "APP_APPROVED_RECEIPT_MAX_FILES_EXCEEDED"
    );
  }
  if (input.maxBytes <= 0) {
    add(findings, "limit", "blocker", "APP_APPROVED_RECEIPT_MAX_BYTES_INVALID");
  }

  return findings;
}

function scanForbiddenInput(
  value: unknown
): AppApprovedExecutionReceiptFinding[] {
  const findings: AppApprovedExecutionReceiptFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "APP_APPROVED_RECEIPT_FORBIDDEN_FIELD",
            undefined,
            [...path, key].join(".")
          );
        }
        if (executionReadinessFields.has(key) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "APP_APPROVED_RECEIPT_EXECUTION_READINESS_TRUE",
            undefined,
            [...path, key].join(".")
          );
        }
      }
    }
    if (typeof node === "string" && containsSecretLikeMarker(node)) {
      add(
        findings,
        "secret_marker",
        "blocker",
        "APP_APPROVED_RECEIPT_SECRET_MARKER"
      );
    }
  });
  return dedupeFindings(findings);
}

function add(
  findings: AppApprovedExecutionReceiptFinding[],
  kind: AppApprovedExecutionReceiptFindingKind,
  severity: AppApprovedExecutionReceiptSeverity,
  code: string,
  path?: string,
  relatedRef?: string
): void {
  findings.push({
    findingId: `${code.toLowerCase()}-${findings.length + 1}`,
    kind,
    severity,
    code,
    summary: summaryFor(code),
    path,
    relatedRef
  });
}

function summaryFor(code: string): string {
  const summaries: Record<string, string> = {
    APP_APPROVED_RECEIPT_SCOPE_MISSING:
      "Receipt scope is required before App-approved execution can be previewed.",
    APP_APPROVED_RECEIPT_WORKSPACE_ROOT_MISSING:
      "Workspace root reference is missing.",
    APP_APPROVED_RECEIPT_PROPOSAL_MISSING: "Proposal reference is missing.",
    APP_APPROVED_RECEIPT_VALIDATION_MISSING: "Validation reference is missing.",
    APP_APPROVED_RECEIPT_AUDIT_MISSING: "Audit reference is missing.",
    APP_APPROVED_RECEIPT_APPROVAL_DRAFT_MISSING:
      "Approval draft reference is missing.",
    APP_APPROVED_RECEIPT_CHECKPOINT_MISSING:
      "Rollback receipts require a checkpoint reference.",
    APP_APPROVED_RECEIPT_CONFIRMATION_MISMATCH:
      "Typed confirmation does not match the requested receipt kind.",
    APP_APPROVED_RECEIPT_EXPIRY_INVALID:
      "Receipt expiry is missing or invalid.",
    APP_APPROVED_RECEIPT_EXPIRED: "Receipt is expired and must fail closed.",
    APP_APPROVED_RECEIPT_PATHS_MISSING:
      "At least one allowed relative path is required.",
    APP_APPROVED_RECEIPT_DUPLICATE_PATH:
      "Allowed relative paths must be unique.",
    APP_APPROVED_RECEIPT_UNSAFE_PATH:
      "Allowed path is outside the safe relative workspace path policy.",
    APP_APPROVED_RECEIPT_BLOCKED_PATH:
      "Allowed path points to a blocked workspace location.",
    APP_APPROVED_RECEIPT_SECRET_PATH:
      "Allowed path looks secret-like and must fail closed.",
    APP_APPROVED_RECEIPT_MAX_FILES_INVALID:
      "maxFiles must be a positive integer.",
    APP_APPROVED_RECEIPT_MAX_FILES_EXCEEDED:
      "Allowed path count exceeds maxFiles.",
    APP_APPROVED_RECEIPT_MAX_BYTES_INVALID:
      "maxBytes must be a positive integer.",
    APP_APPROVED_RECEIPT_FORBIDDEN_FIELD:
      "Receipt input contains a forbidden raw, secret, execution, or tool field.",
    APP_APPROVED_RECEIPT_SECRET_MARKER:
      "Receipt input contains a secret-like marker and must fail closed.",
    APP_APPROVED_RECEIPT_EXECUTION_READINESS_TRUE:
      "Receipt input attempted to enable execution readiness."
  };
  return summaries[code] ?? "Receipt validation finding.";
}

function unsafeRelativePathCode(relativePath: string): string | undefined {
  const value = relativePath.trim();
  if (!value) {
    return "APP_APPROVED_RECEIPT_UNSAFE_PATH";
  }
  if (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("//") ||
    value.startsWith("\\\\") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    /[\0\r\n]/.test(value)
  ) {
    return "APP_APPROVED_RECEIPT_UNSAFE_PATH";
  }
  const normalized = value.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return "APP_APPROVED_RECEIPT_UNSAFE_PATH";
  }
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  if (
    lowerSegments.some((segment) =>
      [".git", ".env", "node_modules", "dist", "target", ".tmp"].includes(
        segment
      )
    )
  ) {
    return "APP_APPROVED_RECEIPT_BLOCKED_PATH";
  }
  if (
    /(^|[/._-])(secret|token|password|credential|api[-_]?key)([/._-]|$)/i.test(
      normalized
    )
  ) {
    return "APP_APPROVED_RECEIPT_SECRET_PATH";
  }
  return undefined;
}

function normalizeKind(value: unknown): AppApprovedExecutionKind {
  return value === "rollback" ? "rollback" : "apply";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function safePositiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/[^\w./-]/g, "_");
}

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function visitUnknown(
  value: unknown,
  visitor: (value: unknown, path: string[]) => void,
  path: string[] = []
): void {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitUnknown(item, visitor, [...path, String(index)])
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      visitUnknown(nested, visitor, [...path, key]);
    }
  }
}

function dedupeFindings(
  findings: AppApprovedExecutionReceiptFinding[]
): AppApprovedExecutionReceiptFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.path ?? ""}:${finding.relatedRef ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countSeverity(
  findings: AppApprovedExecutionReceiptFinding[],
  severity: AppApprovedExecutionReceiptSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function nextActionFor(
  status: AppApprovedExecutionReceiptStatus,
  kind: AppApprovedExecutionKind
): string {
  if (status === "blocked") {
    return "Fix receipt scope, confirmation, expiry, path, and secret-safety blockers before any future approved execution command can use this receipt.";
  }
  return kind === "apply"
    ? "Receipt is ready for a future approved apply command, but this helper does not write files or enable App execution."
    : "Receipt is ready for a future approved rollback command, but this helper does not rollback files or enable App execution.";
}

function disabledReadiness(): AppApprovedExecutionReadiness {
  return {
    canApplyPatch: false,
    canRollback: false,
    canWriteFilesystem: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function hashStable(value: unknown): string {
  return patchSha256(stableStringify(value));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
