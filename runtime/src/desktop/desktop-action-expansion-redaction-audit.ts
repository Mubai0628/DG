import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopActionExpansionRedactionAuditInput = {
  actionProposals?: unknown[] | undefined;
  targetFreshnessSummaries?: unknown[] | undefined;
  sequenceSimulationSummaries?: unknown[] | undefined;
  riskClassifierSummaries?: unknown[] | undefined;
  appSurfaceSummaries?: unknown[] | undefined;
  records?: unknown[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DesktopActionExpansionRedactionAuditStatus =
  | "audit_ready"
  | "warning"
  | "blocked";

export type DesktopActionExpansionRedactionSeverity = "blocker" | "warning";

export type DesktopActionExpansionRedactionFindingKind =
  | "schema"
  | "raw_screenshot"
  | "screenshot_bytes"
  | "raw_ocr"
  | "raw_target_text"
  | "clipboard_content"
  | "file_dialog_path"
  | "raw_prompt_source_diff"
  | "secret"
  | "api_key"
  | "execution_field"
  | "native_bridge"
  | "app_surface"
  | "upstream_status";

export type DesktopActionExpansionRedactionFinding = {
  findingId: string;
  kind: DesktopActionExpansionRedactionFindingKind;
  severity: DesktopActionExpansionRedactionSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopActionExpansionRedactionSummary = {
  rawScreenshotDetected: boolean;
  screenshotBytesDetected: boolean;
  rawOcrDetected: boolean;
  rawTargetTextDetected: boolean;
  clipboardContentDetected: boolean;
  fileDialogRawPathDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
  apiKeyDetected: boolean;
  secretDetected: boolean;
  executionFieldDetected: boolean;
  nativeBridgeDetected: boolean;
  rawFieldDetectedCount: number;
  redactedFieldCount: number;
  summaryOnly: true;
};

export type DesktopActionExpansionPrivacyRiskSummary = {
  riskLevel: "low" | "warning" | "blocked";
  blockerCodes: string[];
  warningCodes: string[];
  rawLeakDetected: boolean;
  executionBoundaryViolated: boolean;
  summaryOnly: true;
};

export type DesktopActionExpansionRedactionAuditReadiness = {
  canEnterSmokeSummary: boolean;
  canPersistRawScreenshot: false;
  canPersistScreenshotBytes: false;
  canPersistRawOcr: false;
  canPersistRawTargetText: false;
  canUseClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type DesktopActionExpansionRedactionRecord = {
  recordId: string;
  kind: string;
  status: "accepted" | "warning" | "blocked";
  blockerCodes: string[];
  warningCodes: string[];
  recordHash: string;
  summaryOnly: true;
};

export type DesktopActionExpansionRedactionAudit = {
  status: DesktopActionExpansionRedactionAuditStatus;
  auditId: string;
  recordCount: number;
  blockedRecordCount: number;
  warningRecordCount: number;
  redactionSummary: DesktopActionExpansionRedactionSummary;
  privacyRiskSummary: DesktopActionExpansionPrivacyRiskSummary;
  records: DesktopActionExpansionRedactionRecord[];
  findings: DesktopActionExpansionRedactionFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: DesktopActionExpansionRedactionAuditReadiness;
  nextAction: string;
  source: "runtime_desktop_action_expansion_redaction_audit";
};

type ScanFlags = Omit<
  DesktopActionExpansionRedactionSummary,
  "rawFieldDetectedCount" | "redactedFieldCount" | "summaryOnly"
>;

const forbiddenFieldKinds = new Map<
  string,
  {
    kind: DesktopActionExpansionRedactionFindingKind;
    code: string;
    flag: keyof ScanFlags;
  }
>(
  [
    [
      "rawscreenshot",
      ["raw_screenshot", "RAW_SCREENSHOT_FIELD", "rawScreenshotDetected"]
    ],
    [
      "screenshotbytes",
      [
        "screenshot_bytes",
        "SCREENSHOT_BYTES_FIELD",
        "screenshotBytesDetected"
      ]
    ],
    [
      "imagedata",
      [
        "screenshot_bytes",
        "SCREENSHOT_BYTES_FIELD",
        "screenshotBytesDetected"
      ]
    ],
    ["rawocr", ["raw_ocr", "RAW_OCR_FIELD", "rawOcrDetected"]],
    ["rawocrtext", ["raw_ocr", "RAW_OCR_FIELD", "rawOcrDetected"]],
    ["ocrtext", ["raw_ocr", "RAW_OCR_FIELD", "rawOcrDetected"]],
    [
      "rawtargettext",
      ["raw_target_text", "RAW_TARGET_TEXT_FIELD", "rawTargetTextDetected"]
    ],
    [
      "targettextraw",
      ["raw_target_text", "RAW_TARGET_TEXT_FIELD", "rawTargetTextDetected"]
    ],
    [
      "clipboardcontent",
      [
        "clipboard_content",
        "CLIPBOARD_CONTENT_FIELD",
        "clipboardContentDetected"
      ]
    ],
    [
      "filedialograwpath",
      [
        "file_dialog_path",
        "FILE_DIALOG_RAW_PATH_FIELD",
        "fileDialogRawPathDetected"
      ]
    ],
    [
      "filedialogpath",
      [
        "file_dialog_path",
        "FILE_DIALOG_RAW_PATH_FIELD",
        "fileDialogRawPathDetected"
      ]
    ],
    [
      "selectedfilepath",
      [
        "file_dialog_path",
        "FILE_DIALOG_RAW_PATH_FIELD",
        "fileDialogRawPathDetected"
      ]
    ],
    [
      "rawpath",
      [
        "file_dialog_path",
        "FILE_DIALOG_RAW_PATH_FIELD",
        "fileDialogRawPathDetected"
      ]
    ],
    [
      "rawprompt",
      [
        "raw_prompt_source_diff",
        "RAW_PROMPT_FIELD",
        "rawPromptSourceDiffDetected"
      ]
    ],
    [
      "rawsource",
      [
        "raw_prompt_source_diff",
        "RAW_SOURCE_FIELD",
        "rawPromptSourceDiffDetected"
      ]
    ],
    [
      "rawdiff",
      [
        "raw_prompt_source_diff",
        "RAW_DIFF_FIELD",
        "rawPromptSourceDiffDetected"
      ]
    ],
    ["apikey", ["api_key", "API_KEY_FIELD", "apiKeyDetected"]],
    ["authorization", ["api_key", "AUTHORIZATION_FIELD", "apiKeyDetected"]],
    ["bearer", ["api_key", "BEARER_FIELD", "apiKeyDetected"]],
    ["token", ["secret", "SECRET_FIELD", "secretDetected"]],
    ["password", ["secret", "SECRET_FIELD", "secretDetected"]],
    ["secret", ["secret", "SECRET_FIELD", "secretDetected"]],
    [
      "nativebridge",
      ["native_bridge", "NATIVE_BRIDGE_FIELD", "nativeBridgeDetected"]
    ],
    [
      "nativebridgecommand",
      ["native_bridge", "NATIVE_BRIDGE_FIELD", "nativeBridgeDetected"]
    ],
    [
      "desktopcommand",
      ["native_bridge", "NATIVE_BRIDGE_FIELD", "nativeBridgeDetected"]
    ]
  ].map(([key, value]) => {
    const tuple = value as [
      DesktopActionExpansionRedactionFindingKind,
      string,
      keyof ScanFlags
    ];
    return [key as string, { kind: tuple[0], code: tuple[1], flag: tuple[2] }];
  })
);

const executionBooleanKeys = new Set(
  [
    "clickNow",
    "typeNow",
    "selectNow",
    "dragNow",
    "executeNow",
    "writeClipboardNow",
    "openDialogNow",
    "desktopActionExecute",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canSelect",
    "canDragDrop",
    "canWriteClipboard",
    "canOpenFileDialog",
    "canWriteEventStore",
    "canUseNativeBridge",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const secretMarkers = [
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
  "CLIPBOARD_CONTENT",
  "FILE_DIALOG_RAW_PATH",
  "RAW_PROMPT",
  "RAW_SOURCE",
  "RAW_DIFF"
];

function emptyFlags(): ScanFlags {
  return {
    rawScreenshotDetected: false,
    screenshotBytesDetected: false,
    rawOcrDetected: false,
    rawTargetTextDetected: false,
    clipboardContentDetected: false,
    fileDialogRawPathDetected: false,
    rawPromptSourceDiffDetected: false,
    apiKeyDetected: false,
    secretDetected: false,
    executionFieldDetected: false,
    nativeBridgeDetected: false
  };
}

function readiness(
  canEnterSmokeSummary: boolean
): DesktopActionExpansionRedactionAuditReadiness {
  return {
    canEnterSmokeSummary,
    canPersistRawScreenshot: false,
    canPersistScreenshotBytes: false,
    canPersistRawOcr: false,
    canPersistRawTargetText: false,
    canUseClipboard: false,
    canOpenFileDialog: false,
    canWriteEventStore: false,
    canExecuteDesktopAction: false,
    canClick: false,
    canType: false,
    canSelect: false,
    canDragDrop: false,
    canUseNativeBridge: false,
    appCanExecute: false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function finding(
  kind: DesktopActionExpansionRedactionFindingKind,
  severity: DesktopActionExpansionRedactionSeverity,
  code: string,
  safeMessage: string,
  path?: string
): DesktopActionExpansionRedactionFinding {
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

function hasSecretMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{8,}\b/.test(value) ||
    secretMarkers.some((marker) => value.includes(marker))
  );
}

function hasUnsafePathMarker(value: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith("/") ||
    value.startsWith("\\\\") ||
    /(^|[\\/])\.env($|[\\/])/i.test(value) ||
    /(^|[\\/])\.git([\\/]|$)/i.test(value)
  );
}

function markRawMarker(value: string, flags: ScanFlags): string | undefined {
  if (value.includes("RAW_SCREENSHOT")) {
    flags.rawScreenshotDetected = true;
    return "RAW_SCREENSHOT_MARKER";
  }
  if (value.includes("SCREENSHOT_BYTES")) {
    flags.screenshotBytesDetected = true;
    return "SCREENSHOT_BYTES_MARKER";
  }
  if (value.includes("RAW_OCR")) {
    flags.rawOcrDetected = true;
    return "RAW_OCR_MARKER";
  }
  if (value.includes("RAW_TARGET_TEXT")) {
    flags.rawTargetTextDetected = true;
    return "RAW_TARGET_TEXT_MARKER";
  }
  if (value.includes("CLIPBOARD_CONTENT")) {
    flags.clipboardContentDetected = true;
    return "CLIPBOARD_CONTENT_MARKER";
  }
  if (value.includes("FILE_DIALOG_RAW_PATH")) {
    flags.fileDialogRawPathDetected = true;
    return "FILE_DIALOG_RAW_PATH_MARKER";
  }
  if (
    value.includes("RAW_PROMPT") ||
    value.includes("RAW_SOURCE") ||
    value.includes("RAW_DIFF")
  ) {
    flags.rawPromptSourceDiffDetected = true;
    return "RAW_PROMPT_SOURCE_DIFF_MARKER";
  }
  return rawMarkers.some((marker) => value.includes(marker))
    ? "RAW_MARKER"
    : undefined;
}

function scanUnsafeFields(
  value: unknown,
  path: string,
  findings: DesktopActionExpansionRedactionFinding[],
  flags: ScanFlags
): void {
  if (typeof value === "string") {
    if (hasSecretMarker(value)) {
      flags.secretDetected = true;
      if (
        /\bsk-[A-Za-z0-9_-]{8,}\b/.test(value) ||
        value.includes("Bearer ") ||
        value.includes("Authorization") ||
        value.includes("DEEPSEEK_API_KEY") ||
        value.includes("OPENAI_API_KEY")
      ) {
        flags.apiKeyDetected = true;
      }
      findings.push(
        finding(
          flags.apiKeyDetected ? "api_key" : "secret",
          "blocker",
          flags.apiKeyDetected ? "API_KEY_MARKER" : "SECRET_MARKER",
          "Secret-like marker is not allowed in desktop expansion audit input.",
          path || "input"
        )
      );
    }

    const rawMarkerCode = markRawMarker(value, flags);
    if (rawMarkerCode) {
      findings.push(
        finding(
          "raw_prompt_source_diff",
          "blocker",
          rawMarkerCode,
          "Raw screenshot, OCR, clipboard, prompt, source, diff, or file-dialog marker is not allowed.",
          path || "input"
        )
      );
    }
    if (hasUnsafePathMarker(value)) {
      flags.fileDialogRawPathDetected = true;
      findings.push(
        finding(
          "file_dialog_path",
          "blocker",
          "FILE_DIALOG_RAW_PATH_VALUE",
          "Absolute, env, git, or unsafe file-dialog paths are not allowed.",
          path || "input"
        )
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeFields(item, `${path}[${index}]`, findings, flags)
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const normalizedKey = key.toLowerCase();
    const forbidden = forbiddenFieldKinds.get(normalizedKey);
    if (forbidden) {
      flags[forbidden.flag] = true;
      findings.push(
        finding(
          forbidden.kind,
          "blocker",
          forbidden.code,
          "Forbidden raw, secret, native bridge, or desktop execution field is not allowed.",
          childPath
        )
      );
    }
    if (executionBooleanKeys.has(normalizedKey) && child === true) {
      flags.executionFieldDetected = true;
      findings.push(
        finding(
          "execution_field",
          "blocker",
          "EXECUTION_FLAG_TRUE",
          "Desktop action expansion audit cannot enable execution readiness.",
          childPath
        )
      );
    }
    scanUnsafeFields(child, childPath, findings, flags);
  }
}

function countRedactionCodes(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countRedactionCodes(item), 0);
  }
  if (!isRecord(value)) {
    return 0;
  }
  return Object.entries(value).reduce((sum, [key, child]) => {
    if (key === "redactionCodes" && Array.isArray(child)) {
      return sum + child.filter((item) => typeof item === "string").length;
    }
    return sum + countRedactionCodes(child);
  }, 0);
}

function collectInputRecords(
  input: DesktopActionExpansionRedactionAuditInput
): Array<{ kind: string; value: unknown }> {
  return [
    ...(input.actionProposals ?? []).map((value) => ({
      kind: "action_proposal",
      value
    })),
    ...(input.targetFreshnessSummaries ?? []).map((value) => ({
      kind: "target_freshness",
      value
    })),
    ...(input.sequenceSimulationSummaries ?? []).map((value) => ({
      kind: "sequence_simulation",
      value
    })),
    ...(input.riskClassifierSummaries ?? []).map((value) => ({
      kind: "risk_classifier",
      value
    })),
    ...(input.appSurfaceSummaries ?? []).map((value) => ({
      kind: "app_surface",
      value
    })),
    ...(input.records ?? []).map((value) => ({ kind: "record", value }))
  ];
}

function recordStatus(value: unknown): "accepted" | "warning" | "blocked" {
  if (!isRecord(value)) {
    return "warning";
  }
  if (value.status === "blocked" || value.riskClass === "blocked") {
    return "blocked";
  }
  if (
    value.status === "warning" ||
    value.riskClass === "high" ||
    value.riskClass === "medium"
  ) {
    return "warning";
  }
  return "accepted";
}

function recordCodes(value: unknown, severity: "blocker" | "warning"): string[] {
  if (!isRecord(value)) {
    return severity === "warning" ? ["RECORD_NOT_OBJECT"] : [];
  }
  const codeKeys =
    severity === "blocker"
      ? ["blockerCodes", "blockedReasons"]
      : ["warningCodes"];
  const codes = codeKeys.flatMap((key) =>
    Array.isArray(value[key])
      ? value[key].filter((item): item is string => typeof item === "string")
      : []
  );
  return [...new Set(codes)];
}

function buildRecordSummary(
  kind: string,
  value: unknown,
  index: number
): DesktopActionExpansionRedactionRecord {
  const status = recordStatus(value);
  const blockerCodes = recordCodes(value, "blocker");
  const warningCodes = recordCodes(value, "warning");
  const core = {
    kind,
    status,
    blockerCodes,
    warningCodes,
    index
  };
  const recordHash = stablePreviewHash(JSON.stringify(core));
  return {
    recordId: `${kind}-${recordHash.slice(0, 12)}`,
    kind,
    status,
    blockerCodes,
    warningCodes,
    recordHash,
    summaryOnly: true
  };
}

function upstreamFindings(
  records: DesktopActionExpansionRedactionRecord[]
): DesktopActionExpansionRedactionFinding[] {
  return records.flatMap((record) => {
    if (record.status === "blocked") {
      return [
        finding(
          record.kind === "app_surface" ? "app_surface" : "upstream_status",
          "blocker",
          "UPSTREAM_RECORD_BLOCKED",
          "Blocked upstream desktop expansion summary cannot pass redaction audit.",
          record.kind
        )
      ];
    }
    return [];
  });
}

export function buildDesktopActionExpansionRedactionAudit(
  input: DesktopActionExpansionRedactionAuditInput = {}
): DesktopActionExpansionRedactionAudit {
  const flags = emptyFlags();
  const records = collectInputRecords(input).map((record, index) =>
    buildRecordSummary(record.kind, record.value, index)
  );
  const findings = upstreamFindings(records);

  if (records.length === 0) {
    findings.push(
      finding(
        "schema",
        "warning",
        "NO_AUDIT_RECORDS",
        "Desktop action expansion redaction audit received no summary records."
      )
    );
  }

  scanUnsafeFields(input, "input", findings, flags);

  const rawFieldDetectedCount = Object.values(flags).filter(Boolean).length;
  const redactedFieldCount = countRedactionCodes(input);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: DesktopActionExpansionRedactionAuditStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "audit_ready";
  const redactionSummary: DesktopActionExpansionRedactionSummary = {
    ...flags,
    rawFieldDetectedCount,
    redactedFieldCount,
    summaryOnly: true
  };
  const blockerCodes = findings
    .filter((item) => item.severity === "blocker")
    .map((item) => item.code);
  const warningCodes = findings
    .filter((item) => item.severity === "warning")
    .map((item) => item.code);
  const privacyRiskSummary: DesktopActionExpansionPrivacyRiskSummary = {
    riskLevel: status === "blocked" ? "blocked" : warningCount > 0 ? "warning" : "low",
    blockerCodes,
    warningCodes,
    rawLeakDetected: rawFieldDetectedCount > 0,
    executionBoundaryViolated:
      flags.executionFieldDetected || flags.nativeBridgeDetected,
    summaryOnly: true
  };
  const auditCore = {
    status,
    recordCount: records.length,
    redactionSummary,
    privacyRiskSummary,
    recordHashes: records.map((record) => record.recordHash),
    createdAt: readString(input.createdAt)
  };
  const auditHash = stablePreviewHash(JSON.stringify(auditCore));
  const auditId =
    input.idGenerator?.() ||
    `desktop-action-expansion-redaction-audit-${auditHash.slice(0, 12)}`;

  return {
    status,
    auditId,
    recordCount: records.length,
    blockedRecordCount: records.filter((record) => record.status === "blocked")
      .length,
    warningRecordCount: records.filter((record) => record.status === "warning")
      .length,
    redactionSummary,
    privacyRiskSummary,
    records,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: readiness(status !== "blocked"),
    nextAction:
      status === "blocked"
        ? "Remove raw screenshot, OCR, clipboard, file dialog, secret, native bridge, or execution fields before smoke."
        : "Redaction audit is summary-only. Expanded desktop actions remain proposal-only.",
    source: "runtime_desktop_action_expansion_redaction_audit"
  };
}

export function summarizeDesktopActionExpansionRedactionAudit(
  audit: DesktopActionExpansionRedactionAudit
): DesktopActionExpansionRedactionSummary {
  return audit.redactionSummary;
}
