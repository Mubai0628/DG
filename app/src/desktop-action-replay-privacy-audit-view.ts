export type DesktopActionReplayPrivacyAuditViewStatus =
  | "empty"
  | "summary_ready"
  | "warning"
  | "blocked";

export type DesktopActionReplayPrivacyAuditViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type DesktopActionReplayPrivacyAuditViewReadiness = {
  canPreviewReplayAudit: boolean;
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

export type DesktopActionReplayPrivacyAuditView = {
  status: DesktopActionReplayPrivacyAuditViewStatus;
  source: "app_desktop_action_replay_privacy_audit";
  auditId: string;
  missingEventRefCount: number;
  rawFieldDetectedCount: number;
  rawScreenshotCount: number;
  rawOcrCount: number;
  rawTargetTextCount: number;
  rawClipboardCount: number;
  apiKeyMarkerCount: number;
  privacyLeakDetected: boolean;
  replayCanReexecute: false;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix?: string | undefined;
  readiness: DesktopActionReplayPrivacyAuditViewReadiness;
  findings: DesktopActionReplayPrivacyAuditViewFinding[];
  nextAction: string;
};

export type DesktopActionReplayPrivacyAuditViewInput = {
  auditJsonText?: string | undefined;
  createdAt?: string | undefined;
};

const forbiddenFieldNames = new Set(
  [
    "raw" + "Screenshot",
    "screenshotBytes",
    "rawOcr",
    "rawOcrText",
    "ocrText",
    "rawTargetText",
    "targetTextRaw",
    "targetText",
    "rawClipboard",
    "clipboardContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "desktopCommand",
    "nativeBridge",
    "tauriCommand",
    "eventStoreWrite",
    "clickNow",
    "typeNow",
    "retryNow",
    "undoNow",
    "executeNow",
    "replayExecuteNow"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canReplayExecuteAction",
    "canReplayExecute",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute",
    "replayExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafePatterns = [
  { code: "RAW_SCREENSHOT_MARKER", pattern: /\bRAW_SCREENSHOT\b/i },
  { code: "RAW_OCR_MARKER", pattern: /\bRAW_OCR\b/i },
  { code: "RAW_TARGET_TEXT_MARKER", pattern: /\bRAW_TARGET_TEXT\b/i },
  { code: "RAW_CLIPBOARD_MARKER", pattern: /\bRAW_CLIPBOARD\b/i },
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  { code: "BEARER_TOKEN_MARKER", pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i },
  { code: "AUTHORIZATION_MARKER", pattern: /\bAuthorization\s*[:=]/i }
];

export function buildDesktopActionReplayPrivacyAuditView(
  input: DesktopActionReplayPrivacyAuditViewInput = {}
): DesktopActionReplayPrivacyAuditView {
  const trimmed = (input.auditJsonText ?? "").trim();
  if (trimmed.length === 0) {
    return viewFrom({
      status: "empty",
      hashSeed: input.createdAt ?? "empty",
      findings: [],
      missingEventRefCount: 0,
      rawFieldDetectedCount: 0,
      rawScreenshotCount: 0,
      rawOcrCount: 0,
      rawTargetTextCount: 0,
      rawClipboardCount: 0,
      apiKeyMarkerCount: 0,
      nextAction: "Paste summary-only replay privacy audit JSON to preview."
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return viewFrom({
      status: "blocked",
      hashSeed: trimmed,
      findings: [
        finding(
          "MALFORMED_REPLAY_AUDIT_JSON",
          "blocker",
          "Replay privacy audit JSON could not be parsed."
        )
      ],
      missingEventRefCount: 0,
      rawFieldDetectedCount: 0,
      rawScreenshotCount: 0,
      rawOcrCount: 0,
      rawTargetTextCount: 0,
      rawClipboardCount: 0,
      apiKeyMarkerCount: 0,
      nextAction: "Provide valid summary-only replay privacy audit JSON."
    });
  }

  if (!isRecord(parsed)) {
    return viewFrom({
      status: "blocked",
      hashSeed: trimmed,
      findings: [
        finding(
          "REPLAY_AUDIT_JSON_NOT_OBJECT",
          "blocker",
          "Replay privacy audit JSON must be an object."
        )
      ],
      missingEventRefCount: 0,
      rawFieldDetectedCount: 0,
      rawScreenshotCount: 0,
      rawOcrCount: 0,
      rawTargetTextCount: 0,
      rawClipboardCount: 0,
      apiKeyMarkerCount: 0,
      nextAction: "Provide a summary-only replay privacy audit object."
    });
  }

  const findings: DesktopActionReplayPrivacyAuditViewFinding[] = [];
  scanUnsafe(parsed, findings);
  const privacyLeakCounts = isRecord(parsed.privacyLeakCounts)
    ? parsed.privacyLeakCounts
    : {};
  const redactionSummary = isRecord(parsed.redactionSummary)
    ? parsed.redactionSummary
    : {};
  const missingEventRefCount = Array.isArray(parsed.missingEventRefs)
    ? parsed.missingEventRefs.length
    : readCount(parsed.missingEventRefCount);
  const rawFieldDetectedCount =
    readCount(redactionSummary.rawFieldDetectedCount) ||
    readCount(privacyLeakCounts.rawFieldCount);
  const rawScreenshotCount = readCount(privacyLeakCounts.rawScreenshotCount);
  const rawOcrCount = readCount(privacyLeakCounts.rawOcrCount);
  const rawTargetTextCount = readCount(privacyLeakCounts.rawTargetTextCount);
  const rawClipboardCount = readCount(privacyLeakCounts.rawClipboardCount);
  const apiKeyMarkerCount = readCount(privacyLeakCounts.apiKeyMarkerCount);
  const inputBlockerCount = readCount(parsed.blockerCount);
  const inputWarningCount = readCount(parsed.warningCount);
  if (missingEventRefCount > 0) {
    findings.push(
      finding(
        "MISSING_REPLAY_EVENT_REFS",
        "blocker",
        "Replay audit reports missing event refs."
      )
    );
  }
  if (
    rawFieldDetectedCount > 0 ||
    rawScreenshotCount > 0 ||
    rawOcrCount > 0 ||
    rawTargetTextCount > 0 ||
    rawClipboardCount > 0 ||
    apiKeyMarkerCount > 0
  ) {
    findings.push(
      finding(
        "REPLAY_PRIVACY_LEAK_COUNT",
        "blocker",
        "Replay audit reports raw privacy or API key leak counts."
      )
    );
  }
  if (parsed.status === "blocked" || inputBlockerCount > 0) {
    findings.push(
      finding(
        "REPLAY_AUDIT_BLOCKED",
        "blocker",
        "Replay audit summary reports blockers."
      )
    );
  }
  if (parsed.status === "warning" || inputWarningCount > 0) {
    findings.push(
      finding(
        "REPLAY_AUDIT_WARNING",
        "warning",
        "Replay audit summary reports warnings."
      )
    );
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionReplayPrivacyAuditViewStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "summary_ready";

  return viewFrom({
    status,
    hashSeed: stableStringify(parsed),
    findings,
    missingEventRefCount,
    rawFieldDetectedCount,
    rawScreenshotCount,
    rawOcrCount,
    rawTargetTextCount,
    rawClipboardCount,
    apiKeyMarkerCount,
    nextAction:
      status === "blocked"
        ? "Remove raw or incomplete replay audit fields before preview."
        : "Replay privacy audit is read-only; replay execution remains disabled."
  });
}

export function summarizeDesktopActionReplayPrivacyAuditView(
  view: DesktopActionReplayPrivacyAuditView
): {
  status: DesktopActionReplayPrivacyAuditViewStatus;
  auditId: string;
  missingEventRefCount: number;
  rawFieldDetectedCount: number;
  privacyLeakDetected: boolean;
  blockerCount: number;
  warningCount: number;
  hashPrefix?: string | undefined;
  nextAction: string;
  source: "app_desktop_action_replay_privacy_audit";
} {
  return {
    status: view.status,
    auditId: view.auditId,
    missingEventRefCount: view.missingEventRefCount,
    rawFieldDetectedCount: view.rawFieldDetectedCount,
    privacyLeakDetected: view.privacyLeakDetected,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

function scanUnsafe(
  value: unknown,
  findings: DesktopActionReplayPrivacyAuditViewFinding[],
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafePatterns) {
      if (pattern.test(value)) {
        findings.push(finding(code, "blocker", "Unsafe raw or secret marker."));
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanUnsafe(item, findings, seen));
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldNames.has(normalizedKey)) {
      findings.push(
        finding(
          `${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_FIELD_REJECTED`,
          "blocker",
          "Forbidden raw, secret, or execution field was rejected."
        )
      );
    }
    if (executionFlagNames.has(normalizedKey) && child === true) {
      findings.push(
        finding(
          "REPLAY_EXECUTION_FLAG_TRUE",
          "blocker",
          "Replay audit cannot enable desktop action execution."
        )
      );
    }
    scanUnsafe(child, findings, seen);
  }
}

function viewFrom(args: {
  status: DesktopActionReplayPrivacyAuditViewStatus;
  hashSeed: string;
  findings: DesktopActionReplayPrivacyAuditViewFinding[];
  missingEventRefCount: number;
  rawFieldDetectedCount: number;
  rawScreenshotCount: number;
  rawOcrCount: number;
  rawTargetTextCount: number;
  rawClipboardCount: number;
  apiKeyMarkerCount: number;
  nextAction: string;
}): DesktopActionReplayPrivacyAuditView {
  const hash = hashText(args.hashSeed);
  const blockerCount = args.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const privacyLeakDetected =
    args.rawFieldDetectedCount > 0 ||
    args.rawScreenshotCount > 0 ||
    args.rawOcrCount > 0 ||
    args.rawTargetTextCount > 0 ||
    args.rawClipboardCount > 0;
  return {
    status: args.status,
    source: "app_desktop_action_replay_privacy_audit",
    auditId: `desktop-action-replay-privacy-audit-${hash.slice(0, 12)}`,
    missingEventRefCount: args.missingEventRefCount,
    rawFieldDetectedCount: args.rawFieldDetectedCount,
    rawScreenshotCount: args.rawScreenshotCount,
    rawOcrCount: args.rawOcrCount,
    rawTargetTextCount: args.rawTargetTextCount,
    rawClipboardCount: args.rawClipboardCount,
    apiKeyMarkerCount: args.apiKeyMarkerCount,
    privacyLeakDetected,
    replayCanReexecute: false,
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    hashPrefix: hash.slice(0, 12),
    readiness: {
      canPreviewReplayAudit:
        args.status !== "empty" && args.status !== "blocked",
      canReplayExecuteAction: false,
      canExecuteDesktopAction: false,
      canClick: false,
      canType: false,
      canWriteClipboard: false,
      canOpenFileDialog: false,
      canWriteEventStore: false,
      canUseNativeBridge: false,
      appCanExecute: false
    },
    findings: args.findings,
    nextAction: args.nextAction
  };
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string
): DesktopActionReplayPrivacyAuditViewFinding {
  return { code, severity, safeMessage };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
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
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
