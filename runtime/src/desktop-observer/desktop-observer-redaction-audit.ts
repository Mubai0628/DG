import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type DesktopObserverRedactionAuditInput = unknown;

export type DesktopObserverRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type DesktopObserverRedactionAuditSeverity = "blocker" | "warning";

export type DesktopObserverRedactionAuditFindingKind =
  | "raw_screenshot"
  | "ocr_text"
  | "secret_marker"
  | "raw_prompt_source_diff"
  | "clipboard_marker"
  | "model_send"
  | "desktop_action"
  | "hidden_capture"
  | "metadata_warning"
  | "schema";

export type DesktopObserverRedactionAuditFinding = {
  findingId: string;
  kind: DesktopObserverRedactionAuditFindingKind;
  severity: DesktopObserverRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type DesktopObserverRedactionAuditReadiness = {
  canUseSummaryAsEvidence: boolean;
  canPersistRawScreenshot: false;
  canPersistOcrText: false;
  canSendToModel: false;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canReadClipboard: false;
  canWriteClipboard: false;
  canHiddenCapture: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type DesktopObserverRedactionAuditReport = {
  status: DesktopObserverRedactionAuditStatus;
  auditId?: string | undefined;
  rawScreenshotDetected: boolean;
  ocrTextDetected: boolean;
  apiKeyMarkerDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
  clipboardMarkerDetected: boolean;
  sendToModelDetected: boolean;
  desktopActionDetected: boolean;
  hiddenCaptureDetected: boolean;
  windowTitlesIncluded: boolean;
  processNamesIncluded: boolean;
  screenshotMetadataIncluded: boolean;
  multipleDisplaysDetected: boolean;
  unknownAppNamesDetected: boolean;
  findings: DesktopObserverRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash?: string | undefined;
  summaryOnly: true;
  readiness: DesktopObserverRedactionAuditReadiness;
  nextAction: string;
  source: "runtime_desktop_observer_redaction_audit";
};

export type DesktopObserverRedactionAuditSummary = {
  status: DesktopObserverRedactionAuditStatus;
  auditId?: string | undefined;
  blockerCodes: string[];
  warningCodes: string[];
  rawScreenshotDetected: boolean;
  ocrTextDetected: boolean;
  apiKeyMarkerDetected: boolean;
  rawPromptSourceDiffDetected: boolean;
  clipboardMarkerDetected: boolean;
  sendToModelDetected: boolean;
  desktopActionDetected: boolean;
  hiddenCaptureDetected: boolean;
  auditHash?: string | undefined;
  summaryOnly: true;
};

type AddFinding = (
  kind: DesktopObserverRedactionAuditFindingKind,
  severity: DesktopObserverRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string
) => void;

const raw = "raw";

const rawScreenshotKeys = new Set(
  [
    raw + "Screenshot",
    "screenshotBytes",
    "screenshotBase64",
    "imageBase64",
    "base64Image",
    "pixelBuffer",
    "rawScreenshotPath",
    "screenshotPath"
  ].map((key) => key.toLowerCase())
);

const ocrKeys = new Set(
  [raw + "Ocr", raw + "OcrText", "ocr" + "Text"].map((key) =>
    key.toLowerCase()
  )
);

const rawPromptSourceDiffKeys = new Set(
  [
    raw + "Prompt",
    "promptText",
    raw + "Source",
    raw + "Diff",
    raw + "Patch",
    raw + "Dom",
    raw + "Csv",
    raw + "Response",
    "responseText",
    "reasoningContent",
    "reasoning_content"
  ].map((key) => key.toLowerCase())
);

const secretKeys = new Set(
  [
    "api" + "Key",
    "api" + "KeyValue",
    "Authori" + "zation",
    "bearer",
    "token",
    "secret",
    "password",
    "env"
  ].map((key) => key.toLowerCase())
);

const clipboardContentKeys = new Set(
  ["clip" + "board", "clip" + "boardText"].map((key) => key.toLowerCase())
);

const modelSendKeys = new Set(
  ["sendToModel", "modelSent", "canSendToModel"].map((key) =>
    key.toLowerCase()
  )
);

const desktopActionKeys = new Set(
  [
    "desktopAction",
    "canDesktopAction",
    "allowDesktopAction",
    "click",
    "type",
    "select",
    "canClickTypeSelect",
    "allowClickTypeSelect",
    "controlWindows",
    "canControlWindows"
  ].map((key) => key.toLowerCase())
);

const hiddenCaptureKeys = new Set(
  [
    "hiddenCapture",
    "hiddenBackgroundCapture",
    "allowHiddenBackgroundCapture",
    "canHiddenBackgroundCapture",
    "allowScreenRecording",
    "canScreenRecord"
  ].map((key) => key.toLowerCase())
);

const clipboardBooleanKeys = new Set(
  [
    "allowClipboardRead",
    "allowClipboardWrite",
    "canReadClipboard",
    "canWriteClipboard"
  ].map((key) => key.toLowerCase())
);

const stringMarkers: Array<{
  kind: DesktopObserverRedactionAuditFindingKind;
  code: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    kind: "secret_marker",
    code: "api_key_marker",
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/,
    message: "Desktop Observer audit blocks API key markers."
  },
  {
    kind: "secret_marker",
    code: "authorization_marker",
    pattern: /\bBearer\s+|\bAuthorization\b|BEGIN PRIVATE KEY/i,
    message: "Desktop Observer audit blocks authorization markers."
  },
  {
    kind: "raw_prompt_source_diff",
    code: "raw_prompt_source_diff_marker",
    pattern: /raw prompt|raw source|raw diff|raw response|raw dom|raw csv/i,
    message: "Desktop Observer audit blocks raw prompt/source/diff markers."
  },
  {
    kind: "raw_screenshot",
    code: "raw_screenshot_marker",
    pattern: /raw screenshot|screenshotBase64|data:image|base64,/i,
    message: "Desktop Observer audit blocks raw screenshot markers."
  },
  {
    kind: "ocr_text",
    code: "ocr_text_marker",
    pattern: /raw ocr|ocr text/i,
    message: "Desktop Observer audit blocks OCR text markers."
  },
  {
    kind: "clipboard_marker",
    code: "clipboard_marker",
    pattern: /clipboard text|raw clipboard/i,
    message: "Desktop Observer audit blocks clipboard content markers."
  }
];

export function buildDesktopObserverRedactionAudit(
  input: DesktopObserverRedactionAuditInput
): DesktopObserverRedactionAuditReport {
  const findings: DesktopObserverRedactionAuditFinding[] = [];
  const addFinding: AddFinding = (kind, severity, code, safeMessage, path) => {
    findings.push({
      findingId: `desktop-observer-redaction-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage,
      ...(path ? { path } : {})
    });
  };

  if (input === undefined || input === null) {
    addFinding(
      "schema",
      "warning",
      "audit_input_missing",
      "Desktop Observer redaction audit has no summary artifact to inspect."
    );
  } else {
    scanValue(input, "$", addFinding);
  }

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const auditHash =
    input === undefined || input === null
      ? undefined
      : stablePreviewHash(JSON.stringify(input));
  const auditId =
    auditHash === undefined
      ? undefined
      : `desktop-observer-redaction-${auditHash.slice(0, 12)}`;
  const status = statusFor(input, blockerCount, warningCount);

  return {
    status,
    auditId,
    rawScreenshotDetected: hasKind(findings, "raw_screenshot"),
    ocrTextDetected: hasKind(findings, "ocr_text"),
    apiKeyMarkerDetected: hasKind(findings, "secret_marker"),
    rawPromptSourceDiffDetected: hasKind(findings, "raw_prompt_source_diff"),
    clipboardMarkerDetected: hasKind(findings, "clipboard_marker"),
    sendToModelDetected: hasKind(findings, "model_send"),
    desktopActionDetected: hasKind(findings, "desktop_action"),
    hiddenCaptureDetected: hasKind(findings, "hidden_capture"),
    windowTitlesIncluded: hasCode(findings, "window_titles_included"),
    processNamesIncluded: hasCode(findings, "process_names_included"),
    screenshotMetadataIncluded: hasCode(findings, "screenshot_metadata_included"),
    multipleDisplaysDetected: hasCode(findings, "multiple_displays_detected"),
    unknownAppNamesDetected: hasCode(findings, "unknown_app_names_detected"),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    summaryOnly: true,
    readiness: {
      canUseSummaryAsEvidence: blockerCount === 0 && input !== undefined && input !== null,
      canPersistRawScreenshot: false,
      canPersistOcrText: false,
      canSendToModel: false,
      canDesktopAction: false,
      canClickTypeSelect: false,
      canReadClipboard: false,
      canWriteClipboard: false,
      canHiddenCapture: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "runtime_desktop_observer_redaction_audit"
  };
}

export function summarizeDesktopObserverRedactionAudit(
  report: DesktopObserverRedactionAuditReport
): DesktopObserverRedactionAuditSummary {
  return {
    status: report.status,
    auditId: report.auditId,
    blockerCodes: uniqueCodes(
      report.findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code)
    ),
    warningCodes: uniqueCodes(
      report.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    ),
    rawScreenshotDetected: report.rawScreenshotDetected,
    ocrTextDetected: report.ocrTextDetected,
    apiKeyMarkerDetected: report.apiKeyMarkerDetected,
    rawPromptSourceDiffDetected: report.rawPromptSourceDiffDetected,
    clipboardMarkerDetected: report.clipboardMarkerDetected,
    sendToModelDetected: report.sendToModelDetected,
    desktopActionDetected: report.desktopActionDetected,
    hiddenCaptureDetected: report.hiddenCaptureDetected,
    auditHash: report.auditHash,
    summaryOnly: true
  };
}

function scanValue(value: unknown, path: string, addFinding: AddFinding): void {
  if (typeof value === "string") {
    scanString(value, path, addFinding);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, addFinding));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    scanKeyValue(key, child, `${path}.${key}`, addFinding);
    scanValue(child, `${path}.${key}`, addFinding);
  }
}

function scanKeyValue(
  key: string,
  value: unknown,
  path: string,
  addFinding: AddFinding
): void {
  const normalized = key.toLowerCase();
  if (rawScreenshotKeys.has(normalized)) {
    addFinding(
      "raw_screenshot",
      "blocker",
      "raw_screenshot_field",
      "Desktop Observer audit blocks raw screenshot fields.",
      path
    );
  }
  if (ocrKeys.has(normalized)) {
    addFinding(
      "ocr_text",
      "blocker",
      "ocr_text_field",
      "Desktop Observer audit blocks OCR text fields.",
      path
    );
  }
  if (secretKeys.has(normalized)) {
    addFinding(
      "secret_marker",
      "blocker",
      "secret_field",
      "Desktop Observer audit blocks secret-bearing fields.",
      path
    );
  }
  if (rawPromptSourceDiffKeys.has(normalized)) {
    addFinding(
      "raw_prompt_source_diff",
      "blocker",
      "raw_prompt_source_diff_field",
      "Desktop Observer audit blocks raw prompt/source/diff fields.",
      path
    );
  }
  if (clipboardContentKeys.has(normalized)) {
    addFinding(
      "clipboard_marker",
      "blocker",
      "clipboard_content_field",
      "Desktop Observer audit blocks clipboard content fields.",
      path
    );
  }
  if (isTrue(value) && modelSendKeys.has(normalized)) {
    addFinding(
      "model_send",
      "blocker",
      "send_to_model_true",
      "Desktop Observer audit blocks send-to-model flags.",
      path
    );
  }
  if (isTrue(value) && desktopActionKeys.has(normalized)) {
    addFinding(
      "desktop_action",
      "blocker",
      "desktop_action_true",
      "Desktop Observer audit blocks desktop action flags.",
      path
    );
  }
  if (isTrue(value) && hiddenCaptureKeys.has(normalized)) {
    addFinding(
      "hidden_capture",
      "blocker",
      "hidden_capture_true",
      "Desktop Observer audit blocks hidden capture flags.",
      path
    );
  }
  if (isTrue(value) && clipboardBooleanKeys.has(normalized)) {
    addFinding(
      "clipboard_marker",
      "blocker",
      "clipboard_access_true",
      "Desktop Observer audit blocks clipboard access flags.",
      path
    );
  }
  if (normalized === "includewindowtitles" && isTrue(value)) {
    addFinding(
      "metadata_warning",
      "warning",
      "window_titles_included",
      "Desktop Observer audit warns when window titles are included.",
      path
    );
  }
  if (normalized === "includeprocessnames" && isTrue(value)) {
    addFinding(
      "metadata_warning",
      "warning",
      "process_names_included",
      "Desktop Observer audit warns when process names are included.",
      path
    );
  }
  if (
    (normalized === "includescreenshotmetadata" ||
      normalized === "screenshotmetadataincluded") &&
    isTrue(value)
  ) {
    addFinding(
      "metadata_warning",
      "warning",
      "screenshot_metadata_included",
      "Desktop Observer audit warns when screenshot metadata is included.",
      path
    );
  }
  if (normalized === "displaycount" && typeof value === "number" && value > 1) {
    addFinding(
      "metadata_warning",
      "warning",
      "multiple_displays_detected",
      "Desktop Observer audit warns when multiple displays are summarized.",
      path
    );
  }
  if (
    (normalized === "appnamesummary" || normalized === "appname") &&
    typeof value === "string" &&
    /unknown|unavailable|n\/a/i.test(value)
  ) {
    addFinding(
      "metadata_warning",
      "warning",
      "unknown_app_names_detected",
      "Desktop Observer audit warns when app names are unknown.",
      path
    );
  }
}

function scanString(value: string, path: string, addFinding: AddFinding): void {
  for (const marker of stringMarkers) {
    if (marker.pattern.test(value)) {
      addFinding(marker.kind, "blocker", marker.code, marker.message, path);
    }
  }
}

function statusFor(
  input: unknown,
  blockerCount: number,
  warningCount: number
): DesktopObserverRedactionAuditStatus {
  if (input === undefined || input === null) {
    return warningCount > 0 ? "empty" : "empty";
  }
  if (blockerCount > 0) {
    return "blocked";
  }
  return warningCount > 0 ? "warning" : "audit_ready";
}

function nextActionFor(status: DesktopObserverRedactionAuditStatus): string {
  if (status === "blocked") {
    return "Remove raw or execution-capable desktop observation fields before evidence use.";
  }
  if (status === "warning") {
    return "Review redaction warnings. Audit output is summary-only and no desktop action is enabled.";
  }
  if (status === "audit_ready") {
    return "Desktop Observer summaries passed redaction audit. Use as read-only evidence only.";
  }
  return "Provide a Desktop Observer summary artifact to audit.";
}

function hasKind(
  findings: readonly DesktopObserverRedactionAuditFinding[],
  kind: DesktopObserverRedactionAuditFindingKind
): boolean {
  return findings.some((finding) => finding.kind === kind);
}

function hasCode(
  findings: readonly DesktopObserverRedactionAuditFinding[],
  code: string
): boolean {
  return findings.some((finding) => finding.code === code);
}

function uniqueCodes(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => /^[a-z0-9_.-]+$/i.test(value))));
}

function isTrue(value: unknown): boolean {
  return value === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
