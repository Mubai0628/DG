import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionReplayPrivacyAuditInput =
  | Record<string, unknown>
  | string
  | unknown;

export type DesktopActionReplayPrivacyAuditStatus =
  | "replay_ready"
  | "warning"
  | "blocked"
  | "empty";

export type DesktopActionReplayPrivacySeverity = "blocker" | "warning";

export type DesktopActionReplayPrivacyFindingKind =
  | "schema"
  | "completeness"
  | "privacy"
  | "execution_field"
  | "readiness";

export type DesktopActionReplayPrivacyFinding = {
  findingId: string;
  kind: DesktopActionReplayPrivacyFindingKind;
  severity: DesktopActionReplayPrivacySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionReplayMissingEventRef = {
  kind:
    | "observer_evidence_ref"
    | "action_proposal_id"
    | "approval_receipt_summary"
    | "execution_result_summary"
    | "recovery_summary";
  code: string;
  summary: string;
};

export type DesktopActionReplayPrivacyLeakCounts = {
  rawScreenshotCount: number;
  rawOcrCount: number;
  rawTargetTextCount: number;
  rawClipboardCount: number;
  apiKeyMarkerCount: number;
  rawFieldCount: number;
};

export type DesktopActionReplayRedactionSummary = {
  summaryOnly: true;
  rawFieldDetectedCount: number;
  privacyLeakDetected: boolean;
  apiKeyLeakDetected: boolean;
  replayCanReexecute: false;
};

export type DesktopActionReplayPrivacyReadiness = {
  canReplayForAudit: boolean;
  canReplayExecuteAction: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionReplayPrivacyAuditReport = {
  status: DesktopActionReplayPrivacyAuditStatus;
  auditId: string;
  observerEvidenceRefId?: string | undefined;
  proposalId?: string | undefined;
  approvalReceiptId?: string | undefined;
  executionResultId?: string | undefined;
  recoverySummaryId?: string | undefined;
  missingEventRefs: DesktopActionReplayMissingEventRef[];
  privacyLeakCounts: DesktopActionReplayPrivacyLeakCounts;
  redactionSummary: DesktopActionReplayRedactionSummary;
  warningCodes: string[];
  blockerCodes: string[];
  findings: DesktopActionReplayPrivacyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: DesktopActionReplayPrivacyReadiness;
  reportHash: string;
  source: "runtime_desktop_action_replay_privacy_audit";
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
    "rawClipboard",
    "clipboardContent",
    "rawPrompt",
    "rawResponse",
    "rawSource",
    "rawDiff",
    "rawDom",
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
    "executeNow",
    "replayExecuteNow"
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
    "replayExecuteNow",
    "canReplayExecute",
    "canReplayExecuteAction",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
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

const rawMarkers: Array<{
  code: keyof DesktopActionReplayPrivacyLeakCounts;
  marker: string;
}> = [
  { code: "rawScreenshotCount", marker: "RAW_SCREENSHOT" },
  { code: "rawOcrCount", marker: "RAW_OCR" },
  { code: "rawTargetTextCount", marker: "RAW_TARGET_TEXT" },
  { code: "rawClipboardCount", marker: "RAW_CLIPBOARD" }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function finding(
  kind: DesktopActionReplayPrivacyFindingKind,
  severity: DesktopActionReplayPrivacySeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionReplayPrivacyFinding {
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

function emptyLeakCounts(): DesktopActionReplayPrivacyLeakCounts {
  return {
    rawScreenshotCount: 0,
    rawOcrCount: 0,
    rawTargetTextCount: 0,
    rawClipboardCount: 0,
    apiKeyMarkerCount: 0,
    rawFieldCount: 0
  };
}

function readiness(
  canReplayForAudit: boolean
): DesktopActionReplayPrivacyReadiness {
  return {
    canReplayForAudit,
    canReplayExecuteAction: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canWriteClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function parseInput(input: DesktopActionReplayPrivacyAuditInput): {
  record?: Record<string, unknown>;
  findings: DesktopActionReplayPrivacyFinding[];
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
              "Desktop action replay privacy audit JSON must be an object."
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
            "Desktop action replay privacy audit JSON could not be parsed."
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
          "Desktop action replay privacy audit input must be an object."
        )
      ]
    };
  }
  return { record: input, findings: [] };
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionReplayPrivacyFinding[],
  leakCounts: DesktopActionReplayPrivacyLeakCounts
): void {
  if (typeof value === "string") {
    for (const item of rawMarkers) {
      if (value.includes(item.marker)) {
        leakCounts[item.code] += 1;
        leakCounts.rawFieldCount += 1;
        findings.push(
          finding(
            "privacy",
            "blocker",
            item.marker,
            "Raw desktop privacy marker is not allowed in replay audit input.",
            path
          )
        );
      }
    }
    if (secretMarkers.some((marker) => value.includes(marker))) {
      leakCounts.apiKeyMarkerCount += 1;
      findings.push(
        finding(
          "privacy",
          "blocker",
          "API_KEY_OR_SECRET_MARKER",
          "Secret-like marker is not allowed in replay audit input.",
          path
        )
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, `${path}[${index}]`, findings, leakCounts)
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
      leakCounts.rawFieldCount += 1;
      if (
        normalizedKey.includes("clipboard") ||
        normalizedKey.includes("rawclipboard")
      ) {
        leakCounts.rawClipboardCount += 1;
      }
      if (normalizedKey.includes("screenshot")) {
        leakCounts.rawScreenshotCount += 1;
      }
      if (normalizedKey.includes("ocr")) {
        leakCounts.rawOcrCount += 1;
      }
      if (
        normalizedKey.includes("targettext") ||
        normalizedKey === "targettext"
      ) {
        leakCounts.rawTargetTextCount += 1;
      }
      findings.push(
        finding(
          executionBooleanKeys.has(normalizedKey)
            ? "execution_field"
            : "privacy",
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
          "REPLAY_EXECUTION_FLAG_TRUE",
          "Replay audit cannot re-execute desktop actions.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings, leakCounts);
  }
}

function recordFor(
  record: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return undefined;
}

function missingRef(
  kind: DesktopActionReplayMissingEventRef["kind"],
  code: string,
  summary: string,
  findings: DesktopActionReplayPrivacyFinding[]
): DesktopActionReplayMissingEventRef {
  findings.push(finding("completeness", "blocker", code, summary));
  return { kind, code, summary };
}

export function buildDesktopActionReplayPrivacyAudit(
  input: DesktopActionReplayPrivacyAuditInput
): DesktopActionReplayPrivacyAuditReport {
  const parsed = parseInput(input);
  const findings = [...parsed.findings];
  const leakCounts = emptyLeakCounts();
  if (!parsed.record) {
    return buildReport(undefined, [], leakCounts, findings);
  }

  scanUnsafeFields(parsed.record, "", findings, leakCounts);

  const observer = recordFor(
    parsed.record,
    "observerEventSummary",
    "observerSummary"
  );
  const proposal = recordFor(
    parsed.record,
    "actionProposalEventSummary",
    "proposalSummary"
  );
  const approval = recordFor(
    parsed.record,
    "approvalReceiptSummary",
    "approvalSummary"
  );
  const execution = recordFor(
    parsed.record,
    "executionResultSummary",
    "executionSummary"
  );
  const recovery = recordFor(
    parsed.record,
    "recoverySummary",
    "desktopOperatorRecoverySummary"
  );
  const requiresRecovery =
    parsed.record.requiresRecoverySummary === true ||
    readString(parsed.record.recoveryReason) === "mismatch" ||
    readString(parsed.record.recoveryReason) === "interruption";

  const missing: DesktopActionReplayMissingEventRef[] = [];
  if (!readString(observer?.evidenceRefId)) {
    missing.push(
      missingRef(
        "observer_evidence_ref",
        "MISSING_OBSERVER_EVIDENCE_REF",
        "Observer event requires an evidence ref.",
        findings
      )
    );
  }
  if (!readString(proposal?.proposalId)) {
    missing.push(
      missingRef(
        "action_proposal_id",
        "MISSING_ACTION_PROPOSAL_ID",
        "Action proposal event requires a proposal id.",
        findings
      )
    );
  }
  if (!approval) {
    missing.push(
      missingRef(
        "approval_receipt_summary",
        "MISSING_APPROVAL_RECEIPT_SUMMARY",
        "Approval receipt summary is required for replay completeness.",
        findings
      )
    );
  }
  if (!execution) {
    missing.push(
      missingRef(
        "execution_result_summary",
        "MISSING_EXECUTION_RESULT_SUMMARY",
        "Execution result summary is required for replay completeness.",
        findings
      )
    );
  }
  if (requiresRecovery && !recovery) {
    missing.push(
      missingRef(
        "recovery_summary",
        "MISSING_RECOVERY_SUMMARY",
        "Recovery summary is required when mismatch or interruption occurred.",
        findings
      )
    );
  }

  return buildReport(parsed.record, missing, leakCounts, findings);
}

function buildReport(
  record: Record<string, unknown> | undefined,
  missingEventRefs: DesktopActionReplayMissingEventRef[],
  privacyLeakCounts: DesktopActionReplayPrivacyLeakCounts,
  findings: DesktopActionReplayPrivacyFinding[]
): DesktopActionReplayPrivacyAuditReport {
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionReplayPrivacyAuditStatus = !record
    ? findings.length > 0
      ? "blocked"
      : "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "replay_ready";
  const observer = recordFor(
    record ?? {},
    "observerEventSummary",
    "observerSummary"
  );
  const proposal = recordFor(
    record ?? {},
    "actionProposalEventSummary",
    "proposalSummary"
  );
  const approval = recordFor(
    record ?? {},
    "approvalReceiptSummary",
    "approvalSummary"
  );
  const execution = recordFor(
    record ?? {},
    "executionResultSummary",
    "executionSummary"
  );
  const recovery = recordFor(
    record ?? {},
    "recoverySummary",
    "desktopOperatorRecoverySummary"
  );
  const redactionSummary: DesktopActionReplayRedactionSummary = {
    summaryOnly: true,
    rawFieldDetectedCount: privacyLeakCounts.rawFieldCount,
    privacyLeakDetected: privacyLeakCounts.rawFieldCount > 0,
    apiKeyLeakDetected: privacyLeakCounts.apiKeyMarkerCount > 0,
    replayCanReexecute: false
  };
  const reportCore = {
    status,
    observerEvidenceRefId: readString(observer?.evidenceRefId),
    proposalId: readString(proposal?.proposalId),
    approvalReceiptId: readString(approval?.approvalReceiptId),
    executionResultId:
      readString(execution?.executionResultId) ??
      readString(execution?.resultId),
    recoverySummaryId: readString(recovery?.recoveryId),
    missingEventRefs,
    privacyLeakCounts,
    redactionSummary,
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
    auditId: reportHash.slice(0, 16),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(status !== "empty" && status !== "blocked"),
    reportHash,
    source: "runtime_desktop_action_replay_privacy_audit"
  };
}

export function summarizeDesktopActionReplayPrivacyAudit(
  report: DesktopActionReplayPrivacyAuditReport
): Pick<
  DesktopActionReplayPrivacyAuditReport,
  | "status"
  | "auditId"
  | "observerEvidenceRefId"
  | "proposalId"
  | "approvalReceiptId"
  | "executionResultId"
  | "recoverySummaryId"
  | "missingEventRefs"
  | "privacyLeakCounts"
  | "redactionSummary"
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
    auditId: report.auditId,
    observerEvidenceRefId: report.observerEvidenceRefId,
    proposalId: report.proposalId,
    approvalReceiptId: report.approvalReceiptId,
    executionResultId: report.executionResultId,
    recoverySummaryId: report.recoverySummaryId,
    missingEventRefs: report.missingEventRefs,
    privacyLeakCounts: report.privacyLeakCounts,
    redactionSummary: report.redactionSummary,
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
