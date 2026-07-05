import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionCompensationSummaryInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionCompensationSummaryStatus =
  | "summary_ready"
  | "warning"
  | "blocked"
  | "empty";

export type DesktopActionCompensationKind =
  | "no_safe_undo"
  | "refocus_previous_window"
  | "restore_previous_selection"
  | "clear_pending_text_input"
  | "manual_user_review_required"
  | "rerun_observation_required"
  | "rollback_workspace_action_if_linked";

export type DesktopActionCompensationSeverity = "blocker" | "warning";

export type DesktopActionCompensationFindingKind =
  | "schema"
  | "compensation"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopActionCompensationFinding = {
  findingId: string;
  kind: DesktopActionCompensationFindingKind;
  severity: DesktopActionCompensationSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionCompensationItem = {
  itemId: string;
  kind: DesktopActionCompensationKind;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  requiresManualReview: boolean;
  summaryOnly: true;
};

export type DesktopActionCompensationReadiness = {
  canRunUndoAction: false;
  canRunCompensatingAction: false;
  canRefocusWindow: false;
  canRestoreSelection: false;
  canClearTextInput: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canReplayExecute: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionCompensationSummaryReport = {
  status: DesktopActionCompensationSummaryStatus;
  compensationId: string;
  actionId?: string | undefined;
  proposalId?: string | undefined;
  interruptionRecoveryId?: string | undefined;
  mismatchRecoveryId?: string | undefined;
  compensationKinds: DesktopActionCompensationKind[];
  compensationItems: DesktopActionCompensationItem[];
  warningCodes: string[];
  blockerCodes: string[];
  findings: DesktopActionCompensationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionCompensationReadiness;
  nextAction: string;
  reportHash: string;
  source: "runtime_desktop_action_compensation_summary";
};

const compensationKinds: DesktopActionCompensationKind[] = [
  "no_safe_undo",
  "refocus_previous_window",
  "restore_previous_selection",
  "clear_pending_text_input",
  "manual_user_review_required",
  "rerun_observation_required",
  "rollback_workspace_action_if_linked"
];

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "rawTargetText",
    "targetTextRaw",
    "targetText",
    "rawPrompt",
    "rawResponse",
    "rawSource",
    "rawDiff",
    "rawDom",
    "clipboardContent",
    "apiKey",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret",
    "desktopCommand",
    "nativeBridge",
    "shellCommand",
    "gitCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "clickNow",
    "typeNow",
    "selectNow",
    "openDialogNow",
    "retryNow",
    "undoNow",
    "executeNow"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "applyNow",
    "rollbackNow",
    "clickNow",
    "typeNow",
    "selectNow",
    "openDialogNow",
    "retryNow",
    "undoNow",
    "executeNow",
    "canRunUndoAction",
    "canRunCompensatingAction",
    "canRefocusWindow",
    "canRestoreSelection",
    "canClearTextInput",
    "canApplyPatch",
    "canRollback",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canReplayExecute",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretMarkers = [
  "sk-",
  "Bearer ",
  "Authorization",
  "BEGIN PRIVATE KEY",
  "PASSWORD_VALUE_MARKER",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY"
];

const rawMarkers = [
  "RAW_SCREENSHOT",
  "SCREENSHOT_BYTES",
  "RAW_OCR",
  "RAW_TARGET_TEXT",
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function finding(
  kind: DesktopActionCompensationFindingKind,
  severity: DesktopActionCompensationSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionCompensationFinding {
  return {
    findingId: stablePreviewHash(
      JSON.stringify({ kind, severity, code, path: path || "" })
    ).slice(0, 16),
    kind,
    severity,
    code,
    safeMessage,
    ...(path ? { path } : {})
  };
}

function readiness(): DesktopActionCompensationReadiness {
  return {
    canRunUndoAction: false,
    canRunCompensatingAction: false,
    canRefocusWindow: false,
    canRestoreSelection: false,
    canClearTextInput: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canReplayExecute: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionCompensationSummaryInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionCompensationFinding[];
} {
  if (typeof input === "string") {
    if (input.trim().length === 0) {
      return { findings: [] };
    }
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        return {
          findings: [
            finding(
              "schema",
              "blocker",
              "JSON_NOT_OBJECT",
              "Desktop action compensation summary JSON must be an object."
            )
          ]
        };
      }
      return { record: parsed, findings: [] };
    } catch {
      return {
        findings: [
          finding(
            "schema",
            "blocker",
            "MALFORMED_JSON",
            "Desktop action compensation summary JSON could not be parsed."
          )
        ]
      };
    }
  }

  if (input === undefined || input === null) {
    return { findings: [] };
  }

  if (!isRecord(input)) {
    return {
      findings: [
        finding(
          "schema",
          "blocker",
          "INPUT_NOT_OBJECT",
          "Desktop action compensation summary input must be an object."
        )
      ]
    };
  }

  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionCompensationFinding[]
): void {
  if (typeof value === "string") {
    if (secretMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "secret",
          "blocker",
          "SECRET_MARKER",
          "Secret-like marker is not allowed.",
          path
        )
      );
    }
    if (rawMarkers.some((marker) => value.includes(marker))) {
      findings.push(
        finding(
          "raw_field",
          "blocker",
          "RAW_MARKER",
          "Raw screenshot, OCR, target text, prompt, response, source, or diff markers are not allowed.",
          path
        )
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, `${path}[${index}]`, findings)
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(
        finding(
          executionBooleanKeys.has(normalizedKey)
            ? "execution_field"
            : normalizedKey.includes("secret") ||
                normalizedKey.includes("password") ||
                normalizedKey.includes("token") ||
                normalizedKey.includes("authorization") ||
                normalizedKey.includes("bearer")
              ? "secret"
              : "raw_field",
          "blocker",
          "FORBIDDEN_FIELD",
          "Forbidden raw, secret, or execution field is not allowed.",
          childPath
        )
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_FLAG_TRUE",
          "Desktop action compensation summary cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function readCompensationKinds(
  record: Record<string, unknown>,
  findings: DesktopActionCompensationFinding[]
): DesktopActionCompensationKind[] {
  const kinds = new Set<DesktopActionCompensationKind>();
  const single = readString(record.compensationKind);
  if (single) {
    if (compensationKinds.includes(single as DesktopActionCompensationKind)) {
      kinds.add(single as DesktopActionCompensationKind);
    } else {
      findings.push(
        finding(
          "schema",
          "blocker",
          "UNKNOWN_COMPENSATION_KIND",
          "Compensation kind is not supported.",
          "compensationKind"
        )
      );
    }
  }
  if (Array.isArray(record.compensationKinds)) {
    record.compensationKinds.forEach((item, index) => {
      const kind = readString(item);
      if (!kind || !compensationKinds.includes(kind as DesktopActionCompensationKind)) {
        findings.push(
          finding(
            "schema",
            "blocker",
            "UNKNOWN_COMPENSATION_KIND",
            "Compensation kind is not supported.",
            `compensationKinds[${index}]`
          )
        );
        return;
      }
      kinds.add(kind as DesktopActionCompensationKind);
    });
  }
  return Array.from(kinds);
}

function itemForKind(
  kind: DesktopActionCompensationKind,
  manualReviewRequired: boolean | undefined
): DesktopActionCompensationItem {
  const highRisk =
    kind === "manual_user_review_required" ||
    kind === "rollback_workspace_action_if_linked" ||
    kind === "no_safe_undo";
  const riskLevel = highRisk
    ? "high"
    : kind === "rerun_observation_required"
      ? "medium"
      : "low";
  const requiresManualReview = highRisk || manualReviewRequired === true;
  const summaryByKind: Record<DesktopActionCompensationKind, string> = {
    no_safe_undo:
      "No safe undo is available; route to manual review with summary-only evidence.",
    refocus_previous_window:
      "A future operator may refocus the previous window only after manual confirmation.",
    restore_previous_selection:
      "A future operator may restore the previous selection only after manual confirmation.",
    clear_pending_text_input:
      "A future operator may clear pending text input only after manual confirmation.",
    manual_user_review_required:
      "Manual user review is required before any follow-up action.",
    rerun_observation_required:
      "Refresh summary-only observation before considering any follow-up action.",
    rollback_workspace_action_if_linked:
      "If a linked workspace change exists, use the existing workspace rollback preview chain; do not execute rollback here."
  };
  return {
    itemId: stablePreviewHash(JSON.stringify({ kind, riskLevel })).slice(0, 16),
    kind,
    summary: summaryByKind[kind],
    riskLevel,
    requiresManualReview,
    summaryOnly: true
  };
}

function buildItems(
  kinds: DesktopActionCompensationKind[],
  manualReviewRequired: boolean | undefined,
  findings: DesktopActionCompensationFinding[]
): DesktopActionCompensationItem[] {
  const items = kinds.map((kind) => itemForKind(kind, manualReviewRequired));
  for (const item of items) {
    if (item.kind === "no_safe_undo") {
      findings.push(
        finding(
          "compensation",
          "warning",
          "NO_SAFE_UNDO",
          "No safe undo is available.",
          "compensationKinds"
        )
      );
    }
    if (item.riskLevel === "high" && item.requiresManualReview !== true) {
      findings.push(
        finding(
          "compensation",
          "blocker",
          "HIGH_RISK_REQUIRES_MANUAL_REVIEW",
          "High-risk compensation must require manual review.",
          "compensationKinds"
        )
      );
    }
    if (item.kind === "rollback_workspace_action_if_linked") {
      findings.push(
        finding(
          "compensation",
          "warning",
          "WORKSPACE_ROLLBACK_SUMMARY_ONLY",
          "Linked workspace rollback is summary-only and cannot execute here.",
          "compensationKinds"
        )
      );
    }
  }
  if (kinds.length === 0) {
    findings.push(
      finding(
        "schema",
        "warning",
        "NO_COMPENSATION_KIND",
        "No compensation kind was provided.",
        "compensationKinds"
      )
    );
  }
  return items;
}

function buildReport(
  record: Record<string, unknown> | undefined,
  kinds: DesktopActionCompensationKind[],
  items: DesktopActionCompensationItem[],
  findings: DesktopActionCompensationFinding[]
): DesktopActionCompensationSummaryReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionCompensationSummaryStatus = !record
    ? findings.length > 0
      ? "blocked"
      : "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "summary_ready";
  const reportCore = {
    status,
    actionId: readString(record?.actionId),
    proposalId: readString(record?.proposalId),
    interruptionRecoveryId: readString(record?.interruptionRecoveryId),
    mismatchRecoveryId: readString(record?.mismatchRecoveryId),
    compensationKinds: kinds,
    compensationItems: items,
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code)
  };
  const reportHash = stablePreviewHash(JSON.stringify(reportCore));
  return {
    ...reportCore,
    compensationId: reportHash.slice(0, 16),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(),
    nextAction:
      status === "blocked"
        ? "Stop compensation planning and route to manual review."
        : "Keep compensation summary read-only; do not execute undo or rollback.",
    reportHash,
    source: "runtime_desktop_action_compensation_summary"
  };
}

export function buildDesktopActionCompensationSummary(
  input: DesktopActionCompensationSummaryInput
): DesktopActionCompensationSummaryReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildReport(parsed.record, [], [], findings);
  }

  scanUnsafeFields(parsed.record, "", findings);
  const kinds = readCompensationKinds(parsed.record, findings);
  const items = buildItems(
    kinds,
    readBoolean(parsed.record.manualReviewRequired),
    findings
  );

  return buildReport(parsed.record, kinds, items, findings);
}

export function summarizeDesktopActionCompensationSummary(
  report: DesktopActionCompensationSummaryReport
): Pick<
  DesktopActionCompensationSummaryReport,
  | "status"
  | "compensationId"
  | "actionId"
  | "proposalId"
  | "interruptionRecoveryId"
  | "mismatchRecoveryId"
  | "compensationKinds"
  | "compensationItems"
  | "warningCodes"
  | "blockerCodes"
  | "blockerCount"
  | "warningCount"
  | "findingCount"
  | "readiness"
  | "nextAction"
  | "reportHash"
  | "source"
> {
  return {
    status: report.status,
    compensationId: report.compensationId,
    actionId: report.actionId,
    proposalId: report.proposalId,
    interruptionRecoveryId: report.interruptionRecoveryId,
    mismatchRecoveryId: report.mismatchRecoveryId,
    compensationKinds: report.compensationKinds,
    compensationItems: report.compensationItems,
    warningCodes: report.warningCodes,
    blockerCodes: report.blockerCodes,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    readiness: report.readiness,
    nextAction: report.nextAction,
    reportHash: report.reportHash,
    source: report.source
  };
}
