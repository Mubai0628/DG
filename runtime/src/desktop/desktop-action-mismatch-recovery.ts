import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionMismatchRecoveryInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionMismatchRecoveryStatus =
  | "recovery_ready"
  | "warning"
  | "blocked"
  | "empty";

export type DesktopActionMismatchKind =
  | "target_window_missing"
  | "target_window_changed"
  | "target_app_changed"
  | "screen_topology_changed"
  | "focus_lost"
  | "bounds_changed"
  | "action_result_unknown"
  | "simulated_vs_observed_mismatch"
  | "unsupported_platform"
  | "privacy_boundary_blocked";

export type DesktopActionMismatchSeverity = "blocker" | "warning";

export type DesktopActionMismatchFindingKind =
  | "schema"
  | "mismatch"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopActionMismatchFinding = {
  findingId: string;
  kind: DesktopActionMismatchFindingKind;
  severity: DesktopActionMismatchSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionRecoveryRecommendation = {
  recommendationId: string;
  kind:
    | "no_recovery_needed"
    | "refresh_observation"
    | "manual_review"
    | "stop_and_reobserve"
    | "privacy_review";
  summary: string;
  requiresManualReview: boolean;
  summaryOnly: true;
};

export type DesktopActionMismatchReadiness = {
  canEnterRecoveryReview: boolean;
  canRetryDesktopAction: false;
  canRunUndoAction: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canReplayExecute: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionMismatchRecoveryReport = {
  status: DesktopActionMismatchRecoveryStatus;
  recoveryId: string;
  actionId?: string | undefined;
  proposalId?: string | undefined;
  approvalReceiptId?: string | undefined;
  evidenceRefId?: string | undefined;
  mismatchCount: number;
  mismatchKinds: DesktopActionMismatchKind[];
  recommendedNextAction: string;
  recoveryStrategySummary: string;
  recommendations: DesktopActionRecoveryRecommendation[];
  warningCodes: string[];
  blockerCodes: string[];
  findings: DesktopActionMismatchFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionMismatchReadiness;
  reportHash: string;
  source: "runtime_desktop_action_mismatch_recovery";
};

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
    "canRunUndoAction",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
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
  kind: DesktopActionMismatchFindingKind,
  severity: DesktopActionMismatchSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionMismatchFinding {
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

function readiness(
  canEnterRecoveryReview: boolean
): DesktopActionMismatchReadiness {
  return {
    canEnterRecoveryReview,
    canRetryDesktopAction: false,
    canRunUndoAction: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canReplayExecute: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionMismatchRecoveryInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionMismatchFinding[];
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
              "Desktop action mismatch recovery JSON must be an object."
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
            "Desktop action mismatch recovery JSON could not be parsed."
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
          "Desktop action mismatch recovery input must be an object."
        )
      ]
    };
  }

  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionMismatchFinding[]
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
          "Desktop action mismatch recovery cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function readSummaryRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isDifferent(left: unknown, right: unknown): boolean {
  return (
    typeof left === "string" && typeof right === "string" && left !== right
  );
}

function addMismatch(
  mismatchKinds: Set<DesktopActionMismatchKind>,
  findings: DesktopActionMismatchFinding[],
  kind: DesktopActionMismatchKind,
  severity: DesktopActionMismatchSeverity,
  code: string,
  safeMessage: string
): void {
  mismatchKinds.add(kind);
  findings.push(finding("mismatch", severity, code, safeMessage));
}

function recommendation(
  kind: DesktopActionRecoveryRecommendation["kind"],
  summary: string,
  requiresManualReview: boolean
): DesktopActionRecoveryRecommendation {
  return {
    recommendationId: stablePreviewHash(
      JSON.stringify({ kind, summary, requiresManualReview })
    ).slice(0, 16),
    kind,
    summary,
    requiresManualReview,
    summaryOnly: true
  };
}

function buildRecommendations(
  status: DesktopActionMismatchRecoveryStatus,
  mismatchKinds: DesktopActionMismatchKind[]
): DesktopActionRecoveryRecommendation[] {
  if (status === "empty") {
    return [];
  }
  if (status === "blocked") {
    return [
      recommendation(
        mismatchKinds.includes("privacy_boundary_blocked")
          ? "privacy_review"
          : "stop_and_reobserve",
        "Stop recovery automation and refresh summary-only desktop observation before considering any follow-up.",
        true
      )
    ];
  }
  if (mismatchKinds.length === 0) {
    return [
      recommendation(
        "no_recovery_needed",
        "No mismatch was detected in the provided summaries.",
        false
      )
    ];
  }
  if (
    mismatchKinds.includes("bounds_changed") &&
    mismatchKinds.length === 1
  ) {
    return [
      recommendation(
        "refresh_observation",
        "Refresh target observation before any future approved action.",
        false
      )
    ];
  }
  return [
    recommendation(
      "manual_review",
      "Review mismatch summary before any future approved desktop action.",
      true
    )
  ];
}

function buildReport(
  input: {
    record?: Record<string, unknown> | undefined;
    mismatchKinds: DesktopActionMismatchKind[];
  },
  findings: DesktopActionMismatchFinding[]
): DesktopActionMismatchRecoveryReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionMismatchRecoveryStatus =
    !input.record && blockerCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "recovery_ready";
  const proposal = readSummaryRecord(input.record?.desktopActionProposalSummary);
  const receipt = readSummaryRecord(input.record?.approvalReceiptSummary);
  const execution = readSummaryRecord(input.record?.executionResultSummary);
  const evidence = readSummaryRecord(input.record?.observerEvidenceSummary);
  const recommendations = buildRecommendations(status, input.mismatchKinds);
  const core = {
    status,
    actionId: readString(execution?.actionId),
    proposalId:
      readString(proposal?.proposalId) ?? readString(execution?.proposalId),
    approvalReceiptId: readString(receipt?.approvalReceiptId),
    evidenceRefId: readString(evidence?.evidenceRefId),
    mismatchKinds: input.mismatchKinds,
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code)
  };
  const reportHash = stablePreviewHash(JSON.stringify(core));
  const recoveryStrategySummary =
    status === "empty"
      ? "No desktop action mismatch summaries were provided."
      : input.mismatchKinds.length === 0
        ? "No mismatch detected; no recovery action is needed."
        : "Recovery is summary-only: refresh observation or require manual review before any future approved action.";
  return {
    ...core,
    status,
    recoveryId: reportHash.slice(0, 16),
    mismatchCount: input.mismatchKinds.length,
    recommendedNextAction:
      status === "blocked"
        ? "Do not retry or undo. Refresh observation and review blockers."
        : status === "empty"
          ? "Provide summary-only desktop action and target evidence."
          : input.mismatchKinds.length === 0
            ? "No recovery needed."
            : "Review mismatch summary before any future approved action.",
    recoveryStrategySummary,
    recommendations,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked" && status !== "empty"),
    reportHash,
    source: "runtime_desktop_action_mismatch_recovery"
  };
}

function detectMismatchKinds(
  record: Record<string, unknown>,
  findings: DesktopActionMismatchFinding[]
): DesktopActionMismatchKind[] {
  const mismatchKinds = new Set<DesktopActionMismatchKind>();
  const expected = readSummaryRecord(record.expectedTargetSummary);
  const observed = readSummaryRecord(record.observedAfterActionTargetSummary);
  const execution = readSummaryRecord(record.executionResultSummary);

  if (readBoolean(observed?.windowPresent) === false) {
    addMismatch(
      mismatchKinds,
      findings,
      "target_window_missing",
      "blocker",
      "TARGET_WINDOW_MISSING",
      "Expected target window is missing."
    );
  }

  if (isDifferent(expected?.windowIdHash, observed?.windowIdHash)) {
    addMismatch(
      mismatchKinds,
      findings,
      "target_window_changed",
      "blocker",
      "TARGET_WINDOW_CHANGED",
      "Observed window identity does not match the expected target summary."
    );
  }

  if (isDifferent(expected?.appIdHash, observed?.appIdHash)) {
    addMismatch(
      mismatchKinds,
      findings,
      "target_app_changed",
      "blocker",
      "TARGET_APP_CHANGED",
      "Observed app identity does not match the expected target summary."
    );
  }

  if (
    isDifferent(expected?.monitorTopologyHash, observed?.monitorTopologyHash) ||
    isDifferent(expected?.screenTopologyHash, observed?.screenTopologyHash)
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "screen_topology_changed",
      "blocker",
      "SCREEN_TOPOLOGY_CHANGED",
      "Observed screen topology does not match the expected target summary."
    );
  }

  if (
    readString(observed?.focusState) === "not_focused" ||
    readBoolean(execution?.focusLost) === true
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "focus_lost",
      "blocker",
      "FOCUS_LOST",
      "Focus was lost before or after the desktop action."
    );
  }

  if (isDifferent(expected?.boundsHash, observed?.boundsHash)) {
    addMismatch(
      mismatchKinds,
      findings,
      "bounds_changed",
      "warning",
      "BOUNDS_CHANGED",
      "Observed target bounds changed after the action."
    );
  }

  if (
    readString(execution?.resultStatus) === "unknown" ||
    readString(execution?.status) === "unknown"
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "action_result_unknown",
      "blocker",
      "ACTION_RESULT_UNKNOWN",
      "Desktop action result is unknown."
    );
  }

  if (
    isDifferent(
      record.desktopActionProposalSummary &&
        isRecord(record.desktopActionProposalSummary)
        ? record.desktopActionProposalSummary.expectedVisibleEffectHash
        : undefined,
      observed?.visibleEffectHash
    )
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "simulated_vs_observed_mismatch",
      "warning",
      "SIMULATED_VS_OBSERVED_MISMATCH",
      "Observed visible effect differs from the proposal summary."
    );
  }

  if (
    readString(execution?.platformStatus) === "unsupported" ||
    readString(execution?.status) === "unsupported_platform"
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "unsupported_platform",
      "blocker",
      "UNSUPPORTED_PLATFORM",
      "Platform reported that the desktop action is unsupported."
    );
  }

  if (
    readBoolean(observed?.privacyBoundaryTriggered) === true ||
    readBoolean(execution?.privacyBoundaryBlocked) === true
  ) {
    addMismatch(
      mismatchKinds,
      findings,
      "privacy_boundary_blocked",
      "blocker",
      "PRIVACY_BOUNDARY_BLOCKED",
      "Privacy boundary blocks desktop action recovery."
    );
  }

  return [...mismatchKinds];
}

export function buildDesktopActionMismatchRecoveryReport(
  input: DesktopActionMismatchRecoveryInput
): DesktopActionMismatchRecoveryReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  if (!parsed.record) {
    return buildReport({ mismatchKinds: [] }, findings);
  }

  scanUnsafeFields(parsed.record, "", findings);
  const mismatchKinds = detectMismatchKinds(parsed.record, findings);

  return buildReport({ record: parsed.record, mismatchKinds }, findings);
}

export function summarizeDesktopActionMismatchRecoveryReport(
  report: DesktopActionMismatchRecoveryReport
): Pick<
  DesktopActionMismatchRecoveryReport,
  | "status"
  | "recoveryId"
  | "mismatchCount"
  | "mismatchKinds"
  | "recommendedNextAction"
  | "recoveryStrategySummary"
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
    mismatchCount: report.mismatchCount,
    mismatchKinds: report.mismatchKinds,
    recommendedNextAction: report.recommendedNextAction,
    recoveryStrategySummary: report.recoveryStrategySummary,
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
