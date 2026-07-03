import { stablePreviewHash } from "../models/stable-preview-hash.js";
import type {
  ApprovedDesktopActionKind,
  ApprovedDesktopActionReceipt
} from "./approved-desktop-action-receipt.js";

export type ApprovedDesktopActionExecutionMode =
  | "disabled"
  | "dry_run"
  | "explicit_approved_desktop_action";

export type ApprovedDesktopActionExecutionStatus =
  | "disabled"
  | "dry_run"
  | "planned"
  | "warning"
  | "blocked";

export type ApprovedDesktopActionExecutionSeverity =
  | "info"
  | "warning"
  | "blocker";

export type ApprovedDesktopActionExecutionFindingKind =
  | "mode"
  | "receipt"
  | "proposal"
  | "target"
  | "evidence"
  | "risk"
  | "sensitive_target"
  | "action_kind"
  | "event_preview"
  | "forbidden_field"
  | "secret_marker"
  | "raw_field"
  | "readiness";

export type ApprovedDesktopActionExecutionFinding = {
  findingId: string;
  kind: ApprovedDesktopActionExecutionFindingKind;
  severity: ApprovedDesktopActionExecutionSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ApprovedDesktopActionProposalExecutionSummary = {
  proposalId?: string | undefined;
  actionKind?: ApprovedDesktopActionKind | string | undefined;
  targetWindowRef?: string | undefined;
  targetAppRef?: string | undefined;
  targetDisplayRef?: string | undefined;
  observerEvidenceId?: string | undefined;
};

export type ApprovedDesktopActionTargetMetadataSummary = {
  targetWindowRef?: string | undefined;
  targetAppRef?: string | undefined;
  targetDisplayRef?: string | undefined;
  observedAt?: string | undefined;
  sensitiveKind?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type ApprovedDesktopActionObserverEvidenceSummary = {
  observerEvidenceId?: string | undefined;
  observedAt?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type ApprovedDesktopActionRiskSummary = {
  riskClassificationId?: string | undefined;
  actionKind?: ApprovedDesktopActionKind | string | undefined;
  riskLevel?: string | undefined;
  sensitiveTargetBlocked?: boolean | undefined;
  warningCodes?: string[] | undefined;
};

export type ApprovedDesktopActionExecutionInput = {
  receipt?: ApprovedDesktopActionReceipt | undefined;
  desktopActionProposalSummary?:
    | ApprovedDesktopActionProposalExecutionSummary
    | undefined;
  targetMetadata?: ApprovedDesktopActionTargetMetadataSummary | undefined;
  observerEvidenceSummary?:
    | ApprovedDesktopActionObserverEvidenceSummary
    | undefined;
  riskSummary?: ApprovedDesktopActionRiskSummary | undefined;
  executionMode: ApprovedDesktopActionExecutionMode | string;
  staleTargetThresholdMs?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovedDesktopActionExecutionPlan = {
  actionId: string;
  actionKind: ApprovedDesktopActionKind;
  receiptId?: string | undefined;
  desktopActionProposalId?: string | undefined;
  riskClassificationId?: string | undefined;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId?: string | undefined;
  executionMode: ApprovedDesktopActionExecutionMode;
  plannedOnly: true;
  summaryOnly: true;
  planHash: string;
};

export type ApprovedDesktopActionExecutionEventPreview = {
  notWritten: true;
  wouldWriteSummaryEvent: false;
  eventKind: "approved_desktop_action_execution_summary";
  rawMetadataIncluded: false;
  rawDesktopCaptureIncluded: false;
  actionArgsIncluded: false;
};

export type ApprovedDesktopActionExecutionReadiness = {
  canEnterFixedDesktopActionCommand: boolean;
  canCallTauriCommand: false;
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

export type ApprovedDesktopActionExecutionResult = {
  status: ApprovedDesktopActionExecutionStatus;
  actionId: string;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  executionMode: ApprovedDesktopActionExecutionMode;
  plannedOnly: true;
  plan?: ApprovedDesktopActionExecutionPlan | undefined;
  eventPreview: ApprovedDesktopActionExecutionEventPreview;
  findings: ApprovedDesktopActionExecutionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  resultHash: string;
  readiness: ApprovedDesktopActionExecutionReadiness;
  nextAction: string;
  source: "runtime_approved_desktop_action_execution";
  summaryOnly: true;
};

export type ApprovedDesktopActionExecutionValidationResult = {
  ok: boolean;
  status: ApprovedDesktopActionExecutionStatus;
  findings: ApprovedDesktopActionExecutionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: ApprovedDesktopActionExecutionReadiness;
};

type NormalizedInput = {
  receipt?: ApprovedDesktopActionReceipt | undefined;
  actionKind: ApprovedDesktopActionKind;
  requestedActionKind: string;
  receiptId?: string | undefined;
  desktopActionProposalId?: string | undefined;
  riskClassificationId?: string | undefined;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId?: string | undefined;
  executionMode: ApprovedDesktopActionExecutionMode;
  requestedExecutionMode: string;
  createdAt: string;
  targetObservedAt?: string | undefined;
  evidenceObservedAt?: string | undefined;
  targetSensitiveKind?: string | undefined;
  sensitiveTargetBlocked: boolean;
  staleTargetThresholdMs: number;
};

const SOURCE = "runtime_approved_desktop_action_execution" as const;
const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_STALE_TARGET_THRESHOLD_MS = 5 * 60 * 1000;
const allowedActionKinds = new Set<ApprovedDesktopActionKind>([
  "focus_observed_window",
  "raise_observed_window",
  "activate_observed_window"
]);
const executionModes = new Set<ApprovedDesktopActionExecutionMode>([
  "disabled",
  "dry_run",
  "explicit_approved_desktop_action"
]);
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
    "canCallTauriCommand",
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

export function buildApprovedDesktopActionExecutionPlan(
  input: ApprovedDesktopActionExecutionInput
): ApprovedDesktopActionExecutionResult {
  const normalized = normalizeInput(input);
  const findings = validateNormalizedInput(input, normalized);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status = statusFor(
    normalized.executionMode,
    blockerCount,
    warningCount
  );
  const actionCore = {
    source: SOURCE,
    actionKind: normalized.actionKind,
    receiptId: normalized.receiptId,
    desktopActionProposalId: normalized.desktopActionProposalId,
    riskClassificationId: normalized.riskClassificationId,
    targetWindowRef: normalized.targetWindowRef,
    targetAppRef: normalized.targetAppRef,
    targetDisplayRef: normalized.targetDisplayRef,
    observerEvidenceId: normalized.observerEvidenceId,
    executionMode: normalized.executionMode,
    plannedOnly: true
  };
  const resultHash = stableHash({
    ...actionCore,
    status,
    blockerCodes: findings
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code),
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code)
  });
  const actionId =
    input.idGenerator?.() ||
    `approved-desktop-action-${resultHash.slice(0, 12)}`;
  const planHash = stableHash({ ...actionCore, actionId });
  const plan: ApprovedDesktopActionExecutionPlan = {
    actionId,
    actionKind: normalized.actionKind,
    ...(normalized.receiptId ? { receiptId: normalized.receiptId } : {}),
    ...(normalized.desktopActionProposalId
      ? { desktopActionProposalId: normalized.desktopActionProposalId }
      : {}),
    ...(normalized.riskClassificationId
      ? { riskClassificationId: normalized.riskClassificationId }
      : {}),
    targetWindowRef: normalized.targetWindowRef,
    targetAppRef: normalized.targetAppRef,
    ...(normalized.targetDisplayRef
      ? { targetDisplayRef: normalized.targetDisplayRef }
      : {}),
    ...(normalized.observerEvidenceId
      ? { observerEvidenceId: normalized.observerEvidenceId }
      : {}),
    executionMode: normalized.executionMode,
    plannedOnly: true,
    summaryOnly: true,
    planHash
  };

  return {
    status,
    actionId,
    actionKind: normalized.actionKind,
    targetWindowRef: normalized.targetWindowRef,
    targetAppRef: normalized.targetAppRef,
    ...(normalized.targetDisplayRef
      ? { targetDisplayRef: normalized.targetDisplayRef }
      : {}),
    executionMode: normalized.executionMode,
    plannedOnly: true,
    ...(status !== "blocked" ? { plan } : {}),
    eventPreview: {
      notWritten: true,
      wouldWriteSummaryEvent: false,
      eventKind: "approved_desktop_action_execution_summary",
      rawMetadataIncluded: false,
      rawDesktopCaptureIncluded: false,
      actionArgsIncluded: false
    },
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    resultHash,
    readiness: disabledReadiness(
      status !== "blocked" &&
        normalized.executionMode === "explicit_approved_desktop_action"
    ),
    nextAction: nextActionFor(status, normalized.executionMode),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateApprovedDesktopActionExecutionInput(
  input: ApprovedDesktopActionExecutionInput
): ApprovedDesktopActionExecutionValidationResult {
  const result = buildApprovedDesktopActionExecutionPlan(input);
  return {
    ok: result.status !== "blocked",
    status: result.status,
    findings: result.findings,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    readiness: result.readiness
  };
}

export function summarizeApprovedDesktopActionExecutionResult(
  result: ApprovedDesktopActionExecutionResult
): string {
  return [
    `status:${result.status}`,
    `action:${result.actionKind}`,
    `action_id:${result.actionId}`,
    `mode:${result.executionMode}`,
    `window:${result.targetWindowRef}`,
    `app:${result.targetAppRef}`,
    `planned_only:${result.plannedOnly}`,
    `event_not_written:${result.eventPreview.notWritten}`,
    `blockers:${result.blockerCount}`,
    `warnings:${result.warningCount}`,
    `hash:${result.resultHash.slice(0, 12)}`,
    "summary_only:true",
    "tauri_call:false",
    "desktop_execution:false",
    "event_write:false"
  ].join(" | ");
}

function normalizeInput(
  input: ApprovedDesktopActionExecutionInput
): NormalizedInput {
  const receipt = input.receipt;
  const requestedExecutionMode = safeString(input.executionMode, "");
  const executionMode = isExecutionMode(requestedExecutionMode)
    ? requestedExecutionMode
    : "disabled";
  const proposal = isRecord(input.desktopActionProposalSummary)
    ? input.desktopActionProposalSummary
    : {};
  const target = isRecord(input.targetMetadata) ? input.targetMetadata : {};
  const evidence = isRecord(input.observerEvidenceSummary)
    ? input.observerEvidenceSummary
    : {};
  const risk = isRecord(input.riskSummary) ? input.riskSummary : {};
  const requestedActionKind = safeString(
    receipt?.actionKind ?? proposal.actionKind ?? risk.actionKind,
    ""
  );
  const actionKind = isApprovedActionKind(requestedActionKind)
    ? requestedActionKind
    : "focus_observed_window";
  return {
    receipt,
    actionKind,
    requestedActionKind,
    receiptId: safeOptionalString(receipt?.receiptId),
    desktopActionProposalId: safeOptionalString(
      receipt?.scope.desktopActionProposalId ?? proposal.proposalId
    ),
    riskClassificationId: safeOptionalString(
      receipt?.scope.riskClassificationId ?? risk.riskClassificationId
    ),
    targetWindowRef: safeString(
      receipt?.scope.targetWindowRef ??
        target.targetWindowRef ??
        proposal.targetWindowRef,
      ""
    ),
    targetAppRef: safeString(
      receipt?.scope.targetAppRef ??
        target.targetAppRef ??
        proposal.targetAppRef,
      ""
    ),
    targetDisplayRef: safeOptionalString(
      receipt?.scope.targetDisplayRef ??
        target.targetDisplayRef ??
        proposal.targetDisplayRef
    ),
    observerEvidenceId: safeOptionalString(
      receipt?.scope.observerEvidenceId ??
        evidence.observerEvidenceId ??
        proposal.observerEvidenceId
    ),
    executionMode,
    requestedExecutionMode,
    createdAt: safeString(input.createdAt, DEFAULT_CREATED_AT),
    targetObservedAt: safeOptionalString(target.observedAt),
    evidenceObservedAt: safeOptionalString(evidence.observedAt),
    targetSensitiveKind: safeOptionalString(target.sensitiveKind),
    sensitiveTargetBlocked: risk.sensitiveTargetBlocked === true,
    staleTargetThresholdMs: safePositiveInteger(
      input.staleTargetThresholdMs,
      DEFAULT_STALE_TARGET_THRESHOLD_MS
    )
  };
}

function validateNormalizedInput(
  original: unknown,
  input: NormalizedInput
): ApprovedDesktopActionExecutionFinding[] {
  const findings = scanForbiddenInput(original);

  if (!input.requestedExecutionMode) {
    add(
      findings,
      "mode",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_MODE_MISSING"
    );
  } else if (!isExecutionMode(input.requestedExecutionMode)) {
    add(
      findings,
      "mode",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_MODE_UNKNOWN"
    );
  }
  if (input.executionMode === "disabled") {
    add(
      findings,
      "mode",
      "warning",
      "APPROVED_DESKTOP_ACTION_EXECUTION_DISABLED"
    );
    return dedupeFindings(findings);
  }
  if (input.executionMode === "dry_run") {
    add(
      findings,
      "mode",
      "warning",
      "APPROVED_DESKTOP_ACTION_EXECUTION_DRY_RUN"
    );
  }

  if (input.executionMode === "explicit_approved_desktop_action") {
    validateReceipt(input, findings);
  }

  if (!input.requestedActionKind) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_ACTION_MISSING"
    );
  } else if (!isApprovedActionKind(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_UNSUPPORTED_ACTION"
    );
  }
  if (isBroadActionKind(input.requestedActionKind)) {
    add(
      findings,
      "action_kind",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_BROAD_ACTION_BLOCKED"
    );
  }

  if (!input.targetWindowRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_WINDOW_MISSING"
    );
  }
  if (!input.targetAppRef) {
    add(
      findings,
      "target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_APP_MISSING"
    );
  }
  if (input.targetSensitiveKind && !input.sensitiveTargetBlocked) {
    add(
      findings,
      "sensitive_target",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_SENSITIVE_TARGET_BLOCKED"
    );
  }
  validateTargetMatches(original, input, findings);
  validateFreshness(input, findings);

  return dedupeFindings(findings);
}

function validateReceipt(
  input: NormalizedInput,
  findings: ApprovedDesktopActionExecutionFinding[]
): void {
  if (!input.receipt) {
    add(
      findings,
      "receipt",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_MISSING"
    );
    return;
  }
  if (input.receipt.status !== "ready" || input.receipt.blockerCount > 0) {
    add(
      findings,
      "receipt",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_NOT_READY"
    );
  }
  if (!input.receipt.typedConfirmationAccepted) {
    add(
      findings,
      "receipt",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_CONFIRMATION_BLOCKED"
    );
  }
  if (!input.receipt.readiness.canEnterApprovedDesktopActionCommand) {
    add(
      findings,
      "receipt",
      "blocker",
      "APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_READINESS_BLOCKED"
    );
  }
}

function validateTargetMatches(
  original: unknown,
  input: NormalizedInput,
  findings: ApprovedDesktopActionExecutionFinding[]
): void {
  const proposal = isRecord(
    (original as ApprovedDesktopActionExecutionInput)
      .desktopActionProposalSummary
  )
    ? (original as ApprovedDesktopActionExecutionInput)
        .desktopActionProposalSummary
    : undefined;
  const target = isRecord(
    (original as ApprovedDesktopActionExecutionInput).targetMetadata
  )
    ? (original as ApprovedDesktopActionExecutionInput).targetMetadata
    : undefined;
  const risk = isRecord(
    (original as ApprovedDesktopActionExecutionInput).riskSummary
  )
    ? (original as ApprovedDesktopActionExecutionInput).riskSummary
    : undefined;
  const evidence = isRecord(
    (original as ApprovedDesktopActionExecutionInput).observerEvidenceSummary
  )
    ? (original as ApprovedDesktopActionExecutionInput).observerEvidenceSummary
    : undefined;

  for (const [label, value, expected] of [
    ["proposal action kind", proposal?.actionKind, input.actionKind],
    ["risk action kind", risk?.actionKind, input.actionKind],
    [
      "proposal target window",
      proposal?.targetWindowRef,
      input.targetWindowRef
    ],
    ["metadata target window", target?.targetWindowRef, input.targetWindowRef],
    ["proposal target app", proposal?.targetAppRef, input.targetAppRef],
    ["metadata target app", target?.targetAppRef, input.targetAppRef],
    [
      "proposal target display",
      proposal?.targetDisplayRef,
      input.targetDisplayRef
    ],
    [
      "metadata target display",
      target?.targetDisplayRef,
      input.targetDisplayRef
    ],
    [
      "proposal observer evidence",
      proposal?.observerEvidenceId,
      input.observerEvidenceId
    ],
    [
      "observer evidence id",
      evidence?.observerEvidenceId,
      input.observerEvidenceId
    ],
    [
      "risk classification",
      risk?.riskClassificationId,
      input.riskClassificationId
    ]
  ] as const) {
    const stringValue = safeOptionalString(value);
    const stringExpected = safeOptionalString(expected);
    if (stringValue && stringExpected && stringValue !== stringExpected) {
      add(
        findings,
        "target",
        "blocker",
        "APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_MISMATCH",
        label
      );
    }
  }
}

function validateFreshness(
  input: NormalizedInput,
  findings: ApprovedDesktopActionExecutionFinding[]
): void {
  for (const [kind, observedAt] of [
    ["target", input.targetObservedAt],
    ["evidence", input.evidenceObservedAt]
  ] as const) {
    if (!observedAt) {
      continue;
    }
    const age = ageMs(observedAt, input.createdAt);
    if (age === undefined) {
      add(
        findings,
        kind,
        "blocker",
        "APPROVED_DESKTOP_ACTION_EXECUTION_OBSERVED_AT_INVALID"
      );
    } else if (age > input.staleTargetThresholdMs) {
      add(
        findings,
        kind,
        "blocker",
        "APPROVED_DESKTOP_ACTION_EXECUTION_STALE_TARGET"
      );
    }
  }
}

function scanForbiddenInput(
  value: unknown
): ApprovedDesktopActionExecutionFinding[] {
  const findings: ApprovedDesktopActionExecutionFinding[] = [];
  visitUnknown(value, (node, path) => {
    if (isRecord(node)) {
      for (const [key, nested] of Object.entries(node)) {
        const normalizedKey = normalizeFieldName(key);
        if (forbiddenFieldNames.has(normalizedKey)) {
          add(
            findings,
            "forbidden_field",
            "blocker",
            "APPROVED_DESKTOP_ACTION_EXECUTION_FORBIDDEN_FIELD",
            safePath([...path, key].join("."))
          );
        }
        if (executionReadinessFields.has(normalizedKey) && nested === true) {
          add(
            findings,
            "readiness",
            "blocker",
            "APPROVED_DESKTOP_ACTION_EXECUTION_READINESS_TRUE",
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
          "APPROVED_DESKTOP_ACTION_EXECUTION_SECRET_MARKER"
        );
      }
      if (rawMarkers.some((marker) => node.includes(marker))) {
        add(
          findings,
          "raw_field",
          "blocker",
          "APPROVED_DESKTOP_ACTION_EXECUTION_RAW_MARKER"
        );
      }
    }
  });
  return dedupeFindings(findings);
}

function statusFor(
  executionMode: ApprovedDesktopActionExecutionMode,
  blockerCount: number,
  warningCount: number
): ApprovedDesktopActionExecutionStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (executionMode === "disabled") {
    return "disabled";
  }
  if (executionMode === "dry_run") {
    return "dry_run";
  }
  return warningCount > 0 ? "warning" : "planned";
}

function add(
  findings: ApprovedDesktopActionExecutionFinding[],
  kind: ApprovedDesktopActionExecutionFindingKind,
  severity: ApprovedDesktopActionExecutionSeverity,
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
    APPROVED_DESKTOP_ACTION_EXECUTION_MODE_MISSING:
      "Execution mode is required.",
    APPROVED_DESKTOP_ACTION_EXECUTION_MODE_UNKNOWN:
      "Execution mode is not supported.",
    APPROVED_DESKTOP_ACTION_EXECUTION_DISABLED:
      "Execution contract is disabled and does not call Tauri.",
    APPROVED_DESKTOP_ACTION_EXECUTION_DRY_RUN:
      "Execution contract is in dry-run mode and does not call Tauri.",
    APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_MISSING:
      "Explicit approved desktop action mode requires a valid receipt.",
    APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_NOT_READY:
      "Receipt is not ready for a fixed approved desktop action command.",
    APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_CONFIRMATION_BLOCKED:
      "Receipt typed confirmation is not accepted.",
    APPROVED_DESKTOP_ACTION_EXECUTION_RECEIPT_READINESS_BLOCKED:
      "Receipt readiness does not allow fixed command handoff.",
    APPROVED_DESKTOP_ACTION_EXECUTION_ACTION_MISSING:
      "Approved desktop action kind is required.",
    APPROVED_DESKTOP_ACTION_EXECUTION_UNSUPPORTED_ACTION:
      "Only observed-window focus, raise, and activate actions are allowed.",
    APPROVED_DESKTOP_ACTION_EXECUTION_BROAD_ACTION_BLOCKED:
      "Click, type, select, clipboard, drag/drop, and file-dialog actions are blocked.",
    APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_WINDOW_MISSING:
      "Target window ref is required.",
    APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_APP_MISSING:
      "Target app ref is required.",
    APPROVED_DESKTOP_ACTION_EXECUTION_SENSITIVE_TARGET_BLOCKED:
      "Sensitive desktop targets must fail closed before execution planning.",
    APPROVED_DESKTOP_ACTION_EXECUTION_TARGET_MISMATCH:
      "Receipt, proposal, target metadata, evidence, or risk refs do not match.",
    APPROVED_DESKTOP_ACTION_EXECUTION_OBSERVED_AT_INVALID:
      "Target or evidence observation timestamp is invalid.",
    APPROVED_DESKTOP_ACTION_EXECUTION_STALE_TARGET:
      "Target metadata or observer evidence is stale.",
    APPROVED_DESKTOP_ACTION_EXECUTION_FORBIDDEN_FIELD:
      "Execution input contains a forbidden raw, secret, execution, event, or tool field.",
    APPROVED_DESKTOP_ACTION_EXECUTION_READINESS_TRUE:
      "Execution input attempted to enable broad desktop action readiness.",
    APPROVED_DESKTOP_ACTION_EXECUTION_SECRET_MARKER:
      "Execution input contains a secret-like marker and must fail closed.",
    APPROVED_DESKTOP_ACTION_EXECUTION_RAW_MARKER:
      "Execution input contains a raw desktop, prompt, source, diff, or response marker."
  };
  return messages[code] ?? "Approved desktop action execution finding.";
}

function nextActionFor(
  status: ApprovedDesktopActionExecutionStatus,
  mode: ApprovedDesktopActionExecutionMode
): string {
  if (status === "blocked") {
    return "Fix execution contract blockers before a future fixed Tauri command can consume this plan.";
  }
  if (mode === "disabled") {
    return "Execution contract is disabled; no desktop action or Tauri command is called.";
  }
  if (mode === "dry_run") {
    return "Dry-run plan is summary-only; no desktop action or event write is performed.";
  }
  return "Execution plan is ready for a future fixed Tauri command boundary, but this runtime helper does not call Tauri.";
}

function disabledReadiness(
  canEnterFixedDesktopActionCommand: boolean
): ApprovedDesktopActionExecutionReadiness {
  return {
    canEnterFixedDesktopActionCommand,
    canCallTauriCommand: false,
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

function isExecutionMode(
  value: unknown
): value is ApprovedDesktopActionExecutionMode {
  return (
    typeof value === "string" &&
    executionModes.has(value as ApprovedDesktopActionExecutionMode)
  );
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
  findings: ApprovedDesktopActionExecutionFinding[]
): ApprovedDesktopActionExecutionFinding[] {
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
  findings: ApprovedDesktopActionExecutionFinding[],
  severity: ApprovedDesktopActionExecutionSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
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
