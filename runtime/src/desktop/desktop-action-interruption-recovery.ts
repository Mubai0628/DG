import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionInterruptionRecoveryInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionInterruptionRecoveryStatus =
  | "no_interruption"
  | "warning"
  | "blocked"
  | "empty";

export type DesktopActionInterruptionKind =
  | "focus_lost_before_action"
  | "focus_lost_after_action"
  | "user_interrupted"
  | "window_closed"
  | "app_crashed"
  | "platform_result_unknown"
  | "timeout"
  | "permission_revoked"
  | "target_became_sensitive"
  | "privacy_boundary_triggered";

export type DesktopActionInterruptionSeverity = "blocker" | "warning";

export type DesktopActionInterruptionFindingKind =
  | "schema"
  | "interruption"
  | "uncertainty"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopActionInterruptionFinding = {
  findingId: string;
  kind: DesktopActionInterruptionFindingKind;
  severity: DesktopActionInterruptionSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionUncertaintySummary = {
  level: "none" | "low" | "medium" | "high" | "unknown";
  resultKnown: boolean;
  focusKnown: boolean;
  reasonCodes: DesktopActionInterruptionKind[];
  summaryOnly: true;
};

export type DesktopActionInterruptionRecoveryRecommendation = {
  kind:
    | "no_recovery_needed"
    | "manual_review"
    | "refresh_observation"
    | "stop_and_reobserve"
    | "privacy_review";
  summary: string;
  requiresManualReview: boolean;
  summaryOnly: true;
};

export type DesktopActionInterruptionReadiness = {
  canRetryDesktopAction: false;
  canReplayExecute: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionInterruptionRecoveryReport = {
  status: DesktopActionInterruptionRecoveryStatus;
  recoveryId: string;
  actionId?: string | undefined;
  proposalId?: string | undefined;
  approvalReceiptId?: string | undefined;
  evidenceRefId?: string | undefined;
  interruptionKinds: DesktopActionInterruptionKind[];
  actionUncertaintySummary: DesktopActionUncertaintySummary;
  recommendations: DesktopActionInterruptionRecoveryRecommendation[];
  noAutomaticRetry: true;
  noReplayReexecution: true;
  warningCodes: string[];
  blockerCodes: string[];
  findings: DesktopActionInterruptionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionInterruptionReadiness;
  reportHash: string;
  source: "runtime_desktop_action_interruption_recovery";
};

const interruptionKinds: DesktopActionInterruptionKind[] = [
  "focus_lost_before_action",
  "focus_lost_after_action",
  "user_interrupted",
  "window_closed",
  "app_crashed",
  "platform_result_unknown",
  "timeout",
  "permission_revoked",
  "target_became_sensitive",
  "privacy_boundary_triggered"
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
    "clickNow",
    "typeNow",
    "selectNow",
    "openDialogNow",
    "retryNow",
    "undoNow",
    "executeNow",
    "canRetryDesktopAction",
    "canReplayExecute",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canWriteClipboard",
    "canOpenFileDialog",
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
  kind: DesktopActionInterruptionFindingKind,
  severity: DesktopActionInterruptionSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionInterruptionFinding {
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

function readiness(): DesktopActionInterruptionReadiness {
  return {
    canRetryDesktopAction: false,
    canReplayExecute: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionInterruptionRecoveryInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionInterruptionFinding[];
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
              "Desktop action interruption recovery JSON must be an object."
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
            "Desktop action interruption recovery JSON could not be parsed."
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
          "Desktop action interruption recovery input must be an object."
        )
      ]
    };
  }

  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionInterruptionFinding[]
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
          "Desktop action interruption recovery cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function readInterruptionKinds(
  record: Record<string, unknown>,
  findings: DesktopActionInterruptionFinding[]
): DesktopActionInterruptionKind[] {
  const values = new Set<DesktopActionInterruptionKind>();
  const explicit = readString(record.interruptionKind);
  if (explicit) {
    if (interruptionKinds.includes(explicit as DesktopActionInterruptionKind)) {
      values.add(explicit as DesktopActionInterruptionKind);
    } else {
      findings.push(
        finding(
          "schema",
          "blocker",
          "UNKNOWN_INTERRUPTION_KIND",
          "Interruption kind is not supported.",
          "interruptionKind"
        )
      );
    }
  }
  if (Array.isArray(record.interruptionKinds)) {
    record.interruptionKinds.forEach((item, index) => {
      const kind = readString(item);
      if (
        !kind ||
        !interruptionKinds.includes(kind as DesktopActionInterruptionKind)
      ) {
        findings.push(
          finding(
            "schema",
            "blocker",
            "UNKNOWN_INTERRUPTION_KIND",
            "Interruption kind is not supported.",
            `interruptionKinds[${index}]`
          )
        );
        return;
      }
      values.add(kind as DesktopActionInterruptionKind);
    });
  }
  return Array.from(values);
}

function inferInterruptionKinds(
  record: Record<string, unknown>
): DesktopActionInterruptionKind[] {
  const values = new Set<DesktopActionInterruptionKind>();
  if (readString(record.beforeActionFocusState) === "lost") {
    values.add("focus_lost_before_action");
  }
  if (readString(record.afterActionFocusState) === "lost") {
    values.add("focus_lost_after_action");
  }
  if (readBoolean(record.userInterrupted) === true) {
    values.add("user_interrupted");
  }
  if (readString(record.windowState) === "closed") {
    values.add("window_closed");
  }
  if (readString(record.appState) === "crashed") {
    values.add("app_crashed");
  }
  if (readString(record.platformResultStatus) === "unknown") {
    values.add("platform_result_unknown");
  }
  if (readBoolean(record.timedOut) === true) {
    values.add("timeout");
  }
  if (readString(record.permissionState) === "revoked") {
    values.add("permission_revoked");
  }
  if (readBoolean(record.targetBecameSensitive) === true) {
    values.add("target_became_sensitive");
  }
  if (readBoolean(record.privacyBoundaryTriggered) === true) {
    values.add("privacy_boundary_triggered");
  }
  return Array.from(values);
}

function addInterruptionFindings(
  kinds: DesktopActionInterruptionKind[],
  findings: DesktopActionInterruptionFinding[]
): void {
  for (const kind of kinds) {
    findings.push(
      finding(
        kind === "platform_result_unknown" ? "uncertainty" : "interruption",
        "blocker",
        kind.toUpperCase(),
        "Desktop action recovery must stop for this interruption signal.",
        "interruptionKinds"
      )
    );
  }
}

function buildUncertaintySummary(
  kinds: DesktopActionInterruptionKind[]
): DesktopActionUncertaintySummary {
  if (kinds.length === 0) {
    return {
      level: "none",
      resultKnown: true,
      focusKnown: true,
      reasonCodes: [],
      summaryOnly: true
    };
  }
  const resultKnown = !kinds.includes("platform_result_unknown");
  const focusKnown =
    !kinds.includes("focus_lost_before_action") &&
    !kinds.includes("focus_lost_after_action");
  const highRisk = kinds.some((kind) =>
    [
      "window_closed",
      "app_crashed",
      "permission_revoked",
      "target_became_sensitive",
      "privacy_boundary_triggered"
    ].includes(kind)
  );
  return {
    level: highRisk ? "high" : resultKnown && focusKnown ? "medium" : "unknown",
    resultKnown,
    focusKnown,
    reasonCodes: kinds,
    summaryOnly: true
  };
}

function recommendations(
  status: DesktopActionInterruptionRecoveryStatus,
  kinds: DesktopActionInterruptionKind[]
): DesktopActionInterruptionRecoveryRecommendation[] {
  if (status === "empty") {
    return [];
  }
  if (status === "no_interruption") {
    return [
      {
        kind: "no_recovery_needed",
        summary:
          "No interruption was reported, but this helper still grants no execution readiness.",
        requiresManualReview: false,
        summaryOnly: true
      }
    ];
  }
  const privacy =
    kinds.includes("target_became_sensitive") ||
    kinds.includes("privacy_boundary_triggered");
  return [
    {
      kind: privacy ? "privacy_review" : "stop_and_reobserve",
      summary:
        "Stop automatic recovery, do not retry or replay, and refresh summary-only observation before manual review.",
      requiresManualReview: true,
      summaryOnly: true
    }
  ];
}

function buildReport(
  record: Record<string, unknown> | undefined,
  kinds: DesktopActionInterruptionKind[],
  findings: DesktopActionInterruptionFinding[]
): DesktopActionInterruptionRecoveryReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionInterruptionRecoveryStatus = !record
    ? findings.length > 0
      ? "blocked"
      : "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "no_interruption";
  const reportCore = {
    status,
    actionId: readString(record?.actionId),
    proposalId: readString(record?.proposalId),
    approvalReceiptId: readString(record?.approvalReceiptId),
    evidenceRefId: readString(record?.evidenceRefId),
    interruptionKinds: kinds,
    actionUncertaintySummary: buildUncertaintySummary(kinds),
    noAutomaticRetry: true as const,
    noReplayReexecution: true as const,
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
    recoveryId: reportHash.slice(0, 16),
    recommendations: recommendations(status, kinds),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(),
    reportHash,
    source: "runtime_desktop_action_interruption_recovery"
  };
}

export function buildDesktopActionInterruptionRecoveryReport(
  input: DesktopActionInterruptionRecoveryInput
): DesktopActionInterruptionRecoveryReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildReport(parsed.record, [], findings);
  }

  scanUnsafeFields(parsed.record, "", findings);
  const explicitKinds = readInterruptionKinds(parsed.record, findings);
  const inferredKinds = inferInterruptionKinds(parsed.record);
  const kinds = Array.from(new Set([...explicitKinds, ...inferredKinds]));
  addInterruptionFindings(kinds, findings);

  return buildReport(parsed.record, kinds, findings);
}

export function summarizeDesktopActionInterruptionRecoveryReport(
  report: DesktopActionInterruptionRecoveryReport
): Pick<
  DesktopActionInterruptionRecoveryReport,
  | "status"
  | "recoveryId"
  | "actionId"
  | "proposalId"
  | "approvalReceiptId"
  | "evidenceRefId"
  | "interruptionKinds"
  | "actionUncertaintySummary"
  | "recommendations"
  | "noAutomaticRetry"
  | "noReplayReexecution"
  | "warningCodes"
  | "blockerCodes"
  | "blockerCount"
  | "warningCount"
  | "findingCount"
  | "readiness"
  | "reportHash"
  | "source"
> {
  return {
    status: report.status,
    recoveryId: report.recoveryId,
    actionId: report.actionId,
    proposalId: report.proposalId,
    approvalReceiptId: report.approvalReceiptId,
    evidenceRefId: report.evidenceRefId,
    interruptionKinds: report.interruptionKinds,
    actionUncertaintySummary: report.actionUncertaintySummary,
    recommendations: report.recommendations,
    noAutomaticRetry: report.noAutomaticRetry,
    noReplayReexecution: report.noReplayReexecution,
    warningCodes: report.warningCodes,
    blockerCodes: report.blockerCodes,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    readiness: report.readiness,
    reportHash: report.reportHash,
    source: report.source
  };
}
