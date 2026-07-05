import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopTargetFreshnessRecoveryInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopTargetFreshnessRecoveryStatus =
  | "fresh"
  | "warning"
  | "blocked"
  | "empty";

export type DesktopTargetFreshnessRecoverySeverity = "blocker" | "warning";

export type DesktopTargetFreshnessRecoveryFindingKind =
  | "schema"
  | "freshness"
  | "mismatch"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "readiness";

export type DesktopTargetFreshnessRecoveryFinding = {
  findingId: string;
  kind: DesktopTargetFreshnessRecoveryFindingKind;
  severity: DesktopTargetFreshnessRecoverySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopTargetFreshnessStaleReasonCode =
  | "OBSERVATION_TOO_OLD"
  | "WINDOW_ID_MISMATCH"
  | "APP_ID_MISMATCH"
  | "TITLE_HASH_MISMATCH"
  | "BOUNDS_HASH_MISMATCH"
  | "DISPLAY_ID_MISMATCH"
  | "MONITOR_TOPOLOGY_HASH_MISMATCH"
  | "FOREGROUND_FOCUS_MISMATCH"
  | "STALE_SCREENSHOT_METADATA"
  | "STALE_TARGET_METADATA";

export type DesktopTargetFreshnessHashComparison = {
  kind:
    | "window_id"
    | "app_id"
    | "title"
    | "bounds"
    | "display_id"
    | "monitor_topology"
    | "foreground_focus"
    | "screenshot_metadata"
    | "target_metadata";
  status: "match" | "mismatch" | "missing" | "not_checked";
  expectedHash?: string | undefined;
  currentHash?: string | undefined;
  policy: "block" | "warn" | "observe";
};

export type DesktopTargetFreshnessAgeSummary = {
  observedAt?: string | undefined;
  checkedAt?: string | undefined;
  ageMs?: number | undefined;
  staleThresholdMs: number;
  isStale: boolean;
};

export type DesktopTargetFreshnessRecoveryRecommendation = {
  kind:
    | "no_recovery_needed"
    | "refresh_observation"
    | "manual_review"
    | "stop_and_reobserve"
    | "privacy_review";
  summary: string;
  summaryOnly: true;
};

export type DesktopTargetFreshnessRecoveryReadiness = {
  canUseFreshnessForExecution: false;
  canRetryDesktopAction: false;
  canRefreshAutomatically: false;
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

export type DesktopTargetFreshnessRecoveryReport = {
  status: DesktopTargetFreshnessRecoveryStatus;
  recoveryId: string;
  actionId?: string | undefined;
  proposalId?: string | undefined;
  evidenceRefId?: string | undefined;
  targetId?: string | undefined;
  ageSummary: DesktopTargetFreshnessAgeSummary;
  staleReasonCodes: DesktopTargetFreshnessStaleReasonCode[];
  hashComparisons: DesktopTargetFreshnessHashComparison[];
  blockerCodes: string[];
  warningCodes: string[];
  recoveryRecommendation: DesktopTargetFreshnessRecoveryRecommendation;
  findings: DesktopTargetFreshnessRecoveryFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopTargetFreshnessRecoveryReadiness;
  reportHash: string;
  source: "runtime_desktop_target_freshness_recovery";
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
    "canUseFreshnessForExecution",
    "canRetryDesktopAction",
    "canRefreshAutomatically",
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

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function finding(
  kind: DesktopTargetFreshnessRecoveryFindingKind,
  severity: DesktopTargetFreshnessRecoverySeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopTargetFreshnessRecoveryFinding {
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

function readiness(): DesktopTargetFreshnessRecoveryReadiness {
  return {
    canUseFreshnessForExecution: false,
    canRetryDesktopAction: false,
    canRefreshAutomatically: false,
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

function parseInput(input: DesktopTargetFreshnessRecoveryInput): {
  record?: Record<string, unknown>;
  findings: DesktopTargetFreshnessRecoveryFinding[];
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
              "Desktop target freshness recovery JSON must be an object."
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
            "Desktop target freshness recovery JSON could not be parsed."
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
          "Desktop target freshness recovery input must be an object."
        )
      ]
    };
  }

  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopTargetFreshnessRecoveryFinding[]
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
          "Desktop target freshness recovery cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings);
  }
}

function readSummaryRecord(
  value: unknown
): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function parseTimeMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hashFrom(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = readString(value);
    if (text) {
      return text;
    }
  }
  return undefined;
}

function compareHashes(
  kind: DesktopTargetFreshnessHashComparison["kind"],
  expectedHash: string | undefined,
  currentHash: string | undefined,
  policy: DesktopTargetFreshnessHashComparison["policy"]
): DesktopTargetFreshnessHashComparison {
  if (!expectedHash && !currentHash) {
    return { kind, status: "not_checked", policy };
  }
  if (!expectedHash || !currentHash) {
    return {
      kind,
      status: "missing",
      expectedHash,
      currentHash,
      policy
    };
  }
  return {
    kind,
    status: expectedHash === currentHash ? "match" : "mismatch",
    expectedHash,
    currentHash,
    policy
  };
}

function addMismatchFinding(
  comparison: DesktopTargetFreshnessHashComparison,
  findings: DesktopTargetFreshnessRecoveryFinding[],
  staleReasonCodes: Set<DesktopTargetFreshnessStaleReasonCode>,
  reasonCode: DesktopTargetFreshnessStaleReasonCode,
  path: string,
  safeMessage: string
): void {
  if (comparison.status !== "mismatch") {
    return;
  }
  staleReasonCodes.add(reasonCode);
  findings.push(
    finding(
      "mismatch",
      comparison.policy === "warn" ? "warning" : "blocker",
      reasonCode,
      safeMessage,
      path
    )
  );
}

function recommendation(
  status: DesktopTargetFreshnessRecoveryStatus,
  staleReasonCodes: DesktopTargetFreshnessStaleReasonCode[]
): DesktopTargetFreshnessRecoveryRecommendation {
  if (status === "empty") {
    return {
      kind: "manual_review",
      summary: "No freshness recovery input was provided.",
      summaryOnly: true
    };
  }
  if (status === "blocked") {
    return {
      kind: staleReasonCodes.includes("STALE_SCREENSHOT_METADATA")
        ? "privacy_review"
        : "stop_and_reobserve",
      summary:
        "Block desktop action execution and refresh summary-only observation before any follow-up.",
      summaryOnly: true
    };
  }
  if (status === "warning") {
    return {
      kind: "refresh_observation",
      summary:
        "Keep the action disabled and refresh observation or route to manual review.",
      summaryOnly: true
    };
  }
  return {
    kind: "no_recovery_needed",
    summary:
      "Freshness metadata is consistent, but this report still grants no execution readiness.",
    summaryOnly: true
  };
}

function buildReport(
  input: {
    record?: Record<string, unknown> | undefined;
    evidence?: Record<string, unknown> | undefined;
    current?: Record<string, unknown> | undefined;
    target?: Record<string, unknown> | undefined;
    ageSummary: DesktopTargetFreshnessAgeSummary;
    staleReasonCodes: DesktopTargetFreshnessStaleReasonCode[];
    hashComparisons: DesktopTargetFreshnessHashComparison[];
  },
  findings: DesktopTargetFreshnessRecoveryFinding[]
): DesktopTargetFreshnessRecoveryReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopTargetFreshnessRecoveryStatus = !input.record
    ? findings.length > 0
      ? "blocked"
      : "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "fresh";
  const reportCore = {
    status,
    actionId: readString(input.record?.actionId),
    proposalId: readString(input.record?.proposalId),
    evidenceRefId: readString(input.evidence?.evidenceRefId),
    targetId:
      readString(input.target?.targetId) ?? readString(input.record?.targetId),
    ageSummary: input.ageSummary,
    staleReasonCodes: input.staleReasonCodes,
    hashComparisons: input.hashComparisons.map((comparison) => ({
      kind: comparison.kind,
      status: comparison.status,
      policy: comparison.policy,
      expectedHash: comparison.expectedHash,
      currentHash: comparison.currentHash
    })),
    blockerCodes: findings
      .filter((item) => item.severity === "blocker")
      .map((item) => item.code),
    warningCodes: findings
      .filter((item) => item.severity === "warning")
      .map((item) => item.code)
  };
  const reportHash = stablePreviewHash(JSON.stringify(reportCore));
  return {
    ...reportCore,
    status,
    recoveryId: reportHash.slice(0, 16),
    recoveryRecommendation: recommendation(status, input.staleReasonCodes),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(),
    reportHash,
    source: "runtime_desktop_target_freshness_recovery"
  };
}

export function buildDesktopTargetFreshnessRecoveryReport(
  input: DesktopTargetFreshnessRecoveryInput
): DesktopTargetFreshnessRecoveryReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  const staleReasonCodes = new Set<DesktopTargetFreshnessStaleReasonCode>();
  const staleThresholdMs =
    readNumber(parsed.record?.staleThresholdMs) ??
    readNumber(parsed.record?.freshnessThresholdMs) ??
    5 * 60 * 1000;
  const emptyAgeSummary: DesktopTargetFreshnessAgeSummary = {
    staleThresholdMs,
    isStale: false
  };
  if (!parsed.record) {
    return buildReport(
      {
        record: parsed.record,
        ageSummary: emptyAgeSummary,
        staleReasonCodes: [],
        hashComparisons: []
      },
      findings
    );
  }

  scanUnsafeFields(parsed.record, "", findings);

  const evidence = readSummaryRecord(
    parsed.record.observerEvidenceSummary ??
      parsed.record.observationSummary ??
      parsed.record.evidenceSummary
  );
  const current = readSummaryRecord(
    parsed.record.currentTargetSummary ??
      parsed.record.currentMetadataSummary ??
      parsed.record.currentObservationSummary
  );
  const target = readSummaryRecord(
    parsed.record.actionProposalTargetSummary ??
      parsed.record.actionTargetSummary ??
      parsed.record.targetSummary
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
        "MISSING_CURRENT_TARGET_SUMMARY",
        "Current target summary is required.",
        "currentTargetSummary"
      )
    );
  }

  const checkedAt =
    readString(parsed.record.checkedAt) ?? readString(current?.capturedAt);
  const observedAt =
    readString(evidence?.observedAt) ?? readString(evidence?.capturedAt);
  const observedMs = parseTimeMs(observedAt);
  const checkedMs = parseTimeMs(checkedAt);
  const ageMs =
    observedMs !== undefined && checkedMs !== undefined
      ? checkedMs - observedMs
      : undefined;
  const ageSummary: DesktopTargetFreshnessAgeSummary = {
    observedAt,
    checkedAt,
    ageMs,
    staleThresholdMs,
    isStale: ageMs !== undefined && ageMs > staleThresholdMs
  };

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
        "Current target summary or input requires checkedAt.",
        "checkedAt"
      )
    );
  }
  if (ageSummary.isStale) {
    staleReasonCodes.add("OBSERVATION_TOO_OLD");
    findings.push(
      finding(
        "freshness",
        "blocker",
        "OBSERVATION_TOO_OLD",
        "Observer evidence is too old for desktop action recovery.",
        "observerEvidenceSummary.observedAt"
      )
    );
  }
  if (ageMs !== undefined && ageMs < 0) {
    findings.push(
      finding(
        "freshness",
        "warning",
        "OBSERVED_AT_AFTER_CHECKED_AT",
        "Observed timestamp is after checked timestamp.",
        "observerEvidenceSummary.observedAt"
      )
    );
  }

  const boundsPolicy =
    readString(parsed.record.boundsDriftPolicy) === "block" ? "block" : "warn";
  const windowIdComparison = compareHashes(
    "window_id",
    hashFrom(target?.windowIdHash, evidence?.windowIdHash),
    hashFrom(current?.windowIdHash),
    "block"
  );
  const appIdComparison = compareHashes(
    "app_id",
    hashFrom(target?.appIdHash, evidence?.appIdHash),
    hashFrom(current?.appIdHash),
    "block"
  );
  const titleComparison = compareHashes(
    "title",
    hashFrom(target?.titleHash, evidence?.titleHash),
    hashFrom(current?.titleHash),
    "block"
  );
  const boundsComparison = compareHashes(
    "bounds",
    hashFrom(target?.boundsHash, evidence?.boundsHash),
    hashFrom(current?.boundsHash),
    boundsPolicy
  );
  const displayIdComparison = compareHashes(
    "display_id",
    hashFrom(target?.displayIdHash, evidence?.displayIdHash),
    hashFrom(current?.displayIdHash),
    "block"
  );
  const monitorTopologyComparison = compareHashes(
    "monitor_topology",
    hashFrom(
      target?.monitorTopologyHash,
      evidence?.monitorTopologyHash,
      parsed.record.monitorTopologyHash
    ),
    hashFrom(current?.monitorTopologyHash),
    "block"
  );
  const foregroundFocusComparison = compareHashes(
    "foreground_focus",
    hashFrom(
      target?.foregroundFocusHash,
      evidence?.foregroundFocusHash,
      evidence?.focusWindowIdHash
    ),
    hashFrom(current?.foregroundFocusHash, current?.focusWindowIdHash),
    "block"
  );
  const screenshotMetadataComparison = compareHashes(
    "screenshot_metadata",
    hashFrom(evidence?.screenshotMetadataHash),
    hashFrom(current?.screenshotMetadataHash),
    "block"
  );
  const targetMetadataComparison = compareHashes(
    "target_metadata",
    hashFrom(target?.targetMetadataHash, evidence?.targetMetadataHash),
    hashFrom(current?.targetMetadataHash),
    "block"
  );
  const comparisons: DesktopTargetFreshnessHashComparison[] = [
    windowIdComparison,
    appIdComparison,
    titleComparison,
    boundsComparison,
    displayIdComparison,
    monitorTopologyComparison,
    foregroundFocusComparison,
    screenshotMetadataComparison,
    targetMetadataComparison
  ];

  addMismatchFinding(
    windowIdComparison,
    findings,
    staleReasonCodes,
    "WINDOW_ID_MISMATCH",
    "currentTargetSummary.windowIdHash",
    "Current window id hash does not match observed target metadata."
  );
  addMismatchFinding(
    appIdComparison,
    findings,
    staleReasonCodes,
    "APP_ID_MISMATCH",
    "currentTargetSummary.appIdHash",
    "Current app id hash does not match observed target metadata."
  );
  addMismatchFinding(
    titleComparison,
    findings,
    staleReasonCodes,
    "TITLE_HASH_MISMATCH",
    "currentTargetSummary.titleHash",
    "Current title hash does not match observed target metadata."
  );
  addMismatchFinding(
    boundsComparison,
    findings,
    staleReasonCodes,
    "BOUNDS_HASH_MISMATCH",
    "currentTargetSummary.boundsHash",
    "Current bounds hash differs from observed target metadata."
  );
  addMismatchFinding(
    displayIdComparison,
    findings,
    staleReasonCodes,
    "DISPLAY_ID_MISMATCH",
    "currentTargetSummary.displayIdHash",
    "Current display id hash does not match observed target metadata."
  );
  addMismatchFinding(
    monitorTopologyComparison,
    findings,
    staleReasonCodes,
    "MONITOR_TOPOLOGY_HASH_MISMATCH",
    "currentTargetSummary.monitorTopologyHash",
    "Monitor topology hash does not match observed target metadata."
  );
  addMismatchFinding(
    foregroundFocusComparison,
    findings,
    staleReasonCodes,
    "FOREGROUND_FOCUS_MISMATCH",
    "currentTargetSummary.foregroundFocusHash",
    "Foreground or focus metadata does not match observed target metadata."
  );
  addMismatchFinding(
    screenshotMetadataComparison,
    findings,
    staleReasonCodes,
    "STALE_SCREENSHOT_METADATA",
    "currentTargetSummary.screenshotMetadataHash",
    "Screenshot metadata hash is stale or inconsistent."
  );
  addMismatchFinding(
    targetMetadataComparison,
    findings,
    staleReasonCodes,
    "STALE_TARGET_METADATA",
    "currentTargetSummary.targetMetadataHash",
    "Target metadata hash is stale or inconsistent."
  );

  if (readBoolean(current?.screenshotMetadataStale) === true) {
    staleReasonCodes.add("STALE_SCREENSHOT_METADATA");
    findings.push(
      finding(
        "freshness",
        "blocker",
        "STALE_SCREENSHOT_METADATA",
        "Current screenshot metadata is marked stale.",
        "currentTargetSummary.screenshotMetadataStale"
      )
    );
  }
  if (readBoolean(current?.targetMetadataStale) === true) {
    staleReasonCodes.add("STALE_TARGET_METADATA");
    findings.push(
      finding(
        "freshness",
        "blocker",
        "STALE_TARGET_METADATA",
        "Current target metadata is marked stale.",
        "currentTargetSummary.targetMetadataStale"
      )
    );
  }
  if (
    readString(current?.focusState) === "not_focused" ||
    readString(current?.foregroundState) === "background"
  ) {
    staleReasonCodes.add("FOREGROUND_FOCUS_MISMATCH");
    findings.push(
      finding(
        "mismatch",
        "blocker",
        "FOREGROUND_FOCUS_MISMATCH",
        "Current target is not focused or foregrounded.",
        "currentTargetSummary.focusState"
      )
    );
  }

  return buildReport(
    {
      record: parsed.record,
      evidence,
      current,
      target,
      ageSummary,
      staleReasonCodes: Array.from(staleReasonCodes),
      hashComparisons: comparisons
    },
    findings
  );
}

export function summarizeDesktopTargetFreshnessRecoveryReport(
  report: DesktopTargetFreshnessRecoveryReport
): Pick<
  DesktopTargetFreshnessRecoveryReport,
  | "status"
  | "recoveryId"
  | "actionId"
  | "proposalId"
  | "evidenceRefId"
  | "targetId"
  | "ageSummary"
  | "staleReasonCodes"
  | "hashComparisons"
  | "blockerCodes"
  | "warningCodes"
  | "recoveryRecommendation"
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
    evidenceRefId: report.evidenceRefId,
    targetId: report.targetId,
    ageSummary: report.ageSummary,
    staleReasonCodes: report.staleReasonCodes,
    hashComparisons: report.hashComparisons,
    blockerCodes: report.blockerCodes,
    warningCodes: report.warningCodes,
    recoveryRecommendation: report.recoveryRecommendation,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    readiness: report.readiness,
    reportHash: report.reportHash,
    source: report.source
  };
}
