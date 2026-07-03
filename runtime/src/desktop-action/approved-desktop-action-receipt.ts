import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ApprovedDesktopActionKind =
  | "focus_observed_window"
  | "raise_observed_window"
  | "activate_observed_window";

export type ApprovedDesktopActionReceiptStatus =
  | "ready"
  | "warning"
  | "blocked";

export type ApprovedDesktopActionReceiptSeverity =
  | "info"
  | "warning"
  | "blocker";

export type ApprovedDesktopActionReceiptFindingKind =
  | "scope"
  | "action_kind"
  | "evidence"
  | "target"
  | "risk"
  | "confirmation"
  | "expiry"
  | "sensitive_target"
  | "forbidden_field"
  | "secret_marker"
  | "raw_field"
  | "readiness";

export type ApprovedDesktopActionReceiptFinding = {
  findingId: string;
  kind: ApprovedDesktopActionReceiptFindingKind;
  severity: ApprovedDesktopActionReceiptSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ApprovedDesktopActionScope = {
  receiptId: string;
  actionKind: ApprovedDesktopActionKind;
  observerEvidenceId: string;
  desktopActionProposalId: string;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  riskClassificationId: string;
  allowedActionKinds: ApprovedDesktopActionKind[];
  expiresAt: string;
  typedConfirmation: string;
  receiptHash: string;
};

export type ApprovedDesktopActionReceiptReadiness = {
  canEnterApprovedDesktopActionCommand: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ApprovedDesktopActionReceipt = {
  status: ApprovedDesktopActionReceiptStatus;
  receiptId: string;
  actionKind: ApprovedDesktopActionKind;
  scope: ApprovedDesktopActionScope;
  typedConfirmationAccepted: boolean;
  findings: ApprovedDesktopActionReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  receiptHash: string;
  readiness: ApprovedDesktopActionReceiptReadiness;
  nextAction: string;
  source: "runtime_approved_desktop_action_receipt";
  summaryOnly: true;
};

export type ApprovedDesktopActionReceiptInput = {
  scope?: Partial<ApprovedDesktopActionScope> | undefined;
  actionKind?: ApprovedDesktopActionKind | string | undefined;
  observerEvidenceId?: string | undefined;
  observerEvidenceObservedAt?: string | undefined;
  staleEvidenceThresholdMs?: number | undefined;
  desktopActionProposalId?: string | undefined;
  targetWindowRef?: string | undefined;
  targetAppRef?: string | undefined;
  targetDisplayRef?: string | undefined;
  targetSensitiveKind?: string | undefined;
  sensitiveTargetBlocked?: boolean | undefined;
  riskClassificationId?: string | undefined;
  allowedActionKinds?: (ApprovedDesktopActionKind | string)[] | undefined;
  expiresAt?: string | undefined;
  typedConfirmation?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovedDesktopActionReceiptValidationResult = {
  ok: boolean;
  status: ApprovedDesktopActionReceiptStatus;
  findings: ApprovedDesktopActionReceiptFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: ApprovedDesktopActionReceiptReadiness;
};

type NormalizedReceiptInput = {
  receiptId: string;
  actionKind: ApprovedDesktopActionKind;
  requestedActionKind: string;
  observerEvidenceId: string;
  observerEvidenceObservedAt?: string | undefined;
  staleEvidenceThresholdMs: number;
  desktopActionProposalId: string;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  targetSensitiveKind?: string | undefined;
  sensitiveTargetBlocked: boolean;
  riskClassificationId: string;
  allowedActionKinds: ApprovedDesktopActionKind[];
  requestedAllowedActionKinds: string[];
  expiresAt: string;
  typedConfirmation: string;
  createdAt: string;
};

const SOURCE = "runtime_approved_desktop_action_receipt" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_STALE_EVIDENCE_THRESHOLD_MS = 5 * 60 * 1000;

const allowedActionKinds = new Set<ApprovedDesktopActionKind>([
  "focus_observed_window",
  "raise_observed_window",
  "activate_observed_window"
]);

const typedConfirmations: Record<ApprovedDesktopActionKind, string> = {
  focus_observed_window: "FOCUS OBSERVED WINDOW",
  raise_observed_window: "RAISE OBSERVED WINDOW",
  activate_observed_window: "ACTIVATE OBSERVED WINDOW"
};

const broadActionMarkers = [
  "click",
  "type",
  "select",
  "drag",
  "drop",
  "clipboard",
  "paste",
  "copy",
  "file_dialog",
  "file dialog",
  "open_file",
  "choose_file"
];

const forbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "env",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    "rawKey",
    "rawPrompt",
    "promptText",
    "rawResponse",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    "rawSource",
    "rawDiff",
    "rawPatch",
    "rawDom",
    "rawCsv",
    "rawScreenshot",
    "screenshotBytes",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "clipboardContent",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    "stdout",
    "stderr",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools",
    "tool_choice",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map(normalizeFieldName)
);

const executionReadinessFields = new Set(
  [
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canDragDrop",
    "canUseClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "desktopActionExecute",
    "clickNow",
    "typeNow",
    "executeNow"
  ].map(normalizeFieldName)
);

const rawMarkers = [
  "RAW_SCREENSHOT",
  "RAW_OCR",
  "RAW_UI_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

export function buildApprovedDesktopActionReceipt(
  input: ApprovedDesktopActionReceiptInput = {}
): ApprovedDesktopActionReceipt {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const receiptHash = stableHash({
    source: SOURCE,
    scope: {
      ...normalized,
      receiptHash: undefined
    }
  });
  const scope: ApprovedDesktopActionScope = {
    receiptId: normalized.receiptId,
    actionKind: normalized.actionKind,
    observerEvidenceId: normalized.observerEvidenceId,
    desktopActionProposalId: normalized.desktopActionProposalId,
    targetWindowRef: normalized.targetWindowRef,
    targetAppRef: normalized.targetAppRef,
    ...(normalized.targetDisplayRef
      ? { targetDisplayRef: normalized.targetDisplayRef }
      : {}),
    riskClassificationId: normalized.riskClassificationId,
    allowedActionKinds: normalized.allowedActionKinds,
    expiresAt: normalized.expiresAt,
    typedConfirmation: normalized.typedConfirmation,
    receiptHash
  };
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: ApprovedDesktopActionReceiptStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";
  const typedConfirmationAccepted =
    normalized.typedConfirmation === typedConfirmations[normalized.actionKind];

  return {
    status,
    receiptId: normalized.receiptId,
    actionKind: normalized.actionKind,
    scope,
    typedConfirmationAccepted,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    receiptHash,
    readiness: disabledReadiness(status === "ready"),
    nextAction: nextActionFor(status),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateApprovedDesktopActionReceipt(
  input: ApprovedDesktopActionReceiptInput = {}
): ApprovedDesktopActionReceiptValidationResult {
  const receipt = buildApprovedDesktopActionReceipt(input);
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

export function summarizeApprovedDesktopActionReceipt(
  receipt: ApprovedDesktopActionReceipt
): string {
  return [
    `status:${receipt.status}`,
    `action:${receipt.actionKind}`,
    `receipt:${receipt.receiptId}`,
    `evidence:${receipt.scope.observerEvidenceId}`,
    `window:${receipt.scope.targetWindowRef}`,
    `app:${receipt.scope.targetAppRef}`,
    `allowed_actions:${receipt.scope.allowedActionKinds.length}`,
    `confirmation:${receipt.typedConfirmationAccepted ? "accepted" : "blocked"}`,
    `blockers:${receipt.blockerCount}`,
    `warnings:${receipt.warningCount}`,
    `hash:${receipt.receiptHash.slice(0, 12)}`,
    "summary_only:true",
    "desktop_execution:false",
    "app_execution:false"
  ].join(" | ");
}

function normalizeInput(
  input: ApprovedDesktopActionReceiptInput
): NormalizedReceiptInput {
  const scope = isRecord(input.scope) ? input.scope : {};
  const requestedActionKind = safeString(
    input.actionKind ?? scope.actionKind,
    ""
  );
  const actionKind = isApprovedActionKind(requestedActionKind)
    ? requestedActionKind
    : "focus_observed_window";
  const createdAt = safeString(input.createdAt, DEFAULT_CREATED_AT);
  const allowed = normalizeAllowedActionKinds(
    input.allowedActionKinds ?? scope.allowedActionKinds
  );
  const base = {
    actionKind,
    requestedActionKind,
    observerEvidenceId: safeString(
      input.observerEvidenceId ?? scope.observerEvidenceId,
      ""
    ),
    observerEvidenceObservedAt: safeOptionalString(
      input.observerEvidenceObservedAt ??
        (scope as Record<string, unknown>).observerEvidenceObservedAt
    ),
    staleEvidenceThresholdMs: safePositiveInteger(
      input.staleEvidenceThresholdMs,
      DEFAULT_STALE_EVIDENCE_THRESHOLD_MS
    ),
    desktopActionProposalId: safeString(
      input.desktopActionProposalId ?? scope.desktopActionProposalId,
      ""
    ),
    targetWindowRef: safeString(
      input.targetWindowRef ?? scope.targetWindowRef,
      ""
    ),
    targetAppRef: safeString(input.targetAppRef ?? scope.targetAppRef, ""),
    targetDisplayRef: safeOptionalString(
      input.targetDisplayRef ?? scope.targetDisplayRef
    ),
    targetSensitiveKind: safeOptionalString(input.targetSensitiveKind),
    sensitiveTargetBlocked: input.sensitiveTargetBlocked === true,
    riskClassificationId: safeString(
      input.riskClassificationId ?? scope.riskClassificationId,
      ""
    ),
    allowedActionKinds: allowed.allowed,
    requestedAllowedActionKinds: allowed.requested,
    expiresAt: safeString(input.expiresAt ?? scope.expiresAt, ""),
    typedConfirmation: safeString(
      input.typedConfirmation ?? scope.typedConfirmation,
      ""
    ),
    createdAt
  };
  const fallbackReceiptId = `approved-desktop-action-receipt-${stableHash(
    base
  ).slice(0, 12)}`;
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
): ApprovedDesktopActionReceiptFinding[] {
  const findings = scanForbiddenInput(original);

  if (!isRecord((original as ApprovedDesktopActionReceiptInput).scope)) {
    add(
      findings,
      "scope",
      "warning",
      "APPROVED_DESKTOP_ACTION_RECEIPT_SCOPE_INLINE"
    );
  }

  if (!input.requestedActionKind) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_ACTION_MISSING"
    );
  } else if (!isApprovedActionKind(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_UNSUPPORTED_ACTION"
    );
  }
  if (isBroadActionKind(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_BROAD_ACTION_BLOCKED"
    );
  }

  if (!input.observerEvidenceId) {
    add(
      findings,
      "evidence",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_EVIDENCE_MISSING"
    );
  }
  if (!input.desktopActionProposalId) {
    add(
      findings,
      "scope",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_PROPOSAL_MISSING"
    );
  }
  if (!input.riskClassificationId) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_RISK_CLASSIFICATION_MISSING"
    );
  }
  if (!input.targetWindowRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_WINDOW_MISSING"
    );
  }
  if (!input.targetAppRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_APP_MISSING"
    );
  }
  if (input.targetSensitiveKind && !input.sensitiveTargetBlocked) {
    add(
      findings,
      "sensitive_target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_SENSITIVE_TARGET_BLOCKED"
    );
  }

  if (input.allowedActionKinds.length === 0) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_ALLOWED_ACTIONS_MISSING"
    );
  }
  for (const action of input.requestedAllowedActionKinds) {
    if (!isApprovedActionKind(action)) {
      add(
        findings,
        "action_kind",
        "blocker",
        "APPROVED_DESKTOP_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED"
      );
    }
    if (isBroadActionKind(action)) {
      add(
        findings,
        "action_kind",
        "blocker",
        "APPROVED_DESKTOP_ACTION_RECEIPT_BROAD_ACTION_BLOCKED"
      );
    }
  }
  if (
    input.allowedActionKinds.length > 0 &&
    !input.allowedActionKinds.includes(input.actionKind)
  ) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_ACTION_NOT_ALLOWLISTED"
    );
  }

  const expectedConfirmation = typedConfirmations[input.actionKind];
  if (input.typedConfirmation !== expectedConfirmation) {
    add(
      findings,
      "confirmation",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_CONFIRMATION_MISMATCH"
    );
  }

  if (!input.expiresAt || !isValidIsoDate(input.expiresAt)) {
    add(
      findings,
      "expiry",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_EXPIRY_INVALID"
    );
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(
      findings,
      "expiry",
      "blocker",
      "APPROVED_DESKTOP_ACTION_RECEIPT_EXPIRED"
    );
  }

  if (input.observerEvidenceObservedAt) {
    const age = ageMs(input.observerEvidenceObservedAt, input.createdAt);
    if (age === undefined) {
      add(
        findings,
        "evidence",
        "blocker",
        "APPROVED_DESKTOP_ACTION_RECEIPT_EVIDENCE_TIME_INVALID"
      );
    } else if (age > input.staleEvidenceThresholdMs) {
      add(
        findings,
        "evidence",
        "blocker",
        "APPROVED_DESKTOP_ACTION_RECEIPT_STALE_EVIDENCE"
      );
    }
  }

  return dedupeFindings(findings);
}

function scanForbiddenInput(
  value: unknown
): ApprovedDesktopActionReceiptFinding[] {
  const findings: ApprovedDesktopActionReceiptFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "APPROVED_DESKTOP_ACTION_RECEIPT_FORBIDDEN_FIELD",
            safePath([...path, key].join("."))
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "APPROVED_DESKTOP_ACTION_RECEIPT_EXECUTION_READINESS_TRUE",
            safePath([...path, key].join("."))
          );
        }
      }
    }
    if (typeof node === "string") {
      if (containsSecretLikeMarker(node)) {
        add(
          findings,
          "secret_marker",
          "blocker",
          "APPROVED_DESKTOP_ACTION_RECEIPT_SECRET_MARKER"
        );
      }
      if (rawMarkers.some((marker) => node.includes(marker))) {
        add(
          findings,
          "raw_field",
          "blocker",
          "APPROVED_DESKTOP_ACTION_RECEIPT_RAW_MARKER"
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function add(
  findings: ApprovedDesktopActionReceiptFinding[],
  kind: ApprovedDesktopActionReceiptFindingKind,
  severity: ApprovedDesktopActionReceiptSeverity,
  code: string,
  path?: string
): void {
  findings.push({
    findingId: stableHash({ kind, severity, code, path: path || "" }).slice(
      0,
      16
    ),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    ...(path ? { path } : {})
  });
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    APPROVED_DESKTOP_ACTION_RECEIPT_SCOPE_INLINE:
      "Receipt used inline scope fields; nested scope is preferred for future command handoff.",
    APPROVED_DESKTOP_ACTION_RECEIPT_ACTION_MISSING:
      "Approved desktop action kind is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_UNSUPPORTED_ACTION:
      "Only observed-window focus, raise, and activate actions are allowed.",
    APPROVED_DESKTOP_ACTION_RECEIPT_BROAD_ACTION_BLOCKED:
      "Click, type, select, clipboard, drag/drop, and file-dialog actions are blocked.",
    APPROVED_DESKTOP_ACTION_RECEIPT_EVIDENCE_MISSING:
      "Observer evidence id is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_PROPOSAL_MISSING:
      "Desktop action proposal id is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_RISK_CLASSIFICATION_MISSING:
      "Risk classification id is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_WINDOW_MISSING:
      "Target window ref is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_TARGET_APP_MISSING:
      "Target app ref is required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_SENSITIVE_TARGET_BLOCKED:
      "Sensitive desktop targets must fail closed before an approval receipt can be ready.",
    APPROVED_DESKTOP_ACTION_RECEIPT_ALLOWED_ACTIONS_MISSING:
      "Allowed action kinds are required.",
    APPROVED_DESKTOP_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED:
      "Allowed action kinds must stay within the observed-window action lane.",
    APPROVED_DESKTOP_ACTION_RECEIPT_ACTION_NOT_ALLOWLISTED:
      "Receipt action kind must appear in allowedActionKinds.",
    APPROVED_DESKTOP_ACTION_RECEIPT_CONFIRMATION_MISMATCH:
      "Typed confirmation does not exactly match the approved desktop action.",
    APPROVED_DESKTOP_ACTION_RECEIPT_EXPIRY_INVALID:
      "Receipt expiry is missing or invalid.",
    APPROVED_DESKTOP_ACTION_RECEIPT_EXPIRED:
      "Receipt is expired and must fail closed.",
    APPROVED_DESKTOP_ACTION_RECEIPT_EVIDENCE_TIME_INVALID:
      "Observer evidence timestamp is invalid.",
    APPROVED_DESKTOP_ACTION_RECEIPT_STALE_EVIDENCE:
      "Observer evidence is stale for approved desktop action execution.",
    APPROVED_DESKTOP_ACTION_RECEIPT_FORBIDDEN_FIELD:
      "Receipt input contains a forbidden raw, secret, execution, or tool field.",
    APPROVED_DESKTOP_ACTION_RECEIPT_EXECUTION_READINESS_TRUE:
      "Receipt input attempted to enable broad desktop action readiness.",
    APPROVED_DESKTOP_ACTION_RECEIPT_SECRET_MARKER:
      "Receipt input contains a secret-like marker and must fail closed.",
    APPROVED_DESKTOP_ACTION_RECEIPT_RAW_MARKER:
      "Receipt input contains a raw desktop, prompt, source, or response marker."
  };
  return messages[code] ?? "Approved desktop action receipt finding.";
}

function normalizeAllowedActionKinds(value: unknown): {
  allowed: ApprovedDesktopActionKind[];
  requested: string[];
} {
  if (!Array.isArray(value)) {
    return { allowed: [], requested: [] };
  }
  const requested = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return {
    allowed: [...new Set(requested.filter(isApprovedActionKind))],
    requested
  };
}

function isApprovedActionKind(
  value: unknown
): value is ApprovedDesktopActionKind {
  return (
    typeof value === "string" &&
    allowedActionKinds.has(value as ApprovedDesktopActionKind)
  );
}

function isBroadActionKind(value: string): boolean {
  const normalized = value.toLowerCase();
  return broadActionMarkers.some((marker) => normalized.includes(marker));
}

function ageMs(
  observedAt: string | undefined,
  createdAt: string | undefined
): number | undefined {
  if (!observedAt || !createdAt) {
    return undefined;
  }
  const observed = Date.parse(observedAt);
  const current = Date.parse(createdAt);
  if (!Number.isFinite(observed) || !Number.isFinite(current)) {
    return undefined;
  }
  return current - observed;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /\b(DEEPSEEK_API_KEY|OPENAI_API_KEY|PASSWORD_VALUE_MARKER)\b/.test(value) ||
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
  findings: ApprovedDesktopActionReceiptFinding[]
): ApprovedDesktopActionReceiptFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countSeverity(
  findings: ApprovedDesktopActionReceiptFinding[],
  severity: ApprovedDesktopActionReceiptSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function nextActionFor(status: ApprovedDesktopActionReceiptStatus): string {
  if (status === "blocked") {
    return "Fix receipt blockers before any future fixed approved desktop action command can consume it.";
  }
  if (status === "warning") {
    return "Review warning findings; this receipt still does not enable broad desktop action execution.";
  }
  return "Receipt is ready for a future fixed observed-window command, but this helper does not execute desktop actions.";
}

function disabledReadiness(
  canEnterApprovedDesktopActionCommand: boolean
): ApprovedDesktopActionReceiptReadiness {
  return {
    canEnterApprovedDesktopActionCommand,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canDragDrop: false,
    canUseClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function stableHash(value: unknown): string {
  return stablePreviewHash(stableStringify(value));
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
  if (typeof value === "function") {
    return JSON.stringify("[function]");
  }
  return JSON.stringify(value);
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function safePath(value: string): string {
  return value.replace(/[^\w.[\]-]/g, "_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
