import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopTargetFreshnessInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopTargetFreshnessStatus = "fresh" | "warning" | "blocked";

export type DesktopTargetFreshnessSeverity = "blocker" | "warning";

export type DesktopTargetFreshnessFindingKind =
  | "schema"
  | "freshness"
  | "mismatch"
  | "sensitive_target"
  | "window_state"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopTargetFreshnessFinding = {
  findingId: string;
  kind: DesktopTargetFreshnessFindingKind;
  severity: DesktopTargetFreshnessSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopTargetEvidenceSummary = {
  evidenceRefId: string;
  observedAt: string;
  summary: string;
  targetHash?: string | undefined;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsHash?: string | undefined;
  labelSummary?: string | undefined;
};

export type DesktopCurrentMetadataSummary = {
  capturedAt: string;
  summary: string;
  targetHash?: string | undefined;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsHash?: string | undefined;
  labelSummary?: string | undefined;
  confidence?: number | undefined;
  windowState?: "visible" | "minimized" | "hidden" | "unknown" | undefined;
  focusState?: "focused" | "not_focused" | "unknown" | undefined;
  monitorCount?: number | undefined;
};

export type DesktopActionTargetFreshnessSummary = {
  targetId: string;
  targetKind: string;
  labelSummary?: string | undefined;
  confidence?: number | undefined;
  targetHash?: string | undefined;
  windowIdHash?: string | undefined;
  appIdHash?: string | undefined;
  displayIdHash?: string | undefined;
  boundsHash?: string | undefined;
};

export type DesktopTargetMismatchCounts = {
  appMismatchCount: number;
  windowMismatchCount: number;
  displayMismatchCount: number;
  boundsMismatchCount: number;
  targetHashMismatchCount: number;
  labelMismatchCount: number;
  focusMismatchCount: number;
  windowStateMismatchCount: number;
  multiMonitorWarningCount: number;
};

export type DesktopTargetFreshnessReadiness = {
  canEnterSequenceSimulation: boolean;
  canEnterRiskClassification: boolean;
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

export type DesktopTargetFreshnessReport = {
  status: DesktopTargetFreshnessStatus;
  freshnessId: string;
  evidenceRefId?: string | undefined;
  targetId?: string | undefined;
  observedAt?: string | undefined;
  checkedAt?: string | undefined;
  ageMs?: number | undefined;
  freshnessThresholdMs: number;
  targetConfidenceThreshold: number;
  mismatchCounts: DesktopTargetMismatchCounts;
  targetHash?: string | undefined;
  evidenceHash?: string | undefined;
  warningCodes: string[];
  blockerCodes: string[];
  findings: DesktopTargetFreshnessFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopTargetFreshnessReadiness;
  nextAction: string;
  reportHash: string;
  source: "runtime_desktop_target_freshness";
};

const forbiddenFieldKeys = new Set(
  [
    "rawScreenshot",
    "screenshotBytes",
    "rawOcrText",
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
    "clickNow",
    "typeNow",
    "selectNow",
    "openDialogNow",
    "eventStoreWrite",
    "nativeBridge",
    "shellCommand",
    "gitCommand"
  ].map((key) => key.toLowerCase())
);

const executionBooleanKeys = new Set(
  [
    "clickNow",
    "typeNow",
    "selectNow",
    "openDialogNow",
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
  "RAW_PROMPT",
  "RAW_RESPONSE",
  "RAW_SOURCE",
  "RAW_DIFF"
];

const sensitiveLabelWords = [
  "password",
  "secret",
  "token",
  "credential",
  "delete",
  "remove",
  "payment",
  "billing"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function finding(
  kind: DesktopTargetFreshnessFindingKind,
  severity: DesktopTargetFreshnessSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopTargetFreshnessFinding {
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

function emptyMismatchCounts(): DesktopTargetMismatchCounts {
  return {
    appMismatchCount: 0,
    windowMismatchCount: 0,
    displayMismatchCount: 0,
    boundsMismatchCount: 0,
    targetHashMismatchCount: 0,
    labelMismatchCount: 0,
    focusMismatchCount: 0,
    windowStateMismatchCount: 0,
    multiMonitorWarningCount: 0
  };
}

function readiness(canEnterPreview: boolean): DesktopTargetFreshnessReadiness {
  return {
    canEnterSequenceSimulation: canEnterPreview,
    canEnterRiskClassification: canEnterPreview,
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

function parseInput(input: DesktopTargetFreshnessInput): {
  record?: Record<string, unknown>;
  findings: DesktopTargetFreshnessFinding[];
} {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        return {
          findings: [
            finding(
              "schema",
              "blocker",
              "JSON_NOT_OBJECT",
              "Desktop target freshness JSON must be an object."
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
            "Desktop target freshness JSON could not be parsed."
          )
        ]
      };
    }
  }
  if (!isRecord(input)) {
    return {
      findings: [
        finding(
          "schema",
          "blocker",
          "INPUT_NOT_OBJECT",
          "Desktop target freshness input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopTargetFreshnessFinding[]
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
          "Raw screenshot, OCR, prompt, response, source, or diff markers are not allowed.",
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
                normalizedKey.includes("token")
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
          "Desktop target freshness cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function readSummaryRecord<T extends Record<string, unknown>>(
  value: unknown
): T | undefined {
  return isRecord(value) ? (value as T) : undefined;
}

function parseTimeMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sameDefined(left: unknown, right: unknown): boolean {
  return (
    typeof left === "string" && typeof right === "string" && left === right
  );
}

function differentDefined(left: unknown, right: unknown): boolean {
  return (
    typeof left === "string" && typeof right === "string" && left !== right
  );
}

function containsSensitiveLabel(...values: Array<string | undefined>): boolean {
  return values.some((value) => {
    const lowered = value?.toLowerCase() ?? "";
    return sensitiveLabelWords.some((word) => lowered.includes(word));
  });
}

function buildReport(
  input: {
    evidence?: DesktopTargetEvidenceSummary | undefined;
    current?: DesktopCurrentMetadataSummary | undefined;
    target?: DesktopActionTargetFreshnessSummary | undefined;
    checkedAt?: string | undefined;
    ageMs?: number | undefined;
    freshnessThresholdMs: number;
    targetConfidenceThreshold: number;
    mismatchCounts: DesktopTargetMismatchCounts;
  },
  findings: DesktopTargetFreshnessFinding[]
): DesktopTargetFreshnessReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopTargetFreshnessStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "fresh";
  const reportCore = {
    status,
    evidenceRefId: input.evidence?.evidenceRefId,
    targetId: input.target?.targetId,
    observedAt: input.evidence?.observedAt,
    checkedAt: input.checkedAt,
    ageMs: input.ageMs,
    freshnessThresholdMs: input.freshnessThresholdMs,
    targetConfidenceThreshold: input.targetConfidenceThreshold,
    mismatchCounts: input.mismatchCounts,
    targetHash:
      input.current?.targetHash ??
      input.target?.targetHash ??
      input.evidence?.targetHash,
    evidenceHash: input.evidence
      ? stablePreviewHash(JSON.stringify(input.evidence)).slice(0, 16)
      : undefined,
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
    status,
    freshnessId: reportHash.slice(0, 16),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Refresh desktop observation before considering this proposal."
        : "Proceed to desktop action risk classification or sequence simulation preview.",
    reportHash,
    source: "runtime_desktop_target_freshness"
  };
}

export function validateDesktopTargetFreshness(
  input: DesktopTargetFreshnessInput
): DesktopTargetFreshnessReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  const mismatchCounts = emptyMismatchCounts();
  const freshnessThresholdMs =
    readNumber(parsed.record?.freshnessThresholdMs) ?? 5 * 60 * 1000;
  const targetConfidenceThreshold =
    readNumber(parsed.record?.targetConfidenceThreshold) ?? 0.75;
  if (!parsed.record) {
    return buildReport(
      { freshnessThresholdMs, targetConfidenceThreshold, mismatchCounts },
      findings
    );
  }

  scanUnsafeFields(parsed.record, "", findings);

  const evidence = readSummaryRecord<DesktopTargetEvidenceSummary>(
    parsed.record.observerEvidenceSummary
  );
  const current = readSummaryRecord<DesktopCurrentMetadataSummary>(
    parsed.record.currentMetadataSummary
  );
  const target = readSummaryRecord<DesktopActionTargetFreshnessSummary>(
    parsed.record.actionProposalTargetSummary
  );

  if (!evidence) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_OBSERVER_EVIDENCE_SUMMARY",
        "Observer evidence summary is required.",
        "observerEvidenceSummary"
      )
    );
  }
  if (!current) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_CURRENT_METADATA_SUMMARY",
        "Current metadata summary is required.",
        "currentMetadataSummary"
      )
    );
  }
  if (!target) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_ACTION_PROPOSAL_TARGET_SUMMARY",
        "Action proposal target summary is required.",
        "actionProposalTargetSummary"
      )
    );
  }

  const checkedAt =
    readString(parsed.record.checkedAt) ?? readString(current?.capturedAt);
  const observedAt = readString(evidence?.observedAt);
  const observedMs = parseTimeMs(observedAt);
  const checkedMs = parseTimeMs(checkedAt);
  const ageMs =
    observedMs !== undefined && checkedMs !== undefined
      ? checkedMs - observedMs
      : undefined;

  if (evidence && !readString(evidence.evidenceRefId)) {
    findings.push(
      finding(
        "schema",
        "blocker",
        "MISSING_EVIDENCE_REF_ID",
        "Observer evidence summary requires an evidence ref id.",
        "observerEvidenceSummary.evidenceRefId"
      )
    );
  }
  if (evidence && !observedAt) {
    findings.push(
      finding(
        "freshness",
        "blocker",
        "MISSING_OBSERVED_AT",
        "Observer evidence summary requires observedAt.",
        "observerEvidenceSummary.observedAt"
      )
    );
  }
  if (!checkedAt) {
    findings.push(
      finding(
        "freshness",
        "blocker",
        "MISSING_CHECKED_AT",
        "Current metadata summary or input requires checkedAt.",
        "checkedAt"
      )
    );
  }
  if (ageMs !== undefined && ageMs > freshnessThresholdMs) {
    findings.push(
      finding(
        "freshness",
        "blocker",
        "STALE_EVIDENCE",
        "Observer evidence is stale for this desktop target.",
        "observerEvidenceSummary.observedAt"
      )
    );
  }
  if (ageMs !== undefined && ageMs < 0) {
    findings.push(
      finding(
        "freshness",
        "warning",
        "FUTURE_OBSERVED_AT",
        "Observed timestamp is after checked timestamp.",
        "observerEvidenceSummary.observedAt"
      )
    );
  }

  if (
    differentDefined(evidence?.appIdHash, current?.appIdHash) ||
    differentDefined(target?.appIdHash, current?.appIdHash)
  ) {
    mismatchCounts.appMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "blocker",
        "APP_MISMATCH",
        "Current app hash does not match the proposal evidence.",
        "currentMetadataSummary.appIdHash"
      )
    );
  }
  if (
    differentDefined(evidence?.windowIdHash, current?.windowIdHash) ||
    differentDefined(target?.windowIdHash, current?.windowIdHash)
  ) {
    mismatchCounts.windowMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "blocker",
        "WINDOW_MISMATCH",
        "Current window hash does not match the proposal evidence.",
        "currentMetadataSummary.windowIdHash"
      )
    );
  }
  if (
    differentDefined(evidence?.displayIdHash, current?.displayIdHash) ||
    differentDefined(target?.displayIdHash, current?.displayIdHash)
  ) {
    mismatchCounts.displayMismatchCount += 1;
    const strict = parsed.record.strictDisplayMatch === true;
    findings.push(
      finding(
        "mismatch",
        strict ? "blocker" : "warning",
        strict ? "DISPLAY_MISMATCH" : "DISPLAY_MISMATCH_WARNING",
        "Current display hash differs from the proposal evidence.",
        "currentMetadataSummary.displayIdHash"
      )
    );
  }
  if (
    differentDefined(evidence?.boundsHash, current?.boundsHash) ||
    differentDefined(target?.boundsHash, current?.boundsHash)
  ) {
    mismatchCounts.boundsMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "warning",
        "BOUNDS_MISMATCH",
        "Current bounds hash differs from the proposal target summary.",
        "currentMetadataSummary.boundsHash"
      )
    );
  }
  if (
    differentDefined(evidence?.targetHash, current?.targetHash) ||
    differentDefined(target?.targetHash, current?.targetHash)
  ) {
    mismatchCounts.targetHashMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "blocker",
        "TARGET_HASH_MISMATCH",
        "Current target hash differs from the proposal target summary.",
        "currentMetadataSummary.targetHash"
      )
    );
  }
  if (
    evidence?.labelSummary &&
    current?.labelSummary &&
    !sameDefined(evidence.labelSummary, current.labelSummary)
  ) {
    mismatchCounts.labelMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "warning",
        "TARGET_LABEL_MISMATCH",
        "Current label summary differs from the observed label summary.",
        "currentMetadataSummary.labelSummary"
      )
    );
  }
  if (current?.focusState === "not_focused") {
    mismatchCounts.focusMismatchCount += 1;
    findings.push(
      finding(
        "mismatch",
        "warning",
        "FOCUS_MISMATCH",
        "Current target is not focused.",
        "currentMetadataSummary.focusState"
      )
    );
  }
  if (
    current?.windowState === "minimized" ||
    current?.windowState === "hidden"
  ) {
    mismatchCounts.windowStateMismatchCount += 1;
    findings.push(
      finding(
        "window_state",
        "blocker",
        "WINDOW_NOT_VISIBLE",
        "Current window is minimized or hidden.",
        "currentMetadataSummary.windowState"
      )
    );
  }
  if ((current?.monitorCount ?? 1) > 1 && !current?.displayIdHash) {
    mismatchCounts.multiMonitorWarningCount += 1;
    findings.push(
      finding(
        "mismatch",
        "warning",
        "MULTI_MONITOR_DISPLAY_UNKNOWN",
        "Multi-monitor metadata requires display hash summary.",
        "currentMetadataSummary.displayIdHash"
      )
    );
  }
  if (
    typeof target?.confidence === "number" &&
    target.confidence < targetConfidenceThreshold
  ) {
    findings.push(
      finding(
        "mismatch",
        "warning",
        "LOW_TARGET_CONFIDENCE",
        "Target confidence is below threshold.",
        "actionProposalTargetSummary.confidence"
      )
    );
  }
  if (
    containsSensitiveLabel(
      evidence?.labelSummary,
      current?.labelSummary,
      target?.labelSummary
    )
  ) {
    findings.push(
      finding(
        "sensitive_target",
        "warning",
        "SENSITIVE_TARGET_LABEL",
        "Target label appears sensitive or destructive.",
        "actionProposalTargetSummary.labelSummary"
      )
    );
  }

  return buildReport(
    {
      evidence,
      current,
      target,
      checkedAt,
      ageMs,
      freshnessThresholdMs,
      targetConfidenceThreshold,
      mismatchCounts
    },
    findings
  );
}

export function summarizeDesktopTargetFreshness(
  report: DesktopTargetFreshnessReport
): Pick<
  DesktopTargetFreshnessReport,
  | "status"
  | "freshnessId"
  | "evidenceRefId"
  | "targetId"
  | "ageMs"
  | "freshnessThresholdMs"
  | "mismatchCounts"
  | "targetHash"
  | "evidenceHash"
  | "warningCodes"
  | "blockerCodes"
  | "readiness"
  | "reportHash"
  | "source"
> {
  return {
    status: report.status,
    freshnessId: report.freshnessId,
    evidenceRefId: report.evidenceRefId,
    targetId: report.targetId,
    ageMs: report.ageMs,
    freshnessThresholdMs: report.freshnessThresholdMs,
    mismatchCounts: report.mismatchCounts,
    targetHash: report.targetHash,
    evidenceHash: report.evidenceHash,
    warningCodes: report.warningCodes,
    blockerCodes: report.blockerCodes,
    readiness: report.readiness,
    reportHash: report.reportHash,
    source: report.source
  };
}
