import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ApprovedDesktopActionPrivacyAuditStatus = "audit_ready" | "blocked";

export type ApprovedDesktopActionPrivacyAuditFinding = {
  findingId: string;
  kind:
    | "raw_screenshot"
    | "raw_ocr"
    | "clipboard"
    | "raw_window_content"
    | "api_key"
    | "raw_prompt"
    | "raw_source"
    | "raw_diff"
    | "execution";
  severity: "blocker";
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ApprovedDesktopActionPrivacyAudit = {
  status: ApprovedDesktopActionPrivacyAuditStatus;
  auditId: string;
  rawScreenshotDetected: boolean;
  rawOcrDetected: boolean;
  clipboardDetected: boolean;
  rawWindowContentDetected: boolean;
  apiKeyDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
  blockerCount: number;
  findingCount: number;
  findings: ApprovedDesktopActionPrivacyAuditFinding[];
  auditHash: string;
  readiness: {
    canPersistRawScreenshot: false;
    canPersistOcrText: false;
    canUseClipboard: false;
    canPersistRawWindowContent: false;
    canWriteEventStore: false;
    canReplayDesktopAction: false;
    canExecuteDesktopAction: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "runtime_approved_desktop_action_privacy_audit";
  summaryOnly: true;
};

export type ApprovedDesktopActionPrivacyAuditInput = {
  artifact?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");

const forbiddenFields = new Map<
  string,
  {
    kind: ApprovedDesktopActionPrivacyAuditFinding["kind"];
    code: string;
    flag: keyof ScanFlags;
  }
>([
  [
    normalizeField(rawPrefix + "Screenshot"),
    {
      kind: "raw_screenshot",
      code: "APPROVED_DESKTOP_ACTION_RAW_SCREENSHOT_FIELD",
      flag: "rawScreenshotDetected"
    }
  ],
  [
    normalizeField("screenshotBytes"),
    {
      kind: "raw_screenshot",
      code: "APPROVED_DESKTOP_ACTION_SCREENSHOT_BYTES_FIELD",
      flag: "rawScreenshotDetected"
    }
  ],
  [
    normalizeField(rawPrefix + "Ocr"),
    {
      kind: "raw_ocr",
      code: "APPROVED_DESKTOP_ACTION_RAW_OCR_FIELD",
      flag: "rawOcrDetected"
    }
  ],
  [
    normalizeField("ocrText"),
    {
      kind: "raw_ocr",
      code: "APPROVED_DESKTOP_ACTION_OCR_TEXT_FIELD",
      flag: "rawOcrDetected"
    }
  ],
  [
    normalizeField("clipboardContent"),
    {
      kind: "clipboard",
      code: "APPROVED_DESKTOP_ACTION_CLIPBOARD_FIELD",
      flag: "clipboardDetected"
    }
  ],
  [
    normalizeField(rawPrefix + "WindowContent"),
    {
      kind: "raw_window_content",
      code: "APPROVED_DESKTOP_ACTION_RAW_WINDOW_CONTENT_FIELD",
      flag: "rawWindowContentDetected"
    }
  ],
  [
    normalizeField("windowContent"),
    {
      kind: "raw_window_content",
      code: "APPROVED_DESKTOP_ACTION_WINDOW_CONTENT_FIELD",
      flag: "rawWindowContentDetected"
    }
  ],
  [
    normalizeField(apiKeyField),
    {
      kind: "api_key",
      code: "APPROVED_DESKTOP_ACTION_API_KEY_FIELD",
      flag: "apiKeyDetected"
    }
  ],
  [
    normalizeField(authHeaderField),
    {
      kind: "api_key",
      code: "APPROVED_DESKTOP_ACTION_AUTHORIZATION_FIELD",
      flag: "apiKeyDetected"
    }
  ],
  [
    normalizeField(rawPrefix + "Prompt"),
    {
      kind: "raw_prompt",
      code: "APPROVED_DESKTOP_ACTION_RAW_PROMPT_FIELD",
      flag: "rawPromptSourceDiffDetected"
    }
  ],
  [
    normalizeField(rawPrefix + "Source"),
    {
      kind: "raw_source",
      code: "APPROVED_DESKTOP_ACTION_RAW_SOURCE_FIELD",
      flag: "rawPromptSourceDiffDetected"
    }
  ],
  [
    normalizeField(rawPrefix + "Diff"),
    {
      kind: "raw_diff",
      code: "APPROVED_DESKTOP_ACTION_RAW_DIFF_FIELD",
      flag: "rawPromptSourceDiffDetected"
    }
  ]
]);

const executionFields = new Set(
  [
    "canReplayDesktopAction",
    "canExecuteDesktopAction",
    "canClick",
    "canType",
    "canUseClipboard",
    "canOpenFileDialog",
    "canUseNativeBridge",
    "appCanExecute",
    "executeNow",
    "clickNow",
    "typeNow"
  ].map(normalizeField)
);

const unsafeTextMarkers: Array<{
  kind: ApprovedDesktopActionPrivacyAuditFinding["kind"];
  code: string;
  flag: keyof ScanFlags;
  pattern: RegExp;
}> = [
  {
    kind: "api_key",
    code: "APPROVED_DESKTOP_ACTION_API_KEY_MARKER",
    flag: "apiKeyDetected",
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/
  },
  {
    kind: "api_key",
    code: "APPROVED_DESKTOP_ACTION_AUTHORIZATION_MARKER",
    flag: "apiKeyDetected",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    kind: "raw_screenshot",
    code: "APPROVED_DESKTOP_ACTION_RAW_SCREENSHOT_MARKER",
    flag: "rawScreenshotDetected",
    pattern: /\bRAW_SCREENSHOT\b/
  },
  {
    kind: "raw_ocr",
    code: "APPROVED_DESKTOP_ACTION_RAW_OCR_MARKER",
    flag: "rawOcrDetected",
    pattern: /\bRAW_OCR\b/
  },
  {
    kind: "clipboard",
    code: "APPROVED_DESKTOP_ACTION_CLIPBOARD_MARKER",
    flag: "clipboardDetected",
    pattern: /\bCLIPBOARD_CONTENT\b/
  },
  {
    kind: "raw_window_content",
    code: "APPROVED_DESKTOP_ACTION_RAW_WINDOW_CONTENT_MARKER",
    flag: "rawWindowContentDetected",
    pattern: /\bRAW_WINDOW_CONTENT\b/
  },
  {
    kind: "raw_prompt",
    code: "APPROVED_DESKTOP_ACTION_RAW_PROMPT_MARKER",
    flag: "rawPromptSourceDiffDetected",
    pattern: /\bRAW_PROMPT\b/
  },
  {
    kind: "raw_source",
    code: "APPROVED_DESKTOP_ACTION_RAW_SOURCE_MARKER",
    flag: "rawPromptSourceDiffDetected",
    pattern: /\bRAW_SOURCE\b/
  },
  {
    kind: "raw_diff",
    code: "APPROVED_DESKTOP_ACTION_RAW_DIFF_MARKER",
    flag: "rawPromptSourceDiffDetected",
    pattern: /\bRAW_DIFF\b/
  }
];

type ScanFlags = {
  rawScreenshotDetected: boolean;
  rawOcrDetected: boolean;
  clipboardDetected: boolean;
  rawWindowContentDetected: boolean;
  apiKeyDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
};

export function buildApprovedDesktopActionPrivacyAudit(
  input: ApprovedDesktopActionPrivacyAuditInput = {}
): ApprovedDesktopActionPrivacyAudit {
  const findings: ApprovedDesktopActionPrivacyAuditFinding[] = [];
  const flags = emptyFlags();
  scanUnknown(input.artifact, [], findings, flags);
  const auditHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_approved_desktop_action_privacy_audit",
      codes: findings.map((finding) => finding.code),
      flags
    })
  );
  const blockerCount = findings.length;
  return {
    status: blockerCount > 0 ? "blocked" : "audit_ready",
    auditId:
      input.idGenerator?.() ||
      `approved-desktop-action-privacy-${auditHash.substring(0, 12)}`,
    ...flags,
    blockerCount,
    findingCount: findings.length,
    findings,
    auditHash,
    readiness: {
      canPersistRawScreenshot: false,
      canPersistOcrText: false,
      canUseClipboard: false,
      canPersistRawWindowContent: false,
      canWriteEventStore: false,
      canReplayDesktopAction: false,
      canExecuteDesktopAction: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Remove raw or unsafe desktop action fields before event or replay projection."
        : "Artifact is summary-only for desktop action event or replay projection.",
    source: "runtime_approved_desktop_action_privacy_audit",
    summaryOnly: true
  };
}

export function summarizeApprovedDesktopActionPrivacyAudit(
  audit: ApprovedDesktopActionPrivacyAudit
): string {
  return [
    `status:${audit.status}`,
    `blockers:${audit.blockerCount}`,
    `raw_screenshot:${audit.rawScreenshotDetected}`,
    `ocr:${audit.rawOcrDetected}`,
    `clipboard:${audit.clipboardDetected}`,
    `window_content:${audit.rawWindowContentDetected}`,
    `api_key:${audit.apiKeyDetected}`,
    `hash:${audit.auditHash.substring(0, 12)}`,
    "summary_only:true",
    "event_write:false",
    "desktop_replay:false"
  ].join(" | ");
}

function scanUnknown(
  value: unknown,
  path: string[],
  findings: ApprovedDesktopActionPrivacyAuditFinding[],
  flags: ScanFlags
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnknown(item, [...path, String(index)], findings, flags)
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const normalized = normalizeField(key);
      const forbidden = forbiddenFields.get(normalized);
      if (forbidden !== undefined) {
        flags[forbidden.flag] = true;
        findings.push(
          finding(forbidden.kind, forbidden.code, [...path, key].join("."))
        );
      }
      if (executionFields.has(normalized) && nested === true) {
        findings.push(
          finding(
            "execution",
            "APPROVED_DESKTOP_ACTION_EXECUTION_FIELD_TRUE",
            [...path, key].join(".")
          )
        );
      }
      scanUnknown(nested, [...path, key], findings, flags);
    }
    return;
  }
  if (typeof value === "string") {
    for (const marker of unsafeTextMarkers) {
      if (marker.pattern.test(value)) {
        flags[marker.flag] = true;
        findings.push(finding(marker.kind, marker.code, path.join(".")));
      }
    }
  }
}

function finding(
  kind: ApprovedDesktopActionPrivacyAuditFinding["kind"],
  code: string,
  path?: string
): ApprovedDesktopActionPrivacyAuditFinding {
  return {
    findingId: `approved-desktop-action-privacy-${code.toLowerCase()}-${stablePreviewHash(
      path || "root"
    ).substring(0, 8)}`,
    kind,
    severity: "blocker",
    code,
    safeMessage:
      "Desktop action event and replay artifacts must be summary-only.",
    ...(path && path.length > 0 ? { path: safePath(path) } : {})
  };
}

function emptyFlags(): ScanFlags {
  return {
    rawScreenshotDetected: false,
    rawOcrDetected: false,
    clipboardDetected: false,
    rawWindowContentDetected: false,
    apiKeyDetected: false,
    rawPromptSourceDiffDetected: false
  };
}

function normalizeField(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safePath(value: string): string {
  return value.replace(/[^\w.[\]-]/g, "_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
