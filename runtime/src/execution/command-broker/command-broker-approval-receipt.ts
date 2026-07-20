import { hashPatchObject } from "../patch/hash.js";
import { stablePreviewHash } from "../../models/stable-preview-hash.js";

/**
 * Approval receipt for command broker execution.
 *
 * The receipt binds a typed user confirmation to the exact command request
 * (mode + workspace ref + shell kind + working directory + command text +
 * argv) via `requestHash`. The Tauri command recomputes the same hash
 * server-side; a receipt that does not match the request is rejected.
 */
export type CommandBrokerApprovalReceiptStatus =
  | "ready"
  | "warning"
  | "blocked";

export type CommandBrokerApprovalReceiptSeverity =
  | "info"
  | "warning"
  | "blocker";

export type CommandBrokerApprovalReceiptFindingKind =
  | "scope"
  | "confirmation"
  | "expiry"
  | "forbidden_field"
  | "readiness";

export type CommandBrokerApprovalReceiptFinding = {
  findingId: string;
  kind: CommandBrokerApprovalReceiptFindingKind;
  severity: CommandBrokerApprovalReceiptSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
};

export type CommandBrokerApprovalReceiptScope = {
  receiptId: string;
  kind: "command_broker_execution";
  mode: string;
  workspaceRootRef: string;
  requestHash: string;
  sessionLeaseRef: string;
  expiresAt: string;
  typedConfirmation: string;
  receiptHash: string;
};

export type CommandBrokerApprovalReceiptReadiness = {
  canExecuteCommand: false;
  canSpawnProcess: false;
  canWriteFilesystem: false;
  canExecuteGitWrite: false;
  canRunBackgroundProcess: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canUseNativeBridge: false;
  canExecuteDesktopAction: false;
  appCanExecute: false;
};

export type CommandBrokerApprovalReceipt = {
  status: CommandBrokerApprovalReceiptStatus;
  receiptId: string;
  kind: "command_broker_execution";
  scope: CommandBrokerApprovalReceiptScope;
  findings: CommandBrokerApprovalReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  receiptHash: string;
  readiness: CommandBrokerApprovalReceiptReadiness;
  nextAction: string;
  source: "runtime_command_broker_approval_receipt";
  summaryOnly: true;
};

export type CommandBrokerApprovalReceiptInput = {
  mode?: string | undefined;
  workspaceRootRef?: string | undefined;
  sessionLeaseRef?: string | undefined;
  shellKind?: string | undefined;
  workingDirectory?: string | undefined;
  commandText?: string | undefined;
  argv?: string[] | undefined;
  expiresAt?: string | undefined;
  typedConfirmation?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandBrokerApprovalReceiptValidationResult = {
  ok: boolean;
  status: CommandBrokerApprovalReceiptStatus;
  findings: CommandBrokerApprovalReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: CommandBrokerApprovalReceiptReadiness;
};

export const COMMAND_BROKER_APPROVAL_CONFIRMATION = "EXECUTE WORKSPACE COMMAND";

const SOURCE = "runtime_command_broker_approval_receipt" as const;
const KIND = "command_broker_execution" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const REQUEST_HASH_VERSION = "v1";
const ARGV_SEPARATOR = "\u001f";

const forbiddenFieldNames = new Set([
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "password",
  "env",
  "envvalue",
  "rawprompt",
  "rawresponse",
  "rawsource",
  "rawoutput",
  "reasoningcontent",
  "stdout",
  "stderr",
  "permissionlease"
]);

const executionReadinessFields = new Set([
  "canExecuteCommand",
  "canSpawnProcess",
  "canWriteFilesystem",
  "canExecuteGitWrite",
  "canRunBackgroundProcess",
  "canReadApiKey",
  "canFetchNetwork",
  "canWriteEventStore",
  "canApplyPatch",
  "canRollback",
  "canUseNativeBridge",
  "canExecuteDesktopAction",
  "appCanExecute"
]);

/**
 * Deterministic hash binding a receipt to one exact command request.
 * Mirrored server-side in the Tauri command (UTF-16 code unit arithmetic,
 * same field order and separators); both sides must stay in sync.
 */
export function commandBrokerRequestHash(input: {
  mode: string;
  workspaceRootRef: string;
  shellKind: string;
  workingDirectory: string;
  commandText: string;
  argv: string[];
}): string {
  return stablePreviewHash(
    [
      REQUEST_HASH_VERSION,
      input.mode,
      input.workspaceRootRef,
      input.shellKind,
      input.workingDirectory,
      input.commandText,
      input.argv.join(ARGV_SEPARATOR)
    ].join("\n")
  );
}

export function buildCommandBrokerApprovalReceipt(
  input: CommandBrokerApprovalReceiptInput = {}
): CommandBrokerApprovalReceipt {
  const createdAt = safeText(input.createdAt, DEFAULT_CREATED_AT);
  const normalized = {
    mode: safeText(input.mode, ""),
    workspaceRootRef: safeText(input.workspaceRootRef, ""),
    sessionLeaseRef: safeText(input.sessionLeaseRef, ""),
    shellKind: safeText(input.shellKind, ""),
    workingDirectory: safeText(input.workingDirectory, ""),
    commandText: safeText(input.commandText, ""),
    argv: Array.isArray(input.argv)
      ? input.argv.filter((item) => typeof item === "string")
      : [],
    expiresAt: safeText(input.expiresAt, DEFAULT_EXPIRES_AT),
    // Kept in the scope schema for compatibility; no longer validated
    // (approval is the receipt's existence and scope binding, not a phrase).
    typedConfirmation: safeText(
      input.typedConfirmation,
      COMMAND_BROKER_APPROVAL_CONFIRMATION
    ),
    createdAt
  };
  const requestHash = commandBrokerRequestHash({
    mode: normalized.mode,
    workspaceRootRef: normalized.workspaceRootRef,
    shellKind: normalized.shellKind,
    workingDirectory: normalized.workingDirectory,
    commandText: normalized.commandText,
    argv: normalized.argv
  });
  const receiptId =
    input.idGenerator?.() ??
    `command-broker-receipt-${hashPatchObject({
      requestHash,
      sessionLeaseRef: normalized.sessionLeaseRef,
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
    sessionLeaseRef: normalized.sessionLeaseRef,
    expiresAt: normalized.expiresAt,
    typedConfirmation: normalized.typedConfirmation
  });
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: CommandBrokerApprovalReceiptStatus =
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
      requestHash,
      sessionLeaseRef: normalized.sessionLeaseRef,
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

export function validateCommandBrokerApprovalReceipt(
  input: CommandBrokerApprovalReceiptInput = {}
): CommandBrokerApprovalReceiptValidationResult {
  const receipt = buildCommandBrokerApprovalReceipt(input);
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

export function summarizeCommandBrokerApprovalReceipt(
  receipt: CommandBrokerApprovalReceipt
): string {
  return [
    `status:${receipt.status}`,
    `kind:${receipt.kind}`,
    `receipt:${receipt.receiptId}`,
    `mode:${receipt.scope.mode}`,
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
    sessionLeaseRef: string;
    expiresAt: string;
    typedConfirmation: string;
    createdAt: string;
  },
  requestHash: string
): CommandBrokerApprovalReceiptFinding[] {
  const findings: CommandBrokerApprovalReceiptFinding[] = [];
  findings.push(...scanForbiddenInput(original));

  if (!requestHash) {
    add(findings, "scope", "blocker", "BROKER_RECEIPT_REQUEST_HASH_MISSING");
  }
  if (!input.mode) {
    add(findings, "scope", "blocker", "BROKER_RECEIPT_MODE_MISSING");
  }
  if (!input.workspaceRootRef) {
    add(findings, "scope", "blocker", "BROKER_RECEIPT_WORKSPACE_ROOT_MISSING");
  }
  if (!input.sessionLeaseRef) {
    add(findings, "scope", "blocker", "BROKER_RECEIPT_SESSION_LEASE_MISSING");
  }
  if (!input.expiresAt || Number.isNaN(Date.parse(input.expiresAt))) {
    add(findings, "expiry", "blocker", "BROKER_RECEIPT_EXPIRY_INVALID");
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(findings, "expiry", "blocker", "BROKER_RECEIPT_EXPIRED");
  }

  return findings;
}

function scanForbiddenInput(
  value: unknown,
  path: string[] = []
): CommandBrokerApprovalReceiptFinding[] {
  const findings: CommandBrokerApprovalReceiptFinding[] = [];
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
        "BROKER_RECEIPT_FORBIDDEN_FIELD",
        [...path, key].join(".")
      );
    }
    if (executionReadinessFields.has(key) && nested === true) {
      add(
        findings,
        "readiness",
        "blocker",
        "BROKER_RECEIPT_EXECUTION_READINESS_TRUE",
        [...path, key].join(".")
      );
    }
    findings.push(...scanForbiddenInput(nested, [...path, key]));
  }
  return findings;
}

function disabledReadiness(): CommandBrokerApprovalReceiptReadiness {
  return {
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canUseNativeBridge: false,
    canExecuteDesktopAction: false,
    appCanExecute: false
  };
}

function nextActionFor(status: CommandBrokerApprovalReceiptStatus): string {
  if (status === "blocked") {
    return "Resolve broker receipt blockers; do not execute.";
  }
  if (status === "warning") {
    return "Review broker receipt warnings before execution.";
  }
  return "Broker receipt is ready for the fixed Tauri command phase.";
}

function add(
  findings: CommandBrokerApprovalReceiptFinding[],
  kind: CommandBrokerApprovalReceiptFindingKind,
  severity: CommandBrokerApprovalReceiptSeverity,
  code: string,
  path?: string
): void {
  findings.push({
    findingId: `command-broker-receipt-${kind}-${code.toLowerCase()}-${hashPatchObject(
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
    BROKER_RECEIPT_REQUEST_HASH_MISSING:
      "Broker receipt requires a bound request hash.",
    BROKER_RECEIPT_MODE_MISSING: "Broker receipt requires a permission mode.",
    BROKER_RECEIPT_WORKSPACE_ROOT_MISSING:
      "Broker receipt requires a workspace root reference.",
    BROKER_RECEIPT_SESSION_LEASE_MISSING:
      "Broker receipt requires a session lease reference.",
    BROKER_RECEIPT_EXPIRY_INVALID: "Broker receipt expiry is invalid.",
    BROKER_RECEIPT_EXPIRED: "Broker receipt is expired.",
    BROKER_RECEIPT_FORBIDDEN_FIELD:
      "Broker receipt contains a forbidden field.",
    BROKER_RECEIPT_EXECUTION_READINESS_TRUE:
      "Broker receipt must not claim execution readiness."
  };
  return messages[code] ?? "Command broker receipt finding.";
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}
