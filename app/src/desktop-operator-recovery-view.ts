export type DesktopOperatorRecoveryStatus =
  | "empty"
  | "summary_ready"
  | "warning"
  | "blocked";

export type DesktopOperatorRecoveryStageKind =
  | "mismatch_recovery"
  | "stale_target_recovery"
  | "interruption_recovery"
  | "compensation_summary";

export type DesktopOperatorRecoveryStage = {
  kind: DesktopOperatorRecoveryStageKind;
  status: "present" | "missing" | "blocked" | "warning";
  summary: string;
  blockerCount: number;
  warningCount: number;
};

export type DesktopOperatorRecoveryFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type DesktopOperatorRecoveryReadiness = {
  canPreviewRecoverySummary: boolean;
  canRetryDesktopAction: false;
  canRunUndoAction: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canReplayDesktopAction: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopOperatorRecoveryView = {
  status: DesktopOperatorRecoveryStatus;
  source: "app_desktop_operator_recovery";
  recoveryId: string;
  sourceKind: "paste" | "fixture" | "manual_test";
  stageCount: number;
  presentStageCount: number;
  missingStageCount: number;
  blockedStageCount: number;
  warningStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: DesktopOperatorRecoveryStage[];
  findings: DesktopOperatorRecoveryFinding[];
  readiness: DesktopOperatorRecoveryReadiness;
  hashPrefix?: string | undefined;
  nextAction: string;
};

export type DesktopOperatorRecoveryInput = {
  recoveryJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
};

const stageKeys: Array<{
  kind: DesktopOperatorRecoveryStageKind;
  keys: string[];
  label: string;
}> = [
  {
    kind: "mismatch_recovery",
    keys: ["mismatchRecovery", "mismatchRecoverySummary"],
    label: "Mismatch recovery"
  },
  {
    kind: "stale_target_recovery",
    keys: ["freshnessRecovery", "staleTargetRecovery"],
    label: "Stale target recovery"
  },
  {
    kind: "interruption_recovery",
    keys: ["interruptionRecovery", "interruptionRecoverySummary"],
    label: "Interruption recovery"
  },
  {
    kind: "compensation_summary",
    keys: ["compensationSummary", "compensationRecovery"],
    label: "Compensation summary"
  }
];

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
    "raw" + "Prompt",
    "rawResponse",
    "rawSource",
    "rawDiff",
    "raw" + "Dom",
    "clipboardContent",
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "password",
    "secret",
    "desktopCommand",
    "nativeBridge",
    "tauriCommand",
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

const executionFlagNames = new Set(
  [
    "canRetryDesktopAction",
    "canRunUndoAction",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canUseClipboard",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canReplayDesktopAction",
    "canReplayExecute",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute",
    "retryEnabled",
    "undoEnabled",
    "desktopActionEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  { code: "RAW_SCREENSHOT_MARKER", pattern: /\bRAW_SCREENSHOT\b/i },
  { code: "RAW_OCR_MARKER", pattern: /\bRAW_OCR\b/i },
  { code: "RAW_TARGET_TEXT_MARKER", pattern: /\bRAW_TARGET_TEXT\b/i },
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`, "i")
  },
  { code: "BEARER_TOKEN_MARKER", pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i },
  { code: "AUTHORIZATION_MARKER", pattern: /\bAuthorization\s*[:=]/i },
  { code: "PRIVATE_KEY_MARKER", pattern: /BEGIN [A-Z ]*PRIVATE KEY/i }
];

export function buildDesktopOperatorRecoveryView(
  input: DesktopOperatorRecoveryInput = {}
): DesktopOperatorRecoveryView {
  const sourceKind = input.sourceKind ?? "paste";
  const trimmed = (input.recoveryJsonText ?? "").trim();
  if (trimmed.length === 0) {
    return viewFrom({
      status: "empty",
      sourceKind,
      hashSeed: input.createdAt ?? "empty",
      stages: [],
      findings: [],
      nextAction:
        "Paste summary-only desktop recovery JSON to preview recovery status."
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return viewFrom({
      status: "blocked",
      sourceKind,
      hashSeed: trimmed,
      stages: [],
      findings: [
        finding(
          "MALFORMED_RECOVERY_JSON",
          "blocker",
          "Recovery summary JSON could not be parsed."
        )
      ],
      nextAction: "Provide valid summary-only desktop recovery JSON."
    });
  }

  if (!isRecord(parsed)) {
    return viewFrom({
      status: "blocked",
      sourceKind,
      hashSeed: trimmed,
      stages: [],
      findings: [
        finding(
          "RECOVERY_JSON_NOT_OBJECT",
          "blocker",
          "Recovery summary JSON must be an object."
        )
      ],
      nextAction: "Provide a summary-only recovery object."
    });
  }

  const findings: DesktopOperatorRecoveryFinding[] = [];
  scanUnsafe(parsed, findings);
  const stages = buildStages(parsed, findings);
  if (stages.some((stage) => stage.status === "missing")) {
    findings.push(
      finding(
        "RECOVERY_STAGE_MISSING",
        "warning",
        "One or more desktop recovery summaries are missing."
      )
    );
  }
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopOperatorRecoveryStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0 || stages.some((stage) => stage.status === "warning")
        ? "warning"
        : "summary_ready";

  return viewFrom({
    status,
    sourceKind,
    hashSeed: stableStringify({
      stages,
      blockerCount,
      warningCount,
      sourceKind
    }),
    stages,
    findings,
    nextAction:
      status === "blocked"
        ? "Remove raw or execution-capable recovery fields before preview."
        : "Recovery summary is read-only; retry and undo remain disabled."
  });
}

export function summarizeDesktopOperatorRecoveryView(
  view: DesktopOperatorRecoveryView
): {
  status: DesktopOperatorRecoveryStatus;
  recoveryId: string;
  stageCount: number;
  presentStageCount: number;
  missingStageCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix?: string | undefined;
  nextAction: string;
  source: "app_desktop_operator_recovery";
} {
  return {
    status: view.status,
    recoveryId: view.recoveryId,
    stageCount: view.stageCount,
    presentStageCount: view.presentStageCount,
    missingStageCount: view.missingStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

function buildStages(
  root: Record<string, unknown>,
  findings: DesktopOperatorRecoveryFinding[]
): DesktopOperatorRecoveryStage[] {
  return stageKeys.map((stageConfig) => {
    const record = findStageRecord(root, stageConfig.keys);
    if (!record) {
      return {
        kind: stageConfig.kind,
        status: "missing",
        summary: `${stageConfig.label} summary missing.`,
        blockerCount: 0,
        warningCount: 0
      };
    }
    const blockerCount = readCount(record.blockerCount);
    const warningCount = readCount(record.warningCount);
    const rawStatus = typeof record.status === "string" ? record.status : "";
    const status =
      blockerCount > 0 || rawStatus === "blocked"
        ? "blocked"
        : warningCount > 0 || rawStatus === "warning"
          ? "warning"
          : "present";
    if (status === "blocked") {
      findings.push(
        finding(
          `${stageConfig.kind.toUpperCase()}_BLOCKED`,
          "warning",
          `${stageConfig.label} reports blockers.`
        )
      );
    }
    return {
      kind: stageConfig.kind,
      status,
      summary: readSummary(record) ?? `${stageConfig.label} summary present.`,
      blockerCount,
      warningCount
    };
  });
}

function scanUnsafe(
  value: unknown,
  findings: DesktopOperatorRecoveryFinding[],
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of unsafeStringPatterns) {
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
          "RECOVERY_EXECUTION_FLAG_TRUE",
          "blocker",
          "Desktop recovery summaries cannot enable execution."
        )
      );
    }
    scanUnsafe(child, findings, seen);
  }
}

function viewFrom(args: {
  status: DesktopOperatorRecoveryStatus;
  sourceKind: "paste" | "fixture" | "manual_test";
  hashSeed: string;
  stages: DesktopOperatorRecoveryStage[];
  findings: DesktopOperatorRecoveryFinding[];
  nextAction: string;
}): DesktopOperatorRecoveryView {
  const hash = hashText(args.hashSeed);
  const blockerCount = args.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  return {
    status: args.status,
    source: "app_desktop_operator_recovery",
    recoveryId: `desktop-operator-recovery-${hash.slice(0, 12)}`,
    sourceKind: args.sourceKind,
    stageCount: args.stages.length,
    presentStageCount: args.stages.filter((stage) => stage.status === "present")
      .length,
    missingStageCount: args.stages.filter((stage) => stage.status === "missing")
      .length,
    blockedStageCount: args.stages.filter((stage) => stage.status === "blocked")
      .length,
    warningStageCount: args.stages.filter((stage) => stage.status === "warning")
      .length,
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    stages: args.stages,
    findings: args.findings,
    readiness: {
      canPreviewRecoverySummary:
        args.status !== "empty" && args.status !== "blocked",
      canRetryDesktopAction: false,
      canRunUndoAction: false,
      canExecuteDesktopAction: false,
      canClick: false,
      canType: false,
      canUseClipboard: false,
      canOpenFileDialog: false,
      canReplayDesktopAction: false,
      canWriteEventStore: false,
      canUseNativeBridge: false,
      appCanExecute: false
    },
    hashPrefix: hash.slice(0, 12),
    nextAction: args.nextAction
  };
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string
): DesktopOperatorRecoveryFinding {
  return { code, severity, safeMessage };
}

function findStageRecord(
  root: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = root[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return undefined;
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function readSummary(record: Record<string, unknown>): string | undefined {
  for (const key of [
    "summary",
    "recoveryStrategySummary",
    "recommendedNextAction",
    "nextAction"
  ]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().slice(0, 240);
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
