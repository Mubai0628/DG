import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ApprovedExpandedDesktopActionKind =
  | "click_observed_safe_target"
  | "type_into_observed_text_field";

export type ApprovedExpandedDesktopActionReceiptStatus =
  | "ready"
  | "warning"
  | "blocked";

export type ApprovedExpandedDesktopActionReceiptSeverity =
  | "info"
  | "warning"
  | "blocker";

export type ApprovedExpandedDesktopActionReceiptFindingKind =
  | "scope"
  | "action_kind"
  | "observation"
  | "target"
  | "risk"
  | "simulation"
  | "confirmation"
  | "expiry"
  | "text_policy"
  | "forbidden_field"
  | "secret_marker"
  | "raw_field"
  | "readiness";

export type ApprovedExpandedDesktopActionFinding = {
  findingId: string;
  kind: ApprovedExpandedDesktopActionReceiptFindingKind;
  severity: ApprovedExpandedDesktopActionReceiptSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ApprovedExpandedDesktopActionScope = {
  receiptId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  observationId: string;
  targetId: string;
  proposalId: string;
  riskClassificationId: string;
  simulationId: string;
  windowRef: string;
  appRef: string;
  displayRef: string;
  targetHash: string;
  allowedActionKinds: ApprovedExpandedDesktopActionKind[];
  expiresAt: string;
  typedConfirmation: string;
  maxClicks: 1;
  maxTextLength?: number | undefined;
  receiptHash: string;
};

export type ApprovedExpandedDesktopActionReadiness = {
  canEnterSafeClickContract: boolean;
  canEnterSafeTypeContract: boolean;
  canEnterFixedTauriCommand: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ApprovedExpandedDesktopActionReceipt = {
  status: ApprovedExpandedDesktopActionReceiptStatus;
  receiptId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  scope: ApprovedExpandedDesktopActionScope;
  typedConfirmationAccepted: boolean;
  findings: ApprovedExpandedDesktopActionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  receiptHash: string;
  readiness: ApprovedExpandedDesktopActionReadiness;
  nextAction: string;
  source: "runtime_approved_expanded_desktop_action_receipt";
  summaryOnly: true;
};

export type ApprovedExpandedDesktopActionReceiptInput = {
  scope?: Partial<ApprovedExpandedDesktopActionScope> | undefined;
  actionKind?: ApprovedExpandedDesktopActionKind | string | undefined;
  observationId?: string | undefined;
  observationObservedAt?: string | undefined;
  staleObservationThresholdMs?: number | undefined;
  targetId?: string | undefined;
  proposalId?: string | undefined;
  riskClassificationId?: string | undefined;
  simulationId?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  targetHash?: string | undefined;
  currentWindowRef?: string | undefined;
  currentAppRef?: string | undefined;
  currentDisplayRef?: string | undefined;
  currentTargetHash?: string | undefined;
  targetSensitive?: boolean | undefined;
  targetDestructive?: boolean | undefined;
  targetPasswordLike?: boolean | undefined;
  targetApiKeyLike?: boolean | undefined;
  targetPaymentLike?: boolean | undefined;
  targetSecurityPrompt?: boolean | undefined;
  allowedActionKinds?: (ApprovedExpandedDesktopActionKind | string)[] | undefined;
  expiresAt?: string | undefined;
  typedConfirmation?: string | undefined;
  maxClicks?: number | undefined;
  maxTextLength?: number | undefined;
  textLength?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovedExpandedDesktopActionReceiptValidationResult = {
  ok: boolean;
  status: ApprovedExpandedDesktopActionReceiptStatus;
  findings: ApprovedExpandedDesktopActionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: ApprovedExpandedDesktopActionReadiness;
};

type NormalizedReceiptInput = {
  receiptId: string;
  receiptIdProvided: boolean;
  actionKind: ApprovedExpandedDesktopActionKind;
  requestedActionKind: string;
  observationId: string;
  observationObservedAt?: string | undefined;
  staleObservationThresholdMs: number;
  targetId: string;
  proposalId: string;
  riskClassificationId: string;
  simulationId: string;
  windowRef: string;
  appRef: string;
  displayRef: string;
  targetHash: string;
  currentWindowRef?: string | undefined;
  currentAppRef?: string | undefined;
  currentDisplayRef?: string | undefined;
  currentTargetHash?: string | undefined;
  targetSensitive: boolean;
  targetDestructive: boolean;
  targetPasswordLike: boolean;
  targetApiKeyLike: boolean;
  targetPaymentLike: boolean;
  targetSecurityPrompt: boolean;
  allowedActionKinds: ApprovedExpandedDesktopActionKind[];
  requestedAllowedActionKinds: string[];
  expiresAt: string;
  typedConfirmation: string;
  maxClicks: number;
  maxTextLength?: number | undefined;
  textLength?: number | undefined;
  createdAt: string;
};

const SOURCE = "runtime_approved_expanded_desktop_action_receipt" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_STALE_OBSERVATION_THRESHOLD_MS = 60 * 1000;

const allowedActionKinds = new Set<ApprovedExpandedDesktopActionKind>([
  "click_observed_safe_target",
  "type_into_observed_text_field"
]);

const typedConfirmations: Record<ApprovedExpandedDesktopActionKind, string> = {
  click_observed_safe_target: "CLICK OBSERVED TARGET",
  type_into_observed_text_field: "TYPE INTO OBSERVED FIELD"
};

const unsupportedActionMarkers = [
  "clipboard",
  "file_dialog",
  "file dialog",
  "drag",
  "drop",
  "select_option",
  "keyboard_shortcut",
  "scroll",
  "wait_for_state",
  "multi_step",
  "background",
  "hidden"
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
    "rawTargetText",
    "targetText",
    "clipboardContent",
    "clipboardOperation",
    "writeClipboard",
    "fileDialogOperation",
    "openFileDialog",
    "fileDialogPath",
    "dragDropOperation",
    "rawCoordinates",
    "coordinates",
    "clickX",
    "clickY",
    "screenX",
    "screenY",
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
    "canWriteClipboard",
    "canOpenFileDialog",
    "canUseClipboard",
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
  "SCREENSHOT_BYTES",
  "RAW_OCR",
  "RAW_UI_TEXT",
  "RAW_TARGET_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF",
  "CLIPBOARD_CONTENT"
];

export function buildApprovedExpandedDesktopActionReceipt(
  input: ApprovedExpandedDesktopActionReceiptInput = {}
): ApprovedExpandedDesktopActionReceipt {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const receiptHash = stableHash({
    source: SOURCE,
    scope: {
      ...normalized,
      receiptHash: undefined,
      typedConfirmation: normalized.typedConfirmation
    }
  });
  const scope: ApprovedExpandedDesktopActionScope = {
    receiptId: normalized.receiptId,
    actionKind: normalized.actionKind,
    observationId: normalized.observationId,
    targetId: normalized.targetId,
    proposalId: normalized.proposalId,
    riskClassificationId: normalized.riskClassificationId,
    simulationId: normalized.simulationId,
    windowRef: normalized.windowRef,
    appRef: normalized.appRef,
    displayRef: normalized.displayRef,
    targetHash: normalized.targetHash,
    allowedActionKinds: normalized.allowedActionKinds,
    expiresAt: normalized.expiresAt,
    typedConfirmation: normalized.typedConfirmation,
    maxClicks: 1,
    ...(normalized.maxTextLength !== undefined
      ? { maxTextLength: normalized.maxTextLength }
      : {}),
    receiptHash
  };
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: ApprovedExpandedDesktopActionReceiptStatus =
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
    readiness: disabledReadiness(status === "ready", normalized.actionKind),
    nextAction: nextActionFor(status),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateApprovedExpandedDesktopActionReceipt(
  input: ApprovedExpandedDesktopActionReceiptInput = {}
): ApprovedExpandedDesktopActionReceiptValidationResult {
  const receipt = buildApprovedExpandedDesktopActionReceipt(input);
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

export function summarizeApprovedExpandedDesktopActionReceipt(
  receipt: ApprovedExpandedDesktopActionReceipt
): string {
  return [
    `status:${receipt.status}`,
    `action:${receipt.actionKind}`,
    `receipt:${receipt.receiptId}`,
    `observation:${receipt.scope.observationId}`,
    `target:${receipt.scope.targetId}`,
    `window:${receipt.scope.windowRef}`,
    `app:${receipt.scope.appRef}`,
    `display:${receipt.scope.displayRef}`,
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
  input: ApprovedExpandedDesktopActionReceiptInput
): NormalizedReceiptInput {
  const scope = isRecord(input.scope) ? input.scope : {};
  const requestedActionKind = safeString(
    input.actionKind ?? scope.actionKind,
    ""
  );
  const actionKind = isApprovedExpandedActionKind(requestedActionKind)
    ? requestedActionKind
    : "click_observed_safe_target";
  const createdAt = safeString(input.createdAt, DEFAULT_CREATED_AT);
  const allowed = normalizeAllowedActionKinds(
    input.allowedActionKinds ?? scope.allowedActionKinds
  );
  const maxTextLength = safeOptionalPositiveInteger(
    input.maxTextLength ?? scope.maxTextLength
  );
  const textLength = safeOptionalNonNegativeInteger(input.textLength);
  const maxClicks = safePositiveInteger(input.maxClicks ?? scope.maxClicks, 0);
  const base = {
    actionKind,
    requestedActionKind,
    observationId: safeString(input.observationId ?? scope.observationId, ""),
    observationObservedAt: safeOptionalString(input.observationObservedAt),
    staleObservationThresholdMs: safePositiveInteger(
      input.staleObservationThresholdMs,
      DEFAULT_STALE_OBSERVATION_THRESHOLD_MS
    ),
    targetId: safeString(input.targetId ?? scope.targetId, ""),
    proposalId: safeString(input.proposalId ?? scope.proposalId, ""),
    riskClassificationId: safeString(
      input.riskClassificationId ?? scope.riskClassificationId,
      ""
    ),
    simulationId: safeString(input.simulationId ?? scope.simulationId, ""),
    windowRef: safeString(input.windowRef ?? scope.windowRef, ""),
    appRef: safeString(input.appRef ?? scope.appRef, ""),
    displayRef: safeString(input.displayRef ?? scope.displayRef, ""),
    targetHash: safeString(input.targetHash ?? scope.targetHash, ""),
    currentWindowRef: safeOptionalString(input.currentWindowRef),
    currentAppRef: safeOptionalString(input.currentAppRef),
    currentDisplayRef: safeOptionalString(input.currentDisplayRef),
    currentTargetHash: safeOptionalString(input.currentTargetHash),
    targetSensitive: input.targetSensitive === true,
    targetDestructive: input.targetDestructive === true,
    targetPasswordLike: input.targetPasswordLike === true,
    targetApiKeyLike: input.targetApiKeyLike === true,
    targetPaymentLike: input.targetPaymentLike === true,
    targetSecurityPrompt: input.targetSecurityPrompt === true,
    allowedActionKinds: allowed.allowed,
    requestedAllowedActionKinds: allowed.requested,
    expiresAt: safeString(input.expiresAt ?? scope.expiresAt, ""),
    typedConfirmation: safeString(
      input.typedConfirmation ?? scope.typedConfirmation,
      ""
    ),
    maxClicks,
    ...(maxTextLength !== undefined ? { maxTextLength } : {}),
    ...(textLength !== undefined ? { textLength } : {}),
    createdAt
  };
  const fallbackReceiptId = `approved-expanded-action-receipt-${stableHash(
    base
  ).slice(0, 12)}`;
  const scopedReceiptId = safeOptionalString(scope.receiptId);
  return {
    receiptId:
      scopedReceiptId ?? input.idGenerator?.() ?? fallbackReceiptId,
    receiptIdProvided: scopedReceiptId !== undefined,
    ...base
  };
}

function validateNormalizedInput(
  original: unknown,
  input: NormalizedReceiptInput
): ApprovedExpandedDesktopActionFinding[] {
  const findings = scanForbiddenInput(original);

  if (!isRecord((original as ApprovedExpandedDesktopActionReceiptInput).scope)) {
    add(
      findings,
      "scope",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_SCOPE_MISSING"
    );
  }
  if (!input.receiptIdProvided) {
    add(
      findings,
      "scope",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_ID_MISSING"
    );
  }
  if (!input.requestedActionKind) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_ACTION_MISSING"
    );
  } else if (!isApprovedExpandedActionKind(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_UNSUPPORTED_ACTION"
    );
  }
  if (isUnsupportedExpandedAction(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_UNSUPPORTED_ACTION"
    );
  }
  if (!input.observationId) {
    add(
      findings,
      "observation",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_OBSERVATION_MISSING"
    );
  }
  if (!input.targetId) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_MISSING"
    );
  }
  if (!input.proposalId) {
    add(
      findings,
      "scope",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_PROPOSAL_MISSING"
    );
  }
  if (!input.riskClassificationId) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_RISK_CLASSIFICATION_MISSING"
    );
  }
  if (!input.simulationId) {
    add(
      findings,
      "simulation",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_SIMULATION_MISSING"
    );
  }
  if (!input.windowRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_WINDOW_MISSING"
    );
  }
  if (!input.appRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_APP_MISSING"
    );
  }
  if (!input.displayRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_DISPLAY_MISSING"
    );
  }
  if (!input.targetHash) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_HASH_MISSING"
    );
  }
  if (input.currentWindowRef && input.currentWindowRef !== input.windowRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_WINDOW_MISMATCH"
    );
  }
  if (input.currentAppRef && input.currentAppRef !== input.appRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_APP_MISMATCH"
    );
  }
  if (input.currentDisplayRef && input.currentDisplayRef !== input.displayRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_DISPLAY_MISMATCH"
    );
  }
  if (input.currentTargetHash && input.currentTargetHash !== input.targetHash) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_HASH_MISMATCH"
    );
  }

  if (input.targetSensitive) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_SENSITIVE_TARGET"
    );
  }
  if (input.targetDestructive) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_DESTRUCTIVE_TARGET"
    );
  }
  if (input.targetPasswordLike) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_PASSWORD_FIELD"
    );
  }
  if (input.targetApiKeyLike) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_API_KEY_FIELD"
    );
  }
  if (input.targetPaymentLike) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_PAYMENT_FIELD"
    );
  }
  if (input.targetSecurityPrompt) {
    add(
      findings,
      "risk",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_SECURITY_PROMPT"
    );
  }

  if (input.allowedActionKinds.length === 0) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_ALLOWED_ACTIONS_MISSING"
    );
  }
  for (const action of input.requestedAllowedActionKinds) {
    if (!isApprovedExpandedActionKind(action)) {
      add(
        findings,
        "action_kind",
        "blocker",
        "APPROVED_EXPANDED_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED"
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
      "APPROVED_EXPANDED_ACTION_RECEIPT_ACTION_NOT_ALLOWLISTED"
    );
  }

  if (input.maxClicks !== 1) {
    add(
      findings,
      "scope",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_MAX_CLICKS_NOT_ONE"
    );
  }

  const expectedConfirmation = typedConfirmations[input.actionKind];
  if (input.typedConfirmation !== expectedConfirmation) {
    add(
      findings,
      "confirmation",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_CONFIRMATION_MISMATCH"
    );
  }

  if (input.actionKind === "type_into_observed_text_field") {
    if (input.maxTextLength === undefined) {
      add(
        findings,
        "text_policy",
        "warning",
        "APPROVED_EXPANDED_ACTION_RECEIPT_MAX_TEXT_LENGTH_MISSING"
      );
    }
    if (
      input.textLength !== undefined &&
      input.maxTextLength !== undefined &&
      input.textLength > input.maxTextLength
    ) {
      add(
        findings,
        "text_policy",
        "blocker",
        "APPROVED_EXPANDED_ACTION_RECEIPT_TEXT_TOO_LONG"
      );
    }
  }

  if (!input.expiresAt || !isValidIsoDate(input.expiresAt)) {
    add(
      findings,
      "expiry",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_EXPIRY_INVALID"
    );
  } else if (Date.parse(input.expiresAt) <= Date.parse(input.createdAt)) {
    add(
      findings,
      "expiry",
      "blocker",
      "APPROVED_EXPANDED_ACTION_RECEIPT_EXPIRED"
    );
  }

  if (input.observationObservedAt) {
    const age = ageMs(input.observationObservedAt, input.createdAt);
    if (age === undefined) {
      add(
        findings,
        "observation",
        "blocker",
        "APPROVED_EXPANDED_ACTION_RECEIPT_OBSERVATION_TIME_INVALID"
      );
    } else if (age > input.staleObservationThresholdMs) {
      add(
        findings,
        "observation",
        "blocker",
        "APPROVED_EXPANDED_ACTION_RECEIPT_STALE_OBSERVATION"
      );
    }
  }

  return dedupeFindings(findings);
}

function scanForbiddenInput(
  value: unknown
): ApprovedExpandedDesktopActionFinding[] {
  const findings: ApprovedExpandedDesktopActionFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "APPROVED_EXPANDED_ACTION_RECEIPT_FORBIDDEN_FIELD",
            safePath([...path, key].join("."))
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "APPROVED_EXPANDED_ACTION_RECEIPT_EXECUTION_READINESS_TRUE",
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
          "APPROVED_EXPANDED_ACTION_RECEIPT_SECRET_MARKER"
        );
      }
      if (rawMarkers.some((marker) => node.includes(marker))) {
        add(
          findings,
          "raw_field",
          "blocker",
          "APPROVED_EXPANDED_ACTION_RECEIPT_RAW_MARKER"
        );
      }
      if (containsSensitiveTargetMarker(node)) {
        add(
          findings,
          "risk",
          "blocker",
          "APPROVED_EXPANDED_ACTION_RECEIPT_SENSITIVE_OR_DESTRUCTIVE_TARGET"
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function add(
  findings: ApprovedExpandedDesktopActionFinding[],
  kind: ApprovedExpandedDesktopActionReceiptFindingKind,
  severity: ApprovedExpandedDesktopActionReceiptSeverity,
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
    APPROVED_EXPANDED_ACTION_RECEIPT_SCOPE_MISSING:
      "Approved expanded desktop action receipt requires a scoped action summary.",
    APPROVED_EXPANDED_ACTION_RECEIPT_ID_MISSING:
      "Receipt id is required for approved expanded desktop action receipts.",
    APPROVED_EXPANDED_ACTION_RECEIPT_ACTION_MISSING:
      "Approved expanded desktop action kind is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_UNSUPPORTED_ACTION:
      "Only single safe click and single safe type expanded actions are allowed.",
    APPROVED_EXPANDED_ACTION_RECEIPT_OBSERVATION_MISSING:
      "Desktop observation id is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_MISSING:
      "Observed target id is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_PROPOSAL_MISSING:
      "Expanded desktop action proposal id is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_RISK_CLASSIFICATION_MISSING:
      "Risk classification id is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_SIMULATION_MISSING:
      "Sequence simulation id is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_WINDOW_MISSING:
      "Observed target window ref is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_APP_MISSING:
      "Observed target app ref is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_DISPLAY_MISSING:
      "Observed target display ref is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_HASH_MISSING:
      "Observed target hash is required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_WINDOW_MISMATCH:
      "Current window ref does not match the approved target.",
    APPROVED_EXPANDED_ACTION_RECEIPT_APP_MISMATCH:
      "Current app ref does not match the approved target.",
    APPROVED_EXPANDED_ACTION_RECEIPT_DISPLAY_MISMATCH:
      "Current display ref does not match the approved target.",
    APPROVED_EXPANDED_ACTION_RECEIPT_TARGET_HASH_MISMATCH:
      "Current target hash does not match the approved target.",
    APPROVED_EXPANDED_ACTION_RECEIPT_SENSITIVE_TARGET:
      "Sensitive targets are blocked for approved expanded desktop actions.",
    APPROVED_EXPANDED_ACTION_RECEIPT_DESTRUCTIVE_TARGET:
      "Destructive targets are blocked for approved expanded desktop actions.",
    APPROVED_EXPANDED_ACTION_RECEIPT_PASSWORD_FIELD:
      "Password-like fields are blocked.",
    APPROVED_EXPANDED_ACTION_RECEIPT_API_KEY_FIELD:
      "API key fields are blocked.",
    APPROVED_EXPANDED_ACTION_RECEIPT_PAYMENT_FIELD:
      "Payment fields are blocked.",
    APPROVED_EXPANDED_ACTION_RECEIPT_SECURITY_PROMPT:
      "System security prompts are blocked.",
    APPROVED_EXPANDED_ACTION_RECEIPT_ALLOWED_ACTIONS_MISSING:
      "Allowed expanded action kinds are required.",
    APPROVED_EXPANDED_ACTION_RECEIPT_ALLOWED_ACTION_UNSUPPORTED:
      "Allowed action kinds must stay within the narrow click/type lane.",
    APPROVED_EXPANDED_ACTION_RECEIPT_ACTION_NOT_ALLOWLISTED:
      "Receipt action kind must appear in allowedActionKinds.",
    APPROVED_EXPANDED_ACTION_RECEIPT_MAX_CLICKS_NOT_ONE:
      "Approved expanded desktop actions allow exactly one click.",
    APPROVED_EXPANDED_ACTION_RECEIPT_CONFIRMATION_MISMATCH:
      "Typed confirmation does not exactly match the approved expanded action.",
    APPROVED_EXPANDED_ACTION_RECEIPT_MAX_TEXT_LENGTH_MISSING:
      "Type receipts should include a maximum text length.",
    APPROVED_EXPANDED_ACTION_RECEIPT_TEXT_TOO_LONG:
      "Type text length exceeds the approved maximum text length.",
    APPROVED_EXPANDED_ACTION_RECEIPT_EXPIRY_INVALID:
      "Receipt expiry is missing or invalid.",
    APPROVED_EXPANDED_ACTION_RECEIPT_EXPIRED:
      "Receipt is expired and must fail closed.",
    APPROVED_EXPANDED_ACTION_RECEIPT_OBSERVATION_TIME_INVALID:
      "Observation timestamp is invalid.",
    APPROVED_EXPANDED_ACTION_RECEIPT_STALE_OBSERVATION:
      "Observation evidence is stale for approved expanded desktop action execution.",
    APPROVED_EXPANDED_ACTION_RECEIPT_FORBIDDEN_FIELD:
      "Receipt input contains a forbidden raw, secret, clipboard, file dialog, drag/drop, command, or execution field.",
    APPROVED_EXPANDED_ACTION_RECEIPT_EXECUTION_READINESS_TRUE:
      "Receipt input attempted to enable broad desktop execution readiness.",
    APPROVED_EXPANDED_ACTION_RECEIPT_SECRET_MARKER:
      "Receipt input contains a secret-like marker and must fail closed.",
    APPROVED_EXPANDED_ACTION_RECEIPT_RAW_MARKER:
      "Receipt input contains a raw desktop, prompt, source, or response marker.",
    APPROVED_EXPANDED_ACTION_RECEIPT_SENSITIVE_OR_DESTRUCTIVE_TARGET:
      "Receipt input references sensitive or destructive target text."
  };
  return messages[code] ?? "Approved expanded desktop action receipt finding.";
}

function normalizeAllowedActionKinds(value: unknown): {
  allowed: ApprovedExpandedDesktopActionKind[];
  requested: string[];
} {
  if (!Array.isArray(value)) {
    return { allowed: [], requested: [] };
  }
  const requested = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return {
    allowed: [...new Set(requested.filter(isApprovedExpandedActionKind))],
    requested
  };
}

function isApprovedExpandedActionKind(
  value: unknown
): value is ApprovedExpandedDesktopActionKind {
  return (
    typeof value === "string" &&
    allowedActionKinds.has(value as ApprovedExpandedDesktopActionKind)
  );
}

function isUnsupportedExpandedAction(value: string): boolean {
  const normalized = value.toLowerCase();
  return unsupportedActionMarkers.some((marker) => normalized.includes(marker));
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

function safeOptionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function safeOptionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
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

function containsSensitiveTargetMarker(value: string): boolean {
  return /\b(password|api key|token field|payment|credit card|delete|submit|send|transfer|security prompt|destructive)\b/i.test(
    value
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
  findings: ApprovedExpandedDesktopActionFinding[]
): ApprovedExpandedDesktopActionFinding[] {
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
  findings: ApprovedExpandedDesktopActionFinding[],
  severity: ApprovedExpandedDesktopActionReceiptSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function nextActionFor(
  status: ApprovedExpandedDesktopActionReceiptStatus
): string {
  if (status === "blocked") {
    return "Fix receipt blockers before any safe click/type contract can consume it.";
  }
  if (status === "warning") {
    return "Review warning findings; receipt remains summary-only and does not execute desktop actions.";
  }
  return "Receipt is ready for the next safe click/type contract step; this helper does not execute desktop actions.";
}

function disabledReadiness(
  ready: boolean,
  actionKind: ApprovedExpandedDesktopActionKind
): ApprovedExpandedDesktopActionReadiness {
  return {
    canEnterSafeClickContract:
      ready && actionKind === "click_observed_safe_target",
    canEnterSafeTypeContract:
      ready && actionKind === "type_into_observed_text_field",
    canEnterFixedTauriCommand: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canDragDrop: false,
    canWriteClipboard: false,
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
